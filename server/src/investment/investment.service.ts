import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatementRecord } from './entities/statement-record.entity';
import { PortfolioDto, PositionDto } from './dtos/position.dto';

// IBKR labels these columns slightly differently between export versions, so we
// try a few candidate keys until one of them has a value.
const SYMBOL_KEYS = ['Symbol', 'symbol'];
const QUANTITY_KEYS = ['Quantity', 'quantity'];
const TRADE_PRICE_KEYS = ['Trades Price', 'Trade Price', 'Price', 'tradePrice'];

// The "Cash Report" section is stored under this header.
const CASH_REPORT_SECTION = 'Cash Report';

// IBKR uses symbols like "USD.PLN" / "EUR.USD" for currency pairs. These are
// not portfolio positions, so they are filtered out of the response.
const CURRENCY_PAIR_PATTERN = /^[A-Z]{3}\.[A-Z]{3}$/;

interface AggregatedPosition {
  ticker: string;
  quantity: number;
  buyCost: number;
  buyQuantity: number;
}

@Injectable()
export class InvestmentService {
  private readonly logger = new Logger(InvestmentService.name);

  constructor(
    @InjectRepository(StatementRecord)
    private readonly statementRecordRepository: Repository<StatementRecord>,
  ) {}

  async uploadStatementFiles(files: Express.Multer.File[], userId: string) {
    this.logger.log(
      `Processing ${files.length} statement files for user ${userId}`,
    );

    let totalParsed = 0;
    const recordsToSave: StatementRecord[] = [];

    for (const file of files) {
      const content = file.buffer.toString('utf-8');
      const lines = content.split('\n');

      // A map to store the headers for each section.
      // E.g., headersMap['Trades'] = ['Trades', 'Header', 'DataDiscriminator', ...]
      const headersMap: Record<string, string[]> = {};

      for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        const row = this.parseCsvLine(line);
        if (row.length < 2) continue;

        const sectionName = row[0]; // e.g., 'Trades', 'Dividends', 'Cash Report'
        const rowType = row[1]; // 'Header', 'Data', etc.

        if (rowType === 'Header') {
          // Store headers for this section
          headersMap[sectionName] = row.map((h) => h.trim());
          continue;
        }

        if (rowType === 'Data') {
          const sectionHeaders = headersMap[sectionName];
          if (!sectionHeaders || sectionHeaders.length === 0) continue;

          // Map row to a JSON object using the section's headers
          const rawData: Record<string, string> = {};
          for (let i = 0; i < sectionHeaders.length; i++) {
            // Avoid adding undefined values if row is shorter than headers
            const headerName = sectionHeaders[i];
            const cellValue = row[i]?.trim() || '';
            if (headerName) {
              rawData[headerName] = cellValue;
            }
          }

          // Compute a unique hash for this row to prevent duplicates if the same statement is uploaded multiple times
          const hashString = `${userId}-${sectionName}-${JSON.stringify(rawData)}`;
          const hash = crypto
            .createHash('sha256')
            .update(hashString)
            .digest('hex');

          // Create the generic entity record
          const record = this.statementRecordRepository.create({
            userId,
            section: sectionName,
            rawData,
            hash,
          });

          recordsToSave.push(record);
          totalParsed++;
        }
      }
    }

    // Save all records to the database in chunks to prevent query too large errors
    if (recordsToSave.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < recordsToSave.length; i += chunkSize) {
        const chunk = recordsToSave.slice(i, i + chunkSize);
        // Using upsert based on the 'hash' column so we don't crash on duplicates
        await this.statementRecordRepository.upsert(chunk, ['hash']);
      }
    }

    this.logger.log(
      `Successfully parsed and saved ${totalParsed} generic statement records.`,
    );
    return {
      message: `Successfully processed ${totalParsed} records`,
      total: totalParsed,
    };
  }

  /**
   * Builds the current portfolio for a single user from their uploaded IBKR
   * "Trades" statement rows, plus the free cash balance.
   *
   * Notes / simplifications:
   * - Positions are aggregated per ticker (no FIFO lot tracking). Quantity is
   *   the net of buys and sells; avgPrice is the weighted average of BUY trades.
   * - Fully closed positions (net quantity === 0) are omitted.
   * - Currency-pair symbols (e.g. "USD.PLN") are skipped: they are FX
   *   conversions, not portfolio holdings.
   * - `allocation` is currently weighted by cost basis, because there is no
   *   quotes API yet. Once live prices exist it should use marketValue.
   */
  async getUserPositions(userId: string): Promise<PortfolioDto> {
    const records = await this.statementRecordRepository.find({
      where: { userId, section: 'Trades' },
      order: { createdAt: 'ASC' },
    });

    const positions = new Map<string, AggregatedPosition>();

    for (const record of records) {
      const data = (record.rawData ?? {}) as Record<string, unknown>;

      const ticker = String(this.readField(data, SYMBOL_KEYS) ?? '').trim();
      if (!ticker) continue;

      // Skip IBKR currency-pair rows (e.g. "USD.PLN") - they are not holdings.
      if (CURRENCY_PAIR_PATTERN.test(ticker)) continue;

      const quantity = this.parseNumber(this.readField(data, QUANTITY_KEYS));
      const tradePrice = this.parseNumber(
        this.readField(data, TRADE_PRICE_KEYS),
      );

      let position = positions.get(ticker);
      if (!position) {
        position = { ticker, quantity: 0, buyCost: 0, buyQuantity: 0 };
        positions.set(ticker, position);
      }

      position.quantity += quantity;

      // Only buys (positive quantity) feed the average-cost calculation.
      if (quantity > 0) {
        position.buyCost += quantity * tradePrice;
        position.buyQuantity += quantity;
      }
    }

    // First pass: total cost basis of open positions, combined with cash it
    // becomes the denominator for the allocation column.
    let positionsCostBasis = 0;
    for (const position of positions.values()) {
      if (position.quantity === 0) continue;
      const avgPrice =
        position.buyQuantity > 0 ? position.buyCost / position.buyQuantity : 0;
      positionsCostBasis += position.quantity * avgPrice;
    }

    const cash = await this.getCashBalance(userId);
    const totalValue = positionsCostBasis + cash;

    const result: PositionDto[] = [];

    for (const position of positions.values()) {
      // A position that was fully closed out is not a holding.
      if (position.quantity === 0) continue;

      const avgPrice =
        position.buyQuantity > 0 ? position.buyCost / position.buyQuantity : 0;
      const costBasis = position.quantity * avgPrice;
      const allocation =
        totalValue > 0 ? (costBasis / totalValue) * 100 : 0;

      // -------------------------------------------------------------------
      // NOTE: There is no market-data / quotes provider yet, so every field
      // that depends on the *current* market price is returned as 0. Once a
      // quotes API is wired up, compute and fill in: price, changePercent,
      // dailyPnl, marketValue, unrealizedPnl. `allocation` should then be
      // calculated from marketValue instead of costBasis.
      // -------------------------------------------------------------------
      result.push({
        ticker: position.ticker,
        name: position.ticker, // no company-name source available yet
        quantity: this.round(position.quantity),
        price: 0,
        changePercent: 0,
        dailyPnl: 0,
        avgPrice: this.round(avgPrice),
        costBasis: this.round(costBasis),
        marketValue: 0,
        unrealizedPnl: 0,
        allocation: this.round(allocation),
      });
    }

    // Show the largest positions first.
    result.sort((a, b) => b.allocation - a.allocation);

    return {
      positions: result,
      cash: this.round(cash),
      totalValue: this.round(totalValue),
    };
  }

  /**
   * Extracts the cash balance from the user's IBKR "Cash Report" rows.
   *
   * IBKR cash reports vary between export versions and account types, so this
   * looks for a row whose description mentions "ending cash" and takes the
   * first non-zero numeric column on that row. Returns 0 when nothing matches.
   */
  private async getCashBalance(userId: string): Promise<number> {
    const records = await this.statementRecordRepository.find({
      where: { userId, section: CASH_REPORT_SECTION },
      order: { createdAt: 'ASC' },
    });

    // Prefer the most recent statement if several were uploaded.
    for (let i = records.length - 1; i >= 0; i--) {
      const data = (records[i].rawData ?? {}) as Record<string, unknown>;
      const values = Object.values(data);
      const rowText = values
        .map((value) => String(value))
        .join(' ')
        .toLowerCase();

      if (
        !rowText.includes('ending cash') &&
        !rowText.includes('endingcash')
      ) {
        continue;
      }

      for (const value of values) {
        const parsed = this.parseNumber(value);
        if (parsed !== 0) {
          return parsed;
        }
      }
    }

    return 0;
  }

  /**
   * Returns the first non-empty value among the given candidate keys, or
   * undefined if none of them are present.
   */
  private readField(
    data: Record<string, unknown>,
    keys: string[],
  ): unknown {
    for (const key of keys) {
      const value = data[key];
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ''
      ) {
        return value;
      }
    }
    return undefined;
  }

  /**
   * Parses a numeric cell, tolerating thousands separators and empty values.
   */
  private parseNumber(value: unknown): number {
    if (value === null || value === undefined) return 0;
    const cleaned = String(value).replace(/,/g, '').trim();
    if (!cleaned) return 0;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  // Simple CSV line parser that handles commas inside quotes
  private parseCsvLine(text: string): string[] {
    const ret: string[] = [];
    let inQuote = false;
    let value = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (inQuote) {
        if (char === '"') {
          if (i + 1 < text.length && text[i + 1] === '"') {
            value += '"'; // escaped quote
            i++;
          } else {
            inQuote = false;
          }
        } else {
          value += char;
        }
      } else {
        if (char === '"') {
          inQuote = true;
        } else if (char === ',') {
          ret.push(value);
          value = '';
        } else {
          value += char;
        }
      }
    }
    ret.push(value);
    return ret;
  }
}

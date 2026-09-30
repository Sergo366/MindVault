import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatementRecord } from './entities/statement-record.entity';

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

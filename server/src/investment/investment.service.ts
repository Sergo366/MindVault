import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatementRecord } from './entities/statement-record.entity';
import { Portfolio } from './entities/portfolio.entity';
import {
  CreatedPortfolioDto,
  PortfolioDto,
  PortfolioSummaryDto,
} from './dtos/position.dto';
import { IbkrStatementParser } from './parsers/ibkr-statement-parser.service';
import { PortfolioBuilderService } from './portfolio/portfolio-builder.service';

/**
 * Thin facade over the investment feature. It orchestrates the collaborators
 * (parsing, aggregation, cash reporting) and keeps the persistence concerns
 * for statement records and portfolios.
 */
@Injectable()
export class InvestmentService {
  private readonly logger = new Logger(InvestmentService.name);

  constructor(
    @InjectRepository(StatementRecord)
    private readonly statementRecordRepository: Repository<StatementRecord>,
    @InjectRepository(Portfolio)
    private readonly portfolioRepository: Repository<Portfolio>,
    private readonly statementParser: IbkrStatementParser,
    private readonly portfolioBuilder: PortfolioBuilderService,
  ) {}

  async uploadStatementFiles(
    files: Express.Multer.File[],
    userId: string,
    portfolioId: string,
  ) {
    this.logger.log(
      `Processing ${files.length} statement files for user ${userId}`,
    );

    const { records, totalParsed } = this.statementParser.parseFiles(
      files,
      userId,
      portfolioId,
    );

    // Save all records to the database in chunks to prevent query too large errors
    if (records.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        // Using upsert based on the 'hash' column so we don't crash on duplicates
        await this.statementRecordRepository.upsert(
          this.statementRecordRepository.create(chunk),
          ['hash'],
        );
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
   * Lists the user's portfolios with their aggregate value (positions cost
   * basis + cash), used to render the portfolio cards on the client.
   */
  async getUserPortfolios(userId: string): Promise<PortfolioSummaryDto[]> {
    const portfolios = await this.portfolioRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });

    const summaries: PortfolioSummaryDto[] = [];
    for (const portfolio of portfolios) {
      const totals = await this.portfolioBuilder.buildPortfolio(userId, [
        portfolio.id,
      ]);
      summaries.push({
        id: portfolio.id,
        name: portfolio.name,
        cash: totals.cash,
        totalValue: totals.totalValue,
      });
    }
    return summaries;
  }

  /**
   * Positions for the given portfolios, or for every portfolio owned by the
   * user when `portfolioIds` is omitted.
   */
  async getUserPositions(
    userId: string,
    portfolioIds?: string[],
  ): Promise<PortfolioDto> {
    return this.portfolioBuilder.buildPortfolio(userId, portfolioIds);
  }

  async createPortfolio({
    userId,
    name,
  }: {
    userId: string;
    name: string;
  }): Promise<CreatedPortfolioDto> {
    const portfolio = this.portfolioRepository.create({ userId, name });
    return this.portfolioRepository.save(portfolio);
  }

  async deletePortfolioById({
    portfolioId,
    userId,
  }: {
    portfolioId: string;
    userId: string;
  }): Promise<boolean> {
    const portfolio = await this.portfolioRepository.delete({
      userId,
      id: portfolioId,
    });
    return Boolean(portfolio?.affected && portfolio.affected > 0);
  }

  async updatePortfolioNameById({
    portfolioId,
    userId,
    name,
  }: {
    portfolioId: string;
    userId: string;
    name: string;
  }): Promise<boolean> {
    const result = await this.portfolioRepository.update(
      { id: portfolioId, userId },
      { name },
    );
    return Boolean(result.affected && result.affected > 0);
  }
}

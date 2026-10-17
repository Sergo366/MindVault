import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvestmentService } from './investment.service';
import { InvestmentController } from './investment.controller';
import { StatementRecord } from './entities/statement-record.entity';
import { Portfolio } from './entities/portfolio.entity';
import { IbkrStatementParser } from './parsers/ibkr-statement-parser.service';
import { PortfolioBuilderService } from './portfolio/portfolio-builder.service';
import { CashReportService } from './cash/cash-report.service';
import { TwelveDataService } from './prices/twelve-data.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StatementRecord, Portfolio]),
    RedisModule,
  ],
  controllers: [InvestmentController],
  providers: [
    InvestmentService,
    IbkrStatementParser,
    PortfolioBuilderService,
    CashReportService,
    TwelveDataService,
  ],
})
export class InvestmentModule {}

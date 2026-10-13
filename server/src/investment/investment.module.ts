import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvestmentService } from './investment.service';
import { InvestmentController } from './investment.controller';
import { StatementRecord } from './entities/statement-record.entity';
import { Portfolio } from './entities/portfolio.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StatementRecord, Portfolio])],
  controllers: [InvestmentController],
  providers: [InvestmentService],
})
export class InvestmentModule {}

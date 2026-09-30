import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvestmentService } from './investment.service';
import { InvestmentController } from './investment.controller';
import { StatementRecord } from './entities/statement-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StatementRecord])],
  controllers: [InvestmentController],
  providers: [InvestmentService],
})
export class InvestmentModule {}

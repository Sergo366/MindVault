import {
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  UpdateDateColumn,
} from 'typeorm';
import { PrimaryColumnV7 } from '../../common/decorators/primary-column-v7.decorator';
import { IsString } from 'class-validator';
import { User } from '../../users/entities/user.entity';
import { StatementRecord } from './statement-record.entity';

@Entity()
export class Portfolio {
  @PrimaryColumnV7()
  id: string;

  @IsString()
  name: string;

  @ManyToOne(() => User, (user) => user.portfolios)
  user: User;

  @OneToMany(() => StatementRecord, (record) => record.portfolio)
  statementRecords: StatementRecord[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

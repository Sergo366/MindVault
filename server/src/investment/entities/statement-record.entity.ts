import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PrimaryColumnV7 } from '../../common/decorators/primary-column-v7.decorator';
import { Portfolio } from './portfolio.entity';

@Entity('statement_records')
export class StatementRecord {
  @PrimaryColumnV7()
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.statementRecords, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Nullable: existing rows predate portfolios, and uploads may not always be
  // assigned to one. Kept as an explicit column so rows can be filtered or
  // assigned directly (where: { portfolioId }) without loading the relation.
  @Column({ type: 'uuid', nullable: true })
  portfolioId: string | null;

  // Many-to-one only: Portfolio has no knowledge of its statement records,
  // so there is no inverse (OneToMany) side to point at.
  @ManyToOne(() => Portfolio, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'portfolioId' })
  portfolio: Portfolio | null;

  // The section from IBKR CSV (e.g., 'Trades', 'Dividends', 'Cash Report')
  @Column()
  section: string;

  // Storing the entire row as a JSON object so we never lose any fields
  @Column('json')
  rawData: Record<string, any>;

  // Unique hash to prevent duplicate rows from overlapping statement uploads
  @Column({ unique: true })
  hash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

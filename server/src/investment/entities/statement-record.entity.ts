import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('statement_records')
export class StatementRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.statementRecords, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

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

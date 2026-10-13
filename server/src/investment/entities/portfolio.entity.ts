import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  UpdateDateColumn,
  Column,
} from 'typeorm';
import { PrimaryColumnV7 } from '../../common/decorators/primary-column-v7.decorator';
import { IsString } from 'class-validator';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Portfolio {
  @PrimaryColumnV7()
  id: string;

  @IsString()
  name: string;

  // Explicit FK column, mirroring how StatementRecord references User, so the
  // portfolio can be filtered by owner without joining the relation.
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.portfolios, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

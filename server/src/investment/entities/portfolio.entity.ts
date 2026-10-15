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

  @Column()
  @IsString()
  name: string;

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

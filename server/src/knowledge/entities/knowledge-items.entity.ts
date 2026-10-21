import { PrimaryColumnV7 } from '../../common/decorators/primary-column-v7.decorator';
import { Column, CreateDateColumn, Entity, UpdateDateColumn } from 'typeorm';
import { IsOptional, IsString } from 'class-validator';

@Entity()
export class KnowledgeItems {
  @PrimaryColumnV7()
  id: string;

  @Column({ type: 'varchar', length: 100 })
  @IsString()
  name: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  @IsString()
  @IsOptional()
  description: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

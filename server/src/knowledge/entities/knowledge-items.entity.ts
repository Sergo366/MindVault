import { PrimaryColumnV7 } from '../../common/decorators/primary-column-v7.decorator';
import { Column, CreateDateColumn, Entity, UpdateDateColumn } from 'typeorm';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export const KNOWLEDGE_ITEM_NAME_MAX_LENGTH = 100;
export const KNOWLEDGE_ITEM_DESCRIPTION_MAX_LENGTH = 300;

@Entity()
export class KnowledgeItems {
  @PrimaryColumnV7()
  id: string;

  @Column({ type: 'varchar', length: KNOWLEDGE_ITEM_NAME_MAX_LENGTH })
  @IsString()
  @MaxLength(KNOWLEDGE_ITEM_NAME_MAX_LENGTH)
  name: string;

  @Column({
    type: 'varchar',
    length: KNOWLEDGE_ITEM_DESCRIPTION_MAX_LENGTH,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(KNOWLEDGE_ITEM_DESCRIPTION_MAX_LENGTH)
  description: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import { BeforeInsert, PrimaryColumn } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

/**
 * Shared base for every entity in the app.
 *
 * Uses UUID v7 instead of the default `@PrimaryGeneratedColumn('uuid')`.
 *
 * Why: `@PrimaryGeneratedColumn('uuid')` always generates a random UUID v4,
 * and TypeORM exposes no option to pick a different UUID version. UUID v7 is
 * time-ordered, so new rows are appended to the end of InnoDB's clustered
 * primary-key index instead of being scattered. That keeps bulk inserts (e.g.
 * IBKR statement imports) fast and reduces page fragmentation.
 *
 * The column stays `varchar(36)` in MySQL, so no migration is required — v7
 * values are the same length as v4.
 */
export abstract class BaseEntity {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  assignId(): void {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}

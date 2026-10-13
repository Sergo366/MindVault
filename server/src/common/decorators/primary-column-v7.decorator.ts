import { BeforeInsert, PrimaryColumn, PrimaryColumnOptions } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

/**
 * Drop-in replacement for `@PrimaryColumn('uuid')` that fills the column with
 * a time-ordered UUID v7 on insert, instead of the random UUID v4 that
 * `@PrimaryGeneratedColumn('uuid')` would produce.
 *
 * Why UUID v7: the values are (roughly) time-ordered, so new rows are appended
 * at the end of InnoDB's clustered primary-key index rather than being
 * scattered across it. That keeps bulk inserts (e.g. IBKR statement imports)
 * fast and reduces page fragmentation. The column stays `varchar(36)` in MySQL,
 * so no migration is needed — v7 values are the same length as v4.
 *
 * Unlike a shared base entity, a property decorator does not occupy the class's
 * single `extends` slot, so entities stay free to extend something else
 * (including TypeORM's own `BaseEntity`).
 *
 * Usage:
 *
 *   @Entity()
 *   export class User {
 *     @PrimaryColumnV7()
 *     id: string;
 *
 *     // ...
 *   }
 */
export function PrimaryColumnV7(
  options?: PrimaryColumnOptions,
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    // 1. Register the property as a UUID primary column.
    PrimaryColumn('uuid', options)(target, propertyKey);

    // 2. Define a hidden hook method on the prototype. TypeORM's `BeforeInsert`
    //    only works on *methods*, so the generation logic has to live in one.
    //    The name is derived from the property so a class could decorate more
    //    than one column without the hooks clashing.
    const hookName = `__assignUuidV7_${String(propertyKey)}`;

    Object.defineProperty(target, hookName, {
      value(this: Record<string | symbol, unknown>) {
        if (!this[propertyKey]) {
          this[propertyKey] = uuidv7();
        }
      },
      enumerable: false,
      writable: true,
      configurable: true,
    });

    // 3. Register that method as a `before-insert` hook. `BeforeInsert()` is
    //    typed as a full MethodDecorator (which requires a property descriptor
    //    argument), but the runtime only reads `target` and `propertyKey`, so
    //    it is cast to the two-argument form here.
    const registerBeforeInsert = BeforeInsert() as unknown as (
      target: object,
      propertyKey: string | symbol,
    ) => void;
    registerBeforeInsert(target, hookName);
  };
}

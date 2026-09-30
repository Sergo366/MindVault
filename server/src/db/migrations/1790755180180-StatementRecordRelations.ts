import { MigrationInterface, QueryRunner } from "typeorm";

export class StatementRecordRelations1790755180180 implements MigrationInterface {
    name = 'StatementRecordRelations1790755180180'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`statement_records\` ADD CONSTRAINT \`FK_16701f3885d87876735400439ef\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`statement_records\` DROP FOREIGN KEY \`FK_16701f3885d87876735400439ef\``);
    }

}

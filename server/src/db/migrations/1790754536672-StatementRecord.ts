import { MigrationInterface, QueryRunner } from "typeorm";

export class StatementRecord1790754536672 implements MigrationInterface {
    name = 'StatementRecord1790754536672'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`statement_records\` (\`id\` varchar(36) NOT NULL, \`userId\` varchar(255) NOT NULL, \`section\` varchar(255) NOT NULL, \`rawData\` json NOT NULL, \`hash\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_1b4216e445690a58f482930ff0\` (\`hash\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_1b4216e445690a58f482930ff0\` ON \`statement_records\``);
        await queryRunner.query(`DROP TABLE \`statement_records\``);
    }

}

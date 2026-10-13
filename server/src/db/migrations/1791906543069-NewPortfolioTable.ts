import { MigrationInterface, QueryRunner } from "typeorm";

export class NewPortfolioTable1791906543069 implements MigrationInterface {
    name = 'NewPortfolioTable1791906543069'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`portfolio\` (\`id\` varchar(255) NOT NULL, \`userId\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`statement_records\` ADD \`portfolioId\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`statement_records\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`statement_records\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`statement_records\` ADD \`id\` varchar(255) NOT NULL PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`statement_records\` DROP FOREIGN KEY \`FK_16701f3885d87876735400439ef\``);
        await queryRunner.query(`ALTER TABLE \`user\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`id\` varchar(255) NOT NULL PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`portfolio\` ADD CONSTRAINT \`FK_9d041c43c782a9135df1388ae16\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`statement_records\` ADD CONSTRAINT \`FK_16701f3885d87876735400439ef\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`statement_records\` ADD CONSTRAINT \`FK_afcd94bdefa6f8aa4af8c2b6474\` FOREIGN KEY (\`portfolioId\`) REFERENCES \`portfolio\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`statement_records\` DROP FOREIGN KEY \`FK_afcd94bdefa6f8aa4af8c2b6474\``);
        await queryRunner.query(`ALTER TABLE \`statement_records\` DROP FOREIGN KEY \`FK_16701f3885d87876735400439ef\``);
        await queryRunner.query(`ALTER TABLE \`portfolio\` DROP FOREIGN KEY \`FK_9d041c43c782a9135df1388ae16\``);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`id\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` ADD PRIMARY KEY (\`id\`)`);
        await queryRunner.query(`ALTER TABLE \`statement_records\` ADD CONSTRAINT \`FK_16701f3885d87876735400439ef\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`statement_records\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`statement_records\` ADD \`id\` varchar(36) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`statement_records\` ADD PRIMARY KEY (\`id\`)`);
        await queryRunner.query(`ALTER TABLE \`statement_records\` DROP COLUMN \`portfolioId\``);
        await queryRunner.query(`DROP TABLE \`portfolio\``);
    }

}

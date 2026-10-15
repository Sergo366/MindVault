import { MigrationInterface, QueryRunner } from "typeorm";

export class NewPortfolioTableFix1792046285558 implements MigrationInterface {
    name = 'NewPortfolioTableFix1792046285558'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`portfolio\` ADD \`name\` varchar(255) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`portfolio\` DROP COLUMN \`name\``);
    }

}

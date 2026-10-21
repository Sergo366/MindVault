import { MigrationInterface, QueryRunner } from "typeorm";

export class KnowledgeItemsEntityUserId1792568804251 implements MigrationInterface {
    name = 'KnowledgeItemsEntityUserId1792568804251'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`knowledge_items\` ADD \`userId\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`knowledge_items\` ADD CONSTRAINT \`FK_60fd9c756aef861bdf9130b2206\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`knowledge_items\` DROP FOREIGN KEY \`FK_60fd9c756aef861bdf9130b2206\``);
        await queryRunner.query(`ALTER TABLE \`knowledge_items\` DROP COLUMN \`userId\``);
    }

}

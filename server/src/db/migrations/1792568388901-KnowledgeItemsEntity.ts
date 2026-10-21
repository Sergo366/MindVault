import { MigrationInterface, QueryRunner } from "typeorm";

export class KnowledgeItemsEntity1792568388901 implements MigrationInterface {
    name = 'KnowledgeItemsEntity1792568388901'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`knowledge_items\` (\`id\` varchar(255) NOT NULL, \`name\` varchar(100) NOT NULL, \`description\` varchar(300) NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`knowledge_items\``);
    }

}

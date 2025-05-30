import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRoleAuditLogTable1748614370168 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the role_audit_logs table
        await queryRunner.query(`
            CREATE TABLE role_audit_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                action VARCHAR NOT NULL,
                changes JSONB,
                role_id UUID NOT NULL,
                performed_by UUID NOT NULL,
                description VARCHAR,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create foreign key for role_id referencing roles table
        await queryRunner.query(`
            ALTER TABLE role_audit_logs
            ADD CONSTRAINT fk_role_audit_logs_role
            FOREIGN KEY (role_id)
            REFERENCES roles(id)
            ON DELETE CASCADE;
        `);

        // Create foreign key for performed_by referencing users table
        await queryRunner.query(`
            ALTER TABLE role_audit_logs
            ADD CONSTRAINT fk_role_audit_logs_user
            FOREIGN KEY (performed_by)
            REFERENCES users(id)
            ON DELETE SET NULL;
        `);

        // Create indexes for better query performance
        await queryRunner.query(`
            CREATE INDEX idx_role_audit_logs_role_id ON role_audit_logs(role_id);
            CREATE INDEX idx_role_audit_logs_performed_by ON role_audit_logs(performed_by);
            CREATE INDEX idx_role_audit_logs_created_at ON role_audit_logs(created_at);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the role_audit_logs table and its constraints
        await queryRunner.query(`
            DROP TABLE IF EXISTS role_audit_logs CASCADE;
        `);
    }
}

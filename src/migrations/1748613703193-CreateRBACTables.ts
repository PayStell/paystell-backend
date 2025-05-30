import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRBACTables1748613703193 implements MigrationInterface {
    name = 'CreateRBACTables1748613703193'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create permissions table
        await queryRunner.query(`
            CREATE TABLE "permissions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "description" character varying NOT NULL,
                "action" character varying NOT NULL,
                "resource" character varying NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_permissions_name" UNIQUE ("name"),
                CONSTRAINT "PK_permissions" PRIMARY KEY ("id")
            )
        `);

        // Create roles table
        await queryRunner.query(`
            CREATE TABLE "roles" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "description" character varying NOT NULL,
                "isSystem" boolean NOT NULL DEFAULT false,
                "merchantId" uuid,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_roles" PRIMARY KEY ("id")
            )
        `);

        // Create role_permissions table
        await queryRunner.query(`
            CREATE TABLE "role_permissions" (
                "role_id" uuid NOT NULL,
                "permission_id" uuid NOT NULL,
                CONSTRAINT "PK_role_permissions" PRIMARY KEY ("role_id", "permission_id")
            )
        `);

        // Create user_roles table
        await queryRunner.query(`
            CREATE TABLE "user_roles" (
                "user_id" integer NOT NULL,
                "role_id" uuid NOT NULL,
                CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role_id")
            )
        `);

        // Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "roles"
            ADD CONSTRAINT "FK_roles_merchant"
            FOREIGN KEY ("merchantId")
            REFERENCES "merchants"("id")
            ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "role_permissions"
            ADD CONSTRAINT "FK_role_permissions_role"
            FOREIGN KEY ("role_id")
            REFERENCES "roles"("id")
            ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "role_permissions"
            ADD CONSTRAINT "FK_role_permissions_permission"
            FOREIGN KEY ("permission_id")
            REFERENCES "permissions"("id")
            ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "user_roles"
            ADD CONSTRAINT "FK_user_roles_user"
            FOREIGN KEY ("user_id")
            REFERENCES "users"("id")
            ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "user_roles"
            ADD CONSTRAINT "FK_user_roles_role"
            FOREIGN KEY ("role_id")
            REFERENCES "roles"("id")
            ON DELETE CASCADE
        `);

        // Insert default permissions
        await queryRunner.query(`
            INSERT INTO "permissions" ("name", "description", "action", "resource")
            VALUES
                ('view_users', 'View users', 'view', 'users'),
                ('edit_users', 'Edit users', 'edit', 'users'),
                ('delete_users', 'Delete users', 'delete', 'users'),
                ('view_roles', 'View roles', 'view', 'roles'),
                ('create_roles', 'Create roles', 'create', 'roles'),
                ('edit_roles', 'Edit roles', 'edit', 'roles'),
                ('delete_roles', 'Delete roles', 'delete', 'roles'),
                ('assign_roles', 'Assign roles to users', 'assign', 'roles'),
                ('view_transactions', 'View transactions', 'view', 'transactions'),
                ('edit_transactions', 'Edit transactions', 'edit', 'transactions'),
                ('delete_transactions', 'Delete transactions', 'delete', 'transactions')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT "FK_user_roles_role"`);
        await queryRunner.query(`ALTER TABLE "user_roles" DROP CONSTRAINT "FK_user_roles_user"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_role_permissions_permission"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_role_permissions_role"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT "FK_roles_merchant"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "user_roles"`);
        await queryRunner.query(`DROP TABLE "role_permissions"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP TABLE "permissions"`);
    }

}

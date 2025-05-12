import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import { User } from "../entities/User";
import { TwoFactorAuth } from "../entities/TwoFactorAuth";
import { Session } from "../entities/Session";
import { EmailVerification } from "../entities/emailVerification";
import { WalletVerification } from "../entities/WalletVerification";
import { MerchantEntity } from "../entities/Merchant.entity";
import { MerchantWebhookEntity } from "../entities/MerchantWebhook.entity";
import { MerchantWebhookEventEntity } from "../entities/MerchantWebhookEvent.entity";
import { PaymentLink } from "../entities/PaymentLink";

dotenv.config();

const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE,
  synchronize: true,
  dropSchema: false,
  logging: true,
  entities: [
    User,
    TwoFactorAuth,
    Session,
    EmailVerification,
    WalletVerification,
    MerchantEntity,
    MerchantWebhookEntity,
    MerchantWebhookEventEntity,
    PaymentLink,
  ],
  migrations: ["src/migrations/*.ts"],
  migrationsTableName: "migrations",
});

export default AppDataSource;

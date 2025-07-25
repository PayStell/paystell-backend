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
import { Referral } from "../entities/Referral";
import { ReferralReward } from "../entities/ReferralReward";
import { ReferralProgram } from "../entities/ReferralProgram";
import { AuditLog } from "../entities/AuditLog";
import { AuditSubscriber } from "../subscribers/AuditSubscriber";
import { Wallet } from "src/entities/Wallet";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE,
  synchronize: true,
  dropSchema: false,
  ssl: false,
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
    Referral,
    ReferralReward,
    ReferralProgram,
    AuditLog,
    Wallet,
  ],
  subscribers: [AuditSubscriber],
  migrations: ["src/migrations/*.ts"],
  migrationsTableName: "migrations",
});

export default AppDataSource;

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
import { WebhookLog } from "../entities/WebhookLog";
import { Subscription } from "../entities/Subscription";
import { BillingCycle } from "../entities/BillingCycle";
import { SubscriptionEvent } from "../entities/SubscriptionEvent";
import { Transaction } from "../entities/Transaction";
import { Payment } from "../entities/Payment";
import { InAppNotificationEntity } from "../entities/InAppNotification.entity";
import { FraudAlert } from "../entities/FraudAlert";
import { MerchantFraudConfig } from "../entities/MerchantFraudConfig";
import { RateLimitEvent } from "../entities/RateLimitEvent";
import { AuditSubscriber } from "../subscribers/AuditSubscriber";

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
    WebhookLog,
    Subscription,
    BillingCycle,
    SubscriptionEvent,
    Transaction,
    Payment,
    InAppNotificationEntity,
    FraudAlert,
    MerchantFraudConfig,
    RateLimitEvent,
  ],
  subscribers: [AuditSubscriber],
  migrations: ["src/migrations/*.ts"],
  migrationsTableName: "migrations",
});

export default AppDataSource;

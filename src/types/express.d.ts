import { User } from "../entities/User";
import { UserRole } from "../enums/UserRole";
import { Merchant } from "../interfaces/webhook.interfaces";
import { MerchantEntity } from "../entities/Merchant.entity";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: number;
      email: string;
      name?: string;
      role?: UserRole;
      tokenExp?: number;
      jti?: string;
      isEmailVerified?: boolean;
      isWalletVerified?: boolean;
      walletAddress?: string;
      logoUrl?: string;
      createdAt?: Date;
      updatedAt?: Date;
    };
    merchant?: Merchant;
    validatedIp?: string;
    tokenExp?: number;
    requestId?: string;
    config?: {
      get: (key: string, defaultValue?: string) => Promise<string | number | boolean | Record<string, unknown> | null>;
      isFeatureEnabled: (flagName: string, context?: {
        userId?: string;
        merchantId?: string;
        userRole?: string;
      }) => Promise<boolean>;
    };
    environment?: string;
    appConfig?: {
      name: string;
      version: string;
      environment: string;
    };
  }
}

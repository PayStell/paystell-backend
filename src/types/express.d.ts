import { User } from "../entities/User";
import { UserRole } from "../enums/UserRole";
import { Merchant } from "../interfaces/webhook.interfaces";

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
  }
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Transaction } from "./Transaction";

export enum WalletStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  NEEDS_VERIFICATION = "NEEDS_VERIFICATION",
}

@Entity("wallets")
export class Wallet {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column({ unique: true })
  publicKey: string;

  @Column({ nullable: true })
  encryptedSecretKey: string;

  @Column({
    type: "enum",
    enum: WalletStatus,
    default: WalletStatus.INACTIVE,
  })
  status: WalletStatus;

  @Column({ type: "json", nullable: true })
  settings?: {
    notifications?: boolean;
    displayPreferences?: {
      currency?: string;
      theme?: "light" | "dark";
      language?: string;
      showBalanceInFiat?: boolean;
    };
  };

  @Column({ default: false })
  isVerified: boolean;

  @OneToMany(() => Transaction, (transaction) => transaction.wallet)
  transactions: Transaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

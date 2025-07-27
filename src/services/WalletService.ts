import type { Repository } from "typeorm";
import AppDataSource from "../config/db";
import { Wallet, WalletStatus } from "../entities/Wallet";
import {
  Transaction,
  TransactionStatus,
  TransactionType,
  PaymentMethod,
} from "../entities/Transaction";
import { Balance } from "../entities/Balance";
import { StellarService } from "./StellarService";
import { encrypt, decrypt } from "../utils/encryption";

// Type definitions for wallet settings
interface WalletSettings {
  notifications?: boolean;
  displayPreferences?: {
    currency?: string;
    theme?: "light" | "dark";
    language?: string;
    showBalanceInFiat?: boolean;
  };
  [key: string]: unknown;
}

// Helper function to safely extract error message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unknown error occurred";
};

export class WalletService {
  private walletRepository: Repository<Wallet>;
  private transactionRepository: Repository<Transaction>;
  private balanceRepository: Repository<Balance>;
  private stellarService: StellarService;

  constructor() {
    this.walletRepository = AppDataSource.getRepository(Wallet);
    this.transactionRepository = AppDataSource.getRepository(Transaction);
    this.balanceRepository = AppDataSource.getRepository(Balance);
    this.stellarService = new StellarService();
  }

  async createWallet(userId: string): Promise<Wallet> {
    const existingWallet = await this.walletRepository.findOne({
      where: { userId },
    });
    if (existingWallet) {
      throw new Error("Wallet already exists for this user");
    }

    const keypair = this.stellarService.generateKeypair();
    const encryptedSecretKey = encrypt(keypair.secret());

    const wallet = this.walletRepository.create({
      userId,
      publicKey: keypair.publicKey(),
      encryptedSecretKey,
      status: WalletStatus.INACTIVE,
      settings: {
        notifications: true,
      },
    });

    return await this.walletRepository.save(wallet);
  }

  async getWalletByUserId(userId: string): Promise<Wallet | null> {
    return await this.walletRepository.findOne({ where: { userId } });
  }

  async getWalletBalances(walletId: string): Promise<unknown[]> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    try {
      const balances = await this.stellarService.getAccountBalances(
        wallet.publicKey,
      );
      for (const balance of balances) {
        await this.balanceRepository.upsert(
          {
            walletId,
            assetCode: balance.assetCode,
            assetIssuer: balance.assetIssuer,
            balance: balance.balance,
            assetType: balance.assetType,
            isAuthorized: balance.isAuthorized,
            isAuthorizedToMaintainLiabilities:
              balance.isAuthorizedToMaintainLiabilities,
            isClawbackEnabled: balance.isClawbackEnabled,
            lastModifiedLedger: balance.lastModifiedLedger,
            limit: balance.limit,
            sponsor: balance.sponsor,
          },
          ["walletId", "assetCode", "assetIssuer"],
        );
      }

      return balances;
    } catch (error: unknown) {
      console.warn(
        `Failed to fetch live balances: ${getErrorMessage(error)}, using cached data`,
      );
      const cachedBalances = await this.balanceRepository.find({
        where: { walletId },
      });
      return cachedBalances.map((b) => ({
        assetCode: b.assetCode,
        assetIssuer: b.assetIssuer,
        balance: b.balance,
        assetType:
          b.assetType ||
          (b.assetCode === "XLM" ? "native" : "credit_alphanum4"),
        isAuthorized: b.isAuthorized,
        isAuthorizedToMaintainLiabilities: b.isAuthorizedToMaintainLiabilities,
        isClawbackEnabled: b.isClawbackEnabled,
        lastModifiedLedger: b.lastModifiedLedger,
        limit: b.limit,
        sponsor: b.sponsor,
      }));
    }
  }

  async getTransactions(
    walletId: string,
    page = 1,
    limit = 20,
    sort: "asc" | "desc" = "desc",
  ) {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    const [transactions, total] = await this.transactionRepository.findAndCount(
      {
        where: { walletId },
        order: { createdAt: sort === "desc" ? "DESC" : "ASC" },
        skip: (page - 1) * limit,
        take: limit,
      },
    );

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTransactionById(transactionId: string): Promise<Transaction | null> {
    return await this.transactionRepository.findOne({
      where: { id: transactionId },
      relations: ["wallet"],
    });
  }

  async sendPayment(
    walletId: string,
    destinationAddress: string,
    amount: string,
    assetCode = "XLM",
    assetIssuer?: string,
    memo?: string,
  ): Promise<Transaction> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    if (wallet.status !== WalletStatus.ACTIVE) {
      throw new Error("Wallet is not active");
    }

    // Validate destination address
    if (!this.stellarService.isValidPublicKey(destinationAddress)) {
      throw new Error("Invalid destination address");
    }

    // Validate amount
    const numAmount = Number.parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error("Invalid amount");
    }

    // Create pending transaction record with merged entity structure
    const transaction = this.transactionRepository.create({
      walletId,
      type: TransactionType.PAYMENT,
      status: TransactionStatus.PENDING,
      sourceAccount: wallet.publicKey,
      destinationAccount: destinationAddress,
      amount: numAmount,
      assetCode,
      assetIssuer,
      memo,
      hash: "",
      paymentMethod: PaymentMethod.WALLET,
      description: `Payment to ${destinationAddress}`,
      reference: `wallet-${walletId}-${Date.now()}`,
    });

    const savedTransaction = await this.transactionRepository.save(transaction);

    try {
      // Decrypt secret key for signing
      const secretKey = decrypt(wallet.encryptedSecretKey!);

      // Submit payment to Stellar network
      const result = await this.stellarService.submitPayment(
        secretKey,
        destinationAddress,
        amount,
        assetCode,
        assetIssuer,
        memo,
      );

      // Update transaction with success
      savedTransaction.hash = result.hash;
      savedTransaction.status = TransactionStatus.SUCCESS;
      savedTransaction.fee = "0"; // Stellar SDK v12+ doesn't return fee_charged directly
      savedTransaction.metadata = {
        ...savedTransaction.metadata,
        stellarResult: result,
      };

      return await this.transactionRepository.save(savedTransaction);
    } catch (error: unknown) {
      savedTransaction.status = TransactionStatus.FAILED;
      savedTransaction.metadata = {
        ...savedTransaction.metadata,
        error: getErrorMessage(error),
      };
      await this.transactionRepository.save(savedTransaction);

      throw error;
    }
  }

  async activateWallet(walletId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    wallet.status = WalletStatus.ACTIVE;
    return await this.walletRepository.save(wallet);
  }

  async verifyWallet(walletId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    wallet.isVerified = true;
    if (wallet.status === WalletStatus.NEEDS_VERIFICATION) {
      wallet.status = WalletStatus.ACTIVE;
    }

    return await this.walletRepository.save(wallet);
  }

  async updateWalletSettings(
    walletId: string,
    settings: WalletSettings,
  ): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    wallet.settings = { ...wallet.settings, ...settings };
    return await this.walletRepository.save(wallet);
  }

  async getWalletInfo(walletId: string) {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    try {
      const accountInfo = await this.stellarService.getAccountInfo(
        wallet.publicKey,
      );
      const accountExists = await this.stellarService.checkAccountExists(
        wallet.publicKey,
      );

      return {
        ...accountInfo,
        exists: accountExists,
        publicKey: wallet.publicKey,
      };
    } catch (error: unknown) {
      throw new Error(`Failed to get wallet info: ${getErrorMessage(error)}`);
    }
  }

  async estimateTransactionFee(operationCount = 1): Promise<string> {
    try {
      return await this.stellarService.estimateFee(operationCount);
    } catch (error: unknown) {
      throw new Error(`Failed to estimate fee: ${getErrorMessage(error)}`);
    }
  }

  async syncTransactionsFromBlockchain(walletId: string) {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    try {
      const stellarTransactions =
        await this.stellarService.getAccountTransactions(
          wallet.publicKey,
          undefined,
          50,
        );

      for (const stellarTx of stellarTransactions) {
        const existingTx = await this.transactionRepository.findOne({
          where: { hash: stellarTx.hash },
        });

        if (!existingTx) {
          const transaction = this.transactionRepository.create({
            hash: stellarTx.hash,
            type: TransactionType.PAYMENT,
            status: stellarTx.successful
              ? TransactionStatus.SUCCESS
              : TransactionStatus.FAILED,
            sourceAccount: stellarTx.source_account,
            amount: 0,
            fee: "0",
            paymentMethod: PaymentMethod.WALLET,
            metadata: {
              stellarTransaction: stellarTx,
              syncedFromBlockchain: true,
            },
          });
          transaction.walletId = walletId;
          await this.transactionRepository.save(transaction);
        }
      }
    } catch (error: unknown) {
      throw new Error(`Failed to sync transactions: ${getErrorMessage(error)}`);
    }
  }
}

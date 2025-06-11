import { Horizon } from "@stellar/stellar-sdk";
import {
  Keypair,
  TransactionBuilder,
  Memo,
  xdr,
  TimeoutInfinite,
  Contract,
} from "@stellar/stellar-sdk";
const { Server } = Horizon;
import { Redis, RedisOptions } from "ioredis";
import {
  MerchantRegistrationDTO,
  TokenSupportDTO,
  PaymentProcessingDTO,
  PaymentOrderDTO,
} from "../dtos/StellarContractDTO";
import { AppError } from "../utils/AppError";
import { validateSignature } from "../utils/validateSignature";
import logger from "../utils/logger";
import config from "../config/stellarConfig";

interface PaymentOrder {
  merchantAddress: string;
  tokenAddress: string;
  amount: string;
  nonce: string;
}

interface MerchantDetails {
  name: string;
  email: string;
  registeredAt: string;
  supportedTokens: string[];
}

export class StellarContractService {
  private server: InstanceType<typeof Server>;
  private contract: InstanceType<typeof Contract>;
  private contractId: string;
  private networkPassphrase: string;
  private redis: Redis;
  private adminKeypair: InstanceType<typeof Keypair>;

  constructor(options?: {
    server?: InstanceType<typeof Server>;
    redis?: Redis;
    contractId?: string;
  }) {
    this.server = options?.server || new Server(config.STELLAR_HORIZON_URL);

    const contractId = config.SOROBAN_CONTRACT_ID;
    if (!contractId) {
      throw new AppError("SOROBAN_CONTRACT_ID is not configured", 500);
    }
    this.contractId = contractId;

    this.contract = new Contract(this.contractId);
    this.networkPassphrase = config.STELLAR_NETWORK_PASSPHRASE;

    // Initialize Redis with proper configuration
    const redisOptions: RedisOptions = {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
      username: process.env.REDIS_USERNAME,
      retryStrategy: (times: number) => {
        return Math.min(Math.pow(2, times) * 50, 2000);
      },
    };

    this.redis =
      options?.redis ||
      (process.env.REDIS_URL
        ? new Redis(process.env.REDIS_URL)
        : new Redis(redisOptions));
    // Handle Redis connection events
    this.redis.on("error", (error) => {
      logger.error("Redis connection error:", error);
    });

    this.redis.on("connect", () => {
      logger.info("Connected to Redis");
    });

    if (!process.env.CONTRACT_ADMIN_SECRET) {
      throw new AppError("CONTRACT_ADMIN_SECRET is not configured", 500);
    }
    this.adminKeypair = Keypair.fromSecret(process.env.CONTRACT_ADMIN_SECRET);
  }

  /**
   * Initialize the contract client
   */
  private async initializeContract() {
    try {
      // Verify contract exists and is deployed
      const account = await this.server.loadAccount(this.contractId);

      return account;
    } catch (error) {
      logger.error("Contract initialization failed:", error);
      throw new AppError("Failed to initialize contract", 500);
    }
  }

  /**
   * Register a new merchant
   */
  async registerMerchant(data: MerchantRegistrationDTO): Promise<boolean> {
    try {
      const account = await this.initializeContract();

      const transaction = new TransactionBuilder(account, {
        fee: String(await this.server.fetchBaseFee()),
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          this.contract.call(
            "register_merchant",
            xdr.ScVal.scvString(data.merchantAddress),
          ),
        )
        .setTimeout(TimeoutInfinite)
        .build();
      // Sign with the contract admin or merchant key
      transaction.sign(this.adminKeypair);

      // Submit the transaction
      const response = await this.server.submitTransaction(transaction);

      if (response.successful) {
        // Cache merchant data in Redis
        await this.redis.hset(`merchant:${data.merchantAddress}`, {
          name: data.name,
          email: data.email,
          registeredAt: new Date().toISOString(),
        });
        return true;
      }

      return false;
    } catch (error) {
      logger.error("Merchant registration failed:", error);
      const err = error as {
        response?: {
          data?: { extras?: { result_codes?: { operations?: string[] } } };
        };
      };
      if (
        err.response?.data?.extras?.result_codes?.operations?.[0] ===
        "op_already_exists"
      ) {
        throw new AppError("Merchant already registered", 409);
      }
      throw new AppError("Failed to register merchant", 500);
    }
  }

  /**
   * Add supported token for a merchant
   */
  async addSupportedToken(data: TokenSupportDTO): Promise<boolean> {
    try {
      const account = await this.initializeContract();

      const transaction = new TransactionBuilder(account, {
        fee: String(await this.server.fetchBaseFee()),
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          this.contract.call(
            "add_supported_token",
            xdr.ScVal.scvString(data.merchantAddress),
            xdr.ScVal.scvString(data.tokenAddress),
          ),
        )
        .setTimeout(TimeoutInfinite)
        .build();
      // Sign with the contract admin or merchant key
      transaction.sign(this.adminKeypair);

      const response = await this.server.submitTransaction(transaction);

      if (response.successful) {
        // Update merchant's supported tokens in cache
        await this.redis.sadd(
          `merchant:${data.merchantAddress}:tokens`,
          data.tokenAddress,
        );
        return true;
      }

      return false;
    } catch (error) {
      logger.error("Error adding supported token:", error);
      throw new AppError("Failed to add token support", 500);
    }
  }

  /**
   * Process a payment with signature verification
   */
  async processPayment(data: PaymentProcessingDTO): Promise<string> {
    try {
      const account = await this.initializeContract();

      // Verify signature
      const isValidSignature = await validateSignature(
        data.paymentOrder,
        data.signature,
        data.merchantPublicKey,
      );

      if (!isValidSignature) {
        throw new AppError("Invalid signature", 400);
      }

      // Check if nonce was already used
      const nonceKey = `nonce:${data.paymentOrder.merchantAddress}:${data.paymentOrder.nonce}`;
      const nonceData = await this.redis.get(nonceKey);
      if (nonceData) {
        // Nonce exists and TTL hasn't expired yet
        throw new AppError("Nonce already used", 400);
      }

      // Check if merchant exists using a pipeline for better performance
      const pipeline = this.redis.pipeline();
      pipeline.exists(`merchant:${data.paymentOrder.merchantAddress}`);
      pipeline.sismember(
        `merchant:${data.paymentOrder.merchantAddress}:tokens`,
        data.paymentOrder.tokenAddress,
      );
      const results = await pipeline.exec();
      if (!results) {
        throw new AppError("Failed to check merchant status", 500);
      }
      const [merchantExistsResult, isTokenSupportedResult] = results;

      if (!merchantExistsResult[1]) {
        throw new AppError("Merchant not found", 404);
      }

      if (!isTokenSupportedResult[1]) {
        throw new AppError("Token not supported by merchant", 400);
      }

      // Build and submit transaction
      const txBuilder = new TransactionBuilder(account, {
        fee: String(await this.server.fetchBaseFee()),
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(
          this.contract.call(
            "process_payment_with_signature",
            xdr.ScVal.scvString(data.payerAddress),
            xdr.ScVal.scvString(this.serializePaymentOrder(data.paymentOrder)),
            xdr.ScVal.scvString(data.signature),
            xdr.ScVal.scvString(data.merchantPublicKey),
          ),
        )
        .setTimeout(TimeoutInfinite);

      if (data.memo) {
        txBuilder.addMemo(Memo.text(data.memo));
      }

      const transaction = txBuilder.build();
      // Sign with the contract admin or merchant key
      transaction.sign(this.adminKeypair);
      const response = await this.server.submitTransaction(transaction);

      if (response.successful) {
        // Store used nonce with expiration
        await this.redis.setex(nonceKey, 86400, Date.now().toString()); // 24 hours expiration
        return response.hash;
      }

      throw new AppError("Payment processing failed", 500);
    } catch (error) {
      logger.error("Payment processing failed:", error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Failed to process payment", 500);
    }
  }

  /**
   * Get merchant details including supported tokens
   */
  async getMerchantDetails(merchantAddress: string): Promise<MerchantDetails> {
    try {
      const merchantData = await this.redis.hgetall(
        `merchant:${merchantAddress}`,
      );
      if (!merchantData || Object.keys(merchantData).length === 0) {
        throw new AppError("Merchant not found", 404);
      }

      const supportedTokens = await this.redis.smembers(
        `merchant:${merchantAddress}:tokens`,
      );

      return {
        name: merchantData.name,
        email: merchantData.email,
        registeredAt: merchantData.registeredAt,
        supportedTokens,
      };
    } catch (error) {
      logger.error("Failed to get merchant details:", error);
      throw new AppError("Failed to get merchant details", 500);
    }
  }

  /**
   * Serialize payment order using the PaymentOrder interface
   */
  private serializePaymentOrder(
    paymentOrder: PaymentOrderDTO | PaymentOrder,
  ): string {
    return JSON.stringify(paymentOrder);
  }
}

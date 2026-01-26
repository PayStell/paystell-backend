import {
  Horizon,
  Asset,
  Keypair,
  TransactionBuilder,
  Operation,
  Networks,
  BASE_FEE,
  Memo,
} from "@stellar/stellar-sdk";
import { AssetConfigurationService } from "./AssetConfigurationService";
import { AssetPriceService } from "./AssetPriceService";
import { AppError } from "../utils/AppError";
import logger from "../utils/logger";

interface PathAsset {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
}

interface PathPaymentResult {
  transactionHash: string;
  sourceAmount: string;
  destinationAmount: string;
  path: PathAsset[];
  fee: string;
  timestamp: Date;
}

interface PaymentEstimate {
  estimatedDestAmount: string;
  rate: string;
  path: PathAsset[];
  fees: string;
}

interface AssetPair {
  sourceAsset: string;
  sourceIssuer: string | null;
  destinationAsset: string;
  destinationIssuer: string | null;
  minAmount: string;
  maxAmount: string | null;
}

export class MultiAssetPaymentService {
  private horizon: Horizon.Server;
  private networkPassphrase: string;
  private assetConfigService: AssetConfigurationService;
  private assetPriceService: AssetPriceService;

  constructor() {
    const horizonUrl =
      process.env.STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org";
    this.horizon = new Horizon.Server(horizonUrl);
    this.networkPassphrase =
      process.env.STELLAR_NETWORK === "PUBLIC"
        ? Networks.PUBLIC
        : Networks.TESTNET;
    this.assetConfigService = new AssetConfigurationService();
    this.assetPriceService = new AssetPriceService();
  }

  private createAsset(code: string, issuer?: string): Asset {
    if (code === "XLM" || !issuer) {
      return Asset.native();
    }
    return new Asset(code, issuer);
  }

  async executePathPayment(data: {
    merchantId: string;
    sourceAddress: string;
    destinationAddress: string;
    sourceAssetCode: string;
    sourceAssetIssuer?: string;
    destAssetCode: string;
    destAssetIssuer?: string;
    amount: string;
    sourceSecret: string;
    memo?: string;
  }): Promise<PathPaymentResult> {
    try {
      const isSupported = await this.assetConfigService.isAssetSupported(
        data.merchantId,
        data.sourceAssetCode,
        data.sourceAssetIssuer || null,
      );

      if (!isSupported) {
        throw new AppError("Source asset not supported by merchant", 400);
      }

      const isValidAmount = await this.assetConfigService.validatePaymentAmount(
        data.merchantId,
        data.sourceAssetCode,
        data.sourceAssetIssuer || null,
        data.amount,
      );

      if (!isValidAmount) {
        throw new AppError("Payment amount outside configured limits", 400);
      }

      const bestPath = await this.assetPriceService.findBestPath(
        data.sourceAssetCode,
        data.sourceAssetIssuer,
        data.destAssetCode,
        data.destAssetIssuer,
        data.amount,
      );

      if (!bestPath) {
        throw new AppError("No payment path available", 404);
      }

      const sourceKeypair = Keypair.fromSecret(data.sourceSecret);
      const sourceAccount = await this.horizon.loadAccount(data.sourceAddress);

      const sourceAsset = this.createAsset(
        data.sourceAssetCode,
        data.sourceAssetIssuer,
      );
      const destAsset = this.createAsset(
        data.destAssetCode,
        data.destAssetIssuer,
      );

      const txBuilder = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      });

      if (data.memo) {
        txBuilder.addMemo(Memo.text(data.memo));
      }

      txBuilder.addOperation(
        Operation.pathPaymentStrictSend({
          sendAsset: sourceAsset,
          sendAmount: data.amount,
          destination: data.destinationAddress,
          destAsset: destAsset,
          destMin: bestPath.destination_amount,
          path: bestPath.path.map((p: PathAsset) => {
            if (p.asset_type === "native") {
              return Asset.native();
            }
            return new Asset(p.asset_code!, p.asset_issuer!);
          }),
        }),
      );

      txBuilder.setTimeout(180);
      const transaction = txBuilder.build();
      transaction.sign(sourceKeypair);

      const result = await this.horizon.submitTransaction(transaction);

      logger.info(`Path payment executed: ${result.hash}`);

      return {
        transactionHash: result.hash,
        sourceAmount: data.amount,
        destinationAmount: bestPath.destination_amount,
        path: bestPath.path,
        fee: transaction.fee,
        timestamp: new Date(),
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error executing path payment:", error);
      throw new AppError("Failed to execute path payment", 500);
    }
  }

  async executeWithFallback(data: {
    merchantId: string;
    sourceAddress: string;
    destinationAddress: string;
    sourceAssetCode: string;
    sourceAssetIssuer?: string;
    destAssetCode: string;
    destAssetIssuer?: string;
    amount: string;
    sourceSecret: string;
    memo?: string;
  }): Promise<PathPaymentResult> {
    try {
      return await this.executePathPayment(data);
    } catch (error) {
      logger.warn("Primary path payment failed, trying fallback:", error);

      try {
        const configs = await this.assetConfigService.getEnabledAssetConfigs(
          data.merchantId,
        );

        for (const config of configs) {
          if (config.assetCode === data.sourceAssetCode) continue;

          try {
            const fallbackResult = await this.executePathPayment({
              ...data,
              sourceAssetCode: config.assetCode,
              sourceAssetIssuer: config.assetIssuer || undefined,
            });

            logger.info(`Fallback payment succeeded with ${config.assetCode}`);
            return fallbackResult;
          } catch (fallbackError) {
            logger.warn(
              `Fallback with ${config.assetCode} failed:`,
              fallbackError,
            );
            continue;
          }
        }

        throw new AppError("All payment paths failed", 500);
      } catch (fallbackError) {
        if (fallbackError instanceof AppError) throw fallbackError;
        logger.error("Fallback execution failed:", fallbackError);
        throw new AppError("Payment execution failed", 500);
      }
    }
  }

  async estimatePayment(data: {
    merchantId: string;
    sourceAssetCode: string;
    sourceAssetIssuer?: string;
    destAssetCode: string;
    destAssetIssuer?: string;
    amount: string;
  }): Promise<PaymentEstimate> {
    try {
      const isSupported = await this.assetConfigService.isAssetSupported(
        data.merchantId,
        data.sourceAssetCode,
        data.sourceAssetIssuer || null,
      );

      if (!isSupported) {
        throw new AppError("Source asset not supported", 400);
      }

      const quote = await this.assetPriceService.getExchangeRate(
        data.sourceAssetCode,
        data.sourceAssetIssuer,
        data.destAssetCode,
        data.destAssetIssuer,
        data.amount,
      );

      return {
        estimatedDestAmount: quote.destinationAmount,
        rate: quote.rate,
        path: quote.path,
        fees: BASE_FEE,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error estimating payment:", error);
      throw new AppError("Failed to estimate payment", 500);
    }
  }

  async getSupportedAssetPairs(merchantId: string): Promise<AssetPair[]> {
    try {
      const configs =
        await this.assetConfigService.getEnabledAssetConfigs(merchantId);

      const pairs: AssetPair[] = [];

      for (let i = 0; i < configs.length; i++) {
        for (let j = 0; j < configs.length; j++) {
          if (i === j) continue;

          pairs.push({
            sourceAsset: configs[i].assetCode,
            sourceIssuer: configs[i].assetIssuer,
            destinationAsset: configs[j].assetCode,
            destinationIssuer: configs[j].assetIssuer,
            minAmount: configs[i].minAmount,
            maxAmount: configs[i].maxAmount,
          });
        }
      }

      return pairs;
    } catch (error) {
      logger.error("Error getting supported asset pairs:", error);
      throw new AppError("Failed to fetch supported asset pairs", 500);
    }
  }
}

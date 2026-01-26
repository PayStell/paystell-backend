import { Horizon, Asset, Networks } from "@stellar/stellar-sdk";
import { AppError } from "../utils/AppError";
import logger from "../utils/logger";

interface PathAsset {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
}

interface PriceQuote {
  sourceAsset: string;
  destinationAsset: string;
  sourceAmount: string;
  destinationAmount: string;
  rate: string;
  path: PathAsset[];
  timestamp: Date;
}

interface OrderbookEntry {
  price: string;
  amount: string;
}

interface OrderbookResponse {
  bids: OrderbookEntry[];
  asks: OrderbookEntry[];
  source: { code: string; issuer: string | undefined };
  destination: { code: string; issuer: string | undefined };
}

export class AssetPriceService {
  private horizon: Horizon.Server;
  private networkPassphrase: string;

  constructor() {
    const horizonUrl =
      process.env.STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org";
    this.horizon = new Horizon.Server(horizonUrl);
    this.networkPassphrase =
      process.env.STELLAR_NETWORK === "PUBLIC"
        ? Networks.PUBLIC
        : Networks.TESTNET;
  }

  private createAsset(code: string, issuer?: string): Asset {
    if (code === "XLM" || !issuer) {
      return Asset.native();
    }
    return new Asset(code, issuer);
  }

  async getExchangeRate(
    sourceAssetCode: string,
    sourceAssetIssuer: string | undefined,
    destAssetCode: string,
    destAssetIssuer: string | undefined,
    amount: string,
  ): Promise<PriceQuote> {
    try {
      const sourceAsset = this.createAsset(sourceAssetCode, sourceAssetIssuer);
      const destAsset = this.createAsset(destAssetCode, destAssetIssuer);

      const pathsResponse = await this.horizon
        .strictSendPaths(sourceAsset, amount, [destAsset])
        .call();

      if (!pathsResponse.records || pathsResponse.records.length === 0) {
        throw new AppError("No payment path found between these assets", 404);
      }

      const bestPath = pathsResponse.records[0];

      const rate = (
        parseFloat(bestPath.destination_amount) / parseFloat(amount)
      ).toString();

      return {
        sourceAsset: sourceAssetCode,
        destinationAsset: destAssetCode,
        sourceAmount: amount,
        destinationAmount: bestPath.destination_amount,
        rate,
        path: bestPath.path,
        timestamp: new Date(),
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error getting exchange rate:", error);
      throw new AppError("Failed to fetch exchange rate", 500);
    }
  }

  async findBestPath(
    sourceAssetCode: string,
    sourceAssetIssuer: string | undefined,
    destAssetCode: string,
    destAssetIssuer: string | undefined,
    amount: string,
  ): Promise<{ destination_amount: string; path: PathAsset[] } | null> {
    try {
      const sourceAsset = this.createAsset(sourceAssetCode, sourceAssetIssuer);
      const destAsset = this.createAsset(destAssetCode, destAssetIssuer);

      const pathsResponse = await this.horizon
        .strictSendPaths(sourceAsset, amount, [destAsset])
        .call();

      if (!pathsResponse.records || pathsResponse.records.length === 0) {
        return null;
      }

      return pathsResponse.records[0];
    } catch (error) {
      logger.error("Error finding best path:", error);
      return null;
    }
  }

  async getMultiplePrices(
    sourceAssetCode: string,
    sourceAssetIssuer: string | undefined,
    destinationAssets: Array<{ code: string; issuer?: string }>,
    amount: string,
  ): Promise<PriceQuote[]> {
    try {
      const quotes: PriceQuote[] = [];

      for (const destAsset of destinationAssets) {
        try {
          const quote = await this.getExchangeRate(
            sourceAssetCode,
            sourceAssetIssuer,
            destAsset.code,
            destAsset.issuer,
            amount,
          );
          quotes.push(quote);
        } catch (error) {
          logger.warn(`Failed to get price for ${destAsset.code}:`, error);
        }
      }

      return quotes;
    } catch (error) {
      logger.error("Error getting multiple prices:", error);
      throw new AppError("Failed to fetch multiple prices", 500);
    }
  }

  async validateAssetExists(
    assetCode: string,
    assetIssuer?: string,
  ): Promise<boolean> {
    try {
      if (assetCode === "XLM") {
        return true;
      }

      if (!assetIssuer) {
        return false;
      }

      const account = await this.horizon.loadAccount(assetIssuer);
      return !!account;
    } catch (error) {
      logger.error("Error validating asset:", error);
      return false;
    }
  }

  async getOrderbook(
    sourceAssetCode: string,
    sourceAssetIssuer: string | undefined,
    destAssetCode: string,
    destAssetIssuer: string | undefined,
  ): Promise<OrderbookResponse> {
    try {
      const sourceAsset = this.createAsset(sourceAssetCode, sourceAssetIssuer);
      const destAsset = this.createAsset(destAssetCode, destAssetIssuer);

      const orderbook = await this.horizon
        .orderbook(sourceAsset, destAsset)
        .call();

      return {
        bids: orderbook.bids.slice(0, 5),
        asks: orderbook.asks.slice(0, 5),
        source: { code: sourceAssetCode, issuer: sourceAssetIssuer },
        destination: { code: destAssetCode, issuer: destAssetIssuer },
      };
    } catch (error) {
      logger.error("Error getting orderbook:", error);
      throw new AppError("Failed to fetch orderbook", 500);
    }
  }
}

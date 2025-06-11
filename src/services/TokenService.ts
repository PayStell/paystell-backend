import { StellarContractService } from "./StellarContractService";
import { TokenSupportDTO } from "../dtos/StellarContractDTO";
import { AppError } from "../utils/AppError";
import logger from "../utils/logger";

export interface TokenInfo {
  address: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  isActive: boolean;
}

export interface MerchantTokens {
  merchantAddress: string;
  supportedTokens: TokenInfo[];
}

export class TokenService {
  private stellarContractService: StellarContractService;

  constructor() {
    this.stellarContractService = new StellarContractService();
  }

  /**
   * Add a supported token for a merchant
   */
  async addSupportedToken(
    merchantAddress: string,
    tokenAddress: string,
  ): Promise<boolean> {
    try {
      const tokenData: TokenSupportDTO = {
        merchantAddress,
        tokenAddress,
      };

      const success =
        await this.stellarContractService.addSupportedToken(tokenData);

      if (success) {
        logger.info(
          `Token ${tokenAddress} added for merchant ${merchantAddress}`,
        );
        return true;
      }

      throw new AppError("Failed to add token support", 500);
    } catch (error) {
      logger.error("Error adding supported token:", error);
      throw error;
    }
  }

  /**
   * Get supported tokens for a merchant
   */
  async getMerchantTokens(merchantAddress: string): Promise<string[]> {
    try {
      const merchantDetails =
        await this.stellarContractService.getMerchantDetails(merchantAddress);
      return merchantDetails.supportedTokens || [];
    } catch (error) {
      logger.error("Error getting merchant tokens:", error);
      throw new AppError("Failed to get merchant tokens", 500);
    }
  }

  /**
   * Verify if a token is supported by a merchant
   */
  async isTokenSupported(
    merchantAddress: string,
    tokenAddress: string,
  ): Promise<boolean> {
    try {
      const supportedTokens = await this.getMerchantTokens(merchantAddress);
      return supportedTokens.includes(tokenAddress);
    } catch (error) {
      logger.error("Error verifying token support:", error);
      return false;
    }
  }

  /**
   * Get all merchants that support a specific token
   */
  async getMerchantsForToken(_tokenAddress: string): Promise<string[]> {
    try {
      // This would require additional contract methods or caching
      // For now, we'll return an empty array as this functionality
      // would need to be implemented in the contract
      logger.warn(
        "getMerchantsForToken not fully implemented - requires contract enhancement",
      );
      return [];
    } catch (error) {
      logger.error("Error getting merchants for token:", error);
      throw new AppError("Failed to get merchants for token", 500);
    }
  }

  /**
   * Validate token address format
   */
  validateTokenAddress(tokenAddress: string): boolean {
    // Basic Stellar address validation
    // Stellar addresses are 56 characters long and start with 'G'
    const stellarAddressRegex = /^G[A-Z2-7]{55}$/;
    return stellarAddressRegex.test(tokenAddress);
  }

  /**
   * Get token information (placeholder for future enhancement)
   */
  async getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
    try {
      if (!this.validateTokenAddress(tokenAddress)) {
        throw new AppError("Invalid token address format", 400);
      }

      // For now, return basic info
      // This could be enhanced to fetch actual token metadata from Stellar
      return {
        address: tokenAddress,
        isActive: true,
      };
    } catch (error) {
      logger.error("Error getting token info:", error);
      throw error;
    }
  }
}

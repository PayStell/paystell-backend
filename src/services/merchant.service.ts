import { Merchant } from "../interfaces/webhook.interfaces";
import { Repository } from "typeorm";
import { MerchantEntity } from "../entities/Merchant.entity";
import AppDataSource from "../config/db";

export class MerchantAuthService {
  private merchantRepository: Repository<MerchantEntity>;

  constructor() {
    this.merchantRepository = AppDataSource.getRepository(MerchantEntity);
  }

  async register(merchantData: Merchant): Promise<Merchant> {
    const merchantExists = await this.merchantRepository.findOne({
      where: { email: merchantData.email },
    });

    if (merchantExists) {
      throw new Error("Email already registered");
    }

    const merchant = this.merchantRepository.create(merchantData);
    const savedMerchant = await this.merchantRepository.save(merchant);

    return savedMerchant;
  }

  private async findMerchantByApiKey(apiKey: string): Promise<Merchant | null> {
    try {
      const merchant = await this.merchantRepository.findOne({
        where: { apiKey },
      });

      if (!merchant) {
        throw new Error("Merchant not found");
      }

      return merchant;
    } catch (err) {
      console.error("Error finding merchant by api key", err);
      return null;
    }
  }

  async getMerchantById(id: string): Promise<Merchant | null> {
    try {
      const merchant = await this.merchantRepository.findOne({
        where: { id },
      });

      if (!merchant || !merchant.isActive) {
        throw new Error(`Merchant ${merchant ? "is not active" : "not found"}`);
      }

      return merchant;
    } catch (err) {
      throw new Error(`Error in finding merchant: ${err}`);
    }
  }

  async validateApiKey(apiKey: string): Promise<Merchant | null> {
    if (!apiKey) {
      throw new Error("API key is required");
    }

    const merchant = await this.findMerchantByApiKey(apiKey);

    if (!merchant || !merchant.isActive) {
      throw new Error(
        `Merchant ${merchant ? "is not active" : "does not exist"}`,
      );
    }

    return merchant;
  }
}

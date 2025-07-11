import { Merchant } from "../interfaces/webhook.interfaces";
import { Repository, DataSource, QueryRunner } from "typeorm";
import { validate } from "class-validator";
import { MerchantEntity } from "../entities/Merchant.entity";
import { MerchantFraudConfig } from "../entities/MerchantFraudConfig";
import AppDataSource from "../config/db";
import { CreateMerchantDTO } from "../dtos/CreateMerchantDTO";
import { UpdateMerchantProfileDTO } from "../dtos/UpdateMerchantProfileDTO";
import { CreateMerchantProfileDTO } from "../dtos/CreateMerchantProfileDTO";
import { CreateMerchantFraudConfigDTO } from "../dtos/FraudDetection.dto";
import { FileUploadService } from "./fileUpload.service";

export class MerchantAuthService {
  private merchantRepository: Repository<MerchantEntity>;
  private fraudConfigRepository: Repository<MerchantFraudConfig>;
  private dataSource: DataSource;

  constructor() {
    this.dataSource = AppDataSource;
    this.merchantRepository = this.dataSource.getRepository(MerchantEntity);
    this.fraudConfigRepository =
      this.dataSource.getRepository(MerchantFraudConfig);
  }

  async register(merchantData: CreateMerchantDTO): Promise<Merchant> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const dto = Object.assign(new CreateMerchantDTO(), merchantData);
      const errors = await validate(dto);

      if (errors.length > 0) {
        throw new Error(
          errors.map((err) => Object.values(err.constraints || {})).join(", "),
        );
      }

      const merchantExists = await queryRunner.manager.findOne(MerchantEntity, {
        where: { email: merchantData.email },
      });

      if (merchantExists) {
        throw new Error("Email already registered");
      }

      const merchant = this.merchantRepository.create(merchantData);
      const savedMerchant = await queryRunner.manager.save(merchant);

      // Initialize default fraud configuration for new merchant
      await this.initializeDefaultFraudConfig(savedMerchant.id, queryRunner);

      await queryRunner.commitTransaction();
      return savedMerchant;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async initializeDefaultFraudConfig(
    merchantId: string,
    queryRunner: QueryRunner,
  ): Promise<void> {
    try {
      // Create default fraud configuration DTO
      const fraudConfigData = new CreateMerchantFraudConfigDTO();
      fraudConfigData.merchantId = merchantId;

      // Validate the DTO
      const errors = await validate(fraudConfigData);
      if (errors.length > 0) {
        throw new Error(
          `Fraud config validation failed: ${errors
            .map((err) => Object.values(err.constraints || {}))
            .join(", ")}`,
        );
      }

      // Create and save the fraud configuration
      const fraudConfig = this.fraudConfigRepository.create(fraudConfigData);
      await queryRunner.manager.save(fraudConfig);

      console.log(
        `Default fraud configuration initialized for merchant: ${merchantId}`,
      );
    } catch (error) {
      console.error(
        `Failed to initialize fraud config for merchant ${merchantId}:`,
        error,
      );
      throw error;
    }
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

  async getBusinessProfileById(id: string): Promise<Partial<Merchant>> {
    const merchant = await this.merchantRepository.findOne({
      where: { id },
    });

    if (!merchant) {
      throw new Error("Merchant not found");
    }

    return {
      business_name: merchant.business_name,
      business_email: merchant.business_email,
      business_description: merchant.business_description,
      business_address: merchant.business_address,
      business_phone: merchant.business_phone,
      business_logo_url: merchant.business_logo_url,
    };
  }

  async createMerchantProfile(
    merchantId: string,
    profileData: CreateMerchantProfileDTO,
  ): Promise<Merchant> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const dto = Object.assign(new CreateMerchantProfileDTO(), profileData);
      const errors = await validate(dto);

      if (errors.length > 0) {
        throw new Error(
          errors.map((err) => Object.values(err.constraints || {})).join(", "),
        );
      }

      const merchant = await queryRunner.manager.findOne(MerchantEntity, {
        where: { id: merchantId },
      });

      if (!merchant) {
        throw new Error("Merchant not found");
      }

      const updatedMerchant = this.merchantRepository.merge(
        merchant,
        profileData,
      );
      const savedMerchant = await queryRunner.manager.save(updatedMerchant);

      await queryRunner.commitTransaction();
      return savedMerchant;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateMerchantProfile(
    merchantId: string,
    profileData: UpdateMerchantProfileDTO,
  ): Promise<Merchant> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const dto = Object.assign(new UpdateMerchantProfileDTO(), profileData);
      const errors = await validate(dto);

      if (errors.length > 0) {
        throw new Error(
          errors.map((err) => Object.values(err.constraints || {})).join(", "),
        );
      }

      const merchant = await queryRunner.manager.findOne(MerchantEntity, {
        where: { id: merchantId },
      });

      if (!merchant) {
        throw new Error("Merchant not found");
      }

      const updatedMerchant = this.merchantRepository.merge(
        merchant,
        profileData,
      );
      const savedMerchant = await queryRunner.manager.save(updatedMerchant);

      await queryRunner.commitTransaction();
      return savedMerchant;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateLogo(merchantId: string, logoUrl: string): Promise<Merchant> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const merchant = await queryRunner.manager.findOne(MerchantEntity, {
        where: { id: merchantId },
      });

      if (!merchant) {
        throw new Error("Merchant not found");
      }

      merchant.business_logo_url = logoUrl;
      const savedMerchant = await queryRunner.manager.save(merchant);

      await queryRunner.commitTransaction();
      return savedMerchant;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteLogo(merchantId: string): Promise<Merchant> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const fileUploadService = new FileUploadService();
      const merchant = await queryRunner.manager.findOne(MerchantEntity, {
        where: { id: merchantId },
      });

      if (!merchant) {
        throw new Error("Merchant not found");
      }

      const fileUrl = merchant.business_logo_url;
      if (fileUrl) {
        await fileUploadService.deleteFile(fileUrl);
      }

      merchant.business_logo_url = "";
      const savedMerchant = await queryRunner.manager.save(merchant);

      await queryRunner.commitTransaction();
      return savedMerchant;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}

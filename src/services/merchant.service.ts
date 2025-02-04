import { Merchant, MerchantWebhook } from "../interfaces/webhook.interfaces";
import { Repository } from "typeorm";
import { MerchantEntity } from "src/entities/Merchant.entity";
import AppDataSource from "../config/db";

export class MerchantAuthService {
    private merchantRepository: Repository<MerchantEntity>

    constructor() {
        this.merchantRepository = AppDataSource.getRepository(MerchantEntity)
    }

    private async findMerchantByApiKey(apiKey: string): Promise<Merchant | null> {
        try {
            const merchant = await this.merchantRepository.findOne({
                where: {
                    apiKey
                }
            })

            if (!merchant) {
                throw new Error('Merchant not found')
            }

            return merchant
        } catch (err) {
            console.error('Error finding merchant by api key', err)
            return null
        }
    }

    static async getMerchantById(id: string): Promise<Merchant | null> {
        // replace with a method to find merchant from db by id
        // const date = new Date()
        // const merchant: Omit<Merchant, 'createdAt' & 'updatedAt'> = {
        //     ...sampleMerchantWithoutId,
        //     id,
        // }
        const merchant = this.merchantRepository.findOne({
            where: {
                id
            }
        })
        if (!merchant) {
            throw new Error('Merchant not found')
        }

        return merchant
    }

    async validateApiKey(apiKey: string): Promise<Merchant | null> {
        if (!apiKey) return null;

        const merchant: Merchant | null = await this.findMerchantByApiKey(apiKey);

        if (!merchant || !merchant.isActive) {
            throw new Error("Merchant does not exist or is not active")
        }

        return merchant;
    }
}
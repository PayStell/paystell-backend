import type { Repository } from "typeorm"
import AppDataSource from "../config/db"
import { RateLimitWhitelist, type WhitelistType } from "../entities/RateLimitWhiteList"
import { RateLimitBlacklist, type BlacklistType, BlacklistReason } from "../entities/RateLimitBlacklist"
import logger from "../utils/logger"

interface WhitelistQuery {
  isActive: boolean
  type?: WhitelistType
}

interface BlacklistQuery {
  isActive: boolean
  type?: BlacklistType
}

export class WhitelistBlacklistService {
  private whitelistRepository: Repository<RateLimitWhitelist>
  private blacklistRepository: Repository<RateLimitBlacklist>

  constructor() {
    this.whitelistRepository = AppDataSource.getRepository(RateLimitWhitelist)
    this.blacklistRepository = AppDataSource.getRepository(RateLimitBlacklist)
  }

  async addToWhitelist(
    type: WhitelistType,
    value: string,
    reason?: string,
    addedBy?: string,
    expiresAt?: Date,
  ): Promise<RateLimitWhitelist> {
    try {
      const existing = await this.whitelistRepository.findOne({
        where: { type, value },
      })

      if (existing) {
        existing.isActive = true
        existing.reason = reason || existing.reason
        existing.addedBy = addedBy || existing.addedBy
        existing.expiresAt = expiresAt || existing.expiresAt
        return await this.whitelistRepository.save(existing)
      }

      const whitelist = this.whitelistRepository.create({
        type,
        value,
        reason,
        addedBy,
        expiresAt,
      })
      return await this.whitelistRepository.save(whitelist)
    } catch (error) {
      logger.error(`Error adding to whitelist: ${error}`)
      throw error
    }
  }

  async removeFromWhitelist(id: string): Promise<void> {
    try {
      const whitelist = await this.whitelistRepository.findOne({
        where: { id },
      })

      if (!whitelist) {
        throw new Error("Whitelist entry not found")
      }

      whitelist.isActive = false
      await this.whitelistRepository.save(whitelist)
    } catch (error) {
      logger.error(`Error removing from whitelist: ${error}`)
      throw error
    }
  }

  async isWhitelisted(type: WhitelistType, value: string): Promise<boolean> {
    try {
      const now = new Date()
      const whitelist = await this.whitelistRepository.findOne({
        where: {
          type,
          value,
          isActive: true,
        },
      })

      if (!whitelist) {
        return false
      }

      // Check if whitelist entry has expired
      if (whitelist.expiresAt && whitelist.expiresAt < now) {
        whitelist.isActive = false
        await this.whitelistRepository.save(whitelist)
        return false
      }

      return true
    } catch (error) {
      logger.error(`Error checking whitelist: ${error}`)
      return false
    }
  }

  // Blacklist methods
  async addToBlacklist(
    type: BlacklistType,
    value: string,
    reason: BlacklistReason = BlacklistReason.MANUAL,
    details?: string,
    addedBy?: string,
    expiresAt?: Date,
  ): Promise<RateLimitBlacklist> {
    try {
      // Check if already exists
      const existing = await this.blacklistRepository.findOne({
        where: { type, value },
      })

      if (existing) {
        // Update existing entry
        existing.isActive = true
        existing.reason = reason
        existing.details = details || existing.details
        existing.addedBy = addedBy || existing.addedBy
        existing.expiresAt = expiresAt || existing.expiresAt
        return await this.blacklistRepository.save(existing)
      }

      // Create new entry
      const blacklist = this.blacklistRepository.create({
        type,
        value,
        reason,
        details,
        addedBy,
        expiresAt,
      })
      return await this.blacklistRepository.save(blacklist)
    } catch (error) {
      logger.error(`Error adding to blacklist: ${error}`)
      throw error
    }
  }

  async removeFromBlacklist(id: string): Promise<void> {
    try {
      const blacklist = await this.blacklistRepository.findOne({
        where: { id },
      })

      if (!blacklist) {
        throw new Error("Blacklist entry not found")
      }

      blacklist.isActive = false
      await this.blacklistRepository.save(blacklist)
    } catch (error) {
      logger.error(`Error removing from blacklist: ${error}`)
      throw error
    }
  }

  async isBlacklisted(type: BlacklistType, value: string): Promise<boolean> {
    try {
      const now = new Date()
      const blacklist = await this.blacklistRepository.findOne({
        where: {
          type,
          value,
          isActive: true,
        },
      })

      if (!blacklist) {
        return false
      }

      // Check if blacklist entry has expired
      if (blacklist.expiresAt && blacklist.expiresAt < now) {
        blacklist.isActive = false
        await this.blacklistRepository.save(blacklist)
        return false
      }

      return true
    } catch (error) {
      logger.error(`Error checking blacklist: ${error}`)
      return false
    }
  }

  async getWhitelistedEntries(type?: WhitelistType): Promise<RateLimitWhitelist[]> {
    try {
      const query: WhitelistQuery = { isActive: true }
      if (type) {
        query.type = type
      }
      return await this.whitelistRepository.find({
        where: query,
        order: { createdAt: "DESC" },
      })
    } catch (error) {
      logger.error(`Error getting whitelist entries: ${error}`)
      throw error
    }
  }

  async getBlacklistedEntries(type?: BlacklistType): Promise<RateLimitBlacklist[]> {
    try {
      const query: BlacklistQuery = { isActive: true }
      if (type) {
        query.type = type
      }
      return await this.blacklistRepository.find({
        where: query,
        order: { createdAt: "DESC" },
      })
    } catch (error) {
      logger.error(`Error getting blacklist entries: ${error}`)
      throw error
    }
  }
}

export default new WhitelistBlacklistService()

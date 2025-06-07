import type { Repository } from "typeorm"
import { ReferralProgram } from "../entities/ReferralProgram"
import { User } from "../entities/User"
import AppDataSource from "../config/db"
import { randomBytes } from "crypto"
import { AppError } from "../utils/AppError"
import { Referral } from "../entities/Referral"
import { ReferralReward } from "../entities/ReferralReward"
import { RewardType } from "../enums/RewardType"
import { ReferralStatus } from "../enums/ReferralStatus"
import { RewardStatus } from "../enums/RewardStatus"
import { ProgramStatus } from "../enums/ProgramStatus"
import { ReferralStats } from "../interfaces/ReferralStats"

export class ReferralService {
  private referralRepository: Repository<Referral>
  private rewardRepository: Repository<ReferralReward>
  private programRepository: Repository<ReferralProgram>
  private userRepository: Repository<User>

  constructor() {
    this.referralRepository = AppDataSource.getRepository(Referral)
    this.rewardRepository = AppDataSource.getRepository(ReferralReward)
    this.programRepository = AppDataSource.getRepository(ReferralProgram)
    this.userRepository = AppDataSource.getRepository(User)
  }

  async generateReferralCode(userId: number): Promise<string> {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) throw new AppError("User not found", 404)

    let referralCode: string
    let isUnique = false
    let attempts = 0
    const maxAttempts = 10

    while (!isUnique && attempts < maxAttempts) {
      const randomPart = randomBytes(4).toString("hex").toUpperCase()
      const userPart = user.id.toString().padStart(4, "0")
      referralCode = `REF${userPart}${randomPart}`

      const existing = await this.referralRepository.findOne({
        where: { referralCode },
      })

      if (!existing) {
        isUnique = true
      }
      attempts++
    }

    if (!isUnique) {
      throw new AppError("Failed to generate unique referral code", 500)
    }

    return referralCode!
  }

  async createReferral(userId: number, expiresAt?: Date): Promise<Referral> {
    const referralCode = await this.generateReferralCode(userId)

    const referral = this.referralRepository.create({
      referrerId: userId,
      referralCode,
      expiresAt: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
      status: ReferralStatus.PENDING,
    })

    return await this.referralRepository.save(referral)
  }

  async processReferralSignup(referralCode: string, refereeId: number): Promise<Referral | null> {
    const referral = await this.referralRepository.findOne({
      where: { referralCode },
      relations: ["referrer"],
    })

    if (!referral) {
      throw new AppError("Invalid referral code", 400)
    }

    if (referral.referrerId === refereeId) {
      throw new AppError("Cannot refer yourself", 400)
    }

    if (referral.refereeId) {
      throw new AppError("Referral code already used", 400)
    }

    if (referral.expiresAt && referral.expiresAt < new Date()) {
      throw new AppError("Referral code has expired", 400)
    }

    // Check if user was already referred by someone else
    const existingReferral = await this.referralRepository.findOne({
      where: { refereeId },
    })

    if (existingReferral) {
      throw new AppError("User has already been referred", 400)
    }

    referral.refereeId = refereeId
    referral.status = ReferralStatus.COMPLETED
    referral.conversionDate = new Date()

    await this.referralRepository.save(referral)
    await this.createRewards(referral)

    return referral
  }

  private async createRewards(referral: Referral): Promise<void> {
    const activeProgram = await this.getActiveProgram()
    if (!activeProgram) return

    // Check budget constraints
    const totalRewardAmount =
      Number.parseFloat(activeProgram.referrerReward) + Number.parseFloat(activeProgram.refereeReward)
    const newUsedBudget = Number.parseFloat(activeProgram.usedBudget) + totalRewardAmount

    if (activeProgram.totalBudget && newUsedBudget > Number.parseFloat(activeProgram.totalBudget)) {
      throw new AppError("Referral program budget exceeded", 400)
    }

    // Create referrer reward
    const referrerReward = this.rewardRepository.create({
      referralId: referral.id,
      userId: referral.referrerId,
      amount: activeProgram.referrerReward,
      currency: activeProgram.rewardCurrency,
      type: RewardType.REFERRER,
      status: RewardStatus.PENDING,
    })

    // Create referee reward
    const refereeReward = this.rewardRepository.create({
      referralId: referral.id,
      userId: referral.refereeId!,
      amount: activeProgram.refereeReward,
      currency: activeProgram.rewardCurrency,
      type: RewardType.REFEREE,
      status: RewardStatus.PENDING,
    })

    await this.rewardRepository.save([referrerReward, refereeReward])

    // Update program budget
    activeProgram.usedBudget = newUsedBudget.toString()
    await this.programRepository.save(activeProgram)
  }

  async getUserReferrals(userId: number, page = 1, limit = 10): Promise<{ referrals: Referral[]; total: number }> {
    const [referrals, total] = await this.referralRepository.findAndCount({
      where: { referrerId: userId },
      relations: ["referee", "rewards"],
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    })

    return { referrals, total }
  }

  async getUserReferralStats(userId: number): Promise<ReferralStats> {
    const referrals = await this.referralRepository.find({
      where: { referrerId: userId },
      relations: ["rewards"],
    })

    const rewards = await this.rewardRepository.find({
      where: { userId },
    })

    const totalReferrals = referrals.length
    const completedReferrals = referrals.filter((r) => r.status === ReferralStatus.COMPLETED).length
    const pendingReferrals = referrals.filter((r) => r.status === ReferralStatus.PENDING).length

    const totalRewards = rewards.reduce((sum, reward) => sum + Number.parseFloat(reward.amount), 0).toString()
    const pendingRewards = rewards
      .filter((r) => r.status === RewardStatus.PENDING)
      .reduce((sum, reward) => sum + Number.parseFloat(reward.amount), 0)
      .toString()
    const paidRewards = rewards
      .filter((r) => r.status === RewardStatus.PAID)
      .reduce((sum, reward) => sum + Number.parseFloat(reward.amount), 0)
      .toString()

    return {
      totalReferrals,
      completedReferrals,
      pendingReferrals,
      totalRewards,
      pendingRewards,
      paidRewards,
    }
  }

  async getUserRewards(userId: number, page = 1, limit = 10): Promise<{ rewards: ReferralReward[]; total: number }> {
    const [rewards, total] = await this.rewardRepository.findAndCount({
      where: { userId },
      relations: ["referral", "referral.referrer", "referral.referee"],
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    })

    return { rewards, total }
  }

  async processRewardPayment(rewardId: number, transactionHash?: string): Promise<ReferralReward> {
    const reward = await this.rewardRepository.findOne({
      where: { id: rewardId },
    })

    if (!reward) {
      throw new AppError("Reward not found", 404)
    }

    if (reward.status !== RewardStatus.PENDING) {
      throw new AppError("Reward is not in pending status", 400)
    }

    reward.status = RewardStatus.PAID
    reward.paidAt = new Date()
    if (transactionHash) {
      reward.transactionHash = transactionHash
    }

    return await this.rewardRepository.save(reward)
  }

  async getActiveProgram(): Promise<ReferralProgram | null> {
    return await this.programRepository.findOne({
      where: {
        status: ProgramStatus.ACTIVE,
      },
      order: { createdAt: "DESC" },
    })
  }

  async validateReferralCode(referralCode: string): Promise<boolean> {
    const referral = await this.referralRepository.findOne({
      where: { referralCode },
    })

    if (!referral) return false
    if (referral.refereeId) return false // Already used
    if (referral.expiresAt && referral.expiresAt < new Date()) return false // Expired

    return true
  }

  async getReferralByCode(referralCode: string): Promise<Referral | null> {
    return await this.referralRepository.findOne({
      where: { referralCode },
      relations: ["referrer"],
    })
  }
}

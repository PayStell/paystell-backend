import type { Request, Response } from "express"
import { ReferralService } from "../services/ReferralService"
import { AppError } from "../utils/AppError"
import { validationResult } from "express-validator"

export class ReferralController {
  private referralService: ReferralService

  constructor() {
    this.referralService = new ReferralService()
  }

  createReferral = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() })
        return
      }

      const userId = req.user?.id
      if (!userId) {
        throw new AppError("User not authenticated", 401)
      }

      const { expiresAt } = req.body
      const referral = await this.referralService.createReferral(userId, expiresAt ? new Date(expiresAt) : undefined)

      res.status(201).json({
        success: true,
        data: referral,
        message: "Referral created successfully",
      })
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        })
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        })
      }
    }
  }

  processReferralSignup = async (req: Request, res: Response): Promise<void> => {
    try {
      const { referralCode } = req.body
      const userId = req.user?.id

      if (!userId) {
        throw new AppError("User not authenticated", 401)
      }

      const referral = await this.referralService.processReferralSignup(referralCode, userId)

      res.status(200).json({
        success: true,
        data: referral,
        message: "Referral processed successfully",
      })
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        })
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        })
      }
    }
  }

  getUserReferrals = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id
      if (!userId) {
        throw new AppError("User not authenticated", 401)
      }

      const page = Number.parseInt(req.query.page as string) || 1
      const limit = Number.parseInt(req.query.limit as string) || 10

      const result = await this.referralService.getUserReferrals(userId, page, limit)

      res.status(200).json({
        success: true,
        data: result.referrals,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: Math.ceil(result.total / limit),
        },
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      })
    }
  }

  getUserReferralStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id
      if (!userId) {
        throw new AppError("User not authenticated", 401)
      }

      const stats = await this.referralService.getUserReferralStats(userId)

      res.status(200).json({
        success: true,
        data: stats,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      })
    }
  }

  getUserRewards = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id
      if (!userId) {
        throw new AppError("User not authenticated", 401)
      }

      const page = Number.parseInt(req.query.page as string) || 1
      const limit = Number.parseInt(req.query.limit as string) || 10

      const result = await this.referralService.getUserRewards(userId, page, limit)

      res.status(200).json({
        success: true,
        data: result.rewards,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: Math.ceil(result.total / limit),
        },
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      })
    }
  }

  validateReferralCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params
      const isValid = await this.referralService.validateReferralCode(code)
      const referral = isValid ? await this.referralService.getReferralByCode(code) : null

      res.status(200).json({
        success: true,
        data: {
          isValid,
          referral: isValid
            ? {
                referralCode: referral?.referralCode,
                referrerName: referral?.referrer?.name,
                expiresAt: referral?.expiresAt,
              }
            : null,
        },
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      })
    }
  }

  processRewardPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      const { transactionHash } = req.body

      const reward = await this.referralService.processRewardPayment(Number.parseInt(id), transactionHash)

      res.status(200).json({
        success: true,
        data: reward,
        message: "Reward payment processed successfully",
      })
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        })
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        })
      }
    }
  }
}

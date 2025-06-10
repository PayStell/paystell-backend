import { Repository, MoreThanOrEqual } from "typeorm";
import AppDataSource from "../config/db";
import { Transaction, TransactionStatus } from "../entities/Transaction";
import { FraudAlert, FraudAlertStatus, RiskLevel } from "../entities/FraudAlert";
import { MerchantFraudConfig } from "../entities/MerchantFraudConfig";
import { MerchantEntity } from "../entities/Merchant.entity";
import { 
  FraudCheckResultDTO, 
  TransactionContextDTO, 
  FraudStatsDTO,
  RiskLevelBreakdownDTO,
  TopTriggeredRuleDTO
} from "../dtos/FraudDetection.dto";

export class FraudDetectionService {
  private transactionRepo: Repository<Transaction>;
  private fraudAlertRepo: Repository<FraudAlert>;
  private merchantConfigRepo: Repository<MerchantFraudConfig>;
  private merchantRepo: Repository<MerchantEntity>;

  constructor() {
    this.transactionRepo = AppDataSource.getRepository(Transaction);
    this.fraudAlertRepo = AppDataSource.getRepository(FraudAlert);
    this.merchantConfigRepo = AppDataSource.getRepository(MerchantFraudConfig);
    this.merchantRepo = AppDataSource.getRepository(MerchantEntity);
  }

  async checkTransaction(context: TransactionContextDTO): Promise<FraudCheckResultDTO> {
    const { transaction } = context;
    const config = await this.getMerchantConfig(transaction.merchantId);
    
    let riskScore = 0;
    const rulesTriggered: string[] = [];

    // Rule 1: Transaction amount checks
    riskScore += await this.checkTransactionAmount(transaction, config, rulesTriggered);

    // Rule 2: Velocity checks
    riskScore += await this.checkVelocity(transaction, config, rulesTriggered);

    // Rule 3: Pattern analysis
    riskScore += await this.checkPatterns(transaction, config, rulesTriggered);

    // Rule 4: Failed attempts check
    riskScore += await this.checkFailedAttempts(transaction, config, rulesTriggered);

    // Rule 5: Time-based anomalies
    riskScore += await this.checkTimeAnomalies(transaction, rulesTriggered);

    // Rule 6: Basic ML anomaly detection
    riskScore += await this.checkMLAnomalies(transaction, rulesTriggered);

    const riskLevel = this.calculateRiskLevel(riskScore, config);
    const shouldBlock = this.shouldBlockTransaction(riskLevel, config);
    const requiresReview = shouldBlock;

    const result: FraudCheckResultDTO = {
      riskScore: Math.min(riskScore, 100),
      riskLevel,
      shouldBlock,
      rulesTriggered,
      requiresReview,
    };

    if (shouldBlock) {
      result.alert = await this.createFraudAlert(transaction, result);
    }

    return result;
  }

  async getFraudStats(merchantId?: string, days: number = 30): Promise<FraudStatsDTO> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const baseQuery = this.fraudAlertRepo.createQueryBuilder("alert")
      .where("alert.createdAt >= :startDate", { startDate });

    if (merchantId) {
      baseQuery.andWhere("alert.merchantId = :merchantId", { merchantId });
    }

    // Get all alerts for the period
    const alerts = await baseQuery.getMany();

    // Calculate basic stats
    const totalAlerts = alerts.length;
    const blockedTransactions = alerts.filter(a => a.status === FraudAlertStatus.BLOCKED).length;
    const pendingReviews = alerts.filter(a => a.status === FraudAlertStatus.PENDING).length;

    // Calculate average risk score
    const averageRiskScore = alerts.length > 0 
      ? alerts.reduce((sum, alert) => sum + alert.riskScore, 0) / alerts.length 
      : 0;

    // Risk level breakdown
    const riskLevelBreakdown: RiskLevelBreakdownDTO = {
      low: alerts.filter(a => a.riskLevel === RiskLevel.LOW).length,
      medium: alerts.filter(a => a.riskLevel === RiskLevel.MEDIUM).length,
      high: alerts.filter(a => a.riskLevel === RiskLevel.HIGH).length,
      critical: alerts.filter(a => a.riskLevel === RiskLevel.CRITICAL).length,
    };

    // Top triggered rules
    const ruleCount: { [key: string]: number } = {};
    alerts.forEach(alert => {
      if (alert.rulesTriggered && Array.isArray(alert.rulesTriggered)) {
        alert.rulesTriggered.forEach(rule => {
          ruleCount[rule] = (ruleCount[rule] || 0) + 1;
        });
      }
    });

    const topTriggeredRules: TopTriggeredRuleDTO[] = Object.entries(ruleCount)
      .map(([rule, count]) => ({ rule, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const totalAmount = alerts.reduce((sum, alert) => sum + alert.amount, 0);
    const blockedAmount = alerts
      .filter(a => a.status === FraudAlertStatus.BLOCKED)
      .reduce((sum, alert) => sum + alert.amount, 0);

    return {
      totalAlerts,
      blockedTransactions,
      pendingReviews,
      averageRiskScore: Math.round(averageRiskScore * 100) / 100,
      riskLevelBreakdown,
      topTriggeredRules,
      totalAmount,
      blockedAmount,
    };
  }

  private async checkTransactionAmount(
    transaction: Transaction,
    config: MerchantFraudConfig,
    rulesTriggered: string[]
  ): Promise<number> {
    let score = 0;

    // High amount check
    if (transaction.amount > config.maxTransactionAmount) {
      score += 50; // High score for exceeding limit
      rulesTriggered.push("AMOUNT_EXCEEDS_LIMIT");
    }

    // Unusually high for merchant
    const avgAmount = await this.getAverageTransactionAmount(transaction.merchantId);
    if (avgAmount && transaction.amount > avgAmount * 5) {
      score += 40; // Additional score for unusual amount
      rulesTriggered.push("AMOUNT_UNUSUAL_HIGH");
    }

    return score;
  }

  private async checkVelocity(
    transaction: Transaction,
    config: MerchantFraudConfig,
    rulesTriggered: string[]
  ): Promise<number> {
    let score = 0;
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check hourly transaction count
    const hourlyCount = await this.transactionRepo.count({
      where: {
        payerId: transaction.payerId,
        createdAt: MoreThanOrEqual(oneHourAgo),
      },
    });

    if (hourlyCount >= config.maxTransactionsPerHour) {
      score += 40; // Increased scoring for velocity violations
      rulesTriggered.push("VELOCITY_HOURLY_EXCEEDED");
    }

    // Check daily transaction count
    const dailyCount = await this.transactionRepo.count({
      where: {
        payerId: transaction.payerId,
        createdAt: MoreThanOrEqual(oneDayAgo),
      },
    });

    if (dailyCount >= config.maxTransactionsPerDay) {
      score += 35; // Increased scoring for velocity violations
      rulesTriggered.push("VELOCITY_DAILY_EXCEEDED");
    }

    // Check daily amount limit
    const dailyAmount = await this.transactionRepo
      .createQueryBuilder("transaction")
      .select("SUM(transaction.amount)", "total")
      .where("transaction.payerId = :payerId", { payerId: transaction.payerId })
      .andWhere("transaction.createdAt >= :oneDayAgo", { oneDayAgo })
      .getRawOne();

    if (dailyAmount?.total && parseFloat(dailyAmount.total) + transaction.amount > config.dailyLimit) {
      score += 30; // Increased scoring
      rulesTriggered.push("DAILY_AMOUNT_LIMIT_EXCEEDED");
    }

    return score;
  }

  private async checkPatterns(
    transaction: Transaction,
    config: MerchantFraudConfig,
    rulesTriggered: string[]
  ): Promise<number> {
    let score = 0;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Check for same amount transactions in short period
    const sameAmountCount = await this.transactionRepo.count({
      where: {
        payerId: transaction.payerId,
        amount: transaction.amount,
        createdAt: MoreThanOrEqual(oneHourAgo),
      },
    });

    if (sameAmountCount >= config.maxSameAmountInHour) {
      score += 15;
      rulesTriggered.push("SAME_AMOUNT_PATTERN");
    }

    // Check for round number patterns (potentially fraudulent)
    if (transaction.amount % 100 === 0 && transaction.amount >= 500) {
      score += 5;
      rulesTriggered.push("ROUND_AMOUNT_PATTERN");
    }

    return score;
  }

  private async checkFailedAttempts(
    transaction: Transaction,
    config: MerchantFraudConfig,
    rulesTriggered: string[]
  ): Promise<number> {
    let score = 0;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const failedCount = await this.transactionRepo.count({
      where: {
        payerId: transaction.payerId,
        status: TransactionStatus.FAILED,
        createdAt: MoreThanOrEqual(oneHourAgo),
      },
    });

    if (failedCount >= config.maxFailedAttemptsPerHour) {
      score += 20;
      rulesTriggered.push("EXCESSIVE_FAILED_ATTEMPTS");
    }

    return score;
  }

  private async checkTimeAnomalies(
    transaction: Transaction,
    rulesTriggered: string[]
  ): Promise<number> {
    let score = 0;
    const hour = new Date().getHours();

    // Transactions during unusual hours (2 AM - 6 AM)
    if (hour >= 2 && hour <= 6) {
      score += 5;
      rulesTriggered.push("UNUSUAL_TIME");
    }

    return score;
  }

  private async checkMLAnomalies(
    transaction: Transaction,
    rulesTriggered: string[]
  ): Promise<number> {
    // Basic anomaly detection(proper ML model needed)
    let score = 0;

    // Simple statistical anomaly detection
    const recentTransactions = await this.transactionRepo.find({
      where: { merchantId: transaction.merchantId },
      order: { createdAt: "DESC" },
      take: 100,
    });

    if (recentTransactions.length > 10) {
      const amounts = recentTransactions.map(t => t.amount);
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const stdDev = Math.sqrt(
        amounts.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / amounts.length
      );

      // If transaction is more than 2 standard deviations from mean
      if (Math.abs(transaction.amount - mean) > 2 * stdDev) {
        score += 10;
        rulesTriggered.push("STATISTICAL_ANOMALY");
      }
    }

    return score;
  }

  private calculateRiskLevel(riskScore: number, config: MerchantFraudConfig): RiskLevel {
    if (riskScore >= config.criticalRiskThreshold) return RiskLevel.CRITICAL;
    if (riskScore >= config.highRiskThreshold) return RiskLevel.HIGH;
    if (riskScore >= config.mediumRiskThreshold) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  private shouldBlockTransaction(riskLevel: RiskLevel, config: MerchantFraudConfig): boolean {
    return (
      (riskLevel === RiskLevel.CRITICAL && config.autoBlockCritical) ||
      (riskLevel === RiskLevel.HIGH && config.autoBlockHighRisk)
    );
  }

  async createFraudAlert(
    transaction: Transaction,
    result: FraudCheckResultDTO
  ): Promise<FraudAlert> {
    const alert = new FraudAlert();
    alert.transactionId = transaction.id;
    alert.merchantId = transaction.merchantId;
    alert.payerId = transaction.payerId;
    alert.amount = transaction.amount;
    alert.riskScore = result.riskScore;
    alert.riskLevel = result.riskLevel;
    alert.status = result.shouldBlock ? FraudAlertStatus.BLOCKED : FraudAlertStatus.PENDING;
    alert.rulesTriggered = result.rulesTriggered;
    alert.metadata = transaction.metadata || {};

    return await this.fraudAlertRepo.save(alert);
  }

  async getMerchantConfig(merchantId: string): Promise<MerchantFraudConfig> {
    let config = await this.merchantConfigRepo.findOne({
      where: { merchantId },
    });

    if (!config) {
      // Create default config
      config = new MerchantFraudConfig();
      config.merchantId = merchantId;
      config = await this.merchantConfigRepo.save(config);
    }

    return config;
  }

  async updateMerchantConfig(
    merchantId: string,
    updates: Partial<MerchantFraudConfig>
  ): Promise<MerchantFraudConfig> {
    let config = await this.getMerchantConfig(merchantId);
    Object.assign(config, updates);
    return await this.merchantConfigRepo.save(config);
  }

  async getFraudAlerts(
    merchantId?: string,
    status?: FraudAlertStatus,
    limit: number = 50
  ): Promise<FraudAlert[]> {
    const query = this.fraudAlertRepo.createQueryBuilder("alert");
    
    if (merchantId) {
      query.where("alert.merchantId = :merchantId", { merchantId });
    }
    
    if (status) {
      query.andWhere("alert.status = :status", { status });
    }

    return query
      .orderBy("alert.createdAt", "DESC")
      .limit(limit)
      .getMany();
  }

  async reviewFraudAlert(
    alertId: string,
    status: FraudAlertStatus,
    reviewNotes?: string,
    reviewedBy?: string
  ): Promise<FraudAlert> {
    const alert = await this.fraudAlertRepo.findOne({ where: { id: alertId } });
    if (!alert) throw new Error("Fraud alert not found");

    alert.status = status;
    // Handle optional parameters properly
    if (reviewNotes !== undefined) {
      alert.reviewNotes = reviewNotes;
    }
    if (reviewedBy !== undefined) {
      alert.reviewedBy = reviewedBy;
    }
    alert.reviewedAt = new Date();

    return await this.fraudAlertRepo.save(alert);
  }

  private async getAverageTransactionAmount(merchantId: string): Promise<number | null> {
    const result = await this.transactionRepo
      .createQueryBuilder("transaction")
      .select("AVG(transaction.amount)", "average")
      .where("transaction.merchantId = :merchantId", { merchantId })
      .andWhere("transaction.status = :status", { status: TransactionStatus.SUCCESS })
      .getRawOne();

    return result?.average ? parseFloat(result.average) : null;
  }
}
import { ReferralService } from "../../services/ReferralService";
import { ReferralProgramService } from "../../services/ReferralProgramService";
import AppDataSource from "../../config/db";
import { User } from "../../entities/User";
import { Referral } from "../../entities/Referral";
import { ReferralProgram } from "../../entities/ReferralProgram";
import { ReferralReward } from "../../entities/ReferralReward";
import { RewardType } from "../../enums/RewardType";
import { ReferralStatus } from "../../enums/ReferralStatus";
import { RewardStatus } from "../../enums/RewardStatus";

describe("ReferralService", () => {
  let referralService: ReferralService;
  let programService: ReferralProgramService;
  let testUser1: User;
  let testUser2: User;
  let testProgram: ReferralProgram;

  beforeAll(async () => {
    await AppDataSource.initialize();
    referralService = new ReferralService();
    programService = new ReferralProgramService();
  });

  beforeEach(async () => {
    // Clean up database
    await AppDataSource.getRepository(ReferralReward).delete({});
    await AppDataSource.getRepository(Referral).delete({});
    await AppDataSource.getRepository(ReferralProgram).delete({});
    await AppDataSource.getRepository(User).delete({});

    // Create test users
    const userRepo = AppDataSource.getRepository(User);
    testUser1 = userRepo.create({
      name: "Test User 1",
      email: "test1@example.com",
      password: "password123",
    });
    testUser2 = userRepo.create({
      name: "Test User 2",
      email: "test2@example.com",
      password: "password123",
    });
    await userRepo.save([testUser1, testUser2]);

    // Create test program
    testProgram = await programService.createProgram({
      name: "Test Program",
      referrerReward: 10,
      refereeReward: 5,
      startDate: new Date().toISOString(),
      rewardCurrency: "USD",
    });
    await programService.activateProgram(testProgram.id);
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  describe("generateReferralCode", () => {
    it("should generate a unique referral code", async () => {
      const code = await referralService.generateReferralCode(testUser1.id);
      expect(code).toMatch(/^REF\d{4}[A-F0-9]{8}$/);
    });

    it("should generate different codes for different users", async () => {
      const code1 = await referralService.generateReferralCode(testUser1.id);
      const code2 = await referralService.generateReferralCode(testUser2.id);
      expect(code1).not.toBe(code2);
    });
  });

  describe("createReferral", () => {
    it("should create a referral with generated code", async () => {
      const referral = await referralService.createReferral(testUser1.id);

      expect(referral.referrerId).toBe(testUser1.id);
      expect(referral.referralCode).toMatch(/^REF\d{4}[A-F0-9]{8}$/);
      expect(referral.status).toBe(ReferralStatus.PENDING);
      expect(referral.expiresAt).toBeDefined();
    });
  });

  describe("processReferralSignup", () => {
    let referral: Referral;

    beforeEach(async () => {
      referral = await referralService.createReferral(testUser1.id);
    });

    it("should process a valid referral signup", async () => {
      const processedReferral = await referralService.processReferralSignup(
        referral.referralCode,
        testUser2.id,
      );

      expect(processedReferral?.refereeId).toBe(testUser2.id);
      expect(processedReferral?.status).toBe(ReferralStatus.COMPLETED);
      expect(processedReferral?.conversionDate).toBeDefined();
    });

    it("should create rewards when processing referral", async () => {
      await referralService.processReferralSignup(
        referral.referralCode,
        testUser2.id,
      );

      const rewardRepo = AppDataSource.getRepository(ReferralReward);
      const rewards = await rewardRepo.find({
        where: { referralId: referral.id },
      });

      expect(rewards).toHaveLength(2);

      const referrerReward = rewards.find(
        (r) => r.type === RewardType.REFERRER,
      );
      const refereeReward = rewards.find((r) => r.type === RewardType.REFEREE);

      expect(referrerReward?.userId).toBe(testUser1.id);
      expect(referrerReward?.amount).toBe("10");
      expect(refereeReward?.userId).toBe(testUser2.id);
      expect(refereeReward?.amount).toBe("5");
    });

    it("should throw error for invalid referral code", async () => {
      await expect(
        referralService.processReferralSignup("INVALID", testUser2.id),
      ).rejects.toThrow("Invalid referral code");
    });

    it("should throw error for self-referral", async () => {
      await expect(
        referralService.processReferralSignup(
          referral.referralCode,
          testUser1.id,
        ),
      ).rejects.toThrow("Cannot refer yourself");
    });

    it("should throw error for already used referral code", async () => {
      await referralService.processReferralSignup(
        referral.referralCode,
        testUser2.id,
      );

      const testUser3 = AppDataSource.getRepository(User).create({
        name: "Test User 3",
        email: "test3@example.com",
        password: "password123",
      });
      await AppDataSource.getRepository(User).save(testUser3);

      await expect(
        referralService.processReferralSignup(
          referral.referralCode,
          testUser3.id,
        ),
      ).rejects.toThrow("Referral code already used");
    });
  });

  describe("getUserReferralStats", () => {
    it("should return correct stats for user with referrals", async () => {
      const referral = await referralService.createReferral(testUser1.id);
      await referralService.processReferralSignup(
        referral.referralCode,
        testUser2.id,
      );

      const stats = await referralService.getUserReferralStats(testUser1.id);

      expect(stats.totalReferrals).toBe(1);
      expect(stats.completedReferrals).toBe(1);
      expect(stats.pendingReferrals).toBe(0);
      expect(Number.parseFloat(stats.totalRewards)).toBe(10);
      expect(Number.parseFloat(stats.pendingRewards)).toBe(10);
      expect(Number.parseFloat(stats.paidRewards)).toBe(0);
    });

    it("should return zero stats for user with no referrals", async () => {
      const stats = await referralService.getUserReferralStats(testUser1.id);

      expect(stats.totalReferrals).toBe(0);
      expect(stats.completedReferrals).toBe(0);
      expect(stats.pendingReferrals).toBe(0);
      expect(Number.parseFloat(stats.totalRewards)).toBe(0);
    });
  });

  describe("processRewardPayment", () => {
    let reward: ReferralReward;

    beforeEach(async () => {
      const referral = await referralService.createReferral(testUser1.id);
      await referralService.processReferralSignup(
        referral.referralCode,
        testUser2.id,
      );

      const rewardRepo = AppDataSource.getRepository(ReferralReward);
      reward = (await rewardRepo.findOne({
        where: { userId: testUser1.id, type: RewardType.REFERRER },
      })) as ReferralReward;
    });

    it("should process reward payment successfully", async () => {
      const transactionHash = "test_hash_123";
      const processedReward = await referralService.processRewardPayment(
        reward.id,
        transactionHash,
      );

      expect(processedReward.status).toBe(RewardStatus.PAID);
      expect(processedReward.paidAt).toBeDefined();
      expect(processedReward.transactionHash).toBe(transactionHash);
    });

    it("should throw error for non-existent reward", async () => {
      await expect(
        referralService.processRewardPayment(99999, "hash"),
      ).rejects.toThrow("Reward not found");
    });

    it("should throw error for already paid reward", async () => {
      await referralService.processRewardPayment(reward.id, "hash1");

      await expect(
        referralService.processRewardPayment(reward.id, "hash2"),
      ).rejects.toThrow("Reward is not in pending status");
    });
  });

  describe("validateReferralCode", () => {
    let referral: Referral;

    beforeEach(async () => {
      referral = await referralService.createReferral(testUser1.id);
    });

    it("should validate unused referral code", async () => {
      const isValid = await referralService.validateReferralCode(
        referral.referralCode,
      );
      expect(isValid).toBe(true);
    });

    it("should invalidate used referral code", async () => {
      await referralService.processReferralSignup(
        referral.referralCode,
        testUser2.id,
      );

      const isValid = await referralService.validateReferralCode(
        referral.referralCode,
      );
      expect(isValid).toBe(false);
    });

    it("should invalidate non-existent referral code", async () => {
      const isValid = await referralService.validateReferralCode("INVALID");
      expect(isValid).toBe(false);
    });

    it("should invalidate expired referral code", async () => {
      const expiredReferral = await referralService.createReferral(
        testUser1.id,
        new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      );

      const isValid = await referralService.validateReferralCode(
        expiredReferral.referralCode,
      );
      expect(isValid).toBe(false);
    });
  });
});

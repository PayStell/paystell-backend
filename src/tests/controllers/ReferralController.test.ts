import request from "supertest";
import type { Express } from "express";
import AppDataSource from "../../config/db";
import { User } from "../../entities/User";
import { ReferralProgramService } from "../../services/ReferralProgramService";
import { AuthService } from "../../services/AuthService";

describe("ReferralController", () => {
  let app: Express;
  let testUser1: User;
  let testUser2: User;
  let authToken1: string;
  let authToken2: string;
  let programService: ReferralProgramService;
  let authService: AuthService;

  beforeAll(async () => {
    await AppDataSource.initialize();

    // Import app after database initialization
    const { default: appInstance } = await import("../../app");
    app = appInstance;

    programService = new ReferralProgramService();
    authService = new AuthService();
  });

  beforeEach(async () => {
    // Clean up database
    await AppDataSource.getRepository("ReferralReward").delete({});
    await AppDataSource.getRepository("Referral").delete({});
    await AppDataSource.getRepository("ReferralProgram").delete({});
    await AppDataSource.getRepository(User).delete({});

    // Create test users
    testUser1 = await authService.register({
      name: "Test User 1",
      email: "test1@example.com",
      password: "password123",
    });

    testUser2 = await authService.register({
      name: "Test User 2",
      email: "test2@example.com",
      password: "password123",
    });

    // Get auth tokens
    const loginResponse1 = await authService.login(
      "test1@example.com",
      "password123",
    );
    const loginResponse2 = await authService.login(
      "test2@example.com",
      "password123",
    );
    authToken1 = loginResponse1.tokens.accessToken;
    authToken2 = loginResponse2.tokens.accessToken;

    // Create and activate test program
    const program = await programService.createProgram({
      name: "Test Program",
      referrerReward: 10,
      refereeReward: 5,
      startDate: new Date().toISOString(),
      rewardCurrency: "USD",
    });
    await programService.activateProgram(program.id);
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  describe("POST /api/referrals", () => {
    it("should create a referral successfully", async () => {
      const response = await request(app)
        .post("/api/referrals")
        .set("Authorization", `Bearer ${authToken1}`)
        .send({});

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.referralCode).toMatch(/^REF\d{4}[A-F0-9]{8}$/);
      expect(response.body.data.referrerId).toBe(testUser1.id);
    });

    it("should require authentication", async () => {
      const response = await request(app).post("/api/referrals").send({});

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/referrals/signup", () => {
    let referralCode: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post("/api/referrals")
        .set("Authorization", `Bearer ${authToken1}`)
        .send({});

      referralCode = createResponse.body.data.referralCode;
    });

    it("should process referral signup successfully", async () => {
      const response = await request(app)
        .post("/api/referrals/signup")
        .set("Authorization", `Bearer ${authToken2}`)
        .send({ referralCode });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.refereeId).toBe(testUser2.id);
      expect(response.body.data.status).toBe("completed");
    });

    it("should reject invalid referral code", async () => {
      const response = await request(app)
        .post("/api/referrals/signup")
        .set("Authorization", `Bearer ${authToken2}`)
        .send({ referralCode: "INVALID" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should reject self-referral", async () => {
      const response = await request(app)
        .post("/api/referrals/signup")
        .set("Authorization", `Bearer ${authToken1}`)
        .send({ referralCode });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Cannot refer yourself");
    });
  });

  describe("GET /api/referrals", () => {
    beforeEach(async () => {
      // Create a referral and process signup
      const createResponse = await request(app)
        .post("/api/referrals")
        .set("Authorization", `Bearer ${authToken1}`)
        .send({});

      const referralCode = createResponse.body.data.referralCode;

      await request(app)
        .post("/api/referrals/signup")
        .set("Authorization", `Bearer ${authToken2}`)
        .send({ referralCode });
    });

    it("should get user referrals", async () => {
      const response = await request(app)
        .get("/api/referrals")
        .set("Authorization", `Bearer ${authToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].referrerId).toBe(testUser1.id);
      expect(response.body.data[0].refereeId).toBe(testUser2.id);
    });

    it("should support pagination", async () => {
      const response = await request(app)
        .get("/api/referrals?page=1&limit=5")
        .set("Authorization", `Bearer ${authToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe("GET /api/referrals/stats", () => {
    beforeEach(async () => {
      // Create and process a referral
      const createResponse = await request(app)
        .post("/api/referrals")
        .set("Authorization", `Bearer ${authToken1}`)
        .send({});

      const referralCode = createResponse.body.data.referralCode;

      await request(app)
        .post("/api/referrals/signup")
        .set("Authorization", `Bearer ${authToken2}`)
        .send({ referralCode });
    });

    it("should get user referral stats", async () => {
      const response = await request(app)
        .get("/api/referrals/stats")
        .set("Authorization", `Bearer ${authToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalReferrals).toBe(1);
      expect(response.body.data.completedReferrals).toBe(1);
      expect(Number.parseFloat(response.body.data.totalRewards)).toBe(10);
    });
  });

  describe("GET /api/referrals/validate/:code", () => {
    let referralCode: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post("/api/referrals")
        .set("Authorization", `Bearer ${authToken1}`)
        .send({});

      referralCode = createResponse.body.data.referralCode;
    });

    it("should validate valid referral code", async () => {
      const response = await request(app).get(
        `/api/referrals/validate/${referralCode}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.referral.referralCode).toBe(referralCode);
    });

    it("should invalidate invalid referral code", async () => {
      const response = await request(app).get(
        "/api/referrals/validate/INVALID",
      );

      expect(response.status).toBe(200);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.referral).toBeNull();
    });
  });
});

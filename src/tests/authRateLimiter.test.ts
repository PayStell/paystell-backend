import request from "supertest";
import express from "express";
import {
  loginRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
  twoFactorRateLimiter,
} from "../middlewares/authRateLimiter.middleware";

describe("Auth Rate Limiter Middleware", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe("Login Rate Limiter", () => {
    beforeEach(() => {
      app.post("/login", loginRateLimiter, (req, res) => {
        // Simulate a successful login
        res.status(200).json({ message: "Login successful" });
      });

      app.post("/login-fail", loginRateLimiter, (req, res) => {
        // Simulate a failed login
        res.status(401).json({ message: "Invalid credentials" });
      });
    });

    it("should allow requests within the rate limit", async () => {
      // Send requests within the rate limit
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post("/login")
          .send({ email: "test@example.com", password: "password" });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe("Login successful");

        // Check if rate limit headers are present
        expect(response.headers["ratelimit-limit"]).toBeDefined();
        expect(response.headers["ratelimit-remaining"]).toBeDefined();
        expect(response.headers["ratelimit-reset"]).toBeDefined();
      }
    });

    it("should only count failed requests against the limit", async () => {
      // Send 5 successful login requests
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post("/login")
          .send({ email: "test@example.com", password: "password" });
      }

      // This request should still succeed because skipSuccessfulRequests is true
      const response = await request(app)
        .post("/login")
        .send({ email: "test@example.com", password: "password" });

      expect(response.status).toBe(200);
    });

    it("should block requests that exceed the rate limit", async () => {
      // Send failed login requests to hit the rate limit
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post("/login-fail")
          .send({ email: "test@example.com", password: "wrong" });
      }

      // This request should be blocked
      const response = await request(app)
        .post("/login-fail")
        .send({ email: "test@example.com", password: "wrong" });

      expect(response.status).toBe(429);
      expect(response.body.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(response.headers["retry-after"]).toBeDefined();
    });
  });

  describe("Register Rate Limiter", () => {
    beforeEach(() => {
      app.post("/register", registerRateLimiter, (req, res) => {
        res.status(201).json({ message: "Registration successful" });
      });
    });

    it("should allow requests within the rate limit", async () => {
      // Send requests within the rate limit
      for (let i = 0; i < 3; i++) {
        const response = await request(app).post("/register").send({
          name: "Test User",
          email: "test@example.com",
          password: "password",
        });

        expect(response.status).toBe(201);
      }
    });

    it("should block requests that exceed the rate limit", async () => {
      // Send requests to hit the rate limit
      for (let i = 0; i < 3; i++) {
        await request(app).post("/register").send({
          name: "Test User",
          email: "test@example.com",
          password: "password",
        });
      }

      // This request should be blocked
      const response = await request(app).post("/register").send({
        name: "Test User",
        email: "test@example.com",
        password: "password",
      });

      expect(response.status).toBe(429);
    });
  });

  describe("Password Reset Rate Limiter", () => {
    beforeEach(() => {
      app.post("/forgot-password", passwordResetRateLimiter, (req, res) => {
        res.status(200).json({ message: "Password reset email sent" });
      });
    });

    it("should use email as the rate limit key", async () => {
      // Send 3 requests with the same email
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post("/forgot-password")
          .send({ email: "same@example.com" });
      }

      // 4th request with same email should be blocked
      const blockedResponse = await request(app)
        .post("/forgot-password")
        .send({ email: "same@example.com" });

      expect(blockedResponse.status).toBe(429);

      // Request with different email should succeed
      const successResponse = await request(app)
        .post("/forgot-password")
        .send({ email: "different@example.com" });

      expect(successResponse.status).toBe(200);
    });
  });

  describe("2FA Rate Limiter", () => {
    beforeEach(() => {
      app.post("/login-2fa", twoFactorRateLimiter, (req, res) => {
        // Simulate 2FA verification
        const { token } = req.body;
        if (token === "123456") {
          res.status(200).json({ message: "2FA verification successful" });
        } else {
          res.status(401).json({ message: "Invalid 2FA token" });
        }
      });
    });

    it("should allow successful requests and not count them against the limit", async () => {
      // Send 3 successful 2FA requests
      for (let i = 0; i < 3; i++) {
        await request(app).post("/login-2fa").send({
          email: "test@example.com",
          password: "password",
          token: "123456",
        });
      }

      // 4th successful request should still work due to skipSuccessfulRequests
      const response = await request(app).post("/login-2fa").send({
        email: "test@example.com",
        password: "password",
        token: "123456",
      });

      expect(response.status).toBe(200);
    });

    it("should block after too many failed attempts", async () => {
      // Send 3 failed 2FA requests
      for (let i = 0; i < 3; i++) {
        await request(app).post("/login-2fa").send({
          email: "test@example.com",
          password: "password",
          token: "wrong",
        });
      }

      // 4th failed request should be blocked
      const response = await request(app).post("/login-2fa").send({
        email: "test@example.com",
        password: "password",
        token: "wrong",
      });

      expect(response.status).toBe(429);
    });
  });
});

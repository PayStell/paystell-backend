// First, set up the mocks BEFORE importing anything else
jest.mock("../config/db", () => ({
  __esModule: true,
  default: {
    isInitialized: true,
    initialize: jest.fn().mockResolvedValue(true),
    query: jest.fn().mockResolvedValue(true),
    getRepository: jest.fn().mockImplementation(() => ({
      findOne: jest.fn().mockResolvedValue({}),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockReturnValue({}),
      delete: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    })),
  },
}));

// Now import the app AFTER setting up the mocks
import request from "supertest";
import app from "../app";
import AppDataSource from "../config/db";

describe("Health Check Endpoints", () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe("GET /health", () => {
    it("should return 200 and uptime information", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("uptime");
      expect(response.body.message).toBe("OK");
      expect(response.body).toHaveProperty("timestamp");
    });
  });

  describe("GET /health/db", () => {
    it("should return 200 if database connection is successful", async () => {
      const response = await request(app).get("/health/db");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("OK");
      expect(AppDataSource.query).toHaveBeenCalledWith("SELECT 1");
    });

    it("should return 503 if database connection fails", async () => {
      (AppDataSource.query as jest.Mock).mockRejectedValueOnce(
        new Error("Database connection failed"),
      );

      const response = await request(app).get("/health/db");

      expect(response.status).toBe(503);
      expect(response.body.message).toBe("Database connection failed");
    });
  });

  describe("GET /health/dependencies", () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ horizon: "ok" }),
      });
    });

    it("should return 200 if all dependencies are accessible", async () => {
      const response = await request(app).get("/health/dependencies");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("OK");
      expect(response.body.dependencies).toHaveProperty("stellar", "OK");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://horizon-testnet.stellar.org/",
      );
    });

    it("should return 503 if Stellar API is not accessible", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const response = await request(app).get("/health/dependencies");

      expect(response.status).toBe(503);
      expect(response.body.dependencies.stellar).toBe("FAIL");
    });
  });
});

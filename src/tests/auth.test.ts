import request from "supertest";
import app from "../app";
import AppDataSource from "../config/db";

describe("Auth System", () => {
    beforeAll(async () => {
        await AppDataSource.initialize();
    });

    afterAll(async () => {
        await AppDataSource.destroy();
    });

    const testUser = {
        name: "Test User",
        email: "test@example.com",
        password: "password123"
    };

    describe("POST /auth/register", () => {
        it("should register a new user", async () => {
            const response = await request(app)
                .post("/auth/register")
                .send(testUser);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty("id");
            expect(response.body).not.toHaveProperty("password");
        });

        it("should not register a user with duplicate email", async () => {
            const response = await request(app)
                .post("/auth/register")
                .send(testUser);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("message", "Email already registered");
        });
    });

    describe("POST /auth/login", () => {
        it("should login with valid credentials", async () => {
            const response = await request(app)
                .post("/auth/login")
                .send({
                    email: testUser.email,
                    password: testUser.password
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("token");
            expect(response.body).toHaveProperty("user");
        });

        it("should not login with invalid credentials", async () => {
            const response = await request(app)
                .post("/auth/login")
                .send({
                    email: testUser.email,
                    password: "wrongpassword"
                });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty("message", "Invalid credentials");
        });
    });
});

describe('Authentication Tests', () => {
    test('should return a token on successful login', async () => {
      // Implement test
    });
  });
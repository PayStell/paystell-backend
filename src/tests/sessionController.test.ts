import request from "supertest";
import express from "express";
import sessionRoutes from "../routes/session.routes";
import AppDataSource from "../config/db";
import { User } from "../entities/User";

const app = express();
app.use(express.json());
app.use("/session", sessionRoutes);

describe("SessionController", () => {
  let user: User;

  beforeAll(async () => {
    await AppDataSource.initialize();

    const userRepository = AppDataSource.getRepository(User);
    user = userRepository.create({
      id: 1,
      email: "test@example.com",
      name: "Test",
      password: "hashedpassword",
    });
    await userRepository.save(user);
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  let token: string;

  it("should create a new session", async () => {
    const response = await request(app)
      .post("/session")
      .send({ userId: user.id });
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("token");

    token = response.body.token;
  });

  it("should delete a session", async () => {
    const response = await request(app)
      .delete("/session")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Session deleted successfully");
  });

  it("should return 400 if session token is missing", async () => {
    const response = await request(app).delete("/session");
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Token missing");
  });
});

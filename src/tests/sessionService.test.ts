import AppDataSource from "../config/db";
import { User } from "../entities/User";

describe("SessionService", () => {
  let user: User;

  beforeAll(async () => {
    await AppDataSource.initialize();

    // Create a test user
    const userRepository = AppDataSource.getRepository(User);
    user = userRepository.create({
      id: 1,
      name: "Test",
      email: "test@example.com",
      password: "hashedpassword",
    });
    await userRepository.save(user);
  });

  afterAll(async () => {
    await AppDataSource.destroy();
    // });

    // it("should create a new session for a user", async () => {
    //   const session = await SessionService.createSession(user.id);
    //   expect(session).toHaveProperty("token");
    //   expect(session).toHaveProperty("expiresAt");
    //   expect(session.user.id).toBe(user.id);
    // });

    // it("should delete a session", async () => {
    //   const session = await SessionService.createSession(user.id);
    //   await SessionService.deleteSession(session.token);

    //   const foundSession = await SessionService.getSessionByToken(session.token);
    //   expect(foundSession).toBeNull();
    // });

    // it("should retrieve a session by token", async () => {
    //   const session = await SessionService.createSession(user.id);
    //   const foundSession = await SessionService.getSessionByToken(session.token);

    //   expect(foundSession).not.toBeNull();
    //   expect(foundSession?.token).toBe(session.token);
    // });

    // it("should throw an error if the user does not exist", async () => {
    //   await expect(SessionService.createSession("095374d4-aea5-41e6-b57c-a00689495470")).rejects.toThrow(
    //     "User not found"
    //   );
  });
});

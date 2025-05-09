import { Repository } from "typeorm";
import { AppDataSource } from "../config/db"; // ✅ Import the configured DataSource
import { Session } from "../entities/Session";
import { User } from "../entities/User";
import { v4 as uuidv4 } from "uuid";

class SessionService {
  private sessionRepository: Repository<Session>;
  private userRepository: Repository<User>;

  constructor() {
    this.sessionRepository = AppDataSource.getRepository(Session);
    this.userRepository = AppDataSource.getRepository(User);
  }

  async createSession(userId: string): Promise<Session> {
    const user = await this.userRepository.findOne({
      where: { id: Number(userId) },
    });
    if (!user) throw new Error("User not found");

    // Check for an existing session and delete it
    const existingSession = await this.sessionRepository.findOne({
      where: { user: { id: Number(userId) } },
    });
    if (existingSession) {
      await this.sessionRepository.delete({ id: existingSession.id });
      console.log(`🗑️ Deleted previous session for user ${userId}`);
    }

    // Create a new session
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const session = this.sessionRepository.create({ token, expiresAt, user });
    return await this.sessionRepository.save(session);
  }

  async getSessionByToken(token: string): Promise<Session | null> {
    return await this.sessionRepository.findOne({
      where: { token },
      relations: ["user"],
    });
  }

  async deleteSession(token: string): Promise<void> {
    await this.sessionRepository.delete({ token });
  }

  async cleanupExpiredSessions(): Promise<void> {
    await this.sessionRepository
      .createQueryBuilder()
      .delete()
      .where("expiresAt < NOW()")
      .execute();
    console.log("✅ Expired sessions deleted");
  }
}

export default new SessionService();

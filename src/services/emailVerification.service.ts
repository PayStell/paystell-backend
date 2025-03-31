import { Repository } from "typeorm";
import DataSource from "../config/db";
import { EmailVerification } from "../entities/emailVerification";
import { User } from "../entities/User";
import { sendVerificationEmail } from "../utils/sendVerificationEmail";
import { verifyToken, generateVerificationToken } from "../utils/token";
import { sendWalletVerificationEmail } from "../utils/sendWalletVerificationEmail";

class EmailVerificationService {
  private emailVerificationRepository: Repository<EmailVerification>;
  private userRepository: Repository<User>;

  constructor() {
    this.emailVerificationRepository =
      DataSource.getRepository(EmailVerification);
    this.userRepository = DataSource.getRepository(User);
  }
  async sendWalletVerificationEmail(
    email: string,
    walletAddress: string,
    verificationCode: string,
  ): Promise<void> {
    await sendWalletVerificationEmail(email, verificationCode, walletAddress);
  }

  async sendVerificationEmail(email: string, userId: number): Promise<void> {
    const token = generateVerificationToken(email);

    const verificationEntry = this.emailVerificationRepository.create({
      token,
      email,
      user: { id: userId },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await this.emailVerificationRepository.save(verificationEntry);

    await sendVerificationEmail(email);
  }

  async verifyEmail(token: string): Promise<void> {
    const payload = verifyToken(token);
    const email = payload.email;

    const verificationEntry = await this.emailVerificationRepository.findOne({
      where: { token, email },
      relations: ["user"],
    });

    if (!verificationEntry || verificationEntry.expiresAt < new Date()) {
      throw new Error("Invalid or expired token");
    }

    const user = await this.userRepository.findOne({
      where: { id: verificationEntry.user.id },
    });
    if (user) {
      user.isEmailVerified = true;
      await this.userRepository.save(user);
    }
    await this.emailVerificationRepository.remove(verificationEntry);
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.isEmailVerified) {
      throw new Error("Email is already verified");
    }

    await this.sendVerificationEmail(email, user.id);
  }
}

export default EmailVerificationService;

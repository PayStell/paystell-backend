import EmailVerificationService from "../services/emailVerification.service";
import { Repository } from "typeorm";
import { EmailVerification } from "../entities/emailVerification";
import { User } from "../entities/User";
import { sendVerificationEmail } from "../utils/sendVerificationEmail";
import { verifyToken, generateVerificationToken } from "../utils/token";

jest.mock("../utils/sendVerificationEmail", () => ({
  sendVerificationEmail: jest.fn(),
}));

jest.mock("../utils/token", () => ({
  generateVerificationToken: jest.fn(),
  verifyToken: jest.fn(),
}));

describe("EmailVerificationService", () => {
  let emailVerificationService: EmailVerificationService;
  let emailVerificationRepository: jest.Mocked<Repository<EmailVerification>>;
  let userRepository: jest.Mocked<Repository<User>>;

  beforeEach(() => {
    emailVerificationRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<Repository<EmailVerification>>;

    userRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    emailVerificationService = new EmailVerificationService();
    emailVerificationService["emailVerificationRepository"] = emailVerificationRepository;
    emailVerificationService["userRepository"] = userRepository;
  });

  it("should send a verification email", async () => {
    const mockEmail = "test@example.com";
    const mockUserId = "user-123";
    const mockToken = "mock-token";

    (generateVerificationToken as jest.Mock).mockReturnValue(mockToken);

    emailVerificationRepository.save.mockResolvedValue({
      token: mockToken,
      email: mockEmail,
    } as EmailVerification);

    // await emailVerificationService.sendVerificationEmail(mockEmail, mockUserId);

    expect(generateVerificationToken).toHaveBeenCalledWith(mockEmail);
    expect(emailVerificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ token: mockToken, email: mockEmail, user: { id: mockUserId } })
    );
    expect(emailVerificationRepository.save).toHaveBeenCalled();
    expect(sendVerificationEmail).toHaveBeenCalledWith(mockEmail);
  });

  it("should verify an email with a valid token", async () => {
    const mockToken = "valid-token";
    const mockEmail = "test@example.com";
    const mockUser = { id: "user-123", isEmailVerified: false } as unknown as User;

    (verifyToken as jest.Mock).mockReturnValue({ email: mockEmail });

    emailVerificationRepository.findOne.mockResolvedValue({
      token: mockToken,
      email: mockEmail,
      expiresAt: new Date(Date.now() + 10000),
      user: mockUser,
    } as EmailVerification);

    userRepository.findOne.mockResolvedValue(mockUser);

    await emailVerificationService.verifyEmail(mockToken);

    expect(verifyToken).toHaveBeenCalledWith(mockToken);
    expect(emailVerificationRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { token: mockToken, email: mockEmail } })
    );
    expect(userRepository.save).toHaveBeenCalledWith(expect.objectContaining({ isEmailVerified: true }));
    expect(emailVerificationRepository.remove).toHaveBeenCalled();
  });

  it("should throw an error for an expired token", async () => {
    const mockToken = "expired-token";
    const mockEmail = "test@example.com";

    (verifyToken as jest.Mock).mockReturnValue({ email: mockEmail });

    emailVerificationRepository.findOne.mockResolvedValue({
      token: mockToken,
      email: mockEmail,
      expiresAt: new Date(Date.now() - 10000),
    } as EmailVerification);

    await expect(emailVerificationService.verifyEmail(mockToken)).rejects.toThrow(
      "Invalid or expired token"
    );
  });

  it("should resend a verification email if the user is not verified", async () => {
    const mockEmail = "test@example.com";
    const mockUser = { id: "user-123", isEmailVerified: false } as unknown as User;

    userRepository.findOne.mockResolvedValue(mockUser);

    await emailVerificationService.resendVerificationEmail(mockEmail);

    expect(userRepository.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { email: mockEmail } }));
    expect(sendVerificationEmail).toHaveBeenCalledWith(mockEmail);
  });

  it("should throw an error if the user is already verified", async () => {
    const mockEmail = "test@example.com";
    const mockUser = { id: "user-123", isEmailVerified: true } as unknown as User;

    userRepository.findOne.mockResolvedValue(mockUser);

    await expect(emailVerificationService.resendVerificationEmail(mockEmail)).rejects.toThrow(
      "Email is already verified"
    );
  });

  it("should throw an error if the user is not found", async () => {
    const mockEmail = "test@example.com";

    userRepository.findOne.mockResolvedValue(null);

    await expect(emailVerificationService.resendVerificationEmail(mockEmail)).rejects.toThrow(
      "User not found"
    );
  });
});

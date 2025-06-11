import { Request, Response } from "express";
import { UserController } from "../../controllers/UserController";
import { UserService } from "../../services/UserService";
import { UserRole } from "../../enums/UserRole";
import { User } from "../../entities/User";

jest.mock("../../services/UserService");

describe("UserController", () => {
  let userController: UserController;
  let userService: jest.Mocked<UserService>;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    userService = new UserService() as jest.Mocked<UserService>;
    userController = new UserController();
    // Use type assertion to access private property for testing
    (userController as unknown as { userService: UserService }).userService =
      userService;

    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
  });

  it("should create a new user", async () => {
    const userData = {
      name: "Test",
      email: "test@example.com",
      password: "password123",
      role: UserRole.USER,
      logoUrl: "https://example.com/logo.png",
      walletAddress: "0x123456789abcdef",
      isEmailVerified: false,
      isWalletVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      hashPassword: jest.fn(),
      emailVerifications: [],
      sessions: [],
    };

    const createdUser = {
      id: 1,
      ...userData,
      twoFactorAuth: undefined,
      walletVerifications: [],
    };

    userService.createUser.mockResolvedValue(createdUser as unknown as User);
    req.body = userData;

    await userController.createUser(req as Request, res as Response);

    const mutableUser = { ...createdUser };
    // Use type assertion to delete password property
    delete (mutableUser as Partial<typeof mutableUser> & { password?: string })
      .password;

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(mutableUser);
  });

  it("should get a user by id", async () => {
    const user = {
      id: 1,
      name: "Test",
      email: "test@example.com",
      password: "password123",
      role: UserRole.USER,
      logoUrl: "https://example.com/logo.png",
      walletAddress: "0x123456789abcdef",
      isEmailVerified: false,
      isWalletVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      hashPassword: jest.fn(),
      emailVerifications: [],
      sessions: [],
      twoFactorAuth: undefined,
      walletVerifications: [],
    };

    userService.getUserById.mockResolvedValue(user as unknown as User);
    req.params = { id: "1" };

    await userController.getUserById(req as Request, res as Response);

    const mutableUser = { ...user };
    // Use type assertion to delete password property
    delete (mutableUser as Partial<typeof mutableUser> & { password?: string })
      .password;

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mutableUser);
  });

  it("should update a user", async () => {
    const userData = {
      name: "Test",
      email: "test@example.com",
      password: "password123",
      role: UserRole.USER,
      logoUrl: "https://example.com/logo.png",
      walletAddress: "0x123456789abcdef",
      isEmailVerified: false,
      isWalletVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      hashPassword: jest.fn(),
      emailVerifications: [],
      sessions: [],
    };

    const updatedUser = {
      id: 1,
      ...userData,
      twoFactorAuth: undefined,
      walletVerifications: [],
    };

    userService.updateUser.mockResolvedValue(updatedUser as unknown as User);
    req.params = { id: "1" };
    req.body = userData;

    await userController.updateUser(req as Request, res as Response);

    const mutableUser = { ...updatedUser };
    // Use type assertion to delete password property
    delete (mutableUser as Partial<typeof mutableUser> & { password?: string })
      .password;

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mutableUser);
  });

  it("should delete a user", async () => {
    req.params = { id: "1" };

    await userController.deleteUser(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});

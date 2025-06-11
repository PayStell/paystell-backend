import { UserService } from "../../services/UserService";
import { UserRole } from "../../enums/UserRole";
import AppDataSource from "../../config/db";
import bcrypt from "bcryptjs";
import { CreateUserDTO } from "../../dtos/CreateUserDTO";
import { UpdateUserDTO } from "../../dtos/UpdateUserDTO";

jest.mock("../../config/db");
jest.mock("bcryptjs");

const mockUserRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOneBy: jest.fn(),
  remove: jest.fn(),
};

(AppDataSource.getRepository as jest.Mock).mockReturnValue(mockUserRepository);

describe("UserService", () => {
  let userService: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    userService = new UserService();
  });

  describe("createUser", () => {
    it("should create a new user with password hashed in beforeInsert", async () => {
      const userData: CreateUserDTO = {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        role: UserRole.USER,
        logoUrl: "https://example.com/logo.png",
        walletAddress: "0x123456789abcdef",
      };

      mockUserRepository.save.mockResolvedValue({ id: 1, ...userData });

      const result = await userService.createUser(userData);

      expect(mockUserRepository.create).toHaveBeenCalledWith({
        ...userData,
        password: "password123",
      });

      expect(result).toEqual({ id: 1, ...userData });
    });
    it("should throw error if a required parameter is missing", async () => {
      // Datos deliberadamente inválidos para probar validación
      const userData = {
        //name: 'Test User',
        email: "test@example.com",
        password: "password123",
      } as unknown as CreateUserDTO;

      await expect(userService.createUser(userData)).rejects.toThrow(
        "name should not be empty",
      );
    });

    it("should throw error if email format is invalid", async () => {
      const userData: CreateUserDTO = {
        name: "Test User",
        email: "invalid-email",
        password: "password123",
        role: UserRole.USER,
        logoUrl: "https://example.com/logo.png",
        walletAddress: "0x123456789abcdef",
      };

      await expect(userService.createUser(userData)).rejects.toThrow(
        "email must be an email",
      );
    });
  });

  describe("getUserById", () => {
    it("should return a user when found", async () => {
      const user = { id: 1, name: "Test User", email: "test@example.com" };
      mockUserRepository.findOneBy.mockResolvedValue(user);

      const result = await userService.getUserById(1);
      expect(result).toEqual(user);
    });

    it("should return null when user is not found", async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      const result = await userService.getUserById(50);
      expect(result).toBeNull();
    });
  });

  describe("updateUser", () => {
    it("should update all user fields and hash new password if provided", async () => {
      const existingUser = {
        id: 1,
        password: "oldHash",
        name: "Old Name",
        email: "old@example.com",
        role: UserRole.USER,
        logoUrl: "https://example.com/old-logo.png",
        walletAddress: "0xoldaddress123",
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserRepository.findOneBy
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(null);

      (bcrypt.hash as jest.Mock).mockResolvedValue("newHash");

      const updateData: UpdateUserDTO = {
        name: "Updated User",
        email: "updated@example.com",
        password: "newPassword",
        role: UserRole.ADMIN,
        logoUrl: "https://example.com/new-logo.png",
        walletAddress: "0xabcdef123456789",
      };

      mockUserRepository.save.mockResolvedValue({
        ...existingUser,
        ...updateData,
        password: "newHash",
      });

      const result = await userService.updateUser(1, updateData);

      expect(bcrypt.hash).toHaveBeenCalledWith("newPassword", 10);

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          password: "newHash",
          name: "Updated User",
          email: "updated@example.com",
          role: UserRole.ADMIN,
          logoUrl: "https://example.com/new-logo.png",
          walletAddress: "0xabcdef123456789",
        }),
      );

      expect(result.password).toBe("newHash");
    });

    it("should throw error if user does not exist", async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(
        userService.updateUser(1, {} as UpdateUserDTO),
      ).rejects.toThrow("User not found");
    });
  });

  describe("deleteUser", () => {
    it("should delete a user when found", async () => {
      const user = {
        id: 1,
        name: "Test User",
        email: "test@mail.com",
        password: "password123",
      };
      mockUserRepository.findOneBy.mockResolvedValue(user);

      await userService.deleteUser(1);
      expect(mockUserRepository.remove).toHaveBeenCalledWith(user);
    });

    it("should throw error if user does not exist", async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(userService.deleteUser(1)).rejects.toThrow("User not found");
    });
  });
});

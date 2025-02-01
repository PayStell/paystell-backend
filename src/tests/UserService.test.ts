import { UserService } from '../services/UserService';
import { UserRole } from '../enums/UserRole';
import AppDataSource from '../config/db';
import bcrypt from 'bcrypt';
import { CreateUserDTO } from '../dtos/CreateUserDTO';
import { UpdateUserDTO } from '../dtos/UpdateUserDTO';

jest.mock('../config/db');
jest.mock('bcrypt');

const mockUserRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOneBy: jest.fn(),
  remove: jest.fn()
};

(AppDataSource.getRepository as jest.Mock).mockReturnValue(mockUserRepository);

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    userService = new UserService();
  });

  describe('createUser', () => {
    it('should create a new user with hashed password', async () => {
      const userData: CreateUserDTO = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: UserRole.USER,
        logoUrl: 'https://example.com/logo.png',
        walletAddress: '0x123456789abcdef'
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed123');
      mockUserRepository.save.mockResolvedValue({ id: 1, ...userData });

      const result = await userService.createUser(userData);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        ...userData,
        password: 'hashed123'
      });
      expect(result).toEqual({ id: 1, ...userData });
    });

    it('should throw error if email already exists', async () => {
        const userData: CreateUserDTO = {
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
            role: UserRole.USER,
            logoUrl: 'https://example.com/logo.png',
            walletAddress: '0x123456789abcdef'
        };


        mockUserRepository.findOneBy.mockResolvedValue({ email: 'test@example.com' });

        await expect(userService.createUser(userData)).rejects.toThrow('Email already exists');
        }
    );

    it('should throw error if a required parameter is missing', async () => {
        const userData = {
        //name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        } as any;
  
        await expect(userService.createUser(userData)).rejects.toThrow('name should not be empty');
    });
  
    it('should throw error if email format is invalid', async () => {
        const userData: CreateUserDTO = {
            name: 'Test User',
            email: 'invalid-email',
            password: 'password123',
            role: UserRole.USER,
            logoUrl: 'https://example.com/logo.png',
            walletAddress: '0x123456789abcdef'
        };

        await expect(userService.createUser(userData)).rejects.toThrow('email must be an email');
    });
  }); 

  describe('getUserById', () => {
    it('should return a user when found', async () => {
      const user = { id: 1, name: 'Test User', email: 'test@example.com' };
      mockUserRepository.findOneBy.mockResolvedValue(user);

      const result = await userService.getUserById(1);
      expect(result).toEqual(user);
    });

    it('should return null when user is not found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      const result = await userService.getUserById(50);
      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update all user fields and hash new password if provided', async () => {
      const existingUser = { 
          id: 1, 
          password: 'oldHash',
          name: 'Old Name',
          email: 'old@example.com',
          role: UserRole.USER,
          logoUrl: 'https://example.com/old-logo.png',
          walletAddress: '0xoldaddress123',
          save: jest.fn().mockResolvedValue(true)
      };
  
      mockUserRepository.findOneBy.mockResolvedValue(existingUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHash');
  
      const updateData: UpdateUserDTO = {
          name: 'Updated User',
          email: 'updated@example.com',
          password: 'newPassword',
          role: UserRole.ADMIN,
          logoUrl: 'https://example.com/new-logo.png',
          walletAddress: '0xabcdef123456789'
      };
  
      mockUserRepository.save.mockResolvedValue({
          ...existingUser,
          ...updateData,
          password: 'newHash'
      });
  
      const result = await userService.updateUser(1, updateData);
  
      // Check that library function was called with the correct arguments
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword', 10);
  
      // Ensure that the user fields are updated
      expect(mockUserRepository.save).toHaveBeenCalledWith(expect.objectContaining({
          id: 1,
          password: 'newHash',
          name: 'Updated User',
          email: 'updated@example.com',
          role: UserRole.ADMIN,
          logoUrl: 'https://example.com/new-logo.png',
          walletAddress: '0xabcdef123456789'
      }));
  
      // Ensure that the password is hashed
      expect(result.password).toBe('newHash');
  })
  
      it('should throw error if user does not exist', async () => {
        mockUserRepository.findOneBy.mockResolvedValue(null);
  
        await expect(userService.updateUser(1, {} as UpdateUserDTO)).rejects.toThrow('User not found');
      });
  });

  describe('deleteUser', () => {
    it('should delete a user when found', async () => {
      const user = { id: 1, name: 'Test User', email: 'test@mail.com', password: 'password123' };
      mockUserRepository.findOneBy.mockResolvedValue(user);

      await userService.deleteUser(1);
      expect(mockUserRepository.remove).toHaveBeenCalledWith(user);
    });

    it('should throw error if user does not exist', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(userService.deleteUser(1)).rejects.toThrow('User not found');
    });
  });  

});
import { Request, Response } from 'express';
import { UserService } from '../services/UserService';
import { CreateUserDTO } from '../dtos/CreateUserDTO';
import { UpdateUserDTO } from '../dtos/UpdateUserDTO';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async createUser(req: Request, res: Response) {
    try {
      const userData: CreateUserDTO = req.body;
      const newUser = await this.userService.createUser(userData);
      
      const { password, ...userWithoutPassword } = newUser;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getUserById(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      const user = await this.userService.getUserById(userId);
      
      if (!user) {
        return this.handleError(res, new Error('User not found'));
      }
      
      const { password, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async updateUser(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      const updateData: UpdateUserDTO = req.body;
    
      const updatedUser = await this.userService.updateUser(userId, updateData);
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      await this.userService.deleteUser(userId);
      res.status(204).send();
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private handleError(res: Response, error: unknown) {
    if (error instanceof Error) {
      switch(error.message) {
        case 'User not found':
          res.status(404).json({ message: error.message });
          break;
        case 'Email already exists':
          res.status(409).json({ message: error.message });
          break;
        default:
          res.status(500).json({ message: 'Internal server error' });
      }
    } else {
      res.status(500).json({ message: 'Unknown error' });
    }
  }
}
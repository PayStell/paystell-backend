import { Request, Response } from "express";
import { UserService } from "../services/UserService";
import { CreateUserDTO } from "../dtos/CreateUserDTO";
import { UpdateUserDTO } from "../dtos/UpdateUserDTO";
import { redisClient } from "../config/redisConfig";
import { cacheMiddleware } from "../middlewares/cacheMiddleware";
import { User } from "src/entities/User";

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const userData: CreateUserDTO = req.body;

      const newUser: User = await this.userService.createUser(userData);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = newUser;

      const _cacheKey = `user:${newUser.id}`;
      await redisClient.setEx(
        _cacheKey,
        600,
        JSON.stringify(userWithoutPassword),
      );

      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error(error);
      this.handleError(res, error);
    }
  }

  async getUserById(req: Request, res: Response): Promise<void> {
    const userId = parseInt(req.params.id);
    const _cacheKey = `user:${userId}`;

    cacheMiddleware("user")(req, res, async () => {
      try {
        const cachedUser = res.locals.cachedData;
        if (cachedUser) {
          return;
        }

        const user = await this.userService.getUserById(userId);
        if (!user) {
          this.handleError(res, new Error("User not found"));
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userWithoutPassword } = user;

        if (res.locals.cacheKey) {
          await redisClient.setEx(
            res.locals.cacheKey,
            600,
            JSON.stringify(userWithoutPassword),
          );
        }

        res.status(200).json(userWithoutPassword);
      } catch (error) {
        this.handleError(res, error);
      }
    });
  }

  async getAllUsers(req: Request, res: Response): Promise<void> {
    const _cacheKey = "users";

    cacheMiddleware("users")(req, res, async () => {
      try {
        const cachedUsers = res.locals.cachedData;
        if (cachedUsers) {
          return;
        }

        const users = await this.userService.getAllUsers();
        if (!users) {
          this.handleError(res, new Error("Users not found"));
          return;
        }

        if (res.locals.cacheKey) {
          await redisClient.setEx(
            res.locals.cacheKey,
            600,
            JSON.stringify(users),
          );
        }

        res.status(200).json(users);
      } catch (error) {
        this.handleError(res, error);
      }
    });
  }

  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.id);
      const updateData: UpdateUserDTO = req.body;

      const updatedUser = await this.userService.updateUser(userId, updateData);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = updatedUser;

      const _cacheKey = `user:${userId}`;
      await redisClient.setEx(
        _cacheKey,
        600,
        JSON.stringify(userWithoutPassword),
      );

      res.status(200).json(userWithoutPassword);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.id);
      await this.userService.deleteUser(userId);

      const _cacheKey = `user:${userId}`;
      await redisClient.del(_cacheKey);

      res.status(204).send();
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private handleError(res: Response, error: unknown): void {
    console.error("Error:", error);
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
  }
}

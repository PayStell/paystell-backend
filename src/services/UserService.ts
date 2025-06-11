import { Repository } from "typeorm";
import AppDataSource from "../config/db";
import { User } from "../entities/User";
import { validate } from "class-validator";
import { CreateUserDTO } from "../dtos/CreateUserDTO";
import { UpdateUserDTO } from "../dtos/UpdateUserDTO";
import { hash } from "bcryptjs";

export class UserService {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  async createUser(data: CreateUserDTO): Promise<User> {
    const dto = Object.assign(new CreateUserDTO(), data);
    const errors = await validate(dto);

    if (errors.length > 0) {
      throw new Error(
        errors.map((err) => Object.values(err.constraints || {})).join(", "),
      );
    }

    const existingUser = await this.userRepository.findOneBy({
      email: data.email,
    });
    if (existingUser) {
      throw new Error("Email already exists");
    }

    const newUser = this.userRepository.create(data);
    return await this.userRepository.save(newUser);
  }

  async getUserById(id: number): Promise<User | null> {
    return await this.userRepository.findOneBy({ id });
  }

  async getAllUsers(): Promise<User[]> {
    return await this.userRepository.find();
  }

  async updateUser(id: number, data: UpdateUserDTO): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new Error("User not found");
    }

    if (data.email && data.email !== user.email) {
      const existingUser = await this.userRepository.findOneBy({
        email: data.email,
      });
      if (existingUser) {
        throw new Error("Email already exists");
      }
    }

    if (data.password) {
      data.password = await hash(data.password, 10);
    }

    Object.assign(user, data);
    return await this.userRepository.save(user);
  }

  async deleteUser(id: number): Promise<void> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new Error("User not found");
    }

    await this.userRepository.remove(user);
  }
}

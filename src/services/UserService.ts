import { Repository } from 'typeorm';
import AppDataSource from '../config/db';
import { User } from '../entities/User';
import { validate } from 'class-validator';
import { CreateUserDTO } from '../dtos/CreateUserDTO';
import { UpdateUserDTO } from '../dtos/UpdateUserDTO';
import bcrypt from 'bcrypt';

export class UserService {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  async createUser(data: CreateUserDTO): Promise<User> {

    const dto = Object.assign(new CreateUserDTO(), data);
    const errors = await validate(dto);

    if (errors.length > 0) {
        throw new Error(errors.map(err => Object.values(err.constraints || {})).join(', '));
    }
    
    const existingUser = await this.userRepository.findOneBy({ 
      email: data.email 
    });
  
    if (existingUser) {
      throw new Error('Email already exists');
    }
  
    // For security reasons, we should hash the password before saving it to the database
    // The number 10 as salt rounds is recommended to gererate the hash securely
    const hashedPassword = await bcrypt.hash(data.password, 10); 
    
    const newUser = this.userRepository.create({
      ...data,
      password: hashedPassword,
    });

    return await this.userRepository.save(newUser);
  }

  async getUserById(id: number): Promise<User | null> {
    return await this.userRepository.findOneBy({ id });
  }

  async updateUser(id: number, data: UpdateUserDTO): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    
    if (!user) {
      throw new Error('User not found');
    }


    const updatedUser = Object.assign(user, data);
    
 
    if (data.password) {
      // For security reasons, we should hash the password before saving it to the database
      updatedUser.password = await bcrypt.hash(data.password, 10);
    }

    return await this.userRepository.save(updatedUser);
  }

  async deleteUser(id: number): Promise<void> {
    const user = await this.userRepository.findOneBy({ id });
    
    if (!user) {
      throw new Error('User not found');
    }

    await this.userRepository.remove(user);
  }
}
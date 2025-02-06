import { Repository } from "typeorm";
import { User } from "../entities/User";
import { compare, hash } from "bcryptjs";
import { sign, verify } from "jsonwebtoken";
import AppDataSource from "../config/db";

interface UserRegistrationData {
    name: string;
    email: string;
    password: string;
}

interface UserResponse {
    id: number;
    name: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
    twoFactorAuth?: {

        isEnabled: boolean;

    };
}

interface TokenResponse {
    accessToken: string;
    refreshToken: string;
}

interface LoginResponse {
    user: UserResponse;
    tokens: TokenResponse;
}

export class AuthService {
    private userRepository: Repository<User>;
    private readonly JWT_SECRET: string;
    private readonly JWT_REFRESH_SECRET: string;

    constructor() {
        this.userRepository = AppDataSource.getRepository(User);
        this.JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
        this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key";
    }

    private generateTokens(userId: number, email: string): TokenResponse {
        const accessToken = sign(
            { id: userId, email },
            this.JWT_SECRET,
            { expiresIn: "15m" }
        );

        const refreshToken = sign(
            { id: userId, email },
            this.JWT_REFRESH_SECRET,
            { expiresIn: "7d" }
        );

        return { accessToken, refreshToken };
    }

    async register(userData: UserRegistrationData): Promise<UserResponse> {
        const userExists = await this.userRepository.findOne({
            where: { email: userData.email }
        });
    
        if (userExists) {
            console.error("Correo ya registrado:", userData.email);
            throw new Error("Email already registered");
        }
    
    
        const user = this.userRepository.create(userData);
    
        const savedUser = await this.userRepository.save(user);
    
        return {
            id: savedUser.id,
            name: savedUser.name,
            email: savedUser.email,
            createdAt: savedUser.createdAt,
            updatedAt: savedUser.updatedAt
        };
    }
    

    async login(email: string, password: string): Promise<LoginResponse> {
        const user = await this.userRepository.findOne({
            where: { email }
        });
    
        if (!user) {
            throw new Error("Invalid credentials");
        }
    
        const isValidPassword = await compare(password, user.password);  // Direct comparison
    
        console.log("¿Contraseña válida?:", isValidPassword);
    
        if (!isValidPassword) {
            throw new Error("Invalid credentials");
        }
    
        const tokens = this.generateTokens(user.id, user.email);
    
        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            },
            tokens
        };
    }
    
    

    async refresh(refreshToken: string): Promise<TokenResponse> {
        try {
            const decoded = verify(refreshToken, this.JWT_REFRESH_SECRET) as any;
            const user = await this.userRepository.findOne({
                where: { id: decoded.id }
            });

            if (!user) {
                throw new Error("User not found");
            }

            return this.generateTokens(user.id, user.email);
        } catch (error) {
            throw new Error("Invalid refresh token");
        }
    }

    async getUserById(id: number): Promise<UserResponse | null> {
        const user = await this.userRepository.findOne({
            where: { id }
        });

        if (!user) return null;

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
    }
}
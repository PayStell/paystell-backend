import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { validateTwoFactorAuthentication } from "./validateTwoFactorAuthentication";
import AppDataSource from "../config/db";
import { User } from "../entities/User";
import { compare } from "bcryptjs";

export class AuthController {
    public authService: AuthService;

    constructor() {
        this.authService = new AuthService();
    }

    register = async (req: Request, res: Response): Promise<void> => {
        try {
            const user = await this.authService.register(req.body);
            res.status(201).json(user);
        } catch (error) {
            if (error instanceof Error) {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({ message: "Internal server error" });
            }
        }
    };

    login = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, password } = req.body;
    
            const user = await AppDataSource.getRepository(User)
                .createQueryBuilder("user")
                .leftJoinAndSelect("user.twoFactorAuth", "twoFactorAuth")
                .where("user.email = :email", { email })
                .getOne();
    
            if (!user) {
                res.status(401).json({ message: "Invalid email or password" });
                return;
            }
    
            const isPasswordValid = await compare(password, user.password);
            if (!isPasswordValid) {
                res.status(401).json({ message: "Invalid email or password" });
                return;
            }

            if (!user.twoFactorAuth || !user.twoFactorAuth.isEnabled) {
                const result = await this.authService.login(email, password);
                res.json(result);
            } else {
                res.status(403).json({ message: "2FA is enabled. Please use /login-2fa instead." });
            }
    
        } catch (error) {
            res.status(500).json({ message: error instanceof Error ? error.message : "Internal server error" });
        }
    };
    

    loginWith2FA = async (req: Request, res: Response): Promise<void> => {
        try {
            console.log("Body:", req.body);
            const { email, password, token } = req.body;

            console.log("Token:", token);

            const user = await AppDataSource.getRepository(User)
                .createQueryBuilder("user")
                .leftJoinAndSelect("user.twoFactorAuth", "twoFactorAuth")
                .where("user.email = :email", { email })
                .getOne();

            console.log("User:", user);

            if (!user) {
                res.status(401).json({ message: "Invalid email or password" });
                return;
            }

            const isPasswordValid = await compare(password, user.password);
            if (!isPasswordValid) {
                res.status(401).json({ message: "Invalid email or password" });
                return;
            }

            if (!user.twoFactorAuth || !user.twoFactorAuth.isEnabled) {
                res.status(400).json({ message: "2FA is not enabled for this account. Use /login instead." });
                return;
            }

            if (!token) {
                res.status(400).json({ message: "2FA is enabled, token is required" });
                return;
            }

            try {
                await validateTwoFactorAuthentication(user.id, token);
            } catch (error) {
                res.status(401).json({ message: error instanceof Error ? error.message : "Unknown error" });
                return;
            }

            const result = await this.authService.login(email, password);
            res.json(result);
        } catch (error) {
            res.status(500).json({ message: error instanceof Error ? error.message : "Internal server error" });
        }
    };


    refreshToken = async (req: Request, res: Response): Promise<void> => {
        try {
            const { refreshToken } = req.body;
            const result = await this.authService.refresh(refreshToken);
            res.json(result);
        } catch (error) {
            if (error instanceof Error) {
                res.status(401).json({ message: error.message });
            } else {
                res.status(500).json({ message: "Internal server error" });
            }
        }
    };

    getProfile = async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.user?.id) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
            
            const user = await this.authService.getUserById(req.user.id);
            res.json(user);
        } catch (error) {
            if (error instanceof Error) {
                res.status(500).json({ message: error.message });
            } else {
                res.status(500).json({ message: "Internal server error" });
            }
        }
    };
}
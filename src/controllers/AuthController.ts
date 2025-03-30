// File: src/controllers/AuthController.ts
import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { validateTwoFactorAuthentication } from "./validateTwoFactorAuthentication";
import AppDataSource from "../config/db";
import { User } from "../entities/User";
import { compare } from "bcryptjs";
import { Auth0Profile } from "src/interfaces/auth.interfaces";

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

        // Set refresh token in HTTP-only cookie
        res.cookie("refreshToken", result.tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          path: "/",
        });

        // Send access token in the response
        res.json({
          user: result.user,
          accessToken: result.tokens.accessToken,
          expiresIn: result.tokens.expiresIn,
        });
      } else {
        res
          .status(403)
          .json({ message: "2FA is enabled. Please use /login-2fa instead." });
      }
    } catch (error) {
      res.status(500).json({
        message:
          error instanceof Error ? error.message : "Internal server error",
      });
    }
  };

  loginWith2FA = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, token } = req.body;

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
        res.status(400).json({
          message: "2FA is not enabled for this account. Use /login instead.",
        });
        return;
      }

      if (!token) {
        res.status(400).json({ message: "2FA is enabled, token is required" });
        return;
      }

      try {
        await validateTwoFactorAuthentication(user.id, token);
      } catch (error) {
        res.status(401).json({
          message: error instanceof Error ? error.message : "Unknown error",
        });
        return;
      }

      const result = await this.authService.login(email, password);

      // Set refresh token in HTTP-only cookie
      res.cookie("refreshToken", result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/",
      });

      // Send access token in the response
      res.json({
        user: result.user,
        accessToken: result.tokens.accessToken,
        expiresIn: result.tokens.expiresIn,
      });
    } catch (error) {
      res.status(500).json({
        message:
          error instanceof Error ? error.message : "Internal server error",
      });
    }
  };

  auth0Callback = async (req: Request, res: Response): Promise<void> => {
    try {
      // req.user will contain Auth0 profile when using express-openid-connect

      if (!req.user) {
        res.status(401).json({ message: "Authentication failed" });
        return;
      }

      const auth0Profile: Auth0Profile = req.user;
      const result = await this.authService.loginWithAuth0(auth0Profile);

      // Set refresh token in HTTP-only cookie
      res.cookie("refreshToken", result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/",
      });

      // Redirect to frontend with access token
      const redirectUrl = new URL("http://localhost:3000");
      redirectUrl.searchParams.append("accessToken", result.tokens.accessToken);
      redirectUrl.searchParams.append(
        "expiresIn",
        result.tokens.expiresIn.toString(),
      );

      res.redirect(redirectUrl.toString());
    } catch (error) {
      res.status(500).json({
        message:
          error instanceof Error ? error.message : "Internal server error",
      });
    }
  };

  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get refresh token from cookie
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        res.status(401).json({ message: "No refresh token provided" });
        return;
      }

      const tokens = await this.authService.refresh(refreshToken);

      // Set new refresh token in cookie
      res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/",
      });

      // Send new access token
      res.json({
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      });
    } catch (error) {
      // Clear the invalid refresh token
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      if (error instanceof Error) {
        res.status(401).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get refresh token from cookie
      const refreshToken = req.cookies.refreshToken;
      console.log(req.cookies, "rrrr");

      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

      if (refreshToken) {
        // Revoke the refresh token
        await this.authService.invalidateRefreshToken(refreshToken);
      }

      if (accessToken) {
        await this.authService.invalidateAccessToken(accessToken);
      }

      // Clear the refresh token cookie
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({
        message:
          error instanceof Error ? error.message : "Internal server error",
      });
    }
  };
}

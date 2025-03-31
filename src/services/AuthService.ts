import { Repository } from "typeorm";
import { User } from "../entities/User";
import { compare } from "bcryptjs";
import { sign, verify, JwtPayload, SignOptions } from "jsonwebtoken";
import AppDataSource from "../config/db";
import { randomBytes, createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { redisClient } from "../config/redisConfig";
import {
  Auth0Profile,
  JWTPayload,
  LoginResponse,
  TokenResponse,
  UserRegistrationData,
  UserResponse,
} from "src/interfaces/auth.interfaces";

export class AuthService {
  private userRepository: Repository<User>;
  private readonly JWT_SECRET: string;
  private readonly JWT_REFRESH_SECRET: string;
  private readonly ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
  private readonly REFRESH_TOKEN_EXPIRY = "7d"; // 7 days

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
    this.JWT_REFRESH_SECRET =
      process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key";
  }

  private generateTokenId(): string {
    return uuidv4();
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private generateTokens(userId: number, email: string): TokenResponse {
    const jti = this.generateTokenId();

    // Calculate expires in seconds for client-side expiry handling
    const expiresIn = 15 * 60; // 15 minutes in seconds

    const accessTokenOptions: SignOptions = {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    };

    const refreshTokenOptions: SignOptions = {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    };

    const accessToken = sign(
      { id: userId, email, jti },
      this.JWT_SECRET,
      accessTokenOptions,
    );

    const refreshToken = sign(
      { id: userId, email, jti },
      this.JWT_REFRESH_SECRET,
      refreshTokenOptions,
    );

    return { accessToken, refreshToken, expiresIn };
  }

  private async storeRefreshToken(
    userId: number,
    jti: string,
    refreshToken: string,
  ): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);

    // Store the hashed token in Redis with expiration (7 days)
    // Key format: refresh_token:{userId}:{jti}
    await redisClient.set(
      `refresh_token:${userId}:${jti}`,
      tokenHash,
      { EX: 7 * 24 * 60 * 60 }, // 7 days in seconds
    );
  }

  private async blacklistToken(jti: string, expiresIn: number): Promise<void> {
    // Store in Redis blacklist until the token expires
    await redisClient.set(`blacklist:${jti}`, "revoked", { EX: expiresIn });
  }

  private async isTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await redisClient.get(`blacklist:${jti}`);
    return result === "revoked";
  }

  async register(userData: UserRegistrationData): Promise<UserResponse> {
    const userExists = await this.userRepository.findOne({
      where: { email: userData.email },
    });

    if (userExists) {
      throw new Error("Email already registered");
    }

    const user = this.userRepository.create(userData);
    const savedUser = await this.userRepository.save(user);

    return {
      id: savedUser.id,
      name: savedUser.name,
      email: savedUser.email,
      createdAt: savedUser.createdAt,
      updatedAt: savedUser.updatedAt,
    };
  }

  async findOrCreateAuth0User(auth0Profile: Auth0Profile): Promise<User> {
    // First try to find user by email
    let user = await this.userRepository.findOne({
      where: { email: auth0Profile.email },
    });

    if (!user) {
      // Create new user
      user = this.userRepository.create({
        email: auth0Profile.email,
        name:
          auth0Profile.name ||
          `${auth0Profile.given_name || ""} ${auth0Profile.family_name || ""}`.trim() ||
          auth0Profile.nickname ||
          auth0Profile.email.split("@")[0], // Use first and last names if available
        password: randomBytes(32).toString("hex"), // Generate a secure random password as Auth0 handles authentication
        isEmailVerified: true, // Auth0 verifies emails
      });

      await this.userRepository.save(user);
    }

    return user;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ["twoFactorAuth"],
    });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isValidPassword = await compare(password, user.password);
    if (!isValidPassword) {
      throw new Error("Invalid credentials");
    }

    const tokens = this.generateTokens(user.id, user.email);

    // Store refresh token
    const decoded = verify(
      tokens.refreshToken,
      this.JWT_REFRESH_SECRET,
    ) as JWTPayload;
    await this.storeRefreshToken(user.id, decoded.jti!, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        twoFactorAuth: user.twoFactorAuth
          ? { isEnabled: user.twoFactorAuth.isEnabled }
          : undefined,
      },
      tokens,
    };
  }

  async loginWithAuth0(auth0Profile: Auth0Profile): Promise<LoginResponse> {
    const user = await this.findOrCreateAuth0User(auth0Profile);

    const tokens = this.generateTokens(user.id, user.email);

    // Store refresh token
    const decoded = verify(
      tokens.refreshToken,
      this.JWT_REFRESH_SECRET,
    ) as JWTPayload;
    await this.storeRefreshToken(user.id, decoded.jti!, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        twoFactorAuth: user.twoFactorAuth
          ? { isEnabled: user.twoFactorAuth.isEnabled }
          : undefined,
      },
      tokens,
    };
  }

  async refresh(refreshToken: string): Promise<TokenResponse> {
    try {
      // Verify the refresh token
      const decoded = verify(
        refreshToken,
        this.JWT_REFRESH_SECRET,
      ) as JWTPayload;

      if (!decoded.jti) {
        throw new Error("Invalid token format");
      }

      // Check if token is blacklisted
      if (await this.isTokenBlacklisted(decoded.jti)) {
        throw new Error("Token has been revoked");
      }

      // Find the user
      const user = await this.userRepository.findOne({
        where: { id: decoded.id },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Verify token exists in Redis (was issued by us)
      const tokenHash = this.hashToken(refreshToken);
      const storedHash = await redisClient.get(
        `refresh_token:${decoded.id}:${decoded.jti}`,
      );

      if (!storedHash || storedHash !== tokenHash) {
        throw new Error("Invalid refresh token");
      }

      // Delete the old refresh token (one-time use)
      await redisClient.del(`refresh_token:${decoded.id}:${decoded.jti}`);

      // Blacklist the old jwt ID
      const tokenExp = decoded.exp || 0;
      const currentTime = Math.floor(Date.now() / 1000);
      const remainingTime = Math.max(0, tokenExp - currentTime);
      await this.blacklistToken(decoded.jti, remainingTime);

      // Generate new tokens
      const tokens = this.generateTokens(user.id, user.email);

      // Store new refresh token
      const newDecoded = verify(
        tokens.refreshToken,
        this.JWT_REFRESH_SECRET,
      ) as JWTPayload;
      await this.storeRefreshToken(
        user.id,
        newDecoded.jti!,
        tokens.refreshToken,
      );

      return tokens;
    } catch (error) {
      console.error("Token refresh error:", error);
      throw new Error("Invalid refresh token");
    }
  }

  async getUserById(id: number): Promise<UserResponse | null> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ["twoFactorAuth"],
    });

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      twoFactorAuth: user.twoFactorAuth
        ? { isEnabled: user.twoFactorAuth.isEnabled }
        : undefined,
    };
  }

  async invalidateRefreshToken(refreshToken: string): Promise<void> {
    try {
      const decoded = verify(
        refreshToken,
        this.JWT_REFRESH_SECRET,
      ) as JWTPayload;

      if (!decoded.jti) {
        return; // Invalid token, nothing to do
      }

      // Remove from active tokens
      await redisClient.del(`refresh_token:${decoded.id}:${decoded.jti}`);

      // Add to blacklist until expiration
      const tokenExp = decoded.exp || 0;
      const currentTime = Math.floor(Date.now() / 1000);
      const remainingTime = Math.max(0, tokenExp - currentTime);
      console.log(decoded.jti, " 4444");
      console.log(remainingTime, " cvvcc");
      await this.blacklistToken(decoded.jti, remainingTime);
    } catch (error) {
      // Token is invalid, nothing to do
      console.error("Error in logout:", error);
    }
  }

  async invalidateAccessToken(accessToken: string): Promise<void> {
    // Blacklist the access token until it expires
    try {
      const decoded = verify(
        accessToken,
        process.env.JWT_SECRET || "your-secret-key",
      ) as JwtPayload;

      if (decoded.jti) {
        // Calculate remaining time until token expiration
        const currentTime = Math.floor(Date.now() / 1000);
        const expiryTime = decoded.exp || currentTime;
        const remainingTime = Math.max(0, expiryTime - currentTime);

        // Add to blacklist for the remaining lifetime of the token
        await this.blacklistToken(decoded.jti, remainingTime);
      }
    } catch (error) {
      // Token is invalid or already expired, nothing to do
      console.log("Error invalidating access token:", error);
    }
  }

  async revokeAllUserSessions(userId: number): Promise<void> {
    // Get all refresh tokens for this user
    const tokenKeys = await redisClient.keys(`refresh_token:${userId}:*`);

    // For each token, add jti to blacklist and remove from active tokens
    for (const key of tokenKeys) {
      // Extract jti from key (refresh_token:userId:jti)
      const jti = key.split(":")[2];

      // Add to blacklist (1 week to be safe)
      await this.blacklistToken(jti, 7 * 24 * 60 * 60);

      // Remove from active tokens
      await redisClient.del(key);
    }
  }
}

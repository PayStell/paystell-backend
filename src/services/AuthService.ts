import { Repository } from "typeorm";
import { User } from "../entities/User";
import { compare } from "bcryptjs";
import { sign, verify, SignOptions } from "jsonwebtoken";
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
  private readonly ACCESS_TOKEN_EXPIRY = "15m";
  private readonly REFRESH_TOKEN_EXPIRY = "7d";

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
    const expiresIn = 15 * 60;

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
    await redisClient.set(`refresh_token:${userId}:${jti}`, tokenHash, {
      EX: 7 * 24 * 60 * 60,
    });
  }

  private async blacklistToken(jti: string, expiresIn: number): Promise<void> {
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
    if (userExists) throw new Error("User with this email already exists");

    const user = this.userRepository.create(userData);
    const savedUser = await this.userRepository.save(user);

    return {
      id: savedUser.id,
      email: savedUser.email,
      name: savedUser.name,
      role: savedUser.role,
      isEmailVerified: savedUser.isEmailVerified,
      isWalletVerified: savedUser.isWalletVerified,
      createdAt: savedUser.createdAt,
      updatedAt: savedUser.updatedAt,
    };
  }

  async findOrCreateAuth0User(auth0Profile: Auth0Profile): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { email: auth0Profile.email },
    });

    if (!user) {
      user = this.userRepository.create({
        email: auth0Profile.email,
        name:
          auth0Profile.name ||
          `${auth0Profile.given_name || ""} ${auth0Profile.family_name || ""}`.trim() ||
          auth0Profile.nickname ||
          auth0Profile.email.split("@")[0],
        password: randomBytes(32).toString("hex"),
        isEmailVerified: true,
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
    if (!user) throw new Error("Invalid credentials");

    const isValidPassword = await compare(password, user.password);
    if (!isValidPassword) throw new Error("Invalid credentials");

    const tokens = this.generateTokens(user.id, user.email);
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
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isWalletVerified: user.isWalletVerified,
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
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isWalletVerified: user.isWalletVerified,
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
      const decoded = verify(
        refreshToken,
        this.JWT_REFRESH_SECRET,
      ) as JWTPayload;

      if (!decoded.jti) throw new Error("Invalid token format");

      if (await this.isTokenBlacklisted(decoded.jti))
        throw new Error("Token has been revoked");

      const user = await this.userRepository.findOne({
        where: { id: decoded.id },
      });
      if (!user) throw new Error("User not found");

      const tokenHash = this.hashToken(refreshToken);
      const storedHash = await redisClient.get(
        `refresh_token:${decoded.id}:${decoded.jti}`,
      );
      if (!storedHash || storedHash !== tokenHash)
        throw new Error("Invalid refresh token");

      await redisClient.del(`refresh_token:${decoded.id}:${decoded.jti}`);

      if (decoded.exp && decoded.iat) {
        const expiresIn = decoded.exp - decoded.iat;
        await this.blacklistToken(decoded.jti, expiresIn);
      }

      const newTokens = this.generateTokens(user.id, user.email);
      const newDecoded = verify(
        newTokens.refreshToken,
        this.JWT_REFRESH_SECRET,
      ) as JWTPayload;
      await this.storeRefreshToken(
        user.id,
        newDecoded.jti!,
        newTokens.refreshToken,
      );

      return newTokens;
    } catch (error) {
      throw new Error("Error refreshing token: " + (error as Error).message);
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const decoded = verify(
        refreshToken,
        this.JWT_REFRESH_SECRET,
      ) as JWTPayload;

      if (!decoded.jti) throw new Error("Invalid token format");

      await redisClient.del(`refresh_token:${decoded.id}:${decoded.jti}`);

      if (decoded.exp && decoded.iat) {
        const expiresIn = decoded.exp - decoded.iat;
        await this.blacklistToken(decoded.jti, expiresIn);
      }
    } catch (error) {
      console.log("Error invalidating access token:", error);
    }
  }

  async revokeAllUserSessions(userId: number): Promise<void> {
    const tokenKeys = await redisClient.keys(`refresh_token:${userId}:*`);

    for (const key of tokenKeys) {
      const jti = key.split(":")[2];
      await this.blacklistToken(jti, 7 * 24 * 60 * 60);
      await redisClient.del(key);
    }
  }
}

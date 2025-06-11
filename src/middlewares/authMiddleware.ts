import { Request, Response, NextFunction } from "express";
import {
  verify,
  TokenExpiredError,
  JsonWebTokenError,
  JwtPayload,
} from "jsonwebtoken";
import { UserRole } from "../enums/UserRole";
import { UserService } from "../services/UserService";
import { redisClient } from "../config/redisConfig";

declare module "express" {
  interface Request {
    user?: {
      id: number;
      email: string;
      tokenExp?: number;
      jti?: string;
      role?: UserRole;
    };
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      status: "error",
      message: "No token provided",
      code: "NO_TOKEN",
    });
    return;
  }

  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      status: "error",
      message: "Invalid token format",
      code: "INVALID_FORMAT",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    ) as JwtPayload;

    if (!decoded.jti) {
      res.status(401).json({
        status: "error",
        message: "Invalid token format",
        code: "INVALID_FORMAT",
      });
      return;
    }

    // Check if token is blacklisted
    const isBlacklisted = await redisClient.get(`blacklist:${decoded.jti}`);
    if (isBlacklisted) {
      res.status(401).json({
        status: "error",
        message: "Token is no longer valid",
        code: "TOKEN_REVOKED",
      });
      return;
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      tokenExp: decoded.exp,
      jti: decoded.jti,
    };

    const tokenExp = decoded.exp || 0;
    const now = Math.floor(Date.now() / 1000);
    if (tokenExp - now < 300) {
      res.setHeader("X-Token-Expiring", "true");
      res.setHeader("X-Token-Expires-In", String(tokenExp - now));
    }

    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      res.status(401).json({
        status: "error",
        message: "Token has expired",
        code: "TOKEN_EXPIRED",
      });
    } else if (error instanceof JsonWebTokenError) {
      res.status(401).json({
        status: "error",
        message: "Invalid token",
        code: "INVALID_TOKEN",
      });
    } else {
      res.status(401).json({
        status: "error",
        message: "Token validation failed",
        code: "TOKEN_VALIDATION_FAILED",
      });
    }
  }
};

export const refreshTokenMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        status: "error",
        message: "No refresh token provided",
        code: "NO_REFRESH_TOKEN",
      });
      return;
    }

    // Verify the refresh token
    const decoded = verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",
    ) as JwtPayload;

    // Check if token has jti
    if (!decoded.jti) {
      res.status(401).json({
        status: "error",
        message: "Invalid token format",
        code: "INVALID_FORMAT",
      });
      return;
    }

    // Check if token is blacklisted
    const isBlacklisted = await redisClient.get(`blacklist:${decoded.jti}`);
    if (isBlacklisted) {
      res.status(401).json({
        status: "error",
        message: "Refresh token is no longer valid",
        code: "TOKEN_REVOKED",
      });

      // Clear the invalid cookie
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/v1/auth/refresh-token",
      });

      return;
    }

    // Add user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      tokenExp: decoded.exp,
      jti: decoded.jti,
    };

    next();
  } catch (error) {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/v1/auth/refresh-token",
    });

    if (error instanceof TokenExpiredError) {
      res.status(401).json({
        status: "error",
        message: "Refresh token has expired. Please log in again.",
        code: "REFRESH_TOKEN_EXPIRED",
      });
    } else if (error instanceof JsonWebTokenError) {
      res.status(401).json({
        status: "error",
        message: "Invalid refresh token",
        code: "INVALID_REFRESH_TOKEN",
      });
    } else {
      res.status(401).json({
        status: "error",
        message: "Authentication failed",
        code: "AUTH_FAILED",
      });
    }
  }
};

export const isUserAuthorized = (roles: UserRole | UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        status: "error",
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
      return;
    }

    const userService = new UserService();
    const user = await userService.getUserById(req.user.id);
    if (!user) {
      res.status(401).json({
        status: "error",
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
      return;
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (user.role && allowedRoles.includes(user.role)) {
      next();
    } else {
      res.status(403).json({
        status: "error",
        message: "Insufficient permissions",
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }
  };
};

import { Request, Response, NextFunction } from "express";
import {
  verify,
  TokenExpiredError,
  JsonWebTokenError,
  JwtPayload,
} from "jsonwebtoken";
import { UserRole } from "../enums/UserRole";
import { UserService } from "../services/UserService";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        tokenExp?: number;
        role?: UserRole;
      };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
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
      process.env.JWT_SECRET || "your-secret-key"
    ) as JwtPayload;

    req.user = {
      id: decoded.id,
      email: decoded.email,
      tokenExp: decoded.exp
    };

    // Token expiration warning (5 minutes before expiration)
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

export const isUserAuthorized = (roles: UserRole | UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Ensure user is authenticated first
    if (!req.user || !req.user.id) {
      res.status(401).json({
        status: "error",
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
      return;
    }

    // Get user role from req.user (you may need to adjust this depending on how your user object is structured)
    const userService = new UserService();
    const user = await userService.getUserById(req?.user?.id);
    if (!user) {
      res.status(401).json({
        status: "error",
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
      return;
    }
    const userRole = user.role;

    // Check if user has the required role
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (userRole && allowedRoles.includes(userRole)) {
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

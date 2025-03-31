import { Request, Response, NextFunction } from "express";
import SessionService from "../services/session.service";

export const sessionMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const session = await SessionService.getSessionByToken(token); // Get session

  if (!session || session.expiresAt < new Date()) {
    if (session) await SessionService.deleteSession(token); // Delete expired session
    return res
      .status(401)
      .json({ message: "Unauthorized: Invalid or expired session" });
  }

  req.user = session.user; // Attach user data to the request
  next();
};

import express, { Response, NextFunction, RequestHandler } from "express";
import { Request } from "express-serve-static-core";
import {
  createSession,
  deleteSession,
} from "../controllers/session.controller";
import { UserRole } from "../enums/UserRole";

const router = express.Router();

interface CustomRequest extends Request {
  user?: {
    id: number;
    email: string;
    tokenExp?: number;
    role?: UserRole;
  };
}

const asyncHandler = (
  fn: (
    req: CustomRequest,
    res: Response,
    next: NextFunction,
  ) => Promise<unknown>,
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req as CustomRequest, res, next)).catch(next);
  };
};

router.post("/", asyncHandler(createSession));
router.delete("/", asyncHandler(deleteSession));

export default router;

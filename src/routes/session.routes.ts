import express, { Response, NextFunction, RequestHandler } from "express";
import { Request } from "express-serve-static-core";
import {
  createSession,
  deleteSession,
} from "../controllers/session.controller";
import { UserRole } from "../enums/UserRole";
// Request interface extensions are now handled in src/types/express.d.ts

const router = express.Router();

const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req as Request, res, next)).catch(next);
  };
};

router.post("/", asyncHandler(createSession));
router.delete("/", asyncHandler(deleteSession));

export default router;

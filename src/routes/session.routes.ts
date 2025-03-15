import express, { Request, Response, NextFunction } from "express";
import { createSession, deleteSession } from "../controllers/session.controller";

const router = express.Router();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

router.post("/", asyncHandler(createSession));
router.delete("/", asyncHandler(deleteSession));

export default router;
import { User } from "../entities/User";

declare module "express-serve-static-core" {
  interface Request {
    user?: Partial<User>;
    validatedIp?: string;
    tokenExp?: number;
  }
}

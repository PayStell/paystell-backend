import { Request, Response, NextFunction } from "express";
import { redisClient } from "../config/redisConfig";

export const cacheMiddleware = (keyPrefix: string) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const key = `${keyPrefix}:${req.originalUrl}`;
    try {
      const cachedData = await redisClient.get(key);

      if (cachedData) {
        console.log("Data retrieved from cache:", key);
        res.locals.cachedData = JSON.parse(cachedData);
        res.json(res.locals.cachedData);
        return;
      }

      console.log("Data not found in cache, proceeding with request");
      res.locals.cacheKey = key;
      next();
    } catch (err) {
      console.error("Error retrieving data from cache:", err);
      next();
    }
  };
};

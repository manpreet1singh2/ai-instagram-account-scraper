// authenticate.ts
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../controllers/auth.controller";
import { AppError } from "../utils/AppError";
import { cache } from "../config/redis";

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new AppError("Authentication required", 401);
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    // Check session cache
    const session = await cache.get(`session:${payload.userId}`);
    if (!session) {
      // Session expired — still allow if token is valid (stateless fallback)
    }

    (req as any).user = payload;
    next();
  } catch (error: any) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      next(new AppError("Invalid or expired token", 401));
    } else {
      next(error);
    }
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      return next(new AppError("Insufficient permissions", 403));
    }
    next();
  };
};

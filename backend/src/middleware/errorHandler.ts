import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { logger } from "../config/logger";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }

  // Prisma unique constraint
  if ((err as any).code === "P2002") {
    return res.status(409).json({ success: false, error: "Resource already exists" });
  }

  // Prisma not found
  if ((err as any).code === "P2025") {
    return res.status(404).json({ success: false, error: "Resource not found" });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, error: "Invalid token" });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, error: "Token expired" });
  }

  logger.error("Unhandled error", { error: err.message, stack: err.stack, path: req.path, method: req.method });
  res.status(500).json({ success: false, error: "Internal server error" });
};

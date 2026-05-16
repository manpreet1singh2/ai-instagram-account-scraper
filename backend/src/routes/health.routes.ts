import { Router } from "express";
import { prisma } from "../config/database";
import { getRedisClient } from "../config/redis";

const router = Router();

router.get("/", async (req, res) => {
  const health: any = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    environment: process.env.NODE_ENV,
    services: {},
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = "connected";
  } catch {
    health.services.database = "disconnected";
    health.status = "degraded";
  }

  try {
    const redis = getRedisClient();
    await redis.ping();
    health.services.redis = "connected";
  } catch {
    health.services.redis = "disconnected";
    health.status = "degraded";
  }

  const statusCode = health.status === "healthy" ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;

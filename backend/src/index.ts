import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { createServer } from "http";

import { logger } from "./config/logger";
import { connectDatabase } from "./config/database";
import { connectRedis } from "./config/redis";
import { initializeQueues } from "./jobs/queueManager";
import { rateLimiter } from "./middleware/rateLimiter";
import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/notFoundHandler";

// Routes
import authRoutes from "./routes/auth.routes";
import discoveryRoutes from "./routes/discovery.routes";
import profileRoutes from "./routes/profile.routes";
import analyticsRoutes from "./routes/analytics.routes";
import leadRoutes from "./routes/lead.routes";
import exportRoutes from "./routes/export.routes";
import webhookRoutes from "./routes/webhook.routes";
import healthRoutes from "./routes/health.routes";

const app = express();
const httpServer = createServer(app);

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  })
);

// ─── General Middleware ───────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.http(message.trim()) },
    skip: (req) => req.url === "/api/health",
  })
);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use("/api/", rateLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/discovery", discoveryRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/webhooks", webhookRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Server Bootstrap ─────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "5000", 10);

async function bootstrap() {
  try {
    // Connect to database
    await connectDatabase();
    logger.info("✅ Database connected");

    // Connect to Redis
    await connectRedis();
    logger.info("✅ Redis connected");

    // Initialize job queues
    await initializeQueues();
    logger.info("✅ Job queues initialized");

    // Start server
    httpServer.listen(PORT, "0.0.0.0", () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📋 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 API Base: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  httpServer.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received. Shutting down gracefully...");
  process.exit(0);
});

bootstrap();

export default app;

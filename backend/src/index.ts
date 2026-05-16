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

import authRoutes     from "./routes/auth.routes";
import discoveryRoutes from "./routes/discovery.routes";
import profileRoutes  from "./routes/profile.routes";
import analyticsRoutes from "./routes/analytics.routes";
import leadRoutes     from "./routes/lead.routes";
import exportRoutes   from "./routes/export.routes";
import webhookRoutes  from "./routes/webhook.routes";
import healthRoutes   from "./routes/health.routes";

const app = express();
const httpServer = createServer(app);

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (process.env.CORS_ORIGIN || "http://localhost:3000").split(","),
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","X-API-Key"],
}));

// General middleware
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("combined", {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip: (req) => req.url === "/api/health",
}));

// Rate limiting
app.use("/api/", rateLimiter);

// Routes
app.use("/api/health",    healthRoutes);
app.use("/api/auth",      authRoutes);
app.use("/api/discovery", discoveryRoutes);
app.use("/api/profiles",  profileRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/leads",     leadRoutes);
app.use("/api/export",    exportRoutes);
app.use("/api/webhooks",  webhookRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = parseInt(process.env.PORT || "5000", 10);

async function bootstrap() {
  try {
    await connectDatabase();
    logger.info("✅ Database connected");

    await connectRedis();
    logger.info("✅ Redis connected");

    await initializeQueues();
    logger.info("✅ Job queues initialized");

    httpServer.listen(PORT, "0.0.0.0", () => {
      logger.info(`🚀 Server → http://localhost:${PORT}`);
      logger.info(`📋 ENV: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error("❌ Startup failed:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => { httpServer.close(() => process.exit(0)); });
process.on("SIGINT",  () => process.exit(0));

bootstrap();
export default app;

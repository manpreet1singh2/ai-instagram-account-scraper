// profile.routes.ts
import { Router as ProfileRouter } from "express";
import { prisma } from "../config/database";
import { authenticate } from "../middleware/authenticate";
import { analysisQueue } from "../jobs/queueManager";
import { AppError } from "../utils/AppError";

const profileRouter = ProfileRouter();
profileRouter.use(authenticate);

profileRouter.get("/", async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const { page = 1, limit = 50, sortBy = "leadScore", order = "desc", niche, tier } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { discoveryJob: { userId } };
    if (niche) where.niche = { contains: String(niche), mode: "insensitive" };
    if (tier) where.leadTier = tier;

    const [profiles, total] = await Promise.all([
      prisma.profile.findMany({ where, orderBy: { [String(sortBy)]: order }, skip, take: Number(limit) }),
      prisma.profile.count({ where }),
    ]);
    res.json({ success: true, data: { profiles, total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
  } catch (e) { next(e); }
});

profileRouter.get("/:id", async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.params.id },
      include: { posts: { orderBy: { postedAt: "desc" }, take: 12 } },
    });
    if (!profile) throw new AppError("Profile not found", 404);
    res.json({ success: true, data: profile });
  } catch (e) { next(e); }
});

profileRouter.post("/:id/analyze", async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { id: req.params.id }, include: { posts: true } });
    if (!profile) throw new AppError("Profile not found", 404);
    await analysisQueue.add("ai-analysis", {
      profileId: profile.id, username: profile.username,
      bio: profile.bio, recentCaptions: profile.posts.map((p) => p.caption).filter(Boolean),
      topHashtags: [],
    });
    res.json({ success: true, message: "AI analysis queued" });
  } catch (e) { next(e); }
});

export { profileRouter };

// analytics.routes.ts
import { Router as AnalyticsRouter } from "express";
import * as analyticsController from "../controllers/analytics.controller";

const analyticsRouter = AnalyticsRouter();
analyticsRouter.use(authenticate);
analyticsRouter.get("/overview", analyticsController.getOverview);
analyticsRouter.get("/trends", analyticsController.getTrends);
analyticsRouter.get("/niches", analyticsController.getNicheDistribution);
export { analyticsRouter };

// lead.routes.ts
import { Router as LeadRouter } from "express";
const leadRouter = LeadRouter();
leadRouter.use(authenticate);

leadRouter.get("/", async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const { page = 1, limit = 50, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { userId };
    if (status) where.status = status;
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({ where, skip, take: Number(limit), include: { profile: true }, orderBy: { score: "desc" } }),
      prisma.lead.count({ where }),
    ]);
    res.json({ success: true, data: { leads, total } });
  } catch (e) { next(e); }
});

leadRouter.post("/", async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const { profileId, notes, tags } = req.body;
    const lead = await prisma.lead.upsert({
      where: { userId_profileId: { userId, profileId } },
      create: { userId, profileId, notes, tags: tags || [] },
      update: { notes, tags: tags || [] },
      include: { profile: true },
    });
    res.status(201).json({ success: true, data: lead });
  } catch (e) { next(e); }
});

leadRouter.patch("/:id", async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const lead = await prisma.lead.findFirst({ where: { id: req.params.id, userId } });
    if (!lead) throw new AppError("Lead not found", 404);
    const updated = await prisma.lead.update({ where: { id: req.params.id }, data: req.body, include: { profile: true } });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
});

export { leadRouter };

// export.routes.ts
import { Router as ExportRouter } from "express";
import path from "path";
import fs from "fs";
const exportRouter = ExportRouter();
exportRouter.use(authenticate);

exportRouter.post("/", async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const { format = "CSV", filters } = req.body;
    const exportJob = await prisma.exportJob.create({ data: { userId, format, filters, status: "PENDING" } });
    const { exportQueue } = await import("../jobs/queueManager");
    await exportQueue.add("export", { exportJobId: exportJob.id, userId, format, filters });
    res.status(201).json({ success: true, data: exportJob });
  } catch (e) { next(e); }
});

exportRouter.get("/jobs", async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const jobs = await prisma.exportJob.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 });
    res.json({ success: true, data: jobs });
  } catch (e) { next(e); }
});

exportRouter.get("/download/:filename", (req, res, next) => {
  try {
    const filename = req.params.filename;
    if (filename.includes("..")) throw new AppError("Invalid filename", 400);
    const filePath = path.join(process.env.EXPORT_DIR || "./exports", filename);
    if (!fs.existsSync(filePath)) throw new AppError("File not found or expired", 404);
    res.download(filePath);
  } catch (e) { next(e); }
});

export { exportRouter };

// webhook.routes.ts
import { Router as WebhookRouter } from "express";
const webhookRouter = WebhookRouter();
webhookRouter.post("/zapier", async (req, res) => {
  res.json({ success: true, message: "Webhook received", data: req.body });
});
export { webhookRouter };

// health.routes.ts
import { Router as HealthRouter } from "express";
const healthRouter = HealthRouter();
healthRouter.get("/", async (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString(), version: "1.0.0" });
});
export { healthRouter };

import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";

// ─── Profile Controller ───────────────────────────────────────────────────────

export const listProfiles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const {
      page = 1, limit = 50,
      sortBy = "leadScore", order = "desc",
      tier, niche, minFollowers, maxFollowers,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { discoveryJob: { userId } };
    if (tier) where.leadTier = tier;
    if (niche) where.niche = { contains: String(niche), mode: "insensitive" };
    if (minFollowers || maxFollowers) {
      where.followersCount = {};
      if (minFollowers) where.followersCount.gte = Number(minFollowers);
      if (maxFollowers) where.followersCount.lte = Number(maxFollowers);
    }

    const validSortFields = ["leadScore", "followersCount", "engagementRate", "createdAt", "postFrequency"];
    const sortField = validSortFields.includes(String(sortBy)) ? String(sortBy) : "leadScore";

    const [profiles, total] = await Promise.all([
      prisma.profile.findMany({
        where,
        orderBy: { [sortField]: order === "asc" ? "asc" : "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.profile.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        profiles,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const profile = await prisma.profile.findUnique({
      where: { id },
      include: {
        posts: { orderBy: { postedAt: "desc" }, take: 12 },
        _count: { select: { posts: true, leads: true } },
      },
    });

    if (!profile) throw new AppError("Profile not found", 404);

    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { notes, leadScore, leadTier } = req.body;

    const profile = await prisma.profile.update({
      where: { id },
      data: {
        ...(leadScore !== undefined && { leadScore }),
        ...(leadTier && { leadTier }),
      },
    });

    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

// ─── Lead Controller ──────────────────────────────────────────────────────────

export const listLeads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const { page = 1, limit = 50, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { userId };
    if (status) where.status = status;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: Number(limit),
        include: { profile: true },
        orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({ success: true, data: { leads, total } });
  } catch (error) {
    next(error);
  }
};

export const createLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const { profileId, notes, tags = [] } = req.body;

    const profile = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile) throw new AppError("Profile not found", 404);

    const lead = await prisma.lead.upsert({
      where: { userId_profileId: { userId, profileId } },
      create: { userId, profileId, notes, tags, score: profile.leadScore },
      update: { notes, tags },
      include: { profile: true },
    });

    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
};

export const updateLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { status, notes, tags, score } = req.body;

    const existing = await prisma.lead.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError("Lead not found", 404);

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        ...(tags && { tags }),
        ...(score !== undefined && { score }),
      },
      include: { profile: true },
    });

    res.json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
};

export const deleteLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;

    const existing = await prisma.lead.findFirst({ where: { id, userId } });
    if (!existing) throw new AppError("Lead not found", 404);

    await prisma.lead.delete({ where: { id } });
    res.json({ success: true, message: "Lead removed" });
  } catch (error) {
    next(error);
  }
};

// ─── Export Controller ────────────────────────────────────────────────────────

export const createExportJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const { format = "CSV", filters } = req.body;

    const validFormats = ["CSV", "EXCEL", "JSON"];
    if (!validFormats.includes(format)) {
      throw new AppError("Invalid format. Use CSV, EXCEL, or JSON", 400);
    }

    const exportJob = await prisma.exportJob.create({
      data: { userId, format, filters: filters || {}, status: "PENDING" },
    });

    // Enqueue export job
    const { exportQueue } = await import("../jobs/queueManager");
    await exportQueue.add(
      "export",
      { exportJobId: exportJob.id, userId, format, filters },
      { attempts: 2, removeOnComplete: false }
    );

    res.status(201).json({ success: true, data: exportJob });
  } catch (error) {
    next(error);
  }
};

export const getExportJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const jobs = await prisma.exportJob.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json({ success: true, data: jobs });
  } catch (error) {
    next(error);
  }
};

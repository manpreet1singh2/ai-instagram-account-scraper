import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { AppError } from "../utils/AppError";
import { discoveryQueue } from "../jobs/queueManager";
import { cache } from "../config/redis";

export const startDiscovery = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const {
      keywords = [],
      hashtags = [],
      minFollowers = 1000,
      maxFollowers = 100000,
      minEngagement = 0,
      niches = [],
      languages = [],
      locations = [],
    } = req.body;

    // Check quota
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 404);
    if (user.usedQuota >= user.monthlyQuota) {
      throw new AppError("Monthly discovery quota exceeded. Please upgrade your plan.", 429);
    }

    // Create discovery job
    const job = await prisma.discoveryJob.create({
      data: {
        userId,
        keywords,
        hashtags,
        minFollowers,
        maxFollowers,
        minEngagement,
        niches,
        languages,
        locations,
        status: "PENDING",
      },
    });

    // Enqueue job for processing
    await discoveryQueue.add(
      "discovery",
      { jobId: job.id, userId, params: req.body },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: false,
        removeOnFail: false,
      }
    );

    logger.info("Discovery job created", { jobId: job.id, userId });

    res.status(201).json({
      success: true,
      data: { job },
      message: "Discovery job started successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getDiscoveryJobs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const { page = 1, limit = 20, status } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { userId };
    if (status) where.status = status;

    const [jobs, total] = await Promise.all([
      prisma.discoveryJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
        include: { _count: { select: { profiles: true } } },
      }),
      prisma.discoveryJob.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getJobStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    // Try cache first
    const cached = await cache.get<any>(`job:${id}`);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const job = await prisma.discoveryJob.findFirst({
      where: { id, userId },
      include: {
        _count: { select: { profiles: true } },
      },
    });

    if (!job) throw new AppError("Job not found", 404);

    // Cache for 10 seconds if still running
    if (job.status === "RUNNING") {
      await cache.set(`job:${id}`, job, 10);
    }

    res.json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};

export const cancelJob = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const job = await prisma.discoveryJob.findFirst({
      where: { id, userId },
    });

    if (!job) throw new AppError("Job not found", 404);
    if (job.status === "COMPLETED" || job.status === "FAILED") {
      throw new AppError("Cannot cancel a completed or failed job", 400);
    }

    await prisma.discoveryJob.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    res.json({ success: true, message: "Job cancelled successfully" });
  } catch (error) {
    next(error);
  }
};

export const getDiscoveryResults = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.userId;
    const {
      jobId,
      page = 1,
      limit = 50,
      minScore,
      maxFollowers,
      minFollowers,
      niche,
      sortBy = "leadScore",
      sortOrder = "desc",
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build filter
    const where: any = { discoveryJob: { userId } };
    if (jobId) where.discoveryJobId = jobId;
    if (minScore) where.leadScore = { gte: Number(minScore) };
    if (maxFollowers || minFollowers) {
      where.followersCount = {};
      if (minFollowers) where.followersCount.gte = Number(minFollowers);
      if (maxFollowers) where.followersCount.lte = Number(maxFollowers);
    }
    if (niche) where.niche = { contains: String(niche), mode: "insensitive" };

    const validSortFields = ["leadScore", "followersCount", "engagementRate", "createdAt"];
    const sortField = validSortFields.includes(String(sortBy)) ? String(sortBy) : "leadScore";

    const [profiles, total] = await Promise.all([
      prisma.profile.findMany({
        where,
        orderBy: { [sortField]: sortOrder === "asc" ? "asc" : "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.profile.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        profiles,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

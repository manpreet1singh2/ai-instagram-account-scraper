import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { cache } from "../config/redis";

export const getOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const cacheKey = `analytics:overview:${userId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const [
      totalProfiles, totalLeads, qualifiedLeads,
      activeJobs, user, recentProfiles
    ] = await Promise.all([
      prisma.profile.count({ where: { discoveryJob: { userId } } }),
      prisma.lead.count({ where: { userId } }),
      prisma.lead.count({ where: { userId, status: "QUALIFIED" } }),
      prisma.discoveryJob.count({ where: { userId, status: { in: ["PENDING", "RUNNING"] } } }),
      prisma.user.findUnique({ where: { id: userId }, select: { monthlyQuota: true, usedQuota: true } }),
      prisma.profile.findMany({
        where: { discoveryJob: { userId } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { username: true, fullName: true, followersCount: true, leadScore: true, leadTier: true, niche: true },
      }),
    ]);

    const tierCounts = await prisma.profile.groupBy({
      by: ["leadTier"],
      where: { discoveryJob: { userId } },
      _count: { leadTier: true },
    });

    const nicheCounts = await prisma.profile.groupBy({
      by: ["niche"],
      where: { discoveryJob: { userId }, niche: { not: null } },
      _count: { niche: true },
      orderBy: { _count: { niche: "desc" } },
      take: 10,
    });

    const avgStats = await prisma.profile.aggregate({
      where: { discoveryJob: { userId } },
      _avg: { engagementRate: true, leadScore: true, followersCount: true },
    });

    const data = {
      totals: { profiles: totalProfiles, leads: totalLeads, qualifiedLeads, activeJobs },
      quota: user ? { used: user.usedQuota, total: user.monthlyQuota, percentage: Math.round((user.usedQuota / user.monthlyQuota) * 100) } : null,
      averages: {
        engagementRate: avgStats._avg.engagementRate?.toFixed(2) || "0",
        leadScore: Math.round(avgStats._avg.leadScore || 0),
        followers: Math.round(avgStats._avg.followersCount || 0),
      },
      tierDistribution: tierCounts.map((t) => ({ tier: t.leadTier, count: t._count.leadTier })),
      topNiches: nicheCounts.map((n) => ({ niche: n.niche, count: n._count.niche })),
      recentProfiles,
    };

    await cache.set(cacheKey, data, 300); // Cache 5 min
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getTrends = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const dailyDiscoveries = await prisma.$queryRaw<any[]>`
      SELECT 
        DATE(p."createdAt") as date,
        COUNT(*) as count,
        AVG(p."leadScore") as avg_score,
        AVG(p."engagementRate") as avg_engagement
      FROM profiles p
      JOIN discovery_jobs dj ON p."discoveryJobId" = dj.id
      WHERE dj."userId" = ${userId}
        AND p."createdAt" >= ${startDate}
      GROUP BY DATE(p."createdAt")
      ORDER BY date ASC
    `;

    res.json({ success: true, data: { trends: dailyDiscoveries } });
  } catch (error) {
    next(error);
  }
};

export const getNicheDistribution = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;

    const nicheDist = await prisma.profile.groupBy({
      by: ["niche"],
      where: { discoveryJob: { userId }, niche: { not: null } },
      _count: { niche: true },
      _avg: { leadScore: true, engagementRate: true, followersCount: true },
      orderBy: { _count: { niche: "desc" } },
    });

    const data = nicheDist.map((n) => ({
      niche: n.niche,
      count: n._count.niche,
      avgLeadScore: Math.round(n._avg.leadScore || 0),
      avgEngagement: Number(n._avg.engagementRate?.toFixed(2) || 0),
      avgFollowers: Math.round(n._avg.followersCount || 0),
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

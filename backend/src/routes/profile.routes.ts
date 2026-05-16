import { Router } from "express";
import { prisma } from "../config/database";
import { authenticate } from "../middleware/authenticate";
import { analysisQueue } from "../jobs/queueManager";
import { AppError } from "../utils/AppError";

const router = Router();
router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const { page = 1, limit = 50, sortBy = "leadScore", order = "desc", niche, tier } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { discoveryJob: { userId } };
    if (niche) where.niche = { contains: String(niche), mode: "insensitive" };
    if (tier) where.leadTier = tier;
    const validSortFields = ["leadScore","followersCount","engagementRate","createdAt"];
    const sortField = validSortFields.includes(String(sortBy)) ? String(sortBy) : "leadScore";
    const [profiles, total] = await Promise.all([
      prisma.profile.findMany({ where, orderBy: { [sortField]: order === "asc" ? "asc" : "desc" }, skip, take: Number(limit) }),
      prisma.profile.count({ where }),
    ]);
    res.json({ success: true, data: { profiles, total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.params.id },
      include: { posts: { orderBy: { postedAt: "desc" }, take: 12 }, _count: { select: { posts: true } } },
    });
    if (!profile) throw new AppError("Profile not found", 404);
    res.json({ success: true, data: profile });
  } catch (e) { next(e); }
});

router.post("/:id/analyze", async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { id: req.params.id }, include: { posts: true } });
    if (!profile) throw new AppError("Profile not found", 404);
    await analysisQueue.add("ai-analysis", {
      profileId: profile.id, username: profile.username, bio: profile.bio,
      recentCaptions: profile.posts.map((p: any) => p.caption).filter(Boolean), topHashtags: [],
    }, { attempts: 2 });
    res.json({ success: true, message: "AI analysis queued. Results in ~30 seconds." });
  } catch (e) { next(e); }
});

export default router;

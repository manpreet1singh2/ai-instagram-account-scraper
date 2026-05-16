import { Router } from "express";
import { prisma } from "../config/database";
import { authenticate } from "../middleware/authenticate";
import { AppError } from "../utils/AppError";

const router = Router();
router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const { page = 1, limit = 50, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { userId };
    if (status) where.status = status;
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({ where, skip, take: Number(limit), include: { profile: true }, orderBy: [{ score: "desc" }, { createdAt: "desc" }] }),
      prisma.lead.count({ where }),
    ]);
    res.json({ success: true, data: { leads, total } });
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
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
  } catch (e) { next(e); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const existing = await prisma.lead.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw new AppError("Lead not found", 404);
    const lead = await prisma.lead.update({ where: { id: req.params.id }, data: req.body, include: { profile: true } });
    res.json({ success: true, data: lead });
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const existing = await prisma.lead.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) throw new AppError("Lead not found", 404);
    await prisma.lead.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Lead removed" });
  } catch (e) { next(e); }
});

export default router;

import { Router } from "express";
import path from "path";
import fs from "fs";
import { prisma } from "../config/database";
import { authenticate } from "../middleware/authenticate";
import { AppError } from "../utils/AppError";

const router = Router();
router.use(authenticate);

router.post("/", async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const { format = "CSV", filters } = req.body;
    if (!["CSV","EXCEL","JSON"].includes(format)) throw new AppError("Invalid format", 400);
    const exportJob = await prisma.exportJob.create({ data: { userId, format, filters: filters || {}, status: "PENDING" } });
    const { exportQueue } = await import("../jobs/queueManager");
    await exportQueue.add("export", { exportJobId: exportJob.id, userId, format, filters }, { attempts: 2 });
    res.status(201).json({ success: true, data: exportJob });
  } catch (e) { next(e); }
});

router.get("/jobs", async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const jobs = await prisma.exportJob.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 });
    res.json({ success: true, data: jobs });
  } catch (e) { next(e); }
});

router.get("/download/:filename", (req, res, next) => {
  try {
    const { filename } = req.params;
    if (filename.includes("..") || filename.includes("/")) throw new AppError("Invalid filename", 400);
    const filePath = path.join(process.env.EXPORT_DIR || "./exports", filename);
    if (!fs.existsSync(filePath)) throw new AppError("File not found or expired", 404);
    res.download(filePath);
  } catch (e) { next(e); }
});

export default router;

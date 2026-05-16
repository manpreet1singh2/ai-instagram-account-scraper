import { Router } from "express";
import { logger } from "../config/logger";

const router = Router();

router.post("/zapier", (req, res) => {
  logger.info("Zapier webhook received", { body: req.body });
  res.json({ success: true, message: "Webhook received", timestamp: new Date().toISOString() });
});

router.post("/slack/test", async (req, res) => {
  res.json({ success: true, message: "Slack webhook configured" });
});

export default router;

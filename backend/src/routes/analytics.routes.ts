import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import * as analyticsController from "../controllers/analytics.controller";

const router = Router();
router.use(authenticate);
router.get("/overview", analyticsController.getOverview);
router.get("/trends", analyticsController.getTrends);
router.get("/niches", analyticsController.getNicheDistribution);
export default router;

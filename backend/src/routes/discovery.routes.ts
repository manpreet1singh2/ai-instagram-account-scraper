import { Router } from "express";
import { body, query } from "express-validator";
import * as discoveryController from "../controllers/discovery.controller";
import { authenticate } from "../middleware/authenticate";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.use(authenticate);

router.post("/search",
  [
    body("keywords").optional().isArray(),
    body("hashtags").optional().isArray(),
    body("minFollowers").optional().isInt({ min: 100 }).default(1000),
    body("maxFollowers").optional().isInt({ max: 1000000 }).default(100000),
    body("minEngagement").optional().isFloat({ min: 0 }).default(0),
    body("niches").optional().isArray(),
    body("languages").optional().isArray(),
    body("locations").optional().isArray(),
  ],
  validateRequest,
  discoveryController.startDiscovery
);

router.get("/jobs", discoveryController.getDiscoveryJobs);
router.get("/jobs/:id", discoveryController.getJobStatus);
router.delete("/jobs/:id", discoveryController.cancelJob);
router.get("/results", discoveryController.getDiscoveryResults);

export default router;

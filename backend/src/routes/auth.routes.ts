// ─── auth.routes.ts ──────────────────────────────────────────────────────────
import { Router } from "express";
import { body } from "express-validator";
import * as authController from "../controllers/auth.controller";
import { authenticate } from "../middleware/authenticate";
import { validateRequest } from "../middleware/validateRequest";

const authRouter = Router();

authRouter.post("/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("name").trim().notEmpty().withMessage("Name is required"),
  ],
  validateRequest,
  authController.register
);

authRouter.post("/login",
  [body("email").isEmail(), body("password").notEmpty()],
  validateRequest,
  authController.login
);

authRouter.post("/refresh", authController.refresh);
authRouter.post("/logout", authenticate, authController.logout);
authRouter.get("/me", authenticate, authController.getProfile);

export default authRouter;

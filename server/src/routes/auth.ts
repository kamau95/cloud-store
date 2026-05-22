import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as auth from "../controllers/auth";

const router = Router();

router.post("/register", validate(auth.registerSchema), auth.register);
router.post("/login", validate(auth.loginSchema), auth.login);
router.get("/me", authenticate, auth.getMe);
router.post("/logout", authenticate, auth.logout);

export default router;

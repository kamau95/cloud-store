import { Router } from "express";
import { validate } from "../middleware/validate";
import * as password from "../controllers/password";

const router = Router();

router.post("/forgot", validate(password.forgotSchema), password.forgotPassword);
router.post("/reset", validate(password.resetSchema), password.resetPassword);

export default router;

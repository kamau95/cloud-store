import { Router } from "express";
import { authenticate } from "../middleware/auth";
import * as sessions from "../controllers/sessions";

const router = Router();

router.use(authenticate);
router.get("/", sessions.listSessions);
router.delete("/:id", sessions.revokeSession);
router.delete("/", sessions.revokeAllSessions);

export default router;

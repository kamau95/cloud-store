import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as auth from "../controllers/auth";
import { passport } from "../services/session";

const router = Router();

router.post("/register", validate(auth.registerSchema), auth.register);
router.post("/login", validate(auth.loginSchema), (req, res, next) => {
  passport.authenticate("local", (err: any, user: any, info: any) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message || "Authentication failed" });
    req.session.regenerate((regErr) => {
      if (regErr) return next(regErr);
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        res.json({ user: { id: user.id, email: user.email, role: user.role } });
      });
    });
  })(req, res, next);
});
router.get("/me", authenticate, auth.getMe);
router.post("/logout", authenticate, auth.logout);

export default router;

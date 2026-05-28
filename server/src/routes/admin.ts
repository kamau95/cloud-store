import { Router } from "express";
import { authenticate, requireAdmin, requireSuperAdmin } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as admin from "../controllers/admin";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/products", admin.listAllProducts);
router.get("/orders", admin.getAllOrders);
router.patch("/orders/:id/deliver", admin.deliverOrder);
router.patch("/orders/:id/cancel", admin.cancelOrder);
router.delete("/orders/:id", admin.deleteOrder);
router.post("/accounts/upload", validate(admin.uploadAccountsSchema), admin.uploadAccounts);
router.get("/accounts", admin.listAccountPool);
router.delete("/accounts/:id", admin.deleteAccountCredential);

router.get("/users", admin.getUsers);
router.patch("/users/:id/role", requireSuperAdmin, validate(admin.updateRoleSchema), admin.updateUserRole);
router.delete("/users/:id", requireSuperAdmin, admin.deleteUser);
router.post("/users/invite", requireSuperAdmin, validate(admin.inviteAdminSchema), admin.inviteAdmin);
router.post("/users/purge", requireSuperAdmin, validate(admin.purgeUsersSchema), admin.purgeUsers);
router.get("/fees", requireSuperAdmin, admin.getFeeSummary);

router.patch("/users/:id/wallet", requireSuperAdmin, validate(admin.updateWalletSchema), admin.updateUserWallet);
router.post("/reset", requireSuperAdmin, admin.resetTransactions);

export default router;

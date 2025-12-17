import express from "express";
import { getDashboardAlertsStats, getDashboardCardsStats, getDashboardInventoryStats, getDashboardPurchaseStats, getDashboardSummary, getDashboardWorkOrderStats, getProductionDashboard, getPurchaseFollowUps, getSystemCheck } from "../controllers/dashbaord.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";


const router = express.Router();

// System check (no auth also ok, but I kept auth optional)
router.get("/system-check", getSystemCheck);

// Dashboard Summary (Top cards)
router.get("/summary", authenticate, getDashboardSummary);
router.get("/cards/stats", authenticate, getDashboardCardsStats);
// Optional: individual sections
router.get("/purchase-followups", authenticate, getPurchaseFollowUps);
router.get("/inventory/stats", authenticate, getDashboardInventoryStats);
router.get("/production/list", authenticate, getProductionDashboard);
router.get("/alerts/stats", authenticate, getDashboardAlertsStats);

export default router;

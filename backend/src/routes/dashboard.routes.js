import express from "express";
import { getDashboardAlertsStats, getDashboardInventoryStats, getDashboardPurchaseStats, getDashboardSummary, getDashboardWorkOrderStats, getSystemCheck } from "../controllers/dashbaord.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";


const router = express.Router();

// System check (no auth also ok, but I kept auth optional)
router.get("/system-check", getSystemCheck);

// Dashboard Summary (Top cards)
router.get("/summary", authenticate, getDashboardSummary);

// Optional: individual sections
router.get("/workorders/stats", authenticate, getDashboardWorkOrderStats);
router.get("/inventory/stats", authenticate, getDashboardInventoryStats);
router.get("/purchase/stats", authenticate, getDashboardPurchaseStats);
router.get("/alerts/stats", authenticate, getDashboardAlertsStats);

export default router;

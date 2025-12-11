// routes/alertRoutes.js
import express from "express";
import { createAlert, getAlertById, getAllAlerts, markAlertRead, markAlertUnread, markAllAlertsRead, resolveAlert, unresolveAlert } from "../controllers/alert.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

// List alerts (with filters & pagination)
router.get("/alerts", authenticate, getAllAlerts);

// Get single alert
router.get("/alerts/:id", authenticate, getAlertById);

// Manually create alert (optional, useful for admin)
router.post("/alerts", authenticate, createAlert);

// Mark read / unread
router.patch("/alerts/:id/read", authenticate, markAlertRead);
router.patch("/alerts/:id/unread", authenticate, markAlertUnread);

// Resolve / unresolve
router.patch("/alerts/:id/resolve", authenticate, resolveAlert);
router.patch("/alerts/:id/unresolve", authenticate, unresolveAlert);

// Mark all as read (optionally filter by module/priority/assignedTo)
router.patch("/alerts/mark-all-read", authenticate, markAllAlertsRead);

export default router;

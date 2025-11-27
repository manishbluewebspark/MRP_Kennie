import express from "express";
import { exportEachMPNUsage, exportTotalMPNNeeded } from "../controllers/workOrder.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.get(
  "/export/total-mpn-needed",
  authenticate,
  exportTotalMPNNeeded
);

router.get(
  "/export/each-mpn-usage",
  authenticate,
  exportEachMPNUsage
);

export default router;
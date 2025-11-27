import express from "express";
import { adjustInventory, exportExcel, exportInventoryAlertsExcel, exportInventoryListExcel, exportMaterialRequiredExcel, getInventoryList, getLowStockAlerts, getMaterialRequiredList } from "../controllers/inventory.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
const router = express.Router();


router.get("/",authenticate, getInventoryList);           
router.post("/adjust",authenticate, adjustInventory); 
router.get("/material-required", authenticate, getMaterialRequiredList);
router.get("/low-stock-alerts", authenticate, getLowStockAlerts);
// MATERIAL REQUIRED EXPORT
router.get(
  "/inventory/export/material-required",
  authenticate,
  exportMaterialRequiredExcel
);

// INVENTORY LIST EXPORT
router.get(
  "/inventory/export/list",
  authenticate,
  exportInventoryListExcel
);

// INVENTORY ALERT EXPORT
router.get(
  "/inventory/export/alerts",
  authenticate,
  exportInventoryAlertsExcel
);

export default router;
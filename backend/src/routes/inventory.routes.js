import express from "express";
import { addShortage, adjustInventory, exportExcel, exportInventoryAlertsExcel, exportInventoryListExcel, exportMaterialRequiredExcel, getInventoryList, getLowStockAlerts, getMaterialRequiredList, getMaterialShortages } from "../controllers/inventory.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
const router = express.Router();


router.get("/",authenticate, getInventoryList);           
router.post("/adjust",authenticate, adjustInventory); 
router.get("/material-required", authenticate, getMaterialRequiredList);
router.get("/low-stock-alerts", authenticate, getLowStockAlerts);
router.post("/addShortage", authenticate, addShortage);
router.get("/material-shortages/list", authenticate, getMaterialShortages);
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
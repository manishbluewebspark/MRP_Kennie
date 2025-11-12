import express from "express";
import { adjustInventory, exportExcel, getInventoryList, getLowStockAlerts, getMaterialRequiredList } from "../controllers/inventory.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
const router = express.Router();


router.get("/",authenticate, getInventoryList);           
router.post("/adjust",authenticate, adjustInventory); 
router.get("/material-required", authenticate, getMaterialRequiredList);
router.get("/low-stock-alerts", authenticate, getLowStockAlerts);
router.get("/export/excel", authenticate, exportExcel);
export default router;
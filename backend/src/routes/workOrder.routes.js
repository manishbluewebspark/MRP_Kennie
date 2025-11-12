import express from "express";
import { createWorkOrder, deleteWorkOrder, exportDeliveryWorkOrdersPDF, exportDeliveryWorkOrdersWord, exportDeliveryWorkOrdersXlsx, exportWorkOrders, getAllProductionWordOrders, getAllWorkOrders, getDeliveryOrders, getTotalMPNNeeded, getWorkOrderById, importWorkOrders, moveToProduction, updateDeliveryInfo, updateWorkOrder } from "../controllers/workOrder.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { upload } from "..//middlewares/upload.js";

const router = express.Router();

// CRUD routes
router.get("/", authenticate, getAllWorkOrders);
router.get("/:id", authenticate, getWorkOrderById);
router.post("/", authenticate, createWorkOrder);
router.put("/:id", authenticate, updateWorkOrder);
router.delete("/:id", authenticate, deleteWorkOrder);

// Import / Export
router.post("/workOrder/import", authenticate,upload.single("file"), importWorkOrders);
router.get("/workOrder/export", authenticate, exportWorkOrders);

router.get("/workOrder/export/delivery/excel", authenticate, exportDeliveryWorkOrdersXlsx);
router.get("/workOrder/export/delivery/pdf", authenticate, exportDeliveryWorkOrdersPDF);
router.get("/workOrder/export/delivery/word", authenticate, exportDeliveryWorkOrdersWord);

router.patch("/:id/delivery", authenticate, updateDeliveryInfo);

router.post("/workOrder/:id/move-to-production", authenticate, moveToProduction);
router.get("/workOrder/production", authenticate, getAllProductionWordOrders)

router.get('/workOrder/totalMPNNeeded',authenticate, getTotalMPNNeeded)
router.get('/workOrder/deliveryOrders',authenticate, getDeliveryOrders)
export default router;

import express from "express";
import { createWorkOrder, deleteWorkOrder, exportDeliveryWorkOrdersPDF, exportDeliveryWorkOrdersWord, exportDeliveryWorkOrdersXlsx, exportWorkOrders, getAllChilPartByDrawingId, getAllProductionWordOrders, getAllWorkOrders, getCompleteWorkOrders, getDeliveryOrders, getEachMPNUsage, getTotalMPNNeeded, getWorkOrderById, importWorkOrders, moveToProduction, saveWorkOrderStage, updateDeliveryInfo, updateWorkOrder } from "../controllers/workOrder.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { upload } from "..//middlewares/upload.js";

const router = express.Router();

// Import / Export
router.post("/workOrder/import", authenticate,upload.single("file"), importWorkOrders);
router.get("/workOrder/export", authenticate, exportWorkOrders);

router.get("/workOrder/export/delivery/excel", authenticate, exportDeliveryWorkOrdersXlsx);
router.get("/workOrder/export/delivery/pdf", authenticate, exportDeliveryWorkOrdersPDF);
router.get("/workOrder/export/delivery/word", authenticate, exportDeliveryWorkOrdersWord);

router.patch("/:id/delivery", authenticate, updateDeliveryInfo);

router.post("/workOrder/:id/move-to-production", authenticate, moveToProduction);
router.get("/workOrder/production", authenticate, getAllProductionWordOrders)
router.get("/workOrder/getAllChilPartByDrawingId", authenticate, getAllChilPartByDrawingId)
router.get(
  "/workOrder/totalMPNNeeded",
  (req, res, next) => {
    console.log("🔥 Route /workOrder/totalMPNNeeded HIT");
    next();
  },
  authenticate,
  getTotalMPNNeeded
);

router.post("/workorder/production/:id/stage", saveWorkOrderStage);
router.get("/workOrder/getEachMPNUsage",authenticate,getEachMPNUsage)

router.get("/workOrder/getCompleteWorkOrders",authenticate,getCompleteWorkOrders)
router.get('/workOrder/deliveryOrders',authenticate, getDeliveryOrders)
// CRUD routes
router.get("/", authenticate, getAllWorkOrders);
router.get("/:id", authenticate, getWorkOrderById);
router.post("/", authenticate, createWorkOrder);
router.put("/:id", authenticate, updateWorkOrder);
router.delete("/:id", authenticate, deleteWorkOrder);


export default router;

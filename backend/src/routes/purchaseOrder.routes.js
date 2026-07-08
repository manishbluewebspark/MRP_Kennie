import express from "express";
import {
  updatePurchaseOrder,
  deletePurchaseOrder,
  getAllPurchaseOrders,
  getPurchaseOrderById,
  sendPurchaseOrderMail,
  addPurchaseOrder,
  getPurchaseOrdersHistory,
  getPurchaseOrdersSummary,
  getPurchaseShortageList,
  updatePurchaseOrderStatus,
  getLastPurachseOrderNumber,
  exportExcel,
  exportPurchaseOrderPDF,
  acceptPurchaseOrder,
  revisedPurchaseOrder,
  getRevisePurchaseOrderById,
  exportRevisedPurchaseOrderPDF,
} from "../controllers/purchaseOrder.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * Create
 */
router.post("/", authenticate, addPurchaseOrder);

/**
 * Static GET Routes (Always keep above /:id)
 */
router.get("/accept/ack/:id", acceptPurchaseOrder);
router.get("/history", authenticate, getPurchaseOrdersHistory);
router.get("/summary", authenticate, getPurchaseOrdersSummary);
router.get("/purchase/shortageList", authenticate, getPurchaseShortageList);
router.get(
  "/purchase/getLastPurachseOrderNumber",
  authenticate,
  getLastPurachseOrderNumber
);
router.get("/purchase/excel", authenticate, exportExcel);

/**
 * Collection Routes
 */
router.get("/", authenticate, getAllPurchaseOrders);

/**
 * Routes containing :id but with additional segments
 */
router.post("/:id/send-mail", authenticate, sendPurchaseOrderMail);
router.get("/:id/export-pdf", authenticate, exportPurchaseOrderPDF);
router.get("/revised/:id/export-pdf", authenticate, exportRevisedPurchaseOrderPDF);
router.put("/updateStatus/:id", authenticate, updatePurchaseOrderStatus);

router.put(
  "/:id/revise",authenticate,
  revisedPurchaseOrder
);
/**
 * Generic :id Route (KEEP LAST)
 */
router.get("/:id", authenticate, getPurchaseOrderById);
router.get("/revise/:id", authenticate, getRevisePurchaseOrderById);
router.put("/:id", authenticate, updatePurchaseOrder);
router.delete("/:id", authenticate, deletePurchaseOrder);

export default router;
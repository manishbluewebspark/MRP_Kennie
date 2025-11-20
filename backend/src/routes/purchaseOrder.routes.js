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
} from "../controllers/purchaseOrder.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", authenticate, addPurchaseOrder);
router.put("/:id", authenticate, updatePurchaseOrder);
router.put("/updateStatus/:id", authenticate, updatePurchaseOrderStatus);
router.delete("/:id", authenticate, deletePurchaseOrder);
router.get("/", authenticate, getAllPurchaseOrders);

router.post("/:id/send-mail", authenticate, sendPurchaseOrderMail);
router.get("/history", authenticate, getPurchaseOrdersHistory);
router.get("/summary", authenticate, getPurchaseOrdersSummary);
router.get("/purchase/shortageList", authenticate, getPurchaseShortageList);
router.get("/purchase/getLastPurachseOrderNumber", authenticate, getLastPurachseOrderNumber);
router.get("/:id", authenticate, getPurchaseOrderById);

router.get("/purchase/excel", authenticate, exportExcel);
export default router;

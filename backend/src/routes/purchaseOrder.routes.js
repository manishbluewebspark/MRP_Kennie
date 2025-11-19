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
} from "../controllers/purchaseOrder.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", authenticate, addPurchaseOrder);
router.put("/:id", authenticate, updatePurchaseOrder);
router.delete("/:id", authenticate, deletePurchaseOrder);
router.get("/", authenticate, getAllPurchaseOrders);

router.post("/:id/send-mail", authenticate, sendPurchaseOrderMail);
router.get("/history", authenticate, getPurchaseOrdersHistory);
router.get("/summary", authenticate, getPurchaseOrdersSummary);
router.get("/purchase/shortageList", authenticate, getPurchaseShortageList);

router.get("/:id", authenticate, getPurchaseOrderById);
export default router;

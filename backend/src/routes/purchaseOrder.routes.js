import express from "express";
import {
  updatePurchaseOrder,
  deletePurchaseOrder,
  getAllPurchaseOrders,
  getPurchaseOrderById,
  sendPurchaseOrderMail,
  addPurchaseOrder,
} from "../controllers/purchaseOrder.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", authenticate, addPurchaseOrder);
router.put("/:id", authenticate, updatePurchaseOrder);
router.delete("/:id", authenticate, deletePurchaseOrder);
router.get("/", authenticate, getAllPurchaseOrders);
router.get("/:id", authenticate, getPurchaseOrderById);
router.post("/:id/send-mail", authenticate, sendPurchaseOrderMail);

export default router;

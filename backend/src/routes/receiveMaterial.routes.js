import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { closePurchaseOrder, createReceiveMaterial } from "../controllers/receiveMaterial.controller.js";
const router = express.Router();


router.post("/", authenticate, createReceiveMaterial);
router.put(
  "/close-po/:id",
  authenticate,
  closePurchaseOrder
);
export default router;
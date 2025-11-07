import express from "express";
import {
  getPurchaseSettingById,
  addOrUpdatePurchaseSetting,
  deletePurchaseSetting,
  getAllPurchaseSettings
} from "../controllers/purchaseSettings.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Get all purchase settings or by search
router.get("/", authenticate, getAllPurchaseSettings);

// Get single by ID
router.get("/:id", authenticate, getPurchaseSettingById);

// Add new or update existing
router.post("/", authenticate, addOrUpdatePurchaseSetting);

// Delete
router.delete(
  '/:settingId/address/:addressId',
  authenticate,
  deletePurchaseSetting
);


export default router;

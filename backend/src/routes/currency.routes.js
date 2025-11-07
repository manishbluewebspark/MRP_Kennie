import express from "express";
import {
  getAllCurrencies,
  getCurrencyById,
  updateCurrency,
  deleteCurrency,
  addCurrency,
} from "../controllers/Currency.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", authenticate, addCurrency);
router.get("/", authenticate, getAllCurrencies);
router.get("/:id", authenticate, getCurrencyById);
router.put("/:id", authenticate, updateCurrency);
router.delete("/:id", authenticate, deleteCurrency);

export default router;

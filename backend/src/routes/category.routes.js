import express from "express";
import {
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  addCategory,
} from "../controllers/Category.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", authenticate, addCategory);
router.get("/", authenticate, getAllCategories);
router.get("/:id", authenticate, getCategoryById);
router.put("/:id", authenticate, updateCategory);
router.delete("/:id", authenticate, deleteCategory);

export default router;

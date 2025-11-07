import express from "express";
import {
  getAllUOMs,
  getUOMById,
  updateUOM,
  deleteUOM,
  addUOM,
} from "../controllers/UOM.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", authenticate, addUOM);
router.get("/", authenticate, getAllUOMs);
router.get("/:id", authenticate, getUOMById);
router.put("/:id", authenticate, updateUOM);
router.delete("/:id", authenticate, deleteUOM);

export default router;

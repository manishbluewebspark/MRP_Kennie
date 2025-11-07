import express from "express";
import {
  updateSkillLevelCosting,
  deleteSkillLevelCosting,
  getAllSkillLevelCostings,
  getSkillLevelCostingById,
  addSkillLevelCosting,
} from "../controllers/skilllevelcosting.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Add new
router.post("/",authenticate, addSkillLevelCosting);

// Update
router.put("/:id",authenticate, updateSkillLevelCosting);

// Delete
router.delete("/:id",authenticate, deleteSkillLevelCosting);

// Get all (with pagination + search + sorting)
router.get("/",authenticate, getAllSkillLevelCostings);

// Get by ID
router.get("/:id",authenticate, getSkillLevelCostingById);

export default router;

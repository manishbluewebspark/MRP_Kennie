import express from "express";
import {
  createProject,
  updateProject,
  deleteProject,
  getAllProjects,
  getProjectById,
} from "../controllers/Project.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/",authenticate, createProject);          // Create Project
router.put("/:id",authenticate, updateProject);        // Update Project
router.delete("/:id",authenticate, deleteProject);     // Soft Delete Project
router.get("/",authenticate, getAllProjects);          // Get All Projects with filter/search/pagination
router.get("/:id",authenticate, getProjectById);       // Get Project By Id

export default router;

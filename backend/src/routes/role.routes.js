import express from "express";
import {
  createRole,
  updateRole,
  deleteRole,
  getRoleById,
  getAllRoles,
} from "../controllers/role.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Only Admin can manage roles
router.use(authenticate);
router.use(authorize(["Admin"]));

router.post("/", createRole);
router.put("/:roleId", updateRole);
router.delete("/:roleId", deleteRole);
router.get("/:roleId", getRoleById);
router.get("/", getAllRoles);

export default router;

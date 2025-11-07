import express from "express";
import { createUser, updateUser, deleteUser, getUserById, getAllUsers } from "../controllers/user.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

// User CRUD
router.post("/", authenticate, createUser);             // Create
router.put("/:userId", authenticate, updateUser);      // Update
router.delete("/:userId", authenticate, deleteUser);   // Soft Delete
router.get("/:userId", authenticate, getUserById);     // Get by ID
router.get("/", authenticate, getAllUsers);            // Get all with pagination/search/sort
// Normal user can view own profile
// router.get("/me", authenticate, (req, res) => {
//     res.json({ user: req.user });
// });

export default router;

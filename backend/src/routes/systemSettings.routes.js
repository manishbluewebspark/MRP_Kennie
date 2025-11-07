import express from "express";
import { addOrUpdateSystemSettings, getSystemSettings } from "../controllers/systemSettings.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Single API to create/update
router.post("/",authenticate, addOrUpdateSystemSettings);

// Get current settings
router.get("/",authenticate, getSystemSettings);

export default router;

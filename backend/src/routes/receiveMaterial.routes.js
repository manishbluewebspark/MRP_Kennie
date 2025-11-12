import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { createReceiveMaterial } from "../controllers/receiveMaterial.controller.js";
const router = express.Router();


router.post("/", authenticate, createReceiveMaterial);

export default router;
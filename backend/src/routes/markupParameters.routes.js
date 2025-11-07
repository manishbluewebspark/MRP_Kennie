import express from "express";
import { addOrUpdateMarkupParameter, getAllMarkupParameters } from "../controllers/markupParameters.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Single API to create/update
router.post("/",authenticate, addOrUpdateMarkupParameter);

// Get all
router.get("/",authenticate, getAllMarkupParameters);

export default router;

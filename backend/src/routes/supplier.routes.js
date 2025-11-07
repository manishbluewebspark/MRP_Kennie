import express from "express";
import { addSupplier, deleteSupplier, getAllSuppliers, getSupplierById, updateSupplier } from "../controllers/supplier.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/",authenticate, addSupplier);
router.get("/",authenticate, getAllSuppliers);
router.get("/:id",authenticate, getSupplierById);
router.put("/:id",authenticate, updateSupplier);
router.delete("/:id",authenticate, deleteSupplier);

export default router;

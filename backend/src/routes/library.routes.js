import express from "express";
import { addMpn, deleteMpn, exportMpn, getAllMpn, getMpnById, importMpn, updateMpn } from "../controllers/library/mpn.controller.js";
import { addChild, deleteChild, exportChild, getAllChild, getChildById, importChild, updateChild } from "../controllers/library/child.controller.js";
import { upload } from "../middlewares/upload.js";
const router = express.Router();

/**
 * ----------------------------
 * MPM (Main Parent Module) APIs
 * ----------------------------
 */

// Add new MPM
router.post("/mpn",addMpn);

// Update MPM
router.put("/mpn/:id",updateMpn);

// Delete MPM
router.delete("/mpn/:id",deleteMpn);

// Get MPM by ID
router.get("/mpn/:id", getMpnById);

// Get all MPM with filters
router.get("/mpn",getAllMpn);

// Import MPM data
router.post("/mpn/import",upload.single("file"), importMpn);

// Export MPM data
router.get("/mpn/export/all", exportMpn);


/**
 * ----------------------------
 * Child-part APIs
 * ----------------------------
 */

// Add new Child
router.post("/child", addChild);

// Update Child
router.put("/child/:id",updateChild);

// Delete Child
router.delete("/child/:id", deleteChild);

// Get Child by ID
router.get("/child/:id", getChildById);

// Get all Child with filters
router.get("/child", getAllChild);

// Import Child data
router.post("/child/import",upload.single("file"),importChild);

// Export Child data
router.get("/child/export/all",exportChild);

export default router;

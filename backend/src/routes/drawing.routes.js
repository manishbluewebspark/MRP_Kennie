import express from "express";
import {
  getDrawingById,
  createDrawing,
  updateDrawing,
  deleteDrawing,
  importDrawings,
  exportDrawings,
  getDrawingStats,
  getAllDrawings,
  addCostingItem,
  updateCostingItem,
  getAllCostingItems,
  deleteCostingItem,
  duplicateDrawing,
  importCostingItems,
} from "../controllers/drawing.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { upload } from "..//middlewares/upload.js";

const router = express.Router();

// You can enable auth middleware if needed: 
// router.use(authenticate);

router.get("/",authenticate, getAllDrawings);
router.get("/stats",authenticate, getDrawingStats);
router.get("/export",authenticate, exportDrawings);
router.get("/:id",authenticate, getDrawingById);
router.post("/",authenticate, createDrawing);
router.post("/import",authenticate,upload.single("file"), importDrawings);
router.put("/:id",authenticate, updateDrawing);
router.delete("/:id",authenticate, deleteDrawing);
router.post('/:id/duplicate',authenticate,duplicateDrawing);
router.post("/:drawingId/costing",authenticate, addCostingItem);
router.put("/:drawingId/costing/:itemId",authenticate, updateCostingItem);
router.get("/:drawingId/costing",authenticate, getAllCostingItems);
router.delete("/:drawingId/costing/:itemId",authenticate, deleteCostingItem);
router.post("/:drawingId/costing/import",authenticate,upload.single("file"), importCostingItems);
export default router;

import express from "express";
import { upload } from "..//middlewares/upload.js";
import { deleteDemandList, getAllDemandLists, getDemandListById, updateDemandListItem, uploadDemandExcel } from "../controllers/demandList.controller.js";

const router = express.Router();

router.get("/", getAllDemandLists);

router.post(
  "/upload",
  upload.single("file"),
  uploadDemandExcel
);

router.get("/:id", getDemandListById);

router.delete("/:id", deleteDemandList);

router.put("/item/:itemId", updateDemandListItem);

export default router;

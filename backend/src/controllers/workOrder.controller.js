import mongoose from "mongoose";
import XLSX from "xlsx";
import WorkOrder from "../models/WorkingOrders.js";
import Drawing from "../models/Drwaing.js";
import * as docx from "docx";
import fs from "fs";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  AlignmentType,
  HeadingLevel,
  WidthType,
  TextRun,
} from "docx";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import CostingItems from "../models/CostingItem.js";
import MPN from "../models/library/MPN.js";
import Inventory from "../models/Inventory.js";
import UOM from "../models/UOM.js";
import Project from "../models/Project.js";
import Customer from "../models/Customer.js";
import Child from "../models/library/Child.js";
import path from "path";
import ejs from 'ejs'
import puppeteer from 'puppeteer'
import { convertFromMeter, convertQty, convertToInventoryUom, convertToMeter, convertUom } from "../utils/uomController.js";
import { getProcess, getUserName } from "../utils/helpers.js";

function generateWorkOrderNumber(lastWorkOrderNo) {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");

  // Normalize to array
  const arr = Array.isArray(lastWorkOrderNo)
    ? lastWorkOrderNo
    : lastWorkOrderNo
      ? [lastWorkOrderNo]
      : [];

  // Filter same month WO
  const currentMonthNumbers = arr
    .filter((num) => num.startsWith(`WO${year}${month}`))
    .map((num) => parseInt(num.split("-")[1], 10))
    .filter((n) => !isNaN(n));

  const nextSeq = currentMonthNumbers.length
    ? Math.max(...currentMonthNumbers) + 1
    : 1;

  const seqStr = String(nextSeq).padStart(5, "0");
  return `WO${year}${month}-${seqStr}`;
};

// ---------------- Get All WorkOrders ----------------
// export const getAllWorkOrders = async (req, res) => {
//   try {
//     let {
//       page = 1,
//       limit = 10,
//       search = "",
//       sortBy = "createdAt",
//       sortOrder = "desc",
//       projectId,
//       drawingId,
//       status,
//     } = req.query;

//     const query = {};

//     // Search by workOrderNo, poNumber, projectNo
//     if (search) {
//       query.$or = [
//         { workOrderNo: { $regex: search, $options: "i" } },
//         { poNumber: { $regex: search, $options: "i" } },
//         { projectNo: { $regex: search, $options: "i" } },
//       ];
//     }

//     if (projectId && mongoose.Types.ObjectId.isValid(projectId)) query.projectId = projectId;
//     if (drawingId && mongoose.Types.ObjectId.isValid(drawingId)) query.drawingId = drawingId;
//     if (status) query.status = status;

//     const sortOptions = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

//     const total = await WorkOrder.countDocuments(query);
//     const workOrders = await WorkOrder.find(query)
//       // .populate("projectId", "projectName code")
//       // .populate("drawingId", "drawingNo description")
//       .sort(sortOptions)
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit))
//       .lean();

//        const lastWorkOrder = await WorkOrder.findOne()
//       .sort({ createdAt: -1 })
//       .select("workOrderNo")
//       .lean();

//           const lastWorkOrderNo = lastWorkOrder ? lastWorkOrder.workOrderNo : null;


//     res.status(200).json({
//       success: true,
//       data: workOrders,
//       lastWorkOrderNo,
//       pagination: {
//         currentPage: parseInt(page),
//         totalPages: Math.ceil(total / limit),
//         totalItems: total,
//         itemsPerPage: parseInt(limit),
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// export const getAllWorkOrders = async (req, res) => {
//   try {
//     let {
//       page = 1,
//       limit = 10,
//       search = "",
//       sortBy = "createdAt",
//       sortOrder = "desc",
//       projectId,
//       drawingId,
//       status,
//     } = req.query;

//     const query = {};

//     // Search
//     if (search) {
//       query.$or = [
//         { workOrderNo: { $regex: search, $options: "i" } },
//         { poNumber: { $regex: search, $options: "i" } },
//         { projectNo: { $regex: search, $options: "i" } },
//       ];
//     }

//     if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
//       query.projectId = projectId;
//     }

//     if (drawingId && mongoose.Types.ObjectId.isValid(drawingId)) {
//       query.drawingId = drawingId;
//     }

//     if (status) query.status = status;

//     const sortOptions = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

//     const total = await WorkOrder.countDocuments(query);

//     let workOrders = await WorkOrder.find(query)
//       .sort(sortOptions)
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit))
//       .lean();

//     // ***************************************
//     // ⭐ DIRECT drawingId → drawingNo resolve
//     // ***************************************
//     const drawingIds = workOrders
//       .filter((wo) => wo.drawingId)
//       .map((wo) => String(wo.drawingId));

//     const uniqueDrawingIds = [...new Set(drawingIds)];

//     let drawingMap = new Map();

//     if (uniqueDrawingIds.length) {
//       const drawingDocs = await Drawing.find({
//         _id: { $in: uniqueDrawingIds },
//       })
//         .select("drawingNo projectType quoteType")
//         .lean();

//       drawingMap = new Map(
//         drawingDocs.map((d) => [String(d._id), d])
//       );
//     }

//     // ⭐ Inject drawingNo + projectType into each WorkOrder
//     workOrders = workOrders.map((wo) => {
//       const d = drawingMap.get(String(wo.drawingId));

//       return {
//         ...wo,
//         drawingNo: d?.drawingNo || null,
//         projectType: d?.projectType || d?.quoteType || null,
//       };
//     });

//     // ⭐ Last WorkOrderNo
//     const lastWorkOrder = await WorkOrder.findOne()
//       .sort({ createdAt: -1 })
//       .select("workOrderNo")
//       .lean();

//     const lastWorkOrderNo = lastWorkOrder?.workOrderNo || null;

//     return res.status(200).json({
//       success: true,
//       data: workOrders,
//       lastWorkOrderNo,
//       pagination: {
//         currentPage: parseInt(page),
//         totalPages: Math.ceil(total / limit),
//         totalItems: total,
//         itemsPerPage: parseInt(limit),
//       },
//     });
//   } catch (error) {
//     console.error("getAllWorkOrders error:", error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

export const getAllWorkOrders = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
      projectId,
      drawingId,
      posNo,        // ✅ NEW
      status,
      activeTab
    } = req.query;

    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 10;

    const query = {};

    // ✅ Filters
    if (projectId) {
      query.projectNo = projectId;
    }

    if (drawingId && mongoose.Types.ObjectId.isValid(drawingId)) {
      query.drawingId = new mongoose.Types.ObjectId(drawingId);
    }

    if (posNo !== undefined && posNo !== null && String(posNo).trim() !== "") {
      // posNo number bhi ho sakta hai, string bhi
      query.posNo = String(posNo).trim();
    }

    if (status) query.status = status;

    if (activeTab === "PRODUCTION") {
      query.$or = [
        { isInProduction: true },
        {
          isProductionComplete: true,
          status: "Quality Check Done",
        },
      ];
    }

    if (activeTab === "show_all") {
      query.isInProduction = true;
    }

    if (activeTab === "NON_PRODUCTION") {
      query.isInProduction = false;
      query.isProductionComplete = false
    }

    if (search && String(search).trim()) {
      const s = String(search).trim();

      const orConditions = [
        { workOrderNo: { $regex: s, $options: "i" } },
        { poNumber: { $regex: s, $options: "i" } },
        { projectNo: { $regex: s, $options: "i" } },
      ];

      // ✅ only add posNo when search is numeric
      if (!isNaN(s)) {
        orConditions.push({ posNo: Number(s) });
      }

      query.$or = orConditions;
    }


    // ✅ Sort
    const sortOptions = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    // ✅ Total count
    const total = await WorkOrder.countDocuments(query);

    // ✅ Fetch workOrders
    let workOrders = await WorkOrder.find(query)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // ***************************************
    // ⭐ drawingId → drawingNo resolve
    // ***************************************
    const uniqueDrawingIds = [
      ...new Set(
        workOrders
          .filter((wo) => wo.drawingId)
          .map((wo) => String(wo.drawingId))
      ),
    ];

    let drawingMap = new Map();

    if (uniqueDrawingIds.length) {
      const drawingDocs = await Drawing.find({
        _id: { $in: uniqueDrawingIds.map((id) => new mongoose.Types.ObjectId(id)) },
      })
        .select("drawingNo projectType quoteType")
        .lean();

      drawingMap = new Map(drawingDocs.map((d) => [String(d._id), d]));
    }

    // -----------------------------
    // ⭐ Costing Items Fetch
    // -----------------------------
    let costingMap = new Map();

    if (uniqueDrawingIds.length) {
      const costingItems = await CostingItems.find({
        drawingId: {
          $in: uniqueDrawingIds.map(id => new mongoose.Types.ObjectId(id))
        }
      })
        .select("drawingId quoteType")
        .lean();

      for (const item of costingItems) {
        const key = String(item.drawingId);

        if (!costingMap.has(key)) {
          costingMap.set(key, new Set());
        }

        costingMap.get(key).add((item.quoteType || "").toLowerCase());
      }
    }

    const requiredTypes = ["material", "manhour"];

    // ⭐ Inject drawingNo + projectType
    workOrders = workOrders.map((wo) => {
      const d = drawingMap.get(String(wo.drawingId));

      const types = costingMap.get(String(wo.drawingId)) || new Set();

      const missingTypes = requiredTypes.filter(
        (t) => !types.has(t)
      );

      const isCostingComplete = missingTypes.length === 0;

      return {
        ...wo,
        posNo: wo?.posNo,
        drawingNo: d?.drawingNo || null,
        projectType: d?.projectType || d?.quoteType || null,
        isCostingComplete,
      };
    });

    const lastWorkOrder = await WorkOrder.aggregate([
      {
        $addFields: {
          numericPart: {
            $toInt: {
              $arrayElemAt: [
                { $split: ["$workOrderNo", "-"] },
                1,
              ],
            },
          },
        },
      },
      {
        $sort: {
          numericPart: -1,
        },
      },
      {
        $limit: 1,
      },
    ]);

    const lastWorkOrderNo =
      lastWorkOrder?.[0]?.workOrderNo || null;

    return res.status(200).json({
      success: true,
      data: workOrders,
      lastWorkOrderNo,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("getAllWorkOrders error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


// ---------------- Get By ID ----------------
export const getWorkOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid ID" });

    const workOrder = await WorkOrder.findById(id)
      .populate("projectId", "projectName code")
      .populate("drawingId", "drawingNo description");

    if (!workOrder) return res.status(404).json({ success: false, message: "WorkOrder not found" });

    res.status(200).json({ success: true, data: workOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** Normalize a single item */
const normItem = (it = {}) => ({
  drawingId: it.drawingId ? new mongoose.Types.ObjectId(String(it.drawingId)) : undefined,
  posNo: String(it.posNo || '').trim().toUpperCase(),
  quantity: Number(it.quantity || 0),
  uom: it.uom || 'PCS',
  remarks: String(it.remarks || ''),
  status: it.status || 'open',
});

/** If needDate missing but commitDate present → needDate = commitDate - 14 days */
const backfillNeedDate = (payload) => {
  const commit = payload?.commitDate ? new Date(payload.commitDate) : null;
  if (commit && !payload?.needDate) {
    const nd = new Date(commit);
    nd.setDate(nd.getDate() - 14);
    payload.needDate = nd;
  }
};

/** Merge items: same (drawingId + posNo) → sum quantities */
const mergeItems = (items = []) => {
  const map = new Map();
  for (const raw of items) {
    const it = normItem(raw);
    if (!it.drawingId) continue;
    const key = `${it.drawingId}-${it.posNo}`;
    const prev = map.get(key);
    if (prev) {
      prev.quantity += it.quantity;
      prev.remarks = it.remarks || prev.remarks;
    } else {
      map.set(key, { ...it });
    }
  }
  return Array.from(map.values());
};

/** ---------------- Create ---------------- */
// export const createWorkOrder = async (req, res) => {
//   try {
//     const {
//       workOrderNo,
//       projectNo,
//       poNumber,
//       projectType,
//       needDate,
//       commitDate,
//       status,
//       items = [],
//       projectId,
//       isTriggered = false,
//     } = req.body || {};

//     if (!workOrderNo) {
//       return res.status(400).json({ success: false, message: 'workOrderNo is required' });
//     }
//     // if (!projectNo) {
//     //   return res.status(400).json({ success: false, message: 'projectNo is required' });
//     // }
//     if (!Array.isArray(items) || items.length === 0) {
//       return res.status(400).json({ success: false, message: 'At least one item is required' });
//     }

//     const mergedItems = mergeItems(items);

//     // If WO exists → append/merge items & update status (idempotent “create-or-append”)
//     let existing = await WorkOrder.findOne({ workOrderNo });
//     if (existing) {
//       const combined = mergeItems([...(existing.items || []), ...mergedItems]);
//       existing.items = combined;
//       if (status) existing.status = status;
//       if (typeof isTriggered === 'boolean') existing.isTriggered = isTriggered;

//       // optional fields updates if passed
//       if (poNumber) existing.poNumber = poNumber;
//       if (projectType) existing.projectType = projectType;
//       if (projectId) existing.projectId = projectId;
//       if (commitDate) existing.commitDate = new Date(commitDate);
//       if (needDate) existing.needDate = new Date(needDate);

//       backfillNeedDate(existing);
//       const saved = await existing.save();
//       return res.status(200).json({
//         success: true,
//         message: 'Work order updated successfully',
//         data: saved,
//       });
//     }

//     // Create new
//     const payload = {
//       workOrderNo,
//       projectNo,
//       projectId: projectId || undefined,
//       poNumber: poNumber || '',
//       projectType: projectType || 'cable_assembly',
//       needDate: needDate ? new Date(needDate) : undefined,
//       commitDate: commitDate ? new Date(commitDate) : undefined,
//       status: status || 'on_hold',
//       isTriggered: Boolean(isTriggered),
//       items: mergedItems,
//     };

//     backfillNeedDate(payload);
//     const created = await WorkOrder.create(payload);

//     return res.status(201).json({
//       success: true,
//       message: 'Work order created successfully',
//       data: created,
//     });
//   } catch (error) {
//     console.error('Create WorkOrder Error:', error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };
const generateNextWorkOrderNo = (baseWorkOrderNo, index) => {
  const parts = baseWorkOrderNo.split("-");

  const prefix = parts[0]; // WO2605
  const numberPart = parts[1]; // 00001

  const nextNumber =
    String(Number(numberPart) + index).padStart(numberPart.length, "0");

  return `${prefix}-${nextNumber}`;
};




export const createWorkOrder = async (req, res) => {
  try {
    const {
      workOrderNo,      // base WO no, e.g. "2405-18-20"
      poNumber,
      projectNo,
      needDate,
      commitDate,
      status,
      items = [],
      isTriggered = false,
    } = req.body || {};

    if (!workOrderNo) {
      return res
        .status(400)
        .json({ success: false, message: "workOrderNo is required" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "At least one item is required" });
    }

    // ---------- 1) Saare drawingIds collect ----------
    const drawingIdSet = new Set();
    for (const it of items) {
      if (it.drawingId) drawingIdSet.add(String(it.drawingId));
    }
    const drawingIds = [...drawingIdSet];

    // ---------- 2) Drawing docs fetch ----------
    let drawingMap = new Map();
    if (drawingIds.length) {
      const drawingDocs = await Drawing.find({
        _id: { $in: drawingIds },
      }).lean();

      drawingMap = new Map(drawingDocs.map((d) => [String(d._id), d]));
    }

    // Header dates -> Date
    const headerCommitDate = commitDate ? new Date(commitDate) : null;
    const headerNeedDate = needDate ? new Date(needDate) : null;

    // ✅ CASE 1: Sirf 1 item → same workOrderNo use karo
    if (items.length === 1) {
      const it = items[0];

      if (!it.drawingId) {
        return res
          .status(400)
          .json({ success: false, message: "drawingId is required for item" });
      }


      // 🛑 DUPLICATION CHECK: (workOrderNo + poNumber) combination
      const comboExists = await WorkOrder.findOne({
        workOrderNo,
        poNumber: poNumber || "",
      });

      if (comboExists) {
        return res.status(400).json({
          success: false,
          message: `Work order with combination (WO: ${workOrderNo}, PO: ${poNumber || "-"
            }) already exists`,
        });
      }


      const d = drawingMap.get(String(it.drawingId));

      // projectId & projectType resolve
      let projectId = d?.projectId || it.projectId || null;

      let projectType = it.projectType || d?.projectType || d?.quoteType || "cable_harness";
      if (projectType === "cable_assembly") projectType = "cable_harness";
      if (projectType === "box_Build_assembly") projectType = "box_build";
      if (!["cable_harness", "box_build", "other"].includes(projectType)) {
        projectType = "other";
      }

      // quantity & uom
      const qty =
        typeof it.quantity === "number"
          ? it.quantity
          : typeof it.qty === "number"
            ? it.qty
            : 1;
      const uom = it.uom || "PCS";

      // dates priority: item > header > (commit - 14 days)
      let finalCommitDate = it.commitDate
        ? new Date(it.commitDate)
        : headerCommitDate;

      let finalNeedDate = it.needDate ? new Date(it.needDate) : headerNeedDate;

      if (!finalNeedDate && finalCommitDate) {
        finalNeedDate = new Date(
          finalCommitDate.getTime() - 14 * 24 * 60 * 60 * 1000
        );
      }

      // Pehle check karo koi WO exist karta hai kya same workOrderNo se
      let existing = await WorkOrder.findOne({ workOrderNo });

      const docData = {
        workOrderNo,                         // ❗ yahi diya gaya base no use karega
        poNumber: poNumber || "",
        projectNo,
        drawingId: it.drawingId,
        projectId,
        projectType,
        posNo: it.posNo || 1,
        quantity: qty,
        uom,
        remarks: it.remarks || "",
        needDate: finalNeedDate || null,
        commitDate: finalCommitDate || null,
        status: "No Progress Yet",
        isTriggered: Boolean(
          typeof it.isTriggered === "boolean" ? it.isTriggered : isTriggered
        ),
        isInProduction:
          typeof it.isInProduction === "boolean" ? it.isInProduction : false,
        doNumber: it.doNumber || "",
        delivered:
          typeof it.delivered === "boolean" ? it.delivered : false,
        targetDeliveryDate: it.targetDeliveryDate || null,
        completeDate: it.completeDate || null,
      };

      let saved;
      if (existing) {
        // update same doc
        Object.assign(existing, docData);
        saved = await existing.save();
      } else {
        saved = await WorkOrder.create(docData);
      }

      return res.status(201).json({
        success: true,
        message: "Work order created/updated successfully (single item)",
        data: saved,
      });
    }

    // ✅ CASE 2: Multiple items → A/B/C suffix ke saath alag-alag docs

    const bulkOps = items.map((it, index) => {
      if (!it.drawingId) {
        // skip invalid items silently or you can throw error
        return null;
      }

      const d = drawingMap.get(String(it.drawingId));

      // projectId & projectType resolve
      let projectId = d?.projectId || it.projectId || null;

      let projectType = it.projectType || d?.projectType || d?.quoteType || "cable_harness";
      if (projectType === "cable_assembly") projectType = "cable_harness";
      if (projectType === "box_Build_assembly") projectType = "box_build";
      if (!["cable_harness", "box_build", "other"].includes(projectType)) {
        projectType = "other";
      }

      const qty =
        typeof it.quantity === "number"
          ? it.quantity
          : typeof it.qty === "number"
            ? it.qty
            : 1;
      const uom = it.uom || "PCS";

      let finalCommitDate = it.commitDate
        ? new Date(it.commitDate)
        : headerCommitDate;

      let finalNeedDate = it.needDate ? new Date(it.needDate) : headerNeedDate;

      if (!finalNeedDate && finalCommitDate) {
        finalNeedDate = new Date(
          finalCommitDate.getTime() - 14 * 24 * 60 * 60 * 1000
        );
      }

      const lineWorkOrderNo = generateNextWorkOrderNo(workOrderNo, index);

      const updateDoc = {
        workOrderNo: lineWorkOrderNo,
        poNumber: poNumber || "",
        drawingId: it.drawingId,
        projectId,
        projectType,
        projectNo,
        posNo: it.posNo || index + 1,    // line no 1,2,3...
        quantity: qty,
        uom,
        remarks: it.remarks || "",
        needDate: finalNeedDate || null,
        commitDate: finalCommitDate || null,
        status: "No Progress Yet",
        isTriggered: Boolean(
          typeof it.isTriggered === "boolean" ? it.isTriggered : isTriggered
        ),
        isInProduction:
          typeof it.isInProduction === "boolean" ? it.isInProduction : false,
        doNumber: it.doNumber || "",
        delivered:
          typeof it.delivered === "boolean" ? it.delivered : false,
        targetDeliveryDate: it.targetDeliveryDate || null,
        completeDate: it.completeDate || null,
      };

      return {
        updateOne: {
          filter: { workOrderNo: lineWorkOrderNo }, // unique per line
          update: { $set: updateDoc },
          upsert: true,
        },
      };
    }).filter(Boolean);

    const bulkResult = await WorkOrder.bulkWrite(bulkOps);

    // saare naya/updated WO fetch karo jinke workOrderNo prefix same hai
    const regexp = new RegExp(`^${workOrderNo}-[A-Z]+$`);
    const finalDocs = await WorkOrder.find({
      $or: [{ workOrderNo: { $regex: regexp } }],
    })
      .sort({ workOrderNo: 1 })
      .lean();

    return res.status(201).json({
      success: true,
      message: "Work orders created/updated successfully (multi items with suffix)",
      meta: {
        matchedCount: bulkResult.matchedCount,
        modifiedCount: bulkResult.modifiedCount,
        upsertedCount: bulkResult.upsertedCount,
      },
      data: finalDocs,
    });
  } catch (error) {
    console.error("Create WorkOrder Error:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message });
  }
};


// Helper: projectType normalize
const normalizeProjectType = (raw) => {
  if (!raw) return "cable_harness";

  let t = String(raw).toLowerCase();

  if (t === "cable_assembly" || t === "cable-harness" || t === "cable harness") {
    return "cable_harness";
  }
  if (t === "box_build" || t === "box-build-assembly" || t === "box_build_assembly" || t === "box_build_assembly") {
    return "box_build";
  }

  if (["cable_harness", "box_build", "other"].includes(t)) {
    return t;
  }

  return "other";
};

export const updateWorkOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const body = { ...(req.body || {}) };

    // ❌ New schema me items array ka koi concept nahi
    // agar front-end galti se bhej de to ignore kar do
    if (Array.isArray(body.items)) {
      delete body.items;
    }

    // 🔹 1) Agar drawingId aa rahi hai ya change karni ho → Drawing se projectId/projectType nikalo
    if (body.drawingId) {
      try {
        const drawing = await Drawing.findById(body.drawingId).lean();

        if (drawing) {
          // Drawing se projectId
          if (drawing.projectId) {
            body.projectId = drawing.projectId;
          }

          // Drawing se projectType / quoteType
          const rawProjectType =
            body.projectType || drawing.projectType || drawing.quoteType;

          body.projectType = normalizeProjectType(rawProjectType);
        }
      } catch (e) {
        console.error("Drawing lookup failed in updateWorkOrder:", e);
        // fail mat karo, sirf log rakho
      }
    } else if (body.projectType) {
      // Sirf projectType aaya ho to bhi normalize kar do
      body.projectType = normalizeProjectType(body.projectType);
    }

    // 🔹 2) DATE NORMALIZATION
    if (body.commitDate) body.commitDate = new Date(body.commitDate);
    if (body.needDate) body.needDate = new Date(body.needDate);

    // needDate agar missing ho & commitDate hai → auto backfill
    backfillNeedDate(body);

    // 🔹 3) FINAL UPDATE (single flat WorkOrder document)
    const updated = await WorkOrder.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "WorkOrder not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Work order updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update WorkOrder Error:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message });
  }
};



/** ---------------- Update ---------------- */
// export const updateWorkOrder = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const body = { ...(req.body || {}) };

//     // Normalize/merge items if provided
//     if (Array.isArray(body.items)) {
//       body.items = mergeItems(body.items);
//     }

//     // date normalization
//     if (body.commitDate) body.commitDate = new Date(body.commitDate);
//     if (body.needDate) body.needDate = new Date(body.needDate);

//     backfillNeedDate(body);

//     const updated = await WorkOrder.findByIdAndUpdate(id, body, {
//       new: true,
//       runValidators: true,
//     });

//     if (!updated) {
//       return res.status(404).json({ success: false, message: 'WorkOrder not found' });
//     }

//     return res.status(200).json({
//       success: true,
//       message: 'Work order updated successfully',
//       data: updated,
//     });
//   } catch (error) {
//     console.error('Update WorkOrder Error:', error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };

// export const updateWorkOrder = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const body = { ...(req.body || {}) };

//     // 1) ITEMS MERGE + DRAWING LOOKUP
//     let mergedItems = [];
//     let resolvedProjectId = null;
//     let resolvedProjectType = "cable_assembly";

//     if (Array.isArray(body.items) && body.items.length > 0) {
//       // Merge items
//       mergedItems = mergeItems(body.items);

//       // 🔹 Collect drawingIds
//       const drawingIds = [
//         ...new Set(
//           mergedItems
//             .filter((it) => it.drawingId)
//             .map((it) => String(it.drawingId))
//         ),
//       ];

//       // 🔹 Fetch drawing data
//       let drawingMap = new Map();
//       if (drawingIds.length > 0) {
//         const drawingDocs = await Drawing.find({
//           _id: { $in: drawingIds },
//         }).lean();

//         drawingMap = new Map(
//           drawingDocs.map((d) => [String(d._id), d])
//         );
//       }

//       // 🔹 Inject projectId + projectType inside each item
//       mergedItems = mergedItems.map((it) => {
//         const d = drawingMap.get(String(it.drawingId));
//         const projectId = d?.projectId || null;
//         const projectType = d?.quoteType || null;

//         if (projectId && !resolvedProjectId) {
//           resolvedProjectId = projectId;
//         }
//         if (projectType && projectType !== resolvedProjectType) {
//           resolvedProjectType = projectType;
//         }

//         return {
//           ...it,
//           projectId,
//           projectType,
//         };
//       });

//       body.items = mergedItems;
//     }

//     // 2) DATE NORMALIZATION
//     if (body.commitDate) body.commitDate = new Date(body.commitDate);
//     if (body.needDate) body.needDate = new Date(body.needDate);

//     backfillNeedDate(body);

//     // 3) UPDATE ROOT FIELDS BASED ON items
//     if (resolvedProjectId) body.projectId = resolvedProjectId;
//     if (resolvedProjectType) body.projectType = resolvedProjectType;

//     // 4) FINAL UPDATE
//     const updated = await WorkOrder.findByIdAndUpdate(id, body, {
//       new: true,
//       runValidators: true,
//     });

//     if (!updated) {
//       return res
//         .status(404)
//         .json({ success: false, message: "WorkOrder not found" });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Work order updated successfully",
//       data: updated,
//     });
//   } catch (error) {
//     console.error("Update WorkOrder Error:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: error.message });
//   }
// };


// ---------------- Delete ----------------
export const deleteWorkOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const workOrder = await WorkOrder.findByIdAndDelete(id);
    if (!workOrder) return res.status(404).json({ success: false, message: "WorkOrder not found" });

    res.status(200).json({ success: true, message: "WorkOrder deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

function excelDateToJS(serial) {
  if (!serial || isNaN(serial)) return null;
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  const fractionalDay = serial - Math.floor(serial) + 0.0000001;
  let totalSeconds = Math.floor(86400 * fractionalDay);
  const seconds = totalSeconds % 60;
  totalSeconds -= seconds;
  const hours = Math.floor(totalSeconds / (60 * 60));
  const minutes = Math.floor(totalSeconds / 60) % 60;
  return new Date(
    dateInfo.getFullYear(),
    dateInfo.getMonth(),
    dateInfo.getDate(),
    hours,
    minutes,
    seconds
  );
}

// ✅ Helper: valid Date check
const isValidDate = (d) => d instanceof Date && !isNaN(d.getTime());

// ✅ Helper: safely parse Excel date (number / string / Date → Date | null)
const parseExcelDate = (raw) => {
  if (raw === undefined || raw === null || raw === "") return null;

  // If numeric → Excel serial date
  if (typeof raw === "number") {
    const d = excelDateToJS(raw); // <-- tumhara existing helper
    return isValidDate(d) ? d : null;
  }

  // Already Date
  if (raw instanceof Date) {
    return isValidDate(raw) ? raw : null;
  }

  // String or others → try native Date
  const d = new Date(raw);
  return isValidDate(d) ? d : null;
};

// ✅ Build a clean final message for skipped rows (grouped)
const buildSkippedSummary = (skippedRows = []) => {
  if (!skippedRows.length) return "";

  // group by reason
  const reasonMap = new Map(); // reason -> Set(drawingNo)
  for (const r of skippedRows) {
    const reason = r.reason || "Skipped";
    const d = (r.drawingNo || "").toString().trim();
    if (!reasonMap.has(reason)) reasonMap.set(reason, new Set());
    if (d) reasonMap.get(reason).add(d);
  }

  const parts = [];
  for (const [reason, set] of reasonMap.entries()) {
    const arr = Array.from(set);

    // limit long list (optional)
    const maxShow = 12;
    const shown = arr.slice(0, maxShow).join(" | ");
    const moreCount = arr.length - Math.min(arr.length, maxShow);

    const text = moreCount > 0
      ? `${shown} (+${moreCount} more) (${reason})`
      : `${shown} (${reason})`;

    parts.push(text);
  }

  return parts.join(" , ");
};

export const importWorkOrders = async (req, res) => {
  try {
    // ✅ 1) File validation
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const fileName = (req.file.originalname || "").toLowerCase();

    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      return res.status(400).json({
        success: false,
        message: "Only .xlsx / .xls files allowed",
      });
    }

    // ✅ 2) Read Excel
    const buffer = req.file.buffer || fs.readFileSync(req.file.path);

    const workbook = XLSX.read(buffer, { type: "buffer" });

    if (!workbook.SheetNames?.length) {
      return res.status(400).json({
        success: false,
        message: "Excel has no sheets",
      });
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
    });

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "Sheet is empty",
      });
    }

    console.log("🔍 Sample Rows:", rows.length);

    // ✅ 3) Existing WO combinations
    const existingWOs = await WorkOrder.find({})
      .select("workOrderNo poNumber posNo drawingId -_id")
      .lean();

    // ✅ Existing DB combinations
    const existingCombinationSet = new Set(
      existingWOs.map(
        (x) =>
          `${String(x.workOrderNo || "").trim()}__${String(
            x.poNumber || ""
          ).trim()}__${Number(x.posNo || 0)}__${String(x.drawingId || "")}`
      )
    );

    // ✅ Existing WO numbers
    const existingNos = existingWOs
      .map((x) => x.workOrderNo)
      .filter(Boolean);

    // ✅ Used WO numbers
    const usedWONumbers = new Set(existingNos);

    // ✅ Current import duplicate tracker
    const currentImportSet = new Set();

    let lastWorkOrderNo = existingNos.length
      ? existingNos[existingNos.length - 1]
      : null;

    const newWorkOrders = [];
    const skippedRows = [];

    // 🔹 helper: normalize projectType
    const normalizeProjectType = (raw) => {
      if (!raw) return "cable_harness";

      let v = String(raw).toLowerCase().trim();

      if (v === "c") return "cable_harness";
      if (v === "b") return "box_build";
      if (v === "o") return "other";

      if (
        v === "cable_harness" ||
        v === "cable-assembly" ||
        v === "cable_assembly" ||
        v === "cable harness"
      ) {
        return "cable_harness";
      }

      if (
        v === "box_build" ||
        v === "box-build" ||
        v === "box_build_assembly" ||
        v === "box-build-assembly"
      ) {
        return "box_build";
      }

      if (v === "other" || v === "others_assembly") {
        return "other";
      }

      return "other";
    };

    // ✅ 4) Process Excel Rows
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];

      const rowNumber = index + 2;

      try {
        // ----------------------------
        // Dates
        // ----------------------------
        const commitDate = parseExcelDate(row["Commit Date"]);

        let needDate = parseExcelDate(row["Need Date"]);

        if (!needDate && commitDate) {
          needDate = new Date(
            commitDate.getTime() - 14 * 24 * 60 * 60 * 1000
          );
        }

        // ----------------------------
        // Drawing
        // ----------------------------
        const drawingNo = row["Drawingno"]
          ?.toString()
          .trim();

        const drawing = drawingNo
          ? await Drawing.findOne({ drawingNo }).lean()
          : null;

        if (!drawing) {
          skippedRows.push({
            rowNumber,
            reason: "Drawing not found",
            drawingNo,
          });

          continue;
        }

        const drawingId = String(drawing._id);

        // ----------------------------
        // Project Type
        // ----------------------------
        const rawProjectType =
          drawing?.quoteType || null;

        const projectType =
          normalizeProjectType(rawProjectType);

        // ----------------------------
        // PO Number
        // ----------------------------
        const poNumber =
          row["PONO"]?.toString().trim() || "";

        // ----------------------------
        // POS NO
        // ----------------------------
        const posNo =
          Number(row["POSNO"]) || 0;

        // ----------------------------
        // Work Order No
        // ----------------------------
        const excelWO = row["WorkorderNo"]
          ? row["WorkorderNo"].toString().trim()
          : "";

        console.log("------excelWO", excelWO);

        let workOrderNo;

        if (excelWO) {
          workOrderNo = excelWO;
        } else {
          workOrderNo = generateWorkOrderNumber(
            lastWorkOrderNo || undefined
          );

          while (usedWONumbers.has(workOrderNo)) {
            workOrderNo =
              generateWorkOrderNumber(workOrderNo);
          }
        }

        // ✅ track generated WO
        usedWONumbers.add(workOrderNo);

        lastWorkOrderNo = workOrderNo;

        // ----------------------------
        // Duplicate Check
        // ----------------------------
        const combinationKey =
          `${workOrderNo}__${poNumber}__${posNo}__${drawingId}`;

        // ✅ Already exists in DB
        if (existingCombinationSet.has(combinationKey)) {
          skippedRows.push({
            rowNumber,
            reason:
              "Duplicate work order already exists",
            workOrderNo,
            poNumber,
            posNo,
          });

          continue;
        }

        // ✅ Duplicate inside same Excel
        if (currentImportSet.has(combinationKey)) {
          skippedRows.push({
            rowNumber,
            reason: "Duplicate row in Excel",
            workOrderNo,
            poNumber,
            posNo,
          });

          continue;
        }

        currentImportSet.add(combinationKey);

        // ----------------------------
        // Status Mapping
        // ----------------------------
        const rawStatus = (row["Status"] || "")
          .toString()
          .trim()
          .toLowerCase();

        let status = "No Progress Yet";

        if (
          rawStatus === "on hold" ||
          rawStatus === "hold"
        ) {
          status = "on_hold";
        } else if (
          rawStatus === "in production" ||
          rawStatus === "in progress" ||
          rawStatus === "processing"
        ) {
          status = "in_production";
        } else if (
          rawStatus === "completed" ||
          rawStatus === "done" ||
          rawStatus === "closed"
        ) {
          status = "completed";
        }

        // ----------------------------
        // Final WO Payload
        // ----------------------------
        const woDoc = {
          workOrderNo,
          poNumber,

          projectNo:
            row["ProjectNo"]?.toString().trim() || "",

          drawingId,

          projectId: drawing?.projectId || null,

          projectType,

          posNo,

          quantity:
            Number(row["Order_Qty"]) || 1,

          uom: "PCS",

          remarks:
            row["Description"]?.toString().trim() ||
            "",

          needDate,
          commitDate,

          status,

          isProductionComplete: false,
          isTriggered: false,
          isInProduction: false,
          delivered: false,
        };

        newWorkOrders.push(woDoc);
      } catch (rowError) {
        console.error(
          `❌ Row ${rowNumber} Error:`,
          rowError
        );

        skippedRows.push({
          rowNumber,
          reason: rowError.message,
        });
      }
    }

    // ✅ 5) Bulk Insert
    let inserted = [];

    if (newWorkOrders.length) {
      inserted = await WorkOrder.insertMany(
        newWorkOrders,
        {
          ordered: false, // ✅ continue even if some fail
        }
      );
    }

    return res.status(200).json({
      success: true,

      message: `Import completed successfully.
Imported: ${inserted.length}
Skipped: ${skippedRows.length}`,

      importedCount: inserted.length,

      skippedCount: skippedRows.length,

      skippedRows,

      data: inserted.map((x) => ({
        workOrderNo: x.workOrderNo,
        poNumber: x.poNumber,
        posNo: x.posNo,
        drawingId: x.drawingId,
        quantity: x.quantity,
        projectType: x.projectType,
      })),
    });
  } catch (error) {
    console.error("❌ Import Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during import",
      error: error.message,
    });
  }
};

// export const importWorkOrders = async (req, res) => {
//   try {
//     // ✅ 1) File validation
//     if (!req.file) {
//       return res
//         .status(400)
//         .json({ success: false, message: "No file uploaded" });
//     }

//     const fileName = (req.file.originalname || "").toLowerCase();
//     if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
//       return res.status(400).json({
//         success: false,
//         message: "Only .xlsx / .xls files allowed",
//       });
//     }

//     // ✅ 2) Read Excel
//     const buffer = req.file.buffer || fs.readFileSync(req.file.path);
//     const workbook = XLSX.read(buffer, { type: "buffer" });

//     if (!workbook.SheetNames?.length) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Excel has no sheets" });
//     }

//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

//     if (!rows.length) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Sheet is empty" });
//     }

//     console.log("🔍 Sample Row:", rows);

//     // ✅ 3) Existing WO numbers (uniqueness)
//     // const existingWOs = await WorkOrder.find({})
//     //   .select("workOrderNo poNumber -_id")
//     //   .lean();

//     const existingWOs = await WorkOrder.find({})
//   .select("workOrderNo poNumber posNo drawingId -_id")
//   .lean();

//   const existingCombinationSet = new Set(
//   existingWOs.map(
//     (x) =>
//       `${x.workOrderNo}__${x.poNumber}__${x.posNo}__${x.drawingId}`
//   )
// );

//     const existingNos = existingWOs.map((x) => x.workOrderNo).filter(Boolean);

//     // Ye set DB + current import — dono jagah ke sare WO nos track karega
//     // const usedWONumbers = new Set(existingNos);

//     // Same (WorkOrder No + PO NO) combo kitni baar aya hai
//     // key: `${baseWO}__${poNumber}`  → count
//     const excelDuplicateMap = new Map();

//     let lastWorkOrderNo = existingNos.length
//       ? existingNos[existingNos.length - 1]
//       : null;

//     const newWorkOrders = [];
//     const skippedRows = [];

//     // 🔹 helper: normalize projectType to schema enum
//     const normalizeProjectType = (raw) => {
//       if (!raw) return "cable_harness";

//       let v = String(raw).toLowerCase().trim();

//       // Excel C/B/O mapping
//       if (v === "c") return "cable_harness";
//       if (v === "b") return "box_build";
//       if (v === "o") return "other";

//       if (
//         v === "cable_harness" ||
//         v === "cable-assembly" ||
//         v === "cable_assembly" ||
//         v === "cable harness"
//       ) {
//         return "cable_harness";
//       }

//       if (
//         v === "box_build" ||
//         v === "box-build" ||
//         v === "box_build_assembly" ||
//         v === "box-build-assembly"
//       ) {
//         return "box_build";
//       }

//       if (v === "other" || v === "others_assembly") {
//         return "other";
//       }

//       return "other";
//     };

//     // ✅ 4) Loop through Excel rows
//     for (let index = 0; index < rows.length; index++) {
//       const row = rows[index];
//       const rowNumber = index + 2; // 1st row header row

//       // --- Commit Date ---
//       const commitDate = parseExcelDate(row["Commit Date"]);

//       // --- Need Date (fallback 14 days before commitDate) ---
//       let needDate = parseExcelDate(row["Need Date"]);
//       if (!needDate && commitDate) {
//         needDate = new Date(
//           commitDate.getTime() - 14 * 24 * 60 * 60 * 1000
//         );
//       }

//       // --- Drawing find by Drawingno ---
//       const drawingNo = row["Drawingno"]?.toString().trim();
//       const drawing = drawingNo
//         ? await Drawing.findOne({ drawingNo }).lean()
//         : null;

//       if (!drawing) {
//         // ❌ Drawing nahi mila → skip row
//         skippedRows.push({
//           rowNumber,
//           reason: "Drawing not found",
//           drawingNo,
//         });
//         continue;
//       }

//       const drawingId = drawing._id;

//       // --- ProjectType resolve (Drawing → Excel fallback)
//       const rawProjectType = drawing?.quoteType || null;
//       const projectType = normalizeProjectType(rawProjectType);

//       // --- PO Number string bana lo (trimmed)
//       const poNumber = row["PONO"]?.toString().trim() || "";

//       // --- Work Order No (Excel se ya auto) ---
//       // --- Work Order No (Excel se ya auto) ---
//       const excelWO = row["WorkorderNo"]
//         ? row["WorkorderNo"].toString().trim()
//         : "";

//       console.log('------excelWO', excelWO)

//       let workOrderNo;

//       if (excelWO) {
//         // ✅ Excel wala WO use karo
//         workOrderNo = excelWO;

//         // ✅ Agar duplicate hai to next WO generate karo
//         // while (usedWONumbers.has(workOrderNo)) {
//         //   workOrderNo = generateWorkOrderNumber(workOrderNo);
//         // }
//       } else {
//         // ✅ Agar Excel me nahi hai to auto generate karo
//         workOrderNo = generateWorkOrderNumber(
//           lastWorkOrderNo || undefined
//         );

//         // ✅ Safety duplicate check
//         while (usedWONumbers.has(workOrderNo)) {
//           workOrderNo = generateWorkOrderNumber(workOrderNo);
//         }
//       }

//       // ✅ mark as used
//       // usedWONumbers.add(workOrderNo);
//       lastWorkOrderNo = workOrderNo;

//       // --- UOM (Excel me nahi hai, default PCS) ---
//       const uom = "PCS";

//       // --- Excel Status mapping (optional)
//       const rawStatus = (row["Status"] || "").toString().trim().toLowerCase();
//       let status = "No Progress Yet"; // default

//       if (rawStatus === "on hold" || rawStatus === "hold") {
//         status = "on_hold";
//       } else if (
//         rawStatus === "in production" ||
//         rawStatus === "in progress" ||
//         rawStatus === "processing"
//       ) {
//         status = "in_production";
//       } else if (
//         rawStatus === "completed" ||
//         rawStatus === "done" ||
//         rawStatus === "closed"
//       ) {
//         status = "completed";
//       }

//       // ✅ FINAL FLAT WORK ORDER PAYLOAD
//       const woDoc = {
//         workOrderNo,
//         poNumber,
//         projectNo: row["ProjectNo"]?.toString().trim() || "",
//         drawingId,
//         projectId: drawing?.projectId || null,
//         projectType,
//         posNo: Number(row["POSNO"]) || 0,
//         quantity: Number(row["Order_Qty"]) || 1,
//         uom,
//         remarks: row["Description"]?.toString().trim() || "",
//         needDate,
//         commitDate,
//         status,
//         isTriggered: false,
//         isInProduction: false,
//       };

//       newWorkOrders.push(woDoc);
//     }

//     // ✅ 5) Bulk Insert only valid rows
//     let inserted = [];
//     if (newWorkOrders.length) {
//       inserted = await WorkOrder.insertMany(newWorkOrders, {
//         ordered: true,
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: buildSkippedSummary(skippedRows),
//       importedCount: inserted.length,
//       skippedCount: skippedRows.length,
//       skippedRows: skippedRows,
//       data: inserted.map((x) => ({
//         workOrderNo: x.workOrderNo,
//         drawingId: x.drawingId,
//         projectType: x.projectType,
//         quantity: x.quantity,
//       })),
//     });
//   } catch (error) {
//     console.error("❌ Import Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error during import",
//       error: error.message,
//     });
//   }
// };

export const exportWorkOrders = async (req, res) => {
  try {
    const {
      customerMode,
      customerId,
      filterMode,
      projectIds,
      drawingIds,
      posNos,
      workOrderNos,
      status
    } = req.query;



    const query = {};

    // 🔹 Customer filter
    if (customerMode === "customer" && customerId) {
      // 1️⃣ Find projects for customer
      const projectDocs = await Project.find(
        { customerId: customerId },
        { _id: 1 }
      ).lean();

      const customerProjectIds = projectDocs.map((p) => p._id);

      if (!customerProjectIds.length) {
        return res.status(404).json({
          success: false,
          message: "No projects found for selected customer",
        });
      }

      // 2️⃣ Apply projectId filter to WorkOrder
      query.projectId = { $in: customerProjectIds };
    }

    // 🔹 Filter modes
    if (filterMode === "project" && projectIds) {
      query.projectId = {
        $in: Array.isArray(projectIds) ? projectIds : [projectIds],
      };
    }

    if (filterMode === "drawing" && drawingIds) {
      query.drawingId = {
        $in: Array.isArray(drawingIds) ? drawingIds : [drawingIds],
      };
    }

    if (filterMode === "po" && posNos) {
      query.posNo = {
        $in: Array.isArray(posNos) ? posNos : [posNos],
      };
    }

    const rawStatus = req.query.status || req.query["status[]"];

    let statusArray = [];

    if (Array.isArray(rawStatus)) {
      statusArray = rawStatus;
    } else if (typeof rawStatus === "string") {
      statusArray = [rawStatus];
    }

    statusArray = statusArray.map((s) => s.trim());

    if (req.query.filterMode === "status" && statusArray.length) {
      query.status = { $in: statusArray };
    }

    if (filterMode === "wo" && workOrderNos) {
      query.workOrderNo = {
        $in: Array.isArray(workOrderNos) ? workOrderNos : [workOrderNos],
      };
    }

    // 🔹 FETCH FILTERED WORK ORDERS
    // const workOrders = await WorkOrder.find(query)
    //   .populate("drawingId", "drawingNo description")
    //   .populate("projectId", "projectName")
    //   .lean();

    const workOrders = await WorkOrder.find(query)
      .populate("drawingId", "drawingNo description")
      .populate("projectId", "projectName")
      .populate("processHistory.completedBy", "name fullName")
      .lean();

    if (!workOrders.length) {
      return res.status(404).json({
        success: false,
        message: "No work orders found for export",
      });
    }

    const getProdQty = (processHistory = []) => {
      const qc = processHistory.find(
        (p) => p.process === "quality_check"
      );
      return qc ? qc.qty || 0 : 0;
    };


    const formatDate = (d) =>
      d ? new Date(d).toLocaleDateString("en-GB") : "";

    const rows = workOrders.map((wo) => {
      const picking = getProcess(wo, "picking");
      const harness = getProcess(
        wo,
        "cable_harness"
      );
      const labelling = getProcess(
        wo,
        "labelling"
      );
      const qc = getProcess(
        wo,
        "quality_check"
      );

      // ✅ shortages from ALL process details
      const shortages = [];

      (wo.processHistory || []).forEach((ph) => {
        (ph.details || []).forEach((d) => {
          if (
            d.shortage === true ||
            Number(d.shortageQty || 0) > 0
          ) {
            shortages.push({
              qty: d.shortageQty || 0,
              mpn: d.mpn || "",
              manufacturer:
                d.manufacturer || "",
            });
          }
        });
      });

      const row = {
        "Imported_Date": formatDate(
          wo.createdAt
        ),

        "Project No": wo.projectNo || "",

        "WorkOrder No":
          wo.workOrderNo || "",

        "PO NO": wo.poNumber || "",

        "POS NO": wo.posNo || "",

        "Drawingno":
          wo.drawingId?.drawingNo || "",

        "Description":
          wo.drawingId?.description || "",

        "Actual_Qty": wo.quantity || 0,

        "Prod_Qty": qc.qty || 0,

        "Commit Date": formatDate(
          wo.commitDate
        ),

        "Need Date": formatDate(
          wo.needDate
        ),

        "Status": wo.status || "",

        "Remark": wo.remarks || "",

        // PICKING
        "PickerName": getUserName(
          picking
        ),

        "PickStartdate": formatDate(
          picking.createdAt
        ),

        "PickEnddate": formatDate(
          picking.completedAt
        ),

        "Picking ProduceQty":
          picking.qty || 0,

        // HARNESS
        "HarnessName": getUserName(
          harness
        ),

        "Harness Startdate":
          formatDate(harness.createdAt),

        "Harness Enddate":
          formatDate(
            harness.completedAt
          ),

        "Harness ProduceQty":
          harness.qty || 0,

        // LABELLING
        "Labeller Name":
          getUserName(labelling),

        "Labelling Startdate":
          formatDate(
            labelling.createdAt
          ),

        "Labelling Enddate":
          formatDate(
            labelling.completedAt
          ),

        "Labelling Produce Qty":
          labelling.qty || 0,

        // QC
        "QcName": getUserName(qc),

        "QcStartdate": formatDate(
          qc.createdAt
        ),

        "QcEnddate": formatDate(
          qc.completedAt
        ),

        "Qc Produce Qty": qc.qty || 0,
      };

      // ✅ dynamic shortage columns
      for (let i = 0; i < 12; i++) {
        const s = shortages[i];

        row[`Shortage${i + 1}`] =
          s?.qty || 0;

        row[`MPN No.${i + 1}`] =
          s?.mpn || "";

        row[`Manufacturer${i + 1}`] =
          s?.manufacturer || "";
      }

      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    ws["!cols"] = Object.keys(rows[0]).map(
      (k) => ({
        wch: Math.max(k.length + 5, 18),
      })
    );

    XLSX.utils.book_append_sheet(wb, ws, "WorkOrders");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="work_orders_export.xlsx"'
    );

    return res.end(buf);
  } catch (error) {
    console.error("Export Work Orders Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to export work orders",
      error: error.message,
    });
  }
};


// export const exportWorkOrders = async (req, res) => {
//   try {
//     const workOrders = await WorkOrder.find()
//       .populate("drawingId", "drawingNo")
//       .populate("projectId", "projectName")
//       .lean();

//     if (!workOrders.length) {
//       return res.status(404).json({
//         success: false,
//         message: "No work orders found to export",
//       });
//     }

//     const formatDate = (d) =>
//       d ? new Date(d).toLocaleDateString("en-GB") : "";

//     const rows = workOrders.map((wo) => ({
//       Imported_Date: "",

//       "Project No": wo.projectNo || wo.projectId?.projectName || "",
//       "WorkOrder No": wo.workOrderNo || "",
//       "PO NO": wo.poNumber || "",
//       "POS NO": wo.posNo || "",
//       Drawingno: wo.drawingId?.drawingNo || "",
//       Description: wo.remarks || "",
//       Order_Qty: wo.quantity || "",
//       Prod_Qty: wo.quantity || "",
//       "Commit Date": formatDate(wo.commitDate),
//       "Need Date": formatDate(wo.needDate),
//       Status: wo.status || "",
//       Remark: wo.remarks || "",

//       // Picking stage
//       PickerName: wo.pickerName || "",
//       PickStartdate: formatDate(wo.pickStartdate),
//       PickEnddate: formatDate(wo.pickEnddate),
//       ProduceQty: wo.pickProduceQty || "",

//       // Harness stage
//       HarnessName: wo.harnessName || "",
//       "Harness Startdate": formatDate(wo.harnessStartdate),
//       "Harness Enddate": formatDate(wo.harnessEnddate),
//       "ProduceQty#2": wo.harnessProduceQty || "",

//       // Labelling stage
//       "Labeller Name": wo.labellerName || "",
//       "Labelling Startdate": formatDate(wo.labellingStartdate),
//       "Labelling Enddate": formatDate(wo.labellingEnddate),
//       "Produce Qty#3": wo.labellingProduceQty || "",

//       // QC stage
//       QcName: wo.qcName || "",
//       QcStartdate: formatDate(wo.qcStartdate),
//       QcEtartdate: formatDate(wo.qcEnddate),
//       "Produce Qty#4": wo.qcProduceQty || "",

//       // Shortage 1–12 (Each 3 columns)
//       Shortage1: wo.shortage1 || "",
//       "MPN No._1": wo.mpn1 || "",
//       Manufacturer_1: wo.mfg1 || "",

//       Shortage2: wo.shortage2 || "",
//       "MPN No._2": wo.mpn2 || "",
//       Manufacturer_2: wo.mfg2 || "",

//       Shortage3: wo.shortage3 || "",
//       "MPN No._3": wo.mpn3 || "",
//       Manufacturer_3: wo.mfg3 || "",

//       Shortage4: wo.shortage4 || "",
//       "MPN No._4": wo.mpn4 || "",
//       Manufacturer_4: wo.mfg4 || "",

//       Shortage5: wo.shortage5 || "",
//       "MPN No._5": wo.mpn5 || "",
//       Manufacturer_5: wo.mfg5 || "",

//       Shortage6: wo.shortage6 || "",
//       "MPN No._6": wo.mpn6 || "",
//       Manufacturer_6: wo.mfg6 || "",

//       Shortage7: wo.shortage7 || "",
//       "MPN No._7": wo.mpn7 || "",
//       Manufacturer_7: wo.mfg7 || "",

//       Shortage8: wo.shortage8 || "",
//       "MPN No._8": wo.mpn8 || "",
//       Manufacturer_8: wo.mfg8 || "",

//       Shortage9: wo.shortage9 || "",
//       "MPN No._9": wo.mpn9 || "",
//       Manufacturer_9: wo.mfg9 || "",

//       Shortage10: wo.shortage10 || "",
//       "MPN No._10": wo.mpn10 || "",
//       Manufacturer_10: wo.mfg10 || "",

//       Shortage11: wo.shortage11 || "",
//       "MPN No._11": wo.mpn11 || "",
//       Manufacturer_11: wo.mfg11 || "",

//       Shortage12: wo.shortage12 || "",
//       "MPN No._12": wo.mpn12 || "",
//       Manufacturer_12: wo.mfg12 || "",
//     }));

//     const wb = XLSX.utils.book_new();
//     const ws = XLSX.utils.json_to_sheet(rows);

//     ws["!cols"] = Object.keys(rows[0]).map((h) => ({
//       wch: Math.max(12, h.length + 2),
//     }));

//     XLSX.utils.book_append_sheet(wb, ws, "WorkOrders");

//     const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

//     res.setHeader(
//       "Content-Type",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//     );
//     res.setHeader(
//       "Content-Disposition",
//       'attachment; filename="work_orders_export.xlsx"'
//     );

//     return res.end(buf);
//   } catch (error) {
//     console.error("Export Work Orders Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to export work orders",
//       error: error.message,
//     });
//   }
// };


// export const importWorkOrders = async (req, res) => {
//   try {
//     // ✅ 1) File validation
//     if (!req.file) {
//       return res
//         .status(400)
//         .json({ success: false, message: "No file uploaded" });
//     }

//     const fileName = (req.file.originalname || "").toLowerCase();
//     if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
//       return res.status(400).json({
//         success: false,
//         message: "Only .xlsx / .xls files allowed",
//       });
//     }

//     // ✅ 2) Read Excel
//     const buffer = req.file.buffer || fs.readFileSync(req.file.path);
//     const workbook = XLSX.read(buffer, { type: "buffer" });

//     if (!workbook.SheetNames?.length) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Excel has no sheets" });
//     }

//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

//     if (!rows.length) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Sheet is empty" });
//     }

//     console.log("🔍 Sample Row:", rows[0]);

//     // ✅ 3) Existing WO numbers (uniqueness) + lastWorkOrderNo
//     const existingWOs = await WorkOrder.find({})
//       .select("workOrderNo poNumber -_id")
//       .lean();

//        // Build hashMap for quick duplicate checking
//     const comboMap = new Set(
//       existingWOs.map((x) => `${x.workOrderNo}__${x.poNumber}`)
//     );

//     const existingNos = existingWOs.map((x) => x.workOrderNo).filter(Boolean);

//     let lastWorkOrderNo = existingNos.length
//       ? existingNos[existingNos.length - 1]
//       : null;

//     const newWorkOrders = [];
//     const skippedRows = [];

//     // 🔹 helper: normalize projectType to schema enum
//     const normalizeProjectType = (raw) => {
//       if (!raw) return "cable_harness";

//       let v = String(raw).toLowerCase().trim();

//       // Excel C/B/O mapping
//       if (v === "c") return "cable_harness";
//       if (v === "b") return "box_build";
//       if (v === "o") return "other";

//       if (
//         v === "cable_harness" ||
//         v === "cable-assembly" ||
//         v === "cable_assembly" ||
//         v === "cable harness"
//       ) {
//         return "cable_harness";
//       }

//       if (
//         v === "box_build" ||
//         v === "box-build" ||
//         v === "box_build_assembly" ||
//         v === "box-build-assembly"
//       ) {
//         return "box_build";
//       }

//       if (v === "other" || v === "others_assembly") {
//         return "other";
//       }

//       return "other";
//     };

//     // ✅ 4) Loop through Excel rows
//     for (let index = 0; index < rows.length; index++) {
//       const row = rows[index];
//       const rowNumber = index + 2; // 1st row header

//       // --- Commit Date ---
//       const commitDate =
//         typeof row["Commit Date"] === "number"
//           ? excelDateToJS(row["Commit Date"])
//           : row["Commit Date"]
//             ? new Date(row["Commit Date"])
//             : null;

//       // --- Need Date (fallback 14 din pehle) ---
//       const needDate = row["Need Date"]
//         ? new Date(row["Need Date"])
//         : commitDate
//           ? new Date(
//             commitDate.getTime() - 14 * 24 * 60 * 60 * 1000
//           )
//           : null;

//       // --- Drawing find by Drawingno ---
//       const drawingNo = row.Drawingno?.toString().trim();
//       const drawing = drawingNo
//         ? await Drawing.findOne({ drawingNo }).lean()
//         : null;

//       if (!drawing) {
//         // ❌ Drawing nahi mila → skip
//         skippedRows.push({
//           rowNumber,
//           reason: "Drawing not found",
//           drawingNo,
//         });
//         continue;
//       }

//       const drawingId = drawing._id;

//       // --- ProjectType resolve (Drawing → Excel fallback) ---
//       const rawProjectType =
//         drawing?.quoteType || row["Prod Type-C/B/O"] || null;
//       const projectType = normalizeProjectType(rawProjectType);

//       // --- Work Order No (Excel se ya auto) ---
//       const excelWO = row.WorkorderNo?.toString().trim();
//       let workOrderNo;

//       if (excelWO && !existingNos.includes(excelWO)) {
//         workOrderNo = excelWO;
//       } else {
//         // auto-generate based on lastWorkOrderNo helper
//         workOrderNo = generateWorkOrderNumber(lastWorkOrderNo);
//       }

//       // Duplicate se bachne ke liye local list update
//       existingNos.push(workOrderNo);
//       lastWorkOrderNo = workOrderNo;

//       // --- UOM (agar hai) ---
//       const uom =
//         row.UOM?.toString().trim() ||
//         row["UOM"]?.toString().trim() ||
//         "PCS";

//       // ✅ FINAL FLAT WORK ORDER PAYLOAD (NO items ARRAY)
//       const woDoc = {
//         workOrderNo,
//         poNumber: row.PONO?.toString().trim() || "",
//         drawingId,
//         projectId: drawing?.projectId || null,
//         projectType,
//         posNo: Number(row.POSNO) || 0,
//         quantity: Number(row.Prod_Qty) || 1,
//         uom,
//         remarks: row.Description?.trim() || "",
//         needDate,
//         commitDate,
//         status: "on_hold",
//         isTriggered: false,
//         isInProduction: false,
//       };

//       newWorkOrders.push(woDoc);
//     }

//     // ✅ 5) Bulk Insert only valid rows
//     let inserted = [];
//     if (newWorkOrders.length) {
//       inserted = await WorkOrder.insertMany(newWorkOrders, {
//         ordered: true,
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: `Imported ${inserted.length} Work Orders. Skipped ${skippedRows.length} rows.`,
//       importedCount: inserted.length,
//       skippedCount: skippedRows.length,
//       skippedRows,
//       data: inserted.map((x) => ({
//         workOrderNo: x.workOrderNo,
//         drawingId: x.drawingId,
//         projectType: x.projectType,
//         quantity: x.quantity,
//       })),
//     });
//   } catch (error) {
//     console.error("❌ Import Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error during import",
//       error: error.message,
//     });
//   }
// };


// export const exportWorkOrders = async (req, res) => {
//   try {
//     // Fetch all WorkOrders (flat schema)
//     const workOrders = await WorkOrder.find()
//       .populate("drawingId", "drawingNo")
//       .populate("projectId", "projectName")
//       .lean();

//     if (!workOrders.length) {
//       return res.status(404).json({
//         success: false,
//         message: "No work orders found to export",
//       });
//     }

//     // Build rows (1 ROW PER WORK ORDER)
//     const rows = workOrders.map((wo) => ({
//       WorkOrderNo: wo.workOrderNo || "",
//       PO_Number: wo.poNumber || "",
//       ProjectName: wo.projectId?.projectName || "",
//       ProjectType: wo.projectType || "",
//       DrawingNo: wo.drawingId?.drawingNo || "",
//       POS_No: wo.posNo || "",
//       Quantity: wo.quantity ?? "",
//       UOM: wo.uom || "",
//       Remarks: wo.remarks || "",
//       NeedDate: wo.needDate
//         ? new Date(wo.needDate).toLocaleDateString("en-GB")
//         : "",
//       CommitDate: wo.commitDate
//         ? new Date(wo.commitDate).toLocaleDateString("en-GB")
//         : "",
//       Status: wo.status || "",
//       IsTriggered: wo.isTriggered ? "Yes" : "No",
//       IsInProduction: wo.isInProduction ? "Yes" : "No",
//       DONumber: wo.doNumber || "",
//       Delivered: wo.delivered ? "Yes" : "No",
//     }));

//     // Prepare Excel
//     const wb = XLSX.utils.book_new();
//     const ws = XLSX.utils.json_to_sheet(rows);

//     // Auto column width
//     const headers = Object.keys(rows[0]);
//     ws["!cols"] = headers.map((h) => ({
//       wch: Math.max(12, h.length + 2),
//     }));

//     XLSX.utils.book_append_sheet(wb, ws, "WorkOrders");

//     const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

//     // Final response
//     res.status(200);
//     res.setHeader(
//       "Content-Type",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//     );
//     res.setHeader(
//       "Content-Disposition",
//       'attachment; filename="work_orders_export.xlsx"'
//     );
//     res.setHeader("Content-Length", buf.length);

//     return res.end(buf);
//   } catch (error) {
//     console.error("Export Work Orders Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to export work orders",
//       error: error.message,
//     });
//   }
// };


// export const importWorkOrders = async (req, res) => {
//   try {
//     // ✅ Step 1: File validation
//     if (!req.file) {
//       return res
//         .status(400)
//         .json({ success: false, message: "No file uploaded" });
//     }

//     const fileName = (req.file.originalname || "").toLowerCase();
//     if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
//       return res.status(400).json({
//         success: false,
//         message: "Only .xlsx / .xls files allowed",
//       });
//     }

//     // ✅ Step 2: Read Excel
//     const buffer = req.file.buffer || fs.readFileSync(req.file.path);
//     const workbook = XLSX.read(buffer, { type: "buffer" });

//     if (!workbook.SheetNames?.length) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Excel has no sheets" });
//     }

//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

//     if (!rows.length) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Sheet is empty" });
//     }

//     console.log("🔍 Sample Row:", rows[0]);

//     // ✅ Step 3: Get all existing WO numbers (for uniqueness) + lastWorkOrderNo
//     const existingWOs = await WorkOrder.find({})
//       .select("workOrderNo -_id")
//       .lean();

//     const existingNos = existingWOs.map((x) => x.workOrderNo).filter(Boolean);

//     // Last used WO no (for generator). Agar nahi mila to null.
//     let lastWorkOrderNo = existingNos.length
//       ? existingNos[existingNos.length - 1]
//       : null;

//     const newWorkOrders = [];
//     const skippedRows = []; // ← jinka data match nahi hua / skip kiya

//     // ✅ Step 4: Loop through Excel rows
//     for (let index = 0; index < rows.length; index++) {
//       const row = rows[index];
//       const rowNumber = index + 2; // assuming row 1 = header

//       // --- Convert Excel date -> commitDate ---
//       const commitDate =
//         typeof row["Commit Date"] === "number"
//           ? excelDateToJS(row["Commit Date"])
//           : row["Commit Date"]
//           ? new Date(row["Commit Date"])
//           : null;

//       const needDate = row["Need Date"]
//         ? new Date(row["Need Date"])
//         : commitDate
//         ? new Date(commitDate.getTime() - 14 * 24 * 60 * 60 * 1000)
//         : null;

//       // --- Convert Prod Type ---
//       let projectType = "others_assembly";
//       if (row["Prod Type-C/B/O"] === "C") projectType = "cable_assembly";
//       if (row["Prod Type-C/B/O"] === "B") projectType = "box_Build_assembly";
//       if (row["Prod Type-C/B/O"] === "O") projectType = "others_assembly";

//       // --- Find Drawing ---
//       const drawingNo = row.Drawingno?.toString().trim();
//       const drawing = drawingNo
//         ? await Drawing.findOne({ drawingNo }).lean()
//         : null;

//       if (!drawing) {
//         // ❌ Drawing match nahi mila → is row ko skip karo
//         skippedRows.push({
//           rowNumber,
//           reason: "Drawing not found",
//           drawingNo,
//         });
//         continue; // 🔴 skip this row
//       }

//       const drawingId = drawing._id;

//       // --- Work Order No (Excel se ya auto) ---
//       const excelWO = row.WorkorderNo?.toString().trim();
//       let workOrderNo;

//       if (excelWO && !existingNos.includes(excelWO)) {
//         workOrderNo = excelWO;
//       } else {
//         // auto-generate based on lastWorkOrderNo
//         workOrderNo = generateWorkOrderNumber(lastWorkOrderNo);
//       }

//       // Track used numbers so that import batch me duplicate na bane
//       existingNos.push(workOrderNo);
//       lastWorkOrderNo = workOrderNo;

//       // --- Build Item ---
//       const item = {
//         drawingId,
//         projectType:drawing?.quoteType,
//         projectId:drawing?.projectId,
//         posNo: Number(row.POSNO) || 0,
//         quantity: Number(row.Prod_Qty) || 1,
//         remarks: row.Description?.trim() || "",
//         status: "open",
//       };

//       // --- Build Work Order Payload (matching createWorkOrder format) ---
//       const woPayload = {
//         workOrderNo,
//         // projectNo: row.ProjectNo?.toString().trim() || "",
//         poNumber: row.PONO?.toString().trim() || "",
//         // projectType,
//         commitDate,
//         needDate,
//         status: "on_hold",
//         isTriggered: false,
//         items: [item],
//       };

//       newWorkOrders.push(woPayload);
//     }

//     // ✅ Step 5: Bulk Insert only valid rows
//     let inserted = [];
//     if (newWorkOrders.length) {
//       inserted = await WorkOrder.insertMany(newWorkOrders, {
//         ordered: true, // agar koi fail ho to yahi ruk jayega – but humne data pre-validate kar liya hai
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: `Imported ${inserted.length} Work Orders. Skipped ${skippedRows.length} rows.`,
//       importedCount: inserted.length,
//       skippedCount: skippedRows.length,
//       skippedRows,
//       data: inserted.map((x) => ({
//         workOrderNo: x.workOrderNo,
//         projectNo: x.projectNo,
//         projectType: x.projectType,
//       })),
//     });
//   } catch (error) {
//     console.error("❌ Import Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error during import",
//       error: error.message,
//     });
//   }
// };


// export const importWorkOrders = async (req, res) => {
//   try {
//     // ✅ Step 1: File validation
//     if (!req.file)
//       return res.status(400).json({ success: false, message: "No file uploaded" });

//     const fileName = (req.file.originalname || "").toLowerCase();
//     if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls"))
//       return res.status(400).json({ success: false, message: "Only .xlsx / .xls files allowed" });

//     // ✅ Step 2: Read Excel
//     const buffer = req.file.buffer || fs.readFileSync(req.file.path);
//     const workbook = XLSX.read(buffer, { type: "buffer" });
//     if (!workbook.SheetNames?.length)
//       return res.status(400).json({ success: false, message: "Excel has no sheets" });

//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
//     if (!rows.length)
//       return res.status(400).json({ success: false, message: "Sheet is empty" });

//     console.log("🔍 Sample Row:", rows[0]);

//     // ✅ Step 3: Get all existing WO numbers
//     const existingWOs = await WorkOrder.find({}).select("workOrderNo -_id");
//     const existingNos = existingWOs.map((x) => x.workOrderNo);

//     const newWorkOrders = [];

//     // ✅ Step 4: Loop through Excel rows
//     for (const row of rows) {
//       // --- Convert Excel date ---
//       const commitDate =
//         typeof row["Commit Date"] === "number"
//           ? excelDateToJS(row["Commit Date"])
//           : row["Commit Date"]
//             ? new Date(row["Commit Date"])
//             : null;

//       const needDate =
//         row["Need Date"]
//           ? new Date(row["Need Date"])
//           : commitDate
//             ? new Date(commitDate.getTime() - 14 * 24 * 60 * 60 * 1000)
//             : null;

//       // --- Convert Prod Type ---
//       let projectType = "others_assembly";
//       if (row["Prod Type-C/B/O"] === "C") projectType = "cable_assembly";
//       if (row["Prod Type-C/B/O"] === "B") projectType = "box_Build_assembly";
//       if (row["Prod Type-C/B/O"] === "O") projectType = "others_assembly";

//       // --- Find Drawing ---
//       const drawingNo = row.Drawingno?.toString().trim();
//       const drawing = await Drawing.findOne({ drawingNo });
//       const drawingId = drawing?._id || null;

//       // --- Work Order No ---
//       // const excelWO = row.WorkorderNo?.toString().trim();
//       // const workOrderNo =
//       //   excelWO && !existingNos.includes(excelWO)
//       //     ? excelWO
//       //     : generateWorkOrderNumber(existingNos);
//       // existingNos.push(workOrderNo);

//       const lastWorkOrder = await WorkOrder.findOne()
//       .sort({ createdAt: -1 })
//       .select("workOrderNo")
//       .lean();

//           const lastWorkOrderNo = lastWorkOrder ? lastWorkOrder.workOrderNo : null;

//       // --- Build Item ---
//       const item = {
//         drawingId,
//         posNo: Number(row.POSNO) || 0,
//         quantity: Number(row.Prod_Qty) || 1,
//         remarks: row.Description?.trim() || "",
//         status: "open",
//       };

//       // --- Build Work Order Payload (matching createWorkOrder format) ---
//       const woPayload = {
//         workOrderNo:generateWorkOrderNumber(lastWorkOrderNo),
//         projectNo: row.ProjectNo?.toString().trim() || "",
//         poNumber: row.PONO?.toString().trim() || "",
//         projectType,
//         commitDate,
//         needDate,
//         status: "on_hold",
//         isTriggered: false,
//         items: [item],
//       };

//       newWorkOrders.push(woPayload);
//     }

//     // ✅ Step 5: Bulk Insert (createWorkOrder compatible)
//     const inserted = await WorkOrder.insertMany(newWorkOrders, { ordered: true });

//     res.status(200).json({
//       success: true,
//       message: `✅ Imported ${inserted.length} Work Orders successfully.`,
//       data: inserted.map((x) => ({
//         workOrderNo: x.workOrderNo,
//         projectNo: x.projectNo,
//         projectType: x.projectType,
//       })),
//     });
//   } catch (error) {
//     console.error("❌ Import Error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error during import",
//       error: error.message,
//     });
//   }
// };




// ---------------- Export ----------------


// export const exportWorkOrders = async (req, res) => {
//   try {
//     // populate drawing number if you store ref in items.drawingId
//     const workOrders = await WorkOrder.find()
//       .populate("items.drawingId", "drawingNo")
//       .lean();

//     // Build flat rows; also output a row even if items is empty
//     const rows = [];
//     for (const wo of workOrders) {
//       if (Array.isArray(wo.items) && wo.items.length) {
//         for (const it of wo.items) {
//           rows.push({
//             WorkOrderNo: wo.workOrderNo || "",
//             ProjectNo: wo.projectNo || "",
//             ProjectName: wo.projectId?.projectName || "",
//             PO_Number: wo.poNumber || "",
//             ProjectType: wo.projectType || "",
//             NeedDate: wo.needDate ? new Date(wo.needDate).toLocaleDateString("en-GB") : "",
//             CommitDate: wo.commitDate ? new Date(wo.commitDate).toLocaleDateString("en-GB") : "",
//             Status: wo.status || "",
//             DrawingNo: it?.drawingId?.drawingNo || "",   // populated above
//             POS_No: it?.posNo || "",
//             Quantity: it?.quantity ?? "",
//             UOM: it?.uom || "",
//             Remarks: it?.remarks || "",
//             Item_Status: it?.status || "",
//           });
//         }
//       } else {
//         rows.push({
//           WorkOrderNo: wo.workOrderNo || "",
//           ProjectNo: wo.projectNo || "",
//           ProjectName: wo.projectId?.projectName || "",
//           PO_Number: wo.poNumber || "",
//           ProjectType: wo.projectType || "",
//           NeedDate: wo.needDate ? new Date(wo.needDate).toLocaleDateString("en-GB") : "",
//           CommitDate: wo.commitDate ? new Date(wo.commitDate).toLocaleDateString("en-GB") : "",
//           Status: wo.status || "",
//           DrawingNo: "",
//           POS_No: "",
//           Quantity: "",
//           UOM: "",
//           Remarks: "",
//           Item_Status: "",
//         });
//       }
//     }

//     if (rows.length === 0) {
//       return res.status(404).json({ success: false, message: "No work orders found to export" });
//     }

//     const wb = XLSX.utils.book_new();
//     const ws = XLSX.utils.json_to_sheet(rows);

//     // Optional: column widths
//     const headers = Object.keys(rows[0]);
//     ws["!cols"] = headers.map(h => ({ wch: Math.max(12, h.length + 2) }));

//     XLSX.utils.book_append_sheet(wb, ws, "WorkOrders");

//     // Write Node buffer and send as binary
//     const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

//     res.status(200);
//     res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
//     res.setHeader("Content-Disposition", 'attachment; filename="work_orders_export.xlsx"');
//     res.setHeader("Content-Length", buf.length);
//     return res.end(buf);
//   } catch (error) {
//     console.error("Export Work Orders Error:", error);
//     return res.status(500).json({ success: false, message: "Failed to export work orders", error: error.message });
//   }
// };

export const updateDeliveryInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const { doNumber, delivered } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Work Order ID is required",
      });
    }

    const updateData = {};
    if (doNumber !== undefined) updateData.doNumber = doNumber.trim();
    if (delivered !== undefined) updateData.delivered = delivered;

    const updated = await WorkOrder.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Work order not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Delivery info updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update Delivery Info Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update delivery info",
      error: error.message,
    });
  }
};

async function fetchDeliveryOrdersForExport(query) {
  const { search = "", status, customer, project, dateFrom, dateTo } = query || {};

  const match = { isDeleted: { $ne: true } };
  if (search) {
    match.$or = [
      { workOrderNo: { $regex: search, $options: "i" } },
      { poNumber: { $regex: search, $options: "i" } },
      { posNumber: { $regex: search, $options: "i" } },
    ];
  }
  if (status) match.status = status;
  if (dateFrom || dateTo) {
    match.createdAt = {};
    if (dateFrom) match.createdAt.$gte = new Date(dateFrom);
    if (dateTo) match.createdAt.$lte = new Date(dateTo);
  }

  const pipeline = [
    { $match: match },
    { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "drawings",
        localField: "items.drawingId",
        foreignField: "_id",
        as: "drawingDoc",
      },
    },
    { $unwind: { path: "$drawingDoc", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "projects",
        localField: "drawingDoc.projectId",
        foreignField: "_id",
        as: "projectDoc",
      },
    },
    { $unwind: { path: "$projectDoc", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "customers",
        localField: "projectDoc.customerId",
        foreignField: "_id",
        as: "customerDoc",
      },
    },
    { $unwind: { path: "$customerDoc", preserveNullAndEmptyArrays: true } },

    ...(project
      ? [{ $match: { "projectDoc._id": new mongoose.Types.ObjectId(project) } }]
      : []),
    ...(customer
      ? [{ $match: { "customerDoc._id": new mongoose.Types.ObjectId(customer) } }]
      : []),

    {
      $addFields: {
        displayPONumber: { $ifNull: ["$poNumber", "$posNumber"] },
        displayCompletedDate: { $ifNull: ["$items.completedDate", "$completedAt"] },
        displayTargetDelivery: { $ifNull: ["$items.targetDeliveryDate", "$commitDate"] },
        displayStatus: {
          $cond: [
            { $ifNull: ["$displayCompletedDate", false] },
            "Completed",
            { $ifNull: ["$status", "Pending"] },
          ],
        },
      },
    },
    {
      $project: {
        workOrderNo: 1,
        drawingNumber: "$drawingDoc.drawingNumber",
        projectName: "$projectDoc.projectName",
        customerName: "$customerDoc.companyName",
        qty: { $ifNull: ["$items.qty", 0] },
        poNumber: "$displayPONumber",
        completedDate: "$displayCompletedDate",
        targetDeliveryDate: "$displayTargetDelivery",
        status: "$displayStatus",
        doNumber: 1,
        delivered: 1,
      },
    },
    { $sort: { createdAt: -1 } },
  ];

  const rows = await WorkOrder.aggregate(pipeline);

  const toDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "");

  return rows.map((r) => ({
    "Work Order No": r.workOrderNo,
    "Drawing No": r.drawingNumber,
    "Project": r.projectName,
    "Customer": r.customerName,
    "Qty": r.qty,
    "PO Number": r.poNumber,
    "Completed Date": toDate(r.completedDate),
    "Target Delivery": toDate(r.targetDeliveryDate),
    "Status": r.status,
    "DO No.": r.doNumber || "",
    "Delivered": r.delivered ? "Yes" : "No",
  }));
}


// Excel export delivery
export const exportDeliveryWorkOrdersXlsx = async (req, res) => {
  try {
    const { ids = [] } = req.body || {};

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one Work Order",
      });
    }

    // ✅ fetch selected workorders
    const workOrders = await WorkOrder.find({ _id: { $in: ids } })
      .select("_id drawingId workOrderNo doNumber projectId posNo quantity targetDeliveryDate completeDate poNumber")
      .populate("projectId", "projectName")
      .populate("drawingId", "drawingNo description")
      .lean();

    if (!workOrders.length) {
      return res.status(404).json({ success: false, message: "No work orders found" });
    }

    // ✅ deliverTo (first workorder -> drawing -> customer) (optional info)
    let deliverTo = {};
    const firstWO = workOrders[0];

    if (firstWO?.drawingId) {
      const drawing = await Drawing.findById(firstWO.drawingId)
        .select("customerId customer customerRef")
        .lean();

      const customerId = drawing?.customerId || drawing?.customer || drawing?.customerRef;

      if (customerId) {
        const customer = await Customer.findById(customerId)
          .select("companyName name contactPerson paymentTerms address")
          .lean();

        const addrObj = customer?.address || {};
        const companyName = customer?.companyName || customer?.name || "";
        const attn = customer?.contactPerson || "";

        const line1 =
          addrObj?.line1 || addrObj?.addressLine1 || addrObj?.street || "";
        const line2 =
          addrObj?.line2 || addrObj?.addressLine2 || "";
        const city = addrObj?.city || "";
        const state = addrObj?.state || "";
        const country = addrObj?.country || "";
        const postal = addrObj?.postalCode || addrObj?.pincode || "";

        deliverTo = {
          customer: companyName,
          attn,
          address1: addrObj,
          terms: customer?.paymentTerms || "",
        };
      }
    }

    // ✅ clean export rows (same as your UI columns)
    const rows = workOrders.map((r) => ({
      "Work Order No": r.workOrderNo || "",
      "Drawing No": r?.drawingId?.drawingNo || r.drawingName || "",
      Project: r?.projectId?.projectName || "",
      Customer: r.customerName || deliverTo.customer || "",
      Qty: r.quantity ?? r.qty ?? 0,
      "PO Number": r.poNumber || "",
      Completed: r.completeDate ? new Date(r.completeDate).toLocaleDateString("en-GB") : "",
      "Target Delivery": r.targetDeliveryDate ? new Date(r.targetDeliveryDate).toLocaleDateString("en-GB") : "",
      Status: r.status || "",
      "DO No.": r.doNumber || "",
      Delivered: r.delivered ? "Yes" : "No",
    }));

    // ✅ workbook + sheet
    const wb = XLSX.utils.book_new();

    // Sheet 1: Delivery Orders
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Delivery Orders");

    // Sheet 2: Deliver To (optional but useful)
    const ws2 = XLSX.utils.json_to_sheet([deliverTo || {}]);
    XLSX.utils.book_append_sheet(wb, ws2, "Deliver To");

    // ✅ buffer output
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const fileName = `delivery_orders_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (error) {
    console.error("exportDeliveryWorkOrdersXlsx error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportDeliveryWorkOrdersPDF = async (req, res) => {
  try {
    const { ids = [] } = req.body || {};

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one Work Order",
      });
    }

    // ✅ fetch selected workorders (only fields needed)
    const workOrders = await WorkOrder.find({ _id: { $in: ids } })
      .select("_id drawingId workOrderNo doNumber projectId posNo quantity completeDate poNumber")
      .populate("projectId", "projectName")
      .populate("drawingId", "drawingNo description")
      .lean();

    if (!workOrders.length) {
      return res.status(404).json({ success: false, message: "No work orders found" });
    }

    // ✅ use first workorder to determine DeliverTo
    const firstWO = workOrders[0];

    let deliverTo = {
      name: "",
      line1: "",
      line2: "",
      line3: "",
      attn: "",
    };

    if (firstWO?.drawingId) {
      const drawing = await Drawing.findById(firstWO.drawingId)
        .select("customerId customer customerRef") // keep customerId field here
        .lean();

      const customerId =
        drawing?.customerId ||
        drawing?.customer || // if your schema uses `customer`
        drawing?.customerRef; // if your schema uses `customerRef`

      if (customerId) {
        const customer = await Customer.findById(customerId)
          .select(
            "companyName contactPerson email phone paymentTerms incoterms address"
          )
          .lean();

        // ✅ map customer -> deliverTo (adjust field names as per your DB)
        const companyName = customer?.companyName || customer?.name || "";

        // If address stored as object: customer.address.{...}
        const addrObj = customer?.address || {};

        const line1 =
          addrObj?.line1 ||
          addrObj?.addressLine1 ||
          addrObj?.street ||
          "";

        const line2 =
          addrObj?.line2 ||
          addrObj?.addressLine2 ||
          "";

        const city = addrObj?.city || "";
        const state = addrObj?.state || "";
        const country = addrObj?.country || "";
        const postal =
          addrObj?.postalCode || addrObj?.pincode || "";

        const line3 = [city, state, country, postal].filter(Boolean).join(" ");

        deliverTo = {
          name: companyName,
          address: customer?.address,
          attn: customer?.contactPerson,
          paymentTerms: customer?.paymentTerms || "",
          salesperson: customer?.contactPerson
        };

      }
    }

    // ✅ Static Header data (company stays static)
    const meta = {
      company: {
        address: "1 Kaki Bukit Ave 3 KB-1 #03-07 Singapore 416087",
        tel: "(65) 6743 4533",
        fax: "(65) 6743 6929",
        email: "sales@exceltech.com",
        website: "www.exceltech.com",
        gstRegNo: "199407327W",
        stampName: "EXXEL TECHNOLOGY PTE LTD"
      },
      deliverToTitle: "DELIVERY ORDER",
      deliverTo, // ✅ dynamic now
      docInfo: {
        page: "1 of 1",
        doNo: firstWO?.doNumber,
        date: firstWO?.completeDate,
        poNo: firstWO?.poNumber,
        terms: deliverTo?.paymentTerms,
        salesperson: deliverTo?.salesperson,
      },

    };

    // ✅ STATIC rows for now (as you said) – count matches ids length
    const tableRows = workOrders.map((item, idx) => ({
      no: idx + 1,
      pos: item?.posNo,
      barcode: `*${item?.poNumber}/${item?.posNo}*`,
      qty: item?.quantity,
      projectNr: item?.projectId?.projectName,
      item: item?.drawingId?.drawingNo,
      description: item?.drawingId?.description,
    }));

    const templatePath = path.join(process.cwd(), "templates", "do.ejs");
    const html = await ejs.renderFile(templatePath, { meta, rows: tableRows });

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const fileName = `delivery_orders_${new Date().toISOString().slice(0, 10)}.pdf`;

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", right: "40px", bottom: "20px", left: "40px" },
      displayHeaderFooter: false,
      headerTemplate: `
        <div style="width:100%; font-size:10px; padding:0 40px; color:#111;">
          <div style="display:flex; justify-content:space-between; align-items:flex-end;">
            <div></div>
            <div style="font-weight:700;">${meta.deliverToTitle}</div>
          </div>
        </div>
      `,
      footerTemplate: `
        <div style="width:100%; font-size:10px; padding:0 40px; color:#111;">
          <div style="display:flex; justify-content:flex-end;">
            <div>Page: <span class="pageNumber"></span> of <span class="totalPages"></span></div>
          </div>
        </div>
      `,
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("exportDeliveryWorkOrdersPDF error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// helper: map deliveryInfo by id
const buildDeliveryInfoMap = (deliveryInfo = []) => {
  const map = {};
  for (const x of deliveryInfo) {
    if (!x?.id) continue;
    map[String(x.id)] = {
      doNumber: (x.doNumber || "").trim(),
      delivered: !!x.delivered,
    };
  }
  return map;
};

export const exportDeliveryWorkOrdersWord = async (req, res) => {
  try {
    const { ids = [], deliveryInfo = [] } = req.body || {};

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one Work Order",
      });
    }

    const infoMap = buildDeliveryInfoMap(deliveryInfo);

    // ✅ fetch selected workorders
    const workOrders = await WorkOrder.find({ _id: { $in: ids } })
      .select("_id drawingId workOrderNo doNumber projectId posNo quantity completeDate poNumber")
      .populate("projectId", "projectName")
      .populate("drawingId", "drawingNo description")
      .lean();

    if (!workOrders.length) {
      return res.status(404).json({ success: false, message: "No work orders found" });
    }

    // ✅ merge doNumber/delivered from frontend (so export matches UI)
    const rows = workOrders.map((r) => {
      const x = infoMap[String(r._id)] || {};
      return {
        ...r,
        doNumber: (x.doNumber ?? r.doNumber ?? "").trim(),
        delivered: typeof x.delivered === "boolean" ? x.delivered : !!r.delivered,
        qtyFinal: r.quantity ?? r.qty ?? 0,
        drawingFinal: r.drawingId.drawingNo || r.drawingId.drawingName || "",
        projectFinal: r.projectId.projectName || "",
        customerFinal: r.customerName || "",
      };
    });

    // ✅ DeliverTo meta (first WO -> drawing -> customer)
    let deliverTo = {
      name: "",
      line1: "",
      line2: "",
      line3: "",
      attn: "",
      terms: "",
    };

    const firstWO = rows[0];

    if (firstWO?.drawingId) {
      const drawing = await Drawing.findById(firstWO.drawingId)
        .select("customerId customer customerRef")
        .lean();

      const customerId = drawing?.customerId || drawing?.customer || drawing?.customerRef;

      if (customerId) {
        const customer = await Customer.findById(customerId)
          .select("companyName name contactPerson paymentTerms address")
          .lean();

        const addrObj = customer?.address || {};
        const companyName = customer?.companyName || customer?.name || "";
        const attn = customer?.contactPerson || "";
        const terms = customer?.paymentTerms || "";

        const line1 =
          addrObj?.line1 || addrObj?.addressLine1 || addrObj?.street || "";
        const line2 =
          addrObj?.line2 || addrObj?.addressLine2 || "";
        const city = addrObj?.city || "";
        const state = addrObj?.state || "";
        const country = addrObj?.country || "";
        const postal = addrObj?.postalCode || addrObj?.pincode || "";

        deliverTo = {
          name: companyName,
          line1,
          line2,
          line3: [city, state, country, postal].filter(Boolean).join(" "),
          attn,
          terms,
        };
      }
    }

    // ✅ Meta (you can keep static company)
    const meta = {
      company: {
        name: "EXXEL TECHNOLOGY PTE LTD",
        addr1: "1 Kaki Bukit Ave 3 KB-1 #03-07 Singapore 416087",
        tel: "(65) 6743 4553",
        fax: "(65) 6743 6929",
        email: "sales@exxeltech.com",
        website: "www.exxeltech.com",
        gst: "199407327W",
      },
      deliverToTitle: "DELIVERY ORDER",
      doNo: firstWO?.doNumber || "",
      date: firstWO?.completedDate ? new Date(firstWO.completedDate).toLocaleDateString("en-GB") : "",
      poNo: firstWO?.poNumber || "",
      terms: deliverTo?.terms || "",
      salesperson: "Alan Ong",
    };

    // ✅ Word "header" block
    const headerBlock = [
      new Paragraph({ text: meta.company.addr1 }),
      new Paragraph({ text: `Tel: ${meta.company.tel}  Fax: ${meta.company.fax}` }),
      new Paragraph({ text: `Email: ${meta.company.email}  Website: ${meta.company.website}` }),
      new Paragraph({ text: `Company/GST Reg no: ${meta.company.gst}` }),
      new Paragraph({ text: "" }),

      new Paragraph({
        children: [
          new TextRun({ text: "Deliver To: ", bold: true }),
          new TextRun({ text: meta.deliverToTitle, bold: true }),
        ],
      }),

      new Paragraph({
        children: [
          new TextRun({ text: "DO No: ", bold: true }),
          new TextRun({ text: meta.doNo || "" }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Date: ", bold: true }),
          new TextRun({ text: meta.date || "" }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "PO No: ", bold: true }),
          new TextRun({ text: meta.poNo || "" }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Terms: ", bold: true }),
          new TextRun({ text: meta.terms || "" }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Attn: ", bold: true }),
          new TextRun({ text: deliverTo.attn || "" }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Salesperson: ", bold: true }),
          new TextRun({ text: meta.salesperson || "" }),
        ],
      }),

      new Paragraph({ text: "" }),
      new Paragraph({
        text: deliverTo.name || "",
        bold: true,
      }),
      new Paragraph({ text: deliverTo.line1 || "" }),
      new Paragraph({ text: deliverTo.line2 || "" }),
      new Paragraph({ text: deliverTo.line3 || "" }),
      new Paragraph({ text: "" }),
    ];

    // ✅ Table headers
    const headerCells = [
      "Work Order No",
      "Drawing No",
      "Project",
      "Customer",
      "Qty",
      "PO Number",
      "Completed",
      "Target Delivery",
      "Status",
      "DO No.",
      "Delivered",
    ].map((txt) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: txt, bold: true })],
            alignment: AlignmentType.CENTER,
          }),
        ],
      })
    );

    const tableRows = [
      new TableRow({ children: headerCells }),
      ...rows.map((r) =>
        new TableRow({
          children: [
            r.workOrderNo,
            r.drawingFinal,
            r.projectFinal,
            r.customerFinal || deliverTo.name,
            String(r.qtyFinal ?? 0),
            r.poNumber || "",
            r.completedDate ? new Date(r.completedDate).toLocaleDateString("en-GB") : "",
            r.targetDeliveryDate ? new Date(r.targetDeliveryDate).toLocaleDateString("en-GB") : "",
            r.status || "",
            r.doNumber || "",
            r.delivered ? "Yes" : "No",
          ].map((val) =>
            new TableCell({
              children: [new Paragraph(String(val ?? ""))],
            })
          ),
        })
      ),
    ];

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: "Delivery Orders Report",
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }),
            ...headerBlock,
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: tableRows,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: `Goods received by: ${meta.company.name}` }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "Recipient's Signature & Company Stamp: ______________________" }),
            new Paragraph({ text: "Authorised Signatory: ______________________" }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const fileName = `delivery_orders_${new Date().toISOString().slice(0, 10)}.docx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.send(buffer);
  } catch (error) {
    console.error("exportDeliveryWorkOrdersWord error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const moveToProduction = async (req, res) => {
  try {
    const { id } = req.params;

    const wo = await WorkOrder.findById(id);
    if (!wo) {
      return res.status(404).json({
        success: false,
        message: "Work order not found",
      });
    }

    // ❗ drawingId mandatory
    if (!wo.drawingId) {
      return res.status(400).json({
        success: false,
        message: "Drawing not assigned to this work order",
      });
    }

    // 🔍 Fetch costing items for this drawing
    const costingItems = await CostingItems.find({
      drawingId: wo.drawingId,
    }).select("quoteType");

    if (!costingItems.length) {
      return res.status(400).json({
        success: false,
        message: "Costing not created for this drawing",
      });
    }

    // ✅ Check required quote types
    const quoteTypes = new Set(
      costingItems.map((c) => c.quoteType)
    );

    const requiredTypes = ["material", "manhour"];

    const missingTypes = requiredTypes.filter(
      (type) => !quoteTypes.has(type)
    );

    if (missingTypes.length) {
      return res.status(400).json({
        success: false,
        message: `Missing costing for: ${missingTypes.join(", ")}`,
      });
    }

    // ✅ All checks passed → move to production
    wo.isInProduction = true;
    wo.isTriggered = true;
    wo.status = "In Production";

    await wo.save();

    return res.json({
      success: true,
      message: "Work order moved to production successfully",
      data: wo,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// export const moveToProduction = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const wo = await WorkOrder.findById(id);
//     if (!wo) {
//       return res.status(404).json({
//         success: false,
//         message: "Work order not found",
//       });
//     }

//     // Update only the required fields
//     wo.isInProduction = true;
//     wo.isTriggered = true;
//     wo.status = "In Production";

//     await wo.save();

//     return res.json({
//       success: true,
//       message: "Work order moved to production successfully",
//       data: wo,
//     });
//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// helper – index number → A / B / C ...
const indexToLetter = (index) => {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return A[index] || `A${index - 26}`; // fallback if > Z
};

export const getAllProductionWordOrders = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 20,
      search = "",
      projectId,
      drawingId,
      posNo,
      projectNo,
      poNo,
      needDate,
      status,
      customerId, // ✅ optional (customer via project)
      projectType,
      workOrderId
    } = req.query;

    // console.log('----workOrderId', workOrderId)

    page = Number(page) || 1;
    limit = Number(30) || 20;

    const query = { isInProduction: true };


    // ✅ Project No
    if (projectNo) {
      query.projectNo = projectNo;
    }

    // ✅ PO Number
    if (poNo) {
      query.poNumber = poNo;
    }

    if (needDate) {
      const start = new Date(needDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(needDate);
      end.setHours(23, 59, 59, 999);

      query.needDate = {
        $gte: start,
        $lte: end,
      };
    }

    if (workOrderId && mongoose.Types.ObjectId.isValid(workOrderId)) {
      query._id = new mongoose.Types.ObjectId(workOrderId);
    }

    // ✅ Filters
    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      query.projectId = new mongoose.Types.ObjectId(projectId);
    }

    if (drawingId && mongoose.Types.ObjectId.isValid(drawingId)) {
      query.drawingId = new mongoose.Types.ObjectId(drawingId);
    }

    if (posNo !== undefined && posNo !== null && String(posNo).trim() !== "") {
      query.posNo = String(posNo).trim();
    }

    if (projectType && projectType !== "show_all_mpns") {
      query.projectType = projectType
    }

    if (status) query.status = status;

    if (search && String(search).trim()) {
      const s = String(search).trim();

      // 1️⃣ Find drawings matching drawingNo
      const drawings = await Drawing.find({
        drawingNo: { $regex: s, $options: "i" },
      })
        .select("_id")
        .lean();

      const drawingIds = drawings.map((d) => d._id);

      // 2️⃣ Build OR conditions
      const orConditions = [
        { workOrderNo: { $regex: s, $options: "i" } },
        { poNumber: { $regex: s, $options: "i" } },
        { projectNo: { $regex: s, $options: "i" } },
      ];

      // numeric posNo
      if (!isNaN(s)) {
        orConditions.push({ posNo: Number(s) });
      }

      // drawing search
      if (drawingIds.length) {
        orConditions.push({ drawingId: { $in: drawingIds } });
      }

      query.$or = orConditions;
    }



    // ✅ CUSTOMER FILTER (via Project)
    // NOTE: customerId directly WorkOrder me nahi hai, so via Project
    // If customerId present, intersect with existing projectId filter (if any)
    let customerProjectIds = null;
    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      const projectsForCustomer = await Project.find(
        { customerId: new mongoose.Types.ObjectId(customerId) },
        { _id: 1 }
      ).lean();

      customerProjectIds = projectsForCustomer.map((p) => p._id);

      if (!customerProjectIds.length) {
        return res.json({
          success: true,
          message: "No projects found for this customer",
          data: [],
          pagination: { total: 0, page, limit, pages: 0 },
        });
      }

      // If already query.projectId exists (single id), check it is allowed
      if (query.projectId) {
        const ok = customerProjectIds.some(
          (id) => String(id) === String(query.projectId)
        );
        if (!ok) {
          return res.json({
            success: true,
            message: "No production work orders found for given customer + project filter",
            data: [],
            pagination: { total: 0, page, limit, pages: 0 },
          });
        }
      } else {
        // otherwise apply customer projects as projectId filter
        query.projectId = { $in: customerProjectIds };
      }
    }

    const skip = (page - 1) * limit;

    // Fetch flat WorkOrders
    const [workOrders, total] = await Promise.all([
      WorkOrder.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WorkOrder.countDocuments(query),
    ]);

    if (!workOrders.length) {
      return res.json({
        success: true,
        message: "No production work orders found",
        data: [],
        pagination: { total: 0, page, limit, pages: 0 },
      });
    }

    // ---- Collect required IDs ----
    const drawingIds = [
      ...new Set(
        workOrders
          .map((wo) => wo.drawingId)
          .filter(Boolean)
          .map((id) => String(id))
      ),
    ];

    const projectIds = [
      ...new Set(
        workOrders
          .map((wo) => wo.projectId)
          .filter(Boolean)
          .map((id) => String(id))
      ),
    ];

    // ---- Lookup Drawing ----
    const drawingMap = new Map();
    if (drawingIds.length) {
      const drawingDocs = await Drawing.find({
        _id: { $in: drawingIds.map((id) => new mongoose.Types.ObjectId(id)) },
      })
        .select("drawingNo description")
        .lean();

      drawingDocs.forEach((d) =>
        drawingMap.set(String(d._id), {
          drawingNo: d.drawingNo,
          description: d.description,
        })
      );
    }

    // ---- Lookup Project + Customer ----
    const projectMap = new Map();
    const customerMap = new Map();

    if (projectIds.length) {
      const projectDocs = await Project.find({
        _id: { $in: projectIds.map((id) => new mongoose.Types.ObjectId(id)) },
      })
        .select("projectName customerId")
        .lean();

      projectDocs.forEach((p) => projectMap.set(String(p._id), p));

      const custIds = [
        ...new Set(
          projectDocs
            .map((p) => p.customerId)
            .filter(Boolean)
            .map((id) => String(id))
        ),
      ];

      if (custIds.length) {
        const customerDocs = await Customer.find({
          _id: { $in: custIds.map((id) => new mongoose.Types.ObjectId(id)) },
        })
          .select("companyName contactPerson")
          .lean();

        customerDocs.forEach((c) => customerMap.set(String(c._id), c));
      }
    }

    // ---- Final Flat Output ----
    const finalList = workOrders.map((wo) => {
      const drawingData = wo.drawingId
        ? drawingMap.get(String(wo.drawingId)) || null
        : null;

      const drawingNo = drawingData?.drawingNo || null;
      const description = drawingData?.description || null;

      const project = wo.projectId
        ? projectMap.get(String(wo.projectId)) || null
        : null;

      const projectName = project?.projectName || null;

      const customer = project?.customerId
        ? customerMap.get(String(project.customerId)) || null
        : null;

      const companyName = customer?.companyName || null;
      const contactPerson = customer?.contactPerson || null;

      let projectTypeFormatted = "";
      if (wo.projectType === "cable_harness") projectTypeFormatted = "Cable Harness";
      else if (wo.projectType === "box_build") projectTypeFormatted = "Box Build";
      else projectTypeFormatted = "Others";

      return {
        workOrderId: wo._id,
        workOrderNo: wo.workOrderNo,
        poNumber: wo.poNumber,
        drawingId: wo.drawingId,
        drawingNo,
        description,
        projectId: wo.projectId,
        projectName,
        projectType: projectTypeFormatted,
        posNo: wo.posNo,
        quantity: wo.quantity,
        uom: wo.uom,
        remarks: wo.remarks,
        status: wo.status,
        needDate: wo.needDate,
        commitDate: wo.commitDate,
        isTriggered: wo.isTriggered,
        isInProduction: wo.isInProduction,
        processHistory: wo.processHistory,

        customerId: project?.customerId || null,
        companyName,
        contactPerson,
      };
    });

    return res.json({
      success: true,
      message: "Production work orders fetched",
      data: finalList,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error fetching production work orders:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// export const getAllProductionWordOrders = async (req, res) => {
//   try {
//     let { page = 1, limit = 20, search } = req.query;

//     page = Number(page) || 1;
//     limit = Number(limit) || 20;

//     const query = { isInProduction: true };

//     if (search) {
//       query.$or = [
//         { workOrderNo: { $regex: search, $options: "i" } },
//         { poNumber: { $regex: search, $options: "i" } },
//       ];
//     }

//     const skip = (page - 1) * limit;

//     // Fetch flat WorkOrders
//     const [workOrders, total] = await Promise.all([
//       WorkOrder.find(query)
//         .sort({ updatedAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .lean(),

//       WorkOrder.countDocuments(query)
//     ]);

//     if (!workOrders.length) {
//       return res.json({
//         success: true,
//         message: "No production work orders found",
//         data: [],
//         pagination: { total: 0, page, limit, pages: 0 }
//       });
//     }

//     // ---- Collect required IDs ----
//     const drawingIds = [
//       ...new Set(workOrders.map(wo => String(wo.drawingId)))
//     ];

//     const projectIds = [
//       ...new Set(
//         workOrders
//           .map(wo => wo.projectId)
//           .filter(Boolean)
//           .map(id => String(id))
//       )
//     ];

//     // ---- Lookup Drawing ----
//     const drawingMap = new Map();
//     if (drawingIds.length) {
//       const drawingDocs = await Drawing.find({ _id: { $in: drawingIds } })
//         .select("drawingNo")
//         .lean();

//       drawingDocs.forEach(d =>
//         drawingMap.set(String(d._id), d.drawingNo)
//       );
//     }

//     // ---- Lookup Project + Customer ----
//     const projectMap = new Map();
//     const customerMap = new Map();

//     if (projectIds.length) {
//       // 1️⃣ Project ke saath customerId bhi lao
//       const projectDocs = await Project.find({ _id: { $in: projectIds } })
//         .select("projectName customerId")
//         .lean();

//       projectDocs.forEach(p => {
//         projectMap.set(String(p._id), p); // pura project doc store kar rahe
//       });

//       // 2️⃣ Ab in projects se unique customerIds nikalo
//       const customerIds = [
//         ...new Set(
//           projectDocs
//             .map(p => p.customerId)
//             .filter(Boolean)
//             .map(id => String(id))
//         )
//       ];

//       // 3️⃣ Customer fetch karo
//       if (customerIds.length) {
//         const customerDocs = await Customer.find({ _id: { $in: customerIds } })
//           .select("companyName contactPerson")   // yaha apne fields ke hisaab se change karna
//           .lean();

//         customerDocs.forEach(c => {
//           customerMap.set(String(c._id), c);
//         });
//       }
//     }

//     // ---- Final Flat Output ----
//     const finalList = workOrders.map(wo => {
//       const drawingNo = wo.drawingId
//         ? drawingMap.get(String(wo.drawingId)) || null
//         : null;

//       // Project + Customer resolve
//       const project = wo.projectId
//         ? projectMap.get(String(wo.projectId)) || null
//         : null;

//       const projectName = project?.projectName || null;

//       const customer = project?.customerId
//         ? customerMap.get(String(project.customerId)) || null
//         : null;

//       const companyName = customer?.companyName || null;
//       const contactPerson = customer?.contactPerson || null;

//       // ProjectType formatting
//       let projectTypeFormatted = "";
//       if (wo.projectType === "cable_harness") projectTypeFormatted = "Cable Harness";
//       else if (wo.projectType === "box_build") projectTypeFormatted = "Box Build";
//       else projectTypeFormatted = "Others";

//       return {
//         workOrderId: wo._id,
//         workOrderNo: wo.workOrderNo,
//         poNumber: wo.poNumber,
//         drawingId: wo.drawingId,
//         drawingNo,
//         projectId: wo.projectId,
//         projectName,
//         projectType: projectTypeFormatted,
//         posNo: wo.posNo,
//         quantity: wo.quantity,
//         uom: wo.uom,
//         remarks: wo.remarks,
//         status: wo.status,
//         needDate: wo.needDate,
//         commitDate: wo.commitDate,
//         isTriggered: wo.isTriggered,
//         isInProduction: wo.isInProduction,
//         processHistory: wo.processHistory,

//         // 🆕 customer info added
//         customerId: project?.customerId || null,
//         companyName,
//         contactPerson,
//       };
//     });

//     return res.json({
//       success: true,
//       message: "Production work orders fetched",
//       data: finalList,
//       pagination: {
//         total,
//         page,
//         limit,
//         pages: Math.ceil(total / limit),
//       },
//     });

//   } catch (err) {
//     console.error("Error fetching production work orders:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };


// export const getAllProductionWordOrders = async (req, res) => {
//   try {
//     let { page = 1, limit = 20, search } = req.query;

//     page = Number(page) || 1;
//     limit = Number(limit) || 20;

//     const query = { isInProduction: true };

//     if (search) {
//       query.$or = [
//         { code: { $regex: search, $options: "i" } },
//         { projectName: { $regex: search, $options: "i" } },
//         { workOrderNo: { $regex: search, $options: "i" } },
//       ];
//     }

//     const skip = (page - 1) * limit;

//     // 1) WorkOrders fetch
//     const [workOrders, total] = await Promise.all([
//       WorkOrder.find(query)
//         .sort({ updatedAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .lean(),
//       WorkOrder.countDocuments(query),
//     ]);

//     if (!workOrders.length) {
//       return res.json({
//         success: true,
//         message: "No production work orders found",
//         data: [],
//         pagination: {
//           total: 0,
//           page,
//           limit,
//           pages: 0,
//         },
//       });
//     }

//     // 2) Collect drawingIds & projectIds from items
//     const drawingIdSet = new Set();
//     const projectIdSet = new Set();

//     workOrders.forEach((wo) => {
//       (wo.items || []).forEach((it) => {
//         if (it.drawingId) drawingIdSet.add(String(it.drawingId));
//         if (it.projectId) projectIdSet.add(String(it.projectId));
//       });
//     });

//     const drawingIds = [...drawingIdSet];
//     const projectIds = [...projectIdSet];

//     // 3) Drawing map: _id -> drawingNo
//     const drawingMap = new Map();
//     if (drawingIds.length) {
//       const drawingDocs = await Drawing.find({ _id: { $in: drawingIds } })
//         .select("drawingNo")
//         .lean();
//       drawingDocs.forEach((d) => {
//         drawingMap.set(String(d._id), d.drawingNo);
//       });
//     }

//     // 4) Project map: _id -> projectName
//     const projectMap = new Map();
//     if (projectIds.length) {
//       const projectDocs = await Project.find({ _id: { $in: projectIds } })
//         .select("projectName")
//         .lean();
//       projectDocs.forEach((p) => {
//         projectMap.set(String(p._id), p.projectName);
//       });
//     }

//     // 5) FLAT LIST build: har item ka alag record
//     const flatList = [];

//     workOrders.forEach((wo) => {
//       const baseWO = wo.workOrderNo || ""; // e.g. 2405-18-20

//       (wo.items || []).forEach((it, index) => {
//         const suffix = indexToLetter(index); // A, B, C...

//         const drawingIdStr = it.drawingId ? String(it.drawingId) : null;
//         const projectIdStr = it.projectId ? String(it.projectId) : null;

//         const drawingNo = drawingIdStr
//           ? drawingMap.get(drawingIdStr) || null
//           : null;

//         const projectName = projectIdStr
//           ? projectMap.get(projectIdStr) || null
//           : null;

//         flatList.push({
//           // 🔹 Work order level
//           workOrderId: wo._id,
//           workOrderNo: baseWO,
//           workOrderItemNo: baseWO ? `${baseWO}-${suffix}` : null, // 2405-18-20-A
//           poNumber: wo.poNumber || null,
//           needDate: wo.needDate || null,
//           commitDate: wo.commitDate || null,

//           // 🔹 Drawing / Project mapping
//           drawingId: it.drawingId || null,
//           drawingNo,
//           projectId: it.projectId || null,
//           projectName,

//           // 🔹 Item fields (bahar nikaale hue)
//           projectType: it.projectType || null,
//           posNo: it.posNo ?? null,
//           quantity: it.quantity ?? null,
//           uom: it.uom || null,
//           remarks: it.remarks || "",
//           status: it.status || null,

//           // Agar poore item ki bhi zarurat ho:
//           item: it,
//         });
//       });
//     });

//     return res.json({
//       success: true,
//       message: "Production work orders expanded successfully",
//       data: flatList,
//       pagination: {
//         total,
//         page,
//         limit,
//         pages: Math.ceil(total / limit),
//       },
//     });
//   } catch (err) {
//     console.error("Error fetching production work orders:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

export const getAllChilPartByDrawingId = async (req, res) => {
  try {
    // drawingId query/body se lo
    const drawingId = req.query.drawingId || req.body?.drawingId;

    if (!drawingId) {
      return res.status(400).json({
        status: false,
        statusCode: 400,
        message: "drawingId is required",
        data: [],
      });
    }

    let drawingObjectId;
    try {
      drawingObjectId = new mongoose.Types.ObjectId(drawingId);
    } catch (e) {
      return res.status(400).json({
        status: false,
        statusCode: 400,
        message: "Invalid drawingId",
        data: [],
      });
    }

    // 1) CostingItems: drawingId + quoteType = material
    const costingItems = await CostingItems.find({
      drawingId: drawingObjectId,
      quoteType: "material",
    }).lean();

    if (!costingItems.length) {
      return res.json({
        status: true,
        statusCode: 200,
        message: "No material costing items found for this drawing",
        data: [],
      });
    }

    // 2) Unique childPartIds, uomIds
    const childPartIdStrs = [
      ...new Set(
        costingItems
          .map((ci) => ci.childPart)
          .filter((id) => id)
          .map((id) => String(id))
      ),
    ];

    const uomIdStrs = [
      ...new Set(
        costingItems
          .map((ci) => ci.uom)
          .filter((id) => id)
          .map((id) => String(id))
      ),
    ];

    // 3) ChildParts fetch
    let childPartMap = new Map();
    if (childPartIdStrs.length) {
      const childPartObjectIds = childPartIdStrs.map(
        (id) => new mongoose.Types.ObjectId(id)
      );

      const childPartDocs = await Child.find({
        _id: { $in: childPartObjectIds },
      }).lean();

      childPartMap = new Map(
        childPartDocs.map((cp) => [String(cp._id), cp])
      );
    }

    // 4) MPN ids -> from childPart.mpn
    const mpnIdStrs = [
      ...new Set(
        Array.from(childPartMap.values())
          .map((cp) => cp.mpn)
          .filter((id) => id)
          .map((id) => String(id))
      ),
    ];

    let mpnMap = new Map();
    if (mpnIdStrs.length) {
      const mpnObjectIds = mpnIdStrs.map(
        (id) => new mongoose.Types.ObjectId(id)
      );

      const mpnDocs = await MPN.find({
        _id: { $in: mpnObjectIds },
      }).lean();

      mpnMap = new Map(mpnDocs.map((m) => [String(m._id), m]));
    }

    // 5) UOM fetch
    let uomMap = new Map();
    if (uomIdStrs.length) {
      const uomObjectIds = uomIdStrs.map(
        (id) => new mongoose.Types.ObjectId(id)
      );

      const uomDocs = await UOM.find({
        _id: { $in: uomObjectIds },
      }).lean();

      uomMap = new Map(uomDocs.map((u) => [String(u._id), u]));
    }

    // 6) Final list build
    const list = costingItems.map((ci) => {
      const child = ci.childPart
        ? childPartMap.get(String(ci.childPart))
        : null;

      const mpnDoc = child?.mpn
        ? mpnMap.get(String(child.mpn))
        : null;

      const uomDoc = ci.uom ? uomMap.get(String(ci.uom)) : null;

      const quantity = Number(ci.quantity || 0);

      return {
        itemNumber: ci?.itemNumber,
        costingItemId: ci._id,
        drawingId: ci.drawingId,

        // Child part
        childPartId: ci.childPart || null,
        ChildPartNo:
          child?.ChildPartNo ||
          child?.childPartName ||
          child?.code ||
          null,

        // MPN details (linked via childPart)
        mpnId: child?.mpn || null,
        mpn:
          mpnDoc?.mpn ||
          mpnDoc?.MPN ||
          mpnDoc?.mpnNumber ||
          null,
        description:
          mpnDoc?.description ||
          mpnDoc?.Description ||
          ci.description ||
          child?.description ||
          null,

        // UOM
        uomId: ci.uom || null,
        uom: uomDoc?.code || null,

        // Quantity from costingItems
        quantity,

        // Storage Location (assumed from ChildPart)
        storageLocation:
          mpnDoc?.
            StorageLocation
          ||
          child?.location ||
          null,
      };
    });

    return res.json({
      status: true,
      statusCode: 200,
      message: "Child parts for drawing fetched successfully",
      data: list,
    });
  } catch (error) {
    console.error("getAllChilPartByDrawingId error:", error);
    return res.status(500).json({
      status: false,
      statusCode: 500,
      message: error.message,
      data: [],
    });
  }
};




// export const getAllProductionWordOrders = async (req, res) => {
//   try {
//     // optional filters
//     const { page = 1, limit = 20, search } = req.query;

//     const query = {
//       isInProduction: true
//     };

//     // optional search by code, project name, etc.
//     if (search) {
//       query.$or = [
//         { code: { $regex: search, $options: "i" } },
//         { projectName: { $regex: search, $options: "i" } },
//       ];
//     }

//     const skip = (Number(page) - 1) * Number(limit);

//     const [workOrders, total] = await Promise.all([
//       WorkOrder.find(query)
//         // .populate("project", "name")     // optional: populate project info
//         // .populate("createdBy", "name")   // optional: populate user info
//         .sort({ updatedAt: -1 })
//         .skip(skip)
//         .limit(Number(limit)),
//       WorkOrder.countDocuments(query),
//     ]);

//     return res.json({
//       success: true,
//       message: "Fetched all production work orders",
//       data: workOrders,
//       pagination: {
//         total,
//         page: Number(page),
//         limit: Number(limit),
//         pages: Math.ceil(total / limit),
//       },
//     });
//   } catch (err) {
//     console.error("Error fetching production work orders:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// export const getTotalMPNNeeded = async (req, res) => {
//   try {
//     // 1) Sare ON HOLD work orders lao
//     const workOrders = await WorkOrder.find({ status: "on_hold" }).lean();
//     if (!workOrders.length) {
//       return res.json({ status: true, statusCode: 200, message: "No work orders in on_hold status", data: [] });
//     }

//     // 2) Unique drawingIds from items
//     const drawingIdStrs = [
//       ...new Set(
//         workOrders.flatMap((wo) =>
//           (wo.items || [])
//             .filter((i) => i.drawingId)
//             .map((i) => String(i.drawingId))
//         )
//       ),
//     ];
//     if (!drawingIdStrs.length) {
//       return res.json({ status: true, statusCode: 200, message: "No drawingIds found", data: [] });
//     }

//     const drawingObjectIds = drawingIdStrs.map((id) => new mongoose.Types.ObjectId(id));

//     // 3) CostingItems fetch
//     // const costingItems = await CostingItems.find({
//     //   drawingId: { $in: drawingObjectIds },
//     // }).lean();

//     const costingItems = await CostingItems.find({
//       drawingId: { $in: drawingObjectIds },
//       quoteType: "material",
//     }).lean();

//     if (!costingItems.length) {
//       return res.json({ status: true, statusCode: 200, message: "No costing items found", data: [] });
//     }

//     // Map: drawingId → costingItems[]
//     const costingByDrawing = new Map();
//     for (const ci of costingItems) {
//       const key = String(ci.drawingId);
//       const arr = costingByDrawing.get(key) || [];
//       arr.push(ci);
//       costingByDrawing.set(key, arr);
//     }

//     // 4) MPN usage aggregation
//     const mpnUsageMap = new Map();
//     const mpnIdStrSet = new Set();

//     for (const wo of workOrders) {
//       for (const woItem of wo.items || []) {
//         const drawingId = woItem.drawingId;
//         if (!drawingId) continue;

//         const costingArr = costingByDrawing.get(String(drawingId));
//         if (!costingArr || !costingArr.length) continue;

//         const woQty = Number(woItem.quantity || 1);

//         for (const ci of costingArr) {
//           const mpnObjId = ci.mpn;
//           if (!mpnObjId) continue;

//           const mpnIdStr = String(mpnObjId);
//           mpnIdStrSet.add(mpnIdStr);

//           const qtyPer = Number(ci.quantity || 0);
//           const totalNeededForThis = qtyPer * woQty;

//           const key = `${mpnIdStr}_${wo._id}`;

//           const prev = mpnUsageMap.get(key) || {
//             mpnId: mpnIdStr,
//             workOrderNo: wo.workOrderNo || "",
//             description: ci.description || "",
//             manufacturer: ci.manufacturer || "",
//             uomId: ci.uom || null,         // Store UOM ID temporarily
//             totalNeeded: 0,
//           };

//           prev.totalNeeded += totalNeededForThis;
//           mpnUsageMap.set(key, prev);
//         }
//       }
//     }

//     if (!mpnUsageMap.size) {
//       return res.json({ status: true, statusCode: 200, message: "No MPN usage found", data: [] });
//     }

//     // 5) Unique MPN ObjectIDs
//     const mpnObjectIds = [...mpnIdStrSet].map((id) => new mongoose.Types.ObjectId(id));

//     // 6) Fetch MPN library records
//     const mpnLibDocs = await MPN.find({ _id: { $in: mpnObjectIds } }).lean();
//     const mpnLibMap = new Map();
//     for (const lib of mpnLibDocs) mpnLibMap.set(String(lib._id), lib);

//     // 7) Fetch UOM for all unique uomIds
//     const uomIds = [
//       ...new Set(
//         Array.from(mpnUsageMap.values())
//           .map((row) => row.uomId)
//           .filter((id) => id)
//           .map((id) => String(id))
//       ),
//     ];

//     const uomDocs = await UOM.find({ _id: { $in: uomIds } }).lean();
//     const uomMap = new Map();
//     for (const u of uomDocs) uomMap.set(String(u._id), u);

//     // 8) Inventory stock
//     const inventoryDocs = await Inventory.find({
//       mpnId: { $in: mpnObjectIds },
//     }).lean();

//     const invMap = new Map();
//     for (const inv of inventoryDocs) {
//       const key = String(inv.mpnId);
//       const curr = invMap.get(key) || 0;
//       invMap.set(key, curr + Number(inv.balanceQuantity || 0));
//     }

//     // 9) Final Output
//     const result = Array.from(mpnUsageMap.values()).map((row) => {
//       const lib = mpnLibMap.get(row.mpnId);
//       const uomDoc = uomMap.get(String(row.uomId));

//       const currentStock = invMap.get(row.mpnId) || 0;

//       return {
//         // mpnId: row.mpnId,
//         mpn: lib?.mpn || lib?.mpnNumber || lib?.MPN || null,
//         description: row.description || null,
//         manufacturer: row.manufacturer || null,
//         uom: uomDoc?.name || null,   // UOM model → name
//         totalNeeded: row.totalNeeded,
//         currentStock,
//         shortfall: Math.max(0, row.totalNeeded - currentStock),
//         workOrderNo: row.workOrderNo,
//       };
//     });

//     return res.json({
//       status: true,
//       statusCode: 200,
//       message: "Total MPN needed calculated successfully",
//       data: result,
//     });

//   } catch (error) {
//     console.error("getTotalMPNNeeded error:", error);
//     return res.status(500).json({ status: false, message: error.message, data: [] });
//   }
// };

export const getTotalMPNNeeded = async (req, res) => {
  try {
    const {
      drawingDate,
      customer,
      project,
      drawingRange,
    } = req.query;

    // =========================================================
    // 1️⃣ DRAWING FILTERS
    // =========================================================

    const drawingFilters = {};

    if (drawingRange === "range1") {
      drawingFilters.drawingNo = { $gte: 0, $lte: 50 };
    }

    if (drawingRange === "range2") {
      drawingFilters.drawingNo = { $gte: 51, $lte: 100 };
    }

    if (drawingRange === "range3") {
      drawingFilters.drawingNo = { $gte: 101, $lte: 200 };
    }

    if (customer) {
      drawingFilters.customerId = customer;
    }

    if (project) {
      drawingFilters.projectId = project;
    }

    if (drawingDate) {
      const dateOnly = new Date(drawingDate);

      const nextDay = new Date(dateOnly);
      nextDay.setDate(nextDay.getDate() + 1);

      drawingFilters.createdAt = {
        $gte: dateOnly,
        $lt: nextDay,
      };
    }

    const filteredDrawings = await Drawing.find(drawingFilters)
      .select("_id drawingNo")
      .lean();

    if (!filteredDrawings.length) {
      return res.json({
        status: true,
        message: "No drawings found",
        data: [],
      });
    }

    const drawingIds = filteredDrawings.map((d) => d._id);

    // =========================================================
    // 2️⃣ WORK ORDERS
    // =========================================================

    const workOrders = await WorkOrder.find({
      drawingId: { $in: drawingIds },
    }).lean();

    if (!workOrders.length) {
      return res.json({
        status: true,
        message: "No work orders found",
        data: [],
      });
    }

    // =========================================================
    // 3️⃣ COSTING ITEMS
    // =========================================================

    const costingItems = await CostingItems.find({
      drawingId: { $in: drawingIds },
      quoteType: "material",
    }).lean();

    if (!costingItems.length) {
      return res.json({
        status: true,
        message: "No costing items found",
        data: [],
      });
    }

    // =========================================================
    // 4️⃣ GROUP COSTING BY DRAWING
    // =========================================================

    const costingByDrawing = new Map();

    for (const ci of costingItems) {
      const key = String(ci.drawingId);

      if (!costingByDrawing.has(key)) {
        costingByDrawing.set(key, []);
      }

      costingByDrawing.get(key).push(ci);
    }

    // =========================================================
    // 5️⃣ BUILD REQUIRED QTY
    // =========================================================

    const mpnUsageMap = new Map();
    const mpnIds = new Set();

    for (const wo of workOrders) {
      const drawingId = String(wo.drawingId);

      const costingArr =
        costingByDrawing.get(drawingId) || [];

      if (!costingArr.length) continue;

      const woQty = Number(wo.quantity || 0);

      for (const ci of costingArr) {
        if (!ci.mpn) continue;

        const mpnId = String(ci.mpn);

        mpnIds.add(mpnId);

        const neededQty =
          Number(ci.quantity || 0) * woQty;

        const key = `${mpnId}_${wo._id}`;

        if (!mpnUsageMap.has(key)) {
          mpnUsageMap.set(key, {
            mpnId,
            drawingId,
            workOrderNo: wo.workOrderNo,

            description:
              ci.description || "",

            manufacturer:
              ci.manufacturer || "",

            uomId: ci.uom || null,

            totalNeeded: 0,
          });
        }

        mpnUsageMap.get(key).totalNeeded += neededQty;
      }
    }

    // =========================================================
    // 6️⃣ LOAD MPN MASTER
    // =========================================================

    const mpnObjectIds = [...mpnIds].map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const mpnDocs = await MPN.find({
      _id: { $in: mpnObjectIds },
    }).lean();

    const mpnMap = new Map(
      mpnDocs.map((m) => [String(m._id), m])
    );

    // =========================================================
    // 7️⃣ LOAD UOMS
    // =========================================================

    const uomIds = [
      ...new Set(
        [...mpnUsageMap.values()]
          .map((x) => x.uomId)
          .filter(Boolean)
      ),
    ];

    const uomDocs = await UOM.find({
      _id: { $in: uomIds },
    }).lean();

    const uomMap = new Map(
      uomDocs.map((u) => [String(u._id), u])
    );

    // =========================================================
    // 8️⃣ INVENTORY
    // =========================================================

    const inventoryDocs = await Inventory.find({
      mpnId: { $in: mpnObjectIds },
    }).lean();

    // IMPORTANT:
    // balanceQuantity ALWAYS stored in METER

    const inventoryMap = new Map();

    for (const inv of inventoryDocs) {
      const key = String(inv.mpnId);

      const qty = Number(inv.balanceQuantity || 0);

      inventoryMap.set(
        key,
        (inventoryMap.get(key) || 0) + qty
      );
    }

    // =========================================================
    // 9️⃣ FINAL RESULT
    // =========================================================

    const result = [];

    for (const row of mpnUsageMap.values()) {
      const mpn = mpnMap.get(row.mpnId);

      const uom = row.uomId
        ? uomMap.get(String(row.uomId))
        : null;

      const targetUom = uom?.code || "EA";

      // inventory stored in meter
      const stockInMeter = Number(
        inventoryMap.get(row.mpnId) || 0
      );

      // convert stock -> costing uom
      const convertedStock = convertUom({
        qty: stockInMeter,
        fromUom: "M",
        toUom: targetUom,
      });

      const totalNeeded = Number(
        row.totalNeeded || 0
      );

      const shortfall = Math.max(
        0,
        totalNeeded - convertedStock
      );

      // only shortage
      if (shortfall <= 0) continue;

      result.push({
        drawingId: row.drawingId,

        workOrderNo: row.workOrderNo,

        mpnId: row.mpnId,

        mpn:
          mpn?.MPN ||
          mpn?.mpn ||
          null,

        description:
          row.description ||
          mpn?.Description ||
          mpn?.description ||
          "",

        manufacturer:
          row.manufacturer ||
          mpn?.Manufacturer ||
          mpn?.manufacturer ||
          "",

        uom: targetUom,

        totalNeeded: Number(
          totalNeeded.toFixed(4)
        ),

        currentStock: Number(
          convertedStock.toFixed(4)
        ),

        shortfall: Number(
          shortfall.toFixed(4)
        ),
      });
    }

    // =========================================================
    // 🔟 RESPONSE
    // =========================================================

    return res.json({
      status: true,
      message:
        "Filtered Total MPN Needed fetched successfully",
      total: result.length,
      data: result,
    });

  } catch (error) {
    console.error(
      "getTotalMPNNeeded error:",
      error
    );

    return res.status(500).json({
      status: false,
      message: error.message,
      data: [],
    });
  }
};


export const exportTotalMPNNeeded = async (req, res) => {
  try {
    const {
      drawingDate,
      customer,
      project,
      drawingRange,
    } = req.query;

    // -------------------------
    // 1️⃣ FILTER DRAWINGS FIRST
    // -------------------------
    const drawingFilters = {};

    if (drawingRange === "range1")
      drawingFilters.drawingNo = { $gte: 0, $lte: 50 };
    if (drawingRange === "range2")
      drawingFilters.drawingNo = { $gte: 51, $lte: 100 };
    if (drawingRange === "range3")
      drawingFilters.drawingNo = { $gte: 101, $lte: 200 };

    if (customer) drawingFilters.customerId = customer;
    if (project) drawingFilters.projectId = project;

    if (drawingDate) {
      const start = new Date(drawingDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      drawingFilters.createdAt = { $gte: start, $lt: end };
    }

    const drawings = await Drawing.find(drawingFilters)
      .select("_id")
      .lean();

    if (!drawings.length) {
      return res.status(200).json({
        status: true,
        message: "No drawings found for selected filters",
      });
    }

    const drawingObjectIds = drawings.map((d) => d._id);

    // -------------------------
    // 2️⃣ FILTER WORK ORDERS
    // -------------------------
    const workOrders = await WorkOrder.find({
      // status: "on_hold", // keep or remove as per requirement
      drawingId: { $in: drawingObjectIds },
    }).lean();

    if (!workOrders.length) {
      return res.status(200).json({
        status: true,
        message: "No work orders to export",
      });
    }

    // -------------------------
    // 3️⃣ COSTING ITEMS
    // -------------------------
    const costingItems = await CostingItems.find({
      drawingId: { $in: drawingObjectIds },
      quoteType: "material",
    }).lean();

    if (!costingItems.length) {
      return res.status(200).json({
        status: true,
        message: "No costing items found",
      });
    }

    const costingMap = new Map();
    costingItems.forEach((ci) => {
      const key = String(ci.drawingId);
      const arr = costingMap.get(key) || [];
      arr.push(ci);
      costingMap.set(key, arr);
    });

    // -------------------------
    // 4️⃣ AGGREGATION
    // -------------------------
    const mpnUsageMap = new Map();
    const mpnIdSet = new Set();

    for (const wo of workOrders) {
      const dId = String(wo.drawingId);
      const costingArr = costingMap.get(dId);
      if (!costingArr) continue;

      const woQty = Number(wo.quantity || 1);

      for (const ci of costingArr) {
        if (!ci.mpn) continue;

        const mpnIdStr = String(ci.mpn);
        mpnIdSet.add(mpnIdStr);

        const needed = Number(ci.quantity || 0) * woQty;
        const key = `${mpnIdStr}_${wo._id}`;

        const prev = mpnUsageMap.get(key) || {
          mpnId: mpnIdStr,
          description: ci.description || "",
          manufacturer: ci.manufacturer || "",
          uomId: ci.uom || null,
          workOrderNo: wo.workOrderNo,
          totalNeeded: 0,
        };

        prev.totalNeeded += needed;
        mpnUsageMap.set(key, prev);
      }
    }

    if (!mpnUsageMap.size) {
      return res.status(200).json({
        status: true,
        message: "No MPN usage found",
      });
    }

    // -------------------------
    // 5️⃣ LOAD MPN / UOM / INVENTORY
    // -------------------------
    const mpnObjectIds = [...mpnIdSet].map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const mpnDocs = await MPN.find({ _id: { $in: mpnObjectIds } }).lean();
    const mpnMap = new Map(mpnDocs.map((m) => [String(m._id), m]));

    const uomIds = [
      ...new Set(
        [...mpnUsageMap.values()]
          .map((r) => r.uomId)
          .filter(Boolean)
          .map(String)
      ),
    ];

    const uomDocs = await UOM.find({ _id: { $in: uomIds } }).lean();
    const uomMap = new Map(uomDocs.map((u) => [String(u._id), u]));

    const invDocs = await Inventory.find({
      mpnId: { $in: mpnObjectIds },
    }).lean();

    const invMap = new Map();
    invDocs.forEach((inv) => {
      const key = String(inv.mpnId);
      invMap.set(key, (invMap.get(key) || 0) + Number(inv.balanceQuantity || 0));
    });

    // -------------------------
    // 6️⃣ BUILD EXCEL
    // -------------------------
    const excelRows = [...mpnUsageMap.values()].map((row) => {
      const mpn = mpnMap.get(row.mpnId);
      const uom = row.uomId ? uomMap.get(String(row.uomId)) : null;
      const stock = invMap.get(row.mpnId) || 0;

      return {
        "MPN": mpn?.mpn || mpn?.MPN || "",
        "Description": row.description || mpn?.description || "",
        "Manufacturer": row.manufacturer || mpn?.manufacturer || "",
        "UOM": uom?.name || "",
        "Total Needed": row.totalNeeded,
        "Current Stock": stock,
        "Shortfall": Math.max(0, row.totalNeeded - stock),
        "Work Order No": row.workOrderNo,
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelRows);

    ws["!cols"] = Object.keys(excelRows[0]).map((h) => ({
      wch: Math.max(12, h.length + 2),
    }));

    XLSX.utils.book_append_sheet(wb, ws, "Total MPN Needed");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="total_mpn_needed.xlsx"'
    );

    return res.end(buf);
  } catch (error) {
    console.error("exportTotalMPNNeeded error:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};



export const getDeliveryOrders = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      status,
      customer,
      project,
      dateFrom,
      dateTo,
      sortBy = "createdAt",
      sortOrder = "desc",
      filters, // can be JSON string or object
    } = req.query;

    page = Math.max(parseInt(page) || 1, 1);
    limit = Math.max(parseInt(limit) || 10, 1);

    // ✅ parse filters safely
    let parsedFilters = {};
    if (filters) {
      try {
        parsedFilters = typeof filters === "string" ? JSON.parse(filters) : filters;
      } catch (e) {
        parsedFilters = {};
      }
    }

    const drawingDate = parsedFilters?.drawingDate || null;
    const filterCustomer = parsedFilters?.customer || customer || null;
    const filterProject = parsedFilters?.project || project || null;

    const match = { isDeleted: { $ne: true } };
    const andConditions = [];



    // 🔍 basic search root
    if (search) {
      match.$or = [
        { workOrderNo: { $regex: search, $options: "i" } },
        { poNumber: { $regex: search, $options: "i" } },
        { posNo: { $regex: search, $options: "i" } },
      ];
    }



    // ✅ status logic
    if (status) {
      const s = String(status).trim().toLowerCase();  // ✅ trim IMPORTANT

      if (s === "completed") {
        andConditions.push({
          $or: [
            { status: { $in: ["completed", "Completed"] } },
            { delivered: true },
            { completeDate: { $ne: null } },
            { completedDate: { $ne: null } },
            { isProductionComplete: true }, // ✅
            // optional safe if stored as string/number:
            // { isProductionComplete: { $in: [true, "true", 1] } },
          ],
        });
      } else {
        andConditions.push({ status }); // other statuses
      }
    }

    if (andConditions.length) {
      match.$and = andConditions;
    }


    // 📅 filter by workorder createdAt range
    if (dateFrom || dateTo) {
      match.createdAt = {};
      if (dateFrom) match.createdAt.$gte = new Date(dateFrom);
      if (dateTo) match.createdAt.$lte = new Date(dateTo);
    }

    // ✅ build drawing match (from drawingDoc fields)
    const drawingMatch = {};
    if (drawingDate) {
      const d = new Date(drawingDate);
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);

      drawingMatch["drawingDoc.createdAt"] = { $gte: start, $lte: end };
    }

    if (filterProject) {
      drawingMatch["drawingDoc.projectId"] = new mongoose.Types.ObjectId(filterProject);
    }

    if (filterCustomer) {
      // ✅ since you said drawingDoc has customerId
      drawingMatch["drawingDoc.customerId"] = new mongoose.Types.ObjectId(filterCustomer);
    }

    const pipeline = [
      { $match: match },

      // 🔗 Join Drawing
      {
        $lookup: {
          from: "drawings",
          localField: "drawingId",
          foreignField: "_id",
          as: "drawingDoc",
        },
      },
      { $unwind: { path: "$drawingDoc", preserveNullAndEmptyArrays: true } },

      // ✅ APPLY DRAWING FILTERS HERE (projectId/customerId/createdAt)
      ...(Object.keys(drawingMatch).length ? [{ $match: drawingMatch }] : []),

      // 🔗 Join Project (keep your old)
      {
        $lookup: {
          from: "projects",
          let: {
            drawingProjectId: "$drawingDoc.projectId",
            woProjectId: "$projectId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$_id", "$$drawingProjectId"] },
                    { $eq: ["$_id", "$$woProjectId"] },
                  ],
                },
              },
            },
          ],
          as: "projectDoc",
        },
      },
      { $unwind: { path: "$projectDoc", preserveNullAndEmptyArrays: true } },

      // 🔗 Join Customer (from project.customerId) - keep if you want display name
      {
        $lookup: {
          from: "customers",
          localField: "projectDoc.customerId",
          foreignField: "_id",
          as: "customerDoc",
        },
      },
      { $unwind: { path: "$customerDoc", preserveNullAndEmptyArrays: true } },

      // 🧮 Compute friendly fields
      {
        $addFields: {
          displayPONumber: { $ifNull: ["$poNumber", "$posNumber"] },
          displayCompletedDate: { $ifNull: ["$completeDate", null] },
          displayTargetDelivery: { $ifNull: ["$targetDeliveryDate", "$commitDate"] },
          drawingName: {
            $ifNull: [
              "$drawingDoc.drawingName",
              { $ifNull: ["$drawingDoc.drawingNo", { $ifNull: ["$drawingDoc.drawingNumber", { $ifNull: ["$drawingDoc.name", "$drawingDoc.title"] }] }] },
            ],
          },
        },
      },

      {
        $addFields: {
          displayStatus: {
            $cond: [
              {
                $or: [
                  { $ne: ["$completeDate", null] },
                  { $eq: ["$delivered", true] },
                  { $in: ["$status", ["completed", "Completed"]] },
                ]
              },
              "Completed",
              { $ifNull: ["$status", "Pending"] }
            ]
          }

        },
      },

      {
        $project: {
          _id: 1,
          workOrderNo: 1,
          doNumber: 1,
          delivered: 1,
          createdAt: 1,
          posNo: 1,
          poNumber: "$displayPONumber",
          qty: { $ifNull: ["$quantity", 0] },

          drawingId: "$drawingId",
          drawingName: 1,
          drawingCode: "$drawingDoc.drawingNumber",

          projectId: "$projectDoc._id",
          projectName: "$projectDoc.projectName",

          customerId: "$customerDoc._id",
          customerName: "$customerDoc.companyName",

          completedDate: "$displayCompletedDate",
          targetDeliveryDate: "$displayTargetDelivery",
          status: "$displayStatus",
        },
      },

      // 🔍 extended search
      ...(search
        ? [
          {
            $match: {
              $or: [
                { workOrderNo: { $regex: search, $options: "i" } },
                { poNumber: { $regex: search, $options: "i" } },
                { drawingName: { $regex: search, $options: "i" } },
                { posNo: { $regex: search, $options: "i" } },
                { drawingCode: { $regex: search, $options: "i" } },
                { projectName: { $regex: search, $options: "i" } },
                { customerName: { $regex: search, $options: "i" } },
              ],
            },
          },
        ]
        : []),

      { $sort: { [sortBy]: sortOrder === "asc" ? 1 : -1 } },

      {
        $facet: {
          meta: [{ $count: "total" }],
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        },
      },
    ];

    const result = await WorkOrder.aggregate(pipeline);
    const total = result?.[0]?.meta?.[0]?.total || 0;
    const rows = result?.[0]?.data || [];

    return res.json({
      success: true,
      data: rows,
      totalCount: total,
      page,
      limit,
      filtersApplied: {
        search,
        status,
        dateFrom,
        dateTo,
        filters: parsedFilters,
      },
    });
  } catch (err) {
    console.error("getDeliveryOrders error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getEachMPNUsage = async (req, res) => {
  try {
    const {
      mpnId,
      customer,
      project,
      workOrderNo,
      workOrderId,
      page = 1,
      limit = 10,
    } = req.query;

    if (!mpnId) {
      return res.status(400).json({
        status: false,
        statusCode: 400,
        message: "mpnId is required",
        data: [],
      });
    }

    const mpnObjectId = new mongoose.Types.ObjectId(mpnId);
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;

    // 1) CostingItems for this mpn (material)
    const costingItems = await CostingItems.find({
      mpn: mpnObjectId,
      quoteType: "material",
    }).lean();

    if (!costingItems.length) {
      return res.json({
        status: true,
        statusCode: 200,
        message: "No costing items found for this MPN (material)",
        data: [],
        pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
      });
    }

    // ✅ Unique drawingIds where this mpn is used
    const drawingIdStrs = [
      ...new Set(costingItems.map((ci) => String(ci.drawingId)).filter(Boolean)),
    ];
    const drawingObjectIds = drawingIdStrs.map((id) => new mongoose.Types.ObjectId(id));

    // 2) Drawings filter (customer/project optional)
    const drawingQuery = { _id: { $in: drawingObjectIds } };
    if (customer) drawingQuery.customerId = new mongoose.Types.ObjectId(customer);
    if (project) drawingQuery.projectId = new mongoose.Types.ObjectId(project);

    const drawingDocs = await Drawing.find(drawingQuery).lean();

    if (!drawingDocs.length) {
      return res.json({
        status: true,
        statusCode: 200,
        message: "No drawings match selected filters for this MPN",
        data: [],
        pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
      });
    }

    const filteredDrawingIds = drawingDocs.map((d) => d._id);
    const filteredDrawingIdStrSet = new Set(drawingDocs.map((d) => String(d._id)));

    // 3) WorkOrders for those drawings (optional filters)
    const workOrderQuery = { drawingId: { $in: filteredDrawingIds } };
    if (workOrderNo) workOrderQuery.workOrderNo = String(workOrderNo).trim();
    if (workOrderId) workOrderQuery._id = new mongoose.Types.ObjectId(workOrderId);

    const workOrders = await WorkOrder.find(workOrderQuery).lean();
    // NOTE: drawings still should return even if no work orders? (Usually WO exists)
    // If you want drawings even without WO, we keep list; usage qty will be 0.

    // 4) Project map (for UI)
    const projectIds = [
      ...new Set(
        drawingDocs
          .map((d) => d.projectId)
          .filter(Boolean)
          .map((p) => String(p))
      ),
    ];

    const projectDocs = projectIds.length
      ? await Project.find({ _id: { $in: projectIds } }).lean()
      : [];

    const projectMap = new Map(
      projectDocs.map((p) => [String(p._id), p.name || p.projectName || null])
    );

    // 5) Costing per drawing (ONLY filtered drawings)
    // qtyPer = sum(ci.quantity) for this mpn within that drawing
    const qtyPerByDrawing = new Map(); // drawingIdStr -> qtyPerSum
    for (const ci of costingItems) {
      const dIdStr = String(ci.drawingId);
      if (!filteredDrawingIdStrSet.has(dIdStr)) continue;

      const prev = qtyPerByDrawing.get(dIdStr) || 0;
      qtyPerByDrawing.set(dIdStr, prev + Number(ci.quantity || 0));
    }

    // 6) WorkOrders group by drawingId
    const woByDrawing = new Map(); // drawingIdStr -> workOrders[]
    for (const wo of workOrders || []) {
      const dIdStr = String(wo.drawingId);
      if (!filteredDrawingIdStrSet.has(dIdStr)) continue;

      const arr = woByDrawing.get(dIdStr) || [];
      arr.push(wo);
      woByDrawing.set(dIdStr, arr);
    }

    // 7) Build DRAWING-wise rows (this is the update you asked)
    const rows = drawingDocs.map((d) => {
      const dIdStr = String(d._id);
      const qtyPer = qtyPerByDrawing.get(dIdStr) || 0;

      const wos = woByDrawing.get(dIdStr) || [];
      const workOrderCount = wos.length;

      // totalUsed = sum(wo.quantity) * qtyPer
      const totalWoQty = wos.reduce((sum, wo) => sum + Number(wo.quantity || 0), 0);
      const quantityUsed = qtyPer * totalWoQty;

      // Need date: earliest among workOrders (optional)
      const needDate = wos
        .map((x) => x.needDate)
        .filter(Boolean)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] || null;

      const projectName = d.projectId ? projectMap.get(String(d.projectId)) || null : null;

      return {
        drawingId: dIdStr,
        drawingNo: d.drawingNo || d.drawing || null,
        projectId: d.projectId ? String(d.projectId) : null,
        projectName,
        customerId: d.customerId ? String(d.customerId) : null,

        qtyPerDrawing: qtyPer,           // ✅ per unit requirement inside drawing (for this mpn)
        workOrderCount,
        totalWorkOrderQty: totalWoQty,   // ✅ sum of WO quantities
        quantityUsed,                    // ✅ total usage across WOs
        needDate,                        // ✅ earliest needDate
        workOrders: wos.map((wo) => ({
          workOrderId: String(wo._id),
          workOrderNo: wo.workOrderNo,
          quantity: Number(wo.quantity || 0),
          needDate: wo.needDate || null,
          status: wo.status || null,
        })),
      };
    });

    // Optional: sort by quantityUsed desc
    rows.sort((a, b) => Number(b.quantityUsed || 0) - Number(a.quantityUsed || 0));

    // Pagination (drawings level)
    const total = rows.length;
    const totalPages = Math.ceil(total / limitNum);
    const start = (pageNum - 1) * limitNum;
    const paginatedRows = rows.slice(start, start + limitNum);

    return res.json({
      status: true,
      statusCode: 200,
      message: "MPN usage (drawings) fetched successfully",
      data: paginatedRows,
      pagination: { page: pageNum, limit: limitNum, total, totalPages },
    });
  } catch (error) {
    console.error("getEachMPNUsage error:", error);
    return res.status(500).json({
      status: false,
      statusCode: 500,
      message: error.message,
      data: [],
    });
  }
};


// export const getDeliveryOrders = async (req, res) => {
//   try {
//     let {
//       page = 1,
//       limit = 10,
//       search = "",
//       status,          // e.g. on_hold, completed, in_progress
//       customer,        // customer _id
//       project,         // project _id
//       dateFrom,        // ISO or yyyy-mm-dd
//       dateTo,
//       sortBy = "createdAt",
//       sortOrder = "desc",
//       filters
//     } = req.query;



//     page = Math.max(parseInt(page) || 1, 1);
//     limit = Math.max(parseInt(limit) || 10, 1);


//         // ✅ parse filters safely
//     let parsedFilters = {};
//     if (filters) {
//       try {
//         parsedFilters = typeof filters === "string" ? JSON.parse(filters) : filters;
//       } catch (e) {
//         parsedFilters = {};
//       }
//     }

//     const drawingDate = parsedFilters?.drawingDate || null;
//     const filterCustomer = parsedFilters?.customer || customer || null;
//     const filterProject = parsedFilters?.project || project || null;



//     const match = { isDeleted: { $ne: true } }; // if you don't have isDeleted, you can remove this

//     // 🔍 Basic search on root fields
//     if (search) {
//       match.$or = [
//         { workOrderNo: { $regex: search, $options: "i" } },
//         { poNumber: { $regex: search, $options: "i" } },
//         { posNo: { $regex: search, $options: "i" } }, // schema has posNo
//       ];
//     }

//     // 🔽 Filter by status
//     // 🔽 Filter by status
//     if (status) {
//       const s = String(status).toLowerCase();

//       if (s === "completed") {
//         match.$or = [
//           { status: { $in: ["completed", "Completed"] } },
//           { delivered: true },
//           { completeDate: { $ne: null } },
//           { completedDate: { $ne: null } },
//         ];
//       } else {
//         match.status = status; // other statuses: on_hold, in_progress etc
//       }
//     }


//     // 📅 Filter by createdAt range
//     if (dateFrom || dateTo) {
//       match.createdAt = {};
//       if (dateFrom) match.createdAt.$gte = new Date(dateFrom);
//       if (dateTo) match.createdAt.$lte = new Date(dateTo);
//     }


//         const drawingMatch = {};
//     if (drawingDate) {
//       const d = new Date(drawingDate);
//       const start = new Date(d);
//       start.setHours(0, 0, 0, 0);
//       const end = new Date(d);
//       end.setHours(23, 59, 59, 999);

//       drawingMatch["drawingDoc.createdAt"] = { $gte: start, $lte: end };
//     }

//     if (filterProject) {
//       drawingMatch["drawingDoc.projectId"] = new mongoose.Types.ObjectId(filterProject);
//     }

//     if (filterCustomer) {
//       // ✅ since you said drawingDoc has customerId
//       drawingMatch["drawingDoc.customerId"] = new mongoose.Types.ObjectId(filterCustomer);
//     }


//     const pipeline = [
//       { $match: match },

//       // 🔗 Join Drawing
//       {
//         $lookup: {
//           from: "drawings",
//           localField: "drawingId",
//           foreignField: "_id",
//           as: "drawingDoc",
//         },
//       },
//       { $unwind: { path: "$drawingDoc", preserveNullAndEmptyArrays: true } },

//       ...(Object.keys(drawingMatch).length ? [{ $match: drawingMatch }] : []),

//       // 🔗 Join Project (from drawing.projectId OR workOrder.projectId)
//       {
//         $lookup: {
//           from: "projects",
//           let: {
//             drawingProjectId: "$drawingDoc.projectId",
//             woProjectId: "$projectId",
//           },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $or: [
//                     { $eq: ["$_id", "$$drawingProjectId"] },
//                     { $eq: ["$_id", "$$woProjectId"] },
//                   ],
//                 },
//               },
//             },
//           ],
//           as: "projectDoc",
//         },
//       },
//       { $unwind: { path: "$projectDoc", preserveNullAndEmptyArrays: true } },

//       // 🔗 Join Customer (from project.customerId)
//       {
//         $lookup: {
//           from: "customers",
//           localField: "projectDoc.customerId",
//           foreignField: "_id",
//           as: "customerDoc",
//         },
//       },
//       { $unwind: { path: "$customerDoc", preserveNullAndEmptyArrays: true } },

//       // Filter by project / customer after lookups
//       ...(project
//         ? [
//           {
//             $match: {
//               "projectDoc._id": new mongoose.Types.ObjectId(project),
//             },
//           },
//         ]
//         : []),
//       ...(customer
//         ? [
//           {
//             $match: {
//               "customerDoc._id": new mongoose.Types.ObjectId(customer),
//             },
//           },
//         ]
//         : []),

//       // 🧮 Compute friendly fields
//       {
//         $addFields: {
//           displayPONumber: {
//             $ifNull: ["$poNumber", "$posNumber"], // posNumber if you ever add it
//           },

//           // Completed date: prefer completeDate (root)
//           displayCompletedDate: {
//             $ifNull: ["$completeDate", null],
//           },

//           // Target delivery: prefer targetDeliveryDate → commitDate
//           displayTargetDelivery: {
//             $ifNull: ["$targetDeliveryDate", "$commitDate"],
//           },

//           // Drawing name fallback across common field names
//           drawingName: {
//             $ifNull: [
//               "$drawingDoc.drawingName",
//               {
//                 $ifNull: [
//                   "$drawingDoc.drawingNo",
//                   {
//                     $ifNull: [
//                       "$drawingDoc.drawingNumber",
//                       {
//                         $ifNull: ["$drawingDoc.name", "$drawingDoc.title"],
//                       },
//                     ],
//                   },
//                 ],
//               },
//             ],
//           },
//         },
//       },

//       // 📌 Derive display status
//       {
//         $addFields: {
//           displayStatus: {
//             $cond: [
//               {
//                 $or: [
//                   { $ne: ["$completeDate", null] },
//                   { $eq: ["$delivered", true] },
//                   { $in: ["$status", ["completed", "Completed"]] }
//                 ]
//               },
//               "Completed",
//               { $ifNull: ["$status", "Pending"] }
//             ]
//           }
//         }

//       },

//       // 🎯 Final projection (1 row per WorkOrder)
//       {
//         $project: {
//           _id: 1,
//           workOrderNo: 1,
//           doNumber: 1,
//           delivered: 1,
//           createdAt: 1,

//           poNumber: "$displayPONumber",

//           qty: {
//             $ifNull: ["$quantity", 0],
//           },

//           drawingId: "$drawingId",
//           drawingName: 1,
//           drawingCode: "$drawingDoc.drawingNumber",

//           projectId: "$projectDoc._id",
//           projectName: "$projectDoc.projectName",

//           customerId: "$customerDoc._id",
//           customerName: "$customerDoc.companyName",

//           completedDate: "$displayCompletedDate",
//           targetDeliveryDate: "$displayTargetDelivery",
//           status: "$displayStatus",
//         },
//       },

//       // 🔍 Extended search on drawing & project also
//       ...(search
//         ? [
//           {
//             $match: {
//               $or: [
//                 { workOrderNo: { $regex: search, $options: "i" } },
//                 { poNumber: { $regex: search, $options: "i" } },
//                 { drawingName: { $regex: search, $options: "i" } },
//                 { drawingCode: { $regex: search, $options: "i" } },
//                 { projectName: { $regex: search, $options: "i" } },
//                 { customerName: { $regex: search, $options: "i" } },
//               ],
//             },
//           },
//         ]
//         : []),

//       // 🔽 Sort
//       {
//         $sort: {
//           [sortBy]: sortOrder === "asc" ? 1 : -1,
//         },
//       },

//       // 📄 Pagination with meta
//       {
//         $facet: {
//           meta: [{ $count: "total" }],
//           data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
//         },
//       },
//     ];

//     const result = await WorkOrder.aggregate(pipeline);
//     const total = result?.[0]?.meta?.[0]?.total || 0;
//     const rows = result?.[0]?.data || [];

//     return res.json({
//       success: true,
//       data: rows,
//       totalCount: total,
//       page,
//       limit,
//       filtersApplied: { search, status, customer, project, dateFrom, dateTo },
//     });
//   } catch (err) {
//     console.error("getDeliveryOrders error:", err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// export const getEachMPNUsage = async (req, res) => {
//   try {
//     const {
//       mpnId,
//       customer,
//       project,
//       workOrderNo,
//       workOrderId,
//       page = 1,
//       limit = 10,
//     } = req.query;

//     if (!mpnId) {
//       return res.status(400).json({
//         status: false,
//         statusCode: 400,
//         message: "mpnId is required",
//         data: [],
//       });
//     }

//     const mpnObjectId = new mongoose.Types.ObjectId(mpnId);
//     const pageNum = Number(page) || 1;
//     const limitNum = Number(limit) || 10;

//     // 1) CostingItems filter (material + this MPN)
//     const costingItems = await CostingItems.find({
//       mpn: mpnObjectId,
//       quoteType: "material",
//     }).lean();

//     if (!costingItems.length) {
//       return res.json({
//         status: true,
//         statusCode: 200,
//         message: "No costing items found for this MPN (material)",
//         data: [],
//       });
//     }

//     // Unique drawingIds from costing
//     const drawingIdsFromCosting = [
//       ...new Set(costingItems.map((ci) => String(ci.drawingId)).filter(Boolean)),
//     ];

//     const drawingObjectIdsFromCosting = drawingIdsFromCosting.map(
//       (id) => new mongoose.Types.ObjectId(id)
//     );

//     // 2) Drawing Query (customer + project filters)
//     const drawingQuery = { _id: { $in: drawingObjectIdsFromCosting } };

//     if (customer) drawingQuery.customerId = new mongoose.Types.ObjectId(customer);
//     if (project) drawingQuery.projectId = new mongoose.Types.ObjectId(project);

//     const drawingDocs = await Drawing.find(drawingQuery).lean();

//     if (!drawingDocs.length) {
//       return res.json({
//         status: true,
//         statusCode: 200,
//         message: "No drawings match selected filters for this MPN",
//         data: [],
//       });
//     }

//     const filteredDrawingIds = drawingDocs.map((d) => d._id);
//     const filteredDrawingIdStrs = drawingDocs.map((d) => String(d._id));

//     // 3) WorkOrder Query (drawingId + workOrderNo/workOrderId filters)
//     const workOrderQuery = {
//       drawingId: { $in: filteredDrawingIds },
//     };

//     if (workOrderNo) workOrderQuery.workOrderNo = String(workOrderNo).trim();
//     if (workOrderId) workOrderQuery._id = new mongoose.Types.ObjectId(workOrderId);

//     const workOrders = await WorkOrder.find(workOrderQuery).lean();

//     if (!workOrders.length) {
//       return res.json({
//         status: true,
//         statusCode: 200,
//         message: "No work orders found using this MPN for selected filters",
//         data: [],
//       });
//     }

//     // 4) Project map (optional for UI)
//     const projectIds = [
//       ...new Set(
//         drawingDocs
//           .map((d) => d.projectId)
//           .filter(Boolean)
//           .map((p) => String(p))
//       ),
//     ];

//     const projectDocs = await Project.find({ _id: { $in: projectIds } }).lean();
//     const projectMap = new Map(projectDocs.map((p) => [String(p._id), p.name || p.projectName || null]));

//     // Drawing map
//     const drawingMap = new Map();
//     for (const d of drawingDocs) {
//       drawingMap.set(String(d._id), {
//         drawingNo: d.drawingNo || d.drawing || null,
//         projectId: d.projectId ? String(d.projectId) : null,
//       });
//     }

//     // 5) Costing map only for filtered drawings
//     const costingMap = new Map();
//     for (const ci of costingItems) {
//       const dId = String(ci.drawingId);
//       if (!filteredDrawingIdStrs.includes(dId)) continue;
//       const arr = costingMap.get(dId) || [];
//       arr.push(ci);
//       costingMap.set(dId, arr);
//     }

//     // 6) Build usage rows
//     const grouped = new Map(); // key = `${workOrderId}_${drawingId}`

//     for (const wo of workOrders) {
//       const dKey = String(wo.drawingId);
//       const costArr = costingMap.get(dKey);
//       if (!costArr?.length) continue;

//       const woQty = Number(wo.quantity || 1);
//       const dInfo = drawingMap.get(dKey) || {};

//       const projectName = dInfo.projectId ? projectMap.get(dInfo.projectId) || null : null;

//       const qtyPerTotal = costArr.reduce((sum, ci) => sum + Number(ci.quantity || 0), 0);
//       const qtyUsed = qtyPerTotal * woQty;

//       const key = `${String(wo._id)}_${dKey}`;
//       const prev = grouped.get(key);

//       if (!prev) {
//         grouped.set(key, {
//           workOrderId: String(wo._id),        // ✅ send _id to frontend
//           drawingNo: dInfo.drawingNo,
//           projectName,
//           workOrderNo: wo.workOrderNo,
//           quantityUsed: qtyUsed,
//           needDate: wo.needDate,
//           status: wo.status,
//         });
//       } else {
//         prev.quantityUsed += qtyUsed;
//         grouped.set(key, prev);
//       }
//     }

//     const rows = Array.from(grouped.values());

//     if (!rows.length) {
//       return res.json({
//         status: true,
//         statusCode: 200,
//         message: "No MPN usage found after filters",
//         data: [],
//       });
//     }

//     // Pagination
//     const total = rows.length;
//     const totalPages = Math.ceil(total / limitNum);
//     const start = (pageNum - 1) * limitNum;
//     const paginatedRows = rows.slice(start, start + limitNum);

//     return res.json({
//       status: true,
//       statusCode: 200,
//       message: "MPN usage records fetched",
//       data: paginatedRows,
//       pagination: { page: pageNum, limit: limitNum, total, totalPages },
//     });
//   } catch (error) {
//     console.error("getEachMPNUsage error:", error);
//     return res.status(500).json({
//       status: false,
//       statusCode: 500,
//       message: error.message,
//       data: [],
//     });
//   }
// };


// export const getEachMPNUsage = async (req, res) => {
//   try {
//     const { mpnId, customer, page = 1, limit = 10 } = req.query;

//     if (!mpnId) {
//       return res.status(400).json({
//         status: false,
//         statusCode: 400,
//         message: "mpnId is required",
//         data: [],
//       });
//     }

//     const mpnObjectId = new mongoose.Types.ObjectId(mpnId);
//     const pageNum = Number(page) || 1;
//     const limitNum = Number(limit) || 10;

//     // 1) CostingItems filter: only material + this MPN
//     const costingItems = await CostingItems.find({
//       mpn: mpnObjectId,
//       quoteType: "material",
//     }).lean();

//     if (!costingItems.length) {
//       return res.json({
//         status: true,
//         statusCode: 200,
//         message: "No costing items found for this MPN (material)",
//         data: [],
//       });
//     }

//     // Unique drawingIds from costing
//     const drawingIdsFromCosting = [
//       ...new Set(costingItems.map((ci) => String(ci.drawingId)).filter(Boolean)),
//     ];

//     if (!drawingIdsFromCosting.length) {
//       return res.json({
//         status: true,
//         statusCode: 200,
//         message: "No drawings found from costing items",
//         data: [],
//       });
//     }

//     const drawingObjectIdsFromCosting = drawingIdsFromCosting.map(
//       (id) => new mongoose.Types.ObjectId(id)
//     );

//     // 2) Drawing Details + CUSTOMER FILTER HERE ✅
//     const drawingQuery = { _id: { $in: drawingObjectIdsFromCosting } };

//     if (customer) {
//       drawingQuery.customerId = new mongoose.Types.ObjectId(customer);
//     }

//     const drawingDocs = await Drawing.find(drawingQuery).lean();

//     if (!drawingDocs.length) {
//       return res.json({
//         status: true,
//         statusCode: 200,
//         message: "No drawings match selected customer for this MPN",
//         data: [],
//       });
//     }

//     // Now final drawingIds after customer filter
//     const filteredDrawingIds = drawingDocs.map((d) => d._id);
//     const filteredDrawingIdStrs = drawingDocs.map((d) => String(d._id));

//     // 3) Work orders using those filtered drawingIds
//     const workOrders = await WorkOrder.find({
//       drawingId: { $in: filteredDrawingIds },
//     }).lean();

//     if (!workOrders.length) {
//       return res.json({
//         status: true,
//         statusCode: 200,
//         message: "No work orders found using this MPN for selected customer",
//         data: [],
//       });
//     }

//     // 4) Project mapping (from drawings)
//     const projectIds = [
//       ...new Set(
//         drawingDocs
//           .map((d) => d.projectId)
//           .filter(Boolean)
//           .map((p) => String(p))
//       ),
//     ];

//     const projectDocs = await Project.find({ _id: { $in: projectIds } }).lean();

//     const projectMap = new Map();
//     for (const p of projectDocs) {
//       projectMap.set(String(p._id), p.name || p.projectName || null);
//     }

//     // Drawing map
//     const drawingMap = new Map();
//     for (const d of drawingDocs) {
//       drawingMap.set(String(d._id), {
//         drawingNo: d.drawingNo || d.drawing || null,
//         projectId: d.projectId ? String(d.projectId) : null,
//       });
//     }

//     // 5) Costing map: ONLY keep costing items for filtered drawings ✅
//     const costingMap = new Map();
//     for (const ci of costingItems) {
//       const dId = String(ci.drawingId);
//       if (!filteredDrawingIdStrs.includes(dId)) continue; // 🔥 customer filtered
//       const arr = costingMap.get(dId) || [];
//       arr.push(ci);
//       costingMap.set(dId, arr);
//     }

//     // 6) Build usage rows
//     const grouped = new Map(); // key = `${workOrderId}_${drawingId}`

//     for (const wo of workOrders) {
//       const dKey = String(wo.drawingId);
//       const costArr = costingMap.get(dKey);
//       if (!costArr?.length) continue;

//       const woQty = Number(wo.quantity || 1);
//       const dInfo = drawingMap.get(dKey) || {};

//       const projectName = dInfo.projectId
//         ? projectMap.get(dInfo.projectId) || null
//         : null;

//       // total qtyPer for this mpn in this drawing
//       const qtyPerTotal = costArr.reduce((sum, ci) => sum + Number(ci.quantity || 0), 0);
//       const qtyUsed = qtyPerTotal * woQty;

//       const key = `${String(wo._id)}_${dKey}`;
//       const prev = grouped.get(key);

//       if (!prev) {
//         grouped.set(key, {
//           drawingNo: dInfo.drawingNo,
//           projectName,
//           workOrderNo: wo.workOrderNo,
//           quantityUsed: qtyUsed,
//           needDate: wo.needDate,
//           status: wo.status,
//         });
//       } else {
//         prev.quantityUsed += qtyUsed;
//         grouped.set(key, prev);
//       }
//     }

//     const rows = Array.from(grouped.values());

//     if (!rows.length) {
//       return res.json({
//         status: true,
//         statusCode: 200,
//         message: "No MPN usage found after customer filter",
//         data: [],
//       });
//     }

//     // Pagination
//     const total = rows.length;
//     const totalPages = Math.ceil(total / limitNum);
//     const start = (pageNum - 1) * limitNum;
//     const paginatedRows = rows.slice(start, start + limitNum);

//     return res.json({
//       status: true,
//       statusCode: 200,
//       message: "MPN usage records fetched",
//       data: paginatedRows,
//       pagination: {
//         page: pageNum,
//         limit: limitNum,
//         total,
//         totalPages,
//       },
//     });
//   } catch (error) {
//     console.error("getEachMPNUsage error:", error);
//     return res.status(500).json({
//       status: false,
//       statusCode: 500,
//       message: error.message,
//       data: [],
//     });
//   }
// };


// export const getEachMPNUsage = async (req, res) => {
//   try {
//     const { mpnId,customer, page = 1, limit = 10 } = req.query;

//     if (!mpnId) {
//       return res.status(400).json({
//         status: false,
//         statusCode: 400,
//         message: "mpnId is required",
//         data: [],
//       });
//     }

//     const mpnObjectId = new mongoose.Types.ObjectId(mpnId);
//     const pageNum = Number(page) || 1;
//     const limitNum = Number(limit) || 10;

//     // 1) CostingItems filter: only material + this MPN
//     const costingItems = await CostingItems.find({
//       mpn: mpnObjectId,
//       quoteType: "material",
//     }).lean();

//     if (!costingItems.length) {
//       return res.json({
//         status: true,
//         statusCode: 200,
//         message: "No costing items found for this MPN (material)",
//         data: [],
//       });
//     }

//     // Unique drawingIds jahan ye MPN use ho raha hai
//     const drawingIds = [
//       ...new Set(costingItems.map((ci) => String(ci.drawingId))),
//     ];
//     const drawingObjectIds = drawingIds.map(
//       (id) => new mongoose.Types.ObjectId(id)
//     );

//     // 2) Work orders using those drawingIds (flat schema: drawingId + quantity)
//     const workOrders = await WorkOrder.find({
//       // status: "No Progress Yet",
//       drawingId: { $in: drawingObjectIds },
//     }).lean();

//     if (!workOrders.length) {
//       return res.json({
//         status: true,
//         statusCode: 200,
//         message: "No work orders found using this MPN",
//         data: [],
//       });
//     }

//     // 3) Drawing Details
//     const drawingDocs = await Drawing.find({
//       _id: { $in: drawingObjectIds },
//     }).lean();

//     // Collect unique projectIds from drawings
//     const projectIds = [
//       ...new Set(
//         drawingDocs
//           .map((d) => d.projectId)
//           .filter((p) => p)
//           .map((p) => String(p))
//       ),
//     ];

//     // Fetch project details
//     const projectDocs = await Project.find({
//       _id: { $in: projectIds },
//     }).lean();

//     const projectMap = new Map();
//     for (const p of projectDocs) {
//       projectMap.set(String(p._id), p.name || p.projectName || null);
//     }

//     // Final drawing map
//     const drawingMap = new Map();
//     for (const d of drawingDocs) {
//       drawingMap.set(String(d._id), {
//         drawingNo: d.drawingNo || d.drawing || null,
//         projectId: d.projectId ? String(d.projectId) : null,
//       });
//     }

//     // Group costing by drawing
//     const costingMap = new Map();
//     for (const ci of costingItems) {
//       const key = String(ci.drawingId);
//       const arr = costingMap.get(key) || [];
//       arr.push(ci);
//       costingMap.set(key, arr);
//     }



//     // 4) Build usage rows (ONE row per WorkOrder + Drawing)
//     const grouped = new Map();
//     // key = `${workOrderId}_${drawingId}`

//     for (const wo of workOrders) {
//       const dKey = String(wo.drawingId);
//       const costArr = costingMap.get(dKey);
//       if (!costArr?.length) continue;

//       const woQty = Number(wo.quantity || 1);
//       const dInfo = drawingMap.get(dKey) || {};

//       const projectName = dInfo.projectId
//         ? projectMap.get(dInfo.projectId) || null
//         : null;

//       // ✅ total qtyPer for this mpn in this drawing
//       const qtyPerTotal = costArr.reduce((sum, ci) => sum + Number(ci.quantity || 0), 0);
//       const qtyUsed = qtyPerTotal * woQty;

//       const key = `${String(wo._id)}_${dKey}`;
//       const prev = grouped.get(key);

//       if (!prev) {
//         grouped.set(key, {
//           drawingNo: dInfo.drawingNo,
//           projectName,
//           workOrderNo: wo.workOrderNo,
//           quantityUsed: qtyUsed,
//           needDate: wo.needDate,
//           status: wo.status,
//         });
//       } else {
//         // (rare) agar same WO+Drawing multiple times aa gaya, to sum kar do
//         prev.quantityUsed += qtyUsed;
//         grouped.set(key, prev);
//       }
//     }

//     const rows = Array.from(grouped.values());


//     if (!rows.length) {
//       return res.json({
//         status: true,
//         statusCode: 200,
//         message: "No MPN usage found",
//         data: [],
//       });
//     }

//     // Pagination
//     const total = rows.length;
//     const totalPages = Math.ceil(total / limitNum);
//     const start = (pageNum - 1) * limitNum;
//     const paginatedRows = rows.slice(start, start + limitNum);

//     return res.json({
//       status: true,
//       statusCode: 200,
//       message: "MPN usage records fetched",
//       data: paginatedRows,
//       pagination: {
//         page: pageNum,
//         limit: limitNum,
//         total,
//         totalPages,
//       },
//     });
//   } catch (error) {
//     console.error("getEachMPNUsage error:", error);
//     return res.status(500).json({
//       status: false,
//       statusCode: 500,
//       message: error.message,
//       data: [],
//     });
//   }
// };

export const exportEachMPNUsage = async (req, res) => {
  try {
    const { mpnId } = req.query;

    if (!mpnId) {
      return res.status(400).send("mpnId is required");
    }

    const mpnObjectId = new mongoose.Types.ObjectId(mpnId);

    // 1) Costing items for this MPN
    let costingItems = await CostingItems.find({
      mpn: mpnObjectId,
      quoteType: "material",
    }).lean();

    if (!costingItems.length) {
      costingItems = []; // return empty excel
    }

    const drawingIds = [...new Set(costingItems.map(ci => String(ci.drawingId)))];
    const drawingObjectIds = drawingIds.map(id => new mongoose.Types.ObjectId(id));

    // 2) WorkOrders
    let workOrders = await WorkOrder.find({
      status: "on_hold",
      drawingId: { $in: drawingObjectIds },
    }).lean();

    if (!workOrders.length) {
      workOrders = [];
    }

    // 3) Drawings
    const drawingDocs = await Drawing.find({
      _id: { $in: drawingObjectIds },
    }).lean();

    const projectIds = [
      ...new Set(drawingDocs.map(d => d.projectId).filter(Boolean).map(String)),
    ];

    // 4) Projects
    const projectDocs = await Project.find({
      _id: { $in: projectIds },
    }).lean();

    const projectMap = new Map();
    projectDocs.forEach(p => {
      projectMap.set(String(p._id), p.projectName || p.name || "");
    });

    const drawingMap = new Map();
    drawingDocs.forEach(d => {
      drawingMap.set(String(d._id), {
        drawingNo: d.drawingNo || "",
        projectId: d.projectId ? String(d.projectId) : null,
      });
    });

    // Group costing
    const costingMap = new Map();
    costingItems.forEach(ci => {
      const key = String(ci.drawingId);
      const arr = costingMap.get(key) || [];
      arr.push(ci);
      costingMap.set(key, arr);
    });

    // 5) Build Excel rows
    const excelRows = [];

    for (const wo of workOrders) {
      const dKey = String(wo.drawingId);
      const dInfo = drawingMap.get(dKey) || {};

      const costArr = costingMap.get(dKey) || [];
      const woQty = Number(wo.quantity || 1);
      const projectName = dInfo.projectId
        ? projectMap.get(dInfo.projectId) || ""
        : "";

      for (const ci of costArr) {
        const qtyUsed = Number(ci.quantity || 0) * woQty;

        excelRows.push({
          "Drawing No": dInfo.drawingNo || "",
          "Project Name": projectName || "",
          "Work Order No": wo.workOrderNo || "",
          "Quantity Used": qtyUsed,
          "Need Date": wo.needDate
            ? new Date(wo.needDate).toLocaleDateString("en-GB")
            : "",
          "Status": wo.status || "",
        });
      }
    }

    // 6) Even if excelRows is empty → return valid sheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelRows.length ? excelRows : [{}]);

    ws["!cols"] = Object.keys(excelRows[0] || { A: "" }).map(h => ({
      wch: 15,
    }));

    XLSX.utils.book_append_sheet(wb, ws, "MPN Usage");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Correct headers
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="mpn_usage_export.xlsx"`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    return res.end(buf);
  } catch (error) {
    console.error("exportEachMPNUsage error:", error);
    return res.status(500).send(error.message);
  }
};

export const getCompleteWorkOrders = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
      projectId,
      drawingId,
      posNo,
    } = req.query;

    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 10;

    const query = {
      isProductionComplete: true
    };

    // ✅ Filters
    if (projectId) {
      query.projectNo = projectId;
    }

    if (drawingId && mongoose.Types.ObjectId.isValid(drawingId)) {
      query.drawingId = new mongoose.Types.ObjectId(drawingId);
    }

    if (
      posNo !== undefined &&
      posNo !== null &&
      String(posNo).trim() !== ""
    ) {
      query.posNo = String(posNo).trim();
    }

    // ✅ Search
    if (search && String(search).trim()) {
      const s = String(search).trim();

      const orConditions = [
        { workOrderNo: { $regex: s, $options: "i" } },
        { poNumber: { $regex: s, $options: "i" } },
        { projectNo: { $regex: s, $options: "i" } },
      ];

      if (!isNaN(s)) {
        orConditions.push({ posNo: Number(s) });
      }

      query.$or = orConditions;
    }

    // ✅ Sort
    const sortOptions = {
      [sortBy]: sortOrder === "desc" ? -1 : 1,
    };

    // ✅ Total
    const total = await WorkOrder.countDocuments(query);

    // ✅ Fetch WorkOrders
    let workOrders = await WorkOrder.find(query)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // ***************************************
    // ✅ Collect ALL drawingIds
    // ***************************************
    const drawingIds = [];

    workOrders.forEach((wo) => {
      // ✅ Main drawingId
      if (wo.drawingId) {
        drawingIds.push(String(wo.drawingId));
      }

      // ✅ Items drawingId
      (wo.items || []).forEach((it) => {
        if (it.drawingId) {
          drawingIds.push(String(it.drawingId));
        }
      });
    });

    const uniqueDrawingIds = [...new Set(drawingIds)];

    // ***************************************
    // ✅ Drawing Map
    // ***************************************
    let drawingMap = new Map();

    if (uniqueDrawingIds.length) {
      const drawingDocs = await Drawing.find({
        _id: {
          $in: uniqueDrawingIds.map(
            (id) => new mongoose.Types.ObjectId(id)
          ),
        },
      })
        .select("drawingNo projectType quoteType")
        .lean();

      drawingMap = new Map(
        drawingDocs.map((d) => [String(d._id), d])
      );
    }

    // ***************************************
    // ✅ Costing Items
    // ***************************************
    let costingMap = new Map();

    if (uniqueDrawingIds.length) {
      const costingItems = await CostingItems.find({
        drawingId: {
          $in: uniqueDrawingIds.map(
            (id) => new mongoose.Types.ObjectId(id)
          ),
        },
      })
        .select("drawingId quoteType")
        .lean();

      for (const item of costingItems) {
        const key = String(item.drawingId);

        if (!costingMap.has(key)) {
          costingMap.set(key, new Set());
        }

        costingMap
          .get(key)
          .add((item.quoteType || "").toLowerCase());
      }
    }

    const requiredTypes = ["material", "manhour"];

    // ***************************************
    // ✅ Final Response
    // ***************************************
    workOrders = workOrders.map((wo) => {

      // ✅ item drawingId first
      const itemDrawingId =
        wo?.items?.[0]?.drawingId || wo?.drawingId;

      const d = drawingMap.get(String(itemDrawingId));

      const types =
        costingMap.get(String(itemDrawingId)) || new Set();

      const missingTypes = requiredTypes.filter(
        (t) => !types.has(t)
      );

      const isCostingComplete =
        missingTypes.length === 0;

      return {
        ...wo,

        // ✅ IMPORTANT FIX
        drawingNo: d?.drawingNo || null,

        projectType:
          d?.projectType ||
          d?.quoteType ||
          wo?.projectType ||
          null,

        // ✅ extra fields
        poNumber: wo?.poNumber || null,
        posNo: wo?.posNo || wo?.items?.[0]?.posNo || null,
        needDate:
          wo?.needDate ||
          wo?.items?.[0]?.needDate ||
          null,

        isCostingComplete,
      };
    });

    // ✅ Last Work Order
    const lastWorkOrder = await WorkOrder.findOne()
      .sort({ createdAt: -1 })
      .select("workOrderNo")
      .lean();

    const lastWorkOrderNo =
      lastWorkOrder?.workOrderNo || null;

    return res.status(200).json({
      success: true,
      data: workOrders,
      lastWorkOrderNo,

      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    });

  } catch (error) {
    console.error("getCompleteWorkOrders error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// export const getCompleteWorkOrders = async (req, res) => {
//   try {
//     let { page = 1, limit = 20, search = "" } = req.query;

//     page = Number(page) || 1;
//     limit = Number(limit) || 20;

//     const skip = (page - 1) * limit;

//     // ✅ Only completed work orders
//     const baseQuery = {
//       status: "Completed",
//     };

//     // ✅ Search
//     if (search && String(search).trim()) {
//       const s = String(search).trim();

//       baseQuery.$or = [
//         { workOrderNo: { $regex: s, $options: "i" } },
//         { poNumber: { $regex: s, $options: "i" } },
//       ];

//       // optional numeric POS search
//       if (!isNaN(s)) {
//         baseQuery.$or.push({
//           "items.posNo": Number(s),
//         });
//       }
//     }

//     // ✅ Fetch completed work orders
//     const [workOrders, total] = await Promise.all([
//       WorkOrder.find(baseQuery)
//         .sort({ completeDate: -1 })
//         .skip(skip)
//         .limit(limit)
//         .lean(),

//       WorkOrder.countDocuments(baseQuery),
//     ]);

//     if (!workOrders.length) {
//       return res.json({
//         success: true,
//         message: "No completed work orders",
//         data: [],
//         pagination: {
//           total: 0,
//           page,
//           limit,
//           pages: 0,
//         },
//       });
//     }

//     // =========================================================
//     // Collect IDs
//     // =========================================================

//     const projectIds = [];
//     const drawingIds = [];

//     workOrders.forEach((wo) => {
//   if (wo.projectId) {
//     projectIds.push(String(wo.projectId));
//   }

//   // ✅ WorkOrder level drawingId
//   if (wo.drawingId) {
//     drawingIds.push(String(wo.drawingId));
//   }

//   // ✅ Item level drawingId
//   (wo.items || []).forEach((it) => {
//     if (it.drawingId) {
//       drawingIds.push(String(it.drawingId));
//     }
//   });
// });

//     // =========================================================
//     // Projects
//     // =========================================================

//     const projectDocs = await Project.find({
//       _id: { $in: projectIds },
//     })
//       .select("projectName customerId")
//       .lean();

//     const projectMap = new Map();

//     projectDocs.forEach((p) => {
//       projectMap.set(String(p._id), {
//         name: p.projectName,
//         customerId: p.customerId,
//       });
//     });

//     // =========================================================
//     // Customers
//     // =========================================================

//     const customerIds = projectDocs
//       .map((p) => p.customerId)
//       .filter(Boolean)
//       .map((id) => String(id));

//     const customerDocs = await Customer.find({
//       _id: { $in: customerIds },
//     })
//       .select("companyName")
//       .lean();

//     const customerMap = new Map();

//     customerDocs.forEach((c) => {
//       customerMap.set(String(c._id), c.companyName);
//     });

//     // =========================================================
//     // Drawings
//     // =========================================================

//     const drawingDocs = await Drawing.find({
//       _id: { $in: drawingIds },
//     })
//       .select("drawingNo projectType quoteType")
//       .lean();

//     const drawingMap = new Map();

//     drawingDocs.forEach((d) => {
//       drawingMap.set(String(d._id), {
//         drawingNo: d.drawingNo,
//         projectType: d.projectType || d.quoteType || null,
//       });
//     });

//     // =========================================================
//     // Final Response List
//     // =========================================================

//     const finalList = [];

//     workOrders.forEach((wo) => {
//       const proj = projectMap.get(String(wo.projectId)) || {};

//       const customerName =
//         customerMap.get(String(proj.customerId)) || null;

//       // =====================================================
//       // NO ITEMS
//       // =====================================================

//       if (!wo.items || wo.items.length === 0) {
//         finalList.push({
//           workOrderId: wo._id,

//           workOrderNo: wo.workOrderNo || null,
//           poNumber: wo.poNumber || null,

//           projectName: proj?.name || null,
//           customerName,

//           drawingNo: null,

//           posNo: wo?.posNo || null,

//           quantity: Number(wo?.quantity || 0),

//           needDate: wo?.needDate || null,

//           projectType: wo.projectType || null,

//           completeDate:
//             wo.completeDate ||
//             wo.updatedAt ||
//             null,

//           status: wo.status || null,
//         });
//       }

//       // =====================================================
//       // ITEMS EXISTS
//       // =====================================================

//       else {
//         wo.items.forEach((it) => {
//          const drawingId =
//   it.drawingId ||
//   wo.drawingId;

// const drawing =
//   drawingMap.get(String(drawingId)) || {};

//           finalList.push({
//             workOrderId: wo._id,

//             // ✅ Main fields
//             workOrderNo: wo.workOrderNo || null,

//             poNumber:
//               wo.poNumber ||
//               it.poNumber ||
//               null,

//             // ✅ Project
//             projectName: proj?.name || null,
//             customerName,

//             // ✅ Drawing
//             drawingNo:
//   drawingMap.get(String(wo.drawingId))?.drawingNo || null,

//             // ✅ POS
//             posNo:
//               it.posNo ||
//               wo.posNo ||
//               null,

//             // ✅ Qty
//             quantity: Number(it.quantity || 0),

//             // ✅ Need Date
//             needDate:
//               it.needDate ||
//               wo.needDate ||
//               null,

//             // ✅ Project Type
//             projectType:
//               it.projectType ||
//               drawing?.projectType ||
//               wo.projectType ||
//               null,

//             // ✅ Dates
//             completeDate:
//               wo.completeDate ||
//               wo.updatedAt ||
//               null,

//             // ✅ Status
//             status: wo.status || null,
//           });
//         });
//       }
//     });

//     // =========================================================
//     // Response
//     // =========================================================

//     return res.json({
//       success: true,
//       message: "Completed work orders fetched successfully",

//       data: finalList,

//       pagination: {
//         total,
//         page,
//         limit,
//         pages: Math.ceil(total / limit),
//       },
//     });
//   } catch (error) {
//     console.error("getCompleteWorkOrders error:", error);

//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// export const getCompleteWorkOrders = async (req, res) => {
//   try {
//     let { page = 1, limit = 20, search = "" } = req.query;

//     page = Number(page) || 1;
//     limit = Number(limit) || 20;
//     const skip = (page - 1) * limit;

//     // ✔️ Only completed work orders
//     const baseQuery = { status: "Completed" };

//     if (search) {
//       baseQuery.$or = [
//         { workOrderNo: { $regex: search, $options: "i" } },
//         { poNumber: { $regex: search, $options: "i" } },
//       ];
//     }

//     // 1️⃣ Fetch completed work orders
//     const [workOrders, total] = await Promise.all([
//       WorkOrder.find(baseQuery)
//         .sort({ completeDate: -1 })
//         .skip(skip)
//         .limit(limit)
//         .lean(),
//       WorkOrder.countDocuments(baseQuery),
//     ]);

//     if (!workOrders.length) {
//       return res.json({
//         success: true,
//         message: "No completed work orders",
//         data: [],
//         pagination: { total: 0, page, limit, pages: 0 },
//       });
//     }

//     // 2️⃣ Collect Project & Drawing IDs
//     const projectIds = [];
//     const drawingIds = [];

//     workOrders.forEach((wo) => {
//       if (wo.projectId) projectIds.push(String(wo.projectId));
//       // items removed? → OR if items exist, pickup drawingId
//       (wo.items || []).forEach((it) => {
//         if (it.drawingId) drawingIds.push(String(it.drawingId));
//       });
//     });

//     // 3️⃣ Fetch Projects
//     const projectDocs = await Project.find({
//       _id: { $in: projectIds },
//     })
//       .select("projectName customerId")
//       .lean();

//     const projectMap = new Map();
//     projectDocs.forEach((p) => {
//       projectMap.set(String(p._id), {
//         name: p.projectName,
//         customerId: p.customerId,
//       });
//     });

//     // 4️⃣ Fetch Customers
//     const customerIds = projectDocs
//       .map((p) => p.customerId)
//       .filter(Boolean)
//       .map((id) => String(id));

//     const customerDocs = await Customer.find({
//       _id: { $in: customerIds },
//     })
//       .select("companyName")
//       .lean();

//     const customerMap = new Map();
//     customerDocs.forEach((c) => {
//       customerMap.set(String(c._id), c.companyName);
//     });

//     // 5️⃣ Fetch Drawings
//     const drawingDocs = await Drawing.find({
//       _id: { $in: drawingIds },
//     })
//       .select("drawingNo")
//       .lean();

//     const drawingMap = new Map();
//     drawingDocs.forEach((d) => {
//       drawingMap.set(String(d._id), d.drawingNo);
//     });

//     // 6️⃣ Final flat mapped list
//     const finalList = [];

//     workOrders.forEach((wo) => {
//       const proj = projectMap.get(String(wo.projectId)) || {};
//       const customerName = customerMap.get(proj.customerId) || null;

//       // WorkOrder level — if NO `items` → single row
//       if (!wo.items || wo.items.length === 0) {
//         finalList.push({
//           workOrderId: wo._id,
//           workOrderNo: wo.workOrderNo || null,
//           poNumber: wo.poNumber || null,
//           projectName: proj?.name || null,
//           customerName,

//           drawingNo: null,
//           posNo: null,
//           quantity: wo?.quantity,

//           projectType: wo.projectType || null,
//           completeDate: wo.completeDate || wo.updatedAt || null,
//           status: wo.status,
//         });
//       } else {
//         // If items exist → each item in new row
//         wo.items.forEach((it) => {
//           finalList.push({
//             workOrderId: wo._id,
//             workOrderNo: wo.workOrderNo || null,
//             poNumber: wo.poNumber || null,
//             projectName: proj?.name || null,
//             customerName,

//             drawingNo: drawingMap.get(String(it.drawingId)) || null,
//             posNo: it.posNo ?? null,
//             quantity: it.quantity ?? 0,

//             projectType: it.projectType || wo.projectType,
//             completeDate: wo.completeDate || wo.updatedAt || null,
//             status: wo.status,
//           });
//         });
//       }
//     });

//     return res.json({
//       success: true,
//       message: "Completed work orders fetched successfully",
//       data: finalList,
//       pagination: {
//         total,
//         page,
//         limit,
//         pages: Math.ceil(total / limit),
//       },
//     });
//   } catch (error) {
//     console.error("getCompleteWorkOrders error:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };


// export const saveWorkOrderStage = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       stage,
//       comments,
//       stageQty,
//       materials = [],
//     } = req.body;

//     const wo = await WorkOrder.findById(id);
//     if (!wo) {
//       return res.status(404).json({
//         success: false,
//         message: "Work order not found",
//       });
//     }

//     const processKey = mapStageToProcessKey(stage);
//     if (!processKey) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid stage",
//       });
//     }

//     const additionalQty = Number(stageQty || 0);
//     const userId = req.user?._id;

//     const getStageQty = (key) =>
//       wo.processHistory?.find((p) => p.process === key)?.qty || 0;

//     const pickingDone = getStageQty("picking");
//     const cableHarnessDone = getStageQty("cable_harness");
//     const assemblyDone = getStageQty("assembly");
//     const labellingDone = getStageQty("labelling");
//     const qcDone = getStageQty("quality_check");
//     const pickingAssemblyDone = getStageQty("picking_assembly");

//     const hasShortage = materials.some(
//       (m) => m.shortage === true || Number(m.shortageQty || 0) > 0
//     );

//     // ============================================================
//     // VALIDATIONS
//     // ============================================================

//     if (wo.projectType === "other") {
//       if (processKey === "picking_assembly") {
//         if (hasShortage && additionalQty > 0) {
//           return res.status(400).json({
//             success: false,
//             message: "Cannot enter Produce Qty while shortage exists",
//           });
//         }
//         if (pickingAssemblyDone + additionalQty > wo.quantity) {
//           return res.status(400).json({
//             success: false,
//             message: "Picking & Assembly quantity exceeds work order quantity",
//           });
//         }
//       }
//       if (processKey === "quality_check") {
//         if (qcDone + additionalQty > pickingAssemblyDone) {
//           return res.status(400).json({
//             success: false,
//             message: "QC cannot exceed Picking & Assembly quantity",
//           });
//         }
//       }
//     }
//     else if (wo.projectType === "box_build") {
//       if (processKey === "picking") {
//         if (hasShortage && additionalQty > 0) {
//           return res.status(400).json({
//             success: false,
//             message: "Cannot enter Produce Qty while shortage exists",
//           });
//         }
//         if (pickingDone + additionalQty > wo.quantity) {
//           return res.status(400).json({
//             success: false,
//             message: "Picking quantity exceeds work order quantity",
//           });
//         }
//       }
//       if (processKey === "assembly") {
//         if (assemblyDone + additionalQty > pickingDone) {
//           return res.status(400).json({
//             success: false,
//             message: "Assembly cannot exceed picked quantity",
//           });
//         }
//       }
//       if (processKey === "quality_check") {
//         if (qcDone + additionalQty > assemblyDone) {
//           return res.status(400).json({
//             success: false,
//             message: "QC cannot exceed assembly quantity",
//           });
//         }
//       }
//     }
//     else if (wo.projectType === "cable_harness") {
//       if (processKey === "picking") {
//         if (hasShortage && additionalQty > 0) {
//           return res.status(400).json({
//             success: false,
//             message: "Cannot enter Produce Qty while shortage exists",
//           });
//         }
//         if (pickingDone + additionalQty > wo.quantity) {
//           return res.status(400).json({
//             success: false,
//             message: "Picking quantity exceeds work order quantity",
//           });
//         }
//       }
//       if (processKey === "cable_harness") {
//         if (cableHarnessDone + additionalQty > pickingDone) {
//           return res.status(400).json({
//             success: false,
//             message: "Cable Harness cannot exceed picked quantity",
//           });
//         }
//       }
//       if (processKey === "labelling") {
//         if (labellingDone + additionalQty > cableHarnessDone) {
//           return res.status(400).json({
//             success: false,
//             message: "Labelling cannot exceed Cable Harness quantity",
//           });
//         }
//       }
//       if (processKey === "quality_check") {
//         if (qcDone + additionalQty > labellingDone) {
//           return res.status(400).json({
//             success: false,
//             message: "QC cannot exceed Labelling quantity",
//           });
//         }
//       }
//     }

//     // ============================================================
//     // INVENTORY DEDUCTION
//     // ============================================================

//     if (processKey === "picking") {
//       const existingProcess = wo.processHistory?.find(p => p.process === "picking");

//       for (const material of materials) {
//         const currentPickedQty = Number(material.pickedQty || 0);
//         if (currentPickedQty <= 0) continue;

//         const previousEntries = existingProcess?.details?.filter(
//           (d) => String(d.mpnId) === String(material.mpnId)
//         ) || [];

//         const totalAlreadyPicked = previousEntries.reduce(
//           (sum, entry) => sum + Number(entry.pickedQty || 0), 0
//         );

//         const totalRequiredQty = Number(material.quantity || 0) * Number(wo.quantity || 0);
//         const remainingAllowed = totalRequiredQty - totalAlreadyPicked;

//         if (currentPickedQty > remainingAllowed) {
//           return res.status(400).json({
//             success: false,
//             message: `Max allowed for ${material.mpn}: ${remainingAllowed}`,
//           });
//         }

//         const inventory = await Inventory.findOne({ mpnId: material.mpnId }).populate("mpnId");
//         if (!inventory) {
//           return res.status(400).json({
//             success: false,
//             message: `Inventory not found for ${material.mpn}`,
//           });
//         }

//         const baseQty = await convertToInventoryUom({
//           qty: currentPickedQty,
//           fromUom: material.uomId,
//           toUom: inventory.mpnId.UOM,
//         });

//         if (inventory.balanceQuantity < baseQty) {
//           return res.status(400).json({
//             success: false,
//             message: `Insufficient stock for ${material.mpn}`,
//           });
//         }

//         inventory.balanceQuantity -= baseQty;
//         await inventory.save();
//       }
//     }

//     // ============================================================
//     // PROCESS HISTORY UPDATE - REPLACE INSTEAD OF APPEND
//     // ============================================================

//     if (!Array.isArray(wo.processHistory)) wo.processHistory = [];

//     let existing = wo.processHistory.find((p) => p.process === processKey);

//     // 🔥 CRITICAL: Calculate final shortage status based on total picked qty
//     const calculateFinalShortage = (material, totalPickedAfterThis, totalRequired) => {
//       // If total picked qty equals required qty, NO shortage
//       if (totalPickedAfterThis >= totalRequired) {
//         return { shortage: false, shortageQty: 0 };
//       }
//       // Otherwise, use the provided shortage status
//       return {
//         shortage: material.shortage,
//         shortageQty: material.shortageQty
//       };
//     };

//     // Get previous details to calculate totals
//     const previousDetails = existing?.details || [];

//     // Create a map of final status per mpnId
//     const finalStatusPerMpn = {};

//     // First, add all previous entries
//     for (const prevDetail of previousDetails) {
//       const mpnId = String(prevDetail.mpnId);
//       if (!finalStatusPerMpn[mpnId]) {
//         finalStatusPerMpn[mpnId] = {
//           totalPickedQty: 0,
//           latestShortage: prevDetail.shortage,
//           latestShortageQty: prevDetail.shortageQty,
//           quantity: prevDetail.quantity,
//           uomId: prevDetail.uomId,
//           uom: prevDetail.uom,
//           mpn: prevDetail.mpn,
//         };
//       }
//       finalStatusPerMpn[mpnId].totalPickedQty += Number(prevDetail.pickedQty || 0);
//     }

//     // Then, add current materials
//     for (const material of materials) {
//       const mpnId = String(material.mpnId);
//       const currentPickedQty = Number(material.pickedQty || 0);

//       if (!finalStatusPerMpn[mpnId]) {
//         finalStatusPerMpn[mpnId] = {
//           totalPickedQty: 0,
//           quantity: material.quantity,
//           uomId: material.uomId,
//           uom: material.uom,
//           mpn: material.mpn,
//         };
//       }
//       finalStatusPerMpn[mpnId].totalPickedQty += currentPickedQty;
//       finalStatusPerMpn[mpnId].latestShortage = material.shortage;
//       finalStatusPerMpn[mpnId].latestShortageQty = material.shortageQty;
//     }

//     // Calculate final shortage status for each mpnId
//     const finalDetails = [];
//     for (const mpnId in finalStatusPerMpn) {
//       const data = finalStatusPerMpn[mpnId];
//       const totalRequired = Number(data.quantity || 1) * Number(wo.quantity || 0);

//       // 🔥 If total picked qty equals required qty, NO shortage
//       let finalShortage = data.latestShortage;
//       let finalShortageQty = data.latestShortageQty;

//       if (data.totalPickedQty >= totalRequired) {
//         finalShortage = false;
//         finalShortageQty = 0;
//       }

//       finalDetails.push({
//         mpnId: mpnId,
//         mpn: data.mpn,
//         pickedQty: data.totalPickedQty,
//         shortage: finalShortage,
//         shortageQty: finalShortageQty,
//         quantity: data.quantity,
//         uomId: data.uomId,
//         uom: data.uom,
//         pickedAt: new Date(),
//       });
//     }

//     if (existing) {
//       existing.qty += additionalQty;
//       existing.completedBy = userId;
//       existing.completedAt = new Date();
//       existing.comments = existing.comments || [];
//       existing.comments.push({ 
//         comment: comments, 
//         commentedBy: userId,
//         commentedAt: new Date()
//       });
//       // 🔥 REPLACE details instead of append
//       existing.details = finalDetails;
//     } else {
//       wo.processHistory.push({
//         process: processKey,
//         qty: additionalQty,
//         completedBy: userId,
//         completedAt: new Date(),
//         createdAt: new Date(),
//         comments: [{ 
//           comment: comments, 
//           commentedBy: userId,
//           commentedAt: new Date()
//         }],
//         details: finalDetails,
//       });
//     }

//     // ============================================================
//     // UPDATE STATUS
//     // ============================================================

//     updateWorkOrderStatus(wo);
//     await wo.save();

//     return res.json({
//       success: true,
//       message: `${stage} saved successfully`,
//       data: wo,
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// ============================================================
// UPDATE STATUS (FIXED - Checks actual shortage)
// ============================================================

// const updateWorkOrderStatus = (wo) => {
//   const totalQty = Number(wo.quantity || 0);

//   const getStageQty = (key) =>
//     wo.processHistory?.find((p) => p.process === key)?.qty || 0;

//   const hasStageShortage = (key) => {
//     const entry = wo.processHistory?.find((p) => p.process === key);
//     if (!entry?.details) return false;

//     // Get the latest entry per mpnId
//     const latestPerMpn = {};
//     for (const detail of entry.details) {
//       const mpnId = String(detail.mpnId);
//       if (!latestPerMpn[mpnId] || new Date(detail.pickedAt) > new Date(latestPerMpn[mpnId].pickedAt)) {
//         latestPerMpn[mpnId] = detail;
//       }
//     }

//     return Object.values(latestPerMpn).some(
//       (d) => d.shortage === true || Number(d.shortageQty || 0) > 0
//     );
//   };

//   // Define stages based on project type
//   let stages = [];
//   if (wo.projectType === "other") {
//     stages = ["picking_assembly", "quality_check"];
//   } else if (wo.projectType === "box_build") {
//     stages = ["picking", "assembly", "quality_check"];
//   } else if (wo.projectType === "cable_harness") {
//     stages = ["picking", "cable_harness", "labelling", "quality_check"];
//   } else {
//     stages = ["picking", "assembly", "quality_check"];
//   }

//   const formatStageName = (key) => {
//     const map = {
//       picking: "Picking",
//       cable_harness: "Cable Harness",
//       assembly: "Assembly",
//       labelling: "Labelling",
//       quality_check: "Quality Check",
//       picking_assembly: "Picking & Assembly",
//     };
//     return map[key] || key;
//   };

//   // 🔥 FIX: Track which stages are complete
//   let lastCompletedStage = null;
//   let currentStage = null;

//   for (let i = 0; i < stages.length; i++) {
//     const stageKey = stages[i];
//     const doneQty = getStageQty(stageKey);
//     const hasShortage = hasStageShortage(stageKey);

//     console.log(`[Status] Stage ${stageKey}: doneQty=${doneQty}/${totalQty}, hasShortage=${hasShortage}`);

//     // Stage is fully complete (qty met, no shortage)
//     if (doneQty >= totalQty && !hasShortage && totalQty > 0) {
//       lastCompletedStage = stageKey;
//       console.log(`[Status] Stage ${stageKey} is COMPLETE`);
//       continue;
//     }

//     // Stage has some progress or shortage
//     if (doneQty > 0 || hasShortage) {
//       currentStage = stageKey;
//       console.log(`[Status] Stage ${stageKey} is IN PROGRESS`);
//       break;
//     }

//     // Stage not started yet
//     if (doneQty === 0 && !hasShortage) {
//       // If previous stage is complete, this stage is pending
//       if (lastCompletedStage === stages[i - 1]) {
//         currentStage = stageKey;
//         console.log(`[Status] Stage ${stageKey} is PENDING (waiting to start)`);
//       } else {
//         currentStage = stageKey;
//       }
//       break;
//     }
//   }

//   // 🔥 Determine final status
//   // Case 1: All stages complete
//   const allStagesComplete = stages.every(key => {
//     const doneQty = getStageQty(key);
//     const hasShortage = hasStageShortage(key);
//     return doneQty >= totalQty && !hasShortage;
//   });

//   if (allStagesComplete && totalQty > 0) {
//     console.log(`[Status] ALL STAGES COMPLETE -> Completed`);
//     wo.status = "Completed";
//     wo.isProductionComplete = true;
//     wo.isInProduction = false;
//     wo.completeDate = new Date();
//     return;
//   }

//   // Case 2: Current stage found
//   if (currentStage) {
//     const doneQty = getStageQty(currentStage);
//     const hasShortage = hasStageShortage(currentStage);

//     if (doneQty >= totalQty && !hasShortage && totalQty > 0) {
//       wo.status = `${formatStageName(currentStage)} Done`;
//       console.log(`[Status] ${formatStageName(currentStage)} Done`);
//     } else {
//       wo.status = `${formatStageName(currentStage)} In Progress`;
//       console.log(`[Status] ${formatStageName(currentStage)} In Progress`);
//     }
//     wo.isInProduction = true;
//     wo.isProductionComplete = false;
//     return;
//   }

//   // Case 3: Last completed stage found but no current stage
//   if (lastCompletedStage) {
//     wo.status = `${formatStageName(lastCompletedStage)} Done`;
//     console.log(`[Status] ${formatStageName(lastCompletedStage)} Done (last completed)`);
//     wo.isInProduction = true;
//     wo.isProductionComplete = false;
//     return;
//   }

//   // Case 4: No progress at all
//   const hasAnyProgress = wo.processHistory?.some(p => p.qty > 0 || p.details?.length > 0);
//   if (!hasAnyProgress) {
//     wo.status = "Not Start Yet";
//     wo.isInProduction = false;
//   } else {
//     wo.status = "In Progress";
//     wo.isInProduction = true;
//   }
//   wo.isProductionComplete = false;

//   console.log(`[Status] FINAL STATUS: ${wo.status}`);
// };
// ============================================================
// UPDATE WORK ORDER STATUS (FIXED)
// ============================================================

// const updateWorkOrderStatus = (wo) => {
//   const totalQty = Number(wo.quantity || 0);

//   // If no quantity, return
//   if (totalQty === 0) {
//     wo.status = "Not Start Yet";
//     return;
//   }

//   const getStageQty = (key) =>
//     wo.processHistory?.find((p) => p.process === key)?.qty || 0;

//   const hasStageShortage = (key) => {
//     const entry = wo.processHistory?.find((p) => p.process === key);
//     return entry?.details?.some(
//       (m) => m.shortage === true || Number(m.shortageQty || 0) > 0
//     );
//   };

//   // Define stages based on project type
//   let stages = [];

//   if (wo.projectType === "other") {
//     stages = ["picking_assembly", "quality_check"];
//   } 
//   else if (wo.projectType === "box_build") {
//     stages = ["picking", "assembly", "quality_check"];
//   } 
//   else if (wo.projectType === "cable_harness") {
//     stages = ["picking", "cable_harness", "labelling", "quality_check"];
//   }
//   else {
//     stages = ["picking", "assembly", "quality_check"];
//   }

//   const formatStageName = (key) => {
//     const map = {
//       picking: "Picking",
//       cable_harness: "Cable Harness",
//       assembly: "Assembly",
//       labelling: "Labelling",
//       quality_check: "Quality Check",
//       picking_assembly: "Picking & Assembly",
//     };
//     return map[key] || key;
//   };

//   let hasAnyProgress = wo.processHistory?.some(p => p.qty > 0 || p.details?.length > 0) || false;

//   // Check which stage we're on
//   let currentStageIndex = -1;
//   let lastCompletedStageIndex = -1;

//   for (let i = 0; i < stages.length; i++) {
//     const stageKey = stages[i];
//     const doneQty = getStageQty(stageKey);
//     const hasShortage = hasStageShortage(stageKey);
//     const isComplete = doneQty >= totalQty && !hasShortage;

//     if (isComplete) {
//       lastCompletedStageIndex = i;
//       continue;
//     }

//     // If not complete, this is current stage
//     if (doneQty > 0 || hasShortage) {
//       currentStageIndex = i;
//       break;
//     }

//     // If stage has no progress and we haven't found current, this is current
//     if (currentStageIndex === -1 && doneQty === 0 && !hasShortage) {
//       // If previous stage is complete, this is current
//       if (lastCompletedStageIndex === i - 1 || i === 0) {
//         currentStageIndex = i;
//         break;
//       }
//     }
//   }

//   // 🔥 If all stages are complete
//   const allComplete = stages.every(key => {
//     const doneQty = getStageQty(key);
//     const hasShortage = hasStageShortage(key);
//     return doneQty >= totalQty && !hasShortage;
//   });

//   if (allComplete && totalQty > 0) {
//     wo.status = "Completed";
//     wo.isProductionComplete = true;
//     wo.isInProduction = false;
//     wo.completeDate = new Date();
//     return;
//   }

//   // 🔥 If current stage found
//   if (currentStageIndex !== -1) {
//     const currentStageKey = stages[currentStageIndex];
//     const currentDoneQty = getStageQty(currentStageKey);
//     const hasShortage = hasStageShortage(currentStageKey);

//     // If current stage is fully done (qty met, no shortage)
//     if (currentDoneQty >= totalQty && !hasShortage) {
//       wo.status = `${formatStageName(currentStageKey)} Done`;
//     } else {
//       wo.status = `${formatStageName(currentStageKey)} In Progress`;
//     }
//     wo.isInProduction = true;
//     wo.isProductionComplete = false;
//     return;
//   }

//   // 🔥 If last stage completed but not all (partial)
//   if (lastCompletedStageIndex !== -1 && lastCompletedStageIndex < stages.length - 1) {
//     const lastCompletedKey = stages[lastCompletedStageIndex];
//     wo.status = `${formatStageName(lastCompletedKey)} Done`;
//     wo.isInProduction = true;
//     wo.isProductionComplete = false;
//     return;
//   }

//   // 🔥 Not started
//   if (!hasAnyProgress) {
//     wo.status = "Not Start Yet";
//     wo.isInProduction = false;
//     wo.isProductionComplete = false;
//   } else {
//     wo.status = "In Progress";
//     wo.isInProduction = true;
//     wo.isProductionComplete = false;
//   }
// };

// ============================================================
// MAP STAGE TO PROCESS KEY
// ============================================================

// const mapStageToProcessKey = (stage) => {
//   const stageLower = stage?.toLowerCase();

//   switch (stageLower) {
//     case "picking":
//       return "picking";
//     case "cable harness":
//     case "cable_harness":
//       return "cable_harness";
//     case "assembly":
//       return "assembly";
//     case "labelling":
//       return "labelling";
//     case "quality check":
//     case "quality_check":
//       return "quality_check";
//     case "picking/assembly":
//     case "picking_assembly":
//       return "picking_assembly";
//     default:
//       return null;
//   }
// };


// export const saveWorkOrderStage = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       stage,
//       comments,
//       stageQty,
//       materials = [],
//     } = req.body;

//     const wo = await WorkOrder.findById(id);
//     if (!wo) {
//       return res.status(404).json({
//         success: false,
//         message: "Work order not found",
//       });
//     }

//     const processKey = mapStageToProcessKey(stage);
//     if (!processKey) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid stage",
//       });
//     }

//     const additionalQty = Number(stageQty || 0);
//     const userId = req.user?._id;

//     console.log(`===== SAVING ${stage} (${processKey}) =====`);
//     console.log(`additionalQty: ${additionalQty}`);

//     const getStageQty = (key) =>
//       wo.processHistory?.find((p) => p.process === key)?.qty || 0;

//     const pickingDone = getStageQty("picking");
//     const cableHarnessDone = getStageQty("cable_harness");
//     const assemblyDone = getStageQty("assembly");
//     const labellingDone = getStageQty("labelling");
//     const qcDone = getStageQty("quality_check");
//     const pickingAssemblyDone = getStageQty("picking_assembly");

//     const hasShortage = materials.some(
//       (m) => m.shortage === true || Number(m.shortageQty || 0) > 0
//     );

//     // ============================================================
//     // VALIDATIONS
//     // ============================================================

//     if (wo.projectType === "other") {
//       if (processKey === "picking_assembly") {
//         if (hasShortage && additionalQty > 0) {
//           return res.status(400).json({
//             success: false,
//             message: "Cannot enter Produce Qty while shortage exists",
//           });
//         }
//         if (pickingAssemblyDone + additionalQty > wo.quantity) {
//           return res.status(400).json({
//             success: false,
//             message: "Picking & Assembly quantity exceeds work order quantity",
//           });
//         }
//       }
//       if (processKey === "quality_check") {
//         if (qcDone + additionalQty > pickingAssemblyDone) {
//           return res.status(400).json({
//             success: false,
//             message: "QC cannot exceed Picking & Assembly quantity",
//           });
//         }
//       }
//     }
//     else if (wo.projectType === "box_build") {
//       if (processKey === "picking") {
//         if (hasShortage && additionalQty > 0) {
//           return res.status(400).json({
//             success: false,
//             message: "Cannot enter Produce Qty while shortage exists",
//           });
//         }
//         if (pickingDone + additionalQty > wo.quantity) {
//           return res.status(400).json({
//             success: false,
//             message: "Picking quantity exceeds work order quantity",
//           });
//         }
//       }
//       if (processKey === "assembly") {
//         if (assemblyDone + additionalQty > pickingDone) {
//           return res.status(400).json({
//             success: false,
//             message: "Assembly cannot exceed picked quantity",
//           });
//         }
//       }
//       if (processKey === "quality_check") {
//         if (qcDone + additionalQty > assemblyDone) {
//           return res.status(400).json({
//             success: false,
//             message: "QC cannot exceed assembly quantity",
//           });
//         }
//       }
//     }
//     else if (wo.projectType === "cable_harness") {
//       if (processKey === "picking") {
//         if (hasShortage && additionalQty > 0) {
//           return res.status(400).json({
//             success: false,
//             message: "Cannot enter Produce Qty while shortage exists",
//           });
//         }
//         if (pickingDone + additionalQty > wo.quantity) {
//           return res.status(400).json({
//             success: false,
//             message: "Picking quantity exceeds work order quantity",
//           });
//         }
//       }
//       if (processKey === "cable_harness") {
//         if (cableHarnessDone + additionalQty > pickingDone) {
//           return res.status(400).json({
//             success: false,
//             message: "Cable Harness cannot exceed picked quantity",
//           });
//         }
//       }
//       if (processKey === "labelling") {
//         if (labellingDone + additionalQty > cableHarnessDone) {
//           return res.status(400).json({
//             success: false,
//             message: "Labelling cannot exceed Cable Harness quantity",
//           });
//         }
//       }
//       if (processKey === "quality_check") {
//         if (qcDone + additionalQty > labellingDone) {
//           return res.status(400).json({
//             success: false,
//             message: "QC cannot exceed Labelling quantity",
//           });
//         }
//       }
//     }

//     // ============================================================
//     // INVENTORY DEDUCTION (Only for Picking stage)
//     // ============================================================

//     if (processKey === "picking") {
//       const existingProcess = wo.processHistory?.find(p => p.process === "picking");

//       for (const material of materials) {
//         const currentPickedQty = Number(material.pickedQty || 0);
//         if (currentPickedQty <= 0) continue;

//         const previousEntries = existingProcess?.details?.filter(
//           (d) => String(d.mpnId) === String(material.mpnId)
//         ) || [];

//         const totalAlreadyPicked = previousEntries.reduce(
//           (sum, entry) => sum + Number(entry.pickedQty || 0), 0
//         );

//         const totalRequiredQty = Number(material.quantity || 0) * Number(wo.quantity || 0);
//         const remainingAllowed = totalRequiredQty - totalAlreadyPicked;

//         if (currentPickedQty > remainingAllowed) {
//           return res.status(400).json({
//             success: false,
//             message: `Max allowed for ${material.mpn}: ${remainingAllowed}`,
//           });
//         }

//         const inventory = await Inventory.findOne({ mpnId: material.mpnId }).populate("mpnId");
//         if (!inventory) {
//           return res.status(400).json({
//             success: false,
//             message: `Inventory not found for ${material.mpn}`,
//           });
//         }

//         const baseQty = await convertToInventoryUom({
//           qty: currentPickedQty,
//           fromUom: material.uomId,
//           toUom: inventory.mpnId.UOM,
//         });

//         if (inventory.balanceQuantity < baseQty) {
//           return res.status(400).json({
//             success: false,
//             message: `Insufficient stock for ${material.mpn}`,
//           });
//         }

//         inventory.balanceQuantity -= baseQty;
//         await inventory.save();
//       }
//     }

//     // ============================================================
//     // PROCESS HISTORY UPDATE
//     // ============================================================

//     if (!Array.isArray(wo.processHistory)) wo.processHistory = [];

//     let existing = wo.processHistory.find((p) => p.process === processKey);

//     console.log(`Existing ${processKey} stage:`, existing ? `qty=${existing.qty}` : "not found");

//     if (existing) {
//       // 🔥 CRITICAL FIX: Add the additional quantity
//       const oldQty = existing.qty || 0;
//       existing.qty = oldQty + additionalQty;
//       console.log(`Updated ${processKey} qty: ${oldQty} + ${additionalQty} = ${existing.qty}`);

//       existing.completedBy = userId;
//       existing.completedAt = new Date();
//       existing.comments = existing.comments || [];
//       if (comments) {
//         existing.comments.push({ 
//           comment: comments, 
//           commentedBy: userId,
//           commentedAt: new Date()
//         });
//       }

//       // Update details if materials provided
//       if (materials.length > 0) {
//         // Create a map of final status per mpnId
//         const finalStatusPerMpn = {};

//         // First, add all previous entries
//         for (const prevDetail of (existing.details || [])) {
//           const mpnId = String(prevDetail.mpnId);
//           if (!finalStatusPerMpn[mpnId]) {
//             finalStatusPerMpn[mpnId] = {
//               totalPickedQty: 0,
//               latestShortage: prevDetail.shortage,
//               latestShortageQty: prevDetail.shortageQty,
//               quantity: prevDetail.quantity,
//               uomId: prevDetail.uomId,
//               uom: prevDetail.uom,
//               mpn: prevDetail.mpn,
//             };
//           }
//           finalStatusPerMpn[mpnId].totalPickedQty += Number(prevDetail.pickedQty || 0);
//         }

//         // Then, add current materials
//         for (const material of materials) {
//           const mpnId = String(material.mpnId);
//           const currentPickedQty = Number(material.pickedQty || 0);

//           if (!finalStatusPerMpn[mpnId]) {
//             finalStatusPerMpn[mpnId] = {
//               totalPickedQty: 0,
//               quantity: material.quantity,
//               uomId: material.uomId,
//               uom: material.uom,
//               mpn: material.mpn,
//             };
//           }
//           finalStatusPerMpn[mpnId].totalPickedQty += currentPickedQty;
//           finalStatusPerMpn[mpnId].latestShortage = material.shortage;
//           finalStatusPerMpn[mpnId].latestShortageQty = material.shortageQty;
//         }

//         // Calculate final shortage status
//         const finalDetails = [];
//         for (const mpnId in finalStatusPerMpn) {
//           const data = finalStatusPerMpn[mpnId];
//           const totalRequired = Number(data.quantity || 1) * Number(wo.quantity || 0);

//           let finalShortage = data.latestShortage;
//           let finalShortageQty = data.latestShortageQty;

//           if (data.totalPickedQty >= totalRequired) {
//             finalShortage = false;
//             finalShortageQty = 0;
//           }

//           finalDetails.push({
//             mpnId: mpnId,
//             mpn: data.mpn,
//             pickedQty: data.totalPickedQty,
//             shortage: finalShortage,
//             shortageQty: finalShortageQty,
//             quantity: data.quantity,
//             uomId: data.uomId,
//             uom: data.uom,
//             pickedAt: new Date(),
//           });
//         }

//         existing.details = finalDetails;
//       }
//     } else {
//       // New process history entry
//       console.log(`Creating new ${processKey} stage with qty: ${additionalQty}`);

//       const materialsWithDetails = materials.map((m) => ({
//         mpnId: m.mpnId,
//         mpn: m.mpn,
//         pickedQty: Number(m.pickedQty || 0),
//         shortage: m.shortage || false,
//         shortageQty: m.shortageQty || 0,
//         quantity: m.quantity,
//         uomId: m.uomId,
//         uom: m.uom,
//         pickedAt: new Date(),
//       }));

//       wo.processHistory.push({
//         process: processKey,
//         qty: additionalQty,
//         completedBy: userId,
//         completedAt: new Date(),
//         createdAt: new Date(),
//         comments: comments ? [{ 
//           comment: comments, 
//           commentedBy: userId,
//           commentedAt: new Date()
//         }] : [],
//         details: materialsWithDetails,
//       });
//     }

//     // ============================================================
//     // UPDATE STATUS
//     // ============================================================

//     updateWorkOrderStatus(wo);
//     await wo.save();

//     console.log(`Final status: ${wo.status}`);

//     return res.json({
//       success: true,
//       message: `${stage} saved successfully`,
//       data: wo,
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// ============================================================
// UPDATE WORK ORDER STATUS (FIXED)
// ============================================================

// const updateWorkOrderStatus = (wo) => {
//   const totalQty = Number(wo.quantity || 0);

//   const getStageQty = (key) =>
//     wo.processHistory?.find((p) => p.process === key)?.qty || 0;

//   const hasStageShortage = (key) => {
//     const entry = wo.processHistory?.find((p) => p.process === key);
//     if (!entry?.details) return false;

//     // 🔥 Check if ANY detail has shortage = true
//     return entry.details.some(d => d.shortage === true);
//   };

//   // Define stages based on project type
//   let stages = [];
//   if (wo.projectType === "other") {
//     stages = ["picking_assembly", "quality_check"];
//   } else if (wo.projectType === "box_build") {
//     stages = ["picking", "assembly", "quality_check"];
//   } else if (wo.projectType === "cable_harness") {
//     stages = ["picking", "cable_harness", "labelling", "quality_check"];
//   } else {
//     stages = ["picking", "assembly", "quality_check"];
//   }

//   const formatStageName = (key) => {
//     const map = {
//       picking: "Picking",
//       cable_harness: "Cable Harness",
//       assembly: "Assembly",
//       labelling: "Labelling",
//       quality_check: "Quality Check",
//       picking_assembly: "Picking & Assembly",
//     };
//     return map[key] || key;
//   };

//   console.log(`===== STATUS UPDATE =====`);
//   console.log(`Project Type: ${wo.projectType}`);
//   console.log(`Total Qty: ${totalQty}`);

//   // 🔥 Find which stage has shortage or production quantity
//   let activeStage = null;
//   let activeStageStatus = null;

//   for (let i = 0; i < stages.length; i++) {
//     const stageKey = stages[i];
//     const doneQty = getStageQty(stageKey);
//     const hasShortage = hasStageShortage(stageKey);

//     console.log(`Stage ${stageKey}: doneQty=${doneQty}, hasShortage=${hasShortage}`);

//     // 🔥 Stage is active if:
//     // 1. It has production quantity (doneQty > 0), OR
//     // 2. It has shortage (hasShortage === true)
//     if (doneQty > 0 || hasShortage) {
//       if (doneQty >= totalQty && !hasShortage && totalQty > 0) {
//         activeStage = stageKey;
//         activeStageStatus = "done";
//       } else {
//         activeStage = stageKey;
//         activeStageStatus = "in_progress";
//       }
//       console.log(`  -> ACTIVE: ${activeStage} (${activeStageStatus})`);
//       break;
//     }
//   }

//   // 🔥 If no stage has production or shortage, check for completed stages
//   if (!activeStage) {
//     for (let i = stages.length - 1; i >= 0; i--) {
//       const stageKey = stages[i];
//       const doneQty = getStageQty(stageKey);
//       if (doneQty >= totalQty && totalQty > 0) {
//         activeStage = stageKey;
//         activeStageStatus = "done";
//         console.log(`  -> COMPLETED: ${activeStage}`);
//         break;
//       }
//     }
//   }

//   // 🔥 If still no active stage, default to first stage
//   if (!activeStage && stages.length > 0) {
//     activeStage = stages[0];
//     activeStageStatus = "pending";
//     console.log(`  -> DEFAULT: ${activeStage}`);
//   }

//   // Set status
//   if (activeStage) {
//     if (activeStageStatus === "done") {
//       wo.status = `${formatStageName(activeStage)} Done`;
//     } else if (activeStageStatus === "in_progress") {
//       wo.status = `${formatStageName(activeStage)} In Progress`;
//     } else {
//       wo.status = "Not Start Yet";
//     }
//     wo.isInProduction = true;
//     wo.isProductionComplete = false;
//   }

//   // Check all stages complete
//   const allStagesComplete = stages.every(key => {
//     const doneQty = getStageQty(key);
//     const hasShortage = hasStageShortage(key);
//     return doneQty >= totalQty && !hasShortage;
//   });

//   if (allStagesComplete && totalQty > 0) {
//     wo.status = "Completed";
//     wo.isProductionComplete = true;
//     wo.isInProduction = false;
//     wo.completeDate = new Date();
//   }

//   console.log(`FINAL STATUS: ${wo.status}`);
// };

// ============================================================
// MAP STAGE TO PROCESS KEY
// ============================================================

// const mapStageToProcessKey = (stage) => {
//   const stageLower = stage?.toLowerCase();

//   switch (stageLower) {
//     case "picking":
//       return "picking";
//     case "cable harness":
//     case "cable_harness":
//       return "cable_harness";
//     case "assembly":
//       return "assembly";
//     case "labelling":
//       return "labelling";
//     case "quality check":
//     case "quality_check":
//       return "quality_check";
//     case "picking/assembly":
//     case "picking_assembly":
//       return "picking_assembly";
//     default:
//       return null;
//   }
// };

// export const saveWorkOrderStage = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       stage,
//       comments,
//       stageQty,
//       materials = [],
//     } = req.body;

//     const wo = await WorkOrder.findById(id);
//     if (!wo) {
//       return res.status(404).json({
//         success: false,
//         message: "Work order not found",
//       });
//     }

//     const processKey = mapStageToProcessKey(stage);
//     if (!processKey) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid stage",
//       });
//     }

//     const additionalQty = Number(stageQty || 0);
//     const userId = req.user?._id;

//     const getStageQty = (key) =>
//       wo.processHistory?.find((p) => p.process === key)?.qty || 0;

//     const pickingDone = getStageQty("picking");
//     const cableHarnessDone = getStageQty("cable_harness");
//     const assemblyDone = getStageQty("assembly");
//     const labellingDone = getStageQty("labelling");
//     const qcDone = getStageQty("quality_check");
//     const pickingAssemblyDone = getStageQty("picking_assembly");

//     const hasShortage = materials.some(
//       (m) => m.shortage === true || Number(m.shortageQty || 0) > 0
//     );

//     // ============================================================
//     // VALIDATIONS
//     // ============================================================

//     if (wo.projectType === "other") {
//       if (processKey === "picking_assembly") {
//         if (hasShortage && additionalQty > 0) {
//           return res.status(400).json({
//             success: false,
//             message: "Cannot enter Produce Qty while shortage exists",
//           });
//         }
//         if (pickingAssemblyDone + additionalQty > wo.quantity) {
//           return res.status(400).json({
//             success: false,
//             message: "Picking & Assembly quantity exceeds work order quantity",
//           });
//         }
//       }
//       if (processKey === "quality_check") {
//         if (qcDone + additionalQty > pickingAssemblyDone) {
//           return res.status(400).json({
//             success: false,
//             message: "QC cannot exceed Picking & Assembly quantity",
//           });
//         }
//       }
//     }
//     else if (wo.projectType === "box_build") {
//       if (processKey === "picking") {
//         if (hasShortage && additionalQty > 0) {
//           return res.status(400).json({
//             success: false,
//             message: "Cannot enter Produce Qty while shortage exists",
//           });
//         }
//         if (pickingDone + additionalQty > wo.quantity) {
//           return res.status(400).json({
//             success: false,
//             message: "Picking quantity exceeds work order quantity",
//           });
//         }
//       }
//       if (processKey === "assembly") {
//         if (assemblyDone + additionalQty > pickingDone) {
//           return res.status(400).json({
//             success: false,
//             message: "Assembly cannot exceed picked quantity",
//           });
//         }
//       }
//       if (processKey === "quality_check") {
//         if (qcDone + additionalQty > assemblyDone) {
//           return res.status(400).json({
//             success: false,
//             message: "QC cannot exceed assembly quantity",
//           });
//         }
//       }
//     }
//     else if (wo.projectType === "cable_harness") {
//       if (processKey === "picking") {
//         if (hasShortage && additionalQty > 0) {
//           return res.status(400).json({
//             success: false,
//             message: "Cannot enter Produce Qty while shortage exists",
//           });
//         }
//         if (pickingDone + additionalQty > wo.quantity) {
//           return res.status(400).json({
//             success: false,
//             message: "Picking quantity exceeds work order quantity",
//           });
//         }
//       }
//       if (processKey === "cable_harness") {
//         if (cableHarnessDone + additionalQty > pickingDone) {
//           return res.status(400).json({
//             success: false,
//             message: "Cable Harness cannot exceed picked quantity",
//           });
//         }
//       }
//       if (processKey === "labelling") {
//         if (labellingDone + additionalQty > cableHarnessDone) {
//           return res.status(400).json({
//             success: false,
//             message: "Labelling cannot exceed Cable Harness quantity",
//           });
//         }
//       }
//       if (processKey === "quality_check") {
//         if (qcDone + additionalQty > labellingDone) {
//           return res.status(400).json({
//             success: false,
//             message: "QC cannot exceed Labelling quantity",
//           });
//         }
//       }
//     }

//     // ============================================================
//     // INVENTORY DEDUCTION
//     // ============================================================

//     if (processKey === "picking") {
//       const existingProcess = wo.processHistory?.find(p => p.process === "picking");

//       for (const material of materials) {
//         const currentPickedQty = Number(material.pickedQty || 0);
//         if (currentPickedQty <= 0) continue;

//         const previousEntries = existingProcess?.details?.filter(
//           (d) => String(d.mpnId) === String(material.mpnId)
//         ) || [];

//         const totalAlreadyPicked = previousEntries.reduce(
//           (sum, entry) => sum + Number(entry.pickedQty || 0), 0
//         );

//         const totalRequiredQty = Number(material.quantity || 0) * Number(wo.quantity || 0);
//         const remainingAllowed = totalRequiredQty - totalAlreadyPicked;

//         if (currentPickedQty > remainingAllowed) {
//           return res.status(400).json({
//             success: false,
//             message: `Max allowed for ${material.mpn}: ${remainingAllowed}`,
//           });
//         }

//         const inventory = await Inventory.findOne({ mpnId: material.mpnId }).populate("mpnId");
//         if (!inventory) {
//           return res.status(400).json({
//             success: false,
//             message: `Inventory not found for ${material.mpn}`,
//           });
//         }

//         const baseQty = await convertToInventoryUom({
//           qty: currentPickedQty,
//           fromUom: material.uomId,
//           toUom: inventory.mpnId.UOM,
//         });

//         if (inventory.balanceQuantity < baseQty) {
//           return res.status(400).json({
//             success: false,
//             message: `Insufficient stock for ${material.mpn}`,
//           });
//         }

//         inventory.balanceQuantity -= baseQty;
//         await inventory.save();
//       }
//     }

//     // ============================================================
//     // PROCESS HISTORY UPDATE
//     // ============================================================

//     if (!Array.isArray(wo.processHistory)) wo.processHistory = [];

//     let existing = wo.processHistory.find((p) => p.process === processKey);

//     if (existing) {
//       // Update qty
//       existing.qty = (existing.qty || 0) + additionalQty;
//       existing.completedBy = userId;
//       existing.completedAt = new Date();
//       existing.comments = existing.comments || [];
//       if (comments) {
//         existing.comments.push({ 
//           comment: comments, 
//           commentedBy: userId,
//           commentedAt: new Date()
//         });
//       }

//       // Update details for this stage
//       if (materials.length > 0) {
//         // Create a map for this stage only
//         const stageDetailsMap = {};

//         // Add existing details for this stage
//         for (const detail of (existing.details || [])) {
//           const mpnId = String(detail.mpnId);
//           stageDetailsMap[mpnId] = {
//             ...detail,
//             pickedQty: Number(detail.pickedQty || 0),
//           };
//         }

//         // Update with new materials
//         for (const material of materials) {
//           const mpnId = String(material.mpnId);
//           const currentPickedQty = Number(material.pickedQty || 0);

//           if (stageDetailsMap[mpnId]) {
//             stageDetailsMap[mpnId].pickedQty += currentPickedQty;
//             stageDetailsMap[mpnId].shortage = material.shortage;
//             stageDetailsMap[mpnId].shortageQty = material.shortageQty || 0;
//             stageDetailsMap[mpnId].pickedAt = new Date();
//           } else {
//             stageDetailsMap[mpnId] = {
//               mpnId: material.mpnId,
//               mpn: material.mpn,
//               pickedQty: currentPickedQty,
//               shortage: material.shortage || false,
//               shortageQty: material.shortageQty || 0,
//               quantity: material.quantity,
//               uomId: material.uomId,
//               uom: material.uom,
//               pickedAt: new Date(),
//             };
//           }
//         }

//         existing.details = Object.values(stageDetailsMap);
//       }
//     } else {
//       // New stage
//       const materialsWithDetails = materials.map((m) => ({
//         mpnId: m.mpnId,
//         mpn: m.mpn,
//         pickedQty: Number(m.pickedQty || 0),
//         shortage: m.shortage || false,
//         shortageQty: m.shortageQty || 0,
//         quantity: m.quantity,
//         uomId: m.uomId,
//         uom: m.uom,
//         pickedAt: new Date(),
//       }));

//       wo.processHistory.push({
//         process: processKey,
//         qty: additionalQty,
//         completedBy: userId,
//         completedAt: new Date(),
//         createdAt: new Date(),
//         comments: comments ? [{ 
//           comment: comments, 
//           commentedBy: userId,
//           commentedAt: new Date()
//         }] : [],
//         details: materialsWithDetails,
//       });
//     }

//     // ============================================================
//     // UPDATE STATUS - FINAL FIX
//     // ============================================================

//     updateWorkOrderStatus(wo);
//     await wo.save();

//     return res.json({
//       success: true,
//       message: `${stage} saved successfully`,
//       data: wo,
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// ============================================================
// UPDATE WORK ORDER STATUS - COMPLETE FIX
// ============================================================

export const saveWorkOrderStage = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      stage,
      comments,
      stageQty,
      materials = [],
    } = req.body;

    const wo = await WorkOrder.findById(id);
    if (!wo) {
      return res.status(404).json({
        success: false,
        message: "Work order not found",
      });
    }

    const processKey = mapStageToProcessKey(stage);
    console.log('----processKey', processKey)
    if (!processKey) {
      return res.status(400).json({
        success: false,
        message: "Invalid stage",
      });
    }

    const additionalQty = Number(stageQty || 0);
    const userId = req.user?._id;

    console.log('-----userId', userId)

    const getStageQty = (key) =>
      wo.processHistory?.find((p) => p.process === key)?.qty || 0;

    const pickingDone = getStageQty("picking");
    const cableHarnessDone = getStageQty("cable_harness");
    const assemblyDone = getStageQty("assembly");
    const labellingDone = getStageQty("labelling");
    const qcDone = getStageQty("quality_check");
    const pickingAssemblyDone = getStageQty("picking_assembly");

    const hasShortage = materials.some(
      (m) => m.shortage === true || Number(m.shortageQty || 0) > 0
    );

    // ============================================================
    // VALIDATIONS
    // ============================================================

    if (wo.projectType === "other") {
      if (processKey === "picking_assembly") {
        if (hasShortage && additionalQty > 0) {
          return res.status(400).json({
            success: false,
            message: "Cannot enter Produce Qty while shortage exists",
          });
        }
        if (pickingAssemblyDone + additionalQty > wo.quantity) {
          return res.status(400).json({
            success: false,
            message: "Picking & Assembly quantity exceeds work order quantity",
          });
        }
      }
      if (processKey === "quality_check") {
        if (qcDone + additionalQty > pickingAssemblyDone) {
          return res.status(400).json({
            success: false,
            message: "QC cannot exceed Picking & Assembly quantity",
          });
        }
      }
    }
    else if (wo.projectType === "box_build") {
      if (processKey === "picking") {
        if (hasShortage && additionalQty > 0) {
          return res.status(400).json({
            success: false,
            message: "Cannot enter Produce Qty while shortage exists",
          });
        }
        if (pickingDone + additionalQty > wo.quantity) {
          return res.status(400).json({
            success: false,
            message: "Picking quantity exceeds work order quantity",
          });
        }
      }
      if (processKey === "assembly") {
        if (assemblyDone + additionalQty > pickingDone) {
          return res.status(400).json({
            success: false,
            message: "Assembly cannot exceed picked quantity",
          });
        }
      }
      if (processKey === "quality_check") {
        if (qcDone + additionalQty > assemblyDone) {
          return res.status(400).json({
            success: false,
            message: "QC cannot exceed assembly quantity",
          });
        }
      }
    }
    else if (wo.projectType === "cable_harness") {
      if (processKey === "picking") {
        if (hasShortage && additionalQty > 0) {
          return res.status(400).json({
            success: false,
            message: "Cannot enter Produce Qty while shortage exists",
          });
        }
        if (pickingDone + additionalQty > wo.quantity) {
          return res.status(400).json({
            success: false,
            message: "Picking quantity exceeds work order quantity",
          });
        }
      }
      if (processKey === "cable_harness") {
        if (cableHarnessDone + additionalQty > pickingDone) {
          return res.status(400).json({
            success: false,
            message: "Cable Harness cannot exceed picked quantity",
          });
        }
      }
      if (processKey === "labelling") {
        if (labellingDone + additionalQty > cableHarnessDone) {
          return res.status(400).json({
            success: false,
            message: "Labelling cannot exceed Cable Harness quantity",
          });
        }
      }
      if (processKey === "quality_check") {
        if (qcDone + additionalQty > labellingDone) {
          return res.status(400).json({
            success: false,
            message: "QC cannot exceed Labelling quantity",
          });
        }
      }
    }

    // ============================================================
    // INVENTORY DEDUCTION
    // ============================================================

    if (processKey === "picking") {
      const existingProcess = wo.processHistory?.find(p => p.process === "picking");

      for (const material of materials) {
        const currentPickedQty = Number(material.pickedQty || 0);
        if (currentPickedQty <= 0) continue;

        const previousEntries = existingProcess?.details?.filter(
          (d) => String(d.mpnId) === String(material.mpnId)
        ) || [];

        const totalAlreadyPicked = previousEntries.reduce(
          (sum, entry) => sum + Number(entry.pickedQty || 0), 0
        );

        const totalRequiredQty = Number(material.quantity || 0) * Number(wo.quantity || 0);
        const remainingAllowed = totalRequiredQty - totalAlreadyPicked;

        if (currentPickedQty > remainingAllowed) {
          return res.status(400).json({
            success: false,
            message: `Max allowed for ${material.mpn}: ${remainingAllowed}`,
          });
        }

        const inventory = await Inventory.findOne({ mpnId: material.mpnId }).populate("mpnId");
        if (!inventory) {
          return res.status(400).json({
            success: false,
            message: `Inventory not found for ${material.mpn}`,
          });
        }

        const baseQty = await convertToInventoryUom({
          qty: currentPickedQty,
          fromUom: material.uomId,
          toUom: inventory.mpnId.UOM,
        });

        if (inventory.balanceQuantity < baseQty) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${material.mpn}`,
          });
        }

        inventory.balanceQuantity -= baseQty;
        await inventory.save();
      }
    }

    // ============================================================
    // PROCESS HISTORY UPDATE
    // ============================================================

    if (!Array.isArray(wo.processHistory)) wo.processHistory = [];

    let existing = wo.processHistory.find((p) => p.process === processKey);

    // 🔥 CRITICAL FIX: For Cable Harness stage with stageQty > 0
    if (processKey === "cable_harness" && additionalQty > 0) {
      console.log("🔧 Cable Harness: stageQty > 0, clearing shortages");

      if (existing) {
        // Update existing stage
        existing.qty = (existing.qty || 0) + additionalQty;
        existing.completedBy = userId;
        existing.completedAt = new Date();

        // Clear shortages from details
        if (existing.details && existing.details.length > 0) {
          for (const detail of existing.details) {
            detail.shortage = false;
            detail.shortageQty = 0;
          }
        }

        // Add comment
        existing.comments = existing.comments || [];
        if (comments) {
          existing.comments.push({
            comment: comments,
            commentedBy: userId,
            commentedAt: new Date()
          });
        }
      } else {
        // Create new stage with no shortages
        wo.processHistory.push({
          process: "cable_harness",
          qty: additionalQty,
          completedBy: userId,
          completedAt: new Date(),
          createdAt: new Date(),
          comments: comments ? [{
            comment: comments,
            commentedBy: userId,
            commentedAt: new Date()
          }] : [],
          details: [],
        });
      }
    }
    else if (existing) {
      // Normal update for other stages or cable_harness with stageQty = 0
      existing.qty = (existing.qty || 0) + additionalQty;
      existing.completedBy = userId;
      existing.completedAt = new Date();
      existing.comments = existing.comments || [];
      if (comments) {
        existing.comments.push({
          comment: comments,
          commentedBy: userId,
          commentedAt: new Date()
        });
      }

      // Update details for this stage
      if (materials.length > 0) {
        const stageDetailsMap = {};

        for (const detail of (existing.details || [])) {
          const mpnId = String(detail.mpnId);
          stageDetailsMap[mpnId] = {
            ...detail,
            pickedQty: Number(detail.pickedQty || 0),
          };
        }

        for (const material of materials) {
          const mpnId = String(material.mpnId);
          const currentPickedQty = Number(material.pickedQty || 0);

          if (stageDetailsMap[mpnId]) {
            stageDetailsMap[mpnId].pickedQty += currentPickedQty;
            stageDetailsMap[mpnId].shortage = material.shortage;
            stageDetailsMap[mpnId].shortageQty = material.shortageQty || 0;
            stageDetailsMap[mpnId].pickedAt = new Date();
          } else {
            stageDetailsMap[mpnId] = {
              mpnId: material.mpnId,
              mpn: material.mpn,
              pickedQty: currentPickedQty,
              shortage: material.shortage || false,
              shortageQty: material.shortageQty || 0,
              quantity: material.quantity,
              uomId: material.uomId,
              uom: material.uom,
              pickedAt: new Date(),
            };
          }
        }

        existing.details = Object.values(stageDetailsMap);
      }
    }
    else {
      // New stage
      const materialsWithDetails = materials.map((m) => ({
        mpnId: m.mpnId,
        mpn: m.mpn,
        pickedQty: Number(m.pickedQty || 0),
        shortage: m.shortage || false,
        shortageQty: m.shortageQty || 0,
        quantity: m.quantity,
        uomId: m.uomId,
        uom: m.uom,
        pickedAt: new Date(),
      }));

      wo.processHistory.push({
        process: processKey,
        qty: additionalQty,
        completedBy: userId,
        completedAt: new Date(),
        createdAt: new Date(),
        comments: comments ? [{
          comment: comments,
          commentedBy: userId,
          commentedAt: new Date()
        }] : [],
        details: materialsWithDetails,
      });
    }

    // ============================================================
    // UPDATE STATUS
    // ============================================================

    updateWorkOrderStatus(wo);
    await wo.save();

    return res.json({
      success: true,
      message: `${stage} saved successfully`,
      data: wo,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ============================================================
// UPDATE WORK ORDER STATUS
// ============================================================

const updateWorkOrderStatus = async (wo) => {
  const totalQty = Number(wo.quantity || 0);

  const getStageQty = (key) =>
    wo.processHistory?.find((p) => p.process === key)?.qty || 0;

  const hasStageShortage = (key) => {
    const entry = wo.processHistory?.find((p) => p.process === key);
    if (!entry?.details) return false;

    const doneQty = entry.qty || 0;

    // 🔥 FIX: if stage qty complete → ignore shortage
    if (doneQty >= totalQty) return false;

    if (doneQty >= totalQty && entry?.details) {
      entry.details.forEach(d => {
        d.shortage = false;
        d.shortageQty = 0;
      });
    }

    return entry.details.some(
      (d) => d.shortage === true || Number(d.shortageQty || 0) > 0
    );
  };



  let stages = [];
  if (wo.projectType === "cable_harness") {
    stages = ["picking", "cable_harness", "labelling", "quality_check"];
  } else if (wo.projectType === "box_build") {
    stages = ["picking", "assembly", "quality_check"];
  } else if (wo.projectType === "other") {
    stages = ["picking_assembly", "quality_check"];
  } else {
    stages = ["picking", "assembly", "quality_check"];
  }

  const formatStageName = (key) => {
    const map = {
      picking: "Picking",
      cable_harness: "Cable Harness",
      assembly: "Assembly",
      labelling: "Labelling",
      quality_check: "Quality Check",
      picking_assembly: "Picking & Assembly",
    };
    return map[key] || key;
  };

  // --------------------------------------------------
  // 🔥 MAIN FIX LOGIC
  // --------------------------------------------------

  let lastCompletedStage = null;
  let currentStage = null;

  for (let i = 0; i < stages.length; i++) {
    const key = stages[i];
    const doneQty = getStageQty(key);
    const shortage = hasStageShortage(key);

    const isComplete = doneQty >= totalQty && !shortage;

    if (isComplete) {
      lastCompletedStage = key;
      continue; // check next stage
    }

    // First incomplete stage
    currentStage = key;
    break;
  }

  // --------------------------------------------------
  // 🎉 ALL COMPLETE
  // --------------------------------------------------

  const allComplete =
    stages.every(
      (key) =>
        getStageQty(key) >= totalQty && !hasStageShortage(key)
    ) && totalQty > 0;

  // if (allComplete) {
  //   wo.status = "Completed";
  //   wo.isProductionComplete = true;
  //   wo.isInProduction = false;
  //   wo.completeDate = new Date();
  //   return;
  // }

  // if (allComplete) {
  //   const lastStage = stages[stages.length - 1];

  //   wo.status = `${formatStageName(lastStage)} Done`;

  //   wo.isProductionComplete = true;
  //   wo.isInProduction = false;
  //   wo.completeDate = new Date();

  //   return;
  // }

  if (allComplete) {
    const lastStage = stages[stages.length - 1];

    wo.status = `${formatStageName(lastStage)} Done`;

    wo.isProductionComplete = true;
    wo.isInProduction = false;
    wo.completeDate = new Date();

    // ✅ REMOVE WO FROM ALL INVENTORY DOCUMENTS
    try {
      await Inventory.updateMany(
        {
          "workOrders.workOrderId": wo._id,
        },
        {
          $pull: {
            workOrders: {
              workOrderId: wo._id,
            },
          },
        }
      );
    } catch (invErr) {
      console.error(
        "Failed to remove completed WO from inventory:",
        invErr
      );
    }

    return;
  }

  // --------------------------------------------------
  // ✅ LAST STAGE JUST COMPLETED
  // --------------------------------------------------

  if (lastCompletedStage && !currentStage) {
    wo.status = `${formatStageName(lastCompletedStage)} Done`;
    wo.isInProduction = true;
    wo.isProductionComplete = false;
    return;
  }

  // --------------------------------------------------
  // 🔄 CURRENT STAGE RUNNING
  // --------------------------------------------------

  if (currentStage) {
    const doneQty = getStageQty(currentStage);
    const shortage = hasStageShortage(currentStage);

    if (doneQty > 0 || shortage) {
      wo.status = `${formatStageName(currentStage)} In Progress`;
      wo.isInProduction = true;
      wo.isProductionComplete = false;
      return;
    }
  }

  // --------------------------------------------------
  // 🟡 ONLY PREVIOUS DONE (IMPORTANT FIX)
  // --------------------------------------------------

  if (lastCompletedStage) {
    wo.status = `${formatStageName(lastCompletedStage)} Done`;
    wo.isInProduction = true;
    wo.isProductionComplete = false;
    return;
  }

  // --------------------------------------------------
  // ❌ NOT STARTED
  // --------------------------------------------------

  wo.status = "Not Start Yet";
  wo.isInProduction = false;
  wo.isProductionComplete = false;
};

// ============================================================
// MAP STAGE TO PROCESS KEY
// ============================================================

const mapStageToProcessKey = (stage) => {
  const stageLower = stage?.toLowerCase();

  switch (stageLower) {
    case "picking":
      return "picking";
    case "cable harness":
      return "cable_harness";
    case "assembly":
      return "assembly";
    case "labelling":
      return "labelling";
    case "quality check":
    case "quality_check":
      return "quality_check";
    case "picking/assembly":
    case "picking_assembly":
      return "picking_assembly";
    default:
      return null;
  }
};


// export const saveWorkOrderStage = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       stage,
//       comments,
//       stageQty,
//       pickedQuantities = {},
//       materials = [],
//     } = req.body;

//     const wo = await WorkOrder.findById(id);
//     if (!wo) {
//       return res.status(404).json({
//         success: false,
//         message: "Work order not found",
//       });
//     }

//     const processKey = mapStageToProcessKey(stage)?.toLowerCase();
//     if (!processKey) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid stage",
//       });
//     }

//     const qty = Number(stageQty || 0);
//     const userId = req.user?._id;

//     const getStageQty = (key) =>
//       wo.processHistory?.find((p) => p.process === key)?.qty || 0;

//     const pickingDone = getStageQty("picking");
//     const assemblyDone = getStageQty("assembly");
//     const qcDone = getStageQty("quality_check");
//     const labellingDone = getStageQty("labelling");

//     const hasShortage = materials.some(
//       (m) => m.shortage === true || Number(m.shortageQty || 0) > 0
//     );

//     // --------------------------------------------------
//     // ❗ VALIDATIONS
//     // --------------------------------------------------

//     if (processKey === "picking") {
//       if (hasShortage && qty > 0) {
//         return res.status(400).json({
//           success: false,
//           message:
//             "Cannot enter Produce Qty while shortage exists. Resolve shortage first.",
//         });
//       }

//       if (pickingDone + qty > wo.quantity) {
//         return res.status(400).json({
//           success: false,
//           message: "Picking quantity exceeds work order quantity",
//         });
//       }
//     }

//     if (processKey === "assembly") {
//       if (assemblyDone + qty > pickingDone) {
//         return res.status(400).json({
//           success: false,
//           message: "Assembly cannot exceed picked quantity",
//         });
//       }
//     }

//     if (processKey === "quality_check") {
//       const prevQty =
//         wo.projectType === "other"
//           ? getStageQty("picking_assembly")
//           : getStageQty("assembly");

//       if (qcDone + qty > prevQty) {
//         return res.status(400).json({
//           success: false,
//           message: "QC cannot exceed previous stage quantity",
//         });
//       }
//     }

//     if (processKey === "labelling") {
//       if (labellingDone + qty > assemblyDone) {
//         return res.status(400).json({
//           success: false,
//           message: "Labelling cannot exceed assembly completed",
//         });
//       }
//     }

//     // --------------------------------------------------
//     // 📦 INVENTORY DEDUCTION (FIXED)
//     // --------------------------------------------------

//     if (processKey === "picking") {
//       const existingProcess = wo.processHistory?.find(
//         (p) => p.process === "picking"
//       );

//       for (const material of materials) {
//         // 🔥 FIX: Use material.pickedQty directly (this is the delta/current picking quantity)
//         const currentPickedQty = Number(material.pickedQty || 0);

//         // Skip if nothing is being picked in this transaction
//         if (currentPickedQty <= 0) continue;

//         // Get previously picked quantity from history
//         const previousEntries = existingProcess?.details?.filter(
//           (d) => String(d.mpnId) === String(material.mpnId)
//         ) || [];

//         const alreadyPickedQty = previousEntries.reduce(
//           (sum, entry) => sum + Number(entry.pickedQty || 0), 0
//         );

//         const totalRequiredQty =
//           Number(material.quantity || 0) * Number(wo.quantity || 0);

//         const remainingAllowed = totalRequiredQty - alreadyPickedQty;

//         // Validate we're not picking more than remaining
//         if (currentPickedQty > remainingAllowed) {
//           return res.status(400).json({
//             success: false,
//             message: `Max allowed for ${material.mpn}: ${remainingAllowed}. You tried: ${currentPickedQty}`,
//           });
//         }

//         // Find inventory and deduct
//         const inventory = await Inventory.findOne({
//           mpnId: material.mpnId,
//         }).populate("mpnId");

//         if (!inventory) {
//           return res.status(400).json({
//             success: false,
//             message: `Inventory not found for ${material.mpn}`,
//           });
//         }

//         const baseQty = await convertToInventoryUom({
//           qty: currentPickedQty,
//           fromUom: material.uomId,
//           toUom: inventory.mpnId.UOM,
//         });

//         if (inventory.balanceQuantity < baseQty) {
//           return res.status(400).json({
//             success: false,
//             message: `Insufficient stock for ${material.mpn}. Available: ${inventory.balanceQuantity}, Required: ${baseQty}`,
//           });
//         }

//         // Deduct the CURRENT picking quantity only
//         inventory.balanceQuantity -= baseQty;
//         await inventory.save();

//         console.log(`✅ Deducted ${baseQty} ${inventory.mpnId.UOM} for ${material.mpn}`);
//       }
//     }

//     // --------------------------------------------------
//     // 🧠 PROCESS HISTORY UPDATE
//     // --------------------------------------------------

//     if (!Array.isArray(wo.processHistory)) wo.processHistory = [];

//     // Format materials for history - store the picked quantity for this transaction
//     const materialsWithQty = materials.map((m) => ({
//       mpnId: m.mpnId,
//       mpn: m.mpn,
//       pickedQty: Number(m.pickedQty || 0),  // Store the delta
//       previousPickedQty: m.previousPickedQty || 0,
//       shortage: m.shortage || false,
//       shortageQty: m.shortageQty || 0,
//       quantity: m.quantity,
//       uomId: m.uomId,
//       pickedAt: new Date(),
//     }));

//     let existing = wo.processHistory.find((p) => p.process === processKey);

//     if (existing) {
//       existing.qty += qty;
//       existing.completedBy = userId;
//       existing.completedAt = new Date();

//       existing.comments = existing.comments || [];
//       existing.comments.push({ 
//         comment: comments, 
//         commentedBy: userId,
//         commentedAt: new Date()
//       });

//       existing.details = [...(existing.details || []), ...materialsWithQty];
//     } else {
//       wo.processHistory.push({
//         process: processKey,
//         qty,
//         completedBy: userId,
//         completedAt: new Date(),
//         createdAt: new Date(),
//         comments: [{ 
//           comment: comments, 
//           commentedBy: userId,
//           commentedAt: new Date()
//         }],
//         details: materialsWithQty,
//       });
//     }

//     // --------------------------------------------------
//     // 📊 STATUS ENGINE
//     // --------------------------------------------------

//     updateWorkOrderStatus(wo);

//     await wo.save();

//     return res.json({
//       success: true,
//       message: `${stage} saved successfully`,
//       data: wo,
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// export const saveWorkOrderStage = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       stage,
//       comments,
//       stageQty,
//       pickedQuantities = {},
//       materials = [],
//     } = req.body;

//     const wo = await WorkOrder.findById(id);
//     if (!wo) {
//       return res.status(404).json({
//         success: false,
//         message: "Work order not found",
//       });
//     }

//     const processKey = mapStageToProcessKey(stage)?.toLowerCase();
//     if (!processKey) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid stage",
//       });
//     }

//     const qty = Number(stageQty || 0);
//     const userId = req.user?._id;

//     const getStageQty = (key) =>
//       wo.processHistory?.find((p) => p.process === key)?.qty || 0;

//     const pickingDone = getStageQty("picking");
//     const assemblyDone = getStageQty("assembly");
//     const qcDone = getStageQty("quality_check");
//     const labellingDone = getStageQty("labelling");

//     const hasShortage = materials.some(
//       (m) => m.shortage === true || Number(m.shortageQty || 0) > 0
//     );

//     // --------------------------------------------------
//     // ❗ VALIDATIONS
//     // --------------------------------------------------

//     if (processKey === "picking") {
//       if (hasShortage && qty > 0) {
//         return res.status(400).json({
//           success: false,
//           message:
//             "Cannot enter Produce Qty while shortage exists. Resolve shortage first.",
//         });
//       }

//       if (qty > wo.quantity) {
//         return res.status(400).json({
//           success: false,
//           message: "Picking quantity exceeds work order quantity",
//         });
//       }
//     }

//     if (processKey === "assembly") {
//       if (qty > pickingDone) {
//         return res.status(400).json({
//           success: false,
//           message: "Assembly cannot exceed picked quantity",
//         });
//       }
//     }

//     if (processKey === "quality_check") {
//       const prevQty =
//         wo.projectType === "other"
//           ? getStageQty("picking_assembly")
//           : getStageQty("assembly");

//       if (qcDone + qty > prevQty) {
//         return res.status(400).json({
//           success: false,
//           message: "QC cannot exceed previous stage quantity",
//         });
//       }
//     }

//     if (processKey === "labelling") {

//       console.log('------sss',{
//   labellingDone,
//   qty,
//   assemblyDone,
// });
//       if (labellingDone + qty > assemblyDone) {
//         return res.status(400).json({
//           success: false,
//           message: "Labelling cannot exceed assembly completed",
//         });
//       }
//     }

//     // --------------------------------------------------
//     // 📦 INVENTORY DEDUCTION (SAFE)
//     // --------------------------------------------------

//     if (processKey === "picking") {
//       const existingProcess = wo.processHistory?.find(
//         (p) => p.process === "picking"
//       );

//       for (let i = 0; i < materials.length; i++) {
//         const material = materials[i];
//         const pickedQty = Number(pickedQuantities[i] || 0);
//         if (!pickedQty) continue;


//         console.log('------existingProcess',existingProcess)
//         const alreadyPickedQty =
//           existingProcess?.details
//             ?.filter((d) => String(d.mpnId) === String(material.mpnId))
//             ?.reduce((sum, d) => sum + Number(d.alreadyPicked || 0), 0) || 0;

//         const totalRequiredQty =
//           Number(material.quantity || 0) * Number(wo.quantity || 0);

//         const remainingAllowed = totalRequiredQty - alreadyPickedQty;
//         console.log('--------pickedQty',pickedQty,remainingAllowed)
//         if (pickedQty > remainingAllowed) {
//           return res.status(400).json({
//             success: false,
//             message: `Max allowed for ${material.mpn}: ${remainingAllowed}`,
//           });
//         }

//         const inventory = await Inventory.findOne({
//           mpnId: material.mpnId,
//         }).populate("mpnId");

//         if (!inventory) {
//           return res.status(400).json({
//             success: false,
//             message: `Inventory not found for ${material.mpn}`,
//           });
//         }

//         const baseQty = await convertToInventoryUom({
//           qty: pickedQty,
//           fromUom: material.uomId,
//           toUom: inventory.mpnId.UOM,
//         });

//         if (inventory.balanceQuantity < baseQty) {
//           return res.status(400).json({
//             success: false,
//             message: `Insufficient stock for ${material.mpn}`,
//           });
//         }

//         inventory.balanceQuantity -= baseQty;
//         await inventory.save();
//       }
//     }

//     // --------------------------------------------------
//     // 🧠 PROCESS HISTORY UPDATE
//     // --------------------------------------------------

//     if (!Array.isArray(wo.processHistory)) wo.processHistory = [];

//     const materialsWithQty = materials.map((m, i) => ({
//       ...m,
//       qty: Number(pickedQuantities[i] || 0),
//     }));

//     let existing = wo.processHistory.find((p) => p.process === processKey);

//     if (existing) {
//       existing.qty += qty;
//       existing.completedBy = userId;
//       existing.completedAt = new Date();

//       existing.comments = existing.comments || [];
//       existing.comments.push({ comment: comments, commentedBy: userId });

//       existing.details = [...(existing.details || []), ...materialsWithQty];
//     } else {
//       wo.processHistory.push({
//         process: processKey,
//         qty,
//         completedBy: userId,
//         completedAt: new Date(),
//         createdAt: new Date(),
//         comments: [{ comment: comments, commentedBy: userId }],
//         details: materialsWithQty,
//       });
//     }

//     // --------------------------------------------------
//     // 📊 STATUS ENGINE
//     // --------------------------------------------------

//     updateWorkOrderStatus(wo);

//     await wo.save();

//     return res.json({
//       success: true,
//       message: `${stage} saved successfully`,
//       data: wo,
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// const updateWorkOrderStatus = (wo) => {
//   const totalQty = Number(wo.quantity || 0);

//   const getStageQty = (key) =>
//     wo.processHistory?.find((p) => p.process === key)?.qty || 0;

//   const hasStageShortage = (key) => {
//     const entry = wo.processHistory?.find((p) => p.process === key);
//     return entry?.details?.some(
//       (m) => m.shortage || Number(m.shortageQty || 0) > 0
//     );
//   };

//   const stages =
//     wo.projectType === "other"
//       ? ["picking_assembly", "quality_check"]
//       : wo.projectType === "box_build"
//       ? ["picking", "assembly", "quality_check"]
//       : ["picking", "assembly", "labelling", "quality_check"];

//   const formatStageName = (key) => {
//     const map = {
//       picking: "Picking",
//       assembly: wo.projectType === "box_build" ? "Assembly" : "Cable Harness",
//       labelling: "Labelling",
//       quality_check: "Quality Check",
//       picking_assembly: "Picking & Assembly",
//     };
//     return map[key] || key;
//   };

//   let hasAnyProgress =
//     Array.isArray(wo.processHistory) &&
//     wo.processHistory.some(
//       (p) =>
//         (p.qty && p.qty > 0) ||
//         (Array.isArray(p.details) && p.details.length > 0)
//     );

//   let currentStage = null;
//   let lastCompletedStage = null;

//   for (const key of stages) {
//     const doneQty = getStageQty(key);
//     const shortage = hasStageShortage(key);

//     if (doneQty >= totalQty && !shortage && totalQty > 0) {
//       lastCompletedStage = key;
//       continue;
//     }

//     if (doneQty > 0 || shortage) {
//       currentStage = key;
//       break;
//     }

//     if (doneQty === 0) break;
//   }

//   // 🔄 In Progress
//   if (currentStage) {
//     wo.status = `${formatStageName(currentStage)} In Progress`;
//     wo.isInProduction = true;
//     return;
//   }

//   // ✅ Completed
//   const anyShortage = stages.some((key) => hasStageShortage(key));
//   const allComplete =
//     stages.every((key) => getStageQty(key) >= totalQty) && !anyShortage;

//   if (allComplete) {
//     wo.status = "Completed";
//     wo.isProductionComplete = true;
//     wo.isInProduction = false;
//     wo.completeDate = new Date();
//     return;
//   }

//   // 🟡 Partial done
//   if (lastCompletedStage) {
//     wo.status = `${formatStageName(lastCompletedStage)} Done`;
//     wo.isInProduction = true;
//     return;
//   }

//   // ❌ Not Started ONLY if no activity
//   if (!hasAnyProgress) {
//     wo.status = "Not Start Yet";
//     wo.isInProduction = false;
//   } else {
//     wo.status = "In Progress";
//     wo.isInProduction = true;
//   }
// };


// export const saveWorkOrderStage = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const {
//       stage,
//       comments,
//       stageQty,
//       pickedQuantities = {},
//       materials = [],
//     } = req.body;

//     const wo = await WorkOrder.findById(id);

//     if (!wo) {
//       return res.status(404).json({
//         success: false,
//         message: "Work order not found",
//       });
//     }

//     const processKey = mapStageToProcessKey(stage)?.toLowerCase();

//     if (!processKey) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid stage",
//       });
//     }

//     const qty = Number(stageQty || 0);
//     const userId = req.user?._id;

//     const getStageQty = (key) =>
//       wo.processHistory?.find((p) => p.process === key)?.qty || 0;

//     const pickingDone = getStageQty("picking");
//     const assemblyDone = getStageQty("assembly");
//     const qcDone = getStageQty("quality_check");
//     const labellingDone = getStageQty("labelling");

//     const hasShortage = materials.some(
//       (m) => m.shortage === true || Number(m.shortageQty || 0) > 0
//     );

//     // --------------------------------------------------
//     // ❗ Shortage ke saath process complete block
//     // --------------------------------------------------

//     if (processKey === "picking") {
//       if (hasShortage && qty > 0) {
//         return res.status(400).json({
//           success: false,
//           message:
//             "Cannot enter Produce Qty while shortage exists. Resolve shortage first.",
//         });
//       }

//       if (qty > wo.quantity) {
//         return res.status(400).json({
//           success: false,
//           message: "Picking quantity exceeds work order quantity",
//         });
//       }
//     }

//     if (processKey === "assembly") {
//       if (qty > pickingDone) {
//         return res.status(400).json({
//           success: false,
//           message: "Assembly cannot exceed picked quantity",
//         });
//       }
//     }

//     if (processKey === "quality_check") {
//       let prevQty = 0;

//       if (wo.projectType === "other") {
//         prevQty = getStageQty("picking_assembly");
//       } else {
//         prevQty = getStageQty("assembly");
//       }

//       if (qcDone + qty > prevQty) {
//         return res.status(400).json({
//           success: false,
//           message: "QC cannot exceed previous stage quantity",
//         });
//       }
//     }

//     if (processKey === "labelling") {
//       if (labellingDone + qty > assemblyDone) {
//         return res.status(400).json({
//           success: false,
//           message: "Labelling cannot exceed assembly completed",
//         });
//       }
//     }

//     // --------------------------------------------------
//     // 📦 INVENTORY DEDUCTION
//     // --------------------------------------------------

//     if (processKey === "picking") {
//       const existingProcess = wo.processHistory?.find(
//         (p) => p.process === "picking"
//       );

//       for (let i = 0; i < materials.length; i++) {
//         const material = materials[i];

//         const pickedQty = Number(pickedQuantities[i] || 0);

//         if (!pickedQty) continue;

//         const alreadyPickedQty =
//           existingProcess?.details
//             ?.filter((d) => String(d.mpnId) === String(material.mpnId))
//             ?.reduce((sum, d) => sum + Number(d.qty || 0), 0) || 0;

//         // ✅ Total required for this work order
//         const totalRequiredQty = Number(material.quantity || 0) * Number(wo.quantity || 0);

//         // ✅ Remaining allowed to pick
//         const remainingAllowed = totalRequiredQty - alreadyPickedQty;

//         if (pickedQty > remainingAllowed) {
//           return res.status(400).json({
//             success: false,
//             message: `You cannot pick more than required for ${material.mpn}. Remaining allowed: ${remainingAllowed}`,
//           });
//         }

//         const inventory = await Inventory.findOne({
//           mpnId: material.mpnId,
//         }).populate("mpnId");

//         if (!inventory) {
//           return res.status(400).json({
//             success: false,
//             message: `Inventory not found for ${material.mpn}`,
//           });
//         }

//         const baseQty = await convertToInventoryUom({
//           qty: pickedQty,
//           fromUom: material.uomId,
//           toUom: inventory.mpnId.UOM,
//         });


//         console.log('-----baseQty', baseQty)

//         if (inventory.balanceQuantity < baseQty) {
//           return res.status(400).json({
//             success: false,
//             message: `Insufficient stock for ${material.mpn}. Available: ${inventory.balanceQuantity}`,
//           });
//         }

//         inventory.balanceQuantity -= baseQty;

//         await inventory.save();
//       }
//     }

//     // --------------------------------------------------
//     // 🧠 PROCESS HISTORY UPDATE
//     // --------------------------------------------------

//     if (!Array.isArray(wo.processHistory)) {
//       wo.processHistory = [];
//     }

//     const materialsWithQty = materials.map((m, i) => ({
//       ...m,
//       qty: Number(pickedQuantities[i] || 0),
//     }));

//     let existing = wo.processHistory.find((p) => p.process === processKey);

//     if (existing) {
//       existing.qty += qty;

//       existing.completedBy = userId;
//       existing.completedAt = new Date();

//       existing.comments = existing.comments || [];

//       existing.comments.push({
//         comment: comments,
//         commentedBy: userId,
//       });

//       existing.details = [...(existing.details || []), ...materialsWithQty];
//     } else {
//       wo.processHistory.push({
//         process: processKey,
//         qty,
//         completedBy: userId,
//         completedAt: new Date(),
//         createdAt: new Date(),
//         comments: [
//           {
//             comment: comments,
//             commentedBy: userId,
//           },
//         ],
//         details: materialsWithQty,
//       });
//     }

//     // --------------------------------------------------
//     // 📊 STATUS ENGINE
//     // --------------------------------------------------

//     updateWorkOrderStatus(wo);

//     await wo.save();

//     return res.json({
//       success: true,
//       message: `${stage} saved successfully`,
//       data: wo,
//     });
//   } catch (err) {
//     console.error(err);

//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// const mapStageToProcessKey = (stage) => {
//   switch (stage) {
//     case "Picking":
//       return "picking";

//     case "Cable Harness":
//     case "Assembly":
//       return "assembly";

//     case "Labelling":
//       return "labelling";

//     case "Quality Check":
//       return "quality_check";

//     case "Picking/Assembly":
//       return "picking_assembly";

//     default:
//       return null;
//   }
// };

// const updateWorkOrderStatus = (wo) => {
//   const type = wo.projectType;

//   const getStageQty = (key) =>
//     wo.processHistory?.find((p) => p.process === key)?.qty || 0;

//   const totalQty = Number(wo.quantity || 0);

//   const formatStageName = (key) => {
//     switch (key) {
//       case "picking":
//         return "Picking";

//       case "assembly":
//         return type === "box_build" ? "Assembly" : "Cable Harness";

//       case "labelling":
//         return "Labelling";

//       case "quality_check":
//         return "Quality Check";

//       case "picking_assembly":
//         return "Picking & Assembly";

//       default:
//         return key;
//     }
//   };

//   let stages = [];

//   if (type === "other") {
//     stages = ["picking_assembly", "quality_check"];
//   } else if (type === "box_build") {
//     stages = ["picking", "assembly", "quality_check"];
//   } else {
//     stages = ["picking", "assembly", "labelling", "quality_check"];
//   }

//   const hasStageShortage = (key) => {
//     const entry = wo.processHistory?.find((p) => p.process === key);

//     if (!entry?.details) return false;

//     return entry.details.some(
//       (m) => m.shortage === true || Number(m.shortageQty || 0) > 0
//     );
//   };

//   let currentStage = null;
//   let lastCompletedStage = null;

//   for (let i = 0; i < stages.length; i++) {
//     const key = stages[i];

//     const doneQty = getStageQty(key);
//     const shortage = hasStageShortage(key);

//     // ✅ Stage Completed
//     if (doneQty >= totalQty && totalQty > 0 && !shortage) {
//       lastCompletedStage = key;
//       continue;
//     }

//     // 🔄 Stage In Progress
//     if (doneQty > 0 && (doneQty < totalQty || shortage)) {
//       currentStage = key;
//       break;
//     }

//     // ❌ Not started
//     if (doneQty === 0) {
//       break;
//     }
//   }

//   // 🔄 If current stage in progress
//   if (currentStage) {
//     wo.status = `${formatStageName(currentStage)} In Progress`;
//     wo.isInProduction = true;
//     return;
//   }

//   // ✅ If last stage completed
//   if (lastCompletedStage) {
//     const anyShortage = stages.some((key) => hasStageShortage(key));

//     const allComplete =
//       stages.every((key) => getStageQty(key) >= totalQty && totalQty > 0) &&
//       !anyShortage;

//     if (allComplete) {
//       wo.status = "Completed";
//       wo.isProductionComplete = true;
//       wo.isInProduction = false;
//       wo.completeDate = new Date();
//     } else {
//       wo.status = `${formatStageName(lastCompletedStage)} Done`;
//       wo.isInProduction = true;
//     }

//     return;
//   }

//   // ❌ Not started
//   wo.status = "Not Start Yet";
//   wo.isInProduction = false;
// };

const toNum = (v) => {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : null;
};

const norm = (v) => String(v ?? "").trim();


export const importTotalMpnNeeded = async (req, res) => {
  try {
    // =========================
    // 1️⃣ VALIDATION
    // =========================
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const fileName = (req.file.originalname || "").toLowerCase();

    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      return res.status(400).json({
        success: false,
        message: "Only .xlsx / .xls files allowed",
      });
    }

    // =========================
    // 2️⃣ READ EXCEL
    // =========================
    const buffer = req.file.buffer || fs.readFileSync(req.file.path);

    const workbook = XLSX.read(buffer, { type: "buffer" });

    const sheet = workbook.Sheets[workbook.SheetNames?.[0]];

    if (!sheet) {
      return res.status(400).json({
        success: false,
        message: "Excel has no sheets",
      });
    }

    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
    });

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "File is empty",
      });
    }

    // =========================
    // 3️⃣ FLEXIBLE HEADERS
    // =========================
    const pickDrawingNo = (r) =>
      r["Drawing No"] ??
      r["DrawingNo"] ??
      r["drawingNo"] ??
      r["Drawing"] ??
      "";

    const pickQty = (r) =>
      r["Qty"] ??
      r["QTY"] ??
      r["qty"] ??
      r["Quantity"] ??
      "";

    const norm = (v) => String(v || "").trim();

    const toNum = (v) => {
      const n = Number(v);
      return isNaN(n) ? null : n;
    };

    // =========================
    // 4️⃣ AGGREGATE DRAWINGS
    // =========================
    const qtyByDrawingNo = new Map();

    rows.forEach((r) => {
      const drawingNo = norm(pickDrawingNo(r));
      const qty = toNum(pickQty(r));

      if (!drawingNo || qty === null) return;

      qtyByDrawingNo.set(
        drawingNo,
        (qtyByDrawingNo.get(drawingNo) || 0) + qty
      );
    });

    if (!qtyByDrawingNo.size) {
      return res.status(400).json({
        success: false,
        message: "No valid rows found",
      });
    }

    // =========================
    // 5️⃣ DRAWING → ID
    // =========================
    const drawingNos = [...qtyByDrawingNo.keys()];

    const drawings = await Drawing.find(
      {
        drawingNo: { $in: drawingNos },
      },
      {
        _id: 1,
        drawingNo: 1,
      }
    ).lean();

    const drawingIdByNo = new Map(
      drawings.map((d) => [
        String(d.drawingNo).trim(),
        String(d._id),
      ])
    );

    // =========================
    // 6️⃣ FETCH COSTING ITEMS
    // =========================
    const costingItems = await CostingItems.find({
      drawingId: {
        $in: [...drawingIdByNo.values()],
      },
      quoteType: "material",
    }).lean();

    const costingMap = new Map();

    costingItems.forEach((ci) => {
      const key = String(ci.drawingId);

      const arr = costingMap.get(key) || [];

      arr.push(ci);

      costingMap.set(key, arr);
    });

    // =========================
    // 7️⃣ CALCULATE MPN NEEDED
    // =========================
    /**
     * IMPORTANT FIX:
     *
     * OLD:
     * key = mpnId_uomId
     *
     * ISSUE:
     * Different drawings merged together
     *
     * NEW:
     * key = drawingNo_mpnId_uomId
     */

    const mpnUsageMap = new Map();

    const mpnIdSet = new Set();

    for (const [drawingNo, inputQty] of qtyByDrawingNo.entries()) {
      const drawingId = drawingIdByNo.get(drawingNo);

      if (!drawingId) continue;

      const costingArr = costingMap.get(drawingId);

      if (!costingArr?.length) continue;

      for (const ci of costingArr) {
        if (!ci.mpn) continue;

        const mpnId = String(ci.mpn);

        const uomId = ci.uom ? String(ci.uom) : "no_uom";

        // ✅ FIXED KEY
        const key = `${drawingNo}_${mpnId}_${uomId}`;

        mpnIdSet.add(mpnId);

        const needed =
          Number(ci.quantity || 0) * Number(inputQty || 0);

        const prev = mpnUsageMap.get(key) || {
          drawingNo,
          mpnId,
          description: ci.description || "",
          manufacturer: ci.manufacturer || "",
          uomId: ci.uom || null,
          totalNeeded: 0,
        };

        prev.totalNeeded += needed;

        mpnUsageMap.set(key, prev);
      }
    }

    // =========================
    // 8️⃣ LOAD MPN MASTER
    // =========================
    const mpnObjectIds = [...mpnIdSet].map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const mpnDocs = await MPN.find({
      _id: { $in: mpnObjectIds },
    }).lean();

    const mpnMap = new Map(
      mpnDocs.map((m) => [String(m._id), m])
    );

    // =========================
    // 9️⃣ LOAD UOM
    // =========================
    const uomIds = [
      ...new Set(
        [...mpnUsageMap.values()]
          .map((r) => r.uomId)
          .filter(Boolean)
          .map(String)
      ),
    ];

    const uomDocs = await UOM.find({
      _id: { $in: uomIds },
    }).lean();

    const uomMap = new Map(
      uomDocs.map((u) => [String(u._id), u])
    );

    // =========================
    // 🔟 INVENTORY
    // =========================
    const invDocs = await Inventory.find({
      mpnId: { $in: mpnObjectIds },
    })
      .populate({
        path: "mpnId",
        select: "UOM",
        populate: {
          path: "UOM",
          select: "code",
        },
      })
      .lean();

    const invMap = new Map();

    invDocs.forEach((inv) => {
      const key = String(inv.mpnId?._id);

      const existing = invMap.get(key);

      invMap.set(key, {
        qty:
          (existing?.qty || 0) +
          Number(inv.balanceQuantity || 0),

        stockUom: inv.mpnId?.UOM || null,
      });
    });

    // =========================
    // 1️⃣1️⃣ BUILD EXCEL DATA
    // =========================
    const excelRows = [];

    for (const row of mpnUsageMap.values()) {
      const mpn = mpnMap.get(row.mpnId);

      const uom = row.uomId
        ? uomMap.get(String(row.uomId))
        : null;

      const invData =
        invMap.get(String(row.mpnId)) || {};

      let stock = Number(invData.qty || 0);

      // Convert inventory stock if needed
      try {
        stock = await convertFromMeter(
          stock,
          invData.stockUom?.code
        );
      } catch (err) {
        console.log("convertFromMeter error", err.message);
      }

      let totalNeeded = Number(row.totalNeeded || 0);

      // Convert needed qty into stock UOM
      try {
        totalNeeded = await convertUom({
          qty: row.totalNeeded,
          fromUom: uom?.code,
          toUom: uom?.code,
        });
      } catch (err) {
        console.log("convertUom error", err.message);
      }

      const shortfall =
        totalNeeded > stock
          ? totalNeeded - stock
          : 0;

      excelRows.push({
        "Drawing No": row.drawingNo, // ✅ FIXED
        MPN: mpn?.mpn || mpn?.MPN || "",
        Description:
          row.description || mpn?.description || "",
        Manufacturer:
          row.manufacturer || mpn?.manufacturer || "",
        UOM: uom?.code || "",
        "Total Needed": Number(totalNeeded).toFixed(2),
        "Current Stock": Number(stock).toFixed(2),
        "Stock UOM": invData.stockUom?.code || "",
        Shortfall: Number(shortfall).toFixed(2),
      });
    }

    // =========================
    // 1️⃣2️⃣ SORT DATA
    // =========================
    excelRows.sort((a, b) => {
      return String(a["Drawing No"]).localeCompare(
        String(b["Drawing No"])
      );
    });

    // =========================
    // 1️⃣3️⃣ CREATE EXCEL
    // =========================
    const wb = XLSX.utils.book_new();

    const ws = XLSX.utils.json_to_sheet(excelRows);

    ws["!cols"] = Object.keys(excelRows[0] || {}).map(
      (h) => ({
        wch: Math.max(15, String(h).length + 5),
      })
    );

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      "MPN Needed"
    );

    const bufferOut = XLSX.write(wb, {
      type: "buffer",
      bookType: "xlsx",
    });

    // =========================
    // 1️⃣4️⃣ RESPONSE
    // =========================
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="mpn_needed.xlsx"'
    );

    return res.end(bufferOut);

  } catch (error) {
    console.error(
      "importTotalMpnNeeded error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// export const importTotalMpnNeeded = async (req, res) => {
//   try {
//     // -------------------------
//     // 1️⃣ VALIDATION
//     // -------------------------
//     if (!req.file) {
//       return res.status(400).json({ success: false, message: "No file uploaded" });
//     }

//     const fileName = (req.file.originalname || "").toLowerCase();
//     if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
//       return res.status(400).json({
//         success: false,
//         message: "Only .xlsx / .xls files allowed",
//       });
//     }

//     // -------------------------
//     // 2️⃣ READ EXCEL
//     // -------------------------
//     const buffer = req.file.buffer || fs.readFileSync(req.file.path);
//     const workbook = XLSX.read(buffer, { type: "buffer" });
//     const sheet = workbook.Sheets[workbook.SheetNames?.[0]];

//     if (!sheet) {
//       return res.status(400).json({ success: false, message: "Excel has no sheets" });
//     }

//     const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

//     if (!rows.length) {
//       return res.status(400).json({ success: false, message: "File is empty" });
//     }

//     // -------------------------
//     // 3️⃣ FLEXIBLE HEADERS
//     // -------------------------
//     const pickDrawingNo = (r) =>
//       r["Drawing No"] ?? r["DrawingNo"] ?? r["drawingNo"] ?? r["Drawing"] ?? "";

//     const pickQty = (r) =>
//       r["Qty"] ?? r["QTY"] ?? r["qty"] ?? r["Quantity"] ?? "";

//     const norm = (v) => String(v || "").trim();
//     const toNum = (v) => {
//       const n = Number(v);
//       return isNaN(n) ? null : n;
//     };

//     // -------------------------
//     // 4️⃣ AGGREGATE DRAWINGS
//     // -------------------------
//     const qtyByDrawingNo = new Map();

//     rows.forEach((r) => {
//       const drawingNo = norm(pickDrawingNo(r));
//       const qty = toNum(pickQty(r));

//       if (!drawingNo || qty === null) return;

//       qtyByDrawingNo.set(drawingNo, (qtyByDrawingNo.get(drawingNo) || 0) + qty);
//     });

//     if (!qtyByDrawingNo.size) {
//       return res.status(400).json({
//         success: false,
//         message: "No valid rows found",
//       });
//     }

//     // -------------------------
//     // 5️⃣ DRAWING → ID
//     // -------------------------
//     const drawingNos = [...qtyByDrawingNo.keys()];

//     const drawings = await Drawing.find(
//       { drawingNo: { $in: drawingNos } },
//       { _id: 1, drawingNo: 1 }
//     ).lean();

//     const drawingIdByNo = new Map(
//       drawings.map((d) => [String(d.drawingNo), String(d._id)])
//     );

//     // -------------------------
//     // 6️⃣ FETCH COSTING ITEMS
//     // -------------------------
//     const costingItems = await CostingItems.find({
//       drawingId: { $in: [...drawingIdByNo.values()] },
//       quoteType: "material",
//     }).lean();

//     const costingMap = new Map();

//     costingItems.forEach((ci) => {
//       const key = String(ci.drawingId);
//       const arr = costingMap.get(key) || [];
//       arr.push(ci);
//       costingMap.set(key, arr);
//     });

//     // -------------------------
//     // 7️⃣ MPN CALCULATION (FIXED)
//     // -------------------------
//     const mpnUsageMap = new Map();
//     const mpnIdSet = new Set();

//     for (const [drawingNo, inputQty] of qtyByDrawingNo.entries()) {
//       const drawingId = drawingIdByNo.get(drawingNo);
//       if (!drawingId) continue;

//       const costingArr = costingMap.get(drawingId);
//       if (!costingArr) continue;

//       for (const ci of costingArr) {
//         if (!ci.mpn) continue;

//         const mpnId = String(ci.mpn);
//         const uomId = ci.uom ? String(ci.uom) : "no_uom";

//         const key = `${mpnId}_${uomId}`; // ✅ FIX

//         mpnIdSet.add(mpnId);

//         const needed = Number(ci.quantity || 0) * inputQty;
//         console.log('-----needed', needed)

//         const prev = mpnUsageMap.get(key) || {
//           mpnId,
//           description: ci.description || "",
//           manufacturer: ci.manufacturer || "",
//           uomId: ci.uom || null,
//           totalNeeded: 0,
//         };

//         prev.totalNeeded += needed;
//         mpnUsageMap.set(key, prev);
//       }
//     }

//     // -------------------------
//     // 8️⃣ LOAD MASTER DATA
//     // -------------------------
//     const mpnObjectIds = [...mpnIdSet].map(
//       (id) => new mongoose.Types.ObjectId(id)
//     );

//     const mpnDocs = await MPN.find({ _id: { $in: mpnObjectIds } }).lean();
//     const mpnMap = new Map(mpnDocs.map((m) => [String(m._id), m]));

//     const uomIds = [
//       ...new Set(
//         [...mpnUsageMap.values()]
//           .map((r) => r.uomId)
//           .filter(Boolean)
//           .map(String)
//       ),
//     ];

//     const uomDocs = await UOM.find({ _id: { $in: uomIds } }).lean();
//     const uomMap = new Map(uomDocs.map((u) => [String(u._id), u]));

//     // -------------------------
//     // 9️⃣ INVENTORY + STOCK UOM
//     // -------------------------
//     const invDocs = await Inventory.find({
//       mpnId: { $in: mpnObjectIds },
//     }).populate({
//       path: "mpnId",
//       select: "UOM",
//       populate: {
//         path: "UOM",
//         select: "code",
//       },
//     }).lean();

//     console.log('--------invDocs', invDocs?.[0]?.mpnId)

//     const invMap = new Map();

//     invDocs.forEach((inv) => {
//       const key = String(inv.mpnId?._id); // ✅ FIXED

//       invMap.set(key, {
//         qty: (invMap.get(key)?.qty || 0) + Number(inv.balanceQuantity || 0),
//         stockUom: inv.mpnId?.UOM || "", // ✅ direct code
//       });
//     });

//     const invUomIds = [
//       ...new Set(invDocs.map((i) => i.uom).filter(Boolean).map(String)),
//     ];

//     const invUomDocs = await UOM.find({ _id: { $in: invUomIds } }).lean();
//     const invUomMap = new Map(invUomDocs.map((u) => [String(u._id), u]));

//     // -------------------------
//     // 🔟 BUILD EXCEL
//     // -------------------------
//     const excelRows = await Promise.all([...mpnUsageMap.values()].map(async (row) => {
//       const mpn = mpnMap.get(row.mpnId);
//       const uom = row.uomId ? uomMap.get(String(row.uomId)) : null;

//       const invData = invMap.get(String(row.mpnId)) || {}; // ✅ ensure string
//       const stock = await convertFromMeter(
//         invData.qty,
//         invData.stockUom?.code,
//         // toUom: invData.stockUom?._id,
//       );

//       console.log('-----row.totalNeeded', row.totalNeeded)
//       const Needstock = await convertUom({
//         qty: row.totalNeeded,
//         fromUom: uom?.code,
//         toUom: invData.stockUom?.code,
//       });
//       console.log('------Needstock', Needstock)
//       const stockUom = invData.stockUom?.code || "";

//       const shortfall =
//         Needstock > stock
//           ? Needstock - stock
//           : 0;

//       return {
//         "Drawing No": drawingNos.join(", "), // 👈 FIRST COLUMN ADDED
//         "MPN": mpn?.mpn || mpn?.MPN || "",
//         "Description": row.description || mpn?.description || "",
//         "Manufacturer": row.manufacturer || mpn?.manufacturer || "",
//         "UOM": uom?.code || "",
//         "Total Needed": Needstock.toFixed(2),
//         "Current Stock": stock.toFixed(2),
//         "Stock UOM": stockUom, // ✅ NEW COLUMN
//         "Shortfall": shortfall,
//       };
//     }))


//     const wb = XLSX.utils.book_new();
//     const ws = XLSX.utils.json_to_sheet(excelRows);

//     ws["!cols"] = Object.keys(excelRows[0]).map((h) => ({
//       wch: Math.max(12, h.length + 2),
//     }));

//     XLSX.utils.book_append_sheet(wb, ws, "MPN Needed");

//     const bufferOut = XLSX.write(wb, {
//       type: "buffer",
//       bookType: "xlsx",
//     });

//     // -------------------------
//     // RESPONSE
//     // -------------------------
//     res.setHeader(
//       "Content-Type",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//     );
//     res.setHeader(
//       "Content-Disposition",
//       'attachment; filename="mpn_needed.xlsx"'
//     );

//     return res.end(bufferOut);

//   } catch (error) {
//     console.error("importTotalMpnNeeded error:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };


// export const importTotalMpnNeeded = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ success: false, message: "No file uploaded" });
//     }

//     const fileName = (req.file.originalname || "").toLowerCase();
//     if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
//       return res.status(400).json({
//         success: false,
//         message: "Only .xlsx / .xls files allowed",
//       });
//     }

//     // ✅ Read excel
//     const buffer = req.file.buffer || fs.readFileSync(req.file.path);
//     const workbook = XLSX.read(buffer, { type: "buffer" });
//     const sheet = workbook.Sheets[workbook.SheetNames?.[0]];
//     if (!sheet) {
//       return res.status(400).json({ success: false, message: "Excel has no sheets" });
//     }

//     const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
//     if (!rows.length) {
//       return res.status(400).json({ success: false, message: "File is empty" });
//     }

//     // ✅ flexible headers
//     const pickDrawingNo = (r) =>
//       r["Drawing No"] ?? r["DrawingNo"] ?? r["drawingNo"] ?? r["Drawing"] ?? r["drawing"] ?? "";
//     const pickQty = (r) =>
//       r["Qty"] ?? r["QTY"] ?? r["qty"] ?? r["Quantity"] ?? r["quantity"] ?? "";

//     // ✅ aggregate same DrawingNo (important)
//     const qtyByDrawingNo = new Map(); // drawingNo -> totalQty
//     const invalidRows = [];

//     rows.forEach((r, idx) => {
//       const drawingNo = norm(pickDrawingNo(r));
//       const qty = toNum(pickQty(r));

//       if (!drawingNo || qty === null) {
//         invalidRows.push({
//           row: idx + 2,
//           drawingNo,
//           qty: pickQty(r),
//           reason: "Missing/invalid Drawing No or Qty",
//         });
//         return;
//       }

//       qtyByDrawingNo.set(drawingNo, (qtyByDrawingNo.get(drawingNo) || 0) + qty);
//     });

//     if (!qtyByDrawingNo.size) {
//       return res.status(400).json({
//         success: false,
//         message: "No valid rows found",
//         invalidRows,
//       });
//     }

//     const drawingNos = [...qtyByDrawingNo.keys()];

//     // ✅ Step-1: DrawingNo -> DrawingId
//     const drawings = await Drawing.find(
//       { drawingNo: { $in: drawingNos } },
//       { _id: 1, drawingNo: 1 }
//     ).lean();

//     const drawingIdByNo = new Map(drawings.map((d) => [String(d.drawingNo), String(d._id)]));

//     const notFoundDrawings = drawingNos.filter((dn) => !drawingIdByNo.has(dn));

//     // ✅ Step-2: WorkOrder update using drawingId
//     const bulkOps = [];
//     for (const [drawingNo, qty] of qtyByDrawingNo.entries()) {
//       const drawingId = drawingIdByNo.get(drawingNo);
//       if (!drawingId) continue;

//       bulkOps.push({
//         updateMany: {
//           filter: { drawingId: new mongoose.Types.ObjectId(drawingId) },
//           update: {
//             $inc: { quantity: qty }, // ✅ change field name if your WO uses different one
//             $set: { updatedAt: new Date() },
//           },
//         },
//       });
//     }

//     let bulkResult = null;
//     if (bulkOps.length) {
//       bulkResult = await WorkOrder.bulkWrite(bulkOps, { ordered: false });
//     }

//     return res.json({
//       success: true,
//       message: "Import completed",
//       summary: {
//         totalRows: rows.length,
//         validDrawingNos: qtyByDrawingNo.size,
//         drawingsMatched: drawings.length,
//         workOrdersMatched: bulkResult?.matchedCount || 0,
//         workOrdersModified: bulkResult?.modifiedCount || 0,
//         notFoundDrawingCount: notFoundDrawings.length,
//         invalidCount: invalidRows.length,
//       },
//       notFoundDrawings: [...new Set(notFoundDrawings)],
//       invalidRows,
//     });
//   } catch (err) {
//     console.error("importTotalMpnNeeded error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

export const getFilterData = async (req, res) => {
  try {
    const workOrders = await WorkOrder.find({})
      .select(
        "projectNo poNumber needDate projectId drawingId workOrderNo"
      )
      .lean();

    if (!workOrders.length) {
      return res.json({
        status: true,
        message: "No work orders found",
        data: {
          projectNos: [],
          poNumbers: [],
          needDates: [],
          projects: [],
          drawings: [],
          workOrders: [],
        },
      });
    }

    // ---------- Sets ----------
    const projectNoSet = new Set();
    const poNumberSet = new Set();
    const needDateSet = new Set();
    const projectIdSet = new Set();
    const drawingIdSet = new Set();
    const workOrderSet = new Set();

    for (const wo of workOrders) {
      if (wo.projectNo && String(wo.projectNo).trim()) {
        projectNoSet.add(String(wo.projectNo).trim());
      }

      if (wo.poNumber && String(wo.poNumber).trim()) {
        poNumberSet.add(String(wo.poNumber).trim());
      }

      if (wo.needDate) {
        const d = new Date(wo.needDate);
        needDateSet.add(d.toISOString().split("T")[0]);
      }

      if (wo.projectId) projectIdSet.add(String(wo.projectId));
      if (wo.drawingId) drawingIdSet.add(String(wo.drawingId));

      if (wo.workOrderNo && String(wo.workOrderNo).trim()) {
        workOrderSet.add(String(wo.workOrderNo).trim());
      }
    }

    // ---------- Project Docs ----------
    const projectIds = [...projectIdSet].map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const projectDocs = projectIds.length
      ? await Project.find({ _id: { $in: projectIds } })
        .select("name projectName")
        .lean()
      : [];

    const projects = projectDocs
      .map((p) => ({
        label: p.name || p.projectName || String(p._id),
        value: String(p._id),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    // ---------- Drawing Docs ----------
    const drawingIds = [...drawingIdSet].map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const drawingDocs = drawingIds.length
      ? await Drawing.find({ _id: { $in: drawingIds } })
        .select("drawingNo drawing drawingNumber")
        .lean()
      : [];

    const drawings = drawingDocs
      .map((d) => ({
        label:
          d.drawingNo ||
          d.drawing ||
          d.drawingNumber ||
          String(d._id),
        value: String(d._id),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    // ---------- Frontend Friendly ----------
    const projectNos = [...projectNoSet]
      .sort()
      .map((v) => ({ label: v, value: v }));

    const poNumbers = [...poNumberSet]
      .sort()
      .map((v) => ({ label: v, value: v }));

    const needDates = [...needDateSet]
      .sort()
      .map((v) => ({
        label: new Date(v).toLocaleDateString("en-GB"),
        value: v,
      }));

    const workOrdersList = [...workOrderSet]
      .sort()
      .map((v) => ({ label: v, value: v }));

    return res.json({
      status: true,
      message: "Filter master data fetched successfully",
      data: {
        projectNos,
        poNumbers,
        needDates,
        projects,
        drawings,
        workOrders: workOrdersList,
      },
    });
  } catch (error) {
    console.error("getFilterData error:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
      data: {
        projectNos: [],
        poNumbers: [],
        needDates: [],
        projects: [],
        drawings: [],
        workOrders: [],
      },
    });
  }
};


// export const getFilterData = async (req, res) => {
//   try {
//     // Only required fields
//     const workOrders = await WorkOrder.find({})
//       .select("projectNo poNumber needDate")
//       .lean();

//     if (!workOrders.length) {
//       return res.json({
//         status: true,
//         message: "No work orders found",
//         data: {
//           projectNos: [],
//           poNumbers: [],
//           needDates: [],
//         },
//       });
//     }

//     const projectNoSet = new Set();
//     const poNumberSet = new Set();
//     const needDateSet = new Set();

//     for (const wo of workOrders) {
//       // ✅ Project No
//       if (wo.projectNo && String(wo.projectNo).trim()) {
//         projectNoSet.add(String(wo.projectNo).trim());
//       }

//       // ✅ PO Number
//       if (wo.poNumber && String(wo.poNumber).trim()) {
//         poNumberSet.add(String(wo.poNumber).trim());
//       }

//       // ✅ Need Date (ISO → date only)
//       if (wo.needDate) {
//         const d = new Date(wo.needDate);
//         needDateSet.add(d.toISOString().split("T")[0]); // yyyy-mm-dd
//       }
//     }

//     // Frontend-friendly format
//     const projectNos = [...projectNoSet]
//       .sort()
//       .map((v) => ({ label: v, value: v }));

//     const poNumbers = [...poNumberSet]
//       .sort()
//       .map((v) => ({ label: v, value: v }));

//     const needDates = [...needDateSet]
//       .sort()
//       .map((v) => ({
//         label: new Date(v).toLocaleDateString("en-GB"), // UI readable
//         value: v, // backend filter friendly
//       }));

//     return res.json({
//       status: true,
//       message: "Filter master data fetched successfully",
//       data: {
//         projectNos,
//         poNumbers,
//         needDates,
//       },
//     });
//   } catch (error) {
//     console.error("getFilterData error:", error);
//     return res.status(500).json({
//       status: false,
//       message: error.message,
//       data: {
//         projectNos: [],
//         poNumbers: [],
//         needDates: [],
//       },
//     });
//   }
// };


// export const getFilterData = async (req, res) => {
//   try {
//     // 1) WorkOrders se unique posNo, projectId, drawingId, workOrderNo nikaalo
//     const workOrders = await WorkOrder.find({})
//       .select("poNumber needDate projectId drawingId workOrderNo")
//       .lean();

//     if (!workOrders.length) {
//       return res.json({
//         status: true,
//         statusCode: 200,
//         message: "No work orders found",
//         data: {
//           posNos: [],
//           projects: [],
//           drawings: [],
//           workOrders: [], // ✅
//         },
//       });
//     }

//     const poSet = new Set();
//     const projectIdSet = new Set();
//     const drawingIdSet = new Set();
//     const workOrderSet = new Set(); // ✅

//     for (const wo of workOrders) {
//       if (wo.poNumber !== undefined && wo.poNumber !== null && String(wo.poNumber).trim() !== "") {
//         poSet.add(String(wo.poNumber));
//       }
//       if (wo.projectId) projectIdSet.add(String(wo.projectId));
//       if (wo.drawingId) drawingIdSet.add(String(wo.drawingId));

//       // ✅ Work Order No
//       if (wo.workOrderNo && String(wo.workOrderNo).trim() !== "") {
//         workOrderSet.add(String(wo.workOrderNo).trim());
//       }
//     }

//     const projectIds = Array.from(projectIdSet).map((id) => new mongoose.Types.ObjectId(id));
//     const drawingIds = Array.from(drawingIdSet).map((id) => new mongoose.Types.ObjectId(id));

//     // 2) ProjectId -> ProjectName
//     const projectDocs = projectIds.length
//       ? await Project.find({ _id: { $in: projectIds } })
//         .select("name projectName")
//         .lean()
//       : [];

//     const projects = projectDocs.map((p) => ({
//       label: p.name || p.projectName || String(p._id),
//       value: String(p._id),
//     }));

//     // 3) DrawingId -> DrawingNo
//     const drawingDocs = drawingIds.length
//       ? await Drawing.find({ _id: { $in: drawingIds } })
//         .select("drawingNo drawing drawingNumber")
//         .lean()
//       : [];

//     const drawings = drawingDocs.map((d) => ({
//       label: d.drawingNo || d.drawing || d.drawingNumber || String(d._id),
//       value: String(d._id),
//     }));

//     // 4) posNo -> direct
//     const poNos = Array.from(poSet)
//       .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
//       .map((v) => ({ label: v, value: v }));

//     // ✅ 5) workOrderNo -> direct
//     const workOrdersList = Array.from(workOrderSet)
//       .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
//       .map((v) => ({ label: v, value: v }));

//     // Optional: sort project/drawing by label
//     projects.sort((a, b) => String(a.label).localeCompare(String(b.label)));
//     drawings.sort((a, b) => String(a.label).localeCompare(String(b.label)));

//     return res.json({
//       status: true,
//       statusCode: 200,
//       message: "Filter data fetched successfully",
//       data: {
//         poNos,
//         projects,
//         drawings,
//         workOrders: workOrdersList, // ✅
//       },
//     });
//   } catch (error) {
//     console.error("getFilterData error:", error);
//     return res.status(500).json({
//       status: false,
//       statusCode: 500,
//       message: error.message,
//       data: {
//         poNos: [],
//         projects: [],
//         drawings: [],
//         workOrders: [],
//       },
//     });
//   }
// };


export const deleteBulkWorkOrders = async (req, res) => {
  try {

    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || !ids.length) {
      return res.status(400).json({
        success: false,
        message: "Please provide work order ids",
      });
    }

    await WorkOrder.deleteMany({
      _id: { $in: ids },
    });

    return res.status(200).json({
      success: true,
      message: "Work orders deleted successfully",
    });

  } catch (error) {

    console.error("deleteBulkWorkOrders error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

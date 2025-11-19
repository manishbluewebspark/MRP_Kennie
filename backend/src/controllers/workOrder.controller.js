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
import CostingItems from "../models/costingItem.js";
import MPN from "../models/library/MPN.js";
import Inventory from "../models/Inventory.js";
import UOM from "../models/UOM.js";
import Project from "../models/Project.js";


 function generateWorkOrderNumber (lastWorkOrderNo)  {
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
      status,
    } = req.query;

    const query = {};

    // Search by workOrderNo, poNumber, projectNo
    if (search) {
      query.$or = [
        { workOrderNo: { $regex: search, $options: "i" } },
        { poNumber: { $regex: search, $options: "i" } },
        { projectNo: { $regex: search, $options: "i" } },
      ];
    }

    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      query.projectId = projectId;
    }

    // ⚠️ drawingId agar tum root pe nahi rakhte ho (items ke andar hai),
    // to ye filter normally kaam nahi karega. Agar chaho to items.drawingId pe filter bhi laga sakte hain.
    if (status) query.status = status;

    const sortOptions = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    const total = await WorkOrder.countDocuments(query);
    let workOrders = await WorkOrder.find(query)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    // ⭐ 1) Saare drawingIds collect karo jo items me use hue hain
    const allDrawingIds = [];

    for (const wo of workOrders) {
      const items = wo.items || [];
      for (const it of items) {
        if (it.drawingId) {
          allDrawingIds.push(String(it.drawingId));
        }
      }
    }

    const uniqueDrawingIds = [...new Set(allDrawingIds)];

    // ⭐ 2) Un sab Drawing ko ek hi query me fetch karo
    let drawingMap = new Map();
    if (uniqueDrawingIds.length) {
      const drawingDocs = await Drawing.find({
        _id: { $in: uniqueDrawingIds },
      })
        .select("drawingNo quoteType projectType") // jo fields chahiye sirf woh
        .lean();

      drawingMap = new Map(
        drawingDocs.map((d) => [String(d._id), d])
      );
    }

    // ⭐ 3) Har WorkOrder ke items me drawingNo + projectType inject karo
    workOrders = workOrders.map((wo) => {
      const items = wo.items || [];
      const newItems = items.map((it) => {
        if (!it.drawingId) return it;

        const d = drawingMap.get(String(it.drawingId));

        return {
          ...it,
          drawingNo: d?.drawingNo || null,
          projectType: d?.quoteType || d?.projectType || null,
        };
      });

      return {
        ...wo,
        items: newItems,
      };
    });

    // ⭐ 4) Last Work Order Number
    const lastWorkOrder = await WorkOrder.findOne()
      .sort({ createdAt: -1 })
      .select("workOrderNo")
      .lean();

    const lastWorkOrderNo = lastWorkOrder ? lastWorkOrder.workOrderNo : null;

    return res.status(200).json({
      success: true,
      data: workOrders,
      lastWorkOrderNo,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("getAllWorkOrders error:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message });
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


export const createWorkOrder = async (req, res) => {
  try {
    const {
      workOrderNo,
      poNumber,
      needDate,
      commitDate,
      status,
      items = [],
      isTriggered = false,
      // projectNo, projectType, projectId IGNORE from body
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

    // 🔹 1) Saare drawingIds collect karo (original items se)
    const drawingIdSet = new Set();
    for (const it of items) {
      if (it.drawingId) {
        drawingIdSet.add(String(it.drawingId));
      }
    }

    const drawingIds = [...drawingIdSet];

    // 🔹 2) Drawing docs fetch karo
    let drawingMap = new Map();
    if (drawingIds.length) {
      const drawingDocs = await Drawing.find({
        _id: { $in: drawingIds },
      }).lean();

      drawingMap = new Map(
        drawingDocs.map((d) => [String(d._id), d])
      );
    }

    // 🔹 3) Items merge
    let mergedItems = mergeItems(items); // tumhara existing logic

    // 🔹 4) Har merged item ke andar projectId + projectType inject karo (Drawing se)
    mergedItems = mergedItems.map((it) => {
      const d = drawingMap.get(String(it.drawingId));
      return {
        ...it,
        projectId: d?.projectId || it.projectId || null,
        projectType: d?.quoteType || it.projectType || null,
      };
    });

    // 🔹 5) WorkOrder level ke liye (optional) ek default projectId/type nikal lo
    let resolvedProjectId = null;
    let resolvedProjectType = "cable_assembly";

    const firstItemWithProject = mergedItems.find(
      (it) => it.projectId
    );

    if (firstItemWithProject) {
      resolvedProjectId = firstItemWithProject.projectId;
      resolvedProjectType =
        firstItemWithProject.projectType || resolvedProjectType;
    }

    // 6) Check if work order already exists
    let existing = await WorkOrder.findOne({ workOrderNo });

    if (existing) {
      const combined = mergeItems([...(existing.items || []), ...mergedItems]);
      existing.items = combined;

      if (status) existing.status = status;
      if (typeof isTriggered === "boolean") existing.isTriggered = isTriggered;

      // WorkOrder root fields (optional)
      if (resolvedProjectId) {
        existing.projectId = resolvedProjectId;
      }
      if (resolvedProjectType) {
        existing.projectType = resolvedProjectType;
      }

      if (poNumber) existing.poNumber = poNumber;
      if (commitDate) existing.commitDate = new Date(commitDate);
      if (needDate) existing.needDate = new Date(needDate);

      backfillNeedDate(existing);

      const saved = await existing.save();
      return res.status(200).json({
        success: true,
        message: "Work order updated successfully",
        data: saved,
      });
    }

    // 7) New Work Order payload
    const payload = {
      workOrderNo,
      // projectNo agar chahiye to yaha bhi resolve kar sakte ho Project model se
      projectId: resolvedProjectId || undefined,
      poNumber: poNumber || "",
      projectType: resolvedProjectType || "cable_assembly",
      needDate: needDate ? new Date(needDate) : undefined,
      commitDate: commitDate ? new Date(commitDate) : undefined,
      status: status || "on_hold",
      isTriggered: Boolean(isTriggered),
      items: mergedItems, // 🟢 ab har item ke andar projectId + projectType hai
    };

    backfillNeedDate(payload);

    const created = await WorkOrder.create(payload);

    return res.status(201).json({
      success: true,
      message: "Work order created successfully",
      data: created,
    });
  } catch (error) {
    console.error("Create WorkOrder Error:", error);
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

export const updateWorkOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const body = { ...(req.body || {}) };

    // 1) ITEMS MERGE + DRAWING LOOKUP
    let mergedItems = [];
    let resolvedProjectId = null;
    let resolvedProjectType = "cable_assembly";

    if (Array.isArray(body.items) && body.items.length > 0) {
      // Merge items
      mergedItems = mergeItems(body.items);

      // 🔹 Collect drawingIds
      const drawingIds = [
        ...new Set(
          mergedItems
            .filter((it) => it.drawingId)
            .map((it) => String(it.drawingId))
        ),
      ];

      // 🔹 Fetch drawing data
      let drawingMap = new Map();
      if (drawingIds.length > 0) {
        const drawingDocs = await Drawing.find({
          _id: { $in: drawingIds },
        }).lean();

        drawingMap = new Map(
          drawingDocs.map((d) => [String(d._id), d])
        );
      }

      // 🔹 Inject projectId + projectType inside each item
      mergedItems = mergedItems.map((it) => {
        const d = drawingMap.get(String(it.drawingId));
        const projectId = d?.projectId || null;
        const projectType = d?.quoteType || null;

        if (projectId && !resolvedProjectId) {
          resolvedProjectId = projectId;
        }
        if (projectType && projectType !== resolvedProjectType) {
          resolvedProjectType = projectType;
        }

        return {
          ...it,
          projectId,
          projectType,
        };
      });

      body.items = mergedItems;
    }

    // 2) DATE NORMALIZATION
    if (body.commitDate) body.commitDate = new Date(body.commitDate);
    if (body.needDate) body.needDate = new Date(body.needDate);

    backfillNeedDate(body);

    // 3) UPDATE ROOT FIELDS BASED ON items
    if (resolvedProjectId) body.projectId = resolvedProjectId;
    if (resolvedProjectType) body.projectType = resolvedProjectType;

    // 4) FINAL UPDATE
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

export const importWorkOrders = async (req, res) => {
  try {
    // ✅ Step 1: File validation
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const fileName = (req.file.originalname || "").toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      return res.status(400).json({
        success: false,
        message: "Only .xlsx / .xls files allowed",
      });
    }

    // ✅ Step 2: Read Excel
    const buffer = req.file.buffer || fs.readFileSync(req.file.path);
    const workbook = XLSX.read(buffer, { type: "buffer" });

    if (!workbook.SheetNames?.length) {
      return res
        .status(400)
        .json({ success: false, message: "Excel has no sheets" });
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!rows.length) {
      return res
        .status(400)
        .json({ success: false, message: "Sheet is empty" });
    }

    console.log("🔍 Sample Row:", rows[0]);

    // ✅ Step 3: Get all existing WO numbers (for uniqueness) + lastWorkOrderNo
    const existingWOs = await WorkOrder.find({})
      .select("workOrderNo -_id")
      .lean();

    const existingNos = existingWOs.map((x) => x.workOrderNo).filter(Boolean);

    // Last used WO no (for generator). Agar nahi mila to null.
    let lastWorkOrderNo = existingNos.length
      ? existingNos[existingNos.length - 1]
      : null;

    const newWorkOrders = [];
    const skippedRows = []; // ← jinka data match nahi hua / skip kiya

    // ✅ Step 4: Loop through Excel rows
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2; // assuming row 1 = header

      // --- Convert Excel date -> commitDate ---
      const commitDate =
        typeof row["Commit Date"] === "number"
          ? excelDateToJS(row["Commit Date"])
          : row["Commit Date"]
          ? new Date(row["Commit Date"])
          : null;

      const needDate = row["Need Date"]
        ? new Date(row["Need Date"])
        : commitDate
        ? new Date(commitDate.getTime() - 14 * 24 * 60 * 60 * 1000)
        : null;

      // --- Convert Prod Type ---
      let projectType = "others_assembly";
      if (row["Prod Type-C/B/O"] === "C") projectType = "cable_assembly";
      if (row["Prod Type-C/B/O"] === "B") projectType = "box_Build_assembly";
      if (row["Prod Type-C/B/O"] === "O") projectType = "others_assembly";

      // --- Find Drawing ---
      const drawingNo = row.Drawingno?.toString().trim();
      const drawing = drawingNo
        ? await Drawing.findOne({ drawingNo }).lean()
        : null;

      if (!drawing) {
        // ❌ Drawing match nahi mila → is row ko skip karo
        skippedRows.push({
          rowNumber,
          reason: "Drawing not found",
          drawingNo,
        });
        continue; // 🔴 skip this row
      }

      const drawingId = drawing._id;

      // --- Work Order No (Excel se ya auto) ---
      const excelWO = row.WorkorderNo?.toString().trim();
      let workOrderNo;

      if (excelWO && !existingNos.includes(excelWO)) {
        workOrderNo = excelWO;
      } else {
        // auto-generate based on lastWorkOrderNo
        workOrderNo = generateWorkOrderNumber(lastWorkOrderNo);
      }

      // Track used numbers so that import batch me duplicate na bane
      existingNos.push(workOrderNo);
      lastWorkOrderNo = workOrderNo;

      // --- Build Item ---
      const item = {
        drawingId,
        projectType:drawing?.quoteType,
        projectId:drawing?.projectId,
        posNo: Number(row.POSNO) || 0,
        quantity: Number(row.Prod_Qty) || 1,
        remarks: row.Description?.trim() || "",
        status: "open",
      };

      // --- Build Work Order Payload (matching createWorkOrder format) ---
      const woPayload = {
        workOrderNo,
        // projectNo: row.ProjectNo?.toString().trim() || "",
        poNumber: row.PONO?.toString().trim() || "",
        // projectType,
        commitDate,
        needDate,
        status: "on_hold",
        isTriggered: false,
        items: [item],
      };

      newWorkOrders.push(woPayload);
    }

    // ✅ Step 5: Bulk Insert only valid rows
    let inserted = [];
    if (newWorkOrders.length) {
      inserted = await WorkOrder.insertMany(newWorkOrders, {
        ordered: true, // agar koi fail ho to yahi ruk jayega – but humne data pre-validate kar liya hai
      });
    }

    return res.status(200).json({
      success: true,
      message: `Imported ${inserted.length} Work Orders. Skipped ${skippedRows.length} rows.`,
      importedCount: inserted.length,
      skippedCount: skippedRows.length,
      skippedRows,
      data: inserted.map((x) => ({
        workOrderNo: x.workOrderNo,
        projectNo: x.projectNo,
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


export const exportWorkOrders = async (req, res) => {
  try {
    // populate drawing number if you store ref in items.drawingId
    const workOrders = await WorkOrder.find()
      .populate("items.drawingId", "drawingNo")
      .lean();

    // Build flat rows; also output a row even if items is empty
    const rows = [];
    for (const wo of workOrders) {
      if (Array.isArray(wo.items) && wo.items.length) {
        for (const it of wo.items) {
          rows.push({
            WorkOrderNo: wo.workOrderNo || "",
            ProjectNo: wo.projectNo || "",
            ProjectName: wo.projectId?.projectName || "",
            PO_Number: wo.poNumber || "",
            ProjectType: wo.projectType || "",
            NeedDate: wo.needDate ? new Date(wo.needDate).toLocaleDateString("en-GB") : "",
            CommitDate: wo.commitDate ? new Date(wo.commitDate).toLocaleDateString("en-GB") : "",
            Status: wo.status || "",
            DrawingNo: it?.drawingId?.drawingNo || "",   // populated above
            POS_No: it?.posNo || "",
            Quantity: it?.quantity ?? "",
            UOM: it?.uom || "",
            Remarks: it?.remarks || "",
            Item_Status: it?.status || "",
          });
        }
      } else {
        rows.push({
          WorkOrderNo: wo.workOrderNo || "",
          ProjectNo: wo.projectNo || "",
          ProjectName: wo.projectId?.projectName || "",
          PO_Number: wo.poNumber || "",
          ProjectType: wo.projectType || "",
          NeedDate: wo.needDate ? new Date(wo.needDate).toLocaleDateString("en-GB") : "",
          CommitDate: wo.commitDate ? new Date(wo.commitDate).toLocaleDateString("en-GB") : "",
          Status: wo.status || "",
          DrawingNo: "",
          POS_No: "",
          Quantity: "",
          UOM: "",
          Remarks: "",
          Item_Status: "",
        });
      }
    }

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "No work orders found to export" });
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Optional: column widths
    const headers = Object.keys(rows[0]);
    ws["!cols"] = headers.map(h => ({ wch: Math.max(12, h.length + 2) }));

    XLSX.utils.book_append_sheet(wb, ws, "WorkOrders");

    // Write Node buffer and send as binary
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.status(200);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="work_orders_export.xlsx"');
    res.setHeader("Content-Length", buf.length);
    return res.end(buf);
  } catch (error) {
    console.error("Export Work Orders Error:", error);
    return res.status(500).json({ success: false, message: "Failed to export work orders", error: error.message });
  }
};

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
    const rows = await fetchDeliveryOrdersForExport(req.query);

    // Create workbook and sheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Add sheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Delivery Orders");

    // Write buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const fileName = `delivery_orders_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${fileName}`
    );
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

// ✅ PDF Export delivery
export const exportDeliveryWorkOrdersPDF = async (req, res) => {
  try {
    const rows = await fetchDeliveryOrdersForExport(req.query);

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFontSize(14);
    doc.text("Delivery Orders Report", 40, 40);

    const head = [[
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
    ]];

    const body = rows.map((r) => [
      r.workOrderNo,
      r.drawingNo,
      r.project,
      r.customer,
      String(r.qty ?? 0),
      r.poNumber,
      r.completedDate,
      r.targetDeliveryDate,
      r.status,
      r.doNumber,
      r.delivered,
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 60,
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [29, 78, 216], textColor: 255 }, // blue header
      margin: { left: 40, right: 40 },
      tableWidth: "auto",
      theme: "grid",
    });

    const fileName = `delivery_orders_${new Date().toISOString().slice(0, 10)}.pdf`;
    const buf = doc.output("arraybuffer");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.send(Buffer.from(buf));
  } catch (error) {
    console.error("exportDeliveryWorkOrdersPDF error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Word Export delivery
export const exportDeliveryWorkOrdersWord = async (req, res) => {
  try {
    const rows = await fetchDeliveryOrdersForExport(req.query);

    const headerCells = [
      "Work Order No", "Drawing No", "Project", "Customer", "Qty",
      "PO Number", "Completed", "Target Delivery", "Status", "DO No.", "Delivered"
    ].map(txt =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: txt, bold: true })] })],
      })
    );

    const tableRows = [
      new TableRow({ children: headerCells }),
      ...rows.map(r =>
        new TableRow({
          children: [
            r.workOrderNo,
            r.drawingNo,
            r.project,
            r.customer,
            String(r.qty ?? 0),
            r.poNumber,
            r.completedDate,
            r.targetDeliveryDate,
            r.status,
            r.doNumber,
            r.delivered,
          ].map(val =>
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
            new Paragraph({ text: " " }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: tableRows,
            }),
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

    // Update only the required fields
    wo.isInProduction = true;
    wo.isTriggered = true;
    wo.status = "in_progress";

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

export const getAllProductionWordOrders = async (req, res) => {
  try {
    // optional filters
    const { page = 1, limit = 20, search } = req.query;

    const query = {
      isInProduction: true
    };

    // optional search by code, project name, etc.
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { projectName: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [workOrders, total] = await Promise.all([
      WorkOrder.find(query)
        // .populate("project", "name")     // optional: populate project info
        // .populate("createdBy", "name")   // optional: populate user info
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      WorkOrder.countDocuments(query),
    ]);

    return res.json({
      success: true,
      message: "Fetched all production work orders",
      data: workOrders,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
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

export const getTotalMPNNeeded = async (req, res) => {
  try {
    // 1) Sare ON HOLD work orders lao
    const workOrders = await WorkOrder.find({ status: "on_hold" }).lean();
    if (!workOrders.length) {
      return res.json({ status: true, statusCode: 200, message: "No work orders in on_hold status", data: [] });
    }

    // 2) Unique drawingIds from items
    const drawingIdStrs = [
      ...new Set(
        workOrders.flatMap((wo) =>
          (wo.items || [])
            .filter((i) => i.drawingId)
            .map((i) => String(i.drawingId))
        )
      ),
    ];
    if (!drawingIdStrs.length) {
      return res.json({ status: true, statusCode: 200, message: "No drawingIds found", data: [] });
    }

    const drawingObjectIds = drawingIdStrs.map((id) => new mongoose.Types.ObjectId(id));

    // 3) CostingItems fetch
    // const costingItems = await CostingItems.find({
    //   drawingId: { $in: drawingObjectIds },
    // }).lean();

    const costingItems = await CostingItems.find({
      drawingId: { $in: drawingObjectIds },
      quoteType: "material",
    }).lean();

    if (!costingItems.length) {
      return res.json({ status: true, statusCode: 200, message: "No costing items found", data: [] });
    }

    // Map: drawingId → costingItems[]
    const costingByDrawing = new Map();
    for (const ci of costingItems) {
      const key = String(ci.drawingId);
      const arr = costingByDrawing.get(key) || [];
      arr.push(ci);
      costingByDrawing.set(key, arr);
    }

    // 4) MPN usage aggregation
    const mpnUsageMap = new Map();
    const mpnIdStrSet = new Set();

    for (const wo of workOrders) {
      for (const woItem of wo.items || []) {
        const drawingId = woItem.drawingId;
        if (!drawingId) continue;

        const costingArr = costingByDrawing.get(String(drawingId));
        if (!costingArr || !costingArr.length) continue;

        const woQty = Number(woItem.quantity || 1);

        for (const ci of costingArr) {
          const mpnObjId = ci.mpn;
          if (!mpnObjId) continue;

          const mpnIdStr = String(mpnObjId);
          mpnIdStrSet.add(mpnIdStr);

          const qtyPer = Number(ci.quantity || 0);
          const totalNeededForThis = qtyPer * woQty;

          const key = `${mpnIdStr}_${wo._id}`;

          const prev = mpnUsageMap.get(key) || {
            mpnId: mpnIdStr,
            workOrderNo: wo.workOrderNo || "",
            description: ci.description || "",
            manufacturer: ci.manufacturer || "",
            uomId: ci.uom || null,         // Store UOM ID temporarily
            totalNeeded: 0,
          };

          prev.totalNeeded += totalNeededForThis;
          mpnUsageMap.set(key, prev);
        }
      }
    }

    if (!mpnUsageMap.size) {
      return res.json({ status: true, statusCode: 200, message: "No MPN usage found", data: [] });
    }

    // 5) Unique MPN ObjectIDs
    const mpnObjectIds = [...mpnIdStrSet].map((id) => new mongoose.Types.ObjectId(id));

    // 6) Fetch MPN library records
    const mpnLibDocs = await MPN.find({ _id: { $in: mpnObjectIds } }).lean();
    const mpnLibMap = new Map();
    for (const lib of mpnLibDocs) mpnLibMap.set(String(lib._id), lib);

    // 7) Fetch UOM for all unique uomIds
    const uomIds = [
      ...new Set(
        Array.from(mpnUsageMap.values())
          .map((row) => row.uomId)
          .filter((id) => id)
          .map((id) => String(id))
      ),
    ];

    const uomDocs = await UOM.find({ _id: { $in: uomIds } }).lean();
    const uomMap = new Map();
    for (const u of uomDocs) uomMap.set(String(u._id), u);

    // 8) Inventory stock
    const inventoryDocs = await Inventory.find({
      mpnId: { $in: mpnObjectIds },
    }).lean();

    const invMap = new Map();
    for (const inv of inventoryDocs) {
      const key = String(inv.mpnId);
      const curr = invMap.get(key) || 0;
      invMap.set(key, curr + Number(inv.balanceQuantity || 0));
    }

    // 9) Final Output
    const result = Array.from(mpnUsageMap.values()).map((row) => {
      const lib = mpnLibMap.get(row.mpnId);
      const uomDoc = uomMap.get(String(row.uomId));

      const currentStock = invMap.get(row.mpnId) || 0;

      return {
        // mpnId: row.mpnId,
        mpn: lib?.mpn || lib?.mpnNumber || lib?.MPN || null,
        description: row.description || null,
        manufacturer: row.manufacturer || null,
        uom: uomDoc?.name || null,   // UOM model → name
        totalNeeded: row.totalNeeded,
        currentStock,
        shortfall: Math.max(0, row.totalNeeded - currentStock),
        workOrderNo: row.workOrderNo,
      };
    });

    return res.json({
      status: true,
      statusCode: 200,
      message: "Total MPN needed calculated successfully",
      data: result,
    });

  } catch (error) {
    console.error("getTotalMPNNeeded error:", error);
    return res.status(500).json({ status: false, message: error.message, data: [] });
  }
};

export const getDeliveryOrders = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      status,          // e.g. Pending | Completed | In_Progress ...
      customer,        // customer _id
      project,         // project _id
      dateFrom,        // ISO or yyyy-mm-dd
      dateTo,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    page = Math.max(parseInt(page) || 1, 1);
    limit = Math.max(parseInt(limit) || 10, 1);

    const match = { isDeleted: { $ne: true } };

    if (search) {
      match.$or = [
        { workOrderNo: { $regex: search, $options: "i" } },
        { poNumber: { $regex: search, $options: "i" } },
        { posNumber: { $regex: search, $options: "i" } },
        // also allow searching by drawing code once we have it in pipeline
      ];
    }

    if (status) {
      match.status = status;
    }

    if (dateFrom || dateTo) {
      match.createdAt = {};
      if (dateFrom) match.createdAt.$gte = new Date(dateFrom);
      if (dateTo) match.createdAt.$lte = new Date(dateTo);
    }

    const pipeline = [
      { $match: match },

      // one row per item
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },

      // drawing join
      {
        $lookup: {
          from: "drawings",
          localField: "items.drawingId",
          foreignField: "_id",
          as: "drawingDoc",
        },
      },
      { $unwind: { path: "$drawingDoc", preserveNullAndEmptyArrays: true } },

      // project join (from drawing)
      {
        $lookup: {
          from: "projects",
          localField: "drawingDoc.projectId",
          foreignField: "_id",
          as: "projectDoc",
        },
      },
      { $unwind: { path: "$projectDoc", preserveNullAndEmptyArrays: true } },

      // customer join (from project)
      {
        $lookup: {
          from: "customers",
          localField: "projectDoc.customerId",
          foreignField: "_id",
          as: "customerDoc",
        },
      },
      { $unwind: { path: "$customerDoc", preserveNullAndEmptyArrays: true } },

      // optional filter by project/customer after lookups
      ...(project ? [{ $match: { "projectDoc._id": new mongoose.Types.ObjectId(project) } }] : []),
      ...(customer ? [{ $match: { "customerDoc._id": new mongoose.Types.ObjectId(customer) } }] : []),

      // compute friendly fields
      {
        $addFields: {
          displayPONumber: { $ifNull: ["$poNumber", "$posNumber"] },

          // Completed date: item.completedDate -> order.completedAt -> null
          displayCompletedDate: { $ifNull: ["$items.completedDate", "$completedAt"] },

          // Target delivery: item.targetDeliveryDate -> order.commitDate -> null
          displayTargetDelivery: { $ifNull: ["$items.targetDeliveryDate", "$commitDate"] },

          // Drawing name fallback across common field names
          drawingName: {
            $ifNull: [
              "$drawingDoc.drawingName",
              {
                $ifNull: [
                  "$drawingDoc.drawingNo",
                  {
                    $ifNull: [
                      "$drawingDoc.drawingNumber",
                      {
                        $ifNull: ["$drawingDoc.name", "$drawingDoc.title"],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },

      // derive display status
      {
        $addFields: {
          displayStatus: {
            $cond: [
              { $ifNull: ["$displayCompletedDate", false] },
              "Completed",
              { $ifNull: ["$status", "Pending"] },
            ],
          },
        },
      },

      // final projection (includes itemId for per-item updates + order-level flags)
      {
        $project: {
          _id: 1,
          itemId: "$items._id",
          workOrderNo: 1,
          doNumber: 1,
          delivered: 1,
          createdAt: 1,
          completedDate: 1,
          poNumber: "$displayPONumber",
          qty: { $ifNull: ["$items.qty", 0] },

          drawingId: "$items.drawingId",
          drawingName: 1,                    // <-- here is your drawing name
          // keep a numeric/code too if you need:
          drawingCode: "$drawingDoc.drawingNumber",

          projectId: "$projectDoc._id",
          projectName: "$projectDoc.projectName",

          customerId: "$customerDoc._id",
          customerName: "$customerDoc.companyName",

          // completedDate: "$displayCompletedDate",
          targetDeliveryDate: "$displayTargetDelivery",
          status: "$displayStatus",
        },
      },

      // search could also try drawingName if provided
      ...(search
        ? [
          {
            $match: {
              $or: [
                { workOrderNo: { $regex: search, $options: "i" } },
                { poNumber: { $regex: search, $options: "i" } },
                { drawingName: { $regex: search, $options: "i" } },
                { drawingCode: { $regex: search, $options: "i" } },
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
      filtersApplied: { search, status, customer, project, dateFrom, dateTo },
    });
  } catch (err) {
    console.error("getDeliveryOrders error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getEachMPNUsage = async (req, res) => {
  try {
    const { mpnId, page = 1, limit = 10 } = req.query;

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

    // 1) CostingItems filter: only material + this MPN
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
      });
    }

    // Unique drawingIds
    const drawingIds = [
      ...new Set(costingItems.map((ci) => String(ci.drawingId))),
    ];
    const drawingObjectIds = drawingIds.map((id) => new mongoose.Types.ObjectId(id));

    // 2) Work orders using those drawingIds
    const workOrders = await WorkOrder.find({
      status: "on_hold",
      "items.drawingId": { $in: drawingObjectIds },
    }).lean();

    if (!workOrders.length) {
      return res.json({
        status: true,
        statusCode: 200,
        message: "No work orders found using this MPN",
        data: [],
      });
    }

    // 3) Drawing Details
    const drawingDocs = await Drawing.find({
      _id: { $in: drawingObjectIds },
    }).lean();

    // Collect unique projectIds
    const projectIds = [
      ...new Set(
        drawingDocs
          .map((d) => d.projectId)
          .filter((p) => p)
          .map((p) => String(p))
      ),
    ];

    // Fetch project details
    const projectDocs = await Project.find({
      _id: { $in: projectIds },
    }).lean();

    const projectMap = new Map();
    for (const p of projectDocs) {
      projectMap.set(String(p._id), p.name || p.projectName || null);
    }

    // Final drawing map
    const drawingMap = new Map();
    for (const d of drawingDocs) {
      drawingMap.set(String(d._id), {
        drawingNo: d.drawingNo || d.drawing || null,
        projectId: d.projectId ? String(d.projectId) : null,
      });
    }

    // Group costing by drawing
    const costingMap = new Map();
    for (const ci of costingItems) {
      const key = String(ci.drawingId);
      const arr = costingMap.get(key) || [];
      arr.push(ci);
      costingMap.set(key, arr);
    }

    // 4) Build usage rows
    const rows = [];

    for (const wo of workOrders) {
      for (const woItem of wo.items || []) {
        const dKey = String(woItem.drawingId);
        const costArr = costingMap.get(dKey);
        if (!costArr) continue;

        const woQty = Number(woItem.quantity || 1);
        const dInfo = drawingMap.get(dKey) || {};

        const projectName = dInfo.projectId
          ? projectMap.get(dInfo.projectId) || null
          : null;

        for (const ci of costArr) {
          const qtyPer = Number(ci.quantity || 0);
          const qtyUsed = qtyPer * woQty;

          rows.push({
            drawingNo: dInfo.drawingNo,
            projectName: projectName,
            workOrderNo: wo.workOrderNo,
            quantityUsed: qtyUsed,
            needDate: wo.needDate,
            status: wo.status,
          });
        }
      }
    }

    if (!rows.length) {
      return res.json({
        status: true,
        statusCode: 200,
        message: "No MPN usage found",
        data: [],
      });
    }

    // Pagination
    const total = rows.length;
    const totalPages = Math.ceil(total / limitNum);
    const start = (pageNum - 1) * limitNum;
    const paginatedRows = rows.slice(start, start + limitNum);

    return res.json({
      status: true,
      statusCode: 200,
      message: "MPN usage records fetched",
      data: paginatedRows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
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




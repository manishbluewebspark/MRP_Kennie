import mongoose from "mongoose";
import XLSX from "xlsx";
import WorkOrder from "../models/WorkingOrders.js";
import Drawing from "../models/Drwaing.js";
import * as docx from "docx";
import fs from "fs";
import { Packer, Paragraph, Table, TableCell, TableRow, TextRun, AlignmentType } from "docx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";


function generateWorkOrderNumber(existingNos) {
  let num = 1;
  let wo;
  do {
    wo = `AUTO-${String(num).padStart(3, "0")}`;
    num++;
  } while (existingNos.includes(wo));
  return wo;
}

// ---------------- Get All WorkOrders ----------------
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

    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) query.projectId = projectId;
    if (drawingId && mongoose.Types.ObjectId.isValid(drawingId)) query.drawingId = drawingId;
    if (status) query.status = status;

    const sortOptions = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    const total = await WorkOrder.countDocuments(query);
    const workOrders = await WorkOrder.find(query)
      // .populate("projectId", "projectName code")
      // .populate("drawingId", "drawingNo description")
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: workOrders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
export const createWorkOrder = async (req, res) => {
  try {
    const {
      workOrderNo,
      projectNo,
      poNumber,
      projectType,
      needDate,
      commitDate,
      status,
      items = [],
      projectId,
      isTriggered = false,
    } = req.body || {};

    if (!workOrderNo) {
      return res.status(400).json({ success: false, message: 'workOrderNo is required' });
    }
    if (!projectNo) {
      return res.status(400).json({ success: false, message: 'projectNo is required' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required' });
    }

    const mergedItems = mergeItems(items);

    // If WO exists → append/merge items & update status (idempotent “create-or-append”)
    let existing = await WorkOrder.findOne({ workOrderNo });
    if (existing) {
      const combined = mergeItems([...(existing.items || []), ...mergedItems]);
      existing.items = combined;
      if (status) existing.status = status;
      if (typeof isTriggered === 'boolean') existing.isTriggered = isTriggered;

      // optional fields updates if passed
      if (poNumber) existing.poNumber = poNumber;
      if (projectType) existing.projectType = projectType;
      if (projectId) existing.projectId = projectId;
      if (commitDate) existing.commitDate = new Date(commitDate);
      if (needDate) existing.needDate = new Date(needDate);

      backfillNeedDate(existing);
      const saved = await existing.save();
      return res.status(200).json({
        success: true,
        message: 'Work order updated successfully',
        data: saved,
      });
    }

    // Create new
    const payload = {
      workOrderNo,
      projectNo,
      projectId: projectId || undefined,
      poNumber: poNumber || '',
      projectType: projectType || 'cable_assembly',
      needDate: needDate ? new Date(needDate) : undefined,
      commitDate: commitDate ? new Date(commitDate) : undefined,
      status: status || 'on_hold',
      isTriggered: Boolean(isTriggered),
      items: mergedItems,
    };

    backfillNeedDate(payload);
    const created = await WorkOrder.create(payload);

    return res.status(201).json({
      success: true,
      message: 'Work order created successfully',
      data: created,
    });
  } catch (error) {
    console.error('Create WorkOrder Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** ---------------- Update ---------------- */
export const updateWorkOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const body = { ...(req.body || {}) };

    // Normalize/merge items if provided
    if (Array.isArray(body.items)) {
      body.items = mergeItems(body.items);
    }

    // date normalization
    if (body.commitDate) body.commitDate = new Date(body.commitDate);
    if (body.needDate) body.needDate = new Date(body.needDate);

    backfillNeedDate(body);

    const updated = await WorkOrder.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'WorkOrder not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Work order updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Update WorkOrder Error:', error);
    return res.status(500).json({ success: false, message: error.message });
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
    if (!req.file)
      return res.status(400).json({ success: false, message: "No file uploaded" });

    const fileName = (req.file.originalname || "").toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls"))
      return res.status(400).json({ success: false, message: "Only .xlsx / .xls files allowed" });

    // ✅ Step 2: Read Excel
    const buffer = req.file.buffer || fs.readFileSync(req.file.path);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    if (!workbook.SheetNames?.length)
      return res.status(400).json({ success: false, message: "Excel has no sheets" });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (!rows.length)
      return res.status(400).json({ success: false, message: "Sheet is empty" });

    console.log("🔍 Sample Row:", rows[0]);

    // ✅ Step 3: Get all existing WO numbers
    const existingWOs = await WorkOrder.find({}).select("workOrderNo -_id");
    const existingNos = existingWOs.map((x) => x.workOrderNo);

    const newWorkOrders = [];

    // ✅ Step 4: Loop through Excel rows
    for (const row of rows) {
      // --- Convert Excel date ---
      const commitDate =
        typeof row["Commit Date"] === "number"
          ? excelDateToJS(row["Commit Date"])
          : row["Commit Date"]
          ? new Date(row["Commit Date"])
          : null;

      const needDate =
        row["Need Date"]
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
      const drawing = await Drawing.findOne({ drawingNo });
      const drawingId = drawing?._id || null;

      // --- Work Order No ---
      const excelWO = row.WorkorderNo?.toString().trim();
      const workOrderNo =
        excelWO && !existingNos.includes(excelWO)
          ? excelWO
          : generateWorkOrderNumber(existingNos);
      existingNos.push(workOrderNo);

      // --- Build Item ---
      const item = {
        drawingId,
        posNo: Number(row.POSNO) || 0,
        quantity: Number(row.Prod_Qty) || 1,
        remarks: row.Description?.trim() || "",
        status: "open",
      };

      // --- Build Work Order Payload (matching createWorkOrder format) ---
      const woPayload = {
        workOrderNo,
        projectNo: row.ProjectNo?.toString().trim() || "",
        poNumber: row.PONO?.toString().trim() || "",
        projectType,
        commitDate,
        needDate,
        status: "on_hold",
        isTriggered: false,
        items: [item],
      };

      newWorkOrders.push(woPayload);
    }

    // ✅ Step 5: Bulk Insert (createWorkOrder compatible)
    const inserted = await WorkOrder.insertMany(newWorkOrders, { ordered: true });

    res.status(200).json({
      success: true,
      message: `✅ Imported ${inserted.length} Work Orders successfully.`,
      data: inserted.map((x) => ({
        workOrderNo: x.workOrderNo,
        projectNo: x.projectNo,
        projectType: x.projectType,
      })),
    });
  } catch (error) {
    console.error("❌ Import Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during import",
      error: error.message,
    });
  }
};




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

// ✅ PDF Export
export const exportWorkOrdersPDF = async (req, res) => {
  try {
    const workOrders = await WorkOrder.find().lean();

    const doc = new jsPDF();
    doc.text("Work Orders Report", 14, 15);
    const tableData = workOrders.map((wo) => [
      wo.workOrderNo,
      wo.projectNo,
      wo.poNumber,
      wo.status,
      wo.doNumber || "",
      wo.delivered ? "Yes" : "No",
    ]);

    autoTable(doc, {
      startY: 25,
      head: [["WorkOrderNo", "ProjectNo", "PO", "Status", "DO No.", "Delivered"]],
      body: tableData,
    });

    const pdfBuffer = doc.output("arraybuffer");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=work_orders.pdf");
    res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Word Export
export const exportWorkOrdersWord = async (req, res) => {
  try {
    const workOrders = await WorkOrder.find().lean();

    const tableRows = [
      new TableRow({
        children: [
          "WorkOrderNo",
          "ProjectNo",
          "PO",
          "Status",
          "DO No.",
          "Delivered",
        ].map(
          (heading) =>
            new TableCell({
              children: [new Paragraph({ text: heading, bold: true })],
            })
        ),
      }),
      ...workOrders.map(
        (wo) =>
          new TableRow({
            children: [
              wo.workOrderNo,
              wo.projectNo,
              wo.poNumber || "",
              wo.status,
              wo.doNumber || "",
              wo.delivered ? "Yes" : "No",
            ].map(
              (text) =>
                new TableCell({
                  children: [new Paragraph({ text: text.toString() })],
                })
            ),
          })
      ),
    ];

    const doc = new docx.Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: "Work Orders Report",
              heading: "Heading1",
              alignment: AlignmentType.CENTER,
            }),
            new Table({ rows: tableRows }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=work_orders.docx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.send(buffer);
  } catch (error) {
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


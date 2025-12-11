import nodemailer from "nodemailer";
import PurchaseOrders from "../models/PurchaseOrders.js";
import mongoose from "mongoose";
import CostingItems from "../models/CostingItem.js";
import WorkOrder from "../models/WorkingOrders.js";
import MPN from "../models/library/MPN.js";
import UOM from "../models/UOM.js";
import Inventory from "../models/Inventory.js";
import Suppliers from "../models/Suppliers.js";
import XLSX from 'xlsx'
import fs from 'fs'
import { generatePurchaseOrderPDF } from "../middlewares/purchaseEmail.middleware.js";
const toObjectId = (id) => {
  try {
    return new mongoose.Types.ObjectId(String(id));
  } catch {
    return null;
  }
};

function buildFilter({ year, month, supplier, status }) {
  const filter = { isDeleted: false };

  // Date range on poDate
  let start, end;
  const y = Number(year) || new Date().getUTCFullYear();

  if (month) {
    const m = Math.max(1, Math.min(12, Number(month)));
    start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  } else {
    start = new Date(Date.UTC(y, 0, 1, 0, 0, 0));
    end = new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0));
  }
  filter.poDate = { $gte: start, $lt: end };

  if (supplier) {
    const oid = toObjectId(supplier);
    if (oid) filter.supplier = oid;
  }

  if (status) filter.status = status;

  return filter;
}


/**
 * Add Purchase Order
 */
export const addPurchaseOrder = async (req, res) => {
  try {
    const data = req.body || {};

    // --- helpers ------------------------------------------------------------
    const num = (v, def = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : def;
    };
    const isId = (v) => typeof v === "string" && v.trim().length > 0;

    // --- basic payload guards ----------------------------------------------
    if (!Array.isArray(data.items) || data.items.length === 0) {
      return res.status(400).json({ success: false, error: "At least one item is required." });
    }
    if (!isId(data.supplier)) {
      return res.status(400).json({ success: false, error: "Supplier is required." });
    }

    // Some clients send freight at root; some send inside totals.
    const freightAmount =
      data.totals && data.totals.freightAmount !== undefined
        ? num(data.totals.freightAmount, 0)
        : num(data.freightAmount, 0);

    // --- normalize + compute line items ------------------------------------
    let subTotal = 0;

    const items = data.items.map((raw, idx) => {
      const idNumber = (raw.idNumber || "").trim();
      const description = (raw.description || "").trim();
      const mpn = raw.mpn;           // expected ObjectId string
      const uom = raw.uom;           // expected ObjectId string
      const manufacturer = (raw.manufacturer || "").trim();

      const qty = num(raw.qty, 0);
      const unitPrice = num(raw.unitPrice, 0);
      const discount = num(raw.discount ?? raw.discPercentage, 0); // accept either name
      // extPrice = qty * unitPrice * (1 - discount/100)
      const extPrice = +(qty * unitPrice * (1 - discount / 100));

      // validate required line fields as per your schema
      if (!idNumber || !description || !isId(mpn) || !isId(uom) || qty <= 0) {
        throw new Error(
          `Invalid item at index ${idx}. Required: idNumber, description, mpn(ObjectId), uom(ObjectId), qty>0`
        );
      }

      subTotal += extPrice;

      return {
        idNumber,
        description,
        mpn,
        manufacturer,
        uom,
        qty,
        unitPrice,
        discount,    // schema expects "discount"
        extPrice,    // schema requires number
      };
    });

    // --- compute totals (all NUMBERS) --------------------------------------
    const ostTax = +(subTotal * 0.09); // 9% OST
    const finalAmount = +(subTotal + freightAmount + ostTax);

    // Build clean totals object with numbers only and expected keys
    const totals = {
      subTotalAmount: subTotal,
      ostTax,
      finalAmount,
      freightAmount, // keep for reference if your schema stores it here
    };

    // --- create PO ----------------------------------------------------------
    const purchaseOrder = await PurchaseOrders.create({
      // pass through top-level known fields (sanitize as needed)
      poNumber: data.poNumber,
      poDate: data.poDate,
      referenceNo: data.referenceNo,
      workOrderNo: data.workOrderNo,
      needDate: data.needDate,
      supplier: data.supplier,
      shipToAddress: data.shipToAddress || "",
      termsConditions: data.termsConditions || "",
      freightAmount, // if your schema keeps it at root as well
      items,
      totals,
    });

    return res.status(201).json({ success: true, data: purchaseOrder });
  } catch (error) {
    // ValidationError from our checks
    if (error.message && /Invalid item|At least one item|Supplier is required/.test(error.message)) {
      return res.status(400).json({ success: false, error: error.message });
    }

    // Mongoose validation or other errors
    console.error("addPurchaseOrder error:", error);
    return res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
  }
};


/**
 * Update Purchase Order
 */
export const updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body || {};

    if (!id) {
      return res.status(400).json({ success: false, error: "Missing purchase order ID" });
    }

    // helper to force numeric values
    const num = (v, def = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : def;
    };

    // compute extPrice for each item and subtotal
    let subTotal = 0;
    const items = (data.items || []).map((item, i) => {
      const qty = num(item.qty);
      const unitPrice = num(item.unitPrice);
      const discount = num(item.discount ?? item.discPercentage);

      const extPrice = +(qty * unitPrice * (1 - discount / 100));

      // accumulate subtotal
      subTotal += extPrice;

      return {
        ...item,
        qty,
        unitPrice,
        discount,
        extPrice,
      };
    });

    // compute totals
    const freightAmount = num(data.totals?.freightAmount ?? data.freightAmount);
    const ostTax = +(subTotal * 0.09);
    const finalAmount = +(subTotal + freightAmount + ostTax);

    // perform update
    const updated = await PurchaseOrders.findByIdAndUpdate(
      id,
      {
        ...data,
        items,
        totals: {
          freightAmount,
          subTotalAmount: subTotal,
          ostTax,
          finalAmount,
        },
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: "Purchase order not found" });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("❌ updatePurchaseOrder error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;              // PO ID from URL
    const { status } = req.body;            // new status from body

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Purchase Order ID is required",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    // Update status only
    const updated = await PurchaseOrders.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Purchase Order status updated successfully",
      data: updated,
    });

  } catch (error) {
    console.error("updatePurchaseOrderStatus Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



/**
 * Delete Purchase Order (soft delete)
 */
export const deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    await PurchaseOrders.findByIdAndDelete(id);
    res.json({ success: true, message: "Purchase Order deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get All Purchase Orders with pagination, search, filter, sorting
 */
// export const getAllPurchaseOrders = async (req, res) => {
//   try {
//     let { page = 1, limit = 10, search = "", sortBy = "createdAt", sortOrder = "desc", status } = req.query;
//     page = parseInt(page);
//     limit = parseInt(limit);

//     const filter = { isDeleted: false };
//     if (search) {
//       filter.poNumber = { $regex: search, $options: "i" };
//     }
//     if (status) {
//       filter.status = status;
//     }

//     const total = await PurchaseOrders.countDocuments(filter);
//     const purchaseOrders = await PurchaseOrders.find(filter)
//       .populate("supplier")
//       .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
//       .skip((page - 1) * limit)
//       .limit(limit);

//     res.json({ success: true, data: purchaseOrders, total, page, limit });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

export const getAllPurchaseOrders = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "", sortBy = "createdAt", sortOrder = "desc" } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const filter = { isDeleted: false };
    if (search) {
      filter.poNumber = { $regex: search, $options: "i" };
    }
    let rawStatus = req.query.status ?? req.query["status[]"];
    let statusArray = [];

    if (Array.isArray(rawStatus)) {
      // e.g. status[]=Pending&status[]=Partially%20Received
      statusArray = rawStatus.map((s) => s.trim()).filter(Boolean);
    } else if (typeof rawStatus === "string" && rawStatus.trim() !== "") {
      // e.g. status=Pending,Partially%20Received
      statusArray = rawStatus
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    if (statusArray.length > 0) {
      filter.status = { $in: statusArray };
    }

    const total = await PurchaseOrders.countDocuments(filter);

    const purchaseOrders = await PurchaseOrders.find(filter)
      .populate("supplier")
      .populate("workOrderNo") // ✅ WorkOrder populate karo
      .populate({
        path: "items.mpn", // ✅ MPN populate karo
        model: "MPNLibrary", // Adjust model name as per your schema
        select: "MPN" // Select required fields
      })
      .populate({
        path: "items.uom", // ✅ UOM populate karo
        model: "UOM", // Adjust model name as per your schema
        select: "name symbol" // Select required fields
      })
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // ✅ Transform data to include workOrder dates and populated items
    const transformedOrders = purchaseOrders.map(order => {
      const transformedOrder = order.toObject();

      // ✅ WorkOrder se needDate aur commitDate lo
      if (transformedOrder.workOrderNo) {
        transformedOrder.needDate = transformedOrder?.workOrderNo?.needDate || transformedOrder?.needDate;
        transformedOrder.commitDate = transformedOrder?.workOrderNo?.commitDate;
      }

      // ✅ Items ko transform karo with populated data
      if (transformedOrder.items && transformedOrder.items.length > 0) {
        transformedOrder.items = transformedOrder.items.map(item => {
          const transformedItem = { ...item };
          transformedItem.needDate = transformedOrder?.workOrderNo?.needDate
          transformedItem.commitDate = transformedOrder?.workOrderNo?.commitDate
          // ✅ MPN data ko properly handle karo
          if (item.mpn && typeof item.mpn === 'object') {
            transformedItem.mpnData = {
              MPN: item.mpn.MPN
            };
          }

          // ✅ UOM data ko properly handle karo
          if (item.uom && typeof item.uom === 'object') {
            transformedItem.uomData = {
              name: item.uom.name,
              symbol: item.uom.symbol
            };
          }

          return transformedItem;
        });
      }

      return transformedOrder;
    });

    res.json({
      success: true,
      data: transformedOrders,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get Purchase Order by ID
 */
export const getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const purchaseOrder = await PurchaseOrders.findById(id)
      .populate("supplier")
      .populate("workOrderNo")
      .populate({
        path: "items.mpn",   // populate each item’s MPN reference
        model: "MPNLibrary",        // make sure this matches your model name
      })
      .populate({
        path: "items.uom",   // populate each item’s UOM reference
        model: "UOM",        // must match your model name
      });
    if (!purchaseOrder) {
      return res.status(404).json({ success: false, error: "Purchase Order not found" });
    }
    res.json({ success: true, data: purchaseOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Send Purchase Order by Email
 */
export const sendPurchaseOrderMail = async (req, res) => {
  let pdfPath;

  try {
    const { id } = req.params;

    console.log('🚀 Generating Purchase Order PDF...');

    const purchaseOrder = await PurchaseOrders.findById(id).populate("supplier");
    if (!purchaseOrder) {
      return res.status(404).json({ success: false, error: "Purchase Order not found" });
    }

    // Generate PDF
    pdfPath = await generatePurchaseOrderPDF(purchaseOrder);
    console.log('✅ PDF generated at:', pdfPath);

    // Update status to "Emailed"
    await PurchaseOrders.findByIdAndUpdate(id, {
      status: "Emailed",
      emailedAt: new Date()
    });

    // Read PDF file and send as response
    const pdfBuffer = fs.readFileSync(pdfPath);

    // Clean up temporary PDF
    if (pdfPath && fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
      console.log('✅ Temporary PDF deleted');
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="PO_${purchaseOrder.poNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF file
    res.send(pdfBuffer);

    console.log(`✅ Status updated to "Emailed" and PDF sent for download - PO: ${purchaseOrder.poNumber}`);

  } catch (error) {
    console.error('❌ Error:', error);

    // Clean up PDF file if exists
    try {
      if (pdfPath && fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    res.status(500).json({
      success: false,
      error: `PDF generation failed: ${error.message}`
    });
  }
};


export const getPurchaseOrdersHistory = async (req, res) => {
  try {
    let { year, month, supplier, status, search = "", page = 1, limit = 10 } = req.query;
    page = Math.max(parseInt(page) || 1, 1);
    limit = Math.max(parseInt(limit) || 10, 1);

    const filter = buildFilter({ year, month, supplier, status });
    if (search) filter.poNumber = { $regex: search, $options: "i" };

    // For header label
    const y = Number(year) || new Date().getUTCFullYear();
    const periodLabel = month
      ? `${y}-${String(Number(month)).padStart(2, "0")}`
      : `${y}`;

    const pipeline = [
      { $match: filter },

      // Join supplier for readable name
      {
        $lookup: {
          from: "suppliers",             // <-- collection name
          localField: "supplier",
          foreignField: "_id",
          as: "supplier",
        },
      },
      { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } },

      // Project needed fields
      {
        $project: {
          _id: 1,
          poNumber: 1,
          poDate: 1,
          status: 1,
          "totals.finalAmount": 1,
          "totals.subTotalAmount": 1,
          "totals.freightAmount": 1,
          "totals.ostTax": 1,
          supplierId: "$supplier._id",
          supplierName: "$supplier.companyName",
        },
      },

      // Group by supplier for the selected period
      {
        $group: {
          _id: { supplierId: "$supplierId", supplierName: "$supplierName" },
          count: { $sum: 1 },
          sumSubTotal: { $sum: "$totals.subTotalAmount" },
          sumFreight: { $sum: "$totals.freightAmount" },
          sumTax: { $sum: "$totals.ostTax" },
          sumFinal: { $sum: "$totals.finalAmount" },
          orders: {
            $push: {
              _id: "$_id",
              poNumber: "$poNumber",
              poDate: "$poDate",
              status: "$status",
              finalAmount: "$totals.finalAmount",
            },
          },
        },
      },

      { $sort: { "_id.supplierName": 1 } },

      // Pagination on groups
      {
        $facet: {
          meta: [{ $count: "totalGroups" }],
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
          ],
        },
      },
    ];

    const result = await PurchaseOrders.aggregate(pipeline);
    const totalGroups = result?.[0]?.meta?.[0]?.totalGroups || 0;

    const groups = (result?.[0]?.data || []).map((g) => ({
      supplier: {
        _id: g?._id?.supplierId,
        companyName: g?._id?.supplierName || "N/A",
      },
      count: g.count || 0,
      totals: {
        sumSubTotal: g.sumSubTotal || 0,
        sumFreight: g.sumFreight || 0,
        sumTax: g.sumTax || 0,
        sumFinal: g.sumFinal || 0,
      },
      // newest first
      orders: (g.orders || [])
        .sort((a, b) => new Date(b.poDate) - new Date(a.poDate))
        .map((o) => ({
          _id: o._id,
          poNumber: o.poNumber,
          poDate: o.poDate,
          status: o.status,
          finalAmount: o.finalAmount,
        })),
    }));

    res.json({
      success: true,
      period: periodLabel,
      data: groups,
      total: totalGroups,
      page,
      limit,
      filtersApplied: { year, month, supplier, status, search },
    });
  } catch (error) {
    console.error("getPurchaseOrdersHistory error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// controllers/purchaseOrderController.js
export const getPurchaseOrdersSummary = async (req, res) => {
  try {
    const { year, month, supplier, status, search = "" } = req.query;
    const filter = buildFilter({ year, month, supplier, status });
    if (search) filter.poNumber = { $regex: search, $options: "i" };

    const summary = await PurchaseOrders.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          sumSubTotal: { $sum: "$totals.subTotalAmount" },
          sumFreight: { $sum: "$totals.freightAmount" },
          sumTax: { $sum: "$totals.ostTax" },
          sumFinal: { $sum: "$totals.finalAmount" },
          // ✅ Added: Count unique suppliers
          uniqueSuppliers: { $addToSet: "$supplier" }
        },
      },
      {
        $project: {
          totalCount: 1,
          sumSubTotal: 1,
          sumFreight: 1,
          sumTax: 1,
          sumFinal: 1,
          activeSuppliersCount: { $size: "$uniqueSuppliers" },
          avgOrderValue: { $divide: ["$sumFinal", "$totalCount"] }
        }
      }
    ]);

    const result = summary?.[0] || {
      totalCount: 0,
      sumSubTotal: 0,
      sumFreight: 0,
      sumTax: 0,
      sumFinal: 0,
      activeSuppliersCount: 0,
      avgOrderValue: 0
    };

    res.json({
      success: true,
      summary: result,
    });
  } catch (error) {
    console.error("getPurchaseOrdersSummary error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPurchaseShortageList = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      manufacturer,
      supplier,
    } = req.query;

    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 10;

    // 1) Sare ON HOLD work orders (flat schema)
    const workOrders = await WorkOrder.find();
    if (!workOrders.length) {
      return res.json({
        status: true,
        statusCode: 200,
        message: "No work orders in on_hold status",
        data: [],
        pagination: {
          currentPage: page,
          totalItems: 0,
          totalPages: 0,
          pageSize: limit,
        },
      });
    }

    // 2) Unique drawingIds from work orders (flat)
    const drawingIdStrs = [
      ...new Set(
        workOrders
          .filter((wo) => wo.drawingId)
          .map((wo) => String(wo.drawingId))
      ),
    ];

    if (!drawingIdStrs.length) {
      return res.json({
        status: true,
        statusCode: 200,
        message: "No drawingIds found",
        data: [],
        pagination: {
          currentPage: page,
          totalItems: 0,
          totalPages: 0,
          pageSize: limit,
        },
      });
    }

    const drawingObjectIds = drawingIdStrs.map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    // 3) CostingItems fetch — only material
    const costingItems = await CostingItems.find({
      drawingId: { $in: drawingObjectIds },
      quoteType: "material",
    }).lean();

    if (!costingItems.length) {
      return res.json({
        status: true,
        statusCode: 200,
        message: "No costing items found",
        data: [],
        pagination: {
          currentPage: page,
          totalItems: 0,
          totalPages: 0,
          pageSize: limit,
        },
      });
    }

    // Map: drawingId → costingItems[]
    const costingByDrawing = new Map();
    for (const ci of costingItems) {
      const key = String(ci.drawingId);
      const arr = costingByDrawing.get(key) || [];
      arr.push(ci);
      costingByDrawing.set(key, arr);
    }

    // 4) MPN usage aggregation (GROUP BY mpnId) – flat WorkOrder
    const mpnUsagePerMpn = new Map();
    const mpnIdStrSet = new Set();

    for (const wo of workOrders) {
      const woNo = wo.workOrderNo || "";
      const drawingId = wo.drawingId;
      if (!drawingId) continue;

      const costingArr = costingByDrawing.get(String(drawingId));
      if (!costingArr || !costingArr.length) continue;

      const woQty = Number(wo.quantity || 1);

      for (const ci of costingArr) {
        const mpnObjId = ci.mpn;
        if (!mpnObjId) continue;

        const mpnIdStr = String(mpnObjId);
        mpnIdStrSet.add(mpnIdStr);

        const qtyPer = Number(ci.quantity || 0);
        const totalNeededForThis = qtyPer * woQty;

        const existing = mpnUsagePerMpn.get(mpnIdStr) || {
          mpnId: mpnIdStr,
          description: ci.description || "",
          manufacturer: ci.manufacturer || "",
          uomId: ci.uom || null,
          suppliers: new Set(),          // supplier IDs
          totalNeeded: 0,
          workOrders: new Set(),         // WO numbers
        };

        existing.totalNeeded += totalNeededForThis;
        if (woNo) existing.workOrders.add(woNo);
        if (ci.supplier) existing.suppliers.add(String(ci.supplier));

        if (ci.description) existing.description = ci.description;
        if (ci.manufacturer) existing.manufacturer = ci.manufacturer;
        if (ci.uom && !existing.uomId) existing.uomId = ci.uom;

        mpnUsagePerMpn.set(mpnIdStr, existing);
      }
    }

    if (!mpnUsagePerMpn.size) {
      return res.json({
        status: true,
        statusCode: 200,
        message: "No MPN usage found",
        data: [],
        pagination: {
          currentPage: page,
          totalItems: 0,
          totalPages: 0,
          pageSize: limit,
        },
      });
    }

    // 5) Unique MPN ObjectIDs
    const mpnObjectIds = [...mpnIdStrSet].map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    // 6) Fetch MPN library records
    const mpnLibDocs = await MPN.find({ _id: { $in: mpnObjectIds } }).lean();
    const mpnLibMap = new Map();
    for (const lib of mpnLibDocs) {
      mpnLibMap.set(String(lib._id), lib);
    }

    // 7) Fetch UOM for all unique uomIds
    const uomIds = [
      ...new Set(
        Array.from(mpnUsagePerMpn.values())
          .map((row) => row.uomId)
          .filter((id) => id)
          .map((id) => String(id))
      ),
    ];

    const uomDocs = await UOM.find({ _id: { $in: uomIds } }).lean();
    const uomMap = new Map();
    for (const u of uomDocs) uomMap.set(String(u._id), u);

    // 8) Fetch Supplier names from Supplier model
    const supplierIdStrs = [
      ...new Set(
        Array.from(mpnUsagePerMpn.values())
          .flatMap((row) => Array.from(row.suppliers || []))
      ),
    ];

    let supplierMap = new Map();
    if (supplierIdStrs.length) {
      const supplierObjectIds = supplierIdStrs.map(
        (id) => new mongoose.Types.ObjectId(id)
      );

      const supplierDocs = await Suppliers.find({
        _id: { $in: supplierObjectIds },
      })
        .select("companyName")
        .lean();

      supplierMap = new Map(
        supplierDocs.map((s) => [String(s._id), s.companyName])
      );
    }

    // 9) Inventory stock
    const inventoryDocs = await Inventory.find({
      mpnId: { $in: mpnObjectIds },
    }).lean();

    const invMap = new Map();
    for (const inv of inventoryDocs) {
      const key = String(inv.mpnId);
      const curr = invMap.get(key) || 0;
      invMap.set(key, curr + Number(inv.balanceQuantity || 0));
    }

    // 10) Build raw list (per MPN)
    let list = Array.from(mpnUsagePerMpn.values()).map((row) => {
      const lib = mpnLibMap.get(row.mpnId);
      const uomDoc = row.uomId ? uomMap.get(String(row.uomId)) : null;

      const currentStock = invMap.get(row.mpnId) || 0;
      const required = row.totalNeeded;
      const shortage = Math.max(0, required - currentStock);

      const mpnName =
        lib?.mpn ||
        lib?.mpnNumber ||
        lib?.MPN ||
        null;

      const manufacturerFinal =
        row.manufacturer || lib?.manufacturer || null;

      // Supplier IDs -> Names
      const supplierIdsArray = Array.from(row.suppliers || []);

      const supplierNamesList = supplierIdsArray
        .map((id) => supplierMap.get(id))
        .filter(Boolean);

      const supplierFinal = supplierNamesList.length
        ? supplierNamesList.join(", ")
        : null;

      return {
        mpnId: row.mpnId,
        mpn: mpnName,
        description: row.description || lib?.description || null,
        manufacturer: manufacturerFinal,
        supplier: supplierFinal,
        supplierId: supplierIdsArray,     // ✅ pure IDs (string)
        uom: uomDoc?.name || null,
        required,
        currentStock,
        shortage,
        requireByWorkOrders: Array.from(row.workOrders || []),
      };
    });

    // 11) Sirf shortage wale MPN (shortage > 0)
    list = list.filter((item) => item.shortage > 0);

    // 12) Filter by manufacturer (name, e.g. "Alpha")
    if (manufacturer) {
      const mLower = manufacturer.toString().toLowerCase();
      list = list.filter(
        (row) =>
          row.manufacturer &&
          row.manufacturer.toLowerCase().includes(mLower)
      );
    }

    // 13) Filter by supplier (ID, e.g. "68f0e9c72f3332e1fa112199")
    if (supplier) {
      const sId = supplier.toString();
      list = list.filter(
        (row) =>
          Array.isArray(row.supplierId) &&
          row.supplierId.includes(sId)
      );
    }

    const totalItems = list.length;
    const totalPages = Math.ceil(totalItems / limit);

    const start = (page - 1) * limit;
    const end = start + limit;
    const pagedData = list.slice(start, end);

    return res.json({
      status: true,
      statusCode: 200,
      message: "Purchase shortage list fetched successfully",
      data: pagedData,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error("getPurchaseShortageList error:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
      data: [],
    });
  }
};


// export const getPurchaseShortageList = async (req, res) => {
//   try {
//     let {
//       page = 1,
//       limit = 10,
//       manufacturer,
//       supplier,
//     } = req.query;

//     page = parseInt(page, 10) || 1;
//     limit = parseInt(limit, 10) || 10;

//     // 1) Sare ON HOLD work orders
//     const workOrders = await WorkOrder.find({ status: "on_hold" }).lean();
//     if (!workOrders.length) {
//       return res.json({
//         status: true,
//         statusCode: 200,
//         message: "No work orders in on_hold status",
//         data: [],
//         pagination: {
//           currentPage: page,
//           totalItems: 0,
//           totalPages: 0,
//           pageSize: limit,
//         },
//       });
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
//       return res.json({
//         status: true,
//         statusCode: 200,
//         message: "No drawingIds found",
//         data: [],
//         pagination: {
//           currentPage: page,
//           totalItems: 0,
//           totalPages: 0,
//           pageSize: limit,
//         },
//       });
//     }

//     const drawingObjectIds = drawingIdStrs.map(
//       (id) => new mongoose.Types.ObjectId(id)
//     );

//     // 3) CostingItems fetch — only material
//     const costingItems = await CostingItems.find({
//       drawingId: { $in: drawingObjectIds },
//       quoteType: "material",
//     }).lean();

//     if (!costingItems.length) {
//       return res.json({
//         status: true,
//         statusCode: 200,
//         message: "No costing items found",
//         data: [],
//         pagination: {
//           currentPage: page,
//           totalItems: 0,
//           totalPages: 0,
//           pageSize: limit,
//         },
//       });
//     }

//     // Map: drawingId → costingItems[]
//     const costingByDrawing = new Map();
//     for (const ci of costingItems) {
//       const key = String(ci.drawingId);
//       const arr = costingByDrawing.get(key) || [];
//       arr.push(ci);
//       costingByDrawing.set(key, arr);
//     }

//     // 4) MPN usage aggregation (GROUP BY mpnId)
//     const mpnUsagePerMpn = new Map();
//     const mpnIdStrSet = new Set();

//     for (const wo of workOrders) {
//       const woNo = wo.workOrderNo || "";
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

//           const existing = mpnUsagePerMpn.get(mpnIdStr) || {
//             mpnId: mpnIdStr,
//             description: ci.description || "",
//             manufacturer: ci.manufacturer || "",
//             uomId: ci.uom || null,
//             suppliers: new Set(),          // supplier IDs
//             totalNeeded: 0,
//             workOrders: new Set(),         // WO numbers
//           };

//           existing.totalNeeded += totalNeededForThis;
//           if (woNo) existing.workOrders.add(woNo);
//           if (ci.supplier) existing.suppliers.add(String(ci.supplier));

//           if (ci.description) existing.description = ci.description;
//           if (ci.manufacturer) existing.manufacturer = ci.manufacturer;
//           if (ci.uom && !existing.uomId) existing.uomId = ci.uom;

//           mpnUsagePerMpn.set(mpnIdStr, existing);
//         }
//       }
//     }

//     if (!mpnUsagePerMpn.size) {
//       return res.json({
//         status: true,
//         statusCode: 200,
//         message: "No MPN usage found",
//         data: [],
//         pagination: {
//           currentPage: page,
//           totalItems: 0,
//           totalPages: 0,
//           pageSize: limit,
//         },
//       });
//     }

//     // 5) Unique MPN ObjectIDs
//     const mpnObjectIds = [...mpnIdStrSet].map(
//       (id) => new mongoose.Types.ObjectId(id)
//     );

//     // 6) Fetch MPN library records
//     const mpnLibDocs = await MPN.find({ _id: { $in: mpnObjectIds } }).lean();
//     const mpnLibMap = new Map();
//     for (const lib of mpnLibDocs) {
//       mpnLibMap.set(String(lib._id), lib);
//     }

//     // 7) Fetch UOM for all unique uomIds
//     const uomIds = [
//       ...new Set(
//         Array.from(mpnUsagePerMpn.values())
//           .map((row) => row.uomId)
//           .filter((id) => id)
//           .map((id) => String(id))
//       ),
//     ];

//     const uomDocs = await UOM.find({ _id: { $in: uomIds } }).lean();
//     const uomMap = new Map();
//     for (const u of uomDocs) uomMap.set(String(u._id), u);

//     // 🆕 8) Fetch Supplier names from Supplier model
//     // Collect all supplier IDs from aggregated map
//     const supplierIdStrs = [
//       ...new Set(
//         Array.from(mpnUsagePerMpn.values())
//           .flatMap((row) => Array.from(row.suppliers || []))
//       ),
//     ];

//     let supplierMap = new Map();
//     if (supplierIdStrs.length) {
//       const supplierObjectIds = supplierIdStrs.map(
//         (id) => new mongoose.Types.ObjectId(id)
//       );

//       const supplierDocs = await Suppliers.find({
//         _id: { $in: supplierObjectIds },
//       })
//         .select("companyName")
//         .lean();

//       supplierMap = new Map(
//         supplierDocs.map((s) => [String(s._id), s.companyName])
//       );
//     }

//     // 9) Inventory stock
//     const inventoryDocs = await Inventory.find({
//       mpnId: { $in: mpnObjectIds },
//     }).lean();

//     const invMap = new Map();
//     for (const inv of inventoryDocs) {
//       const key = String(inv.mpnId);
//       const curr = invMap.get(key) || 0;
//       invMap.set(key, curr + Number(inv.balanceQuantity || 0));
//     }

//     // 10) Build raw list (per MPN)
//     let list = Array.from(mpnUsagePerMpn.values()).map((row) => {
//       const lib = mpnLibMap.get(row.mpnId);
//       const uomDoc = row.uomId ? uomMap.get(String(row.uomId)) : null;

//       const currentStock = invMap.get(row.mpnId) || 0;
//       const required = row.totalNeeded;
//       const shortage = Math.max(0, required - currentStock);

//       const mpnName =
//         lib?.mpn ||
//         lib?.mpnNumber ||
//         lib?.MPN ||
//         null;

//       const manufacturerFinal =
//         row.manufacturer || lib?.manufacturer || null;

//       // 🔁 Supplier IDs -> companyName
//       const supplierIdsArray = Array.from(row.suppliers || []);
//       const supplierNames = supplierIdsArray
//         .map((id) => supplierMap.get(id))
//         .filter(Boolean);
//       // Supplier IDs
//       const supplierIds = supplierIdsArray;

//       // Supplier Names
//       const supplierNamesList = supplierIdsArray
//         .map((id) => supplierMap.get(id))
//         .filter(Boolean);

//       // Single combined name for display
//       const supplierFinal = supplierNamesList.length
//         ? supplierNamesList.join(", ")
//         : null;


//       return {
//         mpnId: row.mpnId,
//         mpn: mpnName,
//         description: row.description || lib?.description || null,
//         manufacturer: manufacturerFinal,
//         supplier: supplierFinal,
//         supplierId: supplierIds,           // ✅ companyName(s), NOT IDs
//         uom: uomDoc?.name || null,
//         required,
//         currentStock,
//         shortage,
//         requireByWorkOrders: Array.from(row.workOrders || []),
//       };
//     });

//     // 11) Sirf shortage wale MPN (shortage > 0)
//     list = list.filter((item) => item.shortage > 0);

//     // 12) Filter by manufacturer / supplier (by name)
//     if (manufacturer) {
//       const mLower = manufacturer.toString().toLowerCase();
//       list = list.filter(
//         (row) =>
//           row.manufacturer &&
//           row.manufacturer.toLowerCase().includes(mLower)
//       );
//     }

//     if (supplier) {
//   const sId = supplier.toString();
//   list = list.filter(
//     (row) =>
//       Array.isArray(row.supplierId) &&
//       row.supplierId.includes(sId)
//   );
// }


//     const totalItems = list.length;
//     const totalPages = Math.ceil(totalItems / limit);

//     const start = (page - 1) * limit;
//     const end = start + limit;
//     const pagedData = list.slice(start, end);

//     return res.json({
//       status: true,
//       statusCode: 200,
//       message: "Purchase shortage list fetched successfully",
//       data: pagedData,
//       pagination: {
//         currentPage: page,
//         pageSize: limit,
//         totalItems,
//         totalPages,
//       },
//     });
//   } catch (error) {
//     console.error("getPurchaseShortageList error:", error);
//     return res.status(500).json({
//       status: false,
//       message: error.message,
//       data: [],
//     });
//   }
// };

export const getLastPurachseOrderNumber = async (req, res) => {
  try {
    // Find last PO by createdAt OR by poNumber (descending)
    const lastPO = await PurchaseOrders.findOne({})
      .sort({ createdAt: -1 }) // or { poNumber: -1 } if numeric sortable
      .lean();

    if (!lastPO) {
      return res.json({
        status: true,
        statusCode: 200,
        message: "No purchase orders found",
        data: null,
      });
    }

    return res.json({
      status: true,
      statusCode: 200,
      message: "Last PO number fetched",
      data: lastPO.poNumber || null,
    });
  } catch (error) {
    console.error("getLastPurachseOrderNumber Error:", error);
    return res.status(500).json({
      status: false,
      statusCode: 500,
      message: error.message || "Internal Server Error",
    });
  }
};


// export const getPurchaseShortageList = async (req, res) => {
//   try {
//     let {
//       page = 1,
//       limit = 10,
//       manufacturer,
//       supplier,
//     } = req.query;

//     page = parseInt(page, 10) || 1;
//     limit = parseInt(limit, 10) || 10;

//     // 1) Sare ON HOLD work orders lao
//     const workOrders = await WorkOrder.find({ status: "on_hold" }).lean();
//     if (!workOrders.length) {
//       return res.json({
//         status: true,
//         statusCode: 200,
//         message: "No work orders in on_hold status",
//         data: [],
//         pagination: {
//           currentPage: page,
//           totalItems: 0,
//           totalPages: 0,
//           pageSize: limit,
//         },
//       });
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
//       return res.json({
//         status: true,
//         statusCode: 200,
//         message: "No drawingIds found",
//         data: [],
//         pagination: {
//           currentPage: page,
//           totalItems: 0,
//           totalPages: 0,
//           pageSize: limit,
//         },
//       });
//     }

//     const drawingObjectIds = drawingIdStrs.map(
//       (id) => new mongoose.Types.ObjectId(id)
//     );

//     // 3) CostingItems fetch — only material
//     const costingItems = await CostingItems.find({
//       drawingId: { $in: drawingObjectIds },
//       quoteType: "material",
//     }).lean();

//     if (!costingItems.length) {
//       return res.json({
//         status: true,
//         statusCode: 200,
//         message: "No costing items found",
//         data: [],
//         pagination: {
//           currentPage: page,
//           totalItems: 0,
//           totalPages: 0,
//           pageSize: limit,
//         },
//       });
//     }

//     // Map: drawingId → costingItems[]
//     const costingByDrawing = new Map();
//     for (const ci of costingItems) {
//       const key = String(ci.drawingId);
//       const arr = costingByDrawing.get(key) || [];
//       arr.push(ci);
//       costingByDrawing.set(key, arr);
//     }

//     // 4) MPN usage aggregation (GROUP BY mpnId)
//     // mpnUsagePerMpn: key = mpnIdStr
//     const mpnUsagePerMpn = new Map();
//     const mpnIdStrSet = new Set();

//     for (const wo of workOrders) {
//       const woNo = wo.workOrderNo || "";
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

//           const existing = mpnUsagePerMpn.get(mpnIdStr) || {
//             mpnId: mpnIdStr,
//             // will refine later with lib fields
//             description: ci.description || "",
//             manufacturer: ci.manufacturer || "",
//             uomId: ci.uom || null,
//             suppliers: new Set(),          // multiple suppliers ho sakte hain
//             totalNeeded: 0,
//             workOrders: new Set(),         // WO list
//           };

//           existing.totalNeeded += totalNeededForThis;
//           if (woNo) existing.workOrders.add(woNo);
//           if (ci.supplier) existing.suppliers.add(String(ci.supplier));

//           // Prefer latest non-empty description/manufacturer from costing
//           if (ci.description) existing.description = ci.description;
//           if (ci.manufacturer) existing.manufacturer = ci.manufacturer;
//           if (ci.uom && !existing.uomId) existing.uomId = ci.uom;

//           mpnUsagePerMpn.set(mpnIdStr, existing);
//         }
//       }
//     }

//     if (!mpnUsagePerMpn.size) {
//       return res.json({
//         status: true,
//         statusCode: 200,
//         message: "No MPN usage found",
//         data: [],
//         pagination: {
//           currentPage: page,
//           totalItems: 0,
//           totalPages: 0,
//           pageSize: limit,
//         },
//       });
//     }

//     // 5) Unique MPN ObjectIDs
//     const mpnObjectIds = [...mpnIdStrSet].map(
//       (id) => new mongoose.Types.ObjectId(id)
//     );

//     // 6) Fetch MPN library records
//     const mpnLibDocs = await MPN.find({ _id: { $in: mpnObjectIds } }).lean();
//     const mpnLibMap = new Map();
//     for (const lib of mpnLibDocs) {
//       mpnLibMap.set(String(lib._id), lib);
//     }

//     // 7) Fetch UOM for all unique uomIds
//     const uomIds = [
//       ...new Set(
//         Array.from(mpnUsagePerMpn.values())
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

//     // 9) Build raw list (per MPN)
//     let list = Array.from(mpnUsagePerMpn.values()).map((row) => {
//       const lib = mpnLibMap.get(row.mpnId);
//       const uomDoc = row.uomId ? uomMap.get(String(row.uomId)) : null;

//       const currentStock = invMap.get(row.mpnId) || 0;
//       const required = row.totalNeeded;
//       const shortage = Math.max(0, required - currentStock);

//       const mpnName =
//         lib?.mpn ||
//         lib?.mpnNumber ||
//         lib?.MPN ||
//         null;

//       const manufacturerFinal =
//         row.manufacturer || lib?.manufacturer || null;

//       const suppliersArray = Array.from(row.suppliers || []);
//       const supplierFinal = suppliersArray.length
//         ? suppliersArray.join(", ")
//         : null;

//       return {
//         mpnId: row.mpnId,
//         mpn: mpnName,                          // MPN name
//         description: row.description || lib?.description || null,
//         manufacturer: manufacturerFinal,
//         supplier: supplierFinal,
//         uom: uomDoc?.name || null,
//         required,                              // total needed
//         currentStock,
//         shortage,
//         requireByWorkOrders: Array.from(row.workOrders || []),
//       };
//     });

//     // 10) Sirf shortage wale MPN (shortage > 0)
//     list = list.filter((item) => item.shortage > 0);

//     // 11) Filter by manufacturer / supplier if given
//     if (manufacturer) {
//       const mLower = manufacturer.toString().toLowerCase();
//       list = list.filter(
//         (row) =>
//           row.manufacturer &&
//           row.manufacturer.toLowerCase().includes(mLower)
//       );
//     }

//     if (supplier) {
//       const sLower = supplier.toString().toLowerCase();
//       list = list.filter(
//         (row) =>
//           row.supplier &&
//           row.supplier.toLowerCase().includes(sLower)
//       );
//     }

//     const totalItems = list.length;
//     const totalPages = Math.ceil(totalItems / limit);

//     // 12) Pagination slice
//     const start = (page - 1) * limit;
//     const end = start + limit;
//     const pagedData = list.slice(start, end);

//     return res.json({
//       status: true,
//       statusCode: 200,
//       message: "Purchase shortage list fetched successfully",
//       data: pagedData,
//       pagination: {
//         currentPage: page,
//         pageSize: limit,
//         totalItems,
//         totalPages,
//       },
//     });
//   } catch (error) {
//     console.error("getPurchaseShortageList error:", error);
//     return res.status(500).json({
//       status: false,
//       message: error.message,
//       data: [],
//     });
//   }
// };

const formatDate = (d) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";

const safeNumber = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);


const buildPurchaseShortageList = async ({ manufacturer, supplier }) => {
  // 1) Sare ON HOLD work orders
  const workOrders = await WorkOrder.find({ status: "on_hold" }).lean();
  if (!workOrders.length) return [];

  // 2) drawingIds
  const drawingIdStrs = [
    ...new Set(
      workOrders.flatMap((wo) =>
        (wo.items || [])
          .filter((i) => i.drawingId)
          .map((i) => String(i.drawingId))
      )
    ),
  ];
  if (!drawingIdStrs.length) return [];

  const drawingObjectIds = drawingIdStrs.map(
    (id) => new mongoose.Types.ObjectId(id)
  );

  // 3) CostingItems only material
  const costingItems = await CostingItems.find({
    drawingId: { $in: drawingObjectIds },
    quoteType: "material",
  }).lean();
  if (!costingItems.length) return [];

  // drawingId -> costingItems[]
  const costingByDrawing = new Map();
  for (const ci of costingItems) {
    const key = String(ci.drawingId);
    const arr = costingByDrawing.get(key) || [];
    arr.push(ci);
    costingByDrawing.set(key, arr);
  }

  // 4) MPN usage aggregation per MPN
  const mpnUsagePerMpn = new Map();
  const mpnIdStrSet = new Set();

  for (const wo of workOrders) {
    const woNo = wo.workOrderNo || "";
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

        const existing = mpnUsagePerMpn.get(mpnIdStr) || {
          mpnId: mpnIdStr,
          description: ci.description || "",
          manufacturer: ci.manufacturer || "",
          uomId: ci.uom || null,
          suppliers: new Set(), // supplier IDs
          totalNeeded: 0,
          workOrders: new Set(),
        };

        existing.totalNeeded += totalNeededForThis;
        if (woNo) existing.workOrders.add(woNo);
        if (ci.supplier) existing.suppliers.add(String(ci.supplier));

        if (ci.description) existing.description = ci.description;
        if (ci.manufacturer) existing.manufacturer = ci.manufacturer;
        if (ci.uom && !existing.uomId) existing.uomId = ci.uom;

        mpnUsagePerMpn.set(mpnIdStr, existing);
      }
    }
  }

  if (!mpnUsagePerMpn.size) return [];

  const mpnObjectIds = [...mpnIdStrSet].map(
    (id) => new mongoose.Types.ObjectId(id)
  );

  // 5) MPN library
  const mpnLibDocs = await MPN.find({ _id: { $in: mpnObjectIds } }).lean();
  const mpnLibMap = new Map();
  for (const lib of mpnLibDocs) {
    mpnLibMap.set(String(lib._id), lib);
  }

  // 6) UOM
  const uomIds = [
    ...new Set(
      Array.from(mpnUsagePerMpn.values())
        .map((row) => row.uomId)
        .filter((id) => id)
        .map((id) => String(id))
    ),
  ];
  const uomDocs = await UOM.find({ _id: { $in: uomIds } }).lean();
  const uomMap = new Map();
  for (const u of uomDocs) uomMap.set(String(u._id), u);

  // 7) Suppliers
  const supplierIdStrs = [
    ...new Set(
      Array.from(mpnUsagePerMpn.values()).flatMap((row) =>
        Array.from(row.suppliers || [])
      )
    ),
  ];
  let supplierMap = new Map();
  if (supplierIdStrs.length) {
    const supplierObjectIds = supplierIdStrs.map(
      (id) => new mongoose.Types.ObjectId(id)
    );
    const supplierDocs = await Suppliers.find({
      _id: { $in: supplierObjectIds },
    })
      .select("companyName")
      .lean();

    supplierMap = new Map(
      supplierDocs.map((s) => [String(s._id), s.companyName])
    );
  }

  // 8) Inventory
  const inventoryDocs = await Inventory.find({
    mpnId: { $in: mpnObjectIds },
  }).lean();
  const invMap = new Map();
  for (const inv of inventoryDocs) {
    const key = String(inv.mpnId);
    const curr = invMap.get(key) || 0;
    invMap.set(key, curr + Number(inv.balanceQuantity || 0));
  }

  // 9) Build list
  let list = Array.from(mpnUsagePerMpn.values()).map((row) => {
    const lib = mpnLibMap.get(row.mpnId);
    const uomDoc = row.uomId ? uomMap.get(String(row.uomId)) : null;

    const currentStock = invMap.get(row.mpnId) || 0;
    const required = row.totalNeeded;
    const shortage = Math.max(0, required - currentStock);

    const mpnName =
      lib?.mpn || lib?.mpnNumber || lib?.MPN || null;

    const manufacturerFinal =
      row.manufacturer || lib?.manufacturer || null;

    const supplierIdsArray = Array.from(row.suppliers || []);
    const supplierNames = supplierIdsArray
      .map((id) => supplierMap.get(id))
      .filter(Boolean);

    const supplierFinal = supplierNames.length
      ? supplierNames.join(", ")
      : null;

    return {
      mpnId: row.mpnId,
      mpn: mpnName,
      description: row.description || lib?.description || null,
      manufacturer: manufacturerFinal,
      supplier: supplierFinal,
      supplierId: supplierIdsArray, // IDs bhi
      uom: uomDoc?.name || null,
      required,
      currentStock,
      shortage,
      requireByWorkOrders: Array.from(row.workOrders || []),
    };
  });

  // sirf shortage > 0
  list = list.filter((i) => i.shortage > 0);

  // filter by manufacturer (name)
  if (manufacturer) {
    const mLower = manufacturer.toString().toLowerCase();
    list = list.filter(
      (row) =>
        row.manufacturer &&
        row.manufacturer.toLowerCase().includes(mLower)
    );
  }

  // filter by supplier (name)
  if (supplier) {
    const sLower = supplier.toString().toLowerCase();
    list = list.filter(
      (row) =>
        row.supplier &&
        row.supplier.toLowerCase().includes(sLower)
    );
  }

  return list;
};



export const exportExcel = async (req, res) => {
  try {
    let {
      type = "opening_order",
      manufacturer,
      supplier,
    } = req.query;

    type = String(type).toLowerCase();

    let rows = [];
    let sheetName = "Data";

    // ---------- 1) OPENING ORDERS ----------
    if (type === "opening_order" || type === "opening_orders") {
      const pos = await PurchaseOrders.find({ status: "Pending" })
        .populate("supplier", "companyName")
        .populate("workOrderNo", "workOrderNo")
        .lean();

      sheetName = "OpeningOrders";

      rows = pos.map((po, idx) => ({
        "S No": idx + 1,
        "PO Number": po.poNumber || "",
        "Supplier": po.supplier?.companyName || "",
        "PO Date": formatDate(po.poDate),
        "Need Date": formatDate(po.needDate),
        "Work Order No": po.workOrderNo?.workOrderNo || po.workOrderNo || "",
        Status: po.status || "",
        "Final Amount": safeNumber(po?.totals?.finalAmount),
      }));
    }

    // ---------- 2) CLOSED ORDERS ----------
    else if (
      type === "close_order" ||
      type === "closed_order" ||
      type === "closed_orders"
    ) {
      const pos = await PurchaseOrders.find({ status: "Closed" })
        .populate("supplier", "companyName")
        .populate("workOrderNo", "workOrderNo")
        .lean();

      sheetName = "ClosedOrders";

      rows = pos.map((po, idx) => ({
        "S No": idx + 1,
        "PO Number": po.poNumber || "",
        "Supplier": po.supplier?.companyName || "",
        "PO Date": formatDate(po.poDate),
        "Need Date": formatDate(po.needDate),
        "Work Order No": po.workOrderNo?.workOrderNo || po.workOrderNo || "",
        Status: po.status || "",
        "Final Amount": safeNumber(po?.totals?.finalAmount),
      }));
    }

    // ---------- 3) PARTIAL COMPLETE (status = 'Partial' / 'PartiallyReceived') ----------
    else if (
      type === "partial_complete" ||
      type === "partial_completion"
    ) {
      // Yaha tum apne actual status ka string daal sakte ho
      const pos = await PurchaseOrders.find({ status: "Partial" })
        .populate("supplier", "companyName")
        .populate("workOrderNo", "workOrderNo")
        .lean();

      sheetName = "PartialCompletion";

      rows = pos.map((po, idx) => ({
        "S No": idx + 1,
        "PO Number": po.poNumber || "",
        "Supplier": po.supplier?.companyName || "",
        "PO Date": formatDate(po.poDate),
        "Need Date": formatDate(po.needDate),
        "Work Order No": po.workOrderNo?.workOrderNo || po.workOrderNo || "",
        Status: po.status || "",
        "Final Amount": safeNumber(po?.totals?.finalAmount),
        // Agar tum quantity wise columns rakhte ho (ordered / received / pending) to yaha add kar sakte ho
      }));
    }

    // ---------- 4) MPN SHORTAGE ----------
    else if (type === "mpn_shortage") {
      sheetName = "MpnShortage";

      const list = await buildPurchaseShortageList({
        manufacturer,
        supplier,
      });

      rows = list.map((item, idx) => ({
        "S No": idx + 1,
        "MPN": item.mpn || "",
        "Description": item.description || "",
        "Manufacturer": item.manufacturer || "",
        "Supplier": item.supplier || "",
        "Supplier IDs": (item.supplierId || []).join(", "),
        "UOM": item.uom || "",
        "Required Qty": safeNumber(item.required),
        "Current Stock": safeNumber(item.currentStock),
        "Shortage Qty": safeNumber(item.shortage),
        "Required By Work Orders": (item.requireByWorkOrders || []).join(", "),
      }));
    }

    // ---------- Unknown type ----------
    else {
      return res.status(400).json({
        status: false,
        message:
          "Invalid export type. Use opening_order, close_order, partial_complete, or mpn_shortage",
      });
    }

    if (!rows.length) {
      return res.status(200).json({
        status: true,
        message: "No data found for export",
        data: [],
      });
    }

    // ---------- Build Excel ----------
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buffer = XLSX.write(wb, {
      bookType: "xlsx",
      type: "buffer",
    });

    const today = new Date().toISOString().slice(0, 10);
    const fileName = `${type}_${today}.xlsx`;

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    return res.send(buffer);
  } catch (error) {
    console.error("exportExcel error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Failed to export excel",
    });
  }
};

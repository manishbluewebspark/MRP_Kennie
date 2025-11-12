import nodemailer from "nodemailer";
import PurchaseOrders from "../models/PurchaseOrders.js";
import mongoose from "mongoose";

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
      const idNumber     = (raw.idNumber || "").trim();
      const description  = (raw.description || "").trim();
      const mpn          = raw.mpn;           // expected ObjectId string
      const uom          = raw.uom;           // expected ObjectId string
      const manufacturer = (raw.manufacturer || "").trim();

      const qty        = num(raw.qty, 0);
      const unitPrice  = num(raw.unitPrice, 0);
      const discount   = num(raw.discount ?? raw.discPercentage, 0); // accept either name
      // extPrice = qty * unitPrice * (1 - discount/100)
      const extPrice   = +(qty * unitPrice * (1 - discount / 100));

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
    const ostTax      = +(subTotal * 0.09); // 9% OST
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
export const getAllPurchaseOrders = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "", sortBy = "createdAt", sortOrder = "desc", status } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const filter = { isDeleted: false };
    if (search) {
      filter.poNumber = { $regex: search, $options: "i" };
    }
    if (status) {
      filter.status = status;
    }

    const total = await PurchaseOrders.countDocuments(filter);
    const purchaseOrders = await PurchaseOrders.find(filter)
      .populate("supplier")
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ success: true, data: purchaseOrders, total, page, limit });
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
  try {
    const { id } = req.params;
    const { toEmail, subject, messageBody } = req.body;

    const purchaseOrder = await PurchaseOrders.findById(id).populate("supplier");
    if (!purchaseOrder) {
      return res.status(404).json({ success: false, error: "Purchase Order not found" });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"PO System" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: subject || `Purchase Order ${purchaseOrder.poNumber}`,
      html: messageBody || `<h3>Purchase Order ${purchaseOrder.poNumber}</h3>
        <p>Supplier: ${purchaseOrder.supplier.companyName}</p>
        <p>PO Date: ${purchaseOrder.poDate}</p>
        <p>Total Amount: ${purchaseOrder.totals.finalAmount}</p>`,
    });

    res.json({ success: true, message: "Purchase Order sent via email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
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
          _id:1,
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
          sumFreight:  { $sum: "$totals.freightAmount" },
          sumTax:      { $sum: "$totals.ostTax" },
          sumFinal:    { $sum: "$totals.finalAmount" },
          orders: {
            $push: {
              _id:"$_id",
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
        sumFreight:  g.sumFreight  || 0,
        sumTax:      g.sumTax      || 0,
        sumFinal:    g.sumFinal    || 0,
      },
      // newest first
      orders: (g.orders || [])
        .sort((a, b) => new Date(b.poDate) - new Date(a.poDate))
        .map((o) => ({
          _id:o._id,
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


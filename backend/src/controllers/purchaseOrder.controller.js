import nodemailer from "nodemailer";
import PurchaseOrders from "../models/PurchaseOrders.js";

/**
 * Add Purchase Order
 */
export const addPurchaseOrder = async (req, res) => {
  try {
    const data = req.body;

    // Calculate extPrice for items and totals
    let subTotal = 0;
    data.items = data.items.map(item => {
      const extPrice = item.qty * item.unitPrice * (1 - item.discount / 100);
      subTotal += extPrice;
      return { ...item, extPrice };
    });

    const ostTax = +(subTotal * 0.09).toFixed(2);
    const finalAmount = subTotal + (data.totals?.freightAmount || 0) + ostTax;

    const purchaseOrder = await PurchaseOrders.create({
      ...data,
      totals: {
        ...data.totals,
        subTotalAmount: subTotal,
        ostTax,
        finalAmount,
      },
    });

    res.status(201).json({ success: true, data: purchaseOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update Purchase Order
 */
export const updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    let subTotal = 0;
    if (data.items) {
      data.items = data.items.map(item => {
        const extPrice = item.qty * item.unitPrice * (1 - item.discount / 100);
        subTotal += extPrice;
        return { ...item, extPrice };
      });
    }

    const ostTax = +(subTotal * 0.09).toFixed(2);
    const finalAmount = subTotal + (data.totals?.freightAmount || 0) + ostTax;

    const updated = await PurchaseOrders.findByIdAndUpdate(
      id,
      {
        ...data,
        totals: {
          ...data.totals,
          subTotalAmount: subTotal,
          ostTax,
          finalAmount,
        },
      },
      { new: true }
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Delete Purchase Order (soft delete)
 */
export const deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    await PurchaseOrders.findByIdAndUpdate(id, { isDeleted: true });
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
    const purchaseOrder = await PurchaseOrders.findById(id).populate("supplier");
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

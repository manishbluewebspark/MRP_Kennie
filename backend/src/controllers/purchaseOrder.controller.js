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
import { generatePurchaseOrderPDFBuffer } from "../utils/pdf/generatePurchaseOrderPDF.js";
import { sendMailWithAttachment } from "../utils/mailer.js";
import { convertToBaseUOM, convertToMeter } from "../utils/uomController.js";
import User from "../models/User.js";
import { createAlertOnce } from "../services/alertservice.js";
import PurchaseSettings from "../models/PurchaseSettings.js";


const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const toObjectId = (id) =>
  isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : null;

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

    // -------------------- helpers --------------------
    const num = (v, def = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : def;
    };

    const isId = (v) => typeof v === "string" && v.trim().length > 0;

    // -------------------- validation --------------------
    if (!Array.isArray(data.items) || data.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one item is required.",
      });
    }

    if (!isId(data.supplier)) {
      return res.status(400).json({
        success: false,
        error: "Supplier is required.",
      });
    }

    // -------------------- freight --------------------
    const freightAmount =
      data.totals && data.totals.freightAmount !== undefined
        ? num(data.totals.freightAmount, 0)
        : num(data.freightAmount, 0);

    // -------------------- inventory lookup --------------------
    const mpnIds = data.items.map((item) => item.mpn).filter((id) => isId(id));

    const inventories = await Inventory.find({
      mpnId: { $in: mpnIds },
    })
      .populate("mpnId", "moq")
      .lean();

    // inventory map for fast lookup
    const inventoryMap = new Map();

    inventories.forEach((inv) => {
      if (inv.mpnId) {
        inventoryMap.set(inv.mpnId._id.toString(), inv);
      }
    });

    // -------------------- process items --------------------
    let subTotal = 0;
    let requiresSecondLevelApproval = false;

    const items = data.items.map((raw, idx) => {
      const idNumber = (raw.idNumber || "").trim();
      const description = (raw.description || "").trim();
      const mpn = raw.mpn;
      const uom = raw.uom;
      const manufacturer = (raw.manufacturer || "").trim();

      const qty = num(raw.qty, 0);
      const unitPrice = num(raw.unitPrice, 0);
      const discount = num(raw.discount ?? raw.discPercentage, 0);

      const extPrice = +(qty * unitPrice * (1 - discount / 100));

      // required field validation
      if (!idNumber || !description || !isId(mpn) || !isId(uom) || qty <= 0) {
        throw new Error(
          `Invalid item at index ${idx}. Required: idNumber, description, mpn(ObjectId), uom(ObjectId), qty>0`
        );
      }

      // -------------------- inventory check --------------------
      // const inventory = inventoryMap.get(mpn);

      // if (inventory) {
      //   const balanceQuantity = num(inventory.balanceQuantity);
      //   const incomingQuantity = num(inventory.incomingQuantity);

      //   const allowedQty = balanceQuantity + incomingQuantity;

      //   if (qty > allowedQty) {
      //     requiresSecondLevelApproval = true;
      //   }
      // }

      subTotal += extPrice;

      return {
        idNumber,
        description,
        mpn,
        manufacturer,
        uom,
        qty,
        unitPrice,
        discount,
        extPrice,
      };
    });


    // -------------------- totals --------------------

    const finalAmount = +(subTotal + freightAmount + data.ostTax);

    console.log('------finalAmount', finalAmount)



    // if (finalAmount > APPROVAL_LIMIT) {

    //   requiresSecondLevelApproval = true;
    // }
    const purchaseSetting = await PurchaseSettings.findOne().lean();

    const APPROVAL_LIMIT = Number(
      purchaseSetting?.secondLevelApprovalAmountLimit || 5000
    );

    if (data?.totals?.finalAmount > APPROVAL_LIMIT) {

      requiresSecondLevelApproval = true;

      // =========================================
      // FIND USERS WITH APPROVAL PERMISSION
      // =========================================

      const approvalUsers = await User.find({
        permissions: {
          $in: [
            "purchase.purchase_order_approval:edit_delete_add"
          ]
        }
      }).select("_id name email");

      // =========================================
      // CREATE ALERTS
      // =========================================

      for (const user of approvalUsers) {

        await createAlertOnce({

          title: "Second Level of Approval",

          message:
            `Total Purchase Amount is more than ${APPROVAL_LIMIT}. ` +
            `Approval by ${user.name} is required before proceeding further.`,

          priority: "critical",

          module: "purchase_order",

          relatedId: user._id,

          assignedTo: user._id,
        });
      }
    }

    const totals = {
      subTotalAmount: data?.totals?.subTotalAmount,
      ostTax: data?.totals?.ostTax,
      finalAmount: data?.totals?.finalAmount,
      freightAmount: data?.totals?.freightAmount,
      totalDiscount:data?.totals?.totalDiscount,
    };

    // -------------------- create purchase order --------------------
    const purchaseOrder = await PurchaseOrders.create({
      poNumber: data.poNumber,
      poDate: data.poDate,
      referenceNo: data.referenceNo,
      workOrderNo: data.workOrderNo,
      needDate: data.needDate,
      etaDate: data.etaDate,
      taxPercentage:data?.taxPercentage || 0,
      supplier: data.supplier,
      shipToAddress: data.shipToAddress || "",
      termsConditions: data.termsConditions || "",
      freightAmount: data?.totals?.freightAmount,

      requiresSecondLevelApproval,
      status: requiresSecondLevelApproval
        ? "Pending Approval"
        : "Pending",
      items,
      totals,
    });

    return res.status(201).json({
      success: true,
      data: purchaseOrder,
    });
  } catch (error) {
    if (
      error.message &&
      /Invalid item|At least one item|Supplier is required/.test(error.message)
    ) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    console.error("addPurchaseOrder error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Internal Server Error",
    });
  }
};


// export const addPurchaseOrder = async (req, res) => {
//   try {
//     const data = req.body || {};

//     // --- helpers ------------------------------------------------------------
//     const num = (v, def = 0) => {
//       const n = Number(v);
//       return Number.isFinite(n) ? n : def;
//     };
//     const isId = (v) => typeof v === "string" && v.trim().length > 0;

//     // --- basic payload guards ----------------------------------------------
//     if (!Array.isArray(data.items) || data.items.length === 0) {
//       return res.status(400).json({ success: false, error: "At least one item is required." });
//     }
//     if (!isId(data.supplier)) {
//       return res.status(400).json({ success: false, error: "Supplier is required." });
//     }

//     // Some clients send freight at root; some send inside totals.
//     const freightAmount =
//       data.totals && data.totals.freightAmount !== undefined
//         ? num(data.totals.freightAmount, 0)
//         : num(data.freightAmount, 0);

//     // --- normalize + compute line items ------------------------------------
//     let subTotal = 0;

//     const items = data.items.map((raw, idx) => {
//       const idNumber = (raw.idNumber || "").trim();
//       const description = (raw.description || "").trim();
//       const mpn = raw.mpn;           // expected ObjectId string
//       const uom = raw.uom;           // expected ObjectId string
//       const manufacturer = (raw.manufacturer || "").trim();

//       const qty = num(raw.qty, 0);
//       const unitPrice = num(raw.unitPrice, 0);
//       const discount = num(raw.discount ?? raw.discPercentage, 0); // accept either name
//       // extPrice = qty * unitPrice * (1 - discount/100)
//       const extPrice = +(qty * unitPrice * (1 - discount / 100));

//       // validate required line fields as per your schema
//       if (!idNumber || !description || !isId(mpn) || !isId(uom) || qty <= 0) {
//         throw new Error(
//           `Invalid item at index ${idx}. Required: idNumber, description, mpn(ObjectId), uom(ObjectId), qty>0`
//         );
//       }

//       subTotal += extPrice;

//       return {
//         idNumber,
//         description,
//         mpn,
//         manufacturer,
//         uom,
//         qty,
//         unitPrice,
//         discount,    // schema expects "discount"
//         extPrice,    // schema requires number
//       };
//     });

//     // --- compute totals (all NUMBERS) --------------------------------------
//     const ostTax = +(subTotal * 0.09); // 9% OST
//     const finalAmount = +(subTotal + freightAmount + ostTax);

//     // Build clean totals object with numbers only and expected keys
//     const totals = {
//       subTotalAmount: subTotal,
//       ostTax,
//       finalAmount,
//       freightAmount, // keep for reference if your schema stores it here
//     };

//     // --- create PO ----------------------------------------------------------
//     const purchaseOrder = await PurchaseOrders.create({
//       // pass through top-level known fields (sanitize as needed)
//       poNumber: data.poNumber,
//       poDate: data.poDate,
//       referenceNo: data.referenceNo,
//       workOrderNo: data.workOrderNo,
//       needDate: data.needDate,
//       supplier: data.supplier,
//       shipToAddress: data.shipToAddress || "",
//       termsConditions: data.termsConditions || "",
//       freightAmount, // if your schema keeps it at root as well
//       items,
//       totals,
//     });

//     return res.status(201).json({ success: true, data: purchaseOrder });
//   } catch (error) {
//     // ValidationError from our checks
//     if (error.message && /Invalid item|At least one item|Supplier is required/.test(error.message)) {
//       return res.status(400).json({ success: false, error: error.message });
//     }

//     // Mongoose validation or other errors
//     console.error("addPurchaseOrder error:", error);
//     return res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
//   }
// };


/**
 * Update Purchase Order
 */


export const updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body || {};

    if (!id) {
      return res
        .status(400)
        .json({ success: false, error: "Missing purchase order ID" });
    }

    // --------------------------------------------------
    // 1️⃣ SPECIAL CASE: committedDate update
    // --------------------------------------------------

 if (
  !Array.isArray(data.items) &&
  data.idNumber &&
  data.mpn &&
  Object.prototype.hasOwnProperty.call(data, "committedDate")
) {
  const po = await PurchaseOrders.findById(id);

  if (!po) {
    return res.status(404).json({
      success: false,
      error: "Purchase order not found",
    });
  }

  const idx = po.items.findIndex(
    (it) =>
      String(it.idNumber).trim() === String(data.idNumber).trim() &&
      String(it.mpn) === String(data.mpn)
  );

  if (idx === -1) {
    return res.status(404).json({
      success: false,
      error: "PO item not found for given idNumber + mpn",
    });
  }

  po.items[idx].committedDate = data.committedDate
    ? new Date(data.committedDate)
    : null;

  await po.save();

  return res.json({
    success: true,
    message: "Committed date updated successfully",
    data: po,
  });
}

    // --------------------------------------------------
    // 2️⃣ DEFAULT FULL UPDATE FLOW
    // --------------------------------------------------

    const num = (v, def = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : def;
    };

    const isId = (v) => typeof v === "string" && v.trim().length > 0;

    let requiresSecondLevelApproval = false;

    // --------------------------------------------------
    // Inventory lookup
    // --------------------------------------------------

    const mpnIds = (data.items || []).map((i) => i.mpn).filter((id) => isId(id));

    const inventories = await Inventory.find({
      mpnId: { $in: mpnIds },
    }).lean();

    const inventoryMap = new Map();

    inventories.forEach((inv) => {
      inventoryMap.set(String(inv.mpnId), inv);
    });

    // --------------------------------------------------
    // Items processing
    // --------------------------------------------------

    const existingPO = await PurchaseOrders.findById(id);

    if (!existingPO) {
      return res.status(404).json({
        success: false,
        error: "Purchase order not found",
      });
    }

    let subTotal = 0;

    const items = (data.items || []).map((item) => {
      const qty = num(item.qty);
      const unitPrice = num(item.unitPrice);
      const discount = num(item.discount ?? item.discPercentage);

      const extPrice = +(qty * unitPrice * (1 - discount / 100));

      const oldItem = existingPO.items.find(
        (x) =>
          String(x._id) === String(item._id) ||
          String(x.mpn) === String(item.mpn)
      );

      let receivedQtyTotal = Number(oldItem?.receivedQtyTotal || 0);
      let rejectedQtyTotal = Number(oldItem?.rejectedQtyTotal || 0);

      // =========================================
      // PO PARTIALLY RECEIVED CASE
      // =========================================

      if (
        existingPO.status === "Partially Received" &&
        oldItem
      ) {
        const oldQty = Number(oldItem.qty || 0);

        // Qty reduce hui
        if (qty < oldQty) {
          let reduceBy = oldQty - qty;

          // Pehle rejected qty se adjust karo
          if (rejectedQtyTotal > 0) {
            const rejectedReduction = Math.min(
              rejectedQtyTotal,
              reduceBy
            );

            rejectedQtyTotal =
              rejectedQtyTotal - rejectedReduction;

            reduceBy = reduceBy - rejectedReduction;
          }

          // Safety validation
          if (receivedQtyTotal > qty) {
            throw new Error(
              `${item.description || item.mpn
              }: Qty cannot be reduced below already received quantity (${receivedQtyTotal})`
            );
          }
        }
      }

      const pendingQty = Math.max(
        qty - (receivedQtyTotal + rejectedQtyTotal),
        0
      );

      subTotal += extPrice;

      return {
        ...item,
        qty,
        unitPrice,
        discount,
        extPrice,
        receivedQtyTotal,
        rejectedQtyTotal,
        // pendingQty,
      };
    });

    // --------------------------------------------------
    // Totals calculation
    // --------------------------------------------------

    // const freightAmount = num(
    //   data.totals?.freightAmount ?? data.freightAmount
    // );

    // const ostTax = +(subTotal * data?.taxPercentage);

    // const finalAmount = +(subTotal + freightAmount + ostTax);

    const freightAmount = num(
  data.totals?.freightAmount ?? data.freightAmount
);

const subTotals = num(data.totals?.subTotalAmount);

const ostTax = num(data.totals?.ostTax);

const finalAmount = num(data.totals?.finalAmount);

const totalDiscount = num(data.totals?.totalDiscount)

    const purchaseSetting = await PurchaseSettings.findOne().lean();

    const APPROVAL_LIMIT = Number(
      purchaseSetting?.secondLevelApprovalAmountLimit || 5000
    );

    // if (finalAmount > APPROVAL_LIMIT) {
    //   requiresSecondLevelApproval = true;
    // }

    if (finalAmount > APPROVAL_LIMIT) {

      requiresSecondLevelApproval = true;

      // =========================================
      // FIND USERS WITH APPROVAL PERMISSION
      // =========================================

      const approvalUsers = await User.find({
        permissions: {
          $in: [
            "purchase.purchase_order_approval:edit_delete_add"
          ]
        }
      }).select("_id name email");

      // =========================================
      // CREATE ALERTS
      // =========================================

      for (const user of approvalUsers) {

        await createAlertOnce({

          title: "Second Level of Approval",

          message:
            `Total Purchase Amount is more than ${APPROVAL_LIMIT}. ` +
            `Approval by ${user.name} is required before proceeding further.`,

          priority: "critical",

          module: "purchase_order",

          relatedId: user._id,

          assignedTo: user._id,
        });
      }
    }
    // --------------------------------------------------
    // Update purchase order
    // --------------------------------------------------


    let poStatus = existingPO.status;

    // Sirf approval case me status change karo
    if (requiresSecondLevelApproval) {
      poStatus = "Pending Approval";
    }

    // Partially Received ko preserve rakho
    if (existingPO.status === "Partially Received") {
      poStatus = "Partially Received";
    }

    // Closed ko preserve rakho
    if (existingPO.status === "Closed") {
      poStatus = "Closed";
    }


    const updated = await PurchaseOrders.findByIdAndUpdate(
      id,
      {
        ...data,
        requiresSecondLevelApproval,
        status: poStatus,
        items,
        totals: {
          freightAmount,
          subTotalAmount: subTotals,
          ostTax,
          finalAmount,
          totalDiscount
        },
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, error: "Purchase order not found" });
    }

    return res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("❌ updatePurchaseOrder error:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};


export const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

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

    const purchaseOrder = await PurchaseOrders.findById(id);

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    // Closed -> Pending
    if (
      purchaseOrder.status === "Closed" &&
      status === "Pending"
    ) {
      purchaseOrder.items = purchaseOrder.items.map((item) => ({
        ...item.toObject(),

        receivedQtyTotal: 0,
        rejectedQtyTotal: 0,
        pendingQty: 0,

        receivedQty: 0,
        rejectedQty: 0,
        acceptedQty: 0,
        shortQty: 0,

        remarks: "",
        status: "Pending",
      }));
    }

    purchaseOrder.status = status;

    await purchaseOrder.save();

    return res.status(200).json({
      success: true,
      message: "Purchase Order status updated successfully",
      data: purchaseOrder,
    });
  } catch (error) {
    console.error("updatePurchaseOrderStatus Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// export const updatePurchaseOrder = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const data = req.body || {};

//     if (!id) {
//       return res
//         .status(400)
//         .json({ success: false, error: "Missing purchase order ID" });
//     }

//     // 1️⃣ SPECIAL CASE:
//     // Agar sirf ek item ka committedDate update aaya hai
//     // payload: { idNumber, mpn, committedDate }
//     if (
//       !Array.isArray(data.items) &&               // full items update nahi hai
//       data.idNumber &&
//       data.mpn &&
//       data.committedDate
//     ) {
//       const po = await PurchaseOrders.findById(id);
//       if (!po) {
//         return res
//           .status(404)
//           .json({ success: false, error: "Purchase order not found" });
//       }

//       // Item find by idNumber + mpn
//       const idx = po.items.findIndex(
//         (it) =>
//           String(it.idNumber) === String(data.idNumber) &&
//           String(it.mpn) === String(data.mpn)
//       );

//       if (idx === -1) {
//         return res.status(404).json({
//           success: false,
//           error: "PO item not found for given idNumber + mpn",
//         });
//       }

//       // ✅ committedDate update
//       po.items[idx].committedDate = new Date(data.committedDate);

//       // Agar status / koi aur field bhi aai ho to optionally update kar sakte ho:
//       if (data.status) {
//         po.status = data.status;
//       }

//       await po.save();

//       return res.json({
//         success: true,
//         message: "Committed date updated successfully",
//         data: po,
//       });
//     }

//     // 2️⃣ DEFAULT FLOW (tumhara existing full PO update) – YE WAISA HI RHEGA

//     // helper to force numeric values
//     const num = (v, def = 0) => {
//       const n = Number(v);
//       return Number.isFinite(n) ? n : def;
//     };

//     // compute extPrice for each item and subtotal
//     let subTotal = 0;
//     const items = (data.items || []).map((item) => {
//       const qty = num(item.qty);
//       const unitPrice = num(item.unitPrice);
//       const discount = num(item.discount ?? item.discPercentage);

//       const extPrice = +(qty * unitPrice * (1 - discount / 100));

//       // accumulate subtotal
//       subTotal += extPrice;

//       return {
//         ...item,
//         qty,
//         unitPrice,
//         discount,
//         extPrice,
//       };
//     });

//     // compute totals
//     const freightAmount = num(
//       data.totals?.freightAmount ?? data.freightAmount
//     );
//     const ostTax = +(subTotal * 0.09);
//     const finalAmount = +(subTotal + freightAmount + ostTax);

//     // perform update
//     const updated = await PurchaseOrders.findByIdAndUpdate(
//       id,
//       {
//         ...data,
//         items,
//         totals: {
//           freightAmount,
//           subTotalAmount: subTotal,
//           ostTax,
//           finalAmount,
//         },
//       },
//       { new: true, runValidators: true }
//     );

//     if (!updated) {
//       return res
//         .status(404)
//         .json({ success: false, error: "Purchase order not found" });
//     }

//     res.json({ success: true, data: updated });
//   } catch (error) {
//     console.error("❌ updatePurchaseOrder error:", error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

// export const updatePurchaseOrder = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const data = req.body || {};

//     if (!id) {
//       return res.status(400).json({ success: false, error: "Missing purchase order ID" });
//     }

//     // helper to force numeric values
//     const num = (v, def = 0) => {
//       const n = Number(v);
//       return Number.isFinite(n) ? n : def;
//     };

//     // compute extPrice for each item and subtotal
//     let subTotal = 0;
//     const items = (data.items || []).map((item, i) => {
//       const qty = num(item.qty);
//       const unitPrice = num(item.unitPrice);
//       const discount = num(item.discount ?? item.discPercentage);

//       const extPrice = +(qty * unitPrice * (1 - discount / 100));

//       // accumulate subtotal
//       subTotal += extPrice;

//       return {
//         ...item,
//         qty,
//         unitPrice,
//         discount,
//         extPrice,
//       };
//     });

//     // compute totals
//     const freightAmount = num(data.totals?.freightAmount ?? data.freightAmount);
//     const ostTax = +(subTotal * 0.09);
//     const finalAmount = +(subTotal + freightAmount + ostTax);

//     // perform update
//     const updated = await PurchaseOrders.findByIdAndUpdate(
//       id,
//       {
//         ...data,
//         items,
//         totals: {
//           freightAmount,
//           subTotalAmount: subTotal,
//           ostTax,
//           finalAmount,
//         },
//       },
//       { new: true, runValidators: true }
//     );

//     if (!updated) {
//       return res.status(404).json({ success: false, error: "Purchase order not found" });
//     }

//     res.json({ success: true, data: updated });
//   } catch (error) {
//     console.error("❌ updatePurchaseOrder error:", error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

// export const updatePurchaseOrderStatus = async (req, res) => {
//   try {
//     const { id } = req.params;              // PO ID from URL
//     const { status } = req.body;            // new status from body

//     if (!id) {
//       return res.status(400).json({
//         success: false,
//         message: "Purchase Order ID is required",
//       });
//     }

//     if (!status) {
//       return res.status(400).json({
//         success: false,
//         message: "Status is required",
//       });
//     }

//     // Update status only
//     const updated = await PurchaseOrders.findByIdAndUpdate(
//       id,
//       { status },
//       { new: true, runValidators: true }
//     );

//     if (!updated) {
//       return res.status(404).json({
//         success: false,
//         message: "Purchase Order not found",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Purchase Order status updated successfully",
//       data: updated,
//     });

//   } catch (error) {
//     console.error("updatePurchaseOrderStatus Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };



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
      .populate({
        path: "supplier",
        populate: {
          path: "currency",
          select: "code"   // 👈 sirf currency code
        }
      })
   .populate({
  path: "workOrderNo",
  select: "workOrderNo poNumber projectNo"
})
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

      const purchaseOrder = await PurchaseOrders.findById(id)
     .populate({
    path: "supplier",
    populate: {
      path: "currency",
      select: "code"
    }
  })
      .populate({
        path: "items.uom",
        select: "name code",
      })
      .populate({
        path: "items.mpn",
        select: "MPN Description",
      })
      .lean();
    console.log('--------purchaseOrder', purchaseOrder)

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    const receiverEmail = purchaseOrder?.supplier?.email;

    if (!receiverEmail) {
      return res.status(400).json({
        success: false,
        message: "Supplier email not found",
      });
    }

    const isPartialReceived =
      purchaseOrder.status === "Partially Received";

    const pdfBuffer =
      await generatePurchaseOrderPDFBuffer(purchaseOrder);

    const ackUrl =
      `${process.env.BACKEND_API_URL}/purchase-orders/accept/ack/${purchaseOrder._id}`;

    let subject = "";
    let html = "";

    // =====================================================
    // PARTIAL RECEIVED MAIL
    // =====================================================

    if (isPartialReceived) {
      const rejectedItems = purchaseOrder.items.filter(
        (item) => Number(item?.receivedQtyTotal || 0) > 0
      );

      console.log('----rejectedItems', rejectedItems)

      subject = `Rejected Material / Replacement Required - ${purchaseOrder.poNumber}`;

      html = `
      <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;">
        
        <p>
          Hello ${purchaseOrder?.supplier?.name || "Team"},
        </p>

        <p>
          We would like to inform you that this Purchase Order <b>${purchaseOrder.poNumber}</b> is being revised accordingly as per discussed.
        </p>

       

        

        

        <p style="margin-top:20px;">
          Kindly arrange replacement for the rejected quantity
          and share the expected delivery date.
        </p>

        <div style="margin:20px 0;text-align:center;">
          <a
            href="${ackUrl}"
            style="
              display:inline-block;
              padding:12px 28px;
              background:#16a34a;
              color:#fff;
              text-decoration:none;
              border-radius:6px;
              font-weight:bold;
            "
          >
            ✔ Acknowledge Purchase Order
          </a>
        </div>

        <p>
          Regards,<br/>
          <b>Exxel Technology Pte Ltd</b>
        </p>
      </div>
      `;
    }

    // =====================================================
    // NORMAL PO MAIL
    // =====================================================

    else {
      subject = `Purchase Order - ${purchaseOrder.poNumber}`;

      html = `
      <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color:#111; line-height:1.6;">

        <p>
          Hello ${purchaseOrder?.supplier?.name || "Team"},
        </p>

        <p>
          Please find attached
          <b>Purchase Order ${purchaseOrder?.poNumber || ""}</b>
          ${purchaseOrder?.poDate
          ? `dated <b>${new Date(
            purchaseOrder.poDate
          ).toLocaleDateString("en-GB")}</b>`
          : ""
        }.
        </p>

        <div
          style="
            margin:14px 0;
            padding:12px;
            background:#f6faff;
            border:1px solid #d6e4ff;
            border-radius:8px;
          "
        >
          <div>
            <div>
              <b>PO No:</b> ${purchaseOrder?.poNumber || "-"}
            </div>

            ${purchaseOrder?.referenceNo
          ? `<div><b>Reference No:</b> ${purchaseOrder.referenceNo}</div>`
          : ""
        }

            ${purchaseOrder?.needDate
          ? `<div><b>Need Date:</b> ${new Date(
            purchaseOrder.needDate
          ).toLocaleDateString("en-GB")}</div>`
          : ""
        }
          </div>
        </div>

        <p>
          Kindly acknowledge receipt and share the
          <b>committed delivery date</b>.
        </p>

        <div style="margin:20px 0;text-align:center;">
          <a
            href="${ackUrl}"
            style="
              display:inline-block;
              padding:12px 28px;
              background:#16a34a;
              color:#fff;
              text-decoration:none;
              border-radius:6px;
              font-weight:bold;
            "
          >
            ✔ Acknowledge Purchase Order
          </a>
        </div>

        <p>
          Regards,<br/>
          <b>Exxel Technology Pte Ltd</b>
        </p>

      </div>
      `;
    }

    const mailOptions = {
      to: receiverEmail,
      subject,
      html,
    };

    if (!isPartialReceived) {
      mailOptions.attachments = [
        {
          filename: `PO_${purchaseOrder.poNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ];
    }

    await sendMailWithAttachment(mailOptions);

    // =====================================================
    // STATUS UPDATE
    // =====================================================

    if (!isPartialReceived) {
      await PurchaseOrders.findByIdAndUpdate(id, {
        status: "Emailed",
        emailedAt: new Date(),
      });
    }

    return res.json({
      success: true,
      message: `PO emailed successfully to ${receiverEmail}`,
    });
  } catch (error) {
    console.error("❌ sendPurchaseOrderMail error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// export const sendPurchaseOrderMail = async (req, res) => {
//   try {
//     const { id } = req.params;
//     // const { toEmail } = req.body; // optional override

//     const purchaseOrder = await PurchaseOrders.findById(id)
//       .populate("supplier")
//       .populate({
//         path: "items.uom",
//         select: "name code",
//       })
//       .populate({
//         path: "items.mpn",
//         select: "MPN description",
//       })
//       .lean();




//     if (!purchaseOrder) {
//       return res.status(404).json({ success: false, message: "Purchase Order not found" });
//     }


//     const isPartialReceived =
//   purchaseOrder.status === "Partially Received";


//     const receiverEmail = purchaseOrder?.supplier?.email;
//     if (!receiverEmail) {
//       return res.status(400).json({
//         success: false,
//         message: "Supplier email not found. Please send `toEmail` in body.",
//       });
//     }

//     // ✅ Generate PDF buffer (no temp file needed)
//     const pdfBuffer = await generatePurchaseOrderPDFBuffer(purchaseOrder);
//     const ackUrl = `${process.env.BACKEND_API_URL}/purchase-orders/accept/ack/${purchaseOrder._id}`;
//     // ✅ Send Email with attachment
//     await sendMailWithAttachment({
//       to: receiverEmail,
//       subject: `Purchase Order - ${purchaseOrder.poNumber}`,
//       html: `
//   <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color:#111; line-height:1.6;">

//     <p style="margin:0 0 12px;">
//       Hello ${purchaseOrder?.supplier?.name || "Team"},
//     </p>

//     <p style="margin:0 0 12px;">
//       Please find attached <b>Purchase Order ${purchaseOrder?.poNumber || ""}</b>
//       ${purchaseOrder?.poDate ? `dated <b>${new Date(purchaseOrder.poDate).toLocaleDateString("en-GB")}</b>` : ""}.
//     </p>

//     <div style="margin:14px 0 14px; padding:12px; background:#f6faff; border:1px solid #d6e4ff; border-radius:8px;">
//       <div style="font-size:13px; color:#333;">
//         <div><b>PO No:</b> ${purchaseOrder?.poNumber || "-"}</div>
//         ${purchaseOrder?.referenceNo ? `<div><b>Reference No:</b> ${purchaseOrder.referenceNo}</div>` : ""}
//         ${purchaseOrder?.needDate ? `<div><b>Need Date:</b> ${new Date(purchaseOrder.needDate).toLocaleDateString("en-GB")}</div>` : ""}
//         ${purchaseOrder?.shipToAddress ? `<div style="margin-top:8px;"><b>Ship To:</b><br/>${String(purchaseOrder.shipToAddress).replace(/\n/g, "<br/>")}</div>` : ""}
//       </div>
//     </div>

//     <p style="margin:0 0 12px;">
//       Kindly acknowledge receipt and share the <b>committed delivery date</b>.
//       If you have any questions or need clarifications, please reply to this email.
//     </p>

//       <!-- ACK BUTTON -->
//   <div style="margin:20px 0; text-align:center;">
//     <a
//       href="${ackUrl}"
//       style="
//         display:inline-block;
//         padding:12px 28px;
//         background:#16a34a;
//         color:#fff;
//         text-decoration:none;
//         border-radius:6px;
//         font-weight:bold;
//       "
//     >
//       ✔ Acknowledge Purchase Order
//     </a>
//   </div>

//   <p style="font-size:13px; color:#555;">
//     By clicking the button above, you confirm receipt of this Purchase Order.
//   </p>

//     <p style="margin:0;">
//       Regards,<br/>
//       <b>Exxel Technology Pte Ltd</b><br/>
//       ${purchaseOrder?.createdBy?.email ? `<span style="color:#555;">${purchaseOrder.createdBy.email}</span>` : ""}
//     </p>

//     <hr style="border:none; border-top:1px solid #eee; margin:18px 0;" />

//     <p style="margin:0; font-size:12px; color:#777;">
//       This is an auto-generated email. Please do not share confidential information with unintended recipients.
//     </p>
//   </div>
// `,

//       attachments: [
//         {
//           filename: `PO_${purchaseOrder.poNumber}.pdf`,
//           content: pdfBuffer,
//           contentType: "application/pdf",
//         },
//       ],
//     });

//     // ✅ Update PO status
//     await PurchaseOrders.findByIdAndUpdate(id, {
//       status: "Emailed",
//       emailedAt: new Date(),
//     });

//     return res.json({
//       success: true,
//       message: `PO emailed successfully to ${receiverEmail}`
//     });
//   } catch (error) {
//     console.error("❌ sendPurchaseOrderMail error:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };


export const exportPurchaseOrderPDF = async (req, res) => {
  try {
    const { id } = req.params;

    const purchaseOrder = await PurchaseOrders.findById(id)
     .populate({
    path: "supplier",
    populate: {
      path: "currency",
      select: "code"
    }
  })
      .populate({
        path: "items.uom",
        select: "name code",
      })
      .populate({
        path: "items.mpn",
        select: "MPN Description",
      })
      .lean();

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    

    // ✅ Generate PDF buffer
    const pdfBuffer = await generatePurchaseOrderPDFBuffer(purchaseOrder);

    // ✅ Set headers for download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=PO_${purchaseOrder.poNumber}.pdf`
    );

    // ✅ Send buffer
    return res.send(pdfBuffer);

  } catch (error) {
    console.error("❌ exportPurchaseOrderPDF error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
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

    const baseStatuses = ["Partially Received", "Pending", "Emailed", "Completed", "Closed"];

    if (status) {
      // single status filter
      filter.status = status;
    } else {
      // all statuses
      filter.status = { $in: baseStatuses };
    }
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
          updatedAt: 1
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
              updatedAt: "$updatedAt"
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
        // .sort((a, b) => new Date(b.poDate) - new Date(a.poDate))
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
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

    const baseStatuses = ["Partially Received", "Pending", "Emailed", "Completed", "Closed"];

    if (status) {
      // single status filter
      filter.status = status;
    } else {
      // all statuses
      filter.status = { $in: baseStatuses };
    }
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

const buildPickedMap = async () => {
  const workOrders = await WorkOrder.find({
    isDeleted: { $ne: true },
  }).lean();

  const pickedMap = new Map();

  for (const wo of workOrders) {
    const woId = String(wo._id);

    for (const ph of wo.processHistory || []) {
      if (ph.process !== "picking") continue;

      for (const d of ph.details || []) {
        const mpnId = String(d.mpnId || "");
        if (!mpnId) continue;

        const key = `${woId}_${mpnId}`;

        const rawQty = Number(d.pickedQty || 0);
        const fromUOM = d.uom || "M";

        const qtyInMeter = convertToBaseUOM(rawQty, fromUOM, "M");

        pickedMap.set(
          key,
          (pickedMap.get(key) || 0) + qtyInMeter
        );
      }
    }
  }

  return pickedMap;
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

    // =========================================================
    // 1) FETCH WORK ORDERS
    // =========================================================

    const workOrders = await WorkOrder.find({
      isDeleted: { $ne: true },
    }).lean();

    if (!workOrders.length) {
      return res.json({
        status: true,
        statusCode: 200,
        message: "No work orders found",
        data: [],
      });
    }

    // =========================================================
    // 2) UNIQUE DRAWING IDS
    // =========================================================

    const drawingIds = [
      ...new Set(
        workOrders
          .filter((wo) => wo.drawingId)
          .map((wo) => String(wo.drawingId))
      ),
    ];

    const drawingObjectIds = drawingIds
      .filter((id) =>
        mongoose.Types.ObjectId.isValid(id)
      )
      .map(
        (id) =>
          new mongoose.Types.ObjectId(id)
      );

    // =========================================================
    // 3) FETCH COSTING ITEMS
    // =========================================================

    const pickedMap = await buildPickedMap();

    const costingItems =
      await CostingItems.find({
        drawingId: {
          $in: drawingObjectIds,
        },
        quoteType: "material",
      })
        .populate("uom", "code name")
        .populate({
          path: "mpn",
          select:
            "mpn mpnNumber MPN UOM manufacturer description",
          populate: {
            path: "UOM",
            select: "code name",
          },
        })
        .lean();

    if (!costingItems.length) {
      return res.json({
        status: true,
        statusCode: 200,
        message:
          "No costing items found",
        data: [],
      });
    }


    // =========================================================
    // PURCHASE ORDERS (EMAILED)
    // Reduce shortage by already ordered quantity
    // =========================================================

    const emailedPOs = await PurchaseOrders.find({
      status: {
        $in: ["Emailed", "Acknowledged"]
      },
      // isDeleted: { $ne: true },
    })
      .select("items status")
      .lean();

    const poReservedMap = new Map();

    for (const po of emailedPOs) {
      for (const item of po.items || []) {
        if (!item?.mpn) continue;

        const mpnId = String(item.mpn);

        const currentReserved =
          poReservedMap.get(mpnId) || 0;

        poReservedMap.set(
          mpnId,
          currentReserved + Number(item.qty || 0)
        );
      }
    }


    console.log('------poReservedMap', poReservedMap)
    // =========================================================
    // 4) FETCH ALL MPN LIBS
    // =========================================================

    const mpnIds = [
      ...new Set(
        costingItems.map((ci) =>
          String(ci?.mpn?._id || ci?.mpn)
        )
      ),
    ];

    const mpnObjectIds = mpnIds
      .filter((id) =>
        mongoose.Types.ObjectId.isValid(id)
      )
      .map(
        (id) =>
          new mongoose.Types.ObjectId(id)
      );

    const mpnLibDocs = await MPN.find({
      _id: { $in: mpnObjectIds },
    })
      .populate("UOM", "code name")
      .lean();

    const mpnLibMap = new Map(
      mpnLibDocs.map((lib) => [
        String(lib._id),
        lib,
      ])
    );

    // =========================================================
    // 5) FETCH INVENTORY
    // IMPORTANT:
    // Inventory balanceQuantity ALWAYS IN METER
    // =========================================================

    const inventoryDocs =
      await Inventory.find({
        mpnId: { $in: mpnObjectIds },
        isDeleted: { $ne: true },
      }).lean();

    // =========================================================
    // 6) INVENTORY MAP
    // GLOBAL STOCK IN METER
    // =========================================================

    const inventoryMap = new Map();

    for (const inv of inventoryDocs) {
      const key = String(inv.mpnId);

      const current =
        inventoryMap.get(key) || 0;

      // IMPORTANT:
      // balanceQuantity already in METER
      inventoryMap.set(
        key,
        current +
        Number(
          inv.balanceQuantity || 0
        )
      );
    }

    // =========================================================
    // 7) MAP DRAWING => COSTING ITEMS
    // =========================================================

    const costingByDrawing = new Map();

    for (const ci of costingItems) {
      const key = String(ci.drawingId);

      const arr =
        costingByDrawing.get(key) || [];

      arr.push(ci);

      costingByDrawing.set(key, arr);
    }

    // =========================================================
    // 8) BUILD MPN REQUIREMENTS
    // =========================================================

  const mpnUsagePerMpn = new Map();

for (const wo of workOrders) {
  if (!wo.drawingId) continue;

  const costingArr = costingByDrawing.get(String(wo.drawingId));
  if (!costingArr?.length) continue;

  for (const ci of costingArr) {
    if (!ci.mpn) continue;

    const mpnId = String(ci?.mpn?._id || ci.mpn);

    const lib = mpnLibMap.get(mpnId);

    const fromUOM = ci?.uom?.code || ci?.mpn?.UOM?.code || "M";

    const qtyInMeter = convertToBaseUOM(
      Number(ci.quantity || 0),
      fromUOM,
      "M"
    );

    const totalRequired = qtyInMeter * Number(wo.quantity || 0);

const key = `${wo._id}_${mpnId}`;
const pickedQty = Number(pickedMap.get(key) || 0);

    console.log('-------pickedQty',pickedQty)
const remainingRequired = Math.max(totalRequired - pickedQty, 0);

    const existing = mpnUsagePerMpn.get(mpnId) || {
      mpnId,
      mpn: lib?.MPN || lib?.mpn || "",
      description: lib?.description || ci?.description || "",
      manufacturer: lib?.manufacturer || ci?.manufacturer || "",
      suppliers: new Set(),
      totalRequired: 0,
      workOrders: [],
    };

    existing.totalRequired += remainingRequired;

    existing.workOrders.push({
      workOrderId: wo._id,
      workOrderNo: wo.workOrderNo || "",
      needDate: wo.needDate || null,
      requiredQty: remainingRequired,
    });

    mpnUsagePerMpn.set(mpnId, existing);
  }
}

    // =========================================================
    // 9) FETCH SUPPLIERS
    // =========================================================

    const supplierIds = [
      ...new Set(
        Array.from(
          mpnUsagePerMpn.values()
        ).flatMap((row) =>
          Array.from(row.suppliers || [])
        )
      ),
    ];

    let supplierMap = new Map();

    if (supplierIds.length) {
      const supplierDocs =
        await Suppliers.find({
          _id: {
            $in: supplierIds,
          },
        })
          .select("companyName")
          .lean();

      supplierMap = new Map(
        supplierDocs.map((s) => [
          String(s._id),
          s.companyName,
        ])
      );
    }

    // =========================================================
    // 10) FINAL SHORTAGE LIST
    // =========================================================

  let list = [];

for (const row of mpnUsagePerMpn.values()) {
  console.log('------row',row)
  const mpnId = row.mpnId;

  const globalStock = Number(inventoryMap.get(mpnId) || 0);

  const totalRequired = Number(row.totalRequired || 0);

  const reservedPOQty = Number(poReservedMap.get(mpnId) || 0);

  // 🔥 FIXED SHORTAGE LOGIC (same as inventory API)
  const effectiveRequired = totalRequired;

  const finalShortage = Math.max(
    effectiveRequired - globalStock - reservedPOQty,
    0
  );

  if (finalShortage <= 0) continue;

  const lib = mpnLibMap.get(mpnId);
  const displayUOM = lib?.UOM?.code || "M";

  const shortageByWorkOrders = row.workOrders.map((wo) => ({
    ...wo,
    requiredQty: convertToBaseUOM(
      Number(wo.requiredQty || 0),
      "M",
      displayUOM
    ).toFixed(4),
    shortageQty: convertToBaseUOM(
      Math.max(Number(wo.requiredQty || 0), 0),
      "M",
      displayUOM
    ).toFixed(4),
  }));

  list.push({
    mpnId: row.mpnId,
    mpn: row.mpn,
    description: row.description,
    manufacturer: row.manufacturer,

    supplier: "", // same as your response (keep as is if already working)
    supplierId: [],

    uom: displayUOM,

    required: convertToBaseUOM(totalRequired, "M", displayUOM).toFixed(4),
    currentStock: convertToBaseUOM(globalStock, "M", displayUOM).toFixed(4),
    shortage: convertToBaseUOM(finalShortage, "M", displayUOM).toFixed(4),

    shortageByWorkOrders,
  });
}

    // =========================================================
    // 11) FILTER MANUFACTURER
    // =========================================================

    if (manufacturer) {
      const lower =
        manufacturer
          .toString()
          .toLowerCase();

      list = list.filter((x) =>
        x.manufacturer
          ?.toLowerCase()
          ?.includes(lower)
      );
    }

    // =========================================================
    // 12) FILTER SUPPLIER
    // =========================================================

    if (supplier) {
      const lower =
        supplier.toString();

      list = list.filter((x) =>
        x.supplier
          ?.toLowerCase()
          ?.includes(
            lower.toLowerCase()
          )
      );
    }

    // =========================================================
    // 13) SORT BY SHORTAGE DESC
    // =========================================================

    list.sort(
      (a, b) =>
        Number(b.shortage) -
        Number(a.shortage)
    );

    // =========================================================
    // 14) PAGINATION
    // =========================================================

    const totalItems = list.length;

    const totalPages = Math.ceil(
      totalItems / limit
    );

    const startIndex =
      (page - 1) * limit;

    const paginatedData = list.slice(
      startIndex,
      startIndex + limit
    );

    return res.json({
      status: true,

      statusCode: 200,

      message:
        "Purchase shortage list fetched successfully",

      data: paginatedData,

      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error(
      "getPurchaseShortageList error:",
      error
    );

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

//     // 1) All work orders
//     const workOrders = await WorkOrder.find().lean();

//     if (!workOrders.length) {
//       return res.json({
//         status: true,
//         statusCode: 200,
//         message: "No work orders found",
//         data: [],
//         pagination: {
//           currentPage: page,
//           totalItems: 0,
//           totalPages: 0,
//           pageSize: limit,
//         },
//       });
//     }

//     // 2) Unique drawingIds
//     const drawingIdStrs = [
//       ...new Set(
//         workOrders
//           .filter((wo) => wo.drawingId)
//           .map((wo) => String(wo.drawingId))
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

//     const drawingObjectIds = drawingIdStrs
//       .filter((id) => mongoose.Types.ObjectId.isValid(id))
//       .map((id) => new mongoose.Types.ObjectId(id));

//     // 3) Costing items
//     const costingItems = await CostingItems.find({
//       drawingId: { $in: drawingObjectIds },
//       quoteType: "material",
//     })
//       .populate("uom", "code name")
//       .populate({
//         path: "mpn",
//         select: "mpn mpnNumber MPN UOM manufacturer description",
//         populate: {
//           path: "UOM",
//           select: "code name",
//         },
//       })
//       .lean();

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

//     // =========================================================
//     // FETCH ALL MPN LIBS FIRST
//     // =========================================================

//     const mpnIdStrSet = new Set();

//     for (const ci of costingItems) {
//       if (ci?.mpn?._id) {
//         mpnIdStrSet.add(String(ci.mpn._id));
//       } else if (ci?.mpn) {
//         mpnIdStrSet.add(String(ci.mpn));
//       }
//     }

//     const mpnObjectIds = [...mpnIdStrSet]
//       .filter((id) => mongoose.Types.ObjectId.isValid(id))
//       .map((id) => new mongoose.Types.ObjectId(id));

//     const mpnLibDocs = await MPN.find({
//       _id: { $in: mpnObjectIds },
//     })
//       .populate("UOM", "code name")
//       .lean();

//     const mpnLibMap = new Map(
//       mpnLibDocs.map((lib) => [String(lib._id), lib])
//     );

//     // =========================================================
//     // MAP DRAWING -> COSTING ITEMS
//     // =========================================================

//     const costingByDrawing = new Map();

//     for (const ci of costingItems) {
//       const key = String(ci.drawingId);

//       const arr = costingByDrawing.get(key) || [];

//       arr.push(ci);

//       costingByDrawing.set(key, arr);
//     }

//     // =========================================================
//     // MPN USAGE AGGREGATION
//     // =========================================================

//     const mpnUsagePerMpn = new Map();

//     for (const wo of workOrders) {
//       const woIdStr = String(wo._id);

//       const woNo = wo.workOrderNo || "";

//       const drawingId = wo.drawingId;

//       if (!drawingId) continue;

//       const costingArr = costingByDrawing.get(
//         String(drawingId)
//       );

//       if (!costingArr?.length) continue;

//       const woQty = Number(wo.quantity || 1);

//       for (const ci of costingArr) {
//         if (!ci.mpn) continue;

//         const mpnIdStr = String(
//           ci?.mpn?._id || ci.mpn
//         );

//         const lib = mpnLibMap.get(mpnIdStr);

//         // =====================================================
//         // MASTER UOM OF MPN
//         // =====================================================

//         const masterUOM =
//           lib?.UOM?.code ||
//           ci?.mpn?.UOM?.code ||
//           ci?.uom?.code ||
//           "PCS";

//         // =====================================================
//         // COSTING ITEM UOM
//         // =====================================================

//         const fromUOM =
//           ci?.uom?.code ||
//           masterUOM;

//         // =====================================================
//         // CONVERT INTO MASTER UOM
//         // =====================================================

//         const qtyPerInMasterUOM =
//           convertToBaseUOM(
//             Number(ci.quantity || 0),
//             fromUOM,
//             masterUOM
//           );

//         const totalNeededForThisWO =
//           qtyPerInMasterUOM * woQty;

//         const existing =
//           mpnUsagePerMpn.get(mpnIdStr) || {
//             mpnId: mpnIdStr,
//             description:
//               ci.description ||
//               lib?.description ||
//               "",
//             manufacturer:
//               ci.manufacturer ||
//               lib?.manufacturer ||
//               "",
//             uomCode: masterUOM,
//             uomId:
//               lib?.UOM?._id ||
//               ci?.uom?._id ||
//               ci?.uom ||
//               null,
//             suppliers: new Set(),
//             totalNeeded: 0,
//             workOrders: new Set(),
//             woReqMap: new Map(),
//           };

//         existing.totalNeeded +=
//           totalNeededForThisWO;

//         if (woNo) {
//           existing.workOrders.add(woNo);
//         }

//         if (ci.supplier) {
//           existing.suppliers.add(
//             String(ci.supplier)
//           );
//         }

//         const prev =
//           existing.woReqMap.get(woIdStr) || {
//             workOrderId: woIdStr,
//             workOrderNo: woNo,
//             needDate: wo.needDate || null,
//             requiredQty: 0,
//           };

//         prev.requiredQty +=
//           totalNeededForThisWO;

//         if (
//           !prev.needDate &&
//           wo.needDate
//         ) {
//           prev.needDate = wo.needDate;
//         }

//         existing.woReqMap.set(
//           woIdStr,
//           prev
//         );

//         mpnUsagePerMpn.set(
//           mpnIdStr,
//           existing
//         );
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

//     // =========================================================
//     // FETCH UOMS
//     // =========================================================

//     const uomIds = [
//       ...new Set(
//         Array.from(mpnUsagePerMpn.values())
//           .map((row) => {
//             const uom = row.uomId;
//             return uom?._id || uom || null;
//           })
//           .filter((id) =>
//             mongoose.Types.ObjectId.isValid(id)
//           )
//           .map((id) => String(id))
//       ),
//     ];

//     const uomDocs = await UOM.find({
//       _id: { $in: uomIds },
//     }).lean();

//     const uomMap = new Map(
//       uomDocs.map((u) => [String(u._id), u])
//     );

//     // =========================================================
//     // FETCH SUPPLIERS
//     // =========================================================

//     const supplierIdStrs = [
//       ...new Set(
//         Array.from(
//           mpnUsagePerMpn.values()
//         ).flatMap((row) =>
//           Array.from(row.suppliers || [])
//         )
//       ),
//     ];

//     let supplierMap = new Map();

//     if (supplierIdStrs.length) {
//       const supplierObjectIds =
//         supplierIdStrs
//           .filter((id) =>
//             mongoose.Types.ObjectId.isValid(id)
//           )
//           .map(
//             (id) =>
//               new mongoose.Types.ObjectId(id)
//           );

//       const supplierDocs =
//         await Suppliers.find({
//           _id: { $in: supplierObjectIds },
//         })
//           .select("companyName")
//           .lean();

//       supplierMap = new Map(
//         supplierDocs.map((s) => [
//           String(s._id),
//           s.companyName,
//         ])
//       );
//     }

//     // =========================================================
//     // INVENTORY
//     // =========================================================

//    const inventoryDocs = await Inventory.find({
//   mpnId: { $in: mpnObjectIds },
// }).lean();

//     const invMap = new Map();

//     for (const inv of inventoryDocs) {
//       const key = String(inv.mpnId);

//       const lib = mpnLibMap.get(key);

//       // MASTER UOM
//       const masterUOM =
//         lib?.UOM?.code || "PCS";

//       // INVENTORY UOM
//       const inventoryUOM = masterUOM;

//       // CONVERT INVENTORY -> MASTER UOM
//       const qtyInMasterUOM =
//         convertToBaseUOM(
//           Number(inv.balanceQuantity || 0),
//           inventoryUOM,
//           masterUOM
//         );

//       const curr =
//         invMap.get(key) || 0;

//       invMap.set(
//         key,
//         curr + qtyInMasterUOM
//       );
//     }

//     // =========================================================
//     // DATE SORT HELPER
//     // =========================================================

//     const toTime = (d) => {
//       if (!d)
//         return Number.POSITIVE_INFINITY;

//       const t = new Date(d).getTime();

//       return Number.isFinite(t)
//         ? t
//         : Number.POSITIVE_INFINITY;
//     };

//     // =========================================================
//     // BUILD FINAL LIST
//     // =========================================================

//     let list = Array.from(
//       mpnUsagePerMpn.values()
//     ).map((row) => {
//       const lib = mpnLibMap.get(row.mpnId);

//       const uomDoc = row.uomId
//         ? uomMap.get(String(row.uomId))
//         : null;

//       const currentStock =
//         Number(invMap.get(row.mpnId) || 0);

//       const required =
//         Number(row.totalNeeded || 0);

//       const overallShortage =
//         required - currentStock;

//       const mpnName =
//         lib?.mpn ||
//         lib?.mpnNumber ||
//         lib?.MPN ||
//         null;

//       const manufacturerFinal =
//         row.manufacturer ||
//         lib?.manufacturer ||
//         null;

//       const supplierIdsArray =
//         Array.from(row.suppliers || []);

//       const supplierNamesList =
//         supplierIdsArray
//           .map((id) =>
//             supplierMap.get(id)
//           )
//           .filter(Boolean);

//       const supplierFinal =
//         supplierNamesList.length
//           ? supplierNamesList.join(", ")
//           : null;

//       // =====================================================
//       // WO REQUIREMENTS
//       // =====================================================

//       const woReqArr = Array.from(
//         row.woReqMap?.values() || []
//       ).map((w) => ({
//         ...w,
//         requiredQty: Number(
//           w.requiredQty || 0
//         ),
//       }));

//       woReqArr.sort((a, b) => {
//         const dateDiff =
//           toTime(a.needDate) -
//           toTime(b.needDate);

//         if (dateDiff !== 0)
//           return dateDiff;

//         return String(
//           a.workOrderNo
//         ).localeCompare(
//           String(b.workOrderNo)
//         );
//       });

//       let remainingStock =
//         Number(
//           invMap.get(row.mpnId) || 0
//         );

//       const shortageByWorkOrders = [];

//       for (
//         let i = 0;
//         i < woReqArr.length;
//         i++
//       ) {
//         const w = woReqArr[i];

//         const req = Number(
//           w.requiredQty || 0
//         );

//         const canFulfill = Math.min(
//           remainingStock,
//           req
//         );

//         remainingStock = Number(
//           (
//             remainingStock -
//             canFulfill
//           ).toFixed(6)
//         );

//         const shortageQty = Number(
//           (req - canFulfill).toFixed(6)
//         );

//         if (shortageQty > 0) {
//           shortageByWorkOrders.push({
//             label: `Short#${
//               shortageByWorkOrders.length + 1
//             }`,
//             workOrderId:
//               w.workOrderId,
//             workOrderNo:
//               w.workOrderNo,
//             needDate:
//               w.needDate,
//             requiredQty:
//               req.toFixed(4),
//             shortageQty:
//               shortageQty.toFixed(4),
//           });
//         }
//       }

//       return {
//         mpnId: row.mpnId,
//         mpn: mpnName,
//         description:
//           row.description ||
//           lib?.description ||
//           null,
//         manufacturer:
//           manufacturerFinal,
//         supplier: supplierFinal,
//         supplierId:
//           supplierIdsArray,

//         // MASTER UOM
//         uom:
//           row.uomCode ||
//           uomDoc?.code ||
//           uomDoc?.name ||
//           null,

//         required:
//           required.toFixed(4),

//         currentStock:
//           currentStock.toFixed(4),

//         shortage:
//           overallShortage.toFixed(4),

//         shortageByWorkOrders,

//         requireByWorkOrders:
//           Array.from(
//             row.workOrders || []
//           ),
//       };
//     });

//     // =========================================================
//     // ONLY SHORTAGE ITEMS
//     // =========================================================

//     list = list.filter(
//       (item) =>
//         Number(item.shortage || 0) > 0 ||
//         (Array.isArray(
//           item.shortageByWorkOrders
//         ) &&
//           item.shortageByWorkOrders
//             .length > 0)
//     );

//     // =========================================================
//     // FILTER MANUFACTURER
//     // =========================================================

//     if (manufacturer) {
//       const mLower =
//         manufacturer
//           .toString()
//           .toLowerCase();

//       list = list.filter(
//         (row) =>
//           row.manufacturer &&
//           row.manufacturer
//             .toLowerCase()
//             .includes(mLower)
//       );
//     }

//     // =========================================================
//     // FILTER SUPPLIER
//     // =========================================================

//     if (supplier) {
//       const sId = supplier.toString();

//       list = list.filter(
//         (row) =>
//           Array.isArray(
//             row.supplierId
//           ) &&
//           row.supplierId.includes(sId)
//       );
//     }

//     // =========================================================
//     // SORT
//     // =========================================================

//     list.sort(
//       (a, b) =>
//         Number(b.shortage || 0) -
//         Number(a.shortage || 0)
//     );

//     // =========================================================
//     // PAGINATION
//     // =========================================================

//     const totalItems = list.length;

//     const totalPages = Math.ceil(
//       totalItems / limit
//     );

//     const start = (page - 1) * limit;

//     const end = start + limit;

//     const pagedData = list.slice(
//       start,
//       end
//     );

//     return res.json({
//       status: true,
//       statusCode: 200,
//       message:
//         "Purchase shortage list fetched successfully",

//       data: pagedData,

//       pagination: {
//         currentPage: page,
//         pageSize: limit,
//         totalItems,
//         totalPages,
//       },
//     });
//   } catch (error) {
//     console.error(
//       "getPurchaseShortageList error:",
//       error
//     );

//     return res.status(500).json({
//       status: false,
//       message: error.message,
//       data: [],
//     });
//   }
// };

// export const getPurchaseShortageList = async (req, res) => {
//   try {
//     let { page = 1, limit = 10, manufacturer, supplier } = req.query;

//     page = parseInt(page, 10) || 1;
//     limit = parseInt(limit, 10) || 10;

//     // 1) All work orders (flat schema)
//     const workOrders = await WorkOrder.find().lean();

//     if (!workOrders.length) {
//       return res.json({
//         status: true,
//         statusCode: 200,
//         message: "No work orders found",
//         data: [],
//         pagination: {
//           currentPage: page,
//           totalItems: 0,
//           totalPages: 0,
//           pageSize: limit,
//         },
//       });
//     }

//     // 2) Unique drawingIds from work orders
//     const drawingIdStrs = [
//       ...new Set(
//         workOrders
//           .filter((wo) => wo.drawingId)
//           .map((wo) => String(wo.drawingId))
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
//     })
//       .populate("uom", "code")
//       .populate({
//         path: "mpn",
//         select: "UOM",
//         populate: {
//           path: "UOM",
//           select: "code",
//         },
//       })
//       .lean();

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

//     // Map: drawingId -> costingItems[]
//     const costingByDrawing = new Map();
//     for (const ci of costingItems) {
//       const key = String(ci.drawingId);
//       const arr = costingByDrawing.get(key) || [];
//       arr.push(ci);
//       costingByDrawing.set(key, arr);
//     }

//     /**
//      * 4) MPN usage aggregation (GROUP BY mpnId)
//      *    + store per-workorder required qty + needDate so we can build Short#1, Short#2...
//      */
//     const mpnUsagePerMpn = new Map();
//     const mpnIdStrSet = new Set();

//     for (const wo of workOrders) {
//       const woIdStr = String(wo._id);
//       const woNo = wo.workOrderNo || "";
//       const drawingId = wo.drawingId;
//       if (!drawingId) continue;

//       const costingArr = costingByDrawing.get(String(drawingId));
//       if (!costingArr || !costingArr.length) continue;

//       const woQty = Number(wo.quantity || 1);

//       for (const ci of costingArr) {
//         const mpnObjId = ci.mpn;
//         if (!mpnObjId) continue;

//         const mpnIdStr = String(ci.mpn?._id || ci.mpn);
//         mpnIdStrSet.add(mpnIdStr);

//         // const qtyPer = Number(ci.quantity || 0);
//         // const totalNeededForThisWO = qtyPer * woQty;

//         const fromUOM =
//           ci?.uom?.code ||
//           ci?.mpn?.UOM?.code ||
//           "M";
//         console.log('------fromUOM', fromUOM)

//         // convert everything to METER FIRST
//         const qtyPerInBase = convertToBaseUOM(
//           Number(ci.quantity || 0),
//           fromUOM,
//           "M"
//         );

//         console.log('-------qtyPerInMeter', ci.quantity, qtyPerInBase)

//         const totalNeededForThisWO = qtyPerInBase * woQty;

//         const existing = mpnUsagePerMpn.get(mpnIdStr) || {
//           mpnId: mpnIdStr,
//           description: ci.description || "",
//           manufacturer: ci.manufacturer || "",
//           uomId: ci.uom || null,
//           suppliers: new Set(), // supplier IDs
//           totalNeeded: 0,
//           workOrders: new Set(), // WO numbers
//           woReqMap: new Map(), // ✅ per WO requirement
//         };

//         existing.totalNeeded += totalNeededForThisWO;

//         if (woNo) existing.workOrders.add(woNo);
//         if (ci.supplier) existing.suppliers.add(String(ci.supplier));

//         // keep best meta
//         if (ci.description) existing.description = ci.description;
//         if (ci.manufacturer) existing.manufacturer = ci.manufacturer;
//         if (ci.uom && !existing.uomId) existing.uomId = ci.uom;

//         // ✅ per WO requirement accumulation
//         const prev = existing.woReqMap.get(woIdStr) || {
//           workOrderId: woIdStr,
//           workOrderNo: woNo,
//           needDate: wo.needDate || null, // ✅ from work order
//           requiredQty: 0,
//         };

//         prev.requiredQty += totalNeededForThisWO;
//         // keep earliest needDate if multiple (just in case)
//         if (!prev.needDate && wo.needDate) prev.needDate = wo.needDate;

//         existing.woReqMap.set(woIdStr, prev);

//         mpnUsagePerMpn.set(mpnIdStr, existing);
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
//     const mpnLibMap = new Map(mpnLibDocs.map((lib) => [String(lib._id), lib]));

//   // 7) Fetch UOM for all unique uomIds (SAFE FIX)
// const uomIds = [
//   ...new Set(
//     Array.from(mpnUsagePerMpn.values())
//       .map((row) => {
//         const uom = row.uomId;
//         return uom?._id || uom || null;
//       })
//       .filter((id) => mongoose.Types.ObjectId.isValid(id))
//       .map((id) => String(id))
//   ),
// ];

// const uomDocs = await UOM.find({
//   _id: { $in: uomIds },
// }).lean();

// const uomMap = new Map(uomDocs.map((u) => [String(u._id), u]));

//     // 8) Fetch Supplier names
//     const supplierIdStrs = [
//       ...new Set(
//         Array.from(mpnUsagePerMpn.values()).flatMap((row) =>
//           Array.from(row.suppliers || [])
//         )
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

//     // 9) Inventory stock (sum balanceQuantity per mpnId)
//     const inventoryDocs = await Inventory.find({
//       mpnId: { $in: mpnObjectIds },
//     }).lean();

//     const invMap = new Map();

//     for (const inv of inventoryDocs) {
//       const key = String(inv.mpnId);

//       const lib = mpnLibMap.get(key);

//       // inventory stored UOM
//       const inventoryUOM =
//         lib?.UOM?.code ||
//         lib?.uom?.code ||
//         "M";

//       // convert inventory -> M
//       const qtyInBase = convertToBaseUOM(
//         Number(inv.balanceQuantity || 0),
//         inventoryUOM,
//         "M"
//       );

//       const curr = invMap.get(key) || 0;

//       invMap.set(key, curr + qtyInBase);
//     }

//     // Helper: safe date sort (null goes last)
//     const toTime = (d) => {
//       if (!d) return Number.POSITIVE_INFINITY;
//       const t = new Date(d).getTime();
//       return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
//     };

//     // 10) Build raw list (per MPN) + Short#1/Short#2... (WO-wise shortage)
//     let list = Array.from(mpnUsagePerMpn.values()).map((row) => {
//       const lib = mpnLibMap.get(row.mpnId);
//       const uomDoc = row.uomId ? uomMap.get(String(row.uomId)) : null;

//       const libUOM = lib?.UOM?.code || "M";

//       // values are currently in M
//       const currentStockBase = invMap.get(row.mpnId) || 0;
//       const requiredBase = Number(row.totalNeeded || 0);

//       const overallShortageBase =
//         requiredBase - currentStockBase;

//       // convert for display
//       const currentStock = convertToBaseUOM(
//         currentStockBase,
//         "M",
//         libUOM
//       );

//       const required = convertToBaseUOM(
//         requiredBase,
//         "M",
//         libUOM
//       );

//       const overallShortage = convertToBaseUOM(
//         overallShortageBase,
//         "M",
//         libUOM
//       );

//       const mpnName = lib?.mpn || lib?.mpnNumber || lib?.MPN || null;
//       const manufacturerFinal = row.manufacturer || lib?.manufacturer || null;

//       // Supplier IDs -> Names
//       const supplierIdsArray = Array.from(row.suppliers || []);
//       const supplierNamesList = supplierIdsArray
//         .map((id) => supplierMap.get(id))
//         .filter(Boolean);

//       const supplierFinal = supplierNamesList.length
//         ? supplierNamesList.join(", ")
//         : null;

//       // ✅ WO wise requirement list
//       const woReqArr = Array.from(row.woReqMap?.values() || []).map((w) => ({
//         ...w,
//         requiredQty: Number(w.requiredQty || 0),
//       }));

//       // sort by needDate ascending (earliest first)
//       woReqArr.sort((a, b) => {
//   const dateDiff = toTime(a.needDate) - toTime(b.needDate);
//   if (dateDiff !== 0) return dateDiff;

//   // tie breaker (VERY IMPORTANT)
//   return String(a.workOrderNo).localeCompare(String(b.workOrderNo));
// });

// let remainingStock = Number(invMap.get(row.mpnId) || 0); // ALWAYS base

// const shortageByWorkOrders = [];

// for (let i = 0; i < woReqArr.length; i++) {
//   const w = woReqArr[i];

//   const req = Number(w.requiredQty || 0);

//   const canFulfill = Math.min(remainingStock, req);
//   remainingStock = Number((remainingStock - canFulfill).toFixed(6));

//   const shortageQty = Number((req - canFulfill).toFixed(6));

//   if (shortageQty > 0) {
//     shortageByWorkOrders.push({
//       label: `Short#${shortageByWorkOrders.length + 1}`,
//       workOrderId: w.workOrderId,
//       workOrderNo: w.workOrderNo,
//       needDate: w.needDate,
//       requiredQty: req,
//       shortageQty,
//     });
//   }
// }

//       return {
//         mpnId: row.mpnId,
//         mpn: mpnName,
//         description: row.description || lib?.description || null,
//         manufacturer: manufacturerFinal,
//         supplier: supplierFinal,
//         supplierId: supplierIdsArray, // IDs
//         uom: uomDoc?.name || null,
//         required,
//         currentStock: currentStock.toFixed(4),
//         shortage: overallShortage.toFixed(4), // overall shortage
//         shortageByWorkOrders, // ✅ NEW: Short#1/Short#2 + needDate + qty per WO
//         requireByWorkOrders: Array.from(row.workOrders || []),
//       };
//     });

//     // 11) only shortage items (either overall shortage OR WO shortage list)
//     list = list.filter(
//       (item) =>
//         Number(item.shortage || 0) > 0 ||
//         (Array.isArray(item.shortageByWorkOrders) &&
//           item.shortageByWorkOrders.length > 0)
//     );

//     // 12) Filter by manufacturer (name contains)
//     if (manufacturer) {
//       const mLower = manufacturer.toString().toLowerCase();
//       list = list.filter(
//         (row) =>
//           row.manufacturer && row.manufacturer.toLowerCase().includes(mLower)
//       );
//     }

//     // 13) Filter by supplier (ID)
//     if (supplier) {
//       const sId = supplier.toString();
//       list = list.filter(
//         (row) => Array.isArray(row.supplierId) && row.supplierId.includes(sId)
//       );
//     }

//     // Sort (optional): highest shortage first
//     list.sort((a, b) => Number(b.shortage || 0) - Number(a.shortage || 0));

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

//     // 1) Sare ON HOLD work orders (flat schema)
//     const workOrders = await WorkOrder.find();
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

//     // 2) Unique drawingIds from work orders (flat)
//     const drawingIdStrs = [
//       ...new Set(
//         workOrders
//           .filter((wo) => wo.drawingId)
//           .map((wo) => String(wo.drawingId))
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

//     // 4) MPN usage aggregation (GROUP BY mpnId) – flat WorkOrder
//     const mpnUsagePerMpn = new Map();
//     const mpnIdStrSet = new Set();

//     for (const wo of workOrders) {
//       const woNo = wo.workOrderNo || "";
//       const drawingId = wo.drawingId;
//       if (!drawingId) continue;

//       const costingArr = costingByDrawing.get(String(drawingId));
//       if (!costingArr || !costingArr.length) continue;

//       const woQty = Number(wo.quantity || 1);

//       for (const ci of costingArr) {
//         const mpnObjId = ci.mpn;
//         if (!mpnObjId) continue;

//         const mpnIdStr = String(mpnObjId);
//         mpnIdStrSet.add(mpnIdStr);

//         const qtyPer = Number(ci.quantity || 0);
//         const totalNeededForThis = qtyPer * woQty;

//         const existing = mpnUsagePerMpn.get(mpnIdStr) || {
//           mpnId: mpnIdStr,
//           description: ci.description || "",
//           manufacturer: ci.manufacturer || "",
//           uomId: ci.uom || null,
//           suppliers: new Set(),          // supplier IDs
//           totalNeeded: 0,
//           workOrders: new Set(),         // WO numbers
//         };

//         existing.totalNeeded += totalNeededForThis;
//         if (woNo) existing.workOrders.add(woNo);
//         if (ci.supplier) existing.suppliers.add(String(ci.supplier));

//         if (ci.description) existing.description = ci.description;
//         if (ci.manufacturer) existing.manufacturer = ci.manufacturer;
//         if (ci.uom && !existing.uomId) existing.uomId = ci.uom;

//         mpnUsagePerMpn.set(mpnIdStr, existing);
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

//     // 8) Fetch Supplier names from Supplier model
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

//       // Supplier IDs -> Names
//       const supplierIdsArray = Array.from(row.suppliers || []);

//       const supplierNamesList = supplierIdsArray
//         .map((id) => supplierMap.get(id))
//         .filter(Boolean);

//       const supplierFinal = supplierNamesList.length
//         ? supplierNamesList.join(", ")
//         : null;

//       return {
//         mpnId: row.mpnId,
//         mpn: mpnName,
//         description: row.description || lib?.description || null,
//         manufacturer: manufacturerFinal,
//         supplier: supplierFinal,
//         supplierId: supplierIdsArray,     // ✅ pure IDs (string)
//         uom: uomDoc?.name || null,
//         required,
//         currentStock,
//         shortage,
//         requireByWorkOrders: Array.from(row.workOrders || []),
//       };
//     });

//     // 11) Sirf shortage wale MPN (shortage > 0)
//     list = list.filter((item) => item.shortage > 0);

//     // 12) Filter by manufacturer (name, e.g. "Alpha")
//     if (manufacturer) {
//       const mLower = manufacturer.toString().toLowerCase();
//       list = list.filter(
//         (row) =>
//           row.manufacturer &&
//           row.manufacturer.toLowerCase().includes(mLower)
//       );
//     }

//     // 13) Filter by supplier (ID, e.g. "68f0e9c72f3332e1fa112199")
//     if (supplier) {
//       const sId = supplier.toString();
//       list = list.filter(
//         (row) =>
//           Array.isArray(row.supplierId) &&
//           row.supplierId.includes(sId)
//       );
//     }

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

  // const drawingObjectIds = drawingIdStrs.map(
  //   (id) => new mongoose.Types.ObjectId(id)
  // );

  const drawingObjectIds = drawingIdStrs
    .map((id) => toObjectId(id))
    .filter(Boolean);

  // 3) CostingItems only material
  const costingItems = await CostingItems.find({
    drawingId: { $in: drawingObjectIds },
    quoteType: "material",
  }).lean();
  if (!costingItems.length) return [];

  // drawingId -> costingItems[]
  const costingByDrawing = new Map();
  for (const ci of costingItems) {
    const key = String(ci.drawingId?._id || ci.drawingId);
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
        const mpnObjId = ci?.mpn?._id || ci?.mpn;

        if (!mpnObjId) continue;

        const mpnIdStr = String(mpnObjId);

        // invalid ids skip
        if (!mongoose.Types.ObjectId.isValid(mpnIdStr)) {
          console.log("Invalid MPN ID:", mpnIdStr);
          continue;
        }
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

  const mpnObjectIds = [...mpnIdStrSet]
    .map((id) => toObjectId(id))
    .filter(Boolean);

  // 5) MPN library
  // const mpnLibDocs = await MPN.find({ _id: { $in: mpnObjectIds } }).lean();
  const mpnLibDocs = await MPN.find({
    _id: { $in: mpnObjectIds }
  })
    .populate("UOM", "code")
    .lean();
  const mpnLibMap = new Map();
  for (const lib of mpnLibDocs) {
    mpnLibMap.set(String(lib._id), lib);
  }

  // 6) UOM
  const uomIds = [
    ...new Set(
      Array.from(mpnUsagePerMpn.values())
        .map((row) => row.uomId?._id || row.uomId)
        .filter(Boolean)
        .map((id) => String(id))
    ),
  ].filter((id) => mongoose.Types.ObjectId.isValid(id));
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
    const supplierObjectIds = supplierIdStrs
      .map((id) => toObjectId(id))
      .filter(Boolean);
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

export const acceptPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const po = await PurchaseOrders.findById(id);

    if (!po) {
      return res.status(404).send("<h3>Purchase Order not found</h3>");
    }

    // Already Acknowledged
    if (po.status === "Acknowledged") {
      return res.send(`
        <h3>✅ Purchase Order already accepted</h3>
        <p>PO Number: ${po.poNumber}</p>
      `);
    }

    // ✅ Special case: Partially Received → Closed
    if (po.status === "Partially Received") {
      po.status = "Closed";
      po.closedAt = new Date(); // optional tracking field
    } else {
      // Normal flow
      po.status = "Acknowledged";
      po.acceptedAt = new Date();
    }

    await po.save();

    return res.send(`
      <div style="font-family:Arial;padding:20px">
        <h2>✅ Thank you!</h2>
        <p>Purchase Order <b>${po.poNumber}</b> has been <b>${po.status.toUpperCase()}</b> successfully.</p>
        <p>You may now close this window.</p>
      </div>
    `);

  } catch (error) {
    console.error("ACCEPT ERROR:", error);
    return res.status(500).send("Something went wrong");
  }
};

// export const acceptPurchaseOrder = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const po = await PurchaseOrders.findById(id);
//     if (!po) {
//       return res.status(404).send("<h3>Purchase Order not found</h3>");
//     }

//     // Already Accepted
//     if (po.status === "Acknowledged") {
//       return res.send(`
//         <h3>✅ Purchase Order already accepted</h3>
//         <p>PO Number: ${po.poNumber}</p>
//       `);
//     }

//     // ✅ Update status
//     po.status = "Acknowledged";
//     po.acceptedAt = new Date();
//     await po.save();

//     return res.send(`
//       <div style="font-family:Arial;padding:20px">
//         <h2>✅ Thank you!</h2>
//         <p>Purchase Order <b>${po.poNumber}</b> has been <b>ACCEPTED</b> successfully.</p>
//         <p>You may now close this window.</p>
//       </div>
//     `);

//   } catch (error) {
//     console.error("ACCEPT ERROR:", error);
//     return res.status(500).send("Something went wrong");
//   }
// };

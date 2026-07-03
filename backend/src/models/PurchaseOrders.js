

// models/PurchaseOrder.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const PurchaseOrderItemSchema = new Schema({
  idNumber: { type: String, required: true }, // e.g., 123456
  description: { type: String, required: true },

  mpn: {
    type: Schema.Types.ObjectId,
    ref: "MPNLibrary",
    required: true,
  },

  manufacturer: { type: String },

  uom: {
    type: Schema.Types.ObjectId,
    ref: "UOM",
    required: true,
  }, // unit of measure

  qty: { type: Number, required: true, default: 0 },          // ordered quantity
  unitPrice: { type: Number, required: true, default: 0 },
  discount: { type: Number, required: true, default: 0 },     // %
  extPrice: { type: Number, required: true, default: 0 },     // qty * unitPrice - discount

  // 🔹 Receiving tracking fields (PO line level)
  receivedQtyTotal: { type: Number, default: 0 },   // total received so far (all GRNs)
  rejectedQtyTotal: { type: Number, default: 0 },   // total rejected so far
  pendingQty: { type: Number, default: 0 },   // remaining to be accepted = qty - acceptedTotal
  committedDate: { type: Date },
  remarks: { type: String, default: "" },           // last/overall remarks for this PO line
  acceptedAt: { type: Date },
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Rejected", "Partially Accepted"],
    default: "Pending",
  },
});

const PurchaseOrderSchema = new Schema(
  {
    poNumber: { type: String, required: true, unique: true },
    poDate: { type: Date, required: true, default: Date.now },

    supplier: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },

    referenceNo: { type: String },
    needDate: { type: Date },
    etaDate: { type: Date },
    taxPercentage:{type:Number,default:0},
    workOrderNo: {
      type: Schema.Types.ObjectId,
      ref: "WorkOrder",
      required: false,
    },

    shipToAddress: { type: String },
    termsConditions: { type: String },

    items: [PurchaseOrderItemSchema],

    totals: {
      freightAmount: { type: Number, default: 0 },
      subTotalAmount: { type: Number, default: 0 },
      ostTax: { type: Number, default: 0 },
      finalAmount: { type: Number, default: 0 },
      totalDiscount: { type: Number, default: 0 },
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Cancelled",
        "Emailed",
        "Draft",
        "Closed",
        "Partially Received",  // receiving ke liye
        "Completed",
        "Acknowledged",         // fully received
        "Pending Approval",
        "Approved",
        "Rejected"
      ],
      default: "Pending",
    },
    reason: {
      type: String
    },
    priceOverrideDetected: { type: Boolean, default: false },
    requiresSecondLevelApproval: { type: Boolean, default: false },
    secondLevelApprovalStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending'
    },
    secondLevelApprovedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    secondLevelApprovedAt: Date,
    secondLevelRejectionReason: String,
    secondLevelRequestReason: String,
    overPurchaseDetected: { type: Boolean, default: false },
      overPurchaseDetails: {
      totalRequiredQty: { type: Number, default: 0 },
      totalBalanceQty: { type: Number, default: 0 },
      totalIncomingQty: { type: Number, default: 0 },
      totalMaxPurchaseQty: { type: Number, default: 0 },
      totalOrderedQty: { type: Number, default: 0 }
    },
    closedAt: {
  type: Date,
  default: null,
},

isRevision: {
  type: Boolean,
  default: false,
},

revisionNo: {
  type: Number,
  default: 0,
},

parentPurchaseOrder: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "PurchaseOrders",
},

revisionHistory: [
  {
    revisionNo: {
      type: Number,
    },
    poNumber: {
      type: String,
    },
    revisedAt: {
      type: Date,
      default: Date.now,
    },
    snapshot: {
      type: Schema.Types.Mixed,
    },
  },
],

isLocked: {
  type: Boolean,
  default: false,
},

closedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null,
},

closeRemarks: {
  type: String,
  default: "",
},
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default model("PurchaseOrder", PurchaseOrderSchema);


// import mongoose from "mongoose";
// import { type } from "os";

// const { Schema, model } = mongoose;

// const PurchaseOrderItemSchema = new Schema({
//   idNumber: { type: String, required: true }, // e.g., 123456
//   description: { type: String, required: true },
//   mpn: { type: mongoose.Schema.Types.ObjectId, ref: "MPNLibrary", required: true },
//   manufacturer: { type: String },
//   uom: { type: mongoose.Schema.Types.ObjectId, ref: "UOM", required: true }, // unit of measure
//   qty: { type: Number, required: true, default: 0 },
//   unitPrice: { type: Number, required: true, default: 0 },
//   discount: { type: Number, required: true, default: 0 }, // %
//   extPrice: { type: Number, required: true, default: 0 }, // qty * unitPrice - discount
//   itemId: { type: Schema.Types.ObjectId, ref: "PurchaseOrder.items" },

//   receivedQtyTotal: { type: Number, default: 0 },   // e.g. 30 received so far
//   rejectedQtyTotal: { type: Number, default: 0 },   // e.g. 5 rejected so far
//   pendingQty: { type: Number, default: 0 },         // auto-calculated
//   remarks: { type: String, default: "" },
//   status: {
//     type: String,
//     enum: ["Pending", "Accepted", "Rejected", "Partially Accepted"],
//     default: "Pending",
//   },
// });

// const PurchaseOrderSchema = new Schema(
//   {
//     poNumber: { type: String, required: true, unique: true },
//     poDate: { type: Date, required: true, default: Date.now },
//     supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
//     referenceNo: { type: String },
//     needDate: { type: Date },
//     workOrderNo: { type: mongoose.Schema.Types.ObjectId, ref: "WorkOrder", required: true },
//     shipToAddress: { type: String },
//     termsConditions: { type: String },
//     items: [PurchaseOrderItemSchema],
//     totals: {
//       freightAmount: { type: Number, default: 0 },
//       subTotalAmount: { type: Number, default: 0 },
//       ostTax: { type: Number, default: 0 },
//       finalAmount: { type: Number, default: 0 },
//     },
//     status: {
//       type: String,
//       enum: [
//         "Pending",
//         "Confirmed",
//         "Cancelled",
//         "Emailed",
//         "Draft",
//         "Closed",
//         "Partially Received",   // 🔹 new
//         "Completed"             // 🔹 new
//       ],
//       default: "Pending"
//     },
//     isDeleted: { type: Boolean, default: false },
//   },
//   { timestamps: true }
// );

// export default model("PurchaseOrder", PurchaseOrderSchema);

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
  pendingQty:       { type: Number, default: 0 },   // remaining to be accepted = qty - acceptedTotal

  remarks: { type: String, default: "" },           // last/overall remarks for this PO line

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

    workOrderNo: {
      type: Schema.Types.ObjectId,
      ref: "WorkOrder",
      required: true,
    },

    shipToAddress: { type: String },
    termsConditions: { type: String },

    items: [PurchaseOrderItemSchema],

    totals: {
      freightAmount: { type: Number, default: 0 },
      subTotalAmount: { type: Number, default: 0 },
      ostTax: { type: Number, default: 0 },
      finalAmount: { type: Number, default: 0 },
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
        "Completed",           // fully received
      ],
      default: "Pending",
    },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default model("PurchaseOrder", PurchaseOrderSchema);


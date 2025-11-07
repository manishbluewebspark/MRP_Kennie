import mongoose from "mongoose";

const { Schema, model } = mongoose;

const PurchaseOrderItemSchema = new Schema({
  idNumber: { type: String, required: true }, // e.g., 123456
  description: { type: String, required: true },
  mpn: { type: String },
  manufacturer: { type: String },
  uom: { type: String }, // unit of measure
  qty: { type: Number, required: true, default: 0 },
  unitPrice: { type: Number, required: true, default: 0 },
  discount: { type: Number, required: true, default: 0 }, // %
  extPrice: { type: Number, required: true, default: 0 }, // qty * unitPrice - discount
});

const PurchaseOrderSchema = new Schema(
  {
    poNumber: { type: String, required: true, unique: true },
    poDate: { type: Date, required: true, default: Date.now },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Suppliers", required: true },
    referenceNo: { type: String },
    needDate: { type: Date },
    workOrderNo: { type: String },
    shipToAddress: { type: String },
    termsAndConditions: { type: String },

    items: [PurchaseOrderItemSchema],

    totals: {
      freightAmount: { type: Number, default: 0 },
      subTotalAmount: { type: Number, default: 0 },
      ostTax: { type: Number, default: 0 },
      finalAmount: { type: Number, default: 0 },
    },

    status: { type: String, enum: ["Draft", "Confirmed", "Cancelled"], default: "Draft" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default model("PurchaseOrder", PurchaseOrderSchema);

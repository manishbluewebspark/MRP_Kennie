import mongoose from "mongoose";

const purchaseHistorySchema = new mongoose.Schema(
  {
    purchasedDate: { type: Date },
    purchasedPrice: { type: String },   // keep as string if it can contain $ sign, else use Number
    supplier: { type: String },
    leadTimeWeeks: { type: Number, default: 0 },
    moq: { type: Number }
  },
  { _id: false } // we don’t need separate _id for subdocs
);

const mpnSchema = new mongoose.Schema(
  {
    MPN: { type: String, required: true },
    Manufacturer: { type: String, required: true },
    Description: { type: String },
    UOM: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UOM",
    },
    StorageLocation: { type: String },
    RFQUnitPrice: { type: String, default: "" }, // Request For Quotation Unit Price
    MOQ: { type: Number }, // Minimum Order Quantity
    RFQ: { type: String },
    RFQDate: { type: Date },
    Supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
    },
    LeadTime_WK: { type: Number }, // Lead time in weeks
    Category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    Status: { type: String, default: "Active" },
    note: { type: String, default: "" },
    isDeleted: { type: Boolean, default: false },

    // 👇 new field for unlimited purchase history
    purchaseHistory: [purchaseHistorySchema]
  },
  { timestamps: true }
);

export default mongoose.model("MPNLibrary", mpnSchema);

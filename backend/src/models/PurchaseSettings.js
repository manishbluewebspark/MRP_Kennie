import mongoose from "mongoose";

const { Schema, model } = mongoose;

const AddressSchema = new Schema({
  name: { type: String, required: true },
  fullAddress: { type: String, required: true },
});

const PurchaseSettingsSchema = new Schema(
  {
    addresses: { type: [AddressSchema], default: [] }, // multiple addresses
    defaultTerms: { type: String, default: "" }, // default terms & conditions
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default model("PurchaseSettings", PurchaseSettingsSchema);

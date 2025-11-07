import mongoose from "mongoose";

const uomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g., "Kilogram"
    code: { type: String, required: true, trim: true }, // e.g., "KG"
    description: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "deactive"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.model("UOM", uomSchema);

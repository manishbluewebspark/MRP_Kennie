import mongoose from "mongoose";

const currencySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g., "Indian Rupee"
    code: { type: String, required: true, trim: true }, // e.g., "INR"
    symbol: { type: String, trim: true }, // e.g., "₹"
    isDeleted: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "deactive"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.model("Currency", currencySchema);

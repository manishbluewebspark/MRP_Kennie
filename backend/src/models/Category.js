import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "deactive"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.model("Category", categorySchema);

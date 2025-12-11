import mongoose from "mongoose";

const childSchema = new mongoose.Schema(
  {
    ChildPartNo: { type: String, required: true },

    // Link to parent MPN
    mpn: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MPNLibrary",
      required: true,
    },
    LinkedMPNCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default:null
    },
    status: { type: String, enum: ["Active", "Inactive"], default: "active" },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

childSchema.index({ childPartNo: 1 }, { unique: true });


export default mongoose.model("ChildLibrary", childSchema);

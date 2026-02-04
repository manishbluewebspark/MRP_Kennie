import mongoose from "mongoose";

const DemandListSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    fileName: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: ["Draft", "Processing", "Completed", "Approved", "PO_CREATED"],
      default: "Draft"
    },

    totalItems: {
      type: Number,
      default: 0
    },

    processedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true // createdAt & updatedAt auto
  }
);

export default mongoose.model("DemandList", DemandListSchema);

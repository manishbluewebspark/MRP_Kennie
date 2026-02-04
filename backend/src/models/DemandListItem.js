import mongoose from "mongoose";

const DemandListItemSchema = new mongoose.Schema(
  {
    demandListId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DemandList",
      required: true,
      index: true
    },

    partNumber: {
      type: String,
      required: true,
      trim: true
    },

    manufacturer: {
      type: String,
      trim: true
    },

    uom: {
      type: String,
      trim: true
    },

    qtyRequired: {
      type: Number,
      required: true
    },

    requiredDate: {
      type: Date
    },

    stockStatus: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      enum: ["Available", "Shortage", "Ordered"],
      default: "Available"
    },

    shortage: {
      type: Number,
      default: 0
    },

    purchaseRequired: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("DemandListItem", DemandListItemSchema);

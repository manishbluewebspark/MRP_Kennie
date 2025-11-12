import mongoose from "mongoose";

const mtoInventorySchema = new mongoose.Schema(
  {
    drawingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drawing", // reference to your drawing master table
      required: true,
    },
    drawingNo: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    balanceQty: {
      type: Number,
      default: 0,
    },
    outgoingQty: {
      type: Number,
      default: 0,
    },
    workOrder: {
      type: String,
      trim: true,
    },
    project: {
      type: String,
      trim: true,
    },
    customer: {
      type: String,
      trim: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Auto-update "completed" status if balanceQty == 0
mtoInventorySchema.pre("save", function (next) {
  this.completed = this.balanceQty <= 0;
  next();
});

export default mongoose.model("MtoInventory", mtoInventorySchema);

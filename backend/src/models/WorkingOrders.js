import mongoose from "mongoose";


const workOrderItemSchema = new mongoose.Schema(
  {
    drawingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drawing",
      required: true,
    },
    posNo: {
      // Position number within the Work Order (line no / item no)
      type: Number, // keep string to allow formats like "10A"
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
    },
    uom: {
      type: String,
      trim: true,
      default: "PCS",
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "done", "cancelled"],
      default: "open",
    },
  },
  { _id: false } // items don't need their own _id unless you want it
);


const workOrderSchema = new mongoose.Schema(
  {
    workOrderNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    // projectNo: {
    //   type: String,
    //   required: true,
    //   trim: true,
    // },
    poNumber: {
      type: String,
      trim: true,
    },
    projectType: {
      type: String,
      enum: ["cable_assembly", "box_Build_assembly", "others_assembly"], // adjust as per your project types
      default: "cable_assembly",
    },
    needDate: {
      type: Date,
    },
    commitDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["on_hold", "in_progress", "completed", "cancelled"],
      default: "on_hold",
    },
    isTriggered: {
      type: Boolean,
      default: false,
    },
    isInProduction:{
      type: Boolean,
      default: false,
    },
    items: {
      type: [workOrderItemSchema],
      default: []
    },
    doNumber: {
      type: String,
      trim: true,
      default: "",
    },
    delivered: {
      type: Boolean,
      default: false,
    },

  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

const WorkOrder = mongoose.model("WorkOrder", workOrderSchema);

export default WorkOrder;

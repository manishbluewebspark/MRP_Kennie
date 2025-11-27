import mongoose from "mongoose";

const workOrderSchema = new mongoose.Schema(
  {
    workOrderNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
   
    poNumber: {
      type: String,
      trim: true,
    },
    projectNo: {
      type: String,
      trim: true,
    },
    drawingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drawing",
      required: true,
    },
     projectType: {
      type: String,
      enum: ["cable_harness", "box_build", "other"], // adjust as per your project types
      default: "cable_harness",
    },
     projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
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
    needDate: {
      type: Date,
    },
    commitDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["on_hold", "in_progress", "completed","open", "done", "cancelled"],
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
    doNumber: {
      type: String,
      trim: true,
      default: "",
    },
    delivered: {
      type: Boolean,
      default: false,
    },
     targetDeliveryDate: {
      type: Date,
    },
     completeDate: {
      type: Date,
    },

  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

const WorkOrder = mongoose.model("WorkOrder", workOrderSchema);

export default WorkOrder;

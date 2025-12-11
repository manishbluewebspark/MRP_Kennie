import mongoose from "mongoose";

const alertSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    // info | warning | critical | success
    priority: {
      type: String,
      enum: ["info", "warning", "critical", "success"],
      default: "info",
    },

    // work_order | inventory | purchase | production | user | mto | quote etc.
    module: {
      type: String,
      required: true,
      trim: true,
    },

    // The record this alert is connected with (WorkOrder ID, Inventory ID etc.)
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true, // faster queries
    },

    // Has user read the alert?
    isRead: {
      type: Boolean,
      default: false,
    },

    // resolved = manually fixed or system auto-fix
    isResolved: {
      type: Boolean,
      default: false,
    },

    // If alert is assigned to any user
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt
  }
);

// Indexes for fast dashboard alert lookup
alertSchema.index({ module: 1 });
alertSchema.index({ priority: 1 });
alertSchema.index({ isRead: 1 });
alertSchema.index({ isResolved: 1 });

export default mongoose.model("Alert", alertSchema);

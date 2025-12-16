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
      // enum: [
      //   "No Progress Yet",
      //   "Picking In Progress",
      //   "quality_check_done",
      //   "cable_harness_done",
      //   "qc_partial",         // QC: 1/2, 2/3 etc.
      //   "completed",          // NEW
      //   "on_hold"             // NEW
      // ],
      default: "No Progress Yet",
    }
    ,
    isProductionComplete: {
      type: Boolean,
      default: false
    },
    isTriggered: {
      type: Boolean,
      default: false,
    },
    isInProduction: {
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
    processHistory: [
      {
        _id: false, // prevent auto _id for subdocs → keeps array clean

        process: {
          type: String,
          enum: ["picking", "assembly", "quality_check", "labelling", "cable_harness"],
          required: true,
        },

        qty: {
          type: Number,
          required: true,
          default: 0
        },

        completedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },

        completedAt: {
          type: Date,
          default: null
        },

        notes: {
          type: String,
          trim: true,
          default: "",
        },

        isComplete: {
          type: Boolean,
          default: false
        },

        createdAt: {
          type: Date,
          default: () => new Date(),
        },

        details: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },
      }
    ]

  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

const WorkOrder = mongoose.model("WorkOrder", workOrderSchema);

export default WorkOrder;

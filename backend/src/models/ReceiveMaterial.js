import mongoose from "mongoose";

const receiveMaterialSchema = new mongoose.Schema(
  {
    purchaseOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
    },

    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: false,
    },

    receivedDate: {
      type: Date,
      default: Date.now,
    },

    receivedBy: {
      type: String,
      trim: true,
    },

    // 🧩 Array of items received under this PO
    items: [
      {
        mpnId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MPN",
          required: true,
        },
        receivedQty: {
          type: Number,
          required: true,
          default: 0,
        },
        rejectedQty: {
          type: Number,
          default: 0,
        },
        acceptedQty: {
          type: Number,
          default: 0,
        },
        remarks: {
          type: String,
          trim: true,
        },
        status: {
          type: String,
          enum: ["Pending", "Accepted", "Rejected", "Partially Accepted"],
          default: "Pending",
        },
      },
    ],

    grnNumber: {
      type: String,
      unique: true,
      trim: true,
    },

    overallStatus: {
      type: String,
      enum: ["Pending", "Completed", "Partially Completed"],
      default: "Pending",
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// 🧠 Auto-calculate acceptedQty for each item before saving
receiveMaterialSchema.pre("save", function (next) {
  if (this.items && Array.isArray(this.items)) {
    this.items.forEach((item) => {
      item.acceptedQty = item.receivedQty - item.rejectedQty;
      if (item.acceptedQty <= 0) item.status = "Rejected";
      else if (item.rejectedQty > 0) item.status = "Partially Accepted";
      else item.status = "Accepted";
    });
  }

  // Overall GRN status calculation
  const allAccepted = this.items.every((i) => i.status === "Accepted");
  const allRejected = this.items.every((i) => i.status === "Rejected");

  if (allAccepted) this.overallStatus = "Completed";
  else if (allRejected) this.overallStatus = "Pending";
  else this.overallStatus = "Partially Completed";

  next();
});

export default mongoose.model("ReceiveMaterial", receiveMaterialSchema);

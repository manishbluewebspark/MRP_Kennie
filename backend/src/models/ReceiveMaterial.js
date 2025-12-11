// import mongoose from "mongoose";

// const receiveMaterialSchema = new mongoose.Schema(
//   {
//     purchaseOrderId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "PurchaseOrder",
//       required: true,
//     },

//     supplierId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Supplier",
//       required: false,
//     },

//     receivedDate: {
//       type: Date,
//       default: Date.now,
//     },

//     receivedBy: {
//       type: String,
//       trim: true,
//     },

//     // 🧩 Array of items received under this PO
//     items: [
//       {
//         mpnId: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: "MPN",
//           required: true,
//         },
//         receivedQty: {
//           type: Number,
//           required: true,
//           default: 0,
//         },
//         rejectedQty: {
//           type: Number,
//           default: 0,
//         },
//         acceptedQty: {
//           type: Number,
//           default: 0,
//         },
//         remarks: {
//           type: String,
//           trim: true,
//         },
//         status: {
//           type: String,
//           enum: ["Pending", "Accepted", "Rejected", "Partially Accepted"],
//           default: "Pending",
//         },
//       },
//     ],

//  grnNumber: {
//   type: String,
//   unique: true,
//   sparse: true,   // 👈 important
// },


//     overallStatus: {
//       type: String,
//       enum: ["Pending", "Completed", "Partially Completed"],
//       default: "Pending",
//     },

//     notes: {
//       type: String,
//       trim: true,
//     },
//   },
//   { timestamps: true }
// );

// // 🧠 Auto-calculate acceptedQty for each item before saving
// receiveMaterialSchema.pre("save", function (next) {
//   if (this.items && Array.isArray(this.items)) {
//     this.items.forEach((item) => {
//       item.acceptedQty = item.receivedQty - item.rejectedQty;
//       if (item.acceptedQty <= 0) item.status = "Rejected";
//       else if (item.rejectedQty > 0) item.status = "Partially Accepted";
//       else item.status = "Accepted";
//     });
//   }

//   // Overall GRN status calculation
//   const allAccepted = this.items.every((i) => i.status === "Accepted");
//   const allRejected = this.items.every((i) => i.status === "Rejected");

//   if (allAccepted) this.overallStatus = "Completed";
//   else if (allRejected) this.overallStatus = "Pending";
//   else this.overallStatus = "Partially Completed";

//   next();
// });

// export default mongoose.model("ReceiveMaterial", receiveMaterialSchema);

// models/ReceiveMaterial.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const receiveMaterialItemSchema = new Schema(
  {
    mpnId: {
      type: Schema.Types.ObjectId,
      ref: "MPN",
      required: true,
    },

    // is GRN ke liye
    receivedQty: { type: Number, required: true, default: 0 },
    rejectedQty: { type: Number, default: 0 },
    acceptedQty: { type: Number, default: 0 }, // pre('save') me auto set

    // PO items ka reference (line level)
    itemId: {
      type: Schema.Types.ObjectId, // PurchaseOrder.items ka _id
    },

    // CUMULATIVE totals for that PO line (calculated in controller)
    receivedQtyTotal: { type: Number, default: 0 },  // PO line total received (till now)
    rejectedQtyTotal: { type: Number, default: 0 },  // PO line total rejected
    pendingQty:       { type: Number, default: 0 },  // PO line pending = qty - totalAccepted

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected", "Partially Accepted"],
      default: "Pending",
    },
  },
  { _id: false }
);

const receiveMaterialSchema = new Schema(
  {
    purchaseOrderId: {
      type: Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
    },

    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: false,
    },

    grnNumber: {
      type: String,
      unique: true,
      sparse: true, // important
    },

    receivedDate: {
      type: Date,
      default: Date.now,
    },

    receivedBy: {
      type: String,
      trim: true,
    },

    items: [receiveMaterialItemSchema],

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

// 🧠 Auto-calc acceptedQty & item.status & overallStatus
receiveMaterialSchema.pre("save", function (next) {
  if (this.items && Array.isArray(this.items)) {
    this.items.forEach((item) => {
      const received = Number(item.receivedQty || 0);
      const rejected = Number(item.rejectedQty || 0);
      const accepted = Math.max(received - rejected, 0);

      item.acceptedQty = accepted;

      if (accepted <= 0 && rejected > 0) {
        item.status = "Rejected";
      } else if (accepted > 0 && rejected > 0) {
        item.status = "Partially Accepted";
      } else if (accepted > 0 && rejected === 0) {
        item.status = "Accepted";
      } else {
        item.status = "Pending";
      }
    });
  }

  const allAccepted =
    this.items.length > 0 &&
    this.items.every((i) => i.status === "Accepted");

  const allRejected =
    this.items.length > 0 &&
    this.items.every((i) => i.status === "Rejected");

  if (allAccepted) this.overallStatus = "Completed";
  else if (allRejected) this.overallStatus = "Pending";
  else this.overallStatus = "Partially Completed";

  next();
});

export default model("ReceiveMaterial", receiveMaterialSchema);


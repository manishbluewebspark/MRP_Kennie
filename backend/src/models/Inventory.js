// // models/Inventory.js
// import mongoose from "mongoose";

// const inventorySchema = new mongoose.Schema({
//     mpnId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "MPN",
//         required: true
//     },
//     balanceQuantity: {
//         type: Number,
//         default: 0
//     },
//      incomingQuantity: {
//         type: Number,
//         default: 0
//     },
//     location: {
//         type: String,
//         default: "Main Warehouse"
//     },
//     lastUpdated: {
//         type: Date,
//         default: Date.now
//     },
//     stockStatus: {
//         type: String,
//         enum: ["In Stock", "Low Stock", "Out of Stock"],
//         default: "Out of Stock"
//     },
// }, { timestamps: true });

// export default mongoose.model("Inventory", inventorySchema);

// models/Inventory.js
import mongoose from "mongoose";


const round = (num) => Number(num.toFixed(6));

const adjustmentLogSchema = new mongoose.Schema({
  adjustmentQuantity: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  adjustedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  previousBalance: {
    type: Number,
    required: true
  },
  newBalance: {
    type: Number,
    required: true
  },
  adjustmentType: {
    type: String,
    enum: ["INCREASE", "DECREASE", "ADJUSTMENT"],
    required: true
  },
  adjustmentDate: {
    type: Date,
    default: Date.now
  },
}, { timestamps: true });

const inventorySchema = new mongoose.Schema({
  mpnId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MPNLibrary",
    required: true
  },
  balanceQuantity: {
    type: Number,
    default: 0
  },
  incomingQuantity: {
    type: Number,
    default: 0
  },
  location: {
    type: String,
    default: ""
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  stockStatus: {
    type: String,
    enum: ["In Stock", "Low Stock", "Out of Stock"],
    default: "Out of Stock"
  },
  adjustmentLogs: [adjustmentLogSchema], // ✅ Array of adjustment logs
  totalAdjustments: {
    type: Number,
    default: 0
  },
  workOrders: [
    {
      workOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WorkOrder",
        required: true
      },

      workOrderNo: {
        type: String,
        required: true
      },

      drawingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Drawing",
        required: true
      },

      requiredQty: {
        type: Number,
        required: true
      },
      pickedQty: {
        type: Number,
        required: true
      },

      needDate: {
        type: Date
      },
      reason: {
        type: String,
        default: ""
      },

      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, {
  timestamps: true
});


// ✅ Auto-update stockStatus based on balanceQuantity
inventorySchema.pre('save', function (next) {
  if (this.balanceQuantity > 10) {
    this.stockStatus = "In Stock";
  } else if (this.balanceQuantity > 0 && this.balanceQuantity <= 10) {
    this.stockStatus = "Low Stock";
  } else {
    this.stockStatus = "Out of Stock";
  }
  this.lastUpdated = new Date();
  next();
});

// ✅ Static method to adjust inventory
inventorySchema.statics.adjustInventory = async function (
  inventoryId,
  adjustmentQuantity,
  reason,
  adjustedBy
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const inventory = await this.findById(inventoryId).session(session);

    if (!inventory) {
      throw new Error('Inventory item not found');
    }

const previousBalance = Number(inventory.balanceQuantity || 0);

const EPSILON = 0.00001;

let newBalance = previousBalance + adjustmentQuantity;

if (Math.abs(newBalance) < EPSILON) {
  newBalance = 0;
}

if (newBalance < -EPSILON) {
  throw new Error(
    `Cannot adjust below zero. Current: ${previousBalance}, Adjustment: ${adjustmentQuantity}`
  );
}

inventory.balanceQuantity = Number(newBalance.toFixed(6));

    // Add adjustment log
   inventory.adjustmentLogs.push({
  adjustmentQuantity: Number(adjustmentQuantity.toFixed(6)),
  reason,
  adjustedBy,
  previousBalance: Number(previousBalance.toFixed(6)),
  newBalance,
  adjustmentType:
    adjustmentQuantity > 0
      ? "INCREASE"
      : adjustmentQuantity < 0
      ? "DECREASE"
      : "ADJUSTMENT",
});

    // Increment total adjustments counter
    inventory.totalAdjustments += 1;

    await inventory.save({ session });
    await session.commitTransaction();

    return {
      inventory,
      adjustment: inventory.adjustmentLogs[inventory.adjustmentLogs.length - 1]
    };

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ✅ Instance method to add adjustment
inventorySchema.methods.addAdjustment = function (
  adjustmentQuantity,
  reason,
  adjustedBy
) {

  const previousBalance = Number(this.balanceQuantity || 0);

  // Round to 6 decimals after calculation
  let newBalance = Number(
    (previousBalance + adjustmentQuantity).toFixed(6)
  );

  // Remove floating-point residue
  if (Math.abs(newBalance) < 0.000001) {
    newBalance = 0;
  }

  // Prevent going below zero
  if (newBalance < 0) {
    throw new Error(
      `Cannot adjust below zero. Current: ${previousBalance}, Adjustment: ${adjustmentQuantity}`
    );
  }

  this.balanceQuantity = newBalance;

  // Add to logs
 this.adjustmentLogs.push({
  adjustmentQuantity: Number(adjustmentQuantity.toFixed(6)),
  reason,
  adjustedBy,
  previousBalance: Number(previousBalance.toFixed(6)),
  newBalance,
  adjustmentType:
    adjustmentQuantity > 0
      ? "INCREASE"
      : adjustmentQuantity < 0
      ? "DECREASE"
      : "ADJUSTMENT",
});

  this.totalAdjustments += 1;

  return this.save();
};

// ✅ Virtual for latest adjustment
inventorySchema.virtual('latestAdjustment').get(function () {
  if (this.adjustmentLogs.length === 0) return null;
  return this.adjustmentLogs[this.adjustmentLogs.length - 1];
});

// ✅ Index for better performance
inventorySchema.index({ mpnId: 1 });
inventorySchema.index({ "adjustmentLogs.adjustmentDate": -1 });
inventorySchema.index({ stockStatus: 1 });

export default mongoose.model("Inventory", inventorySchema);

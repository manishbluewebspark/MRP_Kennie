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
    default: "Main Warehouse"
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
    pickedQty:{
        type: Number,
      required: true
    },

    needDate: {
      type: Date
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

    const previousBalance = inventory.balanceQuantity;
    const newBalance = previousBalance + adjustmentQuantity;

    if (newBalance < 0) {
      throw new Error(`Cannot adjust below zero. Current: ${previousBalance}, Adjustment: ${adjustmentQuantity}`);
    }

    // Update balance quantity
    inventory.balanceQuantity = newBalance;

    // Add adjustment log
    inventory.adjustmentLogs.push({
      adjustmentQuantity,
      reason,
      adjustedBy,
      previousBalance,
      newBalance,
      adjustmentType: adjustmentQuantity > 0 ? "INCREASE" : adjustmentQuantity < 0 ? "DECREASE" : "ADJUSTMENT"
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
  const previousBalance = this.balanceQuantity;
  const newBalance = previousBalance + adjustmentQuantity;

  if (newBalance < 0) {
    throw new Error(`Cannot adjust below zero. Current: ${previousBalance}, Adjustment: ${adjustmentQuantity}`);
  }

  // Update balance
  this.balanceQuantity = newBalance;

  // Add to logs
  this.adjustmentLogs.push({
    adjustmentQuantity,
    reason,
    adjustedBy,
    previousBalance,
    newBalance,
    adjustmentType: adjustmentQuantity > 0 ? "INCREASE" : adjustmentQuantity < 0 ? "DECREASE" : "ADJUSTMENT"
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

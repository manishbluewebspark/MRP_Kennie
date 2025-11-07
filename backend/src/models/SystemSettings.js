import mongoose from "mongoose";

const systemSettingsSchema = new mongoose.Schema(
  {
    alertSettings: {
      purchaseAlertTrigger: { type: Number, default: 0 }, // weeks before committed date
      receivingWindow: { type: Number, default: 0 }, // days before need date
      workOrderAlertTrigger: { type: Number, default: 0 }, // days before commit date
      noCommitDateAlertTrigger: { type: Number, default: 0 }, // days after PO sent
    },
    gstSettings: {
      gstPercentage: { type: Number, default: 0 },
    },
    workOrderSettings: {
      needDateCalculation: { type: Number, default: 0 }, // weeks before commit date
      workOrderAlertTrigger: { type: Number, default: 0 }, // days before commit date
    },
    currencySettings: {
      activeCurrencies: [{ type: String }], // e.g., ["SGD", "USD"]
      inactiveCurrencies: [{ type: String }], // e.g., ["EUR", "RMB"]
      defaultCurrency: { type: String, default: "USD" },
      exchangeRatesToUSD: {
        SGD: { type: Number, default: 0 },
        EUR: { type: Number, default: 0 },
        RMB: { type: Number, default: 0 },
      },
      exchangeRatesToSGD: {
        USD: { type: Number, default: 0 },
        EUR: { type: Number, default: 0 },
        RMB: { type: Number, default: 0 },
      },
    },
    inventoryAlerts: {
      criticalWeeksLeft: { type: Number, default: 0 }, // Critical Alert - RED
      urgentWeeksLeft: { type: Number, default: 0 }, // Urgent Alert - AMBER
      normalWeeksLeft: { type: Number, default: 0 }, // Normal Alert - GREEN
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

const SystemSettings = mongoose.model("SystemSettings", systemSettingsSchema);
export default SystemSettings;

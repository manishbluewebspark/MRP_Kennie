import WorkOrder from "../models/WorkingOrders.js";
import Inventory from "../models/Inventory.js";
import PurchaseOrders from "../models/PurchaseOrders.js";
import Alert from "../models/Alert.js";

// ✅ System Check
export const getSystemCheck = async (req, res) => {
  try {
    return res.json({
      success: true,
      status: "online",
      message: "API system running",
      serverTime: new Date().toISOString(),
      env: process.env.NODE_ENV || "development",
      uptimeSec: Math.floor(process.uptime()),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------------------
// ✅ Summary API (single call)
// ------------------------------
export const getDashboardSummary = async (req, res) => {
  try {
    const [workOrders, inventory, purchase, alerts] = await Promise.all([
      buildWorkOrderStats(),
      buildInventoryStats(),
      buildPurchaseStats(),
      buildAlertsStats(),
    ]);

    return res.json({
      success: true,
      message: "Dashboard summary fetched",
      data: {
        workOrders,
        inventory,
        purchase,
        alerts,
      },
    });
  } catch (err) {
    console.error("getDashboardSummary error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------------------
// ✅ Work Orders Stats
// ------------------------------
export const getDashboardWorkOrderStats = async (req, res) => {
  try {
    const stats = await buildWorkOrderStats();
    return res.json({ success: true, data: stats });
  } catch (err) {
    console.error("getDashboardWorkOrderStats error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const buildWorkOrderStats = async () => {
  // Change these status values according to your system
  const completedStatuses = ["completed", "done"];
  const inProductionQuery = { isInProduction: true, isProductionComplete: { $ne: true } };

  const [
    total,
    inProduction,
    completed,
    noProgress,
    delayed,
  ] = await Promise.all([
    WorkOrder.countDocuments({}),
    WorkOrder.countDocuments(inProductionQuery),
    WorkOrder.countDocuments({ status: { $in: completedStatuses } }),
    WorkOrder.countDocuments({ status: "No Progress Yet" }),
    // delayed: commitDate past but not completed
    WorkOrder.countDocuments({
      commitDate: { $ne: null, $lt: new Date() },
      status: { $nin: completedStatuses },
    }),
  ]);

  // Status breakdown (group)
  const statusBreakdownAgg = await WorkOrder.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const statusBreakdown = statusBreakdownAgg.reduce((acc, x) => {
    acc[x._id || "unknown"] = x.count;
    return acc;
  }, {});

  return {
    total,
    inProduction,
    completed,
    noProgress,
    delayed,
    statusBreakdown,
  };
};

// ------------------------------
// ✅ Inventory Stats
// ------------------------------
export const getDashboardInventoryStats = async (req, res) => {
  try {
    const stats = await buildInventoryStats();
    return res.json({ success: true, data: stats });
  } catch (err) {
    console.error("getDashboardInventoryStats error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const buildInventoryStats = async () => {
  const [totalSkus, inStock, lowStock, outOfStock, shortages] = await Promise.all([
    Inventory.countDocuments({}),
    Inventory.countDocuments({ stockStatus: "In Stock" }),
    Inventory.countDocuments({ stockStatus: "Low Stock" }),
    Inventory.countDocuments({ stockStatus: "Out of Stock" }),
    // shortages = workOrders array exist
    Inventory.countDocuments({ "workOrders.0": { $exists: true } }),
  ]);

  return {
    totalSkus,
    inStock,
    lowStock,
    outOfStock,
    shortages,
  };
};

// ------------------------------
// ✅ Purchase Order Stats
// ------------------------------
export const getDashboardPurchaseStats = async (req, res) => {
  try {
    const stats = await buildPurchaseStats();
    return res.json({ success: true, data: stats });
  } catch (err) {
    console.error("getDashboardPurchaseStats error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const buildPurchaseStats = async () => {
  // Adjust statuses based on your DB
  const [total, emailed, pending, closed, overdueCommit] = await Promise.all([
    PurchaseOrders.countDocuments({ isDeleted: { $ne: true } }),
    PurchaseOrders.countDocuments({ status: "Emailed", isDeleted: { $ne: true } }),
    PurchaseOrders.countDocuments({ status: { $in: ["Pending", "Pending Emailed"] }, isDeleted: { $ne: true } }),
    PurchaseOrders.countDocuments({ status: "Closed", isDeleted: { $ne: true } }),
    // overdue commit: any item committedDate < today & item still pending
    PurchaseOrders.countDocuments({
      isDeleted: { $ne: true },
      items: {
        $elemMatch: {
          committedDate: { $ne: null, $lt: new Date() },
          status: { $ne: "Closed" },
        },
      },
    }),
  ]);

  return {
    total,
    emailed,
    pending,
    closed,
    overdueCommit,
  };
};

// ------------------------------
// ✅ Alerts Stats
// ------------------------------
export const getDashboardAlertsStats = async (req, res) => {
  try {
    const stats = await buildAlertsStats();
    return res.json({ success: true, data: stats });
  } catch (err) {
    console.error("getDashboardAlertsStats error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const buildAlertsStats = async () => {
  const [total, unread, critical, resolved] = await Promise.all([
    Alert.countDocuments({}),
    Alert.countDocuments({ isRead: false }),
    Alert.countDocuments({ priority: "critical", isResolved: false }),
    Alert.countDocuments({ isResolved: true }),
  ]);

  return {
    total,
    unread,
    critical,
    resolved,
  };
};

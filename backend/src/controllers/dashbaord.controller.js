import WorkOrder from "../models/WorkingOrders.js";
import Inventory from "../models/Inventory.js";
import PurchaseOrders from "../models/PurchaseOrders.js";
import Alert from "../models/Alert.js";

// helper
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const diffDays = (futureDate, fromDate = new Date()) => {
  if (!futureDate) return null;
  const a = startOfDay(futureDate).getTime();
  const b = startOfDay(fromDate).getTime();
  return Math.ceil((a - b) / (1000 * 60 * 60 * 24));
};


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
    const alerts = await Alert.find({
      isDeleted: { $ne: true },
      // optional: user specific
      // assignedTo: req.user._id,
    })
      .sort({ createdAt: -1 }) // ✅ newest first
      .limit(5)                // ✅ only latest 5
      .lean();

    return res.json({
      success: true,
      data: alerts,
    });
  } catch (err) {
    console.error("getDashboardAlertsStats error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


export const getDashboardCardsStats = async (req, res) => {
  try {
    // ✅ Active Work Orders
    const activeWorkOrdersCount = await WorkOrder.countDocuments({
      isInProduction: true,
      isProductionComplete: false,
      isDeleted: { $ne: true }, // optional but recommended
    });

    // only unread alerts (important for dashboard)
    const baseAlertFilter = {
      // isRead: { $ne: true },
      // isDeleted: { $ne: true },
    };

    // Urgent = critical + warning
    const urgentActions = await Alert.countDocuments({
      ...baseAlertFilter,
      priority: { $in: ["critical", "warning"] },
    });

    // Attention Required = only warning
    const attentionRequired = await Alert.countDocuments({
      ...baseAlertFilter,
      priority: "warning",
    });

    return res.json({
      success: true,
      data: {
        activeWorkOrders: activeWorkOrdersCount,
        urgentActions,
        attentionRequired
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
    });
  }
};

export const getProductionDashboard = async (req, res) => {
  try {
    const now = new Date();

    // ✅ active WOs
    const activeFilter = {
      isInProduction: true,
      isProductionComplete: false,
      isDeleted: { $ne: true },
    };

    const [activeCount, delayedCount, completedTodayCount, activeList] =
      await Promise.all([
        WorkOrder.countDocuments(activeFilter),

        // delayed = commitDate < today and not complete
        WorkOrder.countDocuments({
          ...activeFilter,
          commitDate: { $lt: startOfDay(now) },
        }),

        // completed today
        WorkOrder.countDocuments({
          isProductionComplete: true,
          isDeleted: { $ne: true },
          completeDate: { $gte: startOfDay(now) },
        }),

        // list for table
        WorkOrder.find(activeFilter)
          .select(
            "_id workOrderNo workOrderNumber woNumber status projectType commitDate quantity processHistory assignedTo createdAt"
          )
          .sort({ updatedAt: -1 })
          .limit(50)
          .lean(),
      ]);

    // ✅ Map list to include stage percentages (frontend-friendly)
    const list = activeList.map((wo) => {
      // basic stage qty from processHistory
      const ph = Array.isArray(wo.processHistory) ? wo.processHistory : [];
      const qty = Number(wo.quantity || 0);

      const getStageQty = (key) =>
        Number(ph.find((p) => p.process === key)?.qty || 0);

      const pct = (done) => (qty > 0 ? Math.min(100, Math.round((done / qty) * 100)) : 0);

      // box_build has no labelling (as you already handled)
      const isBoxBuild = wo.projectType === "box_build";

      const pickingQty = getStageQty("picking");
      const assemblyKey = "assembly"; // (if you use cable_harness also keep same key)
      const assemblyQty = getStageQty(assemblyKey);
      const labellingQty = getStageQty("labelling");
      const qcQty = getStageQty("qc");

      const stagePercent = {
        picking: pct(pickingQty),
        assembly: pct(assemblyQty),
        labelling: isBoxBuild ? null : pct(labellingQty),
        qc: pct(qcQty),
      };

      return {
        ...wo,
        workOrderNoDisplay: wo.workOrderNo || wo.workOrderNumber || wo.woNumber || wo._id,
        daysToCommit: diffDays(wo.commitDate, now), // can be negative if overdue
        stagePercent,
      };
    });

    return res.json({
      success: true,
      data: {
        cards: {
          activeInProduction: activeCount,
          delayedWorkOrders: delayedCount,
          completedToday: completedTodayCount,
        },
        list,
      },
    });
  } catch (err) {
    console.error("getProductionDashboard error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


const daysSince = (pastDate, fromDate = new Date()) => {
  const a = startOfDay(fromDate).getTime();
  const b = startOfDay(pastDate).getTime();
  return Math.floor((a - b) / (1000 * 60 * 60 * 24));
};

export const getPurchaseFollowUps = async (req, res) => {
  try {
    // ✅ kitne din se pending hai = threshold
    const thresholdDays = Number(req.query.days || 3); // default 3 days

    const pos = await PurchaseOrders.find({
      isDeleted: { $ne: true },
      status: { $in: ["Pending", "Created", "Draft"] }, // adjust to your statuses
    })
      .select("_id poNumber status supplier poDate updatedAt needDate")
      .sort({ createdAt: 1 }) // oldest first
      .limit(10)
      .lean();

    const list = pos
      .map((po) => {
        const baseDate = po.poDate;
        const ageDays = baseDate ? daysSince(baseDate) : 0;

        return {
          ...po,
          ageDays,
          actionText:
            ageDays >= thresholdDays
              ? `Pending for ${ageDays} days — email the supplier for an update`
              : "Monitoring",
          isAttention: ageDays >= thresholdDays,
        };
      })
      // ✅ only show old ones first; still keep list small
      .sort((a, b) => b.isAttention - a.isAttention || b.ageDays - a.ageDays);

    return res.json({
      success: true,
      data: {
        thresholdDays,
        items: list,
      },
    });
  } catch (err) {
    console.error("getPurchaseFollowUps error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

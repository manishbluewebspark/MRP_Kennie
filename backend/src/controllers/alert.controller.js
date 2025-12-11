// controllers/alertController.js

import Alert from "../models/Alert.js";


// GET /alerts
export const getAllAlerts = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 20,
      module,
      priority,
      isRead,
      isResolved,
      assignedTo,  // "me" ya userId
      search,
    } = req.query;

    page = Number(page) || 1;
    limit = Number(limit) || 20;

    const query = {};

    if (module) query.module = module;
    if (priority) query.priority = priority;

    if (isRead === "true") query.isRead = true;
    if (isRead === "false") query.isRead = false;

    if (isResolved === "true") query.isResolved = true;
    if (isResolved === "false") query.isResolved = false;

    // assignedTo = "me" => logged-in user
    if (assignedTo === "me" && req.user?._id) {
      query.assignedTo = req.user._id;
    } else if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [alerts, total] = await Promise.all([
      Alert.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Alert.countDocuments(query),
    ]);

    return res.json({
      success: true,
      message: "Alerts fetched successfully",
      data: alerts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error getAllAlerts:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// GET /alerts/:id
export const getAlertById = async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await Alert.findById(id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    return res.json({
      success: true,
      message: "Alert fetched",
      data: alert,
    });
  } catch (err) {
    console.error("Error getAlertById:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// POST /alerts  (manual create – optional, but useful)
export const createAlert = async (req, res) => {
  try {
    const {
      title,
      message,
      priority = "info",
      module,
      relatedId,
      assignedTo,
    } = req.body;

    if (!title || !message || !module || !relatedId) {
      return res.status(400).json({
        success: false,
        message: "title, message, module, relatedId are required",
      });
    }

    const alert = await Alert.create({
      title,
      message,
      priority,
      module,
      relatedId,
      assignedTo: assignedTo || null,
    });

    return res.status(201).json({
      success: true,
      message: "Alert created",
      data: alert,
    });
  } catch (err) {
    console.error("Error createAlert:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// PATCH /alerts/:id/read
export const markAlertRead = async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await Alert.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    return res.json({
      success: true,
      message: "Alert marked as read",
      data: alert,
    });
  } catch (err) {
    console.error("Error markAlertRead:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// PATCH /alerts/:id/unread
export const markAlertUnread = async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await Alert.findByIdAndUpdate(
      id,
      { isRead: false },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    return res.json({
      success: true,
      message: "Alert marked as unread",
      data: alert,
    });
  } catch (err) {
    console.error("Error markAlertUnread:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// PATCH /alerts/:id/resolve
export const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const update = {
      isResolved: true,
      resolvedAt: new Date(),
    };

    const alert = await Alert.findByIdAndUpdate(id, update, { new: true });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    return res.json({
      success: true,
      message: "Alert resolved",
      data: alert,
    });
  } catch (err) {
    console.error("Error resolveAlert:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// PATCH /alerts/:id/unresolve
export const unresolveAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await Alert.findByIdAndUpdate(
      id,
      { isResolved: false, resolvedAt: null },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    return res.json({
      success: true,
      message: "Alert marked as unresolved",
      data: alert,
    });
  } catch (err) {
    console.error("Error unresolveAlert:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// PATCH /alerts/mark-all-read
export const markAllAlertsRead = async (req, res) => {
  try {
    const filter = {};
    const { module, priority, assignedTo } = req.body || {};

    if (module) filter.module = module;
    if (priority) filter.priority = priority;

    if (assignedTo === "me" && req.user?._id) {
      filter.assignedTo = req.user._id;
    } else if (assignedTo) {
      filter.assignedTo = assignedTo;
    }

    const result = await Alert.updateMany(filter, { isRead: true });

    return res.json({
      success: true,
      message: `Marked ${result.modifiedCount || result.nModified || 0} alerts as read`,
    });
  } catch (err) {
    console.error("Error markAllAlertsRead:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

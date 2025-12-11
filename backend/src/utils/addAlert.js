// utils/addAlert.js

import Alert from "../models/Alert";


/**
 * Global helper to create alerts anywhere in the system.
 *
 * @param {Object} payload
 * @param {String} payload.title - Short title of alert
 * @param {String} payload.message - Full message
 * @param {String} [payload.priority="info"] - info | warning | critical | success
 * @param {String} payload.module - work_order | inventory | purchase | production | etc.
 * @param {ObjectId} payload.relatedId - ID of linked document
 * @param {ObjectId} [payload.assignedTo] - Assign alert to user
 *
 * @returns {Object} created alert
 */
export const addAlert = async ({
  title,
  message,
  priority = "info",
  module,
  relatedId,
  assignedTo = null,
}) => {
  try {
    if (!title || !message || !module || !relatedId) {
      throw new Error("Missing fields for creating alert");
    }

    const alert = await Alert.create({
      title,
      message,
      priority,
      module,
      relatedId,
      assignedTo,
    });

    return alert;
  } catch (err) {
    console.error("Error creating alert:", err.message);
    throw err;
  }
};

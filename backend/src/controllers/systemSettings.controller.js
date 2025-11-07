import SystemSettings from "../models/SystemSettings.js";


// Create or Update (single API)
export const addOrUpdateSystemSettings = async (req, res) => {
  try {
    const settingsData = req.body;
    const userId = req.user?.id || null; // optional createdBy

    // Check if settings exist
    let settings = await SystemSettings.findOne();
    if (settings) {
      // Update existing
      Object.assign(settings, settingsData);
      settings.createdBy = userId;
      await settings.save();
      return res.json({ success: true, message: "Settings updated successfully", data: settings });
    } else {
      // Create new
      settings = await SystemSettings.create({ ...settingsData, createdBy: userId });
      return res.json({ success: true, message: "Settings created successfully", data: settings });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get current settings
export const getSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.findOne();
    if (!settings) {
      return res.status(404).json({ success: false, message: "No settings found" });
    }
    return res.json({ success: true, data: settings });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

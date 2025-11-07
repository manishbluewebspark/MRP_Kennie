import PurchaseSettings from "../models/PurchaseSettings.js";


/**
 * Get all purchase settings (with optional search by address name)
 */
export const getAllPurchaseSettings = async (req, res) => {
  try {
    const { search = "" } = req.query;

    const query = { isDeleted: false };
    if (search) {
      query["addresses.name"] = { $regex: search, $options: "i" };
    }

    const settings = await PurchaseSettings.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get a single purchase setting by ID
 */
export const getPurchaseSettingById = async (req, res) => {
  try {
    const { id } = req.params;
    const setting = await PurchaseSettings.findById(id);
    if (!setting || setting.isDeleted) {
      return res.status(404).json({ success: false, error: "Purchase setting not found" });
    }
    res.status(200).json({ success: true, data: setting });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Add a new purchase setting or update existing (if ID provided)
 */
export const addOrUpdatePurchaseSetting = async (req, res) => {
  try {
    const { addresses, termsConditions, status } = req.body;

    // Fetch the first (and only) existing document
    let existing = await PurchaseSettings.findOne();

    if (existing) {
      // Update existing
      existing.addresses = addresses || existing.addresses;
      existing.termsConditions = termsConditions || existing.termsConditions;
      existing.status = status || existing.status;
      await existing.save();

      return res.status(200).json({
        success: true,
        data: existing,
        message: "Purchase settings updated successfully",
      });
    } else {
      // Create new only once
      const newSetting = await PurchaseSettings.create({
        addresses,
        termsConditions,
        status: status || "Active",
      });

      return res.status(201).json({
        success: true,
        data: newSetting,
        message: "Purchase settings created successfully",
      });
    }
  } catch (error) {
    console.error("Error in addOrUpdatePurchaseSetting:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};


/**
 * Soft delete a purchase setting
 */
// DELETE /purchase-settings/:settingId/address/:addressId
export const deletePurchaseSetting = async (req, res) => {
  try {
    const { settingId, addressId } = req.params;

    const setting = await PurchaseSettings.findById(settingId);
    if (!setting) {
      return res.status(404).json({ success: false, error: 'Purchase setting not found' });
    }

    const originalLength = setting.addresses.length;
    setting.addresses = setting.addresses.filter(
      (addr) => addr._id.toString() !== addressId
    );

    if (setting.addresses.length === originalLength) {
      return res.status(404).json({ success: false, error: 'Address not found' });
    }

    await setting.save();

    res.status(200).json({ success: true, data: setting });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};



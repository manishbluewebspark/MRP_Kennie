import UOM from "../models/UOM.js";


// Add UOM
export const addUOM = async (req, res) => {
  try {
    const uom = new UOM(req.body);
    await uom.save();
    res.status(201).json({ success: true, data: uom });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Get all UOMs
export const getAllUOMs = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", sortBy = "createdAt", sortOrder = "desc" } = req.query;

    const query = { isDeleted: false };
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const total = await UOM.countDocuments(query);

    const uoms = await UOM.find(query)
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, data: uoms,pagination:{
      total, page, limit
    } });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Get UOM by ID
export const getUOMById = async (req, res) => {
  try {
    const uom = await UOM.findById(req.params.id);
    if (!uom || uom.isDeleted)
      return res.status(404).json({ success: false, error: "UOM not found" });
    res.json({ success: true, data: uom });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Update UOM
export const updateUOM = async (req, res) => {
  try {
    const uom = await UOM.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!uom) return res.status(404).json({ success: false, error: "UOM not found" });
    res.json({ success: true, data: uom });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Delete UOM
export const deleteUOM = async (req, res) => {
  try {
    const uom = await UOM.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
    if (!uom) return res.status(404).json({ success: false, error: "UOM not found" });
    res.json({ success: true, data: uom });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

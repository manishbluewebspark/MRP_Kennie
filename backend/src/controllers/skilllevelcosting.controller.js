import SkillLevelCosting from "../models/SkillLevelCosting.js";

// ➕ Add Skill Level Costing
export const addSkillLevelCosting = async (req, res) => {
  try {
    const costing = await SkillLevelCosting.create({
      ...req.body,
      createdBy: req.user?._id, // optional
    });

    res.status(201).json({
      success: true,
      message: "Skill level costing added successfully",
      data: costing,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✏️ Update Skill Level Costing
export const updateSkillLevelCosting = async (req, res) => {
  try {
    const { id } = req.params;
    const costing = await SkillLevelCosting.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!costing)
      return res.status(404).json({ success: false, message: "Costing not found" });

    res.json({
      success: true,
      message: "Skill level costing updated successfully",
      data: costing,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🗑️ Delete Skill Level Costing
export const deleteSkillLevelCosting = async (req, res) => {
  try {
    const { id } = req.params;
    const costing = await SkillLevelCosting.findByIdAndDelete(id);

    if (!costing)
      return res.status(404).json({ success: false, message: "Costing not found" });

    res.json({
      success: true,
      message: "Skill level costing deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 📄 Get All (with Pagination, Search, Sorting)
export const getAllSkillLevelCostings = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {
      ...(search && {
        $or: [
          { skillLevelName: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      }),
    };

    const total = await SkillLevelCosting.countDocuments(query);
    const costings = await SkillLevelCosting.find(query)
      .populate("currencyType", "code")
      .populate("type", "code name")
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      pagination:{
        total,
      page: Number(page),
      limit: Number(limit),
      },
      data: costings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔍 Get by ID
export const getSkillLevelCostingById = async (req, res) => {
  try {
    const { id } = req.params;
    const costing = await SkillLevelCosting.findById(id);

    if (!costing)
      return res.status(404).json({ success: false, message: "Costing not found" });

    res.json({
      success: true,
      data: costing,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

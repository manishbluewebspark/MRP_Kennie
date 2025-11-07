import Project from "../models/Project.js";
import mongoose from "mongoose";

// Create Project
export const createProject = async (req, res) => {
  try {
    const { projectName, customerId, currency, description} = req.body;
    const createdBy = req.user.id;
    const project = await Project.create({
      projectName,
      customerId,
      currency,
      description,
      createdBy,
    });

    res.status(201).json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update Project
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid project id" });
    }

    const project = await Project.findByIdAndUpdate(
      id,
      { ...req.body, updatedBy: req.body.updatedBy },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete Project (Soft Delete)
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid project id" });
    }

    const project = await Project.findByIdAndUpdate(
      id,
      { isDeleted: new Date(), updatedBy: req.body.updatedBy },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    res.json({ success: true, message: "Project deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get All Projects (filter + search + pagination)
export const getAllProjects = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", customerId, isActive } = req.query;

    const query = { isDeleted: null };

    if (search) {
      query.projectName = { $regex: search, $options: "i" };
    }
    if (customerId) {
      query.customerId = customerId;
    }
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate("customerId")
         .populate("currency", "code name symbol")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      Project.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: projects,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get Project By Id
export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid project id" });
    }

    const project = await Project.findById(id).populate("customerId");

    if (!project || project.isDeleted) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

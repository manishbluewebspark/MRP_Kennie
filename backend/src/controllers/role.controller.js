import Role from "../models/Role.js";

// ===== Create Role =====
export const createRole = async (req, res) => {
  try {
    const { name, permissions } = req.body;

    const existing = await Role.findOne({ name });
    if (existing) return res.status(400).json({ message: "Role already exists" });

    const role = await Role.create({ name, permissions });
    res.status(201).json({ message: "Role created", role });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== Update Role =====
export const updateRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { name, permissions } = req.body;

    const role = await Role.findById(roleId);
    if (!role) return res.status(404).json({ message: "Role not found" });

    if (name) role.name = name;
    if (permissions) role.permissions = permissions;

    await role.save();
    res.json({ message: "Role updated", role });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== Delete Role =====
export const deleteRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const role = await Role.findByIdAndDelete(roleId);
    if (!role) return res.status(404).json({ message: "Role not found" });

    res.json({ message: "Role deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== Get Single Role =====
export const getRoleById = async (req, res) => {
  try {
    const { roleId } = req.params;
    const role = await Role.findById(roleId);
    if (!role) return res.status(404).json({ message: "Role not found" });

    res.json({ role });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== Get All Roles =====
export const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ name: 1 }); // alphabetical
    res.status(200).json({
      success: true,
      message: "Roles fetched successfully",
      data: { roles }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

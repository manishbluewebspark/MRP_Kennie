import User from "../models/User.js";
import Role from "../models/Role.js";
import bcrypt from "bcryptjs";

// ===== Create User =====
// export const createUser = async (req, res) => {
//   try {
//     const { username, tempPassword,name, email, primaryRole, permissions } = req.body;

//     // check duplicate username
//     const existing = await User.findOne({ username });
//     console.log('-------existing',existing)
//     if (existing) {
//       return res.status(400).json({ message: "Username already exists" });
//     }

//     // check role
//     const role = await Role.findOne({ name: primaryRole });
//     if (!role) {
//       return res.status(400).json({ message: "Invalid role" });
//     }

//     let flattenedPermissions = [];
//     if (permissions && typeof permissions === "object") {
//       for (const moduleKey in permissions) {
//         const actions = permissions[moduleKey];
//         if (Array.isArray(actions)) {
//           actions.forEach((action) => {
//             flattenedPermissions.push(`${moduleKey}:${action}`);
//           });
//         }
//       }
//     }

//     // hash temp password
//     const hashedPassword = await bcrypt.hash(tempPassword, 10);

//     // create user
//     const user = await User.create({
//       userName:username,
//       name,
//       email,
//       password: hashedPassword,
//       tempPassword:hashedPassword,
//       role: role._id,
//       permissions: flattenedPermissions, // array of permissions
//     });

//     res.status(201).json({
//       message: "User created successfully",
//       data: {
//         id: user._id,
//         userName: user.userName,
//         role: role.name,
//         permissions: user.permissions,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // ===== Update User =====
// export const updateUser = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const { name, email, password, roleName } = req.body;

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     if (name) user.name = name;
//     if (email) user.email = email;
//     if (password) user.password = await bcrypt.hash(password, 10);
//     if (roleName) {
//       const role = await Role.findOne({ name: roleName });
//       if (!role) return res.status(400).json({ message: "Invalid role" });
//       user.role = role._id;
//     }

//     await user.save();

//     res.json({ message: "User updated successfully", user });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

export const createUser = async (req, res) => {
  try {
    const { userName, tempPassword, name, email, role: roleId, permissions } = req.body;

    // check duplicate username
    const existing = await User.findOne({
      $or: [
        { userName },
        { email }
      ]
    });

    if (existing) {
      if (existing.userName === userName) {
        return res.status(400).json({ message: "Username already exists" });
      }
      if (existing.email === email) {
        return res.status(400).json({ message: "Email already exists" });
      }
    }


    // check role
    const role = await Role.findById(roleId);
    if (!role) return res.status(400).json({ message: "Invalid role" });

    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await User.create({
      userName,
      name,
      email,
      password: tempPassword,
      tempPassword: hashedPassword,
      role: role._id,
      permissions: permissions || [],
    });

    res.status(201).json({
      message: "User created successfully",
      data: {
        id: user._id,
        userName: user.userName,
        role: role.name,
        permissions: user.permissions,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== Update User =====
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, role: roleId, permissions } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (email) user.email = email;
    if (roleId) {
      const role = await Role.findById(roleId);
      if (!role) return res.status(400).json({ message: "Invalid role" });
      user.role = role._id;
    }
    if (permissions) user.permissions = permissions; // Update permissions

    await user.save();
    res.json({ message: "User updated successfully", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== Soft Delete User =====
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isDeleted = true;
    await user.save();

    res.json({ message: "User soft deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== Get User by ID =====
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).populate("role");
    if (!user || user.isDeleted) return res.status(404).json({ message: "User not found" });

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== Get All Users (with pagination, search, sort) =====
export const getAllUsers = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "", sortKey = "createdAt", sortOrder = "desc" } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const query = { isDeleted: { $ne: true } };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .populate("role")
      .sort({ [sortKey]: sortOrder === "desc" ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      data: users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

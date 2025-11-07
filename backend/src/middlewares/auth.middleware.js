import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Role from "../models/Role.js";

// ===== Verify JWT & attach user =====
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized: No token" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('-----decoded',decoded)
    const user = await User.findById(decoded.userId);
    console.log('-----user',user)
    if (!user || user.isDeleted || !user.isActive) {
      return res.status(401).json({ message: "Unauthorized: Invalid user" });
    }

    req.user = user; // attach user to request
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized: " + error.message });
  }
};

// ===== Role/Permission based access control =====
// Accepts: array of roles or array of permissions
// authorize({ permissions: ["create:product"] })
// authorize({ roles: ["Admin", "Manager"] })
export const authorize =
  ({ roles = [], permissions = [] }) =>
  (req, res, next) => {
    try {
      const user = req.user;

      // If roles defined, check role name
      if (roles.length && !roles.includes(user.role.name)) {
        return res.status(403).json({ message: "Forbidden: Role not allowed" });
      }

      // If permissions defined, check if user has at least one
      if (permissions.length) {
        const hasPermission =
          user.role.permissions.includes("*") ||
          permissions.some((p) => user.role.permissions.includes(p));

        if (!hasPermission) {
          return res.status(403).json({ message: "Forbidden: Permission denied" });
        }
      }

      next();
    } catch (error) {
      return res.status(403).json({ message: "Forbidden: " + error.message });
    }
  };

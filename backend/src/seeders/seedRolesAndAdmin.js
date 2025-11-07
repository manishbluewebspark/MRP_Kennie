import dotenv from "dotenv";
import mongoose from "mongoose";
import Role from "../models/Role.js";
import User from "../models/User.js";

dotenv.config();

// ===== MongoDB Connect =====
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB Connected for Seeding");
  } catch (error) {
    console.error("❌ DB Connection Failed:", error.message);
    process.exit(1);
  }
};

// ===== Seed Roles and Admin =====
const seed = async () => {
  try {
    // 1️⃣ Roles
   const roles = [
  {
    name: "Admin",
    permissions: ["*"], // full access
  },
  {
    name: "Super Admin",
    permissions: ["manage:users", "manage:settings", "manage:roles", "delete:anything"],
  },
  {
    name: "Manager",
    permissions: [
      "read:user",
      "create:user",
      "update:user",
      "create:product",
      "update:product",
      "delete:product",
      "read:report",
    ],
  },
  {
    name: "Supervisor",
    permissions: ["read:user", "read:product", "update:status", "read:report"],
  },
  {
    name: "Team Lead",
    permissions: ["read:user", "assign:task", "read:task", "update:task"],
  },
  {
    name: "Employee",
    permissions: ["read:product", "read:task", "update:own:task"],
  },
  {
    name: "Sales Executive",
    permissions: [
      "read:lead",
      "create:lead",
      "update:lead",
      "read:customer",
      "create:order",
    ],
  },
  {
    name: "Customer Support",
    permissions: [
      "read:ticket",
      "update:ticket",
      "close:ticket",
      "read:customer",
    ],
  },
  {
    name: "Vendor",
    permissions: [
      "create:product",
      "update:product",
      "read:order",
      "update:stock",
    ],
  },
  {
    name: "Customer",
    permissions: [
      "read:product",
      "create:order",
      "update:profile",
      "read:order",
    ],
  },
  {
    name: "Auditor",
    permissions: [
      "read:report",
      "read:user",
      "read:product",
      "read:order",
    ],
  },
  {
    name: "Finance",
    permissions: [
      "read:transactions",
      "update:transactions",
      "generate:report",
    ],
  },
  {
    name: "HR",
    permissions: [
      "read:employee",
      "update:employee",
      "create:leave",
      "read:leave",
    ],
  },
];


  for (let roleData of roles) {
  const result = await Role.findOneAndUpdate(
    { name: roleData.name },
    { $setOnInsert: roleData }, // only insert if not exist
    { upsert: true, new: true }
  );
  console.log(`✅ Role exists or created: ${roleData.name}`);
}


// Admin user
const adminRole = await Role.findOne({ name: "Admin" });
const adminExists = await User.findOne({ email: "admin@example.com" });

if (!adminExists) {
  await User.create({
    userName:"ADMIN",
    name: "Super Admin",
    email: "admin@example.com",
    password: "Admin@123",
    role: adminRole._id,
    permissions:[
    "library.mpn:view",
    "library.mpn:create",
    "library.mpn:edit",
    "library.mpn:delete",
    "library.mpn:purchase_history",
    "library.mpn:import",
    "library.mpn:export",
    "library.mpn:update_purchase_history",
    "library.child:view",
    "library.child:create",
    "library.child:edit",
    "library.child:delete",
    "library.child:import",
    "library.child:export",
    "sales.quote:view",
    "sales.quote:create",
    "sales.quote:edit",
    "sales.quote:delete",
    "sales.quote:export",
    "sales.customer:view",
    "sales.customer:create",
    "sales.customer:edit",
    "sales.customer:delete",
    "sales.project:view",
    "sales.project:create",
    "sales.project:edit",
    "sales.project:delete",
    "sales.mto:view",
    "sales.mto:create",
    "sales.mto:edit",
    "sales.mto:delete",
    "sales.mto:add_material",
    "sales.mto:import",
    "sales.mto:deep_edit",
    "sales.mto:deep_delete",
    "sales.mto:deep_update",
    "sales.mto:view_material_tab",
    "sales.mto:view_manhour_tab",
    "sales.mto:view_packing_tab",
    "sales.mto:dublicate",
    "sales.mto:change_project",
    "settings.userManagement:view",
    "settings.userManagement:add",
    "settings.userManagement:edit",
    "settings.userManagement:delete",
    "settings.skillLevel:view",
    "settings.skillLevel:add",
    "settings.skillLevel:edit",
    "settings.skillLevel:delete",
    "settings.systemSettings:view",
    "settings.systemSettings:update_gst_settings",
    "settings.systemSettings:update_alert_settings",
    "settings.systemSettings:update_workorder_settings",
    "settings.systemSettings:update_currency_settings",
    "settings.systemSettings:update_inventory_settings",
    "settings.markupParameter:view",
    "settings.markupParameter:update_material_settings",
    "settings.markupParameter:update_manhour_settings",
    "settings.markupParameter:update_packing_settings",
    "settings.currencyManagment:view",
    "settings.currencyManagment:add",
    "settings.currencyManagment:edit",
    "settings.currencyManagment:delete",
    "settings.categoryManagment:view",
    "settings.categoryManagment:add",
    "settings.categoryManagment:edit",
    "settings.categoryManagment:delete",
    "settings.uomManagment:view",
    "settings.uomManagment:add",
    "settings.uomManagment:edit",
    "settings.uomManagment:delete"
  ]
  });
  console.log("✅ Admin user created: admin@example.com / Admin@123");
} else {
  console.log("ℹ️ Admin user already exists");
}


    console.log("🎉 Seeding completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error.message);
    process.exit(1);
  }
};

// ===== Run Seeder =====
connectDB().then(seed);

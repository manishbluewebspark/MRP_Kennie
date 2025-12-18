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
    permissions: [], // full access
  },
  {
    name: "Super Admin",
    permissions: [],
  },
  {
    name: "Sales",
    permissions: [
    ],
  },
  {
    name: "Work Order",
    permissions: [],
  },
  {
    name: "Inventory",
    permissions: [],
  },
  {
    name: "Purchase",
    permissions: [],
  },
  {
    name: "Production",
    permissions: [
    ],
  },
  {
    name: "Picking",
    permissions: [
    ],
  },
  {
    name: "Cable Harness",
    permissions: [
    ],
  },
  {
    name: "Labelling",
    permissions: [
    ],
  },
  {
    name: "Quality Check",
    permissions: [
    ],
  },
  {
    name: "Packing",
    permissions: [
    ],
  }
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
    "dashboard:view",
    "library.mpn:view",
    "library.mpn:create_edit_delete",
    "library.mpn:import",
    "library.mpn:export",
    "library.child:view",
    "library.child:create_edit_delete",
    "library.child:import",
    "library.child:export",
    "sales.quote:view",
    "sales.quote:create_edit_delete",
    "sales.project:view",
    "sales.project:create_edit_delete",
    "sales.customer:view",
    "sales.customer:create_edit_delete",
    "sales.mto:view",
    "sales.mto:create_edit_delete",
    "sales.mto:add_material",
    "sales.mto:import",
    "sales.mto:create_edit_delete_costingmaterial",
    "work_order.work_order_managment:view",
    "work_order.work_order_managment:create_edit_delete",
    "work_order.work_order_managment:export",
    "work_order.work_order_managment:import",
    "work_order.work_order_managment:setting",
    "work_order.work_order_managment:mpn_tracker",
    "work_order.delivery_order:view",
    "work_order.delivery_order:export",
    "production.cable_harness_assembly:view",
    "production.cable_harness_assembly:picking_process",
    "production.cable_harness_assembly:cable_harness",
    "production.cable_harness_assembly:labelling",
    "production.cable_harness_assembly:qc",
    "production.box_build:view",
    "production.box_build:picking_process",
    "production.box_build:assembly",
    "production.box_build:qc",
    "purchase.purchase_order:create",
    "purchase.purchase_order:view",
    "purchase.purchase_order:edit_delete",
    "purchase.purchase_order:send_mail",
    "purchase.purchase_history:view",
    "purchase.supplier_managment:view",
    "purchase.supplier_managment:edit_delete_add",
    "purchase.purchase_settings:view",
    "purchase.purchase_settings:create",
    "inventory.inventory:setting",
    "inventory.inventory:view",
    "inventory.mto_inventory:view",
    "inventory.recieve_material:edit",
    "inventory.recieve_material:view",
    "settings.userManagement:view",
    "settings.userManagement:create_edit_delete",
    "settings.skillLevel:view",
    "settings.skillLevel:create_edit_delete",
    "settings.systemSettings:view",
    "settings.systemSettings:create_edit_delete",
    "settings.markupParameter:view",
    "settings.markupParameter:create_edit_delete",
    "settings.categoryManagment:view",
    "settings.categoryManagment:create_edit_delete",
    "settings.uomManagment:view",
    "settings.uomManagment:create_edit_delete"
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

// const modules = [
//   {
//     key: "library",
//     label: "Library",
//     children: [
//       {
//         key: "mpn",
//         label: "MPN",
//         actions: ["view", "create", "edit", "delete", "purchase_history", "import", "export", "update_purchase_history"],
//       },
//       {
//         key: "child",
//         label: "Child",
//         actions: ["view", "create", "edit", "delete", "import", "export"],
//       }
//     ],
//   },
//   {
//     key: "sales",
//     label: "Sales",
//     children: [
//       {
//         key: "quote",
//         label: "Quote Management",
//         actions: ["view", "create", "edit", "delete", "export"],
//       },
//       {
//         key: "customer",
//         label: "Customer Management",
//         actions: ["view", "create", "edit", "delete"],
//       },
//       {
//         key: "project",
//         label: "Project Management",
//         actions: ["view", "create", "edit", "delete"],
//       },
//       {
//         key: "mto",
//         label: "Make Order MTO",
//         actions: ["view", "create", "edit", "delete", "add_material", "import", "deep_edit", "deep_delete","deep_update","view_material_tab","view_manhour_tab","view_packing_tab", "dublicate", "change_project"],
//       },
//     ],
//   },
//   {
//     key: "settings",
//     label: "Settings",
//     children: [
//       {
//         key: "userManagement",
//         label: "User Management",
//          actions: ["view","add", "edit", "delete"],
//       },
//       {
//         key: "skillLevel",
//         label: "Skill Level",
//         actions: ["view","add", "edit", "delete"],
//       },
//       {
//         key: "systemSettings",
//         label: "System Settings",
//         actions: ["view","update_gst_settings", "update_alert_settings", "update_workorder_settings","update_currency_settings","update_inventory_settings"],
//       },
//       {
//         key: "markupParameter",
//         label: "Markup Parameter",
//         actions: ["view", "update_material_settings", "update_manhour_settings", "update_packing_settings"],
//       },
//       {
//         key: "currencyManagment",
//         label: "Currency Managment",
//         actions: ["view","add", "edit", "delete"],
//       },
//       {
//         key: "categoryManagment",
//         label: "Category Managment",
//         actions: ["view","add", "edit", "delete"],
//       },
//       {
//         key: "uomManagment",
//         label: "Uom Managment",
//         actions: ["view","add", "edit", "delete"],
//       },
//     ],
//   },
// ];

// export default modules



const modules = [
  // ---------------------------------------------------------
  // LIBRARY MODULE
  // ---------------------------------------------------------
  {
    key: "library",
    label: "Library",
    children: [
      {
        key: "mpn",
        label: "MPN",
        actions: [
          { key: "view", label: "View Only" },
          { key: "create", label: "Create" },
          { key: "edit", label: "Edit" },
          { key: "delete", label: "Delete" },
          { key: "purchase_history", label: "Purchase History" },
          { key: "import", label: "Import" },
          { key: "export", label: "Export" },
          { key: "update_purchase_history", label: "Update Purchase History" },
        ],
      },
      {
        key: "child",
        label: "Child",
        actions: [
          { key: "view", label: "View Only" },
          { key: "create", label: "Create" },
          { key: "edit", label: "Edit" },
          { key: "delete", label: "Delete" },
          { key: "import", label: "Import" },
          { key: "export", label: "Export" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------
  // SALES MODULE
  // ---------------------------------------------------------
  {
    key: "sales",
    label: "Sales",
    children: [
      {
        key: "quote",
        label: "Quote Management",
        actions: [
          { key: "view", label: "View Only" },
          { key: "create", label: "Create" },
          { key: "edit", label: "Edit" },
          { key: "delete", label: "Delete" },
          { key: "export", label: "Export" },
        ],
      },
      {
        key: "customer",
        label: "Customer Management",
        actions: [
          { key: "view", label: "View Only" },
          { key: "create", label: "Create" },
          { key: "edit", label: "Edit" },
          { key: "delete", label: "Delete" },
        ],
      },
      {
        key: "project",
        label: "Project Management",
        actions: [
          { key: "view", label: "View Only" },
          { key: "create", label: "Create" },
          { key: "edit", label: "Edit" },
          { key: "delete", label: "Delete" },
        ],
      },
      {
        key: "mto",
        label: "Make Order MTO",
        actions: [
          { key: "view", label: "View Only" },
          { key: "create", label: "Create" },
          { key: "edit", label: "Edit" },
          { key: "delete", label: "Delete" },
          { key: "add_material", label: "Add Material" },
          { key: "import", label: "Import" },
          { key: "deep_edit", label: "Costing Edit" },
          { key: "deep_delete", label: "Costing Delete" },
          { key: "deep_update", label: "Costing Update" },
          { key: "view_material_tab", label: "View Material Tab" },
          { key: "view_manhour_tab", label: "View Manhour Tab" },
          { key: "view_packing_tab", label: "View Packing Tab" },
          { key: "dublicate", label: "Duplicate" },
          { key: "change_project", label: "Change Project" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------
  // PRODUCTION MODULE (NEW)
  // ---------------------------------------------------------
  {
    key: "production",
    label: "Production Module",
    children: [
      {
        key: "cable_harness_assembly",
        label: "Cable Harness / Assembly",
        children: [
          {
            key: "picking",
            label: "Picking Process",
            actions: [
              { key: "view", label: "View Only" },
              { key: "process", label: "Process" },
            ],
          },
          {
            key: "cable_harness",
            label: "Cable Harness",
            actions: [
              { key: "view", label: "View Only" },
              { key: "process", label: "Process" },
            ],
          },
          {
            key: "labelling",
            label: "Labelling",
            actions: [
              { key: "view", label: "View Only" },
              { key: "process", label: "Process" },
            ],
          },
          {
            key: "quality_check",
            label: "Quality Check",
            actions: [
              { key: "view", label: "View Only" },
              { key: "process", label: "Process" },
            ],
          },
          {
            key: "packing",
            label: "Packing",
            actions: [
              { key: "view", label: "View Only" },
              { key: "process", label: "Process" },
            ],
          },
        ],
      },

      // BOX BUILD
      {
        key: "box_build",
        label: "Box Build Assembly",
        children: [
          {
            key: "picking_box",
            label: "Picking Process",
            actions: [
              { key: "view", label: "View Only" },
              { key: "process", label: "Process" },
            ],
          },
          {
            key: "assembly_box",
            label: "Assembly",
            actions: [
              { key: "view", label: "View Only" },
              { key: "process", label: "Process" },
            ],
          },
          {
            key: "qc_box",
            label: "Quality Check",
            actions: [
              { key: "view", label: "View Only" },
              { key: "process", label: "Process" },
            ],
          },
        ],
      },
    ],
  },

  // ---------------------------------------------------------
  // PURCHASE MODULE (NEW)
  // ---------------------------------------------------------
  {
    key: "purchase",
    label: "Purchase Module",
    actions: [
      { key: "edit_delete", label: "Add / Edit / Delete" },
      { key: "view", label: "View Only" },
    ],
  },

  // ---------------------------------------------------------
  // INVENTORY MODULE (NEW)
  // ---------------------------------------------------------
  {
    key: "inventory",
    label: "Inventory Module",
    children: [
      {
        key: "receive_materials",
        label: "Receive Materials",
        actions: [
          { key: "edit_delete", label: "Edit / Delete" },
          { key: "view", label: "View Only" },
        ],
      },
      {
        key: "detailed_inventory",
        label: "Detailed Inventory List",
        actions: [
          { key: "edit_delete", label: "Edit / Delete" },
          { key: "view", label: "View Only" },
        ],
      },
    ],
  },

  // ---------------------------------------------------------
  // SETTINGS MODULE
  // ---------------------------------------------------------
  {
    key: "settings",
    label: "Settings",
    children: [
      {
        key: "userManagement",
        label: "User Management",
        actions: [
          { key: "view", label: "View Only" },
          { key: "add", label: "Add" },
          { key: "edit", label: "Edit" },
          { key: "delete", label: "Delete" },
        ],
      },

      {
        key: "skillLevel",
        label: "Skill Level",
        actions: [
          { key: "view", label: "View Only" },
          { key: "add", label: "Add" },
          { key: "edit", label: "Edit" },
          { key: "delete", label: "Delete" },
        ],
      },

      {
        key: "systemSettings",
        label: "System Settings",
        actions: [
          { key: "view", label: "View Only" },
          { key: "update_gst_settings", label: "Update GST Settings" },
          { key: "update_alert_settings", label: "Update Alert Settings" },
          { key: "update_workorder_settings", label: "Update Work Order Settings" },
          { key: "update_currency_settings", label: "Update Currency Settings" },
          { key: "update_inventory_settings", label: "Update Inventory Settings" },
        ],
      },

      {
        key: "markupParameter",
        label: "Markup Parameter",
        actions: [
          { key: "view", label: "View Only" },
          { key: "update_material_settings", label: "Update Material Settings" },
          { key: "update_manhour_settings", label: "Update Manhour Settings" },
          { key: "update_packing_settings", label: "Update Packing Settings" },
        ],
      },

      // {
      //   key: "currencyManagment",
      //   label: "Currency Management",
      //   actions: [
      //     { key: "view", label: "View Only" },
      //     { key: "add", label: "Add" },
      //     { key: "edit", label: "Edit" },
      //     { key: "delete", label: "Delete" },
      //   ],
      // },

      {
        key: "categoryManagment",
        label: "Category Management",
        actions: [
          { key: "view", label: "View Only" },
          { key: "add", label: "Add" },
          { key: "edit", label: "Edit" },
          { key: "delete", label: "Delete" },
        ],
      },

      {
        key: "uomManagment",
        label: "UOM Management",
        actions: [
          { key: "view", label: "View Only" },
          { key: "add", label: "Add" },
          { key: "edit", label: "Edit" },
          { key: "delete", label: "Delete" },
        ],
      },
    ],
  },
];

export default modules;

const modules = [
  {
    key: "library",
    label: "Library",
    children: [
      {
        key: "mpn",
        label: "MPN",
        actions: ["view", "create", "edit", "delete", "purchase_history", "import", "export", "update_purchase_history"],
      },
      {
        key: "child",
        label: "Child",
        actions: ["view", "create", "edit", "delete", "import", "export"],
      }
    ],
  },
  {
    key: "sales",
    label: "Sales",
    children: [
      {
        key: "quote",
        label: "Quote Management",
        actions: ["view", "create", "edit", "delete", "export"],
      },
      {
        key: "customer",
        label: "Customer Management",
        actions: ["view", "create", "edit", "delete"],
      },
      {
        key: "project",
        label: "Project Management",
        actions: ["view", "create", "edit", "delete"],
      },
      {
        key: "mto",
        label: "Make Order MTO",
        actions: ["view", "create", "edit", "delete", "add_material", "import", "deep_edit", "deep_delete","deep_update","view_material_tab","view_manhour_tab","view_packing_tab", "dublicate", "change_project"],
      },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    children: [
      {
        key: "userManagement",
        label: "User Management",
         actions: ["view","add", "edit", "delete"],
      },
      {
        key: "skillLevel",
        label: "Skill Level",
        actions: ["view","add", "edit", "delete"],
      },
      {
        key: "systemSettings",
        label: "System Settings",
        actions: ["view","update_gst_settings", "update_alert_settings", "update_workorder_settings","update_currency_settings","update_inventory_settings"],
      },
      {
        key: "markupParameter",
        label: "Markup Parameter",
        actions: ["view", "update_material_settings", "update_manhour_settings", "update_packing_settings"],
      },
      {
        key: "currencyManagment",
        label: "Currency Managment",
        actions: ["view","add", "edit", "delete"],
      },
      {
        key: "categoryManagment",
        label: "Category Managment",
        actions: ["view","add", "edit", "delete"],
      },
      {
        key: "uomManagment",
        label: "Uom Managment",
        actions: ["view","add", "edit", "delete"],
      },
    ],
  },
];

export default modules
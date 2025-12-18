const modules = [
  {
    key: "dashboard",
    label: "Dashboard",
    actions: [
      { key: "view", label: "View Only" }
    ]
  },
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
          { key: "create_edit_delete", label: "Create / Edit / Delete" },
          { key: "import", label: "Import" },
          { key: "export", label: "Export" },
        ],
      },
      {
        key: "child",
        label: "Child",
        actions: [
          { key: "view", label: "View Only" },
          { key: "create_edit_delete", label: "Create / Edit / Delete" },
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
          { key: "create_edit_delete", label: "Create / Edit / Delete" },
        ],
      },
      {
        key: "customer",
        label: "Customer Management",
        actions: [
          { key: "view", label: "View Only" },
          { key: "create_edit_delete", label: "Create / Edit / Delete" },
        ],
      },
      {
        key: "project",
        label: "Project Management",
        actions: [
          { key: "view", label: "View Only" },
          { key: "create_edit_delete", label: "Create / Edit / Delete" },
        ],
      },
      {
        key: "mto",
        label: "Make Order MTO",
        actions: [
          { key: "view", label: "View Only" },
          { key: "create_edit_delete", label: "Create / Edit / Delete" },
          { key: "add_material", label: "Add Material" },
          { key: "import", label: "Import" },
          { key: "create_edit_delete_costingmaterial", label: "Material Costing Create / Edit / Delete" },
        ],
      },
    ],
  },
  {
    key: "work_order",
    label: "Work Order",
    children: [
      {
        key: "work_order_managment",
        label: "Work Order Management",
        actions: [
          { key: "view", label: "View Only" },
          { key: "create_edit_delete", label: "Create / Edit / Delete" },
          { key: "export", label: "Export" },
          { key: "import", label: "Import" },
          { key: "setting", label: "Setting" },
          { key: "mpn_tracker", label: "MPN Tracker" },
        ],
      },
      {
        key: "delivery_order",
        label: "Delivery Order",
        actions: [
          { key: "view", label: "View Only" },
          { key: "export", label: "Export" }
        ],
      },
    ]
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
        actions: [
          { key: "view", label: "View Only" },
          { key: "picking_process", label: "Picking Process" },
          { key: "cable_harness", label: "Cable Harness" },
          { key: "labelling", label: "Labelling" },
          { key: "qc", label: "Quality Check" },
          { key: "view", label: "Packing" },
        ],
      },

      // BOX BUILD
      {
        key: "box_build",
        label: "Box Build Assembly",
        actions: [
          { key: "view", label: "View Only" },
          { key: "picking_process", label: "Picking Process" },
          { key: "assembly", label: "Assembly" },
          { key: "qc", label: "Quality Check" }
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
    children: [
      {
        key: "purchase_order",
        label: "Purchase Order",
        actions: [
          { key: "create", label: "Create PO" },
          { key: "view", label: "View Only" },
          { key: "edit_delete", label: "Edit / Delete" },
          { key: "send_mail", label: "Send Mail" }
        ],
      },
      {
        key: "purchase_history",
        label: "Purchase History",
        actions: [
          { key: "view", label: "View Only" },
        ],
      },
      {
        key: "supplier_managment",
        label: "Supplier Managment",
        actions: [
          { key: "view", label: "View Only" },
          { key: "edit_delete_add", label: "Create / Edit / Delete" },
        ],
      },
      {
        key: "purchase_settings",
        label: "Purchase Setting",
        actions: [
          { key: "view", label: "View Only" },
          { key: "create", label: "Create / Edit" }
        ],
      }
    ]
  },

  // ---------------------------------------------------------
  // INVENTORY MODULE (NEW)
  // ---------------------------------------------------------
  {
    key: "inventory",
    label: "Inventory Module",
    children: [
      {
        key: "inventory",
        label: "Inventory",
        actions: [
          { key: "setting", label: "Change Settings" },
          { key: "view", label: "View Only" }
        ],
      },
      {
        key: "mto_inventory",
        label: "MTO Inventory",
        actions: [
          { key: "view", label: "View Only" },
        ],
      },
      {
        key: "recieve_material",
        label: "Receive Material",
        actions: [
          { key: "edit", label: "Receive Action" },
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
          { key: "create_edit_delete", label: "Create / Edit / Delete" },
        ],
      },

      {
        key: "skillLevel",
        label: "Skill Level",
        actions: [
          { key: "view", label: "View Only" },
          { key: "create_edit_delete", label: "Create / Edit / Delete" },
        ],
      },

      {
        key: "systemSettings",
        label: "System Settings",
        actions: [
          { key: "view", label: "View Only" },
          { key: "create_edit_delete", label: "Create / Edit / Delete" },
        ],
      },

      {
        key: "markupParameter",
        label: "Markup Parameter",
        actions: [
          { key: "view", label: "View Only" },
          { key: "create_edit_delete", label: "Create / Edit / Delete" },
        ],
      },
      {
        key: "categoryManagment",
        label: "Category Management",
        actions: [
          { key: "view", label: "View Only" },
          { key: "create_edit_delete", label: "Create / Edit / Delete" },
        ],
      },

      {
        key: "uomManagment",
        label: "UOM Management",
        actions: [
          { key: "view", label: "View Only" },
          { key: "create_edit_delete", label: "Create / Edit / Delete" },
        ],
      },
    ],
  },
];

export default modules;

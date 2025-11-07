import fetch from "auth/FetchInterceptor";

const SupplierService = {};

// ➕ Add Supplier
SupplierService.addSupplier = (data) =>
  fetch({ url: "/suppliers", method: "post", data });

// 📄 Get All Suppliers (with pagination, search, filter)
SupplierService.getAllSuppliers = (params) =>
  fetch({ url: "/suppliers", method: "get", params });

// 🔍 Get Supplier by ID
SupplierService.getSupplierById = (id) =>
  fetch({ url: `/suppliers/${id}`, method: "get" });

// ✏️ Update Supplier
SupplierService.updateSupplier = (id, data) =>
  fetch({ url: `/suppliers/${id}`, method: "put", data });

// 🗑️ Delete Supplier
SupplierService.deleteSupplier = (id) =>
  fetch({ url: `/suppliers/${id}`, method: "delete" });

export default SupplierService;

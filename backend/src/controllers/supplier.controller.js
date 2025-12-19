import Suppliers from "../models/Suppliers.js";

// ➕ Add Supplier
export const addSupplier = async (req, res) => {
  try {

    const { companyName, email, phone } = req.body;

    // 🔴 Basic validation
    if (!companyName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "companyName, email and phone are required",
      });
    }

    const existingSupplier = await Suppliers.findOne({
      $or: [
        { companyName: { $regex: `^${companyName}$`, $options: "i" } }, // case-insensitive
        { email: email.toLowerCase() },
        { phone },
      ],
    });


    if (existingSupplier) {
      if (
        existingSupplier.companyName.toLowerCase() === companyName.toLowerCase()
      ) {
        return res.status(400).json({
          success: false,
          message: "Company name already exists",
        });
      }

      if (existingSupplier.email === email.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }

      if (existingSupplier.phone === phone) {
        return res.status(400).json({
          success: false,
          message: "Phone number already exists",
        });
      }
    }


    const supplier = await Suppliers.create(req.body);
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    console.error("Error adding supplier:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✏️ Update Supplier
export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Suppliers.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!supplier)
      return res.status(404).json({ success: false, message: "Supplier not found" });

    res.json({ success: true, data: supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 📋 Get All Suppliers (pagination, search, filter, sort)
export const getAllSuppliers = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
      status,
    } = req.query;

    const filter = { isDeleted: false };

    // 🔍 Search
    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // ⚙️ Filter by status
    if (status) filter.status = status;

    // 🔢 Pagination
    const skip = (page - 1) * limit;

    // 📊 Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [suppliers, total] = await Promise.all([
      Suppliers.find(filter).populate("currency", "code").sort(sortOptions).skip(skip).limit(Number(limit)),
      Suppliers.countDocuments(filter),
    ]);

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: suppliers,
    });
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 📄 Get Supplier By ID
export const getSupplierById = async (req, res) => {
  try {
    const supplier = await Suppliers.findById(req.params.id);
    if (!supplier || supplier.isDeleted)
      return res.status(404).json({ success: false, message: "Supplier not found" });

    res.json({ success: true, data: supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🗑️ Soft Delete Supplier
export const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Suppliers.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );

    if (!supplier)
      return res.status(404).json({ success: false, message: "Supplier not found" });

    res.json({ success: true, message: "Supplier deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

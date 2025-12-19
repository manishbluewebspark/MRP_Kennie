import Customer from "../models/Customer.js";

const normalizeEmail = (e) => (e ? String(e).trim().toLowerCase() : null);

// Create Customer
export const createCustomer = async (req, res) => {
  try {

    const emailLower = normalizeEmail(req?.body?.email);
    const companyName = req?.body?.companyName?.trim();
    const phone = req?.body?.phone?.trim();

    // 🔍 EMAIL duplicate check
    if (emailLower) {
      const emailExists = await Customer.findOne({ email: emailLower }).lean();
      if (emailExists) {
        return res.status(400).json({
          success: false,
          code: "EMAIL_EXISTS",
          message: "A customer with this email already exists.",
        });
      }
    }

    // 🔍 COMPANY NAME duplicate check (case-insensitive)
    if (companyName) {
      const companyExists = await Customer.findOne({
        companyName: { $regex: `^${companyName}$`, $options: "i" },
      }).lean();

      if (companyExists) {
        return res.status(400).json({
          success: false,
          code: "COMPANY_EXISTS",
          message: "A customer with this company name already exists.",
        });
      }
    }

    // 🔍 PHONE duplicate check
    if (phone) {
      const phoneExists = await Customer.findOne({ phone }).lean();
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          code: "PHONE_EXISTS",
          message: "A customer with this phone number already exists.",
        });
      }
    }




    const customer = new Customer({
      ...req.body,
      createdBy: req.user.id, // Assuming req.user is set by auth middleware
    });
    await customer.save();
    return res.status(201).json({ success: true, data: customer });
  } catch (err) {
    console.error("Create Customer Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Update Customer
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, ...updateData } = req.body;

    // 1️⃣ Check if customer exists
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // 2️⃣ If email is being updated, check if already used by another customer
    if (email && email !== customer.email) {
      const existingEmail = await Customer.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: "Email already in use" });
      }
      updateData.email = email; // safely update email if unique
    }

    // 3️⃣ Perform update
    const updatedCustomer = await Customer.findByIdAndUpdate(id, updateData, { new: true });

    return res.json({ success: true, data: updatedCustomer });
  } catch (err) {
    console.error("Update Customer Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


// Delete Customer
export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });
    return res.json({ success: true, message: "Customer deleted successfully" });
  } catch (err) {
    console.error("Delete Customer Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get Customer by ID
export const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });
    return res.json({ success: true, data: customer });
  } catch (err) {
    console.error("Get Customer Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get All Customers with pagination & search
export const getAllCustomers = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const query = {};
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      // .populate("currency", "symbol code")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: customers,
      pagination: {
        total,
        page,
        limit,
      }
    });
  } catch (err) {
    console.error("Get All Customers Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

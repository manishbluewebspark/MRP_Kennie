import Customer from "../models/Customer.js";

const normalizeEmail = (e) => (e ? String(e).trim().toLowerCase() : null);

// Create Customer
export const createCustomer = async (req, res) => {
  try {

    const emailLower = normalizeEmail(req?.body?.email);
    const companyName = req?.body?.companyName?.trim();
    const phone = req?.body?.phone?.trim();

    if (!companyName || !emailLower) {
      return res.status(400).json({
        success: false,
        message: "Company name and email are required",
      });
    }

    // 🔎 Check only companyName + email combination
    const existingCustomer = await Customer.findOne({
      companyName: { $regex: `^${companyName}$`, $options: "i" },
      email: emailLower,
    }).lean();

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: "Customer Already Exist",
      });
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
    const { email, companyName, ...rest } = req.body;

        const emailLower = email ? normalizeEmail(email) : undefined;
    const companyTrim = companyName?.trim();

    
    // 1️⃣ Check if customer exists
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // Determine final values (agar update nahi bheja to old value use hoga)
    const finalEmail = emailLower || customer.email;
    const finalCompany = companyTrim || customer.companyName;

    // 2️⃣ Check duplicate combination (exclude current document)
    const existingCustomer = await Customer.findOne({
      _id: { $ne: id }, // exclude current record
      companyName: { $regex: `^${finalCompany}$`, $options: "i" },
      email: finalEmail,
    }).lean();

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: "Customer Already Exist",
      });
    }

    // 3️⃣ Prepare update object
    const updateData = {
      ...rest,
      companyName: finalCompany,
      email: finalEmail,
    };


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

import Currency from "../models/Currency.js";


// Add Currency
export const addCurrency = async (req, res) => {
  try {
    const currency = new Currency(req.body);
    await currency.save();
    res.status(201).json({ success: true, data: currency });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Get all currencies with pagination, search, sorting
export const getAllCurrencies = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", sortBy = "createdAt", sortOrder = "desc" } = req.query;

    const query = { isDeleted: false };
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const total = await Currency.countDocuments(query);

    const currencies = await Currency.find(query)
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, data: currencies, pagination:{total, page , limit} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Get Currency by ID
export const getCurrencyById = async (req, res) => {
  try {
    const currency = await Currency.findById(req.params.id);
    if (!currency || currency.isDeleted)
      return res.status(404).json({ success: false, error: "Currency not found" });
    res.json({ success: true, data: currency });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Update Currency
export const updateCurrency = async (req, res) => {
  try {
    const currency = await Currency.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!currency) return res.status(404).json({ success: false, error: "Currency not found" });
    res.json({ success: true, data: currency });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Delete Currency (soft delete)
export const deleteCurrency = async (req, res) => {
  try {
    const currency = await Currency.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
    if (!currency) return res.status(404).json({ success: false, error: "Currency not found" });
    res.json({ success: true, data: currency });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

import MarkupParameter from "../models/MarkupParameters.js";


// Create or Update (single API)
export const addOrUpdateMarkupParameter = async (req, res) => {
  try {
    const { materialsMarkup, manhourMarkup, packingMarkup } = req.body;

    if (
      materialsMarkup === undefined ||
      manhourMarkup === undefined ||
      packingMarkup === undefined
    ) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Check if document already exists
    let markup = await MarkupParameter.findOne();
    if (markup) {
      // Update existing
      markup.materialsMarkup = materialsMarkup;
      markup.manhourMarkup = manhourMarkup;
      markup.packingMarkup = packingMarkup;

      await markup.save();
      return res.json({ success: true, message: "Markup updated successfully", data: markup });
    } else {
      // Create new
      markup = await MarkupParameter.create({
        materialsMarkup,
        manhourMarkup,
        packingMarkup,
      });
      return res.json({ success: true, message: "Markup created successfully", data: markup });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get All (or latest)
export const getAllMarkupParameters = async (req, res) => {
  try {
    const markups = await MarkupParameter.find().sort({ createdAt: -1 }); // latest first
    return res.json({ success: true, data: markups });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

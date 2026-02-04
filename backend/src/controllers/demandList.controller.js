import XLSX from "xlsx";
import DemandList from "../models/DemandList.js";
import DemandListItem from "../models/DemandListItem.js";


/**
 * GET: All Demand Lists (Pagination + Search)
 * URL: /demand-lists?page=1&limit=10&search=abc
 */
export const getAllDemandLists = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { fileName: { $regex: search, $options: "i" } }
          ]
        }
      : {};

    const [lists, totalCount] = await Promise.all([
      DemandList.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      DemandList.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: lists,
      totalCount,
      page,
      limit
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch demand lists"
    });
  }
};

/**
 * POST: Upload Excel & store data
 */
export const uploadDemandExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Excel file required" });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
     console.log('----rows',rows)
    if (!rows.length) {
      return res.status(400).json({ message: "Excel is empty" });
    }

    // Create Demand List
    const demandList = await DemandList.create({
      name: rows.Name || "Demand List",
      fileName: req.file.originalname,
      status: "Processing",
      totalItems: rows.length,
    });

    const items = rows.map((row, index) => {
      const qtyRequired = Number(row["Qty Required"] || 0);

      const shortage =
        row["Shortage"] !== undefined
          ? Number(row["Shortage"])
          : 0;

      const purchaseRequired =
        String(row["Purchase Required"] || "")
          .toLowerCase() === "yes";

      return {
        demandListId: demandList._id,

        name: row["Name"] || "",

        partNumber: row["Part Number"] || "",
        manufacturer: row["Manufacturer"] || "",
        uom: row["UOM"] || "",

        qtyRequired,

        requiredDate: row["Required Date"]
          ? new Date(row["Required Date"])
          : null,

        stockStatus: row["Stock Status"] || "unknown",

        shortage,

        purchaseRequired,

        status: shortage > 0 ? "Shortage" : "Available",
      };
    });

    await DemandListItem.insertMany(items);

    demandList.status = "Processing";
    demandList.processedAt = new Date();
    await demandList.save();

    res.json({
      success: true,
      message: "Demand list uploaded successfully",
      demandListId: demandList._id,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Failed to upload demand list" });
  }
};


/**
 * GET: Demand List by ID (File + Items)
 */
export const getDemandListById = async (req, res) => {
  try {
    const demandList = await DemandList.findById(req.params.id);
    if (!demandList) {
      return res.status(404).json({ message: "Demand list not found" });
    }

    const items = await DemandListItem.find({
      demandListId: demandList._id
    });

    res.json({
      success: true,
      demandList,
      items
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch demand list" });
  }
};

/**
 * DELETE: Demand List (File + Items)
 */
export const deleteDemandList = async (req, res) => {
  try {
    const demandList = await DemandList.findById(req.params.id);
    if (!demandList) {
      return res.status(404).json({ message: "Demand list not found" });
    }

    await DemandListItem.deleteMany({
      demandListId: demandList._id
    });

    await DemandList.deleteOne({ _id: demandList._id });

    res.json({
      success: true,
      message: "Demand list deleted successfully"
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete demand list" });
  }
};

/**
 * PUT: Update Single Item
 */
export const updateDemandListItem = async (req, res) => {
  try {
    const item = await DemandListItem.findById(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    Object.assign(item, req.body);

    // 🔄 Recalculate logic
    item.shortage = Math.max(item.qtyRequired - item.stock, 0);
    item.purchaseRequired = item.shortage > 0;
    item.status = item.shortage > 0 ? "Shortage" : "Available";

    await item.save();

    res.json({
      success: true,
      message: "Item updated successfully",
      item
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to update item" });
  }
};

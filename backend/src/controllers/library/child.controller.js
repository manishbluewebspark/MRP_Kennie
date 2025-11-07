import mongoose from "mongoose";
import Child from "../../models/library/Child.js";
import MPN from "../../models/library/MPN.js";
import XLSX from "xlsx";

/**
 * Add new Child
 */
export const addChild = async (req, res) => {
  try {
    const { mpn: mpnId } = req.body;
    const mpn = await MPN.findById(mpnId);
    if (!mpn) return res.status(404).json({ success: false, message: "Parent MPN not found" });

    // Save child
    const child = new Child(req.body);
    await child.save();

    return res.status(201).json({ success: true, message: "Child created", data: child });

  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Update Child
 */
export const updateChild = async (req, res) => {
  try {
    const child = await Child.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!child) return res.status(404).json({ success: false, message: "Child not found" });
    return res.json({ success: true, message: "Child updated", data: child });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Delete Child
 */
export const deleteChild = async (req, res) => {
  try {
    const child = await Child.findByIdAndDelete(req.params.id);
    if (!child) return res.status(404).json({ success: false, message: "Child not found" });

    // remove reference from parent MPN
    await MPN.findByIdAndUpdate(child.mpn, { $pull: { children: child._id } });

    return res.json({ success: true, message: "Child deleted" });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Get Child by ID
 */
export const getChildById = async (req, res) => {
  try {
    const child = await Child.findById(req.params.id).populate("mpn");
    if (!child) return res.status(404).json({ success: false, message: "Child not found" });
    return res.json({ success: true, data: child });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Get all Child with filters
 */
// export const getAllChild = async (req, res) => {
//   try {
//     const { page = 1, limit = 10, search = "" } = req.query;

//     const query = {};

//     // Agar search hai, ChildPartNo ya Linked MPN ke against search
//     if (search) {
//       query.$or = [
//         { ChildPartNo: { $regex: search, $options: "i" } },
//         { LinkedMPNCategory: { $regex: search, $options: "i" } },
//       ];
//     }

//     // Count total documents for pagination
//     const total = await Child.countDocuments(query);

//     // Fetch paginated data
//     const children = await Child.find(query)
//       .populate("mpn")
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit))
//       .lean();

//     return res.json({
//       success: true,
//       data: children,
//       pagination: {
//         total,
//         page: parseInt(page),
//         limit: parseInt(limit),
//         totalPages: Math.ceil(total / limit),
//       },
//     });
//   } catch (err) {
//     return res.status(400).json({ success: false, message: err.message });
//   }
// };

// export const getAllChild = async (req, res) => {
//   try {
//     // parse + sanitize pagination
//     const pageNum  = Math.max(parseInt(req.query.page, 10) || 1, 1);
//     const limitNum = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 200);

//     const {
//       search = "",
//       category,   // e.g. "68ff1be11aee5095ab30bc7e"
//       mpn,        // e.g. "68f0c745bacd5851cb2afdfc"
//       status      // e.g. "Active"
//     } = req.query;

//     const query = {};

//     // 🔎 Free-text search across key fields
//     if (search) {
//       const rx = new RegExp(search, "i");
//       query.$or = [
//         { ChildPartNo: { $regex: rx } },
//         { LinkedMPNCategory: { $regex: rx } }, // keep your existing behavior
//         // Add more fields if needed:
//         // { Description: { $regex: rx } },
//       ];
//     }

//    if (category && category !== "all" && mongoose.Types.ObjectId.isValid(category)) {
//         query.LinkedMPNCategory = new mongoose.Types.ObjectId(category);
//       }

//     // 🧩 Exact MPN filter (Child has "mpn" ref)
//     if (mpn && mongoose.Types.ObjectId.isValid(mpn)) {
//       query.mpn = new mongoose.Types.ObjectId(mpn);
//     }

//     // ✅ Status filter (case-insensitive exact)
//     if (status && status !== "All") {
//       query.status = { $regex: new RegExp(`^${status}$`, "i") };
//     }

//     // Count for pagination
//     const total = await Child.countDocuments(query);

//     // Data fetch
//     const children = await Child.find(query)
//       .populate("mpn") 
//       .populate("LinkedMPNCategory", "name")              // keep your populate
//       .sort({ createdAt: -1 })       // latest first (as in your MPN list)
//       .skip((pageNum - 1) * limitNum)
//       .limit(limitNum)
//       .lean();

//     return res.json({
//       success: true,
//       data: children,
//       pagination: {
//         total,
//         page: pageNum,
//         limit: limitNum,
//         totalPages: Math.ceil(total / limitNum),
//       },
//     });
//   } catch (err) {
//     return res.status(400).json({ success: false, message: err.message });
//   }
// };

export const getAllChild = async (req, res) => {
  try {
    const pageNum = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 200);

    const { search = "", category, mpn, status } = req.query;
    const query = {};
    const orClauses = [];
    const collation = { locale: "en", strength: 2 };

    // exact filters
    if (category && category !== "all" && mongoose.Types.ObjectId.isValid(category)) {
      query.LinkedMPNCategory = new mongoose.Types.ObjectId(category);
    }
    if (mpn && mongoose.Types.ObjectId.isValid(mpn)) {
      query.mpn = new mongoose.Types.ObjectId(mpn);
    }
    if (status && status !== "All") {
      // exact case-insensitive via collation; if you want partial, use regex instead
      query.status = String(status);
    }

    if (search && String(search).trim()) {
      const rx = new RegExp(String(search).trim(), "i");

      // Child’s string fields only
      orClauses.push(
        { ChildPartNo: { $regex: rx } },
        { description: { $regex: rx } },
        { status: { $regex: rx } },
      );

      // Search MPN by its string code then filter by ids
      const matchedMpns = await MPN.find({ MPN: { $regex: rx } }, { _id: 1 }).lean();
      if (matchedMpns.length) {
        orClauses.push({ mpn: { $in: matchedMpns.map(m => m._id) } });
      }

      // Search Category by name only if the model exists
      const CategoryModel = mongoose.models.Category; // <- safe lookup
      if (CategoryModel) {
        const matchedCats = await CategoryModel.find({ name: { $regex: rx } }, { _id: 1 }).lean();
        if (matchedCats.length) {
          orClauses.push({ LinkedMPNCategory: { $in: matchedCats.map(c => c._id) } });
        }
      } else {
        // Optional: log once so you remember to register/import the model
        // console.warn("Category model not registered here; skipping category-name search.");
      }
    }

    if (orClauses.length) query.$or = orClauses;

    const total = await Child.countDocuments(query).collation(collation);

    const children = await Child.find(query)
      .collation(collation)
      .populate("mpn")
      .populate("LinkedMPNCategory", "name")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    return res.json({
      success: true,
      data: children,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("getAllChild error:", err);
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Import Child data
 */
export const importChild = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: "No file uploaded" });

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const mappedData = [];

    for (const row of data) {
      if (!row["Child Part No"] || !row["Linked MPN"]) continue;

      // Find MPN by its part number
      const parentMpn = await MPN.findOne({ MPN: row["Linked MPN"] });
      if (!parentMpn) {
        console.warn(`MPN not found for child ${row["Child Part No"]}`);
        continue; // skip this row
      }

      mappedData.push({
        ChildPartNo: row["Child Part No"],
        mpn: parentMpn._id,
        LinkedMPNCategory: parentMpn?.Category || "",
        status: row["status"]?.toLowerCase() === "inactive" ? "inactive" : "active",
      });
    }

    // Insert or update each child (avoid duplicates by ChildPartNo + mpn)
    const results = [];
    for (const child of mappedData) {
      const updated = await Child.findOneAndUpdate(
        { ChildPartNo: child.ChildPartNo, mpn: child.mpn },
        { $set: child },
        { upsert: true, new: true }
      );
      results.push(updated);
    }

    return res.json({
      success: true,
      message: "Child data imported successfully",
      data: results,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Export Child data
 */
// export const exportChild = async (req, res) => {
//   try {
//     const children = await Child.find().populate("mpn").lean();
//     const worksheet = XLSX.utils.json_to_sheet(children);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, "Children");

//     const filePath = "child_export.xlsx";
//     XLSX.writeFile(workbook, filePath);

//     res.download(filePath);
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };


export const exportChild = async (req, res) => {
  try {
    // ✅ Populate MPN reference to access related info
    const children = await Child.find()
      .populate({
        path: "mpn",
        populate: {
          path: "Category",
          select: "name",
        },
        select: "MPN Category Status",
      })
      .lean();

    // ✅ Map only required fields
    const excelData = children.map((item) => ({
      "Child Part No": item.ChildPartNo || "",
      "Linked MPN No": item.mpn?.MPN || "",
      "Linked Category": item.mpn?.Category?.name || "",
      "Status": item.mpn?.Status || "",
    }));

    // ✅ Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Child Parts");

    // ✅ Auto column width
    const colWidths = Object.keys(excelData[0] || {}).map((key) => {
      const maxLength = Math.max(
        key.length,
        ...excelData.map((r) => (r[key] ? r[key].toString().length : 0))
      );
      return { wch: Math.min(Math.max(maxLength + 2, 12), 40) }; // min 12, max 40
    });
    worksheet["!cols"] = colWidths;

    // ✅ Freeze header row and enable AutoFilter
    const totalCols = Object.keys(excelData[0] || {}).length;
    const lastColLetter = XLSX.utils.encode_col(totalCols - 1);
    worksheet["!autofilter"] = { ref: `A1:${lastColLetter}1` };
    worksheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2" };

    // ✅ Write file to buffer (no need to store on disk)
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // ✅ Set headers for download
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=child_export_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    // ✅ Send buffer directly
    return res.send(buffer);
  } catch (err) {
    console.error("Export Child Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

import mongoose from "mongoose";
import Child from "../../models/library/Child.js";
import MPN from "../../models/library/MPN.js";
import XLSX from "xlsx";
import path from 'path'
import fs from 'fs'
/**
 * Add new Child
 */
// export const addChild = async (req, res) => {
//   try {
//     const { mpn: mpnId, childPartNo } = req.body;

//     // 1️⃣ Check parent MPN exists
//     const mpn = await MPN.findById(mpnId);
//     if (!mpn) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Parent MPN not found" });
//     }

//     // 2️⃣ Check if this childPartNo is already linked to some other MPN
//     //    Rule: one child part no cannot be linked to 2 or more MPNs
//     const existingChild = await Child.findOne({ childPartNo });

//     if (existingChild && existingChild.mpn.toString() !== mpnId.toString()) {
//       return res.status(400).json({
//         success: false,
//         message: "This child part number is already linked to another MPN.",
//       });
//     }

//     // 3️⃣ Create + save child
//     const child = new Child({
//       ...req.body,
//       mpn: mpnId, // make sure mpn is set correctly
//     });

//     await child.save();

//     return res
//       .status(201)
//       .json({ success: true, message: "Child created", data: child });
//   } catch (err) {
//     return res
//       .status(400)
//       .json({ success: false, message: err.message || "Something went wrong" });
//   }
// };

export const addChild = async (req, res) => {
  try {
    // ✅ accept both keys (frontend mismatch safe)
    const mpnId = req.body?.mpn || req.body?.mpnId;
    const childPartNo =
      req.body?.childPartNo ||
      req.body?.ChildPartNo ||   // ✅ your payload
      req.body?.childPartNO;

    if (!mpnId || !childPartNo) {
      return res.status(400).json({
        success: false,
        message: "mpn and childPartNo are required",
      });
    }

    // 1️⃣ Check parent MPN exists
    const mpn = await MPN.findById(mpnId).lean();
    if (!mpn) {
      return res.status(404).json({
        success: false,
        message: "Parent MPN not found",
      });
    }

    // 2️⃣ Prevent duplicates
    const existingChild = await Child.findOne({ ChildPartNo: childPartNo }).lean();

    // ✅ linked to another MPN
    if (existingChild && String(existingChild.mpn) !== String(mpnId)) {
      return res.status(400).json({
        success: false,
        message: "This child part number is already linked to another MPN.",
      });
    }

    // ✅ linked to same MPN (duplicate add)
    if (existingChild && String(existingChild.mpn) === String(mpnId)) {
      return res.status(400).json({
        success: false,
        message: "This child part number is already linked to this MPN.",
      });
    }

    // 3️⃣ Create
    const child = await Child.create({
      ...req.body,
      mpn: mpnId,
      ChildPartNo: childPartNo, // ✅ keep schema key consistent
    });

    return res.status(201).json({
      success: true,
      message: "Child created",
      data: child,
    });
  } catch (err) {
    console.error("addChild error:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Something went wrong",
    });
  }
};

/**
 * Update Child
 */
export const updateChild = async (req, res) => {
  try {
    const childId = req.params.id;

    // 1️⃣ Find existing child
    const existingChild = await Child.findById(childId);
    if (!existingChild) {
      return res
        .status(404)
        .json({ success: false, message: "Child not found" });
    }

    // 2️⃣ Determine final values after update
    const newMpnId = req.body.mpn || existingChild.mpn;
    const newChildPartNo = req.body.childPartNo || existingChild.childPartNo;

    // 3️⃣ Validate new parent MPN exists (if changed)
    if (req.body.mpn) {
      const mpn = await MPN.findById(newMpnId);
      if (!mpn) {
        return res
          .status(404)
          .json({ success: false, message: "Parent MPN not found" });
      }
    }

    // 4️⃣ Check if same childPartNo is already linked to a different MPN
    const conflictChild = await Child.findOne({
      _id: { $ne: childId },         // ignore current child
      childPartNo: newChildPartNo,   // same childPartNo
      mpn: { $ne: newMpnId },        // but different MPN → not allowed
    });

    if (conflictChild) {
      return res.status(400).json({
        success: false,
        message: "This child part number is already linked to another MPN.",
      });
    }

    // 5️⃣ Perform update
    const updatedChild = await Child.findByIdAndUpdate(
      childId,
      {
        ...req.body,
        mpn: newMpnId,
        childPartNo: newChildPartNo,
      },
      { new: true }
    );

    return res.json({
      success: true,
      message: "Child updated",
      data: updatedChild,
    });
  } catch (err) {
    return res
      .status(400)
      .json({ success: false, message: err.message || "Something went wrong" });
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

const escapeRegex = (s = "") => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getAllChild = async (req, res) => {
  try {
    // ✅ FIX: radix must be 10
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
      query.status = String(status);
    }

    if (search && String(search).trim()) {
      const safe = escapeRegex(String(search).trim());
      const rx = new RegExp(safe, "i");

      // Child string fields
      orClauses.push(
        { ChildPartNo: { $regex: rx } },
        { description: { $regex: rx } },
        { status: { $regex: rx } }
      );

      // MPN search -> ids
      const matchedMpns = await MPN.find({ MPN: { $regex: rx } }, { _id: 1 }).lean();
      if (matchedMpns.length) {
        orClauses.push({ mpn: { $in: matchedMpns.map((m) => m._id) } });
      }

      // Category name search -> ids
      const CategoryModel = mongoose.models.Category;
      if (CategoryModel) {
        const matchedCats = await CategoryModel.find({ name: { $regex: rx } }, { _id: 1 }).lean();
        if (matchedCats.length) {
          orClauses.push({ LinkedMPNCategory: { $in: matchedCats.map((c) => c._id) } });
        }
      }
    }

    if (orClauses.length) query.$or = orClauses;

    // ✅ total
    const total = await Child.countDocuments(query);

    // ✅ if page too high (after filters/search), clamp to last page
    const totalPages = Math.max(Math.ceil(total / limitNum), 1);
    const safePage = Math.min(pageNum, totalPages);

    const children = await Child.find(query)
      .collation(collation)
      .populate("mpn")
      .populate("LinkedMPNCategory", "name")
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * limitNum)
      .limit(limitNum)
      .lean();

    return res.json({
      success: true,
      data: children,
      pagination: {
        total,
        page: safePage,         // ✅ important: return clamped page
        limit: limitNum,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPrevPage: safePage > 1,
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
// export const importChild = async (req, res) => {
//   try {
//     if (!req.file)
//       return res.status(400).json({ success: false, message: "No file uploaded" });

//     const workbook = XLSX.readFile(req.file.path);
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const data = XLSX.utils.sheet_to_json(sheet);

//     const mappedData = [];

//     for (const row of data) {
//       if (!row["Child Part No."] || !row["Linked MPN"]) continue;

//       // Find MPN by its part number
//       const parentMpn = await MPN.findOne({ MPN: row["Linked MPN"] });
//       if (!parentMpn) {
//         console.warn(`MPN not found for child ${row["Child Part No."]}`);
//         continue; // skip this row
//       }

//       mappedData.push({
//         ChildPartNo: row["Child Part No."],
//         mpn: parentMpn._id,
//         LinkedMPNCategory: parentMpn?.Category || "",
//         status: row["status"]?.toLowerCase() === "inactive" ? "inactive" : "active",
//       });
//     }

//     // Insert or update each child (avoid duplicates by ChildPartNo + mpn)
//     const results = [];
//     for (const child of mappedData) {
//       const updated = await Child.findOneAndUpdate(
//         { ChildPartNo: child.ChildPartNo, mpn: child.mpn },
//         { $set: child },
//         { upsert: true, new: true }
//       );
//       results.push(updated);
//     }

//     return res.json({
//       success: true,
//       message: "Child data imported successfully",
//       data: results,
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

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

// export const importChild = async (req, res) => {
//   try {
//     if (!req.file)
//       return res.status(400).json({ success: false, message: "No file uploaded" });

//     const workbook = XLSX.readFile(req.file.path);
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];

//     // Convert sheet to JSON WITHOUT relying on messy headers
//     const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

//     const headers = rawData[0];

//     // Normalize headers → trim, lowercase, remove extra spaces/dots
//     const normalizedHeaders = headers.map(h =>
//       String(h)
//         .trim()
//         .toLowerCase()
//         .replace(/\./g, "")         // remove dots
//         .replace(/\s+/g, "_")       // replace spaces with underscore
//     );

//     // Create array of objects with normalized keys
//     const data = rawData.slice(1).map(row => {
//       const obj = {};
//       normalizedHeaders.forEach((key, i) => {
//         obj[key] = row[i];
//       });
//       return obj;
//     });

//     const mappedData = [];

//     for (const row of data) {
//       const childPart = row["child_part_no"]; // normalized
//       const linkedMPN = row["linked_mpn"];    // normalized

//       if (!childPart || !linkedMPN) continue;

//       const parentMpn = await MPN.findOne({ MPN: String(linkedMPN).trim() });
//       if (!parentMpn) {
//         console.warn(`MPN not found for child ${childPart}`);
//         continue;
//       }

//       mappedData.push({
//         ChildPartNo: String(childPart).trim(),
//         mpn: parentMpn._id,
//         LinkedMPNCategory: parentMpn?.Category ? parentMpn.Category : null,
//         status: (row["status"] || "").trim().toLowerCase() === "inactive" ? "inactive" : "active",
//       });
//     }

//     const results = [];
//     for (const child of mappedData) {
//       const updated = await Child.findOneAndUpdate(
//         { ChildPartNo: child.ChildPartNo, mpn: child.mpn },
//         { $set: child },
//         { upsert: true, new: true }
//       );
//       results.push(updated);
//     }

//     return res.json({
//       success: true,
//       message: "Child data imported successfully",
//       data: results,
//     });

//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// export const importChild = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "No file uploaded",
//       });
//     }

//     const workbook = XLSX.readFile(req.file.path);
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];

//     // Read raw rows
//     const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

//     if (!rawData.length) {
//       return res.status(400).json({
//         success: false,
//         message: "Excel file is empty",
//       });
//     }

//     // Normalize headers
//     const headers = rawData[0].map(h =>
//       String(h)
//         .trim()
//         .toLowerCase()
//         .replace(/\./g, "")
//         .replace(/\s+/g, "_")
//     );

//     // Build row objects
//     const rows = rawData.slice(1).map(r => {
//       const obj = {};
//       headers.forEach((h, i) => {
//         obj[h] = r[i];
//       });
//       return obj;
//     });

//     const errors = [];
//     const inserted = [];

//     // 🔑 To avoid duplicate inserts from SAME FILE
//     const seenChildParts = new Set();

//     for (let i = 0; i < rows.length; i++) {
//       const row = rows[i];
//       const rowNo = i + 2;

//       try {
//         const childPartNo = String(row.child_part_no || "").trim();
//         const linkedMPN = String(row.linked_mpn || "").trim();

//         // ❌ Missing values
//         if (!childPartNo || childPartNo.toLowerCase() === "null") {
//           errors.push(`Row ${rowNo}: Invalid Child Part Number`);
//           continue;
//         }


//         // ❌ Duplicate in same Excel file
//         // if (seenChildParts.has(childPartNo)) {
//         //   errors.push(`Child Part ${childPartNo} duplicated in Excel`);
//         //   continue;
//         // }
//         seenChildParts.add(childPartNo);

//         // 🔎 Find parent MPN
//         const mpnDoc = await MPN.findOne({ MPN: linkedMPN }).lean();
//         if (!mpnDoc) {
//           errors.push(`Child Part ${childPartNo} → MPN "${linkedMPN}" not found`);
//           continue;
//         }

//         // 🔎 Existing child check
//         console.log('------childPartNo', childPartNo)
//         const existingChild = await Child.findOne({
//           ChildPartNo: childPartNo,
//         }).lean();

//         console.log('------existingChild', existingChild)
//         if (existingChild) {
//           errors.push(`Child Part ${row.child_part_no} already exists`);
//           continue;
//         }

//         // Already linked to another MPN
//         if (existingChild && String(existingChild.mpn) !== String(mpnDoc._id)) {
//           errors.push(
//             `Child Part ${childPartNo} already linked to another MPN`
//           );
//           continue;
//         }

//         // Already linked to same MPN
//         // if (existingChild && String(existingChild.mpn) === String(mpnDoc._id)) {
//         //   errors.push(
//         //     `Child Part ${childPartNo} already linked to this MPN`
//         //   );
//         //   continue;
//         // }

//         console.log('-----created---', childPartNo, mpnDoc._id, mpnDoc.Category);


//         const created = await Child.create({
//           ChildPartNo: childPartNo,
//           mpn: mpnDoc._id,
//           LinkedMPNCategory: mpnDoc.Category || null,
//           status: "Active",
//         });




//         inserted.push(created);
//       } catch (err) {
//         // ❌ Hide ugly Mongo errors
//         if (err.code === 11000) {
//           // errors.push(`Child Part ${row.child_part_no} already exists`);
//         } else {
//           errors.push(`Row ${rowNo}: ${err.message}`);
//         }
//       }
//     }

//     return res.json({
//       success: errors.length === 0,
//       insertedCount: inserted.length,
//       errorCount: errors.length,
//       message:
//         errors.length > 0
//           ? errors.join(" | ")
//           : "Child data imported successfully",
//       data: inserted,
//     });

//   } catch (err) {
//     console.error("importChild error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to import child data",
//     });
//   }
// };

// export const importChild = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "No file uploaded",
//       });
//     }

//     const workbook = XLSX.readFile(req.file.path);
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];

//     const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

//     if (!rawData.length) {
//       return res.status(400).json({
//         success: false,
//         message: "Excel file is empty",
//       });
//     }

//     const headers = rawData[0].map((h) =>
//       String(h)
//         .trim()
//         .toLowerCase()
//         .replace(/\./g, "")
//         .replace(/\s+/g, "_")
//     );

//     const rows = rawData.slice(1).map((r) => {
//       const obj = {};
//       headers.forEach((h, i) => {
//         obj[h] = r[i];
//       });
//       return obj;
//     });

//     const inserted = [];

//     // ✅ Collect errors as objects (better control + short message)
//     const errors = []; // { rowNo, childPartNo, linkedMPN, error }

//     const seenChildParts = new Set();

//     for (let i = 0; i < rows.length; i++) {
//       const row = rows[i];
//       const rowNo = i + 2;

//       try {
//         const childPartNo = String(row.child_part_no || "").trim();
//         const linkedMPN = String(row.linked_mpn || "").trim();

//         // ❌ Missing Child Part
//         if (!childPartNo || childPartNo.toLowerCase() === "null") {
//           errors.push({
//             rowNo,
//             childPartNo: childPartNo || null,
//             linkedMPN: linkedMPN || null,
//             error: "Invalid Child Part Number",
//           });
//           continue;
//         }

//         // ✅ Duplicate in SAME Excel file (optional)
//         if (seenChildParts.has(childPartNo)) {
//           errors.push({
//             rowNo,
//             childPartNo,
//             linkedMPN: linkedMPN || null,
//             error: "Duplicate Child Part in Excel file",
//           });
//           continue;
//         }
//         seenChildParts.add(childPartNo);

//         // ✅ 1) FIRST: Find parent MPN
//         const mpnDoc = await MPN.findOne({ MPN: linkedMPN }).lean();

//         // ✅ If MPN not found → STOP HERE for this row (no further checks)
//         if (!mpnDoc) {
//           errors.push({
//             rowNo,
//             childPartNo,
//             linkedMPN,
//             error: `MPN "${linkedMPN}" not found`,
//           });
//           continue;
//         }

//         // ✅ 2) THEN: Check existing child only if MPN exists
//         const existingChild = await Child.findOne({
//           ChildPartNo: childPartNo,
//         }).lean();

//         if (existingChild) {
//           // Already exists - short message
//           errors.push({
//             rowNo,
//             childPartNo,
//             linkedMPN,
//             error: "Child Part already exists",
//           });
//           continue;
//         }

//         const created = await Child.create({
//           ChildPartNo: childPartNo,
//           mpn: mpnDoc._id,
//           LinkedMPNCategory: mpnDoc.Category || null,
//           status: "Active",
//         });

//         inserted.push(created);
//       } catch (err) {
//         // if (err?.code === 11000) {
//         //   errors.push({
//         //     rowNo,
//         //     childPartNo: String(rows[i]?.child_part_no || "").trim() || null,
//         //     linkedMPN: String(rows[i]?.linked_mpn || "").trim() || null,
//         //     error: "Duplicate key error (already exists)",
//         //   });
//         // } else {
//         //   errors.push({
//         //     rowNo,
//         //     childPartNo: String(rows[i]?.child_part_no || "").trim() || null,
//         //     linkedMPN: String(rows[i]?.linked_mpn || "").trim() || null,
//         //     error: err.message,
//         //   });
//         // }
//       }
//     }

//     // ✅ Short message (no long join)
//     const success = errors.length === 0;

//     // ✅ return only first 10 errors in message (optional)
//     const MAX_ERRORS_IN_MESSAGE = 10;
//     const shortErrors = errors
//       .slice(0, MAX_ERRORS_IN_MESSAGE)
//       .map((e) => `Row ${e.rowNo}: ${e.error}`);

//     const messageText = success
//       ? "Child data imported successfully"
//       : `Import completed with errors (${errors.length}). ` +
//         `${shortErrors.join(" | ")}` +
//         (errors.length > MAX_ERRORS_IN_MESSAGE ? " | ...more" : "");

//     return res.json({
//       success,
//       insertedCount: inserted.length,
//       errorCount: errors.length,
//       message: messageText,

//       // ✅ full errors separate - frontend can show in table/download
//       errors, // array of objects
//       data: inserted,
//     });
//   } catch (err) {
//     console.error("importChild error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to import child data",
//     });
//   }
// };

// export const importChild = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ success: false, message: "No file uploaded" });
//     }

//     const workbook = XLSX.readFile(req.file.path);
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

//     if (!rawData.length) {
//       return res.status(400).json({ success: false, message: "Excel file is empty" });
//     }

//     const headers = rawData[0].map((h) =>
//       String(h).trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, "_")
//     );

//     const rows = rawData.slice(1).map((r) => {
//       const obj = {};
//       headers.forEach((h, i) => (obj[h] = r[i]));
//       return obj;
//     });

//     const inserted = [];
//     const errors = [];

//     // ✅ Missing MPN export list
//     const missingMpns = []; // { rowNo, childPartNo, missingMPN }
//     const missingKeySet = new Set();

//     const seenChildParts = new Set();

//     // ✅ CSV helper
//     const toCSV = (list) => {
//       const esc = (v) => {
//         const s = String(v ?? "");
//         if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
//         return s;
//       };

//       const header = ["rowNo", "childPartNo", "missingMPN", "note"];
//       const lines = [
//         header.join(","),
//         ...list.map((x) =>
//           [
//             esc(x.rowNo),
//             esc(x.childPartNo),
//             esc(x.missingMPN),
//             esc(x.note || "MPN not found in MPN library"),
//           ].join(",")
//         ),
//       ];
//       return lines.join("\n");
//     };

//     for (let i = 0; i < rows.length; i++) {
//       const row = rows[i];
//       const rowNo = i + 2;

//       const childPartNo = String(row.child_part_no || "").trim();
//       const linkedMPN = String(row.linked_mpn || "").trim();

//       // ❌ Missing Child Part
//       if (!childPartNo || childPartNo.toLowerCase() === "null") {
//         // errors.push({ rowNo, childPartNo: childPartNo || null, linkedMPN: linkedMPN || null, error: "Invalid Child Part Number" });
//         continue;
//       }

//       // ❌ Duplicate in same Excel
//       if (seenChildParts.has(childPartNo)) {
//         // errors.push({ rowNo, childPartNo, linkedMPN: linkedMPN || null, error: "Duplicate Child Part in Excel file" });
//         continue;
//       }
//       seenChildParts.add(childPartNo);

//       // ✅ Find parent MPN
//       const mpnDoc = await MPN.findOne({ MPN: linkedMPN }).lean();

//       // ✅ If MPN missing: add to missing list + continue (import should NOT stop)
//       if (!mpnDoc) {
//         const key = `${linkedMPN}__${childPartNo}`;
//         if (!missingKeySet.has(key)) {
//           missingKeySet.add(key);
//           missingMpns.push({
//             rowNo,
//             childPartNo,
//             missingMPN: linkedMPN,
//             note: "MPN not found in MPN library",
//           });
//         }

//         // optional: also add in errors (short)
//         errors.push({ rowNo, childPartNo, linkedMPN, error: `MPN "${linkedMPN}" not found` });
//         continue;
//       }

//       // ✅ Existing child only if MPN exists
//       const existingChild = await Child.findOne({ ChildPartNo: childPartNo }).lean();
//       if (existingChild) {
//         // errors.push({ rowNo, childPartNo, linkedMPN, error: "Child Part already exists" });
//         continue;
//       }

//       const created = await Child.create({
//         ChildPartNo: childPartNo,
//         mpn: mpnDoc._id,
//         LinkedMPNCategory: mpnDoc.Category || null,
//         status: "Active",
//       });

//       inserted.push(created);
//     }

//     let missingMpnsFileUrl = null;

//     if (missingMpns.length > 0) {
//       const exportDir = path.join(process.cwd(), "uploads", "exports");
//       if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

//       const fileName = `missing-mpns-${Date.now()}.xlsx`;
//       const filePath = path.join(exportDir, fileName);

//       // ✅ Prepare clean rows
//       const excelRows = missingMpns.map((x) => ({
//         "Row No": x.rowNo,
//         "Child Part No": x.childPartNo,
//         "Missing MPN": x.missingMPN,
//         "Note": x.note || "MPN not found in MPN library",
//       }));

//       // ✅ Create workbook & sheet
//       const wb = XLSX.utils.book_new();
//       const ws = XLSX.utils.json_to_sheet(excelRows);

//       // ✅ Set column widths (wch = character width)
//       ws["!cols"] = [
//         { wch: 8 },   // Row No
//         { wch: 20 },  // Child Part No
//         { wch: 22 },  // Missing MPN
//         { wch: 40 },  // Note
//       ];

//       XLSX.utils.book_append_sheet(wb, ws, "Missing_MPNs");

//       // ✅ Write Excel file
//       XLSX.writeFile(wb, filePath);

//       // ✅ Public URL
//       missingMpnsFileUrl = `/uploads/exports/${fileName}`;
//     }



//     // ✅ short message
//     const MAX_ERRORS_IN_MESSAGE = 5;
//     const shortErrors = errors.slice(0, MAX_ERRORS_IN_MESSAGE).map((e) => `Row ${e.rowNo}: ${e.error}`);

//     const messageText =
//       errors.length === 0
//         ? "Child data imported successfully"
//         : 
//         `${shortErrors.join(" | ")}` +
//         (errors.length > MAX_ERRORS_IN_MESSAGE ? " | ...more" : "");

//     return res.json({
//       success: errors.length === 0,
//       insertedCount: inserted.length,
//       errorCount: errors.length,
//       missingMpnCount: missingMpns.length,
//       message: messageText,

//       // ✅ download link for excel/csv
//       missingMpnsFileUrl,

//       // optional previews
//       missingMpnsPreview: missingMpns.slice(0, 20),
//       errors, // full errors
//       data: inserted,
//     });
//   } catch (err) {
//     console.error("importChild error:", err);
//     return res.status(500).json({ success: false, message: "Failed to import child data" });
//   }
// };

export const importChild = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (!rawData.length) {
      return res.status(400).json({ success: false, message: "Excel file is empty" });
    }

    const headers = rawData[0].map((h) =>
      String(h).trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, "_")
    );

    const rows = rawData.slice(1).map((r) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = r[i]));
      return obj;
    });

    const inserted = [];
    const errors = [];

    const missingMpns = [];
    const missingKeySet = new Set();

    const seenChildParts = new Set();

    // ✅ 1) Pre-collect all childPartNo + mpn codes
    const childPartList = [];
    const mpnCodeSet = new Set();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNo = i + 2;

      const childPartNo = String(row.child_part_no || "").trim();
      const linkedMPN = String(row.linked_mpn || "").trim();

      if (!childPartNo || childPartNo.toLowerCase() === "null") continue;

      // duplicate in excel
      if (seenChildParts.has(childPartNo)) continue;
      seenChildParts.add(childPartNo);

      childPartList.push({ rowNo, childPartNo, linkedMPN });

      if (linkedMPN) mpnCodeSet.add(linkedMPN);
    }

    // ✅ 2) Batch fetch all MPN docs once
    const mpnCodes = [...mpnCodeSet];
    const mpnDocs = await MPN.find({ MPN: { $in: mpnCodes } })
      .select("_id MPN Category")
      .lean();

    const mpnMap = new Map(mpnDocs.map((m) => [String(m.MPN), m]));

    // ✅ 3) Batch fetch existing Child parts once
    const existingChildren = await Child.find({ ChildPartNo: { $in: childPartList.map(x => x.childPartNo) } })
      .select("_id ChildPartNo")
      .lean();

    const existingChildSet = new Set(existingChildren.map((c) => String(c.ChildPartNo)));

    // ✅ 4) Now process rows without stopping
    for (const item of childPartList) {
      const { rowNo, childPartNo, linkedMPN } = item;

      const mpnDoc = mpnMap.get(linkedMPN);

      // missing mpn -> add to export list & continue
      if (!mpnDoc) {
        const key = `${linkedMPN}__${childPartNo}`;
        if (!missingKeySet.has(key)) {
          missingKeySet.add(key);
          missingMpns.push({
            rowNo,
            childPartNo,
            missingMPN: linkedMPN,
            note: "MPN not found in MPN library",
          });
        }
        errors.push({ rowNo, childPartNo, linkedMPN, error: `MPN "${linkedMPN}" not found` });
        continue;
      }

      // child exists -> skip
      if (existingChildSet.has(childPartNo)) {
        // optionally track it
        // errors.push({ rowNo, childPartNo, linkedMPN, error: "Child Part already exists" });
        continue;
      }

      // ✅ create child
      const created = await Child.create({
        ChildPartNo: childPartNo,
        mpn: mpnDoc._id,
        LinkedMPNCategory: mpnDoc.Category || null,
        status: "Active",
      });

      inserted.push(created);
      existingChildSet.add(childPartNo);
    }

    // ✅ Export missing MPNs to Excel
    let missingMpnsFileUrl = null;

    if (missingMpns.length > 0) {
      const exportDir = path.join(process.cwd(), "uploads", "exports");
      if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

      const fileName = `missing-mpns-${Date.now()}.xlsx`;
      const filePath = path.join(exportDir, fileName);

      const excelRows = missingMpns.map((x) => ({
        "Row No": x.rowNo,
        "Child Part No": x.childPartNo,
        "Missing MPN": x.missingMPN,
        "Note": x.note || "MPN not found in MPN library",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelRows);

      ws["!cols"] = [
        { wch: 8 },
        { wch: 20 },
        { wch: 22 },
        { wch: 40 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Missing_MPNs");
      XLSX.writeFile(wb, filePath);

      missingMpnsFileUrl = `/uploads/exports/${fileName}`;
    }

    // ✅ response message
    const MAX_ERRORS_IN_MESSAGE = 5;
    const shortErrors = errors.slice(0, MAX_ERRORS_IN_MESSAGE).map((e) => `Row ${e.rowNo}: ${e.error}`);

    const messageText =
      errors.length === 0
        ? "Child data imported successfully"
        : `${shortErrors.join(" | ")}` + (errors.length > MAX_ERRORS_IN_MESSAGE ? " | ...more" : "");

    return res.json({
      success: errors.length === 0,
      insertedCount: inserted.length,
      errorCount: errors.length,
      missingMpnCount: missingMpns.length,
      message: messageText,
      missingMpnsFileUrl,
      missingMpnsPreview: missingMpns.slice(0, 20),
      errors,
      data: inserted,
    });
  } catch (err) {
    console.error("importChild error:", err);
    return res.status(500).json({ success: false, message: "Failed to import child data" });
  }
};








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

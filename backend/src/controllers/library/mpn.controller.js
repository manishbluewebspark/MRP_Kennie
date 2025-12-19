import Child from "../../models/library/Child.js";
import MPN from "../../models/library/MPN.js";
import XLSX from "xlsx";
import path from "path";
import { mapRowToSchemaforMPN } from "../../utils/mapRowToSchema.js";
import Category from "../../models/Category.js";
import Suppliers from "../../models/Suppliers.js";
import UOM from "../../models/UOM.js";

const fieldMap = {
  "MPN": "MPN",
  "Manufacturer": "Manufacturer",
  "Description": "Description",
  "UOM": "UOM",
  "Storage Location": "StorageLocation",
  "RFQ Unit Price": "RFQUnitPrice",
  "MOQ": "MOQ",
  "RFQ Date": "RFQDate",
  "Supplier": "Supplier",
  "Lead time_WK": "LeadTime_WK",
  "Category": "Category",
};


function mapRowToSchema(row) {
  const mapped = {};
  for (const key in row) {
    if (fieldMap[key]) {
      mapped[fieldMap[key]] = row[key];
    }
  }
  return mapped;
}



/**
 * Add new MPN
 */
export const addMpn = async (req, res) => {
  try {
    const mpn = new MPN(req.body);
    await mpn.save();

    await Inventory.create({
      mpnId: mpn._id,       // ✅ only this is required
    });

    return res.status(201).json({ success: true, message: "MPN created", data: mpn });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Update MPN
 */
export const updateMpn = async (req, res) => {
  try {
    const mpn = await MPN.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!mpn) return res.status(404).json({ success: false, message: "MPN not found" });
    return res.json({ success: true, message: "MPN updated", data: mpn });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Delete MPN
 */
export const deleteMpn = async (req, res) => {
  try {
    const mpn = await MPN.findByIdAndDelete(req.params.id);
    if (!mpn) return res.status(404).json({ success: false, message: "MPN not found" });
    // Optionally also delete its children
    await Inventory.deleteOne({ mpnId: mpn._id });
    await Child.updateMany(
      { mpn: mpn._id },
      { $set: { isDeleted: true } } // <-- mark as deleted
    );
    return res.json({ success: true, message: "MPN deleted" });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Get MPN by ID
 */
export const getMpnById = async (req, res) => {
  try {
    const mpn = await MPN.findById(req.params.id);
    if (!mpn) return res.status(404).json({ success: false, message: "MPN not found" });
    return res.json({ success: true, data: mpn });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Get all MPN with filters
 */
// export const getAllMpn = async (req, res) => {
//   try {
//     const filters = req.query || {};
//     const mpns = await MPN.find(filters).populate("children");
//     return res.json({ success: true, data: mpns });
//   } catch (err) {
//     return res.status(400).json({ success: false, message: err.message });
//   }
// };

// export const getAllMpn = async (req, res) => {
//   try {
//     const { page = 1, limit = 10, search = "" } = req.query;

//     const query = {};
//     if (search) {
//       // Search by MPN, Manufacturer, or Description
//       query.$or = [
//         { MPN: { $regex: search, $options: "i" } },
//         { Manufacturer: { $regex: search, $options: "i" } },
//         { Description: { $regex: search, $options: "i" } },
//       ];
//     }

//     const total = await MPN.countDocuments(query);

//     const mpns = await MPN.find(query)
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit))
//       .lean();

//     return res.json({
//       success: true,
//       data: mpns,
//       total,
//       page: parseInt(page),
//       limit: parseInt(limit),
//     });
//   } catch (err) {
//     return res.status(400).json({ success: false, message: err.message });
//   }
// };

// export const getAllMpn = async (req, res) => {
//   try {
//     const { page = 1, limit = 10, search = "" } = req.query;

//     const query = {};

//    if (search) {
//   const regex = new RegExp(search, 'i'); // 'i' = case-insensitive
//   query.$or = [
//     { MPN: regex },
//     { Manufacturer: regex },
//     { Description: regex }
//   ];
// }


//     const total = await MPN.countDocuments(query);

//     const mpns = await MPN.find(query)
//       .populate("UOM", "code")
//       .populate("Supplier", "companyName")
//       .populate("Category", "name")
//       .sort({ createdAt: -1 }) // latest first
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit))
//       .lean();

//     return res.json({
//       success: true,
//       data: mpns,
//       total,
//       page: parseInt(page),
//       limit: parseInt(limit),
//     });
//   } catch (err) {
//     return res.status(400).json({ success: false, message: err.message });
//   }
// };

import mongoose from "mongoose"; // make sure this is imported where your controllers live
import Currency from "../../models/Currency.js";
import Inventory from "../../models/Inventory.js";


export const getAllMpn = async (req, res) => {
  try {
    let { page, limit, search = "", category, status } = req.query;

    // 🔁 Decide: paginate or return all
    const hasPaging = page !== undefined || limit !== undefined;

    // Build query
    const query = {};

    if (typeof search === "string" && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ MPN: regex }, { Manufacturer: regex }, { Description: regex }];
    }

    if (category && category !== "all" && mongoose.Types.ObjectId.isValid(category)) {
      query.Category = new mongoose.Types.ObjectId(category);
    }

    if (status && status.trim().toLowerCase() !== "all") {
      query.Status = status.trim().toLowerCase();
    }


    // ⚙️ Common find (without skip/limit)
    const baseFind = MPN.find(query)
      .populate("UOM", "code")
      .populate("Supplier", "companyName")
      .populate("Category", "name")
      .populate({
        path: "purchaseHistory.Supplier", // Populate Supplier in purchaseHistory array
        select: "companyName"
      })
       .populate({
        path: "purchaseHistory.currency", // Populate Supplier in purchaseHistory array
        select: "symbol"
      })

      .sort({ createdAt: -1 })
      .lean();

    if (hasPaging) {
      // 📄 Paginated response
      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.max(parseInt(limit, 10) || 10, 1);

      const [totalItems, items] = await Promise.all([
        MPN.countDocuments(query),
        baseFind.skip((pageNum - 1) * limitNum).limit(limitNum),
      ]);

      return res.status(200).json({
        success: true,
        data: items,
        pagination: {
          mode: "paged",
          currentPage: pageNum,
          itemsPerPage: limitNum,
          totalItems,
          totalPages: Math.ceil(totalItems / limitNum),
        },
      });
    } else {
      // 📦 Return ALL records (no pagination)
      const items = await baseFind;
      return res.status(200).json({
        success: true,
        data: items,
        pagination: {
          mode: "all",
          totalItems: items.length,
        },
      });
    }
  } catch (err) {
    console.error("❌ getAllMpn Error:", err);
    return res.status(400).json({ success: false, message: err.message || "Error fetching MPNs" });
  }
};

// export const getAllMpn = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 10,
//       search = "",
//       category,          // e.g. "68ee7ca0e27c1446454dfcb2"
//       status             // e.g. "Active"
//     } = req.query;

//     const query = {};

//     // 🔎 generic search across key text fields
//     if (search) {
//       const regex = new RegExp(search, "i");
//       query.$or = [
//         { MPN: regex },
//         { Manufacturer: regex },
//         { Description: regex }
//       ];
//     }

//     // 🏷️ filter by Category (ObjectId) if provided
//     if (category && category !== "all" && mongoose.Types.ObjectId.isValid(category)) {
//       query.Category = new mongoose.Types.ObjectId(category);
//     }

//     // ✅ filter by Status if provided
//     // NOTE: if your schema uses lowercase `status`, change "Status" to "status" below.
//     if (status) {
//       query.Status = status; // or query.status = status; depending on your schema field
//     }

//     const pageNum = Number(page) || 1;
//     const limitNum = Number(limit) || 10;

//     const [total, mpns] = await Promise.all([
//       MPN.countDocuments(query),
//       MPN.find(query)
//         .populate("UOM", "code")
//         .populate("Supplier", "companyName")
//         .populate("Category", "name")
//         .sort({ createdAt: -1 })
//         .skip((pageNum - 1) * limitNum)
//         .limit(limitNum)
//         .lean()
//     ]);

//     return res.json({
//       success: true,
//       data: mpns,
//       total,
//       page: pageNum,
//       limit: limitNum
//     });
//   } catch (err) {
//     return res.status(400).json({ success: false, message: err.message });
//   }
// };




/**
 * Import MPN data from Excel
 */
// export const importMpn = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ success: false, message: "No file uploaded" });
//     }

//     const workbook = XLSX.readFile(req.file.path);
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const rows = XLSX.utils.sheet_to_json(sheet);

//     let results = { inserted: 0, updated: 0, errors: [] };

//     for (const row of rows) {
//       try {
//         const mappedRow = mapRowToSchema(row); // Excel → Schema format

//         if (!mappedRow.MPN) {
//           results.errors.push({ row, error: "Missing MPN" });
//           continue;
//         }

//         const existing = await MPN.findOne({ MPN: mappedRow.MPN });

//         if (existing) {
//           await MPN.updateOne(
//             { MPN: mappedRow.MPN },
//             { $set: mappedRow }
//           );
//           results.updated++;
//         } else {
//           await MPN.create(mappedRow);
//           results.inserted++;
//         }
//       } catch (err) {
//         results.errors.push({ row, error: err.message });
//       }
//     }

//     return res.json({
//       success: true,
//       message: "MPN data import completed",
//       summary: results,
//     });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };


// export const importMpn = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ success: false, message: "No file uploaded" });
//     }

//     const workbook = XLSX.readFile(req.file.path);
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const rows = XLSX.utils.sheet_to_json(sheet);

//     let results = { inserted: 0, updated: 0, errors: [] };

//     for (const row of rows) {
//       try {
//         const mappedRow = mapRowToSchemaforMPN(row);
//         console.log('-------mappedRow', mappedRow)
//         if (!mappedRow.MPN) {
//           results.errors.push({ row, error: "Missing MPN" });
//           continue;
//         }

//         // ---- Convert names to IDs ----
//         if (mappedRow.UOM) {
//           const uomDoc = await UOM.findOne({
//             code: { $regex: new RegExp(`^${mappedRow.UOM}$`, "i") } // case-insensitive match
//           });
//           if (uomDoc) mappedRow.UOM = uomDoc._id;
//           else mappedRow.UOM = null;
//         }


//         if (mappedRow.Supplier) {
//           const supplierDoc = await Suppliers.findOne({ companyName: mappedRow.Supplier });
//           if (supplierDoc) mappedRow.Supplier = supplierDoc._id;
//           else mappedRow.Supplier = null;
//         }

//         if (mappedRow.Category) {
//           const categoryDoc = await Category.findOne({ name: mappedRow.Category });
//           if (categoryDoc) mappedRow.Category = categoryDoc._id;
//           else mappedRow.Category = null;
//         }


//         const existing = await MPN.findOne({ MPN: mappedRow.MPN });

//         if (existing) {
//           await MPN.updateOne(
//             { MPN: mappedRow.MPN },
//             { $set: mappedRow }
//           );
//           results.updated++;
//         } else {
//           await MPN.create(mappedRow);
//           results.inserted++;
//         }
//       } catch (err) {
//         results.errors.push({ row, error: err.message });
//       }
//     }

//     return res.json({
//       success: true,
//       message: "MPN data import completed",
//       summary: results,
//     });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// old code
// export const importMpn = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ success: false, message: "No file uploaded" });
//     }

//     const workbook = XLSX.readFile(req.file.path);
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const rows = XLSX.utils.sheet_to_json(sheet);

//     let results = { inserted: 0, updated: 0, errors: [] };

//     for (const row of rows) {
//       try {
//         const mappedRow = mapRowToSchemaforMPN(row);
//         console.log('-------mappedRow', mappedRow);

//         if (!mappedRow.MPN) {
//           results.errors.push({ row, error: "Missing MPN" });
//           continue;
//         }

//         // --- Convert names to IDs or set null ---
//         if (mappedRow.UOM) {
//           const uomDoc = await UOM.findOne({
//             code: { $regex: new RegExp(`^${mappedRow.UOM}$`, "i") },
//           });
//           mappedRow.UOM = uomDoc ? uomDoc._id : null;
//         } else {
//           mappedRow.UOM = null;
//         }

//         if (mappedRow.Supplier) {
//           const supplierDoc = await Suppliers.findOne({ companyName: mappedRow.Supplier });
//           mappedRow.Supplier = supplierDoc ? supplierDoc._id : null;
//         } else {
//           mappedRow.Supplier = null;
//         }

//         if (mappedRow.Category) {
//           const categoryDoc = await Category.findOne({ name: mappedRow.Category });
//           mappedRow.Category = categoryDoc ? categoryDoc._id : null;
//         } else {
//           mappedRow.Category = null;
//         }

//         // --- Insert or update ---
//         const existing = await MPN.findOne({ MPN: mappedRow.MPN });

//         if (existing) {
//           await MPN.updateOne({ MPN: mappedRow.MPN }, { $set: mappedRow });
//           results.updated++;
//         } else {
//           await MPN.create(mappedRow);
//           results.inserted++;
//         }
//       } catch (err) {
//         results.errors.push({ row, error: err.message });
//       }
//     }

//     return res.json({
//       success: true,
//       message: "MPN data import completed",
//       summary: results,
//     });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

export const importMpn = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    console.log('-----row', rows)
    let results = { inserted: 0, updated: 0, errors: [] };

    for (const [index, row] of rows.entries()) {
      try {
        const mappedRow = mapRowToSchemaforMPN(row);
        console.log('-------mappedRow', mappedRow);

        if (!mappedRow.MPN) {
          results.errors.push({ row: index + 2, error: "Missing MPN" }); // +2 for header row and 1-based index
          continue;
        }

        // --- Convert names to IDs or set null ---
        if (mappedRow.UOM) {
          const uomDoc = await UOM.findOne({
            code: { $regex: new RegExp(`^${mappedRow.UOM}$`, "i") },
          });
          mappedRow.UOM = uomDoc ? uomDoc._id : null;
        } else {
          mappedRow.UOM = null;
        }

        // Handle main Supplier
        if (mappedRow.Supplier) {
          const supplierDoc = await Suppliers.findOne({
            companyName: mappedRow.Supplier
          });
          mappedRow.Supplier = supplierDoc ? supplierDoc._id : null;
        } else {
          mappedRow.Supplier = null;
        }

        if (mappedRow.currency) {
          const currencyDoc = await Currency.findOne({
            $or: [
              { code: { $regex: new RegExp(`^${mappedRow.currency}$`, "i") } },
              { symbol: { $regex: new RegExp(`^${mappedRow.currency}$`, "i") } },
              { name: { $regex: new RegExp(`^${mappedRow.currency}$`, "i") } },
              { companyName: { $regex: new RegExp(`^${mappedRow.currency}$`, "i") } },
            ],
          });

          mappedRow.currency = currencyDoc ? currencyDoc._id : null;
        } else {
          mappedRow.currency = null;
        }

        if (mappedRow.Category) {
          const categoryDoc = await Category.findOne({ name: mappedRow.Category });
          mappedRow.Category = categoryDoc ? categoryDoc._id : null;
        } else {
          mappedRow.Category = null;
        }

        console.log('-------purchaseHistory-mappedRow', mappedRow.purchaseHistory);

        const purchaseHistory = [];

        for (let i = 0; i < (mappedRow.purchaseHistory?.length || 0); i++) {
          const poData = mappedRow.purchaseHistory[i];

          console.log('-----poData', poData);

          let supplierId = null;
          let currencyId = null;

          // 🔹 Supplier resolve
          if (poData.supplier) {
            const supplierDoc = await Suppliers.findOne({
              companyName: { $regex: new RegExp(`^${poData.supplier}$`, "i") },
            });
            supplierId = supplierDoc ? supplierDoc._id : null;
          }

          // 🔹 Currency resolve
          if (poData.currency) {
            const currencyDoc = await Currency.findOne({
              $or: [
                { code: { $regex: new RegExp(`^${poData.currency}$`, "i") } },
                { symbol: { $regex: new RegExp(`^${poData.currency}$`, "i") } },
                { name: { $regex: new RegExp(`^${poData.currency}$`, "i") } },
              ],
            });
            currencyId = currencyDoc ? currencyDoc._id : null;
          }

          purchaseHistory.push({
            purchasedPrice: poData.purchasedPrice ?? null,
            MOQ: poData.moq ?? null,
            purchasedDate: poData.purchasedDate ?? null,
            Supplier: supplierId,
            LeadTime_WK: poData.leadTimeWeeks ?? null,
            currency: currencyId,
            entryDate: new Date(),
          });
        }

        // ✅ override mappedRow.purchaseHistory with DB-ready data
        mappedRow.purchaseHistory = purchaseHistory;

        console.log('-------FINAL purchaseHistory', purchaseHistory);


        const existing = await MPN.findOne({ MPN: mappedRow.MPN });

        if (existing) {
          const updateData = { ...mappedRow };

          // ✅ merge purchase history safely
          if (mappedRow.purchaseHistory?.length) {
            updateData.purchaseHistory = [
              ...mappedRow.purchaseHistory,
              ...(existing.purchaseHistory || []),
            ].slice(0, 10);
          } else {
            updateData.purchaseHistory = existing.purchaseHistory || [];
          }

          await MPN.updateOne({ _id: existing._id }, { $set: updateData });
          results.updated++;
        } else {
          const createdMpn = await MPN.create(mappedRow);

          await Inventory.create({
            mpnId: createdMpn._id,
          });

          results.inserted++;
        }

      } catch (err) {
        results.errors.push({ row: index + 2, error: err.message });
      }
    }

    return res.json({
      success: true,
      message: "MPN data import completed",
      summary: results,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Export MPN data to Excel
 */
// export const exportMpn = async (req, res) => {
//   try {
//     const mpns = await MPN.find().lean();

//     const excelData = mpns.map(item => ({
//       MPN: item.MPN,
//       Manufacturer: item.Manufacturer,
//       Description: item.Description,
//       UOM: item.UOM,
//       StorageLocation: item.StorageLocation,
//       RFQUnitPrice: item.RFQUnitPrice,
//       MOQ: item.MOQ,
//       RFQDate: item.RFQDate ? item.RFQDate.toISOString().split("T")[0] : "",
//       Supplier: item.Supplier,
//       LeadTime_WK: item.LeadTime_WK,
//       Category: item.Category,
//       Status: item.Status,
//       Note: item.note
//     }));

//     const worksheet = XLSX.utils.json_to_sheet(excelData);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, "MPNs");

//     // Generate buffer
//     const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

//     // Set headers
//     res.setHeader("Content-Disposition", "attachment; filename=mpn_export.xlsx");
//     res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

//     return res.send(buffer);

//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// }



// export const exportMpn = async (req, res) => {
//   try {
//     const mpns = await MPN.find()
//       .populate("UOM", "code")
//       .populate("Supplier", "companyName")
//       .populate("Category", "name")
//       .lean();

//     // 1) Column schema: header order, keys, and base width hints
//     const COLUMNS = [
//       { header: "MPN", key: "MPN", min: 12 },
//       { header: "Manufacturer", key: "Manufacturer", min: 14 },
//       { header: "Description", key: "Description", min: 24, max: 60 },
//       { header: "UOM", key: "UOM", min: 6 },
//       { header: "Storage Location", key: "StorageLocation", min: 16 },
//       { header: "RFQ Unit Price", key: "RFQUnitPrice", min: 14 },
//       { header: "MOQ", key: "MOQ", min: 8 },
//       { header: "RFQ Date", key: "RFQDate", min: 12 },
//       { header: "Supplier", key: "Supplier", min: 16 },
//       { header: "Lead Time (wk)", key: "LeadTime_WK", min: 12 },
//       { header: "Category", key: "Category", min: 14 },
//       { header: "Status", key: "Status", min: 12 },
//       { header: "Note", key: "note", min: 24, max: 60 },
//     ];

//     // 2) Map DB docs -> rows with proper JS types
//     const rows = (mpns || []).map((item) => ({
//       MPN: item.MPN ?? "",
//       Manufacturer: item.Manufacturer ?? "",
//       Description: item.Description ?? "",
//       UOM: item.UOM?.code ?? item.UOM ?? "",
//       StorageLocation: item.StorageLocation ?? "",
//       RFQUnitPrice: item.RFQUnitPrice ?? "",
//       MOQ: item.MOQ ?? "",
//       RFQDate: item.RFQDate ? new Date(item.RFQDate) : "",
//       Supplier: item.Supplier?.companyName ?? item.Supplier ?? "",
//       LeadTime_WK: item.LeadTime_WK ?? "",
//       Category: item.Category?.name ?? item.Category ?? "",
//       Status: item.Status ?? "",
//       note: item.note ?? "",
//     }));


//     // 3) Build a dataset in the exact header order
//     const headers = COLUMNS.map((c) => c.header);
//     const keyByHeader = Object.fromEntries(COLUMNS.map((c) => [c.header, c.key]));

//     const ordered = rows.map((r) =>
//       headers.reduce((acc, h) => {
//         acc[h] = r[keyByHeader[h]];
//         return acc;
//       }, {})
//     );

//     // 4) Create worksheet: preserve dates & numbers
//     const ws = XLSX.utils.json_to_sheet(ordered, {
//       header: headers,
//       skipHeader: false,
//       cellDates: true,       // keep Date cells as dates
//     });

//     // 5) Apply a date number format to the RFQ Date column
//     // Find its 1-based column index
//     const rfqDateColIdx = headers.indexOf("RFQ Date") + 1; // 1..N
//     if (rfqDateColIdx > 0) {
//       const range = XLSX.utils.decode_range(ws["!ref"]);
//       for (let R = range.s.r + 1; R <= range.e.r; ++R) { // skip header (row 0)
//         const addr = XLSX.utils.encode_cell({ r: R, c: rfqDateColIdx - 1 });
//         const cell = ws[addr];
//         if (cell && cell.t === "d") {
//           // set display format to DD/MM/YYYY
//           cell.z = "dd/mm/yyyy";
//         }
//       }
//     }

//     // 6) Auto column widths (based on header + cell text length)
//     const autoCols = headers.map((h, cIdx) => {
//       const baseMin = COLUMNS[cIdx]?.min ?? 10;
//       const baseMax = COLUMNS[cIdx]?.max ?? 40;

//       const range = XLSX.utils.decode_range(ws["!ref"]);
//       let maxLen = String(h).length;

//       for (let R = range.s.r + 1; R <= range.e.r; ++R) {
//         const cellAddr = XLSX.utils.encode_cell({ r: R, c: cIdx });
//         const cell = ws[cellAddr];

//         let v = "";
//         if (cell) {
//           if (cell.t === "n") v = String(cell.v);
//           else if (cell.t === "d") v = XLSX.SSF.format(cell.z || "dd/mm/yyyy", cell.v);
//           else v = String(cell.v ?? "");
//         }
//         maxLen = Math.max(maxLen, v.length);
//       }

//       // padding + clamp
//       const wch = Math.min(Math.max(maxLen + 2, baseMin), baseMax);
//       return { wch };
//     });
//     ws["!cols"] = autoCols;

//     // 7) Freeze header row & enable AutoFilter
//     const totalCols = headers.length;
//     const lastColLetter = XLSX.utils.encode_col(totalCols - 1);
//     const lastRowNumber =
//       XLSX.utils.decode_range(ws["!ref"]).e.r + 1; // 1-based

//     ws["!autofilter"] = { ref: `A1:${lastColLetter}1` };
//     // Freeze top row (supported in modern SheetJS)
//     ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" };

//     // 8) Build workbook and return buffer
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "MPNs");

//     const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx", cellDates: true });
//     if (!buffer || buffer.length === 0) {
//       throw new Error("Generated Excel buffer is empty");
//     }

//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename=mpn_export_${new Date().toISOString().slice(0, 10)}.xlsx`
//     );
//     res.setHeader(
//       "Content-Type",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//     );
//     res.setHeader("Content-Length", buffer.length);

//     return res.send(buffer);
//   } catch (err) {
//     console.error("exportMpn error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// export const exportMpn = async (req, res) => {
//   try {
//     const mpns = await MPN.find()
//       .populate("UOM", "code")
//       .populate("Supplier", "companyName")
//       .populate("Category", "name")
//       .lean();

//     // Determine max purchase history count
//     let maxPurchaseHistoryCount = 0;
//     mpns.forEach(item => {
//       if (item.purchaseHistory && item.purchaseHistory.length > maxPurchaseHistoryCount) {
//         maxPurchaseHistoryCount = item.purchaseHistory.length;
//       }
//     });

//     // 1) Column schema: header order, keys, and base width hints
//     const COLUMNS = [
//       { header: "MPN", key: "MPN", min: 12 },
//       { header: "Manufacturer", key: "Manufacturer", min: 14 },
//       { header: "Description", key: "Description", min: 24, max: 60 },
//       { header: "UOM", key: "UOM", min: 6 },
//       { header: "Storage Location", key: "StorageLocation", min: 16 },
//       { header: "RFQ Unit Price", key: "RFQUnitPrice", min: 14 },
//       { header: "MOQ", key: "MOQ", min: 8 },
//       { header: "RFQ Date", key: "RFQDate", min: 12 },
//       { header: "Supplier", key: "Supplier", min: 16 },
//       { header: "Lead Time (wk)", key: "LeadTime_WK", min: 12 },
//       { header: "Category", key: "Category", min: 14 },
//       { header: "Status", key: "Status", min: 12 },
//       { header: "Note", key: "note", min: 24, max: 60 },
//     ];

//     // Add Purchase History columns
//     for (let i = 0; i < maxPurchaseHistoryCount; i++) {
//       const index = i + 1;
//       COLUMNS.push(
//         { header: `Purchased Price #${index}`, key: `purchaseHistory_${i}_price`, min: 16 },
//         { header: `Currency #${index}`, key: `purchaseHistory_${i}_currency`, min: 10 },
//         { header: `Purchased Date #${index}`, key: `purchaseHistory_${i}_date`, min: 14 },
//         { header: `MOQ #${index}`, key: `purchaseHistory_${i}_moq`, min: 10 },
//         { header: `Supplier #${index}`, key: `purchaseHistory_${i}_supplier`, min: 16 },
//         { header: `Lead Time #${index} (Wk)`, key: `purchaseHistory_${i}_leadTime`, min: 14 }
//       );
//     }

//     // 2) Map DB docs -> rows with proper JS types
//     const rows = (mpns || []).map((item) => {
//       const row = {
//         MPN: item.MPN ?? "",
//         Manufacturer: item.Manufacturer ?? "",
//         Description: item.Description ?? "",
//         UOM: item.UOM?.code ?? item.UOM ?? "",
//         StorageLocation: item.StorageLocation ?? "",
//         RFQUnitPrice: item.RFQUnitPrice ?? "",
//         MOQ: item.MOQ ?? "",
//         RFQDate: item.RFQDate ? new Date(item.RFQDate) : "",
//         Supplier: item.Supplier?.companyName ?? item.Supplier ?? "",
//         LeadTime_WK: item.LeadTime_WK ?? "",
//         Category: item.Category?.name ?? item.Category ?? "",
//         Status: item.Status ?? "",
//         note: item.note ?? "",
//       };

//       // Add purchase history data
//       if (item.purchaseHistory && Array.isArray(item.purchaseHistory)) {
//         item.purchaseHistory.forEach((purchase, index) => {
//           row[`Purchased Price#${index}`] = purchase.purchasedPrice ?? "";
//           // row[`Purchased Currency#${index}`] = purchase.currency ?? "USD";
//           row[`Purchased Date#${index}`] = purchase.entryDate ? new Date(purchase.entryDate) : "";
//           row[`MOQ#${index}`] = purchase.MOQ ?? "";
//           row[`Supplier#${index}`] = purchase.Supplier ?? "";
//           row[`Lead Time#${index}_WK`] = purchase.LeadTime_WK ?? "";
//         });
//       }

//       return row;
//     });

//     // 3) Build a dataset in the exact header order
//     const headers = COLUMNS.map((c) => c.header);
//     const keyByHeader = Object.fromEntries(COLUMNS.map((c) => [c.header, c.key]));

//     const ordered = rows.map((r) =>
//       headers.reduce((acc, h) => {
//         acc[h] = r[keyByHeader[h]];
//         return acc;
//       }, {})
//     );

//     // 4) Create worksheet: preserve dates & numbers
//     const ws = XLSX.utils.json_to_sheet(ordered, {
//       header: headers,
//       skipHeader: false,
//       cellDates: true,       // keep Date cells as dates
//     });

//     // 5) Apply date number format to RFQ Date and Purchase Date columns
//     const dateColumns = [];

//     // Find RFQ Date column
//     const rfqDateColIdx = headers.indexOf("RFQ Date") + 1;
//     if (rfqDateColIdx > 0) dateColumns.push(rfqDateColIdx - 1);

//     // Find Purchase Date columns
//     for (let i = 0; i < maxPurchaseHistoryCount; i++) {
//       const dateColIdx = headers.indexOf(`Purchased Date #${i + 1}`) + 1;
//       if (dateColIdx > 0) dateColumns.push(dateColIdx - 1);
//     }

//     if (dateColumns.length > 0) {
//       const range = XLSX.utils.decode_range(ws["!ref"]);
//       for (let R = range.s.r + 1; R <= range.e.r; ++R) { // skip header (row 0)
//         dateColumns.forEach(colIdx => {
//           const addr = XLSX.utils.encode_cell({ r: R, c: colIdx });
//           const cell = ws[addr];
//           if (cell && cell.t === "d") {
//             // set display format to DD/MM/YYYY
//             cell.z = "dd/mm/yyyy";
//           }
//         });
//       }
//     }

//     // 6) Auto column widths (based on header + cell text length)
//     const autoCols = headers.map((h, cIdx) => {
//       const baseMin = COLUMNS[cIdx]?.min ?? 10;
//       const baseMax = COLUMNS[cIdx]?.max ?? 40;

//       const range = XLSX.utils.decode_range(ws["!ref"]);
//       let maxLen = String(h).length;

//       for (let R = range.s.r + 1; R <= range.e.r; ++R) {
//         const cellAddr = XLSX.utils.encode_cell({ r: R, c: cIdx });
//         const cell = ws[cellAddr];

//         let v = "";
//         if (cell) {
//           if (cell.t === "n") v = String(cell.v);
//           else if (cell.t === "d") v = XLSX.SSF.format(cell.z || "dd/mm/yyyy", cell.v);
//           else v = String(cell.v ?? "");
//         }
//         maxLen = Math.max(maxLen, v.length);
//       }

//       // padding + clamp
//       const wch = Math.min(Math.max(maxLen + 2, baseMin), baseMax);
//       return { wch };
//     });
//     ws["!cols"] = autoCols;

//     // 7) Freeze header row & enable AutoFilter
//     const totalCols = headers.length;
//     const lastColLetter = XLSX.utils.encode_col(totalCols - 1);
//     const lastRowNumber =
//       XLSX.utils.decode_range(ws["!ref"]).e.r + 1; // 1-based

//     ws["!autofilter"] = { ref: `A1:${lastColLetter}1` };
//     // Freeze top row (supported in modern SheetJS)
//     ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" };

//     // 8) Apply styling for Purchase History section (optional)
//     // You can add background color to distinguish sections
//     const purchaseHistoryStartCol = headers.indexOf("Purchased Price #1") + 1;
//     if (purchaseHistoryStartCol > 0) {
//       const startLetter = XLSX.utils.encode_col(purchaseHistoryStartCol - 1);
//       const endLetter = XLSX.utils.encode_col(totalCols - 1);

//       // Add background to header
//       const headerAddr = XLSX.utils.encode_cell({ r: 0, c: purchaseHistoryStartCol - 1 });
//       if (!ws[headerAddr]) ws[headerAddr] = { v: headers[purchaseHistoryStartCol - 1] };
//       ws[headerAddr].s = {
//         fill: {
//           fgColor: { rgb: "FFE6F3FF" } // Light blue background
//         },
//         font: {
//           bold: true,
//           color: { rgb: "FF0066CC" } // Dark blue text
//         }
//       };
//     }

//     // 9) Build workbook and return buffer
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "MPNs");

//     const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx", cellDates: true });
//     if (!buffer || buffer.length === 0) {
//       throw new Error("Generated Excel buffer is empty");
//     }

//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename=mpn_export_${new Date().toISOString().slice(0, 10)}.xlsx`
//     );
//     res.setHeader(
//       "Content-Type",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//     );
//     res.setHeader("Content-Length", buffer.length);

//     return res.send(buffer);
//   } catch (err) {
//     console.error("exportMpn error:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };


export const exportMpn = async (req, res) => {
  try {
    // ✅ fetch + populate
    const mpns = await MPN.find()
      .populate("UOM", "code")
      .populate("Supplier", "companyName")
      .populate("Category", "name")
      .populate("purchaseHistory.Supplier", "companyName") // ✅ IMPORTANT for history supplier name
      .lean();

    // ✅ max purchase history
    let maxPurchaseHistoryCount = 0;
    (mpns || []).forEach((item) => {
      const len = Array.isArray(item.purchaseHistory) ? item.purchaseHistory.length : 0;
      if (len > maxPurchaseHistoryCount) maxPurchaseHistoryCount = len;
    });

    // ✅ base columns
    const COLUMNS = [
      { header: "MPN", key: "MPN", min: 12 },
      { header: "Manufacturer", key: "Manufacturer", min: 14 },
      { header: "Description", key: "Description", min: 24, max: 60 },
      { header: "UOM", key: "UOM", min: 8 },
      { header: "Storage Location", key: "StorageLocation", min: 16 },
      { header: "RFQ Unit Price", key: "RFQUnitPrice", min: 14 },
      { header: "MOQ", key: "MOQ", min: 8 },
      { header: "RFQ Date", key: "RFQDate", min: 12 },
      { header: "Supplier", key: "Supplier", min: 18 },
      { header: "Lead Time (wk)", key: "LeadTime_WK", min: 12 },
      { header: "Category", key: "Category", min: 14 },
      { header: "Status", key: "Status", min: 12 },
      { header: "Note", key: "note", min: 24, max: 60 },
    ];

    // ✅ purchase history columns (keys must match row keys)
    for (let i = 0; i < maxPurchaseHistoryCount; i++) {
      const index = i + 1;
      COLUMNS.push(
        { header: `Purchased Price #${index}`, key: `purchaseHistory_${i}_price`, min: 16 },
        { header: `Currency #${index}`, key: `purchaseHistory_${i}_currency`, min: 10 },
        { header: `Purchased Date #${index}`, key: `purchaseHistory_${i}_date`, min: 14 },
        { header: `MOQ #${index}`, key: `purchaseHistory_${i}_moq`, min: 10 },
        { header: `Supplier #${index}`, key: `purchaseHistory_${i}_supplier`, min: 18 },
        { header: `Lead Time #${index} (Wk)`, key: `purchaseHistory_${i}_leadTime`, min: 14 }
      );
    }

    // ✅ map docs -> rows (KEYS must match COLUMNS keys)
    const rows = (mpns || []).map((item) => {
      const row = {
        MPN: item.MPN ?? "",
        Manufacturer: item.Manufacturer ?? "",
        Description: item.Description ?? "",
        UOM: item.UOM?.code ?? (typeof item.UOM === "string" ? item.UOM : ""),
        StorageLocation: item.StorageLocation ?? "",
        RFQUnitPrice: item.RFQUnitPrice ?? "",
        MOQ: item.MOQ ?? "",
        RFQDate: item.RFQDate ? new Date(item.RFQDate) : "",
        Supplier: item.Supplier?.companyName ?? (typeof item.Supplier === "string" ? item.Supplier : ""),
        LeadTime_WK: item.LeadTime_WK ?? item.leadTime_Wk ?? "",
        Category: item.Category?.name ?? (typeof item.Category === "string" ? item.Category : ""),
        Status: item.Status ?? "",
        note: item.note ?? "",
      };

      // ✅ purchaseHistory data
      if (Array.isArray(item.purchaseHistory)) {
        item.purchaseHistory.forEach((purchase, i) => {
          row[`purchaseHistory_${i}_price`] = purchase?.purchasedPrice ?? "";

          // currency field name handle
          row[`purchaseHistory_${i}_currency`] =
            purchase?.currency ?? purchase?.Currency ?? "";

          // date field name handle (prefer purchasedDate, fallback entryDate)
          row[`purchaseHistory_${i}_date`] =
            purchase?.purchasedDate
              ? new Date(purchase.purchasedDate)
              : purchase?.entryDate
                ? new Date(purchase.entryDate)
                : "";

          row[`purchaseHistory_${i}_moq`] = purchase?.MOQ ?? purchase?.moq ?? "";

          // supplier: populated companyName or raw
          row[`purchaseHistory_${i}_supplier`] =
            purchase?.Supplier?.companyName ??
            (typeof purchase?.Supplier === "string" ? purchase.Supplier : "") ??
            "";

          // lead time field handle
          row[`purchaseHistory_${i}_leadTime`] =
            purchase?.leadTime_Wk ??
            purchase?.LeadTime_WK ??
            purchase?.LeadTime_Wk ??
            "";
        });
      }

      return row;
    });

    // ✅ ordered output by headers
    const headers = COLUMNS.map((c) => c.header);
    const keyByHeader = Object.fromEntries(COLUMNS.map((c) => [c.header, c.key]));

    const ordered = rows.map((r) =>
      headers.reduce((acc, h) => {
        acc[h] = r[keyByHeader[h]];
        return acc;
      }, {})
    );

    // ✅ worksheet
    const ws = XLSX.utils.json_to_sheet(ordered, {
      header: headers,
      skipHeader: false,
      cellDates: true,
    });

    // ✅ date columns formatting: RFQ Date + Purchased Date #x
    const dateColIndexes = [];

    const rfqIdx = headers.indexOf("RFQ Date");
    if (rfqIdx >= 0) dateColIndexes.push(rfqIdx);

    for (let i = 0; i < maxPurchaseHistoryCount; i++) {
      const colIdx = headers.indexOf(`Purchased Date #${i + 1}`);
      if (colIdx >= 0) dateColIndexes.push(colIdx);
    }

    if (dateColIndexes.length > 0 && ws["!ref"]) {
      const range = XLSX.utils.decode_range(ws["!ref"]);
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        dateColIndexes.forEach((cIdx) => {
          const addr = XLSX.utils.encode_cell({ r: R, c: cIdx });
          const cell = ws[addr];
          if (cell && cell.t === "d") {
            cell.z = "dd/mm/yyyy";
          }
        });
      }
    }

    // ✅ auto column widths
    const autoCols = headers.map((h, cIdx) => {
      const baseMin = COLUMNS[cIdx]?.min ?? 10;
      const baseMax = COLUMNS[cIdx]?.max ?? 40;

      let maxLen = String(h).length;
      if (ws["!ref"]) {
        const range = XLSX.utils.decode_range(ws["!ref"]);
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
          const cellAddr = XLSX.utils.encode_cell({ r: R, c: cIdx });
          const cell = ws[cellAddr];
          let v = "";
          if (cell) {
            if (cell.t === "n") v = String(cell.v);
            else if (cell.t === "d") v = XLSX.SSF.format(cell.z || "dd/mm/yyyy", cell.v);
            else v = String(cell.v ?? "");
          }
          maxLen = Math.max(maxLen, v.length);
        }
      }

      const wch = Math.min(Math.max(maxLen + 2, baseMin), baseMax);
      return { wch };
    });
    ws["!cols"] = autoCols;

    // ✅ autofilter + freeze header row
    const totalCols = headers.length;
    const lastColLetter = XLSX.utils.encode_col(totalCols - 1);
    ws["!autofilter"] = { ref: `A1:${lastColLetter}1` };
    ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" };

    // ✅ workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MPNs");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx", cellDates: true });
    if (!buffer || buffer.length === 0) throw new Error("Generated Excel buffer is empty");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=mpn_export_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Length", buffer.length);

    return res.send(buffer);
  } catch (err) {
    console.error("exportMpn error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

import mongoose from "mongoose";
import XLSX from "xlsx";
import Drawing from "../models/Drwaing.js";
import Project from "../models/Project.js";
import CostingItems from "../models/CostingItem.js";
import { toDateOrNull, toNum, toStr } from "../utils/helpers.js";
import Customer from "../models/Customer.js";
import Currency from "../models/Currency.js";
import Suppliers from "../models/Suppliers.js";
import UOM from "../models/UOM.js";
import Child from "../models/library/Child.js";
import MPN from "../models/library/MPN.js";
import SkillLevelCosting from "../models/SkillLevelCosting.js";
import MarkupParameter from "../models/MarkupParameters.js";
import SystemSettings from "../models/SystemSettings.js";
import { convertCurrency } from "../utils/currency.js";
import { convertLengthUnitPrice, convertToInventoryUom } from "../utils/uomController.js";

// 🟢 GET ALL DRAWINGS (with pagination, filters, sorting)
// export const getAllDrawings = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 10,
//       search = "",
//       sortBy = "createdAt",
//       sortOrder = "desc",
//       quoteStatus,
//       quoteType,
//       projectId,
//       customerId,
//     } = req.query;

//     const query = {};

//     // 🔍 Search filter
//     if (search) {
//       query.$or = [
//         { drawingNo: { $regex: search, $options: "i" } },
//         { description: { $regex: search, $options: "i" } },
//       ];
//     }

//     // 🎯 Conditional filters
//     if (quoteStatus) query.quoteStatus = quoteStatus;
//     if (quoteType) query.quoteType = quoteType;
//     if (projectId && mongoose.Types.ObjectId.isValid(projectId)) query.projectId = projectId;
//     if (customerId && mongoose.Types.ObjectId.isValid(customerId)) query.customerId = customerId;

//     const sortOptions = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

//     // ⚙️ Fetch data with pagination
//     const drawings = await Drawing.find(query)
//       .populate("projectId", "projectName code")
//       .populate("customerId", "name contactPerson")
//       .populate("lastEditedBy", "name")
//       .sort(sortOptions)
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit))
//       .lean()
//     const total = await Drawing.countDocuments(query);

//     res.status(200).json({
//       success: true,
//       data: drawings,
//       pagination: {
//         currentPage: parseInt(page),
//         totalPages: Math.ceil(total / limit),
//         totalItems: total,
//         itemsPerPage: parseInt(limit),
//       },
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Error fetching drawings",
//       error: error.message,
//     });
//   }
// };

// export const getAllDrawings = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 10,
//       search = "",
//       sortBy = "createdAt",
//       sortOrder = "desc",
//       quoteStatus,
//       quoteType,
//       projectId,
//       customerId,
//       drawingDate,
//       drawingRange, // optional e.g. 0–50, 51–100 etc.
//     } = req.query;

//     const query = {};

//     // 🔍 Text Search
//     if (search?.trim()) {
//       query.$or = [
//         { drawingNo: { $regex: search, $options: "i" } },
//         { description: { $regex: search, $options: "i" } },
//         { "projectId.projectName": { $regex: search, $options: "i" } },
//         { "customerId.name": { $regex: search, $options: "i" } },
//       ];
//     }

//     // 🎯 Conditional Filters
//     if (quoteStatus) query.quoteStatus = quoteStatus;
//     if (quoteType) query.quoteType = quoteType;

//     if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
//       query.projectId = projectId;
//     }

//     if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
//       query.customerId = customerId;
//     }

//     // 📅 Date Range Filter
//     // 📅 Date Filter (apply to createdAt, not drawingDate)
//     if (req.query.drawingDate) {
//       const raw = req.query.drawingDate;
//       let start = null;
//       let end = null;

//       // Try to parse JSON object or array if stringified
//       if (typeof raw === "string") {
//         try {
//           const parsed = JSON.parse(raw);
//           if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
//             // Shape: { $gte: "...", $lte: "..." }
//             if (parsed.$gte) start = new Date(parsed.$gte);
//             if (parsed.$lte) end = new Date(parsed.$lte);
//           } else if (Array.isArray(parsed)) {
//             // Shape: ["start","end"]
//             if (parsed[0]) start = new Date(parsed[0]);
//             if (parsed[1]) end = new Date(parsed[1]);
//           } else if (raw.includes(",")) {
//             // Shape: "start,end"
//             const [s, e] = raw.split(",").map(s => s.trim());
//             if (s) start = new Date(s);
//             if (e) end = new Date(e);
//           } else {
//             // Single date string -> same-day range
//             const d = new Date(raw);
//             if (!isNaN(d)) {
//               start = new Date(d); start.setHours(0, 0, 0, 0);
//               end = new Date(d); end.setHours(23, 59, 59, 999);
//             }
//           }
//         } catch {
//           // Not JSON, maybe single date string or "start,end"
//           if (raw.includes(",")) {
//             const [s, e] = raw.split(",").map(s => s.trim());
//             if (s) start = new Date(s);
//             if (e) end = new Date(e);
//           } else {
//             const d = new Date(raw);
//             if (!isNaN(d)) {
//               start = new Date(d); start.setHours(0, 0, 0, 0);
//               end = new Date(d); end.setHours(23, 59, 59, 999);
//             }
//           }
//         }
//       } else if (Array.isArray(raw)) {
//         // If Express parsed an array already
//         if (raw[0]) start = new Date(raw[0]);
//         if (raw[1]) end = new Date(raw[1]);
//       } else if (typeof raw === "object" && raw !== null) {
//         // If Express parsed an object already
//         if (raw.$gte) start = new Date(raw.$gte);
//         if (raw.$lte) end = new Date(raw.$lte);
//       }

//       // Normalize times for inclusive day bounds
//       if (start && !isNaN(start)) start.setHours(0, 0, 0, 0);
//       if (end && !isNaN(end)) end.setHours(23, 59, 59, 999);

//       // Apply to createdAt
//       if (start && end) query.createdAt = { $gte: start, $lte: end };
//       else if (start) query.createdAt = { $gte: start };
//       else if (end) query.createdAt = { $lte: end };
//     }


//     // 📏 Drawing Range Filter (e.g. 0–50)
//     if (drawingRange) {
//       const [min, max] = drawingRange.split("-").map(Number);
//       if (!isNaN(min) && !isNaN(max)) {
//         query.drawingNo = { $gte: min, $lte: max };
//       }
//     }

//     // ⚙️ Sorting
//     const sortOptions = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

//     // 🚀 Fetch Data with Population + Pagination
//     const drawings = await Drawing.find(query)
//       .populate("projectId", "projectName code")
//       .populate("customerId", "name contactPerson companyName")
//       .populate("lastEditedBy", "name email")
//       .populate("currency", "code symbol")
//       .sort(sortOptions)
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit))
//       .lean();

//     const total = await Drawing.countDocuments(query);

//     // 📦 Response
//     res.status(200).json({
//       success: true,
//       data: drawings,
//       pagination: {
//         currentPage: parseInt(page),
//         totalPages: Math.ceil(total / limit),
//         totalItems: total,
//         itemsPerPage: parseInt(limit),
//       },
//       filtersUsed: query,
//     });
//   } catch (error) {
//     console.error("❌ Error fetching drawings:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error fetching drawings",
//       error: error.message,
//     });
//   }
// };

const S = (v) => (v == null ? "" : String(v));

// function round2(n) { return Math.round(Number(n || 0) * 100) / 100; }
function round2(n) {
  return Number((Number(n || 0)).toFixed(2));
}

export const getAllDrawings = async (req, res) => {
  try {
    let {
      page = 1, limit = 10, search = "", sortBy = "createdAt", sortOrder = "desc",
      quoteStatus, quoteType, projectId, customerId, drawingDate, drawingRange, showOnlyQuoted
    } = req.query;

    // console.log('-------drawingDate', drawingDate)

    page = parseInt(page, 10);
    limit = parseInt(limit, 10);

    // ---- base filters (NO numeric range here) ----
    const matchStage = {};

    if (req.query.ids) {
  const ids = req.query.ids.split(",");

  matchStage._id = {
    $in: ids.map(id => new mongoose.Types.ObjectId(id))
  };
}

    // if (search?.trim()) {
    //   matchStage.$or = [
    //     { drawingNo: { $regex: search, $options: "i" } },
    //     { description: { $regex: search, $options: "i" } },
    //   ];
    // }
    if (showOnlyQuoted) {
      matchStage.quotedDate = { $ne: null };
    }
    if (quoteStatus) matchStage.quoteStatus = quoteStatus;
    if (quoteType) matchStage.quoteType = quoteType;

    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      matchStage.projectId = new mongoose.Types.ObjectId(projectId);
    }
    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      matchStage.customerId = new mongoose.Types.ObjectId(customerId);
    }

    const rawDrawingDate = req.query.drawingDate;

    const parseMaybeJSON = (v) => {
      if (typeof v === "string" && (v.trim().startsWith("{") || v.trim().startsWith("["))) {
        try { return JSON.parse(v); } catch { /* ignore */ }
      }
      return v;
    };

    const toValidDate = (v) => {
      const d = v ? new Date(v) : null;
      return d && !isNaN(d.getTime()) ? d : null;
    };

    if (rawDrawingDate != null) {
      const dd = parseMaybeJSON(rawDrawingDate);
      let start = null, end = null;

      if (Array.isArray(dd)) {
        // ["2025-11-06T...", "2025-11-07T..."]
        start = toValidDate(dd[0]);
        end = toValidDate(dd[1]);
      } else if (dd && typeof dd === "object" && (dd.$gte || dd.$lte)) {
        // { $gte: "...", $lte: "..." }
        start = toValidDate(dd.$gte);
        end = toValidDate(dd.$lte);
      } else if (typeof dd === "string") {
        // "2025-11-06T..."
        const d = toValidDate(dd);
        if (d) {
          const s = new Date(d); s.setHours(0, 0, 0, 0);
          const e = new Date(d); e.setHours(23, 59, 59, 999);
          start = s;
          end = e;
        }
      }

      const dateFilter = {};
      if (start) dateFilter.$gte = start;
      if (end) dateFilter.$lte = end;

      if (Object.keys(dateFilter).length > 0) {
        // IMPORTANT: apply to matchStage, not "query"
        matchStage.createdAt = dateFilter;
      }
    }



    // ---- parse "00004-00037" into numbers ----
    let minRange = null, maxRange = null;
    if (typeof drawingRange === "string" && drawingRange.includes("-")) {
      const [minS, maxS] = drawingRange.split("-").map(s => s.trim());
      const minN = Number(minS);
      const maxN = Number(maxS);
      if (Number.isFinite(minN)) minRange = minN;
      if (Number.isFinite(maxN)) maxRange = maxN;
    }

    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // ---------- MAIN PAGE via aggregation ----------
    // We extract the last numeric block from drawingNo (e.g., "D-0001" -> 1, "005-0418-00004-A" -> 4)
    const baseStages = [
      { $match: matchStage },
      {
        $addFields: {
          __numSuffix: {
            $let: {
              vars: {
                m: { $regexFind: { input: "$drawingNo", regex: /(\d+)(?=[^\d]*$)/ } },
              },
              in: {
                $cond: [
                  { $ne: ["$$m", null] },
                  { $toInt: { $arrayElemAt: ["$$m.captures", 0] } },
                  null,
                ],
              },
            },
          },
        },
      },
    ];

    const rangeStage = [];
    if (minRange !== null || maxRange !== null) {
      const r = {};
      if (minRange !== null) r.$gte = minRange;
      if (maxRange !== null) r.$lte = maxRange;
      rangeStage.push({ $match: { __numSuffix: r } });
    }

    const searchStage = [];

if (search?.trim()) {
  searchStage.push({
    $match: {
      $or: [
        {
          drawingNo: {
            $regex: search,
            $options: "i",
          },
        },
        {
          description: {
            $regex: search,
            $options: "i",
          },
        },
        {
          "projectId.projectName": {
            $regex: search,
            $options: "i",
          },
        },
        {
          "projectId.code": {
            $regex: search,
            $options: "i",
          },
        },
        {
          "customerId.companyName": {
            $regex: search,
            $options: "i",
          },
        },
        {
          "customerId.contactPerson": {
            $regex: search,
            $options: "i",
          },
        },
        {
          "customerId.name": {
            $regex: search,
            $options: "i",
          },
        },
      ],
    },
  });
}

    const pipeline = [
  ...baseStages,
  ...rangeStage,

  // lookups first
  {
    $lookup: {
      from: "projects",
      localField: "projectId",
      foreignField: "_id",
      as: "projectId",
      pipeline: [{ $project: { projectName: 1, code: 1 } }],
    },
  },
  { $unwind: { path: "$projectId", preserveNullAndEmptyArrays: true } },

  {
    $lookup: {
      from: "customers",
      localField: "customerId",
      foreignField: "_id",
      as: "customerId",
      pipeline: [{ $project: { name: 1, contactPerson: 1, companyName: 1 } }],
    },
  },
  { $unwind: { path: "$customerId", preserveNullAndEmptyArrays: true } },

  {
    $lookup: {
      from: "users",
      localField: "lastEditedBy",
      foreignField: "_id",
      as: "lastEditedBy",
      pipeline: [{ $project: { name: 1, email: 1 } }],
    },
  },
  { $unwind: { path: "$lastEditedBy", preserveNullAndEmptyArrays: true } },

  {
    $lookup: {
      from: "currencies",
      localField: "currency",
      foreignField: "_id",
      as: "currency",
      pipeline: [{ $project: { code: 1, symbol: 1 } }],
    },
  },
  { $unwind: { path: "$currency", preserveNullAndEmptyArrays: true } },

  // search BEFORE pagination
  ...searchStage,

  { $sort: sortOptions },
  { $skip: (page - 1) * limit },
  { $limit: limit },

  { $project: { __numSuffix: 0 } },
];

    const drawings = await Drawing.aggregate(pipeline);

    // ---------- TOTAL COUNT (same filters, no sort/skip/limit) ----------
const countPipeline = [
  ...baseStages,
  ...rangeStage,

  // lookups required because search is on project/customer fields
  {
    $lookup: {
      from: "projects",
      localField: "projectId",
      foreignField: "_id",
      as: "projectId",
      pipeline: [{ $project: { projectName: 1, code: 1 } }],
    },
  },
  { $unwind: { path: "$projectId", preserveNullAndEmptyArrays: true } },

  {
    $lookup: {
      from: "customers",
      localField: "customerId",
      foreignField: "_id",
      as: "customerId",
      pipeline: [{ $project: { name: 1, contactPerson: 1, companyName: 1 } }],
    },
  },
  { $unwind: { path: "$customerId", preserveNullAndEmptyArrays: true } },

  ...searchStage,

  { $count: "total" },
];
    const totalArr = await Drawing.aggregate(countPipeline);
    const total = totalArr?.[0]?.total || 0;

    // ---------- COSTING SUMMARY (unchanged) ----------
    const ids = drawings.map(d => d._id);
    let agg = [];
    if (ids.length) {
      agg = await CostingItems.aggregate([
        { $match: { drawingId: { $in: ids } } },
        {
          $group: {
            _id: '$drawingId',
            materialSum: {
              $sum: { $cond: [{ $eq: [{ $toLower: '$quoteType' }, 'material'] }, '$salesPrice', 0] }
            },
            manhourSum: {
              $sum: { $cond: [{ $eq: [{ $toLower: '$quoteType' }, 'manhour'] }, '$salesPrice', 0] }
            },
            packingSum: {
              $sum: { $cond: [{ $eq: [{ $toLower: '$quoteType' }, 'packing'] }, '$salesPrice', 0] }
            },
            maxLeadTime: { $max: { $ifNull: ['$leadTime', 0] } }
          }
        }
      ]);
    }

    const round2 = (v) => Number((Number(v || 0)).toFixed(2));

    const costMap = {};
    for (const row of agg) {
      const dId = String(row._id);
      costMap[dId] = {
        material: Number(row.materialSum || 0),
        manhour: Number(row.manhourSum || 0),
        packing: Number(row.packingSum || 0),
        maxLeadTime: Number(row.maxLeadTime || 0),
      };
    }

    const enriched = drawings.map(d => {
      const sums = costMap[String(d._id)] || { material: 0, manhour: 0, packing: 0, maxLeadTime: 0 };

      const materialMarkup = Number(d.materialMarkup || 0);
      const manhourMarkup = Number(d.manhourMarkup || 0);
      const packingMarkup = Number(d.packingMarkup || 0);

      const materialWith = sums.material * (1 + materialMarkup / 100);
      const manhourWith = sums.manhour * (1 + manhourMarkup / 100);
      const packingWith = sums.packing * (1 + packingMarkup / 100);

      const markupPrice = materialWith + manhourWith + packingWith;
      // console.log('-----markupPrice', markupPrice)
      return {
        ...d,
        costingSummary: {
          byQuoteType: {
            material: { extTotal: round2(sums.material), markupPercent: materialMarkup, totalWithMarkup: round2(materialWith) },
            manhour: { extTotal: round2(sums.manhour), markupPercent: manhourMarkup, totalWithMarkup: round2(manhourWith) },
            packing: { extTotal: round2(sums.packing), markupPercent: packingMarkup, totalWithMarkup: round2(packingWith) },
          },
          extGrandTotal: round2(sums.material + sums.manhour + sums.packing),
          grandTotalWithMarkup: round2(markupPrice),
          maxLeadTimeFromItems: sums.maxLeadTime,
        },
        markupPrice: round2(markupPrice),
      };
    });

    return res.status(200).json({
      success: true,
      data: enriched,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
      filtersUsed: { ...matchStage, drawingRange },
    });
  } catch (error) {
    console.error('❌ Error fetching drawings:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching drawings',
      error: error.message,
    });
  }
};




// 🟢 GET SINGLE DRAWING
export const getDrawingById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid drawing ID" });

    const drawing = await Drawing.findById(id)
      .populate("projectId")
      .populate("customerId")
      .populate("lastEditedBy", "name")
      .populate("currency", "code symbol name")


    if (!drawing)
      return res.status(404).json({ success: false, message: "Drawing not found" });

    const costingAgg = await CostingItems.aggregate([
      {
        $match: {
          drawingId: new mongoose.Types.ObjectId(id)
        }
      },
      {
        $group: {
          _id: "$drawingId",
          materialSum: {
            $sum: {
              $cond: [
                { $eq: [{ $toLower: "$quoteType" }, "material"] },
                "$salesPrice",
                0
              ]
            }
          },
          manhourSum: {
            $sum: {
              $cond: [
                { $eq: [{ $toLower: "$quoteType" }, "manhour"] },
                "$salesPrice",
                0
              ]
            }
          },
          packingSum: {
            $sum: {
              $cond: [
                { $eq: [{ $toLower: "$quoteType" }, "packing"] },
                "$salesPrice",
                0
              ]
            }
          },
          maxLeadTime: {
            $max: { $ifNull: ["$leadTime", 0] }
          }
        }
      }
    ]);


    const summary = costingAgg.length
      ? {
        material: Number(costingAgg[0].materialSum || 0),
        manhour: Number(costingAgg[0].manhourSum || 0),
        packing: Number(costingAgg[0].packingSum || 0),
        maxLeadTime: Number(costingAgg[0].maxLeadTime || 0)
      }
      : {
        material: 0,
        manhour: 0,
        packing: 0,
        maxLeadTime: 0
      };


    res.status(200).json({
      success: true, data: {
        ...drawing.toObject(),
        costingSummary: summary
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching drawing",
      error: error.message,
    });
  }
};

// 🟢 CREATE DRAWING
// export const createDrawing = async (req, res) => {
//   try {
//     const data = req.body;
//     const { drawingNo, qty = 1, unitPrice = 0 } = data;

//     // Prevent duplicates
//     const exists = await Drawing.findOne({ drawingNo });
//     if (exists)
//       return res.status(400).json({ success: false, message: "Drawing number already exists" });


//     if (data.projectId) {
//       const project = await Project.findById(data.projectId).select("customerId");
//       if (!project) {
//         return res.status(400).json({ success: false, message: "Invalid projectId" });
//       }
//       data.customerId = project.customerId;
//     }

//     const totalPrice = qty * unitPrice;
//     const newDrawing = await Drawing.create({ ...data, totalPrice });

//     await newDrawing.populate("projectId", "name code");
//     await newDrawing.populate("customerId", "name contactPerson");

//     res.status(201).json({
//       success: true,
//       message: "Drawing created successfully",
//       data: newDrawing,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Error creating drawing",
//       error: error.message,
//     });
//   }
// };

// helper to coerce + clamp (0..100)
const clampPct = (v) => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  if (Number.isNaN(n)) return undefined;
  return Math.max(0, Math.min(100, n));
};

export const createDrawing = async (req, res) => {
  try {
    const data = { ...req.body };
    const { drawingNo, qty = 1, unitPrice = 0 } = data;

    // 1) Prevent duplicates
    const exists = await Drawing.findOne({
      drawingNo: { $regex: new RegExp(`^${drawingNo}$`, "i") },
    }).lean();

    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: 'Drawing number already exists' });
    }

    // 2) If projectId given → derive customerId
    if (data.projectId) {
      const project = await Project.findById(data.projectId).select('customerId').lean();
      if (!project) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid projectId' });
      }
      data.customerId = project.customerId;
    }

    // 3) Pull master markups (latest/active)
    //    adjust the query if you maintain "isActive" or similar flag
    const master = await MarkupParameter
      .findOne({ /* isActive: true */ })
      .sort({ updatedAt: -1 })
      .select('materialsMarkup manhourMarkup packingMarkup')
      .lean();



    // 4) Decide per-drawing markups:
    //    - If client sent it, use client (after clamp)
    //    - Else use master value (if exists)
    const materialMarkup =
      clampPct(data.materialMarkup) ??
      clampPct(master?.materialsMarkup) ??
      0;

    const manhourMarkup =
      clampPct(data.manhourMarkup) ??
      clampPct(master?.manhourMarkup) ??
      0;

    const packingMarkup =
      clampPct(data.packingMarkup) ??
      clampPct(master?.packingMarkup) ??
      0;

    // Assign to payload (overriding null defaults on schema)
    data.materialMarkup = materialMarkup;
    data.manhourMarkup = manhourMarkup;
    data.packingMarkup = packingMarkup;
    // data.quotedDate = new Date()
    // 5) Compute initial total (basic)
    const totalPrice = Number(qty) * Number(unitPrice);

    // 6) Create
    const newDrawing = await Drawing.create({ ...data, totalPrice });

    // 7) Populate for response (adjust fields to your schema)
    await newDrawing.populate('projectId', 'name code projectName');
    await newDrawing.populate('customerId', 'name contactPerson companyName');

    return res.status(201).json({
      success: true,
      message: 'Drawing created successfully',
      data: newDrawing,
    });
  } catch (error) {
    console.error('createDrawing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating drawing',
      error: error.message,
    });
  }
};

// 🟢 UPDATE DRAWING
export const updateDrawing = async (req, res) => {
  try {
    console.log('--------',req.body)
    const { id } = req.params;
    const userId = req.user.id;
    const data = req.body;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid drawing ID" });

    const existing = await Drawing.findById(id);
    if (!existing)
      return res.status(404).json({ success: false, message: "Drawing not found" });

    if (data.drawingNo) {
      const duplicate = await Drawing.findOne({
        drawingNo: data.drawingNo,
        _id: { $ne: id },
      });
      if (duplicate)
        return res.status(400).json({ success: false, message: "Drawing number already exists" });
    }


    if (data.projectId) {
      const project = await Project.findById(data.projectId).select("customerId");
      if (!project) {
        return res.status(400).json({ success: false, message: "Invalid projectId" });
      }
      data.customerId = project.customerId;
    }


    // Update total price if qty or unitPrice changes
    // const qty = data.qty ?? existing.qty;
    // const unitPrice = data.unitPrice ?? existing.unitPrice;
    // data.totalPrice = qty * unitPrice;

    
    const materialTotal = data.materialTotal ?? existing.materialTotal ?? 0;
const manhourTotal = data.manhourTotal ?? existing.manhourTotal ?? 0;
const packingTotal = data.packingTotal ?? existing.packingTotal ?? 0;

const materialMarkup = data.materialMarkup ?? existing.materialMarkup ?? 0;
const manhourMarkup = data.manhourMarkup ?? existing.manhourMarkup ?? 0;
const packingMarkup = data.packingMarkup ?? existing.packingMarkup ?? 0;

// base price (without markup)
data.totalPrice = materialTotal + manhourTotal + packingTotal;

// with markup
const materialFinal = materialTotal * (1 + materialMarkup / 100);
const manhourFinal = manhourTotal * (1 + manhourMarkup / 100);
const packingFinal = packingTotal * (1 + packingMarkup / 100);

data.totalPriceWithMarkup =
  materialFinal + manhourFinal + packingFinal;


    data.lastEditedBy = userId;
    const updated = await Drawing.findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .populate("projectId", "name code")
      .populate("customerId", "name contactPerson");

    res.status(200).json({
      success: true,
      message: "Drawing updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating drawing",
      error: error.message,
    });
  }
};

// 🟢 DELETE DRAWING
export const deleteDrawing = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid drawing ID" });
    }

    await session.withTransaction(async () => {
      // 1) Check drawing
      const drawing = await Drawing.findById(id).session(session);
      if (!drawing) {
        throw new Error("NOT_FOUND");
      }

      // 2) Delete all costing items for this drawing
      const { deletedCount: itemsDeleted } = await CostingItems
        .deleteMany({ drawingId: drawing._id })
        .session(session);

      // 3) Delete the drawing
      await Drawing.deleteOne({ _id: drawing._id }).session(session);

      // 4) Response (inside transaction is fine; but capture and send after)
      res.locals.cascadeInfo = { itemsDeleted };
    });

    const { itemsDeleted = 0 } = res.locals.cascadeInfo || {};
    return res.status(200).json({
      success: true,
      message: "Drawing deleted successfully (with costing items)",
      deletedCostingItems: itemsDeleted,
    });
  } catch (error) {
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Drawing not found" });
    }
    return res.status(500).json({
      success: false,
      message: "Error deleting drawing",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// 🟢 IMPORT DRAWINGS (from Excel or JSON)
// export const importDrawings = async (req, res) => {
//   try {
//     const { drawingsData } = req.body;
//     if (!Array.isArray(drawingsData))
//       return res.status(400).json({ success: false, message: "Invalid data format" });

//     const results = { success: [], errors: [] };

//     for (const d of drawingsData) {
//       try {
//         const exists = await Drawing.findOne({ drawingNo: d.drawingNo });
//         if (exists) {
//           results.errors.push({ drawingNo: d.drawingNo, error: "Duplicate drawing number" });
//           continue;
//         }

//         const totalPrice = (d.qty || 1) * (d.unitPrice || 0);
//         const drawing = await Drawing.create({ ...d, totalPrice });
//         results.success.push(drawing);
//       } catch (err) {
//         results.errors.push({ drawingNo: d.drawingNo, error: err.message });
//       }
//     }

//     res.status(200).json({
//       success: true,
//       message: `Import complete — ${results.success.length} added, ${results.errors.length} failed.`,
//       data: results,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Error importing drawings",
//       error: error.message,
//     });
//   }
// };

// export const importDrawings = async (req, res) => {
//   try {
//     if (!req.file?.path) {
//       return res.status(400).json({ success: false, message: "No file uploaded" });
//     }

//     const name = (req.file.originalname || "").toLowerCase();
//     if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
//       return res.status(400).json({ success: false, message: "Only .xlsx / .xls files are supported" });
//     }

//     let workbook;
//     try {
//       workbook = XLSX.readFile(req.file.path);
//     } catch (e) {
//       return res.status(400).json({ success: false, message: "Invalid Excel file", error: e.message });
//     }

//     if (!workbook.SheetNames?.length) {
//       return res.status(400).json({ success: false, message: "Excel has no sheets" });
//     }

//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     if (!sheet) {
//       return res.status(400).json({ success: false, message: "First sheet is missing" });
//     }

//     const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
//     if (!Array.isArray(rows) || rows.length === 0) {
//       return res.status(400).json({ success: false, message: "Sheet is empty" });
//     }

//     // Expected headers (case-insensitive): 
//     // drawingNo, description, projectName, customerName, qty, unitPrice, freightPercent, leadTimeWeeks, quotedDate, currencyCode, quoteStatus, quoteType
//     const results = { success: [], errors: [] };

//     for (let idx = 0; idx < rows.length; idx++) {
//       const r = rows[idx];

//       const drawingNo = toStr(r.drawingNo || r.DrawingNo);
//       const description = toStr(r.description || r.Description);
//       const projectName = toStr(r.projectName || r.ProjectName);
//       const customerName = toStr(r.customerName || r.CustomerName);
//       const currencyCode = toStr(r.currencyCode || r.CurrencyCode || r.currency || r.Currency);
//       const qty = toNum(r.qty ?? r.Qty, 1);
//       const unitPrice = toNum(r.unitPrice ?? r.UnitPrice, 0);
//       const freightPercent = toNum(r.freightPercent ?? r.FreightPercent, 0);
//       const leadTimeWeeks = toNum(r.leadTimeWeeks ?? r.LeadTimeWeeks, 0);
//       const quotedDate = toDateOrNull(r.quotedDate ?? r.QuotedDate);
//       const quoteStatus = toStr(r.quoteStatus || r.QuoteStatus || "active");
//       const quoteType = toStr(r.quoteType || r.QuoteType || "cable_harness");

//       // validations
//       if (!drawingNo) {
//         results.errors.push({ row: idx + 2, drawingNo: "-", error: "drawingNo is required" });
//         continue;
//       }
//       // duplicate drawingNo
//       const exists = await Drawing.findOne({ drawingNo });
//       if (exists) {
//         results.errors.push({ row: idx + 2, drawingNo, error: "Duplicate drawing number" });
//         continue;
//       }
//       if (!projectName) {
//         results.errors.push({ row: idx + 2, drawingNo, error: "projectName is required" });
//         continue;
//       }
//       if (!customerName) {
//         results.errors.push({ row: idx + 2, drawingNo, error: "customerName is required" });
//         continue;
//       }
//       if (!currencyCode) {
//         results.errors.push({ row: idx + 2, drawingNo, error: "currencyCode is required" });
//         continue;
//       }

//       // lookups
//       const [project, customer, currency] = await Promise.all([
//         Project.findOne({ projectName: projectName }),
//         Customer.findOne({ companyName: customerName }),
//         Currency.findOne({ code: currencyCode.toUpperCase() }),
//       ]);

//       if (!project) {
//         results.errors.push({ row: idx + 2, drawingNo, error: `Project not found: ${projectName}` });
//         continue;
//       }
//       if (!customer) {
//         results.errors.push({ row: idx + 2, drawingNo, error: `Customer not found: ${customerName}` });
//         continue;
//       }
//       if (!currency) {
//         results.errors.push({ row: idx + 2, drawingNo, error: `Currency not found: ${currencyCode}` });
//         continue;
//       }

//       // pricing math
//       const materialSubtotal = qty * unitPrice;                         // e.g. 3 * 10 = 30
//       const salePrice = materialSubtotal * (1 + freightPercent / 100);  // includes freight uplift
//       const totalPrice = Number(salePrice.toFixed(2));

//       try {
//         const doc = await Drawing.create({
//           drawingNo,
//           description,
//           projectId: project._id,
//           customerId: customer._id,
//           qty,
//           unitPrice,
//           totalPrice,          // store the freight-adjusted total here
//           freightPercent,
//           leadTimeWeeks,
//           quotedDate,
//           currency: currency._id,
//           quoteStatus,
//           quoteType,
//         });

//         results.success.push({
//           id: doc._id,
//           drawingNo: doc.drawingNo,
//           totalPrice: doc.totalPrice,
//         });
//       } catch (e) {
//         results.errors.push({ row: idx + 2, drawingNo, error: e.message });
//       }
//     }

//     return res.status(200).json({
//       success: true,
//       message: `Import complete — ${results.success.length} added, ${results.errors.length} failed.`,
//       data: results,
//     });
//   } catch (error) {
//     return res.status(500).json({ success: false, message: "Error importing drawings", error: error.message });
//   } finally {
//     // clean up temp upload if present
//     try { if (req.file?.path) fs.unlinkSync(req.file.path); } catch { }
//   }
// };

// export const importDrawings = async (req, res) => {
//   try {
//     if (!req.file?.path) {
//       return res.status(400).json({ success: false, message: "No file uploaded" });
//     }

//     const name = (req.file.originalname || "").toLowerCase();
//     if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
//       return res.status(400).json({ success: false, message: "Only .xlsx / .xls files are supported" });
//     }

//     let workbook;
//     try {
//       workbook = XLSX.readFile(req.file.path);
//     } catch (e) {
//       return res.status(400).json({ success: false, message: "Invalid Excel file", error: e.message });
//     }

//     if (!workbook.SheetNames?.length) {
//       return res.status(400).json({ success: false, message: "Excel has no sheets" });
//     }

//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     if (!sheet) {
//       return res.status(400).json({ success: false, message: "First sheet is missing" });
//     }

//     const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
//     if (!Array.isArray(rows) || rows.length === 0) {
//       return res.status(400).json({ success: false, message: "Sheet is empty" });
//     }

//     const results = { success: [], errors: [] };

//     // 🔹 Load latest/active master markups ONCE
//     const master = await MarkupParameter
//       .findOne({ /* isActive: true */ })
//       .sort({ updatedAt: -1 })
//       .select('materialsMarkup manhourMarkup packingMarkup')
//       .lean();

//     const masterMaterial = clampPct(master?.materialsMarkup, 0);
//     const masterManhour = clampPct(master?.manhourMarkup, 0);
//     const masterPacking = clampPct(master?.packingMarkup, 0);

//     // 🔹 Preload unique projects to reduce DB roundtrips
//     const uniqueProjectNames = [
//       ...new Set(rows.map(r => toStr(r.projectName || r.ProjectName)).filter(Boolean))
//     ];
//     const projects = await Project.find({ projectName: { $in: uniqueProjectNames } })
//       .select('projectName customerId currency currencyId')
//       .lean();
//     const projectByName = new Map(projects.map(p => [p.projectName, p]));

//     for (let idx = 0; idx < rows.length; idx++) {
//       const r = rows[idx];

//       const drawingNo = toStr(r.drawingNo || r.DrawingNo);
//       const description = toStr(r.description || r.Description);
//       const projectName = toStr(r.projectName || r.ProjectName);
//       const qty = toNum(r.qty ?? r.Qty, 1);
//       const quoteType = toStr(r.quoteType || r.QuoteType || 'material');

//       if (!drawingNo) {
//         results.errors.push({ row: idx + 2, drawingNo: '-', error: 'drawingNo is required' });
//         continue;
//       }

//       const exists = await Drawing.findOne({ drawingNo }).lean();
//       if (exists) {
//         results.errors.push({ row: idx + 2, drawingNo, error: 'Duplicate drawing number' });
//         continue;
//       }

//       if (!projectName) {
//         results.errors.push({ row: idx + 2, drawingNo, error: 'projectName is required' });
//         continue;
//       }

//       const project = projectByName.get(projectName);
//       if (!project) {
//         results.errors.push({ row: idx + 2, drawingNo, error: `Project not found: ${projectName}` });
//         continue;
//       }

//       const projectId = project._id;
//       const customerId = project.customerId || null;
//       const currency = project.currency || project.currencyId || null;

//       // Optional numeric fields (initially zero; costing items will drive totals)
//       const unitPrice = 0;
//       const totalPrice = 0;

//       // ✅ Apply master markups to per-drawing override fields
//       const materialMarkup = masterMaterial;
//       const manhourMarkup = masterManhour;
//       const packingMarkup = masterPacking;

//       try {
//         const doc = await Drawing.create({
//           drawingNo,
//           description,
//           projectId,
//           customerId,
//           currency,
//           qty,
//           unitPrice,
//           totalPrice,
//           quoteType,
//           quoteStatus: 'active',
//           materialMarkup,
//           manhourMarkup,
//           packingMarkup,
//         });

//         results.success.push({
//           id: doc._id,
//           drawingNo: doc.drawingNo,
//           projectName,
//           materialMarkup: doc.materialMarkup,
//           manhourMarkup: doc.manhourMarkup,
//           packingMarkup: doc.packingMarkup,
//         });
//       } catch (e) {
//         results.errors.push({ row: idx + 2, drawingNo, error: e.message });
//       }
//     }

//     return res.status(200).json({
//       success: true,
//       message: `Import complete — ${results.success.length} added, ${results.errors.length} failed.`,
//       data: results,
//     });
//   } catch (error) {
//     return res.status(500).json({ success: false, message: "Error importing drawings", error: error.message });
//   } finally {
//     try { if (req.file?.path) fs.unlinkSync(req.file.path); } catch { }
//   }
// };

// GET /drawings/template  -> download an Excel template
export const downloadDrawingsTemplate = (_req, res) => {
  // Header row with example values in row 2
  const rows = [
    [
      "drawingNo",
      "description",
      "projectName",
      "customerName",
      "qty",
      "unitPrice",
      "freightPercent",
      "leadTimeWeeks",
      "quotedDate",
      "currencyCode",
      "quoteStatus",
      "quoteType",
    ],
    [
      "Nav-123",
      "Test harness",
      "My Project A",
      "Acme Corp",
      3,
      10,
      10,
      8,
      "2025-10-20",
      "USD",
      "active",
      "cable_harness",
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="drawings_import_template.xlsx"`);
  return res.status(200).send(buf);
};



// 🟢 EXPORT DRAWINGS
export const exportDrawings = async (req, res) => {
  try {
    const { format = "json", quoteStatus, quoteType } = req.query;
    const query = {};
    if (quoteStatus) query.quoteStatus = quoteStatus;
    if (quoteType) query.quoteType = quoteType;

    const drawings = await Drawing.find(query)
      .populate("projectId", "name code")
      .populate("customerId", "name");

    if (format === "csv") {
      const csvData = [
        [
          "Drawing No",
          "Description",
          "Project",
          "Customer",
          "Quantity",
          "Unit Price",
          "Total Price",
          "Lead Time (Weeks)",
          "Quoted Date",
          "Quote Status",
          "Quote Type",
          "Last Edited By",
        ],
        ...drawings.map((d) => [
          d.drawingNo,
          d.description,
          d.projectId?.name || "",
          d.customerId?.name || "",
          d.qty,
          d.unitPrice,
          d.totalPrice,
          d.leadTimeWeeks,
          d.quotedDate ? new Date(d.quotedDate).toISOString().split("T")[0] : "",
          d.quoteStatus,
          d.quoteType || "",
          d.lastEditedBy || "",
        ]),
      ];
      const csvContent = csvData.map((r) => r.join(",")).join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=drawings_export.csv");
      return res.send(csvContent);
    }

    res.json(drawings);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error exporting drawings",
      error: error.message,
    });
  }
};

export const duplicateDrawing = async (req, res) => {
  try {
    const { id } = req.params; // Original drawing ID
    let { newDrawingNumber } = req.body; // New drawing number from frontend

    // 0️⃣ Basic validations
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid drawing id",
      });
    }

    newDrawingNumber = (newDrawingNumber || "").trim();

    if (!newDrawingNumber) {
      return res.status(400).json({
        success: false,
        message: "New drawing number is required",
      });
    }

    // console.log("Duplicating drawing:", id, "with new number:", newDrawingNumber);

    // 1️⃣ Find original drawing
    const originalDrawing = await Drawing.findById(id);

    if (!originalDrawing) {
      return res.status(404).json({
        success: false,
        message: "Original drawing not found",
      });
    }

    // 2️⃣ New number should not be same as original
    if (
      originalDrawing.drawingNo &&
      originalDrawing.drawingNo.toString().trim().toLowerCase() ===
      newDrawingNumber.toLowerCase()
    ) {
      return res.status(400).json({
        success: false,
        message: "New drawing number cannot be same as original drawing number",
      });
    }

    // 3️⃣ Check if newDrawingNumber already exists in DB (case-insensitive)
    const exists = await Drawing.findOne({
      drawingNo: { $regex: new RegExp(`^${newDrawingNumber}$`, "i") },
    }).lean();

    if (exists) {
      return res.status(400).json({
        success: false,
        message: `Drawing number already exists: ${newDrawingNumber}`,
      });
    }

    // 4️⃣ Create duplicate drawing object (clean copy)
    const {
      _id,
      __v,
      createdAt,
      updatedAt,
      originalDrawingId,
      isDuplicate,
      ...plain
    } = originalDrawing.toObject();

    const duplicateData = {
      ...plain,
      drawingNo: newDrawingNumber, // ✅ new drawing number
      drawingName: originalDrawing.drawingName
        ? `${originalDrawing.drawingName} - Copy`
        : undefined,
      isDuplicate: true,
      originalDrawingId: originalDrawing._id, // reference to original
      quoteStatus: "active",
      lastEditedBy: req.user?._id || originalDrawing.lastEditedBy || null,
      // timestamps will be set by Mongoose
    };

    const duplicatedDrawing = new Drawing(duplicateData);
    await duplicatedDrawing.save();

    // 5️⃣ Find all costing items of original drawing
    const originalCostingItems = await CostingItems.find({ drawingId: id });

    // console.log(`Found ${originalCostingItems.length} costing items to duplicate`);

    // 6️⃣ Duplicate all costing items with new drawing ID
    if (originalCostingItems.length > 0) {
      const duplicateCostingItems = originalCostingItems.map((item) => {
        const { _id, __v, createdAt, updatedAt, ...rest } = item.toObject();
        return {
          ...rest,
          drawingId: duplicatedDrawing._id, // ✅ Set new drawing ID
          // itemNumber yahi ka yahi copy ho raha hai
          // agar re-sequence chahiye to yahan logic change kar sakte ho
        };
      });

      await CostingItems.insertMany(duplicateCostingItems);
      // console.log(`Duplicated ${duplicateCostingItems.length} costing items`);
    }

    // 7️⃣ Send response
    res.status(201).json({
      success: true,
      message: `Drawing duplicated successfully with new number ${newDrawingNumber}`,
      data: {
        drawing: duplicatedDrawing,
        costingItemsCount: originalCostingItems.length,
      },
    });
  } catch (error) {
    console.error("Error duplicating drawing:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


// export const duplicateDrawing = async (req, res) => {
//   try {
//     const { id } = req.params; // Original drawing ID
//     const { newDrawingNumber } = req.body; // New drawing number from frontend

//     console.log('Duplicating drawing:', id, 'with new number:', newDrawingNumber);

//     // 1. Find original drawing
//     const originalDrawing = await Drawing.findById(id);

//     if (!originalDrawing) {
//       return res.status(404).json({
//         success: false,
//         message: 'Original drawing not found'
//       });
//     }

//     // 2. Create duplicate drawing object
//     const duplicateData = {
//       ...originalDrawing.toObject(), // Copy all fields
//       _id: undefined, // Remove original ID
//       drawingNo: newDrawingNumber, // New drawing number
//       drawingName: `${originalDrawing.drawingName} - Copy`, // New name
//       isDuplicate: true,
//       originalDrawingId: id, // Reference to original
//       createdAt: new Date(),
//       updatedAt: new Date(),
//       // Reset some fields if needed
//       quoteStatus: 'active',
//       lastEditedBy: req.user?._id, // If you have user auth
//     };

//     // 3. Remove unwanted fields
//     delete duplicateData.createdAt;
//     delete duplicateData.updatedAt;
//     delete duplicateData.__v;

//     // 4. Create new drawing
//     const duplicatedDrawing = new Drawing(duplicateData);
//     await duplicatedDrawing.save();

//     // 5. Find all costing items of original drawing
//     const originalCostingItems = await CostingItems.find({ drawingId: id });

//     console.log(`Found ${originalCostingItems.length} costing items to duplicate`);

//     // 6. Duplicate all costing items with new drawing ID
//     if (originalCostingItems.length > 0) {
//       const duplicateCostingItems = originalCostingItems.map(item => ({
//         ...item.toObject(),
//         _id: undefined, // Remove original ID
//         drawingId: duplicatedDrawing._id, // Set new drawing ID
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       }));

//       // 7. Insert all duplicated costing items
//       await CostingItems.insertMany(duplicateCostingItems);
//       console.log(`Duplicated ${duplicateCostingItems.length} costing items`);
//     }

//     // 8. Send response
//     res.status(201).json({
//       success: true,
//       message: 'Drawing duplicated successfully with all costing items',
//       data: {
//         drawing: duplicatedDrawing,
//         costingItemsCount: originalCostingItems.length
//       }
//     });

//   } catch (error) {
//     console.error('Error duplicating drawing:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error',
//       error: error.message
//     });
//   }
// };

// 🟢 STATS
export const getDrawingStats = async (req, res) => {
  try {
    const total = await Drawing.countDocuments();
    const byStatus = {
      active: await Drawing.countDocuments({ quoteStatus: "active" }),
      completed: await Drawing.countDocuments({ quoteStatus: "completed" }),
      inactive: await Drawing.countDocuments({ quoteStatus: "inactive" }),
    };

    const byType = await Drawing.aggregate([
      { $group: { _id: "$quoteType", count: { $sum: 1 } } },
    ]);

    const totalValue = await Drawing.aggregate([
      { $group: { _id: null, totalValue: { $sum: "$totalPrice" } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        byStatus,
        byType,
        totalValue: totalValue[0]?.totalValue || 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message,
    });
  }
};

export const addCostingItem = async (req, res) => {
  try {
    const { drawingId } = req.params;

    const drawing = await Drawing.findById(drawingId).populate("currency", "code symbol")
    if (!drawing) {
      return res.status(404).json({ success: false, error: "Drawing not found" });
    }

    const settings = await SystemSettings.findOne({}).lean();
    if (!settings?.currencySettings) {
      return res.status(500).json({ success: false, error: "Currency settings missing" });
    }

    const drawingCurrency = (drawing.currency?.code || "SGD").toUpperCase();
    // ✅ Incoming MPN price currency (default USD)

    // ✅ Price fields (adjust according to your schema)
    // Example: req.body.salesPrice is coming from UI in USD
    const salesPrice = toNum(req.body.salesPrice);
    const unitPrice = toNum(req.body.unitPrice);
    const extPrice = toNum(req.body.extPrice);

    const mpnCurrency = await MPN.findById(req.body.mpn).populate("currency", "code")
    const sourceCurrency = (mpnCurrency?.currency?.code || "USD").toUpperCase();

    console.log('-----drawingCurrency-----sourceCurrency',drawingCurrency,sourceCurrency)
    // ✅ Convert only when needed
    const salesPriceInDrawingCurrency =
      sourceCurrency === drawingCurrency
        ? round2(salesPrice)
        : convertCurrency(salesPrice, sourceCurrency, drawingCurrency, settings, { decimals: 2 });

    const unitPriceInDrawingCurrency =
      sourceCurrency === drawingCurrency
        ? round2(unitPrice)
        : convertCurrency(unitPrice, sourceCurrency, drawingCurrency, settings, { decimals: 2 });

    const extInDrawingCurrency =
      sourceCurrency === drawingCurrency
        ? round2(extPrice)
        : convertCurrency(extPrice, sourceCurrency, drawingCurrency, settings, { decimals: 2 });

    // console.log('-----salesPriceInDrawingCurrency',salesPriceInDrawingCurrency)
    // 2) Create item (attach drawingId + converted price)
    const costingData = {
      ...req.body,
      drawingId,
      currency: drawingCurrency,            // store final currency
      sourceCurrency,                       // store original
      sourcePrice: round2(unitPrice),   // original amount
      salesPrice: salesPriceInDrawingCurrency, // ✅ converted
      unitPrice: unitPriceInDrawingCurrency,
      extPrice: extInDrawingCurrency
    };

    const newItem = await CostingItems.create(costingData);

    // 3) Recompute totals using salesPrice (already in drawingCurrency)
    const oid = new mongoose.Types.ObjectId(drawingId);
    const grouped = await CostingItems.aggregate([
      { $match: { drawingId: oid } },
      {
        $group: {
          _id: "$quoteType",
          bucketTotal: { $sum: { $toDouble: "$salesPrice" } },
        },
      },
    ]);

    let materialTotal = 0;
    let manhourTotal = 0;
    let packingTotal = 0;

    for (const g of grouped) {
      const t = toNum(g.bucketTotal);
      switch ((g._id || "").toLowerCase()) {
        case "material":
          materialTotal = t;
          break;
        case "manhour":
          manhourTotal = t;
          break;
        case "packing":
          packingTotal = t;
          break;
        default:
          break;
      }
    }

    // 5) Apply markups
    const materialMarkup = toNum(drawing.materialMarkup);
    const manhourMarkup = toNum(drawing.manhourMarkup);
    const packingMarkup = toNum(drawing.packingMarkup);

    const materialWithMarkup = round2(materialTotal + (materialTotal * materialMarkup) / 100);
    const manhourWithMarkup = round2(manhourTotal + (manhourTotal * manhourMarkup) / 100);
    const packingWithMarkup = round2(packingTotal + (packingTotal * packingMarkup) / 100);

    const totalPriceRaw = toNum(materialTotal + manhourTotal + packingTotal);
    const totalPriceWithMarkup = round2(materialWithMarkup + manhourWithMarkup + packingWithMarkup);

    // 6) Lead time
    const existingLTW = toNum(drawing.leadTimeWeeks);
    const newLTW = toNum(costingData.leadTime);
    const finalLTW = Math.max(existingLTW, newLTW);

    // 7) Save drawing
    drawing.materialTotal = round2(materialTotal);
    drawing.manhourTotal = round2(manhourTotal);
    drawing.packingTotal = round2(packingTotal);
    drawing.totalPrice = round2(totalPriceRaw);
    drawing.totalPriceWithMarkup = totalPriceWithMarkup;
    drawing.leadTimeWeeks = finalLTW;
    drawing.lastEditedBy = req?.user?._id || drawing.lastEditedBy;

    await drawing.save();

    return res.status(201).json({
      success: true,
      message: "Costing item added",
      data: newItem,
      totals: {
        currency: drawingCurrency,
        materialTotal: round2(materialTotal),
        manhourTotal: round2(manhourTotal),
        packingTotal: round2(packingTotal),
        materialWithMarkup,
        manhourWithMarkup,
        packingWithMarkup,
        totalPrice: drawing.totalPrice,
        totalPriceWithMarkup,
        leadTimeWeeks: drawing.leadTimeWeeks,
      },
    });
  } catch (err) {
    console.error("addCostingItem Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const updateCostingItem = async (req, res) => {
  try {
    const { drawingId, itemId } = req.params;

    // -----------------------------
    // Helpers
    // -----------------------------
    const round2 = (n) =>
      Math.round((Number(n) + Number.EPSILON) * 100) / 100;

    const toNum = (v, d = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };

    // -----------------------------
    // 1️⃣ Load Drawing
    // -----------------------------
    const drawing = await Drawing.findById(drawingId).populate("currency", "code symbol");

    if (!drawing) {
      return res.status(404).json({ success: false, error: "Drawing not found" });
    }

    const settings = await SystemSettings.findOne({}).lean();
    if (!settings?.currencySettings) {
      return res.status(500).json({ success: false, error: "Currency settings missing" });
    }

    const drawingCurrency = (drawing?.currency?.code || "SGD").toUpperCase();

    // -----------------------------
    // 2️⃣ Load Existing Item
    // -----------------------------
    const existingItem = await CostingItems.findById(itemId);
    console.log('-----existingItem-',existingItem)

    if (!existingItem) {
      return res.status(404).json({ success: false, error: "Costing item not found" });
    }

    // -----------------------------
    // 3️⃣ Incoming values
    // -----------------------------
    const salesPrice = toNum(req.body.salesPrice);
    const unitPrice = toNum(req.body.unitPrice);
    const extPrice = toNum(req.body.extPrice);

    // -----------------------------
    // 4️⃣ Source Currency (MPN)
    // -----------------------------
    let sourceCurrency = existingItem.sourceCurrency || "USD";

    if (req.body.mpn) {
      const mpnData = await MPN.findById(req.body.mpn).populate("currency", "code");
      sourceCurrency = (mpnData?.currency?.code || "USD").toUpperCase();
    }

    // -----------------------------
    // 5️⃣ Detect Changes
    // -----------------------------
    const isMpnChanged = req.body.mpn && String(existingItem.mpn) !== String(req.body.mpn);
    const isCurrencyChanged = existingItem.sourceCurrency !== sourceCurrency;
    const isUOMChanged = req.body.uom && String(existingItem.uom) !== String(req.body.uom);

    // -----------------------------
    // 6️⃣ FINAL VALUES (DEFAULT = SAME)
    // -----------------------------
    let finalSalesPrice = salesPrice;
    let finalUnitPrice = unitPrice;
    let finalExtPrice = extPrice;

    // -----------------------------
    // 7️⃣ ONLY RECALCULATE WHEN NEEDED
    // -----------------------------
    const isSystemChange = isMpnChanged || isCurrencyChanged || isUOMChanged;

// 👉 detect manual edit
const isPriceChanged =
  salesPrice !== toNum(existingItem.salesPrice) ||
  unitPrice !== toNum(existingItem.unitPrice) ||
  extPrice !== toNum(existingItem.extPrice);

if (isSystemChange) {
  // ✅ SYSTEM RECALCULATION
  let incomingUnitPrice = unitPrice;

  if (isMpnChanged) {
    const mpnData = await MPN.findById(req.body.mpn).populate("currency", "code");
    incomingUnitPrice = toNum(mpnData?.RFQUnitPrice);
  }

  finalUnitPrice =
    sourceCurrency === drawingCurrency
      ? round2(incomingUnitPrice)
      : convertCurrency(
          incomingUnitPrice,
          sourceCurrency,
          drawingCurrency,
          settings,
          { decimals: 2 }
        );

  const quantity = toNum(req.body.quantity || existingItem.quantity);
  finalExtPrice = round2(quantity * finalUnitPrice);

  finalSalesPrice = finalExtPrice;
}
else if (isPriceChanged) {
  // ✅ USER EDIT → ACCEPT AS IS (NO CONVERSION)
  finalUnitPrice = unitPrice;
  finalExtPrice = extPrice;
  finalSalesPrice = salesPrice;
}
else {
  // ✅ NO CHANGE → KEEP OLD
  finalUnitPrice = existingItem.unitPrice;
  finalExtPrice = existingItem.extPrice;
  finalSalesPrice = existingItem.salesPrice;
}

    // -----------------------------
    // 8️⃣ Safe Update डॉक्यूमेंट
    // -----------------------------
    const updateDoc = {
  quantity: req.body.quantity ?? existingItem.quantity,
  tolerance: req.body.tolerance ?? existingItem.tolerance,
  uom: req.body.uom ?? existingItem.uom,
  mpn: req.body.mpn ?? existingItem.mpn,

  sgaPercent: req.body.sgaPercent ?? existingItem.sgaPercent,
  matBurden: req.body.matBurden ?? existingItem.matBurden,
  freightPercent: req.body.freightPercent ?? existingItem.freightPercent,
  freightCost: req.body.freightCost ?? existingItem.freightCost,

  currency: drawingCurrency,
  sourceCurrency,

  unitPrice: finalUnitPrice,
  extPrice: finalExtPrice,       // ✅ FIX
  salesPrice: finalSalesPrice,   // ✅ FIX

  lastEditedBy: req.user?._id,
  updatedAt: new Date(),
};

    const item = await CostingItems.findOneAndUpdate(
      { _id: itemId, drawingId },
      updateDoc,
      { new: true }
    );

    // -----------------------------
    // 9️⃣ Recalculate Totals
    // -----------------------------
    const oid = new mongoose.Types.ObjectId(drawingId);

    const grouped = await CostingItems.aggregate([
      { $match: { drawingId: oid } },
      {
        $group: {
          _id: "$quoteType",
          bucketTotal: { $sum: { $toDouble: "$salesPrice" } },
        },
      },
    ]);

    let materialTotal = 0;
    let manhourTotal = 0;
    let packingTotal = 0;

    for (const g of grouped) {
      const t = toNum(g.bucketTotal);
      switch ((g._id || "").toLowerCase()) {
        case "material":
          materialTotal = t;
          break;
        case "manhour":
          manhourTotal = t;
          break;
        case "packing":
          packingTotal = t;
          break;
      }
    }

    // -----------------------------
    // 🔟 Apply Markups
    // -----------------------------
    const materialMarkup = toNum(drawing.materialMarkup);
    const manhourMarkup = toNum(drawing.manhourMarkup);
    const packingMarkup = toNum(drawing.packingMarkup);

    const materialWithMarkup = round2(materialTotal + (materialTotal * materialMarkup) / 100);
    const manhourWithMarkup = round2(manhourTotal + (manhourTotal * manhourMarkup) / 100);
    const packingWithMarkup = round2(packingTotal + (packingTotal * packingMarkup) / 100);

    const totalPriceRaw = round2(materialTotal + manhourTotal + packingTotal);
    const totalPriceWithMarkup = round2(
      materialWithMarkup + manhourWithMarkup + packingWithMarkup
    );

    // -----------------------------
    // 1️⃣1️⃣ Lead Time
    // -----------------------------
    const leadAgg = await CostingItems.aggregate([
      { $match: { drawingId: oid } },
      {
        $group: {
          _id: null,
          maxLead: { $max: { $toDouble: "$leadTime" } },
        },
      },
    ]);

    const finalLTW = Math.max(
      toNum(drawing.leadTimeWeeks),
      toNum(leadAgg?.[0]?.maxLead)
    );

    // -----------------------------
    // 1️⃣2️⃣ Save Drawing
    // -----------------------------
    drawing.materialTotal = round2(materialTotal);
    drawing.manhourTotal = round2(manhourTotal);
    drawing.packingTotal = round2(packingTotal);
    drawing.totalPrice = totalPriceRaw;
    drawing.totalPriceWithMarkup = totalPriceWithMarkup;
    drawing.leadTimeWeeks = finalLTW;
    drawing.lastEditedBy = req?.user?._id || drawing.lastEditedBy;

    await drawing.save();

    // -----------------------------
    // ✅ RESPONSE
    // -----------------------------
    return res.json({
      success: true,
      message: "Costing item updated",
      data: item,
      totals: {
        currency: drawingCurrency,
        materialTotal,
        manhourTotal,
        packingTotal,
        totalPrice: totalPriceRaw,
        totalPriceWithMarkup,
        leadTimeWeeks: finalLTW,
      },
    });
  } catch (err) {
    console.error("updateCostingItem Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};


// export const updateCostingItem = async (req, res) => {
//   try {
//     const { drawingId, itemId } = req.params;

//     // 1) Load drawing FIRST (needed for currency conversion)
//     const drawing = await Drawing.findById(drawingId).populate("currency", "code symbol")
//     if (!drawing) {
//       return res.status(404).json({ success: false, error: "Drawing not found" });
//     }

//     const settings = await SystemSettings.findOne({}).lean();
//     if (!settings?.currencySettings) {
//       return res.status(500).json({ success: false, error: "Currency settings missing" });
//     }

//     const drawingCurrency = (drawing?.currency?.code || "SGD").toUpperCase();

//     // ✅ Incoming currency (default USD)
//     const mpnCurrency = await MPN.findById(req.body.mpn).populate("currency", "code")
//     const sourceCurrency = (mpnCurrency?.currency?.code || "USD").toUpperCase();
//     // const sourceCurrency = (req.body.sourceCurrency || req.body.currency || "USD").toUpperCase();

//     // ✅ Incoming price field (adjust if your API uses unitPrice/extPrice)
//     const incomingPrice = toNum(req.body.salesPrice);

//     // ✅ Convert to drawing currency
//     const salesPriceInDrawingCurrency =
//       sourceCurrency === drawingCurrency
//         ? round2(incomingPrice)
//         : convertCurrency(incomingPrice, sourceCurrency, drawingCurrency, settings, { decimals: 2 });

//     // 2) Update costing item with converted value
//     const updateDoc = {
//       ...req.body,
//       currency: drawingCurrency,                  // store final currency
//       sourceCurrency,                             // original currency
//       sourcePrice: round2(incomingPrice),         // original amount
//       salesPrice: round2(incomingPrice),    // ✅ converted
//       lastEditedBy: req.user?._id,
//       updatedAt: new Date(),
//     };

//     const item = await CostingItems.findOneAndUpdate(
//       { _id: itemId, drawingId },
//       updateDoc,
//       { new: true }
//     );

//     if (!item) {
//       return res.status(404).json({ success: false, error: "Costing item not found" });
//     }

//     // 3) Recompute ALL totals from DB (salesPrice already converted)
//     const oid = new mongoose.Types.ObjectId(drawingId);
//     const grouped = await CostingItems.aggregate([
//       { $match: { drawingId: oid } },
//       {
//         $group: {
//           _id: "$quoteType",
//           bucketTotal: { $sum: { $toDouble: "$salesPrice" } },
//         },
//       },
//     ]);

//     let materialTotal = 0;
//     let manhourTotal = 0;
//     let packingTotal = 0;

//     for (const g of grouped) {
//       const t = toNum(g.bucketTotal);
//       switch ((g._id || "").toLowerCase()) {
//         case "material":
//           materialTotal = t;
//           break;
//         case "manhour":
//           manhourTotal = t;
//           break;
//         case "packing":
//           packingTotal = t;
//           break;
//         default:
//           break;
//       }
//     }

//     // 4) Apply markups
//     const materialMarkup = toNum(drawing.materialMarkup);
//     const manhourMarkup = toNum(drawing.manhourMarkup);
//     const packingMarkup = toNum(drawing.packingMarkup);

//     const materialWithMarkup = round2(materialTotal + (materialTotal * materialMarkup) / 100);
//     const manhourWithMarkup = round2(manhourTotal + (manhourTotal * manhourMarkup) / 100);
//     const packingWithMarkup = round2(packingTotal + (packingTotal * packingMarkup) / 100);

//     const totalPriceRaw = round2(materialTotal + manhourTotal + packingTotal);
//     const totalPriceWithMarkup = round2(materialWithMarkup + manhourWithMarkup + packingWithMarkup);

//     // 5) Lead time
//     const existingLTW = toNum(drawing.leadTimeWeeks);

//     // ✅ Better: leadtime should be MAX among all items, not just this req.body
//     // If you want exact: compute max from DB
//     const leadAgg = await CostingItems.aggregate([
//       { $match: { drawingId: oid } },
//       { $group: { _id: null, maxLead: { $max: { $toDouble: "$leadTime" } } } },
//     ]);

//     const maxLeadFromItems = toNum(leadAgg?.[0]?.maxLead);
//     const finalLTW = Math.max(existingLTW, maxLeadFromItems);

//     // 6) Save drawing
//     drawing.materialTotal = round2(materialTotal);
//     drawing.manhourTotal = round2(manhourTotal);
//     drawing.packingTotal = round2(packingTotal);
//     drawing.totalPrice = totalPriceRaw;
//     drawing.totalPriceWithMarkup = totalPriceWithMarkup;
//     drawing.leadTimeWeeks = finalLTW;
//     drawing.lastEditedBy = req?.user?._id || drawing.lastEditedBy;

//     await drawing.save();

//     return res.json({
//       success: true,
//       message: "Costing item updated",
//       data: item,
//       totals: {
//         currency: drawingCurrency,
//         materialTotal: round2(materialTotal),
//         manhourTotal: round2(manhourTotal),
//         packingTotal: round2(packingTotal),
//         materialWithMarkup,
//         manhourWithMarkup,
//         packingWithMarkup,
//         totalPrice: drawing.totalPrice,
//         totalPriceWithMarkup,
//         leadTimeWeeks: drawing.leadTimeWeeks,
//       },
//     });
//   } catch (err) {
//     console.error("updateCostingItem Error:", err);
//     return res.status(500).json({ success: false, error: err.message });
//   }
// };


// export const addCostingItem = async (req, res) => {
//   try {
//     const { drawingId } = req.params;

//     // 1) Load drawing
//     const drawing = await Drawing.findById(drawingId);
//     if (!drawing) return res.status(404).json({ success: false, error: "Drawing not found" });

//     const settings = await SystemSettings.findOne({}).lean();

//     // 2) Create item (attach drawingId)
//     const costingData = { ...req.body, drawingId };
//     const newItem = await CostingItems.create(costingData);

//     // 3) Recompute ALL totals (group by quoteType) using salesPrice
//     const oid = new mongoose.Types.ObjectId(drawingId);
//     const grouped = await CostingItems.aggregate([
//       { $match: { drawingId: oid } },
//       {
//         $group: {
//           _id: "$quoteType",
//           bucketTotal: { $sum: { $toDouble: "$salesPrice" } }, // <- use "$extPrice" if that's your canonical field
//         },
//       },
//     ]);

//     // 4) Collect bucket totals
//     let materialTotal = 0;
//     let manhourTotal = 0;
//     let packingTotal = 0;

//     for (const g of grouped) {
//       const t = toNum(g.bucketTotal);
//       switch ((g._id || "").toLowerCase()) {
//         case "material": materialTotal = t; break;
//         case "manhour": manhourTotal = t; break;
//         case "packing": packingTotal = t; break;
//         default: /* ignore unknown types */ break;
//       }
//     }

//     // 5) Apply markups
//     const materialMarkup = toNum(drawing.materialMarkup);
//     const manhourMarkup = toNum(drawing.manhourMarkup);
//     const packingMarkup = toNum(drawing.packingMarkup);

//     const materialWithMarkup = round2(materialTotal + (materialTotal * materialMarkup) / 100);
//     const manhourWithMarkup = round2(manhourTotal + (manhourTotal * manhourMarkup) / 100);
//     const packingWithMarkup = round2(packingTotal + (packingTotal * packingMarkup) / 100);

//     const totalPriceRaw = toNum(materialTotal + manhourTotal + packingTotal);
//     const totalPriceWithMarkup = round2(materialWithMarkup + manhourWithMarkup + packingWithMarkup);

//     // 6) Lead time: keep max(existing, this new item’s)
//     const existingLTW = toNum(drawing.leadTimeWeeks);
//     const newLTW = toNum(costingData.leadTime); // change to .leadTimeWeeks if that’s your field
//     const finalLTW = Math.max(existingLTW, newLTW);

//     // 7) Save drawing (no incremental +=, always set from recompute)
//     drawing.materialTotal = round2(materialTotal);
//     drawing.manhourTotal = round2(manhourTotal);
//     drawing.packingTotal = round2(packingTotal);
//     drawing.totalPrice = round2(totalPriceRaw);
//     drawing.totalPriceWithMarkup = totalPriceWithMarkup;
//     drawing.leadTimeWeeks = finalLTW;
//     drawing.lastEditedBy = req?.user?._id || drawing.lastEditedBy;

//     await drawing.save();

//     return res.status(201).json({
//       success: true,
//       message: "Costing item added",
//       data: newItem,
//       totals: {
//         materialTotal: round2(materialTotal),
//         manhourTotal: round2(manhourTotal),
//         packingTotal: round2(packingTotal),
//         materialWithMarkup,
//         manhourWithMarkup,
//         packingWithMarkup,
//         totalPrice: drawing.totalPrice,
//         totalPriceWithMarkup,
//         leadTimeWeeks: drawing.leadTimeWeeks,
//       },
//     });
//   } catch (err) {
//     console.error("addCostingItem Error:", err);
//     return res.status(500).json({ success: false, error: err.message });
//   }
// };

// export const updateCostingItem = async (req, res) => {
//   try {
//     const { drawingId, itemId } = req.params;

//     // 1) Update the costing item
//     const item = await CostingItems.findOneAndUpdate(
//       { _id: itemId, drawingId },
//       {
//         ...req.body,
//         lastEditedBy: req.user?._id,
//         updatedAt: new Date(),
//       },
//       { new: true }
//     );

//     if (!item) {
//       return res.status(404).json({ success: false, error: "Costing item not found" });
//     }

//     // 2) Load drawing
//     const drawing = await Drawing.findById(drawingId);
//     if (!drawing) {
//       return res.status(404).json({ success: false, error: "Drawing not found" });
//     }

//     // 3) Recompute ALL totals from DB (group by quoteType)
//     const oid = new mongoose.Types.ObjectId(drawingId);
//     const grouped = await CostingItems.aggregate([
//       { $match: { drawingId: oid } },
//       {
//         $group: {
//           _id: "$quoteType",
//           // 👉 switch to "$extPrice" if that is your canonical field
//           bucketTotal: { $sum: { $toDouble: "$salesPrice" } },
//         },
//       },
//     ]);

//     // 4) Collect bucket totals
//     let materialTotal = 0;
//     let manhourTotal = 0;
//     let packingTotal = 0;

//     for (const g of grouped) {
//       const t = toNum(g.bucketTotal);
//       switch ((g._id || "").toLowerCase()) {
//         case "material": materialTotal = t; break;
//         case "manhour": manhourTotal = t; break;
//         case "packing": packingTotal = t; break;
//         default: /* ignore unknown */ break;
//       }
//     }

//     // 5) Apply markups
//     const materialMarkup = toNum(drawing.materialMarkup);
//     const manhourMarkup = toNum(drawing.manhourMarkup);
//     const packingMarkup = toNum(drawing.packingMarkup);

//     const materialWithMarkup = round2(materialTotal + (materialTotal * materialMarkup) / 100);
//     const manhourWithMarkup = round2(manhourTotal + (manhourTotal * manhourMarkup) / 100);
//     const packingWithMarkup = round2(packingTotal + (packingTotal * packingMarkup) / 100);

//     const totalPriceRaw = round2(materialTotal + manhourTotal + packingTotal);
//     const totalPriceWithMarkup = round2(materialWithMarkup + manhourWithMarkup + packingWithMarkup);

//     // 6) Lead time: keep max(existing, incoming)
//     const existingLTW = toNum(drawing.leadTimeWeeks);
//     const newLTW = toNum(req.body.leadTime); // or req.body.leadTimeWeeks
//     const finalLTW = Math.max(existingLTW, newLTW);

//     // 7) Save drawing (no incremental +=)
//     drawing.materialTotal = round2(materialTotal);
//     drawing.manhourTotal = round2(manhourTotal);
//     drawing.packingTotal = round2(packingTotal);
//     drawing.totalPrice = totalPriceRaw;
//     drawing.totalPriceWithMarkup = totalPriceWithMarkup;
//     drawing.leadTimeWeeks = finalLTW;
//     drawing.lastEditedBy = req?.user?._id || drawing.lastEditedBy;

//     await drawing.save();

//     return res.json({
//       success: true,
//       message: "Costing item updated",
//       data: item,
//       totals: {
//         materialTotal: round2(materialTotal),
//         manhourTotal: round2(manhourTotal),
//         packingTotal: round2(packingTotal),
//         materialWithMarkup,
//         manhourWithMarkup,
//         packingWithMarkup,
//         totalPrice: drawing.totalPrice,
//         totalPriceWithMarkup,
//         leadTimeWeeks: drawing.leadTimeWeeks,
//       },
//     });
//   } catch (err) {
//     console.error("updateCostingItem Error:", err);
//     return res.status(500).json({ success: false, error: err.message });
//   }
// };


export const deleteCostingItem = async (req, res) => {
  try {
    const { drawingId, itemId } = req.params;

    // 1️⃣ Delete the costing item
    const deleted = await CostingItems.findOneAndDelete({ _id: itemId, drawingId });
    if (!deleted)
      return res.status(404).json({ success: false, error: "Costing item not found" });

    // 2️⃣ Find drawing
    const drawing = await Drawing.findById(drawingId);
    if (!drawing)
      return res.status(404).json({ success: false, error: "Drawing not found" });

    // 3️⃣ Recalculate totals from remaining costing items
    const oid = new mongoose.Types.ObjectId(drawingId);
    const grouped = await CostingItems.aggregate([
      { $match: { drawingId: oid } },
      {
        $group: {
          _id: "$quoteType",
          // 👉 switch to "$extPrice" if that’s your canonical field
          bucketTotal: { $sum: { $toDouble: "$salesPrice" } },
        },
      },
    ]);

    // 4️⃣ Collect bucket totals
    let materialTotal = 0;
    let manhourTotal = 0;
    let packingTotal = 0;

    for (const g of grouped) {
      const t = toNum(g.bucketTotal);
      switch ((g._id || "").toLowerCase()) {
        case "material": materialTotal = t; break;
        case "manhour": manhourTotal = t; break;
        case "packing": packingTotal = t; break;
        default: /* ignore unknown */ break;
      }
    }

    // 5️⃣ Apply markups
    const materialMarkup = toNum(drawing.materialMarkup);
    const manhourMarkup = toNum(drawing.manhourMarkup);
    const packingMarkup = toNum(drawing.packingMarkup);

    const materialWithMarkup = round2(materialTotal + (materialTotal * materialMarkup) / 100);
    const manhourWithMarkup = round2(manhourTotal + (manhourTotal * manhourMarkup) / 100);
    const packingWithMarkup = round2(packingTotal + (packingTotal * packingMarkup) / 100);

    const totalPriceRaw = round2(materialTotal + manhourTotal + packingTotal);
    const totalPriceWithMarkup = round2(materialWithMarkup + manhourWithMarkup + packingWithMarkup);

    // 6️⃣ Update drawing
    drawing.materialTotal = round2(materialTotal);
    drawing.manhourTotal = round2(manhourTotal);
    drawing.packingTotal = round2(packingTotal);
    drawing.totalPrice = totalPriceRaw;
    drawing.totalPriceWithMarkup = totalPriceWithMarkup;
    drawing.lastEditedBy = req?.user?._id || drawing.lastEditedBy;

    await drawing.save();

    return res.json({
      success: true,
      message: "Costing item deleted and totals recalculated",
      deletedItem: deleted,
      totals: {
        materialTotal,
        manhourTotal,
        packingTotal,
        materialWithMarkup,
        manhourWithMarkup,
        packingWithMarkup,
        totalPrice: totalPriceRaw,
        totalPriceWithMarkup,
      },
    });
  } catch (err) {
    console.error("deleteCostingItem Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};


export const getAllCostingItems = async (req, res) => {
  try {
    const { drawingId } = req.params;

    const drawing = await Drawing.findById(drawingId).populate("lastEditedBy", "name").select("drawingNo description totalPrice");
    if (!drawing) return res.status(404).json({ error: "Drawing not found" });

    const items = await CostingItems.find({ drawingId })
      .populate({
        path: "skillLevel", // parent reference
        populate: [
          { path: "type", select: "name code" },           // populate skill type details
          { path: "currencyType", select: "name symbol" }, // populate currency type details
        ],
      })
      .populate({
        path: "mpn", // parent reference
        select: "MPN RFQUnitPrice",
        populate: [
          { path: "currency", select: "name symbol" }, // populate currency type details
          { path: "UOM", select: "symbol code" }
        ],
      })
      .populate({
        path: "drawingId",
        select: "drawingNo projectId",
        populate: {
          path: "projectId",
          select: "projectName currency",
          populate: {
            path: "currency",
            select: "symbol"
          }
        }
      })
      // .populate("mpn", "MPN RFQUnitPrice currency")
      .populate('childPart', "ChildPartNo")
      .populate("uom", "code")
      .populate("lastEditedBy", "name")
      .sort({ itemNumber: 1 }).lean()


    const result = items.map(item => ({
      ...item,
      drawingId: item.drawingId?._id,
      currencySymbol: item.drawingId?.projectId?.currency?.symbol
    }));


    res.json({
      success: true,
      message: "Costing items fetched successfully",
      data: {
        drawing,
        costingItems: result,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const uomCache = new Map();

const getUomId = async (raw, errorsArr, ctx) => {
  const val = toStr(raw)?.trim();
  if (!val) return null;

  const key = val.toUpperCase();

  // check cache first
  if (uomCache.has(key)) return uomCache.get(key);

  // Try to find by code first
  let doc = await UOM.findOne({ code: new RegExp(`^${val}$`, 'i') })
    .select('_id code name')
    .lean();

  // If not found by code, try by name
  if (!doc) {
    doc = await UOM.findOne({ name: new RegExp(`^${val}$`, 'i') })
      .select('_id code name')
      .lean();
  }

  if (!doc) {
    // record non-fatal error
    errorsArr?.push({
      row: ctx?.rowIndex ?? '-',
      drawingNo: ctx?.drawingNo ?? '-',
      error: `UOM not found: "${val}"`,
    });

    uomCache.set(key, null);
    return null;
  }

  // Cache and return ID
  uomCache.set(key, doc._id);
  return doc._id;
};

function formatCostingImportErrors(errors = []) {
  if (!Array.isArray(errors) || errors.length === 0) return "";

  // group by quoteType first (optional)
  const byType = new Map();

  for (const e of errors) {
    const type = (e?.type || "unknown").toLowerCase();
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type).push(e);
  }

  const lines = [];

  for (const [type, list] of byType.entries()) {
    lines.push(`${type.toUpperCase()} Errors:`);

    // de-duplicate same msg+field+value, merge rows
    const merged = new Map(); // key -> {rows:Set, message, field, value}
    for (const e of list) {
      const row = e?.row != null ? Number(e.row) : null;
      const message = String(e?.message || "").trim();
      const field = e?.field ? String(e.field).trim() : "";
      const value =
        e?.value === 0 || e?.value ? String(e.value).trim() : "";

      const key = `${message}||${field}||${value}`;

      if (!merged.has(key)) {
        merged.set(key, { rows: new Set(), message, field, value });
      }
      if (row != null) merged.get(key).rows.add(row);
    }

    for (const m of merged.values()) {
      const rowList = [...m.rows].sort((a, b) => a - b);
      const rowText = rowList.length ? `Rows ${rowList.join(", ")}` : `Row -`;
      const fieldText =
        m.field
          ? m.value !== ""
            ? ` [${m.field}: ${m.value}]`
            : ` [${m.field}]`
          : "";
      lines.push(`  • ${rowText} → ${m.message}${fieldText}`);
    }

    lines.push(""); // blank line
  }

  return lines.join("\n").trim();
}

export const importCostingItems = async (req, res) => {
  let filePath = null;

  try {
    const { drawingId } = req.params;
    const { quoteType } = req.body;
    const file = req.file;

    if (!file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }
    filePath = file.path;

    if (!mongoose.Types.ObjectId.isValid(drawingId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid drawingId" });
    }

    const drawing = await Drawing.findById(drawingId).populate("currency", "code symbol")
    if (!drawing) {
      return res
        .status(404)
        .json({ success: false, message: "Drawing not found" });
    }

    // ✅ Currency settings (ONE TIME)
    const settings = await SystemSettings.findOne({}).lean();
    if (!settings?.currencySettings) {
      return res.status(500).json({
        success: false,
        message: "Currency settings missing in SystemSettings",
      });
    }

    const drawingCurrency = (drawing.currency?.code || "SGD").toUpperCase();
    // file/MPN currency default (mostly USD)
    const defaultSourceCurrency = (req.body.sourceCurrency || "USD").toUpperCase();

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }); // defval important


    // console.log('------rows', rows)
    const lastItem = await CostingItems.findOne({ drawingId, quoteType })
      .sort({ itemNumber: -1 })
      .lean();

    let nextItemNumber = lastItem ? Number(lastItem.itemNumber) + 1 : 1;

    const newItems = [];
    const errors = [];
    let rowIndex = 0;

    for (const row of rows) {
      rowIndex += 1;
      const rowNumber = rowIndex + 1; // header = row 1

      let newItem = null;

      try {
        // ================= PACKING =================
        if (quoteType === "packing") {
          const mpnName = (row["MPN Name"] ?? "").toString().trim();
          const descriptionIn = (row["Description"] ?? row.Description ?? "")
            .toString()
            .trim();
          const uomCode = (row["UOM"] ?? row.UOM ?? "").toString().trim();

          const quantity = toNum(row["Quantity"]);
          const unitPriceRaw = toNum(row["Unit Price"]);
          const sgaPercent = toNum(row["SGA %"]);
          const matBurden = toNum(row["Max Burden %"]);
          const freightPercent = toNum(row["Freight %"]);

          if (!mpnName) {
            errors.push({
              row: rowNumber,
              type: "packing",
              field: "MPN Name",
              value: mpnName,
              message: "MPN Name is required",
            });
            continue;
          }
          if (!uomCode) {
            errors.push({
              row: rowNumber,
              type: "packing",
              field: "UOM",
              value: uomCode,
              message: "UOM is required",
            });
            continue;
          }
          if (!(quantity > 0)) {
            errors.push({
              row: rowNumber,
              type: "packing",
              field: "Quantity",
              value: row["Quantity"],
              message: "Quantity must be > 0",
            });
            continue;
          }

          const mpn = await MPN.findOne({ MPN: mpnName })
            .select("_id Description Manufacturer")
            .lean();
          if (!mpn) {
            errors.push({
              row: rowNumber,
              type: "packing",
              field: "MPN Name",
              value: mpnName,
              message: `MPN not found: ${mpnName}`,
            });
            continue;
          }

          const uomDoc = await UOM.findOne({ code: uomCode })
            .select("_id code")
            .lean();
          if (!uomDoc) {
            errors.push({
              row: rowNumber,
              type: "packing",
              field: "UOM",
              value: uomCode,
              message: `UOM not found: ${uomCode}`,
            });
            continue;
          }

          // ✅ Currency conversion for Packing unit price
          const rowCurrency = (
            row["Currency"] ||
            row["CUR"] ||
            defaultSourceCurrency ||
            "USD"
          )
            .toString()
            .trim()
            .toUpperCase();

          const unitPrice =
            rowCurrency === drawingCurrency
              ? round2(unitPriceRaw)
              : convertCurrency(unitPriceRaw, rowCurrency, drawingCurrency, settings, {
                decimals: 2,
              });

          const extPrice = round2(quantity * unitPrice);
          const upliftPct = (sgaPercent + matBurden + freightPercent) / 100;
          const salesPrice = round2(extPrice * (1 + upliftPct));

          newItem = {
            drawingId,
            quoteType,
            itemNumber: String(nextItemNumber).padStart(4, "0"),
            mpn: mpn._id,
            description: descriptionIn || (mpn.Description ?? ""),
            manufacturer: mpn.Manufacturer ?? "",
            uom: uomDoc._id,
            quantity,
            unitPrice, // ✅ converted
            sourceUnitPrice: round2(unitPriceRaw),
            sourceCurrency: rowCurrency,
            currency: drawingCurrency,
            sgaPercent,
            matBurden,
            freightPercent,
            extPrice,
            salesPrice,
            moq: 0,
            tolerance: 0,
            actualQty: quantity,
            lastEditedBy: req.user?._id || null,
          };
        }

        // ================= MANHOUR =================
        else if (quoteType === "manhour") {
          const skillName = (row["Skill Level"] ?? "").toString().trim();
          const remarks = (row["Remarks"] ?? "").toString().trim();
          const quantity = toNum(row["Quantity"]);

          if (!skillName) continue; // empty row skip

          if (!(quantity > 0)) {
            errors.push({
              row: rowNumber,
              type: "manhour",
              field: "Quantity",
              value: row["Quantity"],
              message: "Quantity must be > 0",
            });
            continue;
          }

          const skillLevel = await SkillLevelCosting.findOne({
            skillLevelName: skillName,
          }).populate("type");

          if (!skillLevel) {
            errors.push({
              row: rowNumber,
              type: "manhour",
              field: "Skill Level",
              value: skillName,
              message: `Skill Level not found: ${skillName}`,
            });
            continue;
          }

          // ⚠️ Assuming skillLevel prices are already in drawing currency
          // If not, you can convert similarly using settings
          const unitPrice = toNum(skillLevel.unitPrice ?? skillLevel.rate);
          const extPrice = round2(unitPrice * quantity);
          const salesPrice = extPrice;

          newItem = {
            drawingId,
            quoteType,
            itemNumber: String(nextItemNumber).padStart(4, "0"),
            description: skillLevel.skillLevelName,
            uom: skillLevel.type?._id || null,
            skillLevel: skillLevel._id,
            quantity,
            remarks,
            unitPrice,
            currency: drawingCurrency,
            salesPrice,
            extPrice,
            lastEditedBy: req.user?._id || null,
          };
        }

        // ================= MATERIAL =================
        // ================= MATERIAL =================
        else if (quoteType === "material") {
          const childKey = (row["ChildPart"] ?? row["Part Number"] ?? "")
            .toString()
            .trim();

          if (!childKey) {
            errors.push({
              row: rowNumber,
              type: "material",
              field: "ChildPart / Part Number",
              value: "",
              message: "ChildPart / Part Number is required",
            });
            continue;
          }

          const childPart = await Child.findOne({
            ChildPartNo: childKey,
          }).populate({
            path: "mpn",
            populate: [
              { path: "currency", select: "code" },   // currency ka code
              { path: "UOM", select: "code" },        // UOM ka code
            ],
          });


          console.log('------childPart', childPart)


          if (!childPart || !childPart.mpn) {
            errors.push({
              row: rowNumber,
              type: "material",
              field: "ChildPart",
              value: childKey,
              message: `MPN not found for ChildPart: ${childKey}`,
            });
            continue;
          }

          // 🔒 Duplicate check
          const alreadyExists = await CostingItems.findOne({
            drawingId,
            quoteType: "material",
            childPart: childPart._id,
          }).lean();

          if (alreadyExists) {
            errors.push({
              row: rowNumber,
              type: "material",
              field: "ChildPart",
              value: childKey,
              message: `Child Part ${childKey} already added in this Drawing`,
            });
            continue;
          }

          const uomRaw = (row["UOM"] ?? "").toString().trim() || childPart?.mpn?.UOM?.code?.trim();
          const uomId = await getUomId(uomRaw);
         

          const quantity = toNum(row["Qty"]);
          if (!(quantity > 0)) {
            errors.push({
              row: rowNumber,
              type: "material",
              field: "Qty",
              value: row["Qty"],
              message: "Qty must be > 0",
            });
            continue;
          }

          const unitPriceRaw = toNum(childPart.mpn.RFQUnitPrice);
          if (!(unitPriceRaw > 0)) {
            errors.push({
              row: rowNumber,
              type: "material",
              field: "RFQ Unit Price",
              value: unitPriceRaw,
              message: "RFQ Unit Price missing or 0 for this MPN",
            });
            continue;
          }

          // ================= CURRENCY LOGIC (FINAL) =================

          // ✅ Source currency from MPN (ObjectId → code)
          const mpnCurrencyCode = (
            childPart.mpn.currency?.code || "USD"
          ).toUpperCase();

          // ✅ Target currency from Drawing (ObjectId → code)
          const drawingCurrencyCode = (
            drawing.currency?.code || "USD"
          ).toUpperCase();

          // ✅ Convert ONLY if needed
         

          let newPrice;
          let masterUomId = childPart.mpn?.UOM
          try {
            newPrice = await convertLengthUnitPrice(
              unitPriceRaw,
               childPart?.mpn?.UOM?.code,
               uomRaw,
            );
          } catch (convErr) {
            errors.push({
              row: rowNumber,
              type: "material",
              field: "UOM conversion",
              value: `${uomRaw}`,
              message: convErr.message || "UOM conversion failed",
            });
            continue;
          }

           const unitPrice =
            mpnCurrencyCode === drawingCurrencyCode
              ? round2(newPrice)
              : convertCurrency(
                newPrice,
                mpnCurrencyCode,
                drawingCurrencyCode,
                settings,
                { decimals: 2 }
              );


          // ==========================================================

          const tolerance = toNum(row["Tolerance"]);
          const sgaPercent = toNum(row["SGA %"]);
          const matBurden = toNum(row["Mat Burden %"] || 0);
          const freightPercent = toNum(row["Freight Cost %"] || 0);
          const fixedFreightCost = toNum(row["Fixed Freight Cost"] || 0);

          const actualQty = round2(quantity + (quantity * tolerance) / 100);
          const extPrice = round2(quantity * unitPrice);
          const salesPrice = round2(
            extPrice * (1 + (sgaPercent + matBurden + freightPercent) / 100) +
            fixedFreightCost
          );

          newItem = {
            drawingId,
            quoteType,
            itemNumber: String(nextItemNumber).padStart(4, "0"),

            childPart: childPart._id,
            mpn: childPart.mpn._id,

            description: String(childPart.mpn.Description || "").trim(),
            manufacturer: childPart.mpn.Manufacturer || "",

            uom: uomId,
            moq: toNum(childPart.mpn.MOQ),
            leadTime: toNum(childPart.mpn.LeadTime_WK),
            rfqDate: childPart.mpn.RFQDate,
            supplier: childPart.mpn.Supplier,

            // ✅ Currency fields (ObjectId saved)
            unitPrice,
            sourceUnitPrice: round2(unitPriceRaw),
            sourceCurrency: childPart.mpn.currency?._id, // ✅ MPN currency ObjectId
            currency: drawing.currency?._id,              // ✅ Drawing currency ObjectId

            quantity,
            tolerance,
            actualQty,
            sgaPercent,
            matBurden,
            freightPercent,
            fixedFreightCost,

            extPrice,
            salesPrice,

            lastEditedBy: req.user?._id || null,
          };
        }
        else {
          return res.status(400).json({
            success: false,
            message: `Unsupported quoteType: ${quoteType}`,
          });
        }
      } catch (rowErr) {
        // hide mongo ugly stuff
        if (rowErr?.code === 11000) {
          errors.push({
            row: rowNumber,
            type: quoteType,
            field: "duplicate",
            value: "",
            message: "Duplicate row (already exists)",
          });
        } else {
          errors.push({
            row: rowNumber,
            type: quoteType,
            field: "row",
            value: "",
            message: rowErr.message || "Unexpected error",
          });
        }
        continue;
      }

      if (newItem) {
        newItems.push(newItem);
        nextItemNumber++;
      }
    }

    // ✅ Insert valid rows (even if errors exist)
    let insertedDocs = [];
    if (newItems.length > 0) {
      insertedDocs = await CostingItems.insertMany(newItems, { ordered: false }); // best effort
    }

    // ✅ Recompute totals if anything inserted
    if (insertedDocs.length > 0) {
      const oid = new mongoose.Types.ObjectId(drawingId);
      const grouped = await CostingItems.aggregate([
        { $match: { drawingId: oid } },
        {
          $group: {
            _id: "$quoteType",
            bucketTotal: { $sum: { $toDouble: "$salesPrice" } },
          },
        },
      ]);

      let materialTotal = 0,
        manhourTotal = 0,
        packingTotal = 0;

      for (const g of grouped) {
        const t = toNum(g.bucketTotal);
        switch ((g._id || "").toLowerCase()) {
          case "material":
            materialTotal = t;
            break;
          case "manhour":
            manhourTotal = t;
            break;
          case "packing":
            packingTotal = t;
            break;
          default:
            break;
        }
      }

      const materialMarkup = toNum(drawing.materialMarkup);
      const manhourMarkup = toNum(drawing.manhourMarkup);
      const packingMarkup = toNum(drawing.packingMarkup);

      const materialWithMarkup = round2(
        materialTotal + (materialTotal * materialMarkup) / 100
      );
      const manhourWithMarkup = round2(
        manhourTotal + (manhourTotal * manhourMarkup) / 100
      );
      const packingWithMarkup = round2(
        packingTotal + (packingTotal * packingMarkup) / 100
      );

      drawing.materialTotal = round2(materialTotal);
      drawing.manhourTotal = round2(manhourTotal);
      drawing.packingTotal = round2(packingTotal);
      drawing.totalPrice = round2(materialTotal + manhourTotal + packingTotal);
      drawing.totalPriceWithMarkup = round2(
        materialWithMarkup + manhourWithMarkup + packingWithMarkup
      );

      const importedMaxLTW = Math.max(
        0,
        ...newItems.map((x) => toNum(x.leadTime ?? x.leadTimeWeeks))
      );
      drawing.leadTimeWeeks = Math.max(toNum(drawing.leadTimeWeeks), importedMaxLTW);

      drawing.lastEditedBy = req?.user?._id || drawing.lastEditedBy;

      // ✅ keep drawing currency consistent
      drawing.currency = drawing?.currency?._id;

      await drawing.save();
    }

    // ✅ Build message
    const errorMessage = formatCostingImportErrors(errors);

    // If nothing inserted & errors exist => fail
    if (insertedDocs.length === 0 && errors.length > 0) {
      return res.status(400).json({
        success: false,
        insertedCount: 0,
        errorCount: errors.length,
        message: errorMessage,
        errors,
      });
    }

    // Partial success => 207
    if (errors.length > 0) {
      return res.status(207).json({
        success: true,
        insertedCount: insertedDocs.length,
        errorCount: errors.length,
        message: `Imported ${insertedDocs.length} rows, some rows failed:\n\n${errorMessage}`,
        errors,
      });
    }

    // Full success
    return res.status(200).json({
      success: true,
      insertedCount: insertedDocs.length,
      message: `✅ ${quoteType} import successful`,
    });
  } catch (error) {
    console.error("❌ Import Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to import costing items",
      error: error.message,
    });
  } finally {
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch { }
    }
  }
};


// old
// export const importCostingItems = async (req, res) => {
//   let filePath = null;

//   try {
//     const { drawingId } = req.params;
//     const { quoteType } = req.body;
//     const file = req.file;

//     if (!file) return res.status(400).json({ success: false, message: "No file uploaded" });
//     filePath = file.path;

//     if (!mongoose.Types.ObjectId.isValid(drawingId)) {
//       return res.status(400).json({ success: false, message: "Invalid drawingId" });
//     }

//     const drawing = await Drawing.findById(drawingId);
//     if (!drawing) return res.status(404).json({ success: false, message: "Drawing not found" });

//     const workbook = XLSX.readFile(filePath);
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }); // defval important

//     const lastItem = await CostingItems.findOne({ drawingId, quoteType })
//       .sort({ itemNumber: -1 })
//       .lean();

//     let nextItemNumber = lastItem ? Number(lastItem.itemNumber) + 1 : 1;

//     const newItems = [];
//     const errors = [];
//     let rowIndex = 0;

//     for (const row of rows) {
//       rowIndex += 1;
//       const rowNumber = rowIndex + 1; // header = row 1

//       let newItem = null;

//       try {
//         // ================= PACKING =================
//         if (quoteType === "packing") {
//           const mpnName = (row["MPN Name"] ?? "").toString().trim();
//           const descriptionIn = (row["Description"] ?? row.Description ?? "").toString().trim();
//           const uomCode = (row["UOM"] ?? row.UOM ?? "").toString().trim();

//           const quantity = toNum(row["Quantity"]);
//           const unitPrice = toNum(row["Unit Price"]);
//           const sgaPercent = toNum(row["SGA %"]);
//           const matBurden = toNum(row["Max Burden %"]);
//           const freightPercent = toNum(row["Freight %"]);

//           if (!mpnName) {
//             errors.push({ row: rowNumber, type: "packing", field: "MPN Name", value: mpnName, message: "MPN Name is required" });
//             continue;
//           }
//           if (!uomCode) {
//             errors.push({ row: rowNumber, type: "packing", field: "UOM", value: uomCode, message: "UOM is required" });
//             continue;
//           }
//           if (!(quantity > 0)) {
//             errors.push({ row: rowNumber, type: "packing", field: "Quantity", value: row["Quantity"], message: "Quantity must be > 0" });
//             continue;
//           }

//           const mpn = await MPN.findOne({ MPN: mpnName }).select("_id Description Manufacturer").lean();
//           if (!mpn) {
//             errors.push({ row: rowNumber, type: "packing", field: "MPN Name", value: mpnName, message: `MPN not found: ${mpnName}` });
//             continue;
//           }

//           const uomDoc = await UOM.findOne({ code: uomCode }).select("_id code").lean();
//           if (!uomDoc) {
//             errors.push({ row: rowNumber, type: "packing", field: "UOM", value: uomCode, message: `UOM not found: ${uomCode}` });
//             continue;
//           }

//           const extPrice = round2(quantity * unitPrice);
//           const upliftPct = (sgaPercent + matBurden + freightPercent) / 100;
//           const salesPrice = round2(extPrice * (1 + upliftPct));

//           newItem = {
//             drawingId,
//             quoteType,
//             itemNumber: String(nextItemNumber).padStart(4, "0"),
//             mpn: mpn._id,
//             description: descriptionIn || (mpn.Description ?? ""),
//             manufacturer: mpn.Manufacturer ?? "",
//             uom: uomDoc._id,
//             quantity,
//             unitPrice,
//             sgaPercent,
//             matBurden,
//             freightPercent,
//             extPrice,
//             salesPrice,
//             moq: 0,
//             tolerance: 0,
//             actualQty: quantity,
//             lastEditedBy: req.user?._id || null,
//           };
//         }

//         // ================= MANHOUR =================
//         else if (quoteType === "manhour") {
//           const skillName = (row["Skill Level"] ?? "").toString().trim();
//           const remarks = (row["Remarks"] ?? "").toString().trim();
//           const quantity = toNum(row["Quantity"]);

//           if (!skillName) continue; // empty row skip

//           if (!(quantity > 0)) {
//             errors.push({ row: rowNumber, type: "manhour", field: "Quantity", value: row["Quantity"], message: "Quantity must be > 0" });
//             continue;
//           }

//           const skillLevel = await SkillLevelCosting.findOne({ skillLevelName: skillName }).populate("type");
//           if (!skillLevel) {
//             errors.push({ row: rowNumber, type: "manhour", field: "Skill Level", value: skillName, message: `Skill Level not found: ${skillName}` });
//             continue;
//           }

//           const unitPrice = toNum(skillLevel.unitPrice ?? skillLevel.rate);
//           const extPrice = round2(unitPrice * quantity);
//           const salesPrice = extPrice;

//           newItem = {
//             drawingId,
//             quoteType,
//             itemNumber: String(nextItemNumber).padStart(4, "0"),
//             description: skillLevel.skillLevelName,
//             uom: skillLevel.type?._id || null,
//             skillLevel: skillLevel._id,
//             quantity,
//             remarks,
//             unitPrice,
//             salesPrice,
//             extPrice,
//             lastEditedBy: req.user?._id || null,
//           };
//         }

//         // ================= MATERIAL =================
//         else if (quoteType === "material") {
//           const childKey = (row["ChildPart"] ?? row["Part Number"] ?? "").toString().trim();

//           if (!childKey) {
//             errors.push({ row: rowNumber, type: "material", field: "ChildPart / Part Number", value: "", message: "ChildPart / Part Number is required" });
//             continue;
//           }

//           const childPart = await Child.findOne({ ChildPartNo: childKey }).populate("mpn");

//           if (!childPart || !childPart.mpn) {
//             errors.push({ row: rowNumber, type: "material", field: "ChildPart", value: childKey, message: `MPN not found for ChildPart: ${childKey}` });
//             continue;
//           }

//           // 🔒 2) DB-level duplicate (same drawingId + same childPart)
//           const alreadyExists = await CostingItems.findOne({
//             drawingId,
//             quoteType: "material",
//             childPart: childPart._id,
//           }).lean();

//           if (alreadyExists) {
//             errors.push({
//               row: rowNumber,
//               type: "material",
//               field: "ChildPart",
//               value: childKey,
//               message: `Child Part ${childKey} already added in this Drawing`,
//             });
//             continue;
//           }


//           const uomRaw = (row["UOM"] ?? "").toString().trim();
//           const uomId = await getUomId(uomRaw);
//           if (!uomId) {
//             errors.push({ row: rowNumber, type: "material", field: "UOM", value: uomRaw, message: `UOM not found: ${uomRaw}` });
//             continue;
//           }

//           const quantity = toNum(row["Qty"]);
//           if (!(quantity > 0)) {
//             errors.push({ row: rowNumber, type: "material", field: "Qty", value: row["Qty"], message: "Qty must be > 0" });
//             continue;
//           }

//           const unitPrice = toNum(childPart?.mpn?.RFQUnitPrice);
//           if (!(unitPrice > 0)) {
//             errors.push({ row: rowNumber, type: "material", field: "RFQ Unit Price", value: unitPrice, message: "RFQ Unit Price missing or 0 for this MPN" });
//             continue;
//           }

//           const tolerance = toNum(row["Tolerance"]);
//           const sgaPercent = toNum(row["SGA %"]);
//           const matBurden = toNum(row["Mat Burden %"] || 0);
//           const freightPercent = toNum(row["Freight Cost %"] || 0);
//           const fixedFreightCost = toNum(row["Fixed Freight Cost"] || 0);

//           const actualQty = round2(quantity + (quantity * tolerance) / 100);
//           const extPrice = round2(quantity * unitPrice);
//           const salesPrice = round2(
//             extPrice * (1 + (sgaPercent + matBurden + freightPercent) / 100) + fixedFreightCost
//           );

//           newItem = {
//             drawingId,
//             quoteType,
//             itemNumber: String(nextItemNumber).padStart(4, "0"),
//             childPart: childPart?._id,
//             mpn: childPart?.mpn?._id,
//             description: String(childPart?.mpn?.Description || "").trim(),
//             manufacturer: childPart?.mpn?.Manufacturer || "",
//             uom: uomId,
//             moq: toNum(childPart?.mpn?.MOQ),
//             leadTime: toNum(childPart?.mpn?.LeadTime_WK),
//             rfqDate: childPart?.mpn?.RFQDate,
//             supplier: childPart?.mpn?.Supplier,
//             unitPrice,
//             quantity,
//             tolerance,
//             actualQty,
//             sgaPercent,
//             matBurden,
//             freightPercent,
//             fixedFreightCost,
//             extPrice,
//             salesPrice,
//             lastEditedBy: req.user?._id || null,
//           };
//         } else {
//           return res.status(400).json({ success: false, message: `Unsupported quoteType: ${quoteType}` });
//         }
//       } catch (rowErr) {
//         // hide mongo ugly stuff
//         if (rowErr?.code === 11000) {
//           errors.push({ row: rowNumber, type: quoteType, field: "duplicate", value: "", message: "Duplicate row (already exists)" });
//         } else {
//           errors.push({ row: rowNumber, type: quoteType, field: "row", value: "", message: rowErr.message || "Unexpected error" });
//         }
//         continue;
//       }

//       if (newItem) {
//         newItems.push(newItem);
//         nextItemNumber++;
//       }
//     }

//     // ✅ Insert valid rows (even if errors exist)
//     let insertedDocs = [];
//     if (newItems.length > 0) {
//       insertedDocs = await CostingItems.insertMany(newItems, { ordered: false }); // ordered false => best effort
//     }

//     // ✅ Recompute totals if anything inserted
//     if (insertedDocs.length > 0) {
//       const oid = new mongoose.Types.ObjectId(drawingId);
//       const grouped = await CostingItems.aggregate([
//         { $match: { drawingId: oid } },
//         { $group: { _id: "$quoteType", bucketTotal: { $sum: { $toDouble: "$salesPrice" } } } },
//       ]);

//       let materialTotal = 0, manhourTotal = 0, packingTotal = 0;
//       for (const g of grouped) {
//         const t = toNum(g.bucketTotal);
//         switch ((g._id || "").toLowerCase()) {
//           case "material": materialTotal = t; break;
//           case "manhour": manhourTotal = t; break;
//           case "packing": packingTotal = t; break;
//           default: break;
//         }
//       }

//       const materialMarkup = toNum(drawing.materialMarkup);
//       const manhourMarkup = toNum(drawing.manhourMarkup);
//       const packingMarkup = toNum(drawing.packingMarkup);

//       const materialWithMarkup = round2(materialTotal + (materialTotal * materialMarkup) / 100);
//       const manhourWithMarkup = round2(manhourTotal + (manhourTotal * manhourMarkup) / 100);
//       const packingWithMarkup = round2(packingTotal + (packingTotal * packingMarkup) / 100);

//       drawing.materialTotal = round2(materialTotal);
//       drawing.manhourTotal = round2(manhourTotal);
//       drawing.packingTotal = round2(packingTotal);
//       drawing.totalPrice = round2(materialTotal + manhourTotal + packingTotal);
//       drawing.totalPriceWithMarkup = round2(materialWithMarkup + manhourWithMarkup + packingWithMarkup);

//       const importedMaxLTW = Math.max(0, ...newItems.map(x => toNum(x.leadTime ?? x.leadTimeWeeks)));
//       drawing.leadTimeWeeks = Math.max(toNum(drawing.leadTimeWeeks), importedMaxLTW);

//       drawing.lastEditedBy = req?.user?._id || drawing.lastEditedBy;
//       await drawing.save();
//     }

//     // ✅ Build message
//     const errorMessage = formatCostingImportErrors(errors);

//     // If nothing inserted & errors exist => fail
//     if (insertedDocs.length === 0 && errors.length > 0) {
//       return res.status(400).json({
//         success: false,
//         insertedCount: 0,
//         errorCount: errors.length,
//         message: errorMessage,
//         errors,
//       });
//     }

//     // Partial success => 207
//     if (errors.length > 0) {
//       return res.status(207).json({
//         success: true,
//         insertedCount: insertedDocs.length,
//         errorCount: errors.length,
//         message: `Imported ${insertedDocs.length} rows, some rows failed:\n\n${errorMessage}`,
//         errors,
//       });
//     }

//     // Full success
//     return res.status(200).json({
//       success: true,
//       insertedCount: insertedDocs.length,
//       message: `✅ ${quoteType} import successful`,
//     });

//   } catch (error) {
//     console.error("❌ Import Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to import costing items",
//       error: error.message,
//     });
//   } finally {
//     if (filePath) {
//       try { await fs.unlink(filePath); } catch { }
//     }
//   }
// };


// export const importCostingItems = async (req, res) => {
//   let filePath = null;
//   try {
//     const { drawingId } = req.params;
//     const { quoteType } = req.body;
//     const file = req.file;

//     if (!file) return res.status(400).json({ success: false, message: "No file uploaded" });
//     filePath = file.path;

//     // 0) base validations
//     if (!mongoose.Types.ObjectId.isValid(drawingId)) {
//       return res.status(400).json({ success: false, message: "Invalid drawingId" });
//     }
//     const drawing = await Drawing.findById(drawingId);
//     if (!drawing) return res.status(404).json({ success: false, message: "Drawing not found" });

//     // 1) read Excel
//     const workbook = XLSX.readFile(filePath);
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const rows = XLSX.utils.sheet_to_json(sheet);

//     // 2) last itemNumber seed
//     const lastItem = await CostingItems.findOne({ drawingId, quoteType }).sort({ itemNumber: -1 }).lean();
//     let nextItemNumber = lastItem ? Number(lastItem.itemNumber) + 1 : 1;

//     const newItems = [];
//     const errors = []; // ✅ collect all row-level errors here

//     let rowIndex = 0;

//     // 3) row loop
//     for (const row of rows) {
//       rowIndex += 1;

//       // Excel me generally row 2 se data start hota hai (row 1 = header)
//       const rowNumber = rowIndex + 1;

//       let newItem = null;

//       try {
//         /** =========================
//          *  PACKING
//          *  Columns expected: MPN Name | Description | UOM | Quantity | Unit Price | SGA % | Max Burden % | Freight %
//          *  ========================= */
//         if (quoteType === "packing") {
//           const mpnName = (row["MPN Name"] ?? "").toString().trim();
//           const descriptionIn = (row["Description"] ?? row.Description ?? "").toString().trim();
//           const uomCode = (row["UOM"] ?? row.UOM ?? "").toString().trim();

//           const quantity = toNum(row["Quantity"]);
//           const unitPrice = toNum(row["Unit Price"]);
//           const sgaPercent = toNum(row["SGA %"]);
//           const matBurden = toNum(row["Max Burden %"]);
//           const freightPercent = toNum(row["Freight %"]);

//           if (!mpnName) {
//             errors.push({
//               row: rowNumber,
//               type: "packing",
//               field: "MPN Name",
//               value: mpnName,
//               message: "MPN Name is required",
//             });
//             continue;
//           }
//           if (!uomCode) {
//             errors.push({
//               row: rowNumber,
//               type: "packing",
//               field: "UOM",
//               value: uomCode,
//               message: "UOM is required",
//             });
//             continue;
//           }
//           if (!(quantity > 0)) {
//             errors.push({
//               row: rowNumber,
//               type: "packing",
//               field: "Quantity",
//               value: row["Quantity"],
//               message: "Quantity must be > 0",
//             });
//             continue;
//           }

//           const mpn = await MPN.findOne({ MPN: mpnName }).select("_id Description Manufacturer").lean();
//           if (!mpn) {
//             errors.push({
//               row: rowNumber,
//               type: "packing",
//               field: "MPN Name",
//               value: mpnName,
//               message: `MPN not found: ${mpnName}`,
//             });
//             continue;
//           }

//           const uomDoc = await UOM.findOne({ code: uomCode }).select("_id code").lean();
//           if (!uomDoc) {
//             errors.push({
//               row: rowNumber,
//               type: "packing",
//               field: "UOM",
//               value: uomCode,
//               message: `UOM not found: ${uomCode}`,
//             });
//             continue;
//           }

//           const extPrice = round2(quantity * unitPrice);
//           const upliftPct = (sgaPercent + matBurden + freightPercent) / 100;
//           const salesPrice = round2(extPrice * (1 + upliftPct));

//           newItem = {
//             drawingId,
//             quoteType, // packing
//             itemNumber: String(nextItemNumber).padStart(4, "0"),

//             mpn: mpn._id,
//             description: descriptionIn || (mpn.Description ?? ""),
//             manufacturer: mpn.Manufacturer ?? "",
//             uom: uomDoc._id,

//             quantity,
//             unitPrice,
//             sgaPercent,
//             matBurden,
//             freightPercent,

//             extPrice,
//             salesPrice,

//             moq: 0,
//             tolerance: 0,
//             actualQty: quantity,
//             lastEditedBy: req.user?._id || null,
//           };
//         }

//         /** =========================
//          *  MANHOUR
//          *  Columns expected: Skill Level | Remarks | Quantity
//          *  ========================= */
//         else if (quoteType === "manhour") {
//           const skillName = (row["Skill Level"] ?? "").toString().trim();
//           const remarks = (row["Remarks"] ?? "").toString().trim();
//           const quantity = toNum(row["Quantity"]);

//           if (!skillName) {
//             // empty row → skip silently
//             continue;
//           }
//           if (!(quantity > 0)) {
//             errors.push({
//               row: rowNumber,
//               type: "manhour",
//               field: "Quantity",
//               value: row["Quantity"],
//               message: "Quantity must be > 0",
//             });
//             continue;
//           }

//           const skillLevel = await SkillLevelCosting.findOne({ skillLevelName: skillName }).populate("type");
//           if (!skillLevel) {
//             errors.push({
//               row: rowNumber,
//               type: "manhour",
//               field: "Skill Level",
//               value: skillName,
//               message: `Skill Level not found: ${skillName}`,
//             });
//             continue;
//           }

//           const unitPrice = toNum(skillLevel.unitPrice ?? skillLevel.rate);
//           const extPrice = round2(unitPrice * quantity);
//           const salesPrice = extPrice; // same for manhour

//           newItem = {
//             drawingId,
//             quoteType, // manhour
//             itemNumber: String(nextItemNumber).padStart(4, "0"),

//             description: skillLevel.skillLevelName,
//             uom: skillLevel.type?._id || null,
//             skillLevel: skillLevel._id,

//             quantity,
//             remarks,

//             unitPrice,
//             salesPrice,
//             extPrice,

//             lastEditedBy: req.user?._id || null,
//           };
//         }

//         /** =========================
//          *  MATERIAL
//          *  Columns expected: ChildPart/Part Number | UOM | Child Qty | Tolerance | SGA % | Mat Burden % | Freight Cost % | Fixed Freight Cost
//          *  ========================= */
//         else if (quoteType === "material") {
//           const childKey = row.ChildPart || row["Part Number"];
//           if (!childKey) {
//             errors.push({
//               row: rowNumber,
//               type: "material",
//               field: "ChildPart / Part Number",
//               value: childKey,
//               message: "ChildPart / Part Number is required",
//             });
//             continue;
//           }

//           const childPart = await Child.findOne({ ChildPartNo: childKey }).populate("mpn");
//           if (!childPart || !childPart.mpn) {
//             errors.push({
//               row: rowNumber,
//               type: "material",
//               field: "ChildPart / Part Number",
//               value: childKey,
//               message: `MPN not found for ChildPart: ${childKey}`,
//             });
//             continue;
//           }

//           const uomRaw = row["UOM"];
//           const uomId = await getUomId(uomRaw);
//           if (!uomId) {
//             errors.push({
//               row: rowNumber,
//               type: "material",
//               field: "UOM",
//               value: uomRaw,
//               message: `UOM not found: ${uomRaw}`,
//             });
//             continue;
//           }

//           const quantity = toNum(row["Qty"]);
//           if (!(quantity > 0)) {
//             errors.push({
//               row: rowNumber,
//               type: "material",
//               field: "Qty",
//               value: row["Qty"],
//               message: "Qty must be > 0",
//             });
//             continue;
//           }

//           const unitPrice = toNum(childPart?.mpn?.RFQUnitPrice);
//           const tolerance = toNum(row["Tolerance"]);

//           const sgaPercent = toNum(row["SGA %"]);
//           const matBurden = toNum(row["Mat Burden %"]);
//           const freightPercent = toNum(row["Freight Cost %"]);
//           const fixedFreightCost = toNum(row["Fixed Freight Cost"]);

//           const actualQty = round2(quantity + (quantity * tolerance) / 100);
//           const extPrice = round2(quantity * unitPrice);
//           const salesPrice = round2(
//             extPrice * (1 + (sgaPercent + matBurden + freightPercent) / 100) + fixedFreightCost
//           );

//           newItem = {
//             drawingId,
//             quoteType, // material
//             itemNumber: String(nextItemNumber).padStart(4, "0"),
//             childPart: childPart?._id,
//             mpn: childPart?.mpn?._id,
//             description: S(childPart?.mpn?.Description).trim(),
//             manufacturer: childPart?.mpn?.Manufacturer || "",
//             uom: uomId,
//             moq: toNum(childPart?.mpn?.MOQ),
//             leadTime: toNum(childPart?.mpn?.LeadTime_WK),
//             rfqDate: childPart?.mpn?.RFQDate,
//             supplier: childPart?.mpn?.Supplier,
//             unitPrice,

//             quantity,
//             tolerance,
//             actualQty,
//             sgaPercent,
//             matBurden,
//             freightPercent,
//             fixedFreightCost,

//             extPrice,
//             salesPrice,

//             lastEditedBy: req.user?._id || "System",
//           };
//         }
//       } catch (rowErr) {
//         // koi unexpected error hua is row ke liye – usko bhi capture kar lo
//         errors.push({
//           row: rowNumber,
//           type: quoteType,
//           field: "row",
//           value: row,
//           message: rowErr.message || "Unexpected error while processing row",
//         });
//         continue;
//       }

//       if (newItem) {
//         newItems.push(newItem);
//         nextItemNumber++;
//       }
//     }

//     // 4) Agar errors hai to import fail karo, insert mat karo
//    if (errors.length > 0) {
//   // Create detailed error messages
//   const errorMessages = errors.map(error => 
//     `Row ${error.row}: ${error.message}`
//   ).join(', ');

//   return res.status(400).json({
//     success: false,
//     message: `Import failed due to validation errors: ${errorMessages}`,
//     errorCount: errors.length,
//     errors, // detailed errors array for frontend
//   });
// }

//     // 5) bulk insert (only if no errors)
//     if (newItems.length > 0) {
//       await CostingItems.insertMany(newItems);
//     }

//     /** =========================
//      *  RECOMPUTE TOTALS + MARKUPS
//      *  ========================= */
//     const oid = new mongoose.Types.ObjectId(drawingId);
//     const grouped = await CostingItems.aggregate([
//       { $match: { drawingId: oid } },
//       {
//         $group: {
//           _id: "$quoteType",
//           bucketTotal: { $sum: { $toDouble: "$salesPrice" } },
//         },
//       },
//     ]);

//     let materialTotal = 0;
//     let manhourTotal = 0;
//     let packingTotal = 0;

//     for (const g of grouped) {
//       const t = toNum(g.bucketTotal);
//       switch ((g._id || "").toLowerCase()) {
//         case "material": materialTotal = t; break;
//         case "manhour":  manhourTotal  = t; break;
//         case "packing":  packingTotal  = t; break;
//         default: break;
//       }
//     }

//     const materialMarkup = toNum(drawing.materialMarkup);
//     const manhourMarkup = toNum(drawing.manhourMarkup);
//     const packingMarkup = toNum(drawing.packingMarkup);

//     const materialWithMarkup = round2(materialTotal + (materialTotal * materialMarkup) / 100);
//     const manhourWithMarkup  = round2(manhourTotal  + (manhourTotal  * manhourMarkup)  / 100);
//     const packingWithMarkup  = round2(packingTotal  + (packingTotal  * packingMarkup)  / 100);

//     const totalPriceRaw        = round2(materialTotal + manhourTotal + packingTotal);
//     const totalPriceWithMarkup = round2(materialWithMarkup + manhourWithMarkup + packingWithMarkup);

//     // Lead time bump (optional): max(existing, any imported’s)
//     const existingLTW = toNum(drawing.leadTimeWeeks);
//     const importedMaxLTW = Math.max(0, ...newItems.map(x => toNum(x.leadTime ?? x.leadTimeWeeks)));
//     const finalLTW = Math.max(existingLTW, importedMaxLTW);

//     // 6) persist on drawing
//     drawing.materialTotal        = round2(materialTotal);
//     drawing.manhourTotal         = round2(manhourTotal);
//     drawing.packingTotal         = round2(packingTotal);
//     drawing.totalPrice           = totalPriceRaw;
//     drawing.totalPriceWithMarkup = totalPriceWithMarkup;
//     drawing.leadTimeWeeks        = finalLTW;
//     drawing.lastEditedBy         = req?.user?._id || drawing.lastEditedBy;

//     await drawing.save();

//     // 7) done
//     return res.json({
//       success: true,
//       message: `✅ ${quoteType} import successful`,
//       count: newItems.length,
//       totals: {
//         materialTotal: drawing.materialTotal,
//         manhourTotal : drawing.manhourTotal,
//         packingTotal : drawing.packingTotal,
//         materialWithMarkup,
//         manhourWithMarkup,
//         packingWithMarkup,
//         totalPrice: drawing.totalPrice,
//         totalPriceWithMarkup: drawing.totalPriceWithMarkup,
//         leadTimeWeeks: drawing.leadTimeWeeks,
//       },
//     });
//   } catch (error) {
//     console.error("❌ Import Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to import costing items",
//       error: error.message,
//     });
//   } finally {
//     if (filePath) {
//       try { await fs.unlink(filePath); } catch {}
//     }
//   }
// };


// export const importCostingItems = async (req, res) => {
//   let filePath = null;
//   try {
//     const { drawingId } = req.params;
//     const { quoteType } = req.body;
//     const file = req.file;

//     if (!file) return res.status(400).json({ success: false, message: "No file uploaded" });
//     filePath = file.path;

//     // 0) base validations
//     if (!mongoose.Types.ObjectId.isValid(drawingId)) {
//       return res.status(400).json({ success: false, message: "Invalid drawingId" });
//     }
//     const drawing = await Drawing.findById(drawingId);
//     if (!drawing) return res.status(404).json({ success: false, message: "Drawing not found" });

//     // 1) read Excel
//     const workbook = XLSX.readFile(filePath);
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const rows = XLSX.utils.sheet_to_json(sheet);

//     // 2) last itemNumber seed
//     const lastItem = await CostingItems.findOne({ drawingId, quoteType }).sort({ itemNumber: -1 }).lean();
//     let nextItemNumber = lastItem ? Number(lastItem.itemNumber) + 1 : 1;

//     const newItems = [];

//     // 3) row loop
//     for (const row of rows) {
//       let newItem = null;

//       /** =========================
//        *  PACKING
//        *  Columns expected: MPN Name | Description | UOM | Quantity | Unit Price | SGA % | Max Burden % | Freight %
//        *  ========================= */
//       if (quoteType === "packing") {
//         const mpnName = (row["MPN Name"] ?? "").toString().trim();
//         const descriptionIn = (row["Description"] ?? row.Description ?? "").toString().trim();
//         const uomCode = (row["UOM"] ?? row.UOM ?? "").toString().trim();

//         const quantity = toNum(row["Quantity"]);
//         const unitPrice = toNum(row["Unit Price"]);
//         const sgaPercent = toNum(row["SGA %"]);
//         const matBurden = toNum(row["Max Burden %"]);
//         const freightPercent = toNum(row["Freight %"]);

//         if (!mpnName) throw new Error("MPN Name is required");
//         if (!uomCode) throw new Error("UOM is required");
//         if (!(quantity > 0)) throw new Error("Quantity must be > 0");

//         const mpn = await MPN.findOne({ MPN: mpnName }).select("_id Description Manufacturer").lean();
//         if (!mpn) throw new Error(`MPN not found: ${mpnName}`);

//         const uomDoc = await UOM.findOne({ code: uomCode }).select("_id code").lean();
//         if (!uomDoc) throw new Error(`UOM not found: ${uomCode}`);

//         const extPrice = round2(quantity * unitPrice);
//         const upliftPct = (sgaPercent + matBurden + freightPercent) / 100;
//         const salesPrice = round2(extPrice * (1 + upliftPct));

//         newItem = {
//           drawingId,
//           quoteType, // packing
//           itemNumber: String(nextItemNumber).padStart(4, "0"),

//           mpn: mpn._id,
//           description: descriptionIn || (mpn.Description ?? ""),
//           manufacturer: mpn.Manufacturer ?? "",
//           uom: uomDoc._id,

//           quantity,
//           unitPrice,
//           sgaPercent,
//           matBurden,
//           freightPercent,

//           extPrice,
//           salesPrice,

//           moq: 0,
//           tolerance: 0,
//           actualQty: quantity,
//           lastEditedBy: req.user?._id || null,
//         };
//       }

//       /** =========================
//        *  MANHOUR
//        *  Columns expected: Skill Level | Remarks | Quantity
//        *  ========================= */
//       else if (quoteType === "manhour") {
//         const skillName = (row["Skill Level"] ?? "").toString().trim();
//         const remarks = (row["Remarks"] ?? "").toString().trim();
//         const quantity = toNum(row["Quantity"]);

//         if (!skillName || !(quantity > 0)) continue;

//         const skillLevel = await SkillLevelCosting.findOne({ skillLevelName: skillName }).populate("type");
//         if (!skillLevel) throw new Error(`Skill Level not found: ${skillName}`);

//         const unitPrice = toNum(skillLevel.unitPrice ?? skillLevel.rate);
//         const extPrice = round2(unitPrice * quantity);
//         const salesPrice = extPrice; // same for manhour

//         newItem = {
//           drawingId,
//           quoteType, // manhour
//           itemNumber: String(nextItemNumber).padStart(4, "0"),

//           description: skillLevel.skillLevelName,
//           uom: skillLevel.type?._id || null,
//           skillLevel: skillLevel._id,

//           quantity,
//           remarks,

//           unitPrice,
//           salesPrice,
//           extPrice,

//           lastEditedBy: req.user?._id || null,
//         };
//       }

//       /** =========================
//        *  MATERIAL
//        *  Columns expected: ChildPart/Part Number | UOM | Child Qty | Tolerance | SGA % | Mat Burden % | Freight Cost % | Fixed Freight Cost
//        *  ========================= */
//       else if (quoteType === "material") {
//         const childKey = row.ChildPart || row["Part Number"];
//         const childPart = await Child.findOne({ ChildPartNo: childKey }).populate("mpn");
//         if (!childPart || !childPart.mpn) throw new Error(`MPN not found for ChildPart: ${childKey}`);

//         const uomId = await getUomId(row["UOM"]);
//         const quantity = toNum(row["Qty"]);
//         const unitPrice = toNum(childPart?.mpn?.RFQUnitPrice);
//         const tolerance = toNum(row["Tolerance"]);

//         const sgaPercent = toNum(row["SGA %"]);
//         const matBurden = toNum(row["Mat Burden %"]);
//         const freightPercent = toNum(row["Freight Cost %"]);
//         const fixedFreightCost = toNum(row["Fixed Freight Cost"]);

//         const actualQty = round2(quantity + (quantity * tolerance) / 100);
//         const extPrice = round2(quantity * unitPrice);
//         const salesPrice = round2(
//           extPrice * (1 + (sgaPercent + matBurden + freightPercent) / 100) + fixedFreightCost
//         );

//         newItem = {
//           drawingId,
//           quoteType, // material
//           itemNumber: String(nextItemNumber).padStart(4, "0"),
//           childPart: childPart?._id,
//           mpn: childPart?.mpn?._id,
//           description: S(childPart?.mpn?.Description).trim(),
//           manufacturer: childPart?.mpn?.Manufacturer || "",
//           uom: uomId,
//           moq: toNum(childPart?.mpn?.MOQ),
//           leadTime: toNum(childPart?.mpn?.LeadTime_WK),
//           rfqDate: childPart?.mpn?.RFQDate,
//           supplier: childPart?.mpn?.Supplier,
//           unitPrice,

//           quantity,
//           tolerance,
//           actualQty,
//           sgaPercent,
//           matBurden,
//           freightPercent,
//           fixedFreightCost,

//           extPrice,
//           salesPrice,

//           lastEditedBy: req.user?._id || "System",
//         };
//       }

//       if (newItem) {
//         newItems.push(newItem);
//         nextItemNumber++;
//       }
//     }

//     // 4) bulk insert
//     if (newItems.length > 0) {
//       await CostingItems.insertMany(newItems);
//     }

//     /** =========================
//      *  RECOMPUTE TOTALS + MARKUPS
//      *  ========================= */
//     const oid = new mongoose.Types.ObjectId(drawingId);
//     const grouped = await CostingItems.aggregate([
//       { $match: { drawingId: oid } },
//       {
//         $group: {
//           _id: "$quoteType",
//           // 👉 If extPrice is canonical, switch to { $sum: { $toDouble: "$extPrice" } }
//           bucketTotal: { $sum: { $toDouble: "$salesPrice" } },
//         },
//       },
//     ]);

//     let materialTotal = 0;
//     let manhourTotal = 0;
//     let packingTotal = 0;

//     for (const g of grouped) {
//       const t = toNum(g.bucketTotal);
//       switch ((g._id || "").toLowerCase()) {
//         case "material": materialTotal = t; break;
//         case "manhour":  manhourTotal  = t; break;
//         case "packing":  packingTotal  = t; break;
//         default: break;
//       }
//     }

//     const materialMarkup = toNum(drawing.materialMarkup);
//     const manhourMarkup = toNum(drawing.manhourMarkup);
//     const packingMarkup = toNum(drawing.packingMarkup);

//     const materialWithMarkup = round2(materialTotal + (materialTotal * materialMarkup) / 100);
//     const manhourWithMarkup  = round2(manhourTotal  + (manhourTotal  * manhourMarkup)  / 100);
//     const packingWithMarkup  = round2(packingTotal  + (packingTotal  * packingMarkup)  / 100);

//     const totalPriceRaw        = round2(materialTotal + manhourTotal + packingTotal);
//     const totalPriceWithMarkup = round2(materialWithMarkup + manhourWithMarkup + packingWithMarkup);

//     // Lead time bump (optional): max(existing, any imported’s)
//     const existingLTW = toNum(drawing.leadTimeWeeks);
//     const importedMaxLTW = Math.max(0, ...newItems.map(x => toNum(x.leadTime ?? x.leadTimeWeeks)));
//     const finalLTW = Math.max(existingLTW, importedMaxLTW);

//     // 5) persist on drawing
//     drawing.materialTotal        = round2(materialTotal);
//     drawing.manhourTotal         = round2(manhourTotal);
//     drawing.packingTotal         = round2(packingTotal);
//     drawing.totalPrice           = totalPriceRaw;
//     drawing.totalPriceWithMarkup = totalPriceWithMarkup;
//     drawing.leadTimeWeeks        = finalLTW;
//     drawing.lastEditedBy         = req?.user?._id || drawing.lastEditedBy;

//     await drawing.save();

//     // 6) done
//     return res.json({
//       success: true,
//       message: `✅ ${quoteType} import successful`,
//       count: newItems.length,
//       totals: {
//         materialTotal: drawing.materialTotal,
//         manhourTotal : drawing.manhourTotal,
//         packingTotal : drawing.packingTotal,
//         materialWithMarkup,
//         manhourWithMarkup,
//         packingWithMarkup,
//         totalPrice: drawing.totalPrice,
//         totalPriceWithMarkup: drawing.totalPriceWithMarkup,
//         leadTimeWeeks: drawing.leadTimeWeeks,
//       },
//     });
//   } catch (error) {
//     console.error("❌ Import Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to import costing items",
//       error: error.message,
//     });
//   } finally {
//     // best-effort cleanup of temp file
//     if (filePath) {
//       try { await fs.unlink(filePath); } catch {}
//     }
//   }
// };


const pick = (row, ...keys) => {
  for (const k of keys) {
    if (k in row && row[k] !== undefined) return row[k];
  }
  return "";
};




//-----------------import drawings

// export const importDrawings = async (req, res) => {
//   try {
//     if (!req.file?.path) {
//       return res.status(400).json({ success: false, message: "No file uploaded" });
//     }

//     const incomingQuoteType = toStr(req.body?.quoteType); // "other" | "cable_harness" | ...
//     if (!incomingQuoteType) {
//       return res.status(400).json({ success: false, message: "quoteType is required" });
//     }

//     const name = (req.file.originalname || "").toLowerCase();
//     if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
//       return res.status(400).json({ success: false, message: "Only .xlsx / .xls files are supported" });
//     }

//     let workbook;
//     try {
//       workbook = XLSX.readFile(req.file.path);
//     } catch (e) {
//       return res.status(400).json({ success: false, message: "Invalid Excel file", error: e.message });
//     }

//     if (!workbook.SheetNames?.length) {
//       return res.status(400).json({ success: false, message: "Excel has no sheets" });
//     }

//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     if (!sheet) {
//       return res.status(400).json({ success: false, message: "First sheet is missing" });
//     }

//     const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
//     if (!Array.isArray(rows) || rows.length === 0) {
//       return res.status(400).json({ success: false, message: "Sheet is empty" });
//     }

//     const results = { drawingsAdded: [], itemsAdded: 0, manhourAdded: 0, errors: [] };

//     // 🔹 Load latest/active master markups ONCE
//     const master = await MarkupParameter
//       .findOne({})
//       .sort({ updatedAt: -1 })
//       .select("materialsMarkup manhourMarkup packingMarkup")
//       .lean();

//     const masterMaterial = clampPct(master?.materialsMarkup, 0);
//     const masterManhour = clampPct(master?.manhourMarkup, 0);
//     const masterPacking = clampPct(master?.packingMarkup, 0);

//     // === Accept both 'other' and 'cable_harness' with SAME column schema ===
//     if (["other", "cable_harness"].includes(incomingQuoteType)) {
//       /**
//        * Columns expected:
//        * Drawing no | Description | Qty |
//        * Child Part | Description | MPN | Manufacturer | UOM | Qty | Tol-% | SGA-% | Mat Burden-% | Freight cost-% | Fixed Freight cost |
//        * Labour Skill Level | Labour Description | Labour UOM | (optional Labour Qty)
//        */

//       // 1) Group rows by Drawing no
//       const groups = new Map();
//       for (let i = 0; i < rows.length; i++) {
//         const r = rows[i];
//         const drawingNo = toStr(
//           pick(r, "Drawing no", "Drawing No", "drawingNo", "Drawing", "Drawing_no")
//         );
//         if (!drawingNo) {
//           results.errors.push({ row: i + 2, error: "Drawing no is required" });
//           continue;
//         }
//         if (!groups.has(drawingNo)) groups.set(drawingNo, []);
//         groups.get(drawingNo).push({ r, rowIndex: i + 2 });
//       }

//       // 2) Process each drawing group
//       for (const [drawingNo, list] of groups.entries()) {
//         const head = list[0]?.r || {};
//         const drawingDesc = toStr(pick(head, "Description", "drawingDescription"));
//         const drawingQty = toNum(pick(head, "Qty", "Quantity", "qty"), 1);

//         // Optional project/customer/currency wiring
//         let projectId = null, customerId = null, currency = null;

//         // Prevent duplicate drawing
//         const exists = await Drawing.findOne({ drawingNo }).lean();
//         if (exists) {
//           results.errors.push({ drawingNo, error: "Duplicate drawing number (already exists)" });
//           continue;
//         }

//         // Create the drawing (store the incoming quoteType)
//         const drawingDoc = await Drawing.create({
//           drawingNo,
//           description: drawingDesc,
//           qty: drawingQty || 1,
//           projectId,
//           customerId,
//           currency,
//           unitPrice: 0,
//           totalPrice: 0,
//           quoteType: incomingQuoteType,   // 👈 'other' or 'cable_harness'
//           quoteStatus: "active",
//           materialMarkup: masterMaterial,
//           manhourMarkup: masterManhour,
//           packingMarkup: masterPacking,
//           lastEditedBy: req.user?._id || null,
//         });

//         results.drawingsAdded.push({ id: drawingDoc._id, drawingNo });

//         // Continue item numbers from last existing, else start 0001
//         const lastItem = await CostingItems
//           .findOne({ drawingId: drawingDoc._id })
//           .sort({ itemNumber: -1 })
//           .select("itemNumber")
//           .lean();
//         let nextItemNumber = lastItem ? Number(lastItem.itemNumber) + 1 : 1;

//         const materialItems = [];
//         const manhourItems = [];

//         for (const { r, rowIndex } of list) {
//           // --- Material columns ---
//           const childParts = toStr(pick(r, "Child Part", "ChildPart", "childPart"));
//           const childDesc = toStr(pick(r, "Description", "Child Description", "Part Description"));
//           const mpn = toStr(pick(r, "MPN", "mpn"));
//           const manufacturer = toStr(pick(r, "Manufacturer", "manufacturer"));
//           const uomCell = toStr(pick(r, "UOM", "uom"));
//           const mQty = toNum(pick(r, "Qty", "Quantity", "qty"), 0);

//           const tolPct = toNum(pick(r, "Tol-%", "Tolerance %", "tolPct"), 0);
//           const sgaPct = toNum(pick(r, "SGA-%", "SGA %", "sgaPct"), 0);
//           const matBurdenPct = toNum(pick(r, "Mat Burden-% (9)", "Mat Burden-%", "Mat Burden %"), 0);
//           const freightPct = toNum(pick(r, "Freight cost-% (10)", "Freight cost-%", "Freight Cost %"), 0);
//           const fixedFreight = toNum(pick(r, "Fixed Freight cost", "Fixed Freight", "Fixed Freight Cost"), 0);

//           // Only create a material line if we have some identity + quantity
//           const hasMaterialLine = (childParts || mpn || childDesc) && mQty > 0;
//           if (hasMaterialLine) {
//             const uomId = await getUomId(uomCell, results.errors, { rowIndex, drawingNo }); // 👈 RESOLVE via UOM model
//             const childPart = await Child.findOne({ ChildPartNo: childParts }).populate("mpn");


//             const quantity = Number(mQty || 0);
//             const unitPrice = Number(childPart?.mpn?.RFQUnitPrice || 0);
//             const tolerance = Number(tolPct || 0);

//             const sgaPercent = Number(sgaPct || 0);
//             const matBurden = Number(matBurdenPct || 0);
//             const freightPercent = Number(freightPct || 0);
//             const fixedFreightCost = Number(fixedFreight || 0);

//             const actualQty = quantity + (quantity * tolerance) / 100;
//             const extPrice = quantity * unitPrice;

//             const salesPrice = extPrice * (1 + (sgaPercent + matBurden + freightPercent) / 100) + fixedFreightCost;
//             const item = {
//               drawingId: drawingDoc._id,
//               quoteType: 'material',                  // 👈 keep items under the same drawing quoteType
//               itemNumber: String(nextItemNumber).padStart(4, "0"),

//               // From Excel (direct, no external MPN/manufacturer lookup)

//               mpn: childPart?.mpn?._id,
//               description: (childPart?.mpn?.Description ?? "").toString().trim(),
//               manufacturer: childPart?.mpn?.Manufacturer || "",
//               // uom: childPart?.mpn?.UOM,
//               moq: Number(childPart?.mpn?.MOQ || 0),
//               leadTime: Number(childPart?.mpn?.LeadTime_WK || 0),
//               rfqDate: childPart?.mpn?.RFQDate,
//               supplier: childPart?.mpn?.Supplier,

//               // childPartNo: childPart,
//               // description: childDesc,
//               // mpnName: mpn,
//               // manufacturer: manufacturer,
//               uom: uomId,                             // 👈 store UOM ObjectId
//               // uomText: uomCell || null,                   // optional: keep source text for audit

//               quantity,
//               tolerance,
//               sgaPercent,
//               matBurden,
//               freightPercent,
//               fixedFreightCost,

//               // prices 0 (no lookups here)
//               unitPrice,
//               extPrice: Number(extPrice.toFixed(2)),
//               salesPrice: Number(salesPrice.toFixed(2)),

//               lastEditedBy: req.user?._id || null,
//             };

//             materialItems.push(item);
//             nextItemNumber++;
//           }

//           // --- Labour columns → manhour items ---
//           const labourSkill = toStr(pick(r, "Labour Skill Level", "Skill Level", "Labour Level"));
//           const labourDesc = toStr(pick(r, "Labour Description", "Labour Remarks", "Remarks"));
//           const labourUomTx = toStr(pick(r, "Labour UOM", "UOM (Labour)", "LabourUOM"));
//           const quantity = toNum(pick(r, "Labour Qty", "Qty (Labour)", "Labour Quantity", "Quantity"), 0);

//           const hasLabour = (labourSkill || labourDesc || labourUomTx) && quantity > 0;
//           if (hasLabour) {
//             const labourUomId = await getUomId(labourUomTx, results.errors, { rowIndex, drawingNo }); // 👈 resolve UOM

//             const skillLevel = await SkillLevelCosting
//               .findOne({ skillLevelName: labourSkill })
//               .populate('type'); // agar uom ref hai to id mil jayegi

//             const unitPrice = Number(
//               skillLevel.unitPrice ??        // prefer unitPrice if present
//               skillLevel.rate ?? 0      // fallback to rate
//             );

//             const salesPrice = unitPrice * quantity;
//             const extPrice = salesPrice;
//             const man = {
//               drawingId: drawingDoc._id,
//               quoteType: "manhour",                           // 👈 labour always stored as manhour type
//               itemNumber: String(nextItemNumber).padStart(4, "0"),

//               description: labourDesc || labourSkill,
//               skillLevel: skillLevel?._id,
//               uom: labourUomId,                    // 👈 UOM ObjectId
//               // uomText: labourUomTx || null,            // optional preserve text
//               quantity,

//               unitPrice,                                 // 👈 skill level rate
//               salesPrice: Number(salesPrice.toFixed(2)),
//               extPrice: Number(extPrice.toFixed(2)),

//               lastEditedBy: req.user?._id || null,
//             };
//             manhourItems.push(man);
//             nextItemNumber++;
//           }
//         }

//         if (materialItems.length) {
//           await CostingItems.insertMany(materialItems);
//           results.itemsAdded += materialItems.length;
//         }
//         if (manhourItems.length) {
//           await CostingItems.insertMany(manhourItems);
//           results.manhourAdded += manhourItems.length;
//         }
//       }

//       return res.status(200).json({
//         success: true,
//         message: `Import complete — Drawings: ${results.drawingsAdded.length}, ${incomingQuoteType} lines: ${results.itemsAdded}, Manhour lines: ${results.manhourAdded}, Errors: ${results.errors.length}`,
//         data: results,
//       });
//     }

//     // Fallback for any other quoteType
//     return res.status(400).json({
//       success: false,
//       message: `Unsupported quoteType "${incomingQuoteType}" in this endpoint. Use "other" or "cable_harness".`,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Error importing drawings",
//       error: error.message,
//     });
//   } finally {
//     try { if (req.file?.path) fs.unlinkSync(req.file.path); } catch { }
//   }
// };

const getNextItemNumberForType = async (drawingId, quoteType) => {
  // itemNumber is fixed 4-digit string → lexicographic sort works
  const last = await CostingItems
    .findOne({ drawingId, quoteType })
    .sort({ itemNumber: -1 }) // e.g., "0099" > "0008"
    .select("itemNumber")
    .lean();

  const lastNum = last ? parseInt(String(last.itemNumber || "0000"), 10) : 0;
  const next = (isFinite(lastNum) ? lastNum : 0) + 1;

  if (next > 9999) {
    throw new Error(`Item number overflow for ${quoteType} on drawing ${drawingId} (max 9999).`);
  }
  return next; // return as integer; caller will pad to 4 digits
};

const fmtNo4 = (n) => String(n).padStart(4, "0");


// ✅ IMPORTANT: This version adds GLOBAL currency conversion support
// - Converts MPN RFQUnitPrice (usually USD) -> drawing currency (project currency)
// - Adds sourceCurrency/sourceUnitPrice/currency fields in costing items
// - Keeps existing logic intact otherwise
//
// ✅ You must have these helpers already (as in your code):
// toStr, toNum, pick, round2, clampPct, fmtNo4, getUomId, getNextItemNumberForType
//
// ✅ Add this global converter util somewhere common and import it:
// import { convertCurrency } from "../utils/currency.js";

// export const importDrawings = async (req, res) => {
//   let filePath = null;

//   // ---------------- Currency Helpers ----------------
//   const normCur = (c) => (c || "").toString().trim().toUpperCase();

//   const roundTo = (num, decimals = 2) => {
//     const p = Math.pow(10, decimals);
//     const n = Number(num || 0);
//     return Math.round((n + Number.EPSILON) * p) / p;
//   };

//   // ---------------- Main ----------------
//   try {
//     // 1) Basic file & input checks
//     if (!req.file?.path) {
//       return res.status(400).json({ success: false, message: "No file uploaded" });
//     }
//     filePath = req.file.path;

//     const incomingQuoteType = toStr(req.body?.quoteType);
//     if (!incomingQuoteType) {
//       try { fs.unlinkSync(filePath); } catch { }
//       return res.status(400).json({ success: false, message: "quoteType is required" });
//     }

//     const incomingProject = toStr(req.body?.project);
//     if (!incomingProject) {
//       try { fs.unlinkSync(filePath); } catch { }
//       return res.status(400).json({ success: false, message: "Project is required" });
//     }

//     const name = (req.file.originalname || "").toLowerCase();
//     if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
//       try { fs.unlinkSync(filePath); } catch { }
//       return res.status(400).json({ success: false, message: "Only .xlsx / .xls files are supported" });
//     }

//     // 2) Read Excel
//     let workbook;
//     try {
//       workbook = XLSX.readFile(filePath);
//     } catch (e) {
//       try { fs.unlinkSync(filePath); } catch { }
//       return res.status(400).json({ success: false, message: "Invalid Excel file", error: e.message });
//     }

//     if (!workbook.SheetNames?.length) {
//       try { fs.unlinkSync(filePath); } catch { }
//       return res.status(400).json({ success: false, message: "Excel has no sheets" });
//     }

//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     if (!sheet) {
//       try { fs.unlinkSync(filePath); } catch { }
//       return res.status(400).json({ success: false, message: "First sheet is missing" });
//     }

//     const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
//     if (!Array.isArray(rows) || rows.length === 0) {
//       try { fs.unlinkSync(filePath); } catch { }
//       return res.status(400).json({ success: false, message: "Sheet is empty" });
//     }

//     // 3) Load project (✅ populate currency) & markups
//     const projectData = await Project.findById(incomingProject)
//       .populate("currency", "code")   // ✅ currency = {_id, code}
//       .lean();

//     if (!projectData) {
//       try { fs.unlinkSync(filePath); } catch { }
//       return res.status(400).json({ success: false, message: "Project Data missing" });
//     }

//     // ✅ Currency settings
//     const settings = await SystemSettings.findOne({}).lean();
//     if (!settings?.currencySettings) {
//       try { fs.unlinkSync(filePath); } catch { }
//       return res.status(500).json({ success: false, message: "Currency settings missing in SystemSettings" });
//     }

//     // ✅ IMPORTANT:
//     // Drawing.currency must be ObjectId (Currency ref)
//     const projectCurrencyId = projectData?.currency?._id || null;
//     const projectCurrencyCode = normCur(projectData?.currency?.code) || "USD";
//     // console.log('------projectCurrencyCode', projectCurrencyCode)
//     if (!projectCurrencyId) {
//       try { fs.unlinkSync(filePath); } catch { }
//       return res.status(400).json({
//         success: false,
//         message: "Project currency is missing (currency reference not set on project)",
//       });
//     }

//     // Default source currency if excel doesn't provide
//     const defaultSourceCurrency = normCur(req.body?.sourceCurrency) || "USD";

//     const master = await MarkupParameter.findOne({})
//       .sort({ updatedAt: -1 })
//       .select("materialsMarkup manhourMarkup packingMarkup")
//       .lean();

//     const masterMaterial = clampPct(master?.materialsMarkup, 0);
//     const masterManhour = clampPct(master?.manhourMarkup, 0);
//     const masterPacking = clampPct(master?.packingMarkup, 0);

//     const results = { drawingsAdded: [], itemsAdded: 0, manhourAdded: 0, errors: [] };

//     // 4) Group rows by Drawing no
//     const groupRowsByDrawing = (rows) => {
//       const groups = new Map();
//       let current = null;

//       for (let i = 0; i < rows.length; i++) {
//         const r = rows[i];
//         const rowIndex = i + 2;

//         const drawingNo = toStr(pick(r, "Drawing no", "Drawing No", "drawingNo", "Drawing", "Drawing_no"));
//         if (drawingNo) {
//           current = drawingNo;
//           if (!groups.has(drawingNo)) groups.set(drawingNo, []);
//           groups.get(drawingNo).push({ r, rowIndex });
//         } else {
//           if (!current) {
//             results.errors.push({
//               drawingNo: null,
//               row: rowIndex,
//               type: "header",
//               field: "Drawing no",
//               value: "",
//               message: "Row found before any 'Drawing no' header",
//             });
//             continue;
//           }
//           groups.get(current).push({ r, rowIndex });
//         }
//       }
//       return groups;
//     };

//     const getDrawingHeadValues = (list) => {
//       const headEntry =
//         list.find(({ r }) => {
//           const hasDesc = toStr(pick(r, "Description", "drawingDescription"));
//           const hasQty = toStr(pick(r, "Qty", "Quantity", "qty"));
//           return hasDesc || hasQty;
//         }) || list[0];

//       const head = headEntry?.r || {};
//       const drawingDesc = toStr(pick(head, "Description", "drawingDescription"));
//       const drawingQty = toNum(pick(head, "Qty", "Quantity", "qty"), 1);
//       return { drawingDesc, drawingQty };
//     };

//     // 5) quoteType validation
//     if (!["other", "cable_harness"].includes(incomingQuoteType)) {
//       try { fs.unlinkSync(filePath); } catch { }
//       return res.status(400).json({
//         success: false,
//         message: `Unsupported quoteType "${incomingQuoteType}". Use "other" or "cable_harness".`,
//       });
//     }

//     const groups = groupRowsByDrawing(rows);

//     // 6) Process each drawing
//     for (const [drawingNo, list] of groups.entries()) {
//       const { drawingDesc, drawingQty } = getDrawingHeadValues(list);

//       const exists = await Drawing.findOne({ drawingNo }).lean();
//       if (exists) {
//         results.errors.push({
//           drawingNo,
//           row: null,
//           type: "drawing",
//           field: "drawingNo",
//           value: drawingNo,
//           message: "Duplicate drawing number (already exists)",
//         });
//         continue;
//       }

//       // ✅ Drawing currency: store ObjectId ref
//       const drawingCurrencyId = projectCurrencyId;
//       const drawingCurrencyCode = projectCurrencyCode;

//       const drawingDoc = await Drawing.create({
//         drawingNo,
//         description: drawingDesc,
//         qty: drawingQty || 1,
//         projectId: projectData?._id || null,
//         customerId: projectData?.customerId || null,

//         currency: drawingCurrencyId, // ✅ FIX: ObjectId save
//         unitPrice: 0,
//         totalPrice: 0,

//         quoteType: incomingQuoteType,
//         quoteStatus: "active",
//         materialMarkup: masterMaterial,
//         manhourMarkup: masterManhour,
//         packingMarkup: masterPacking,
//         lastEditedBy: req.user?._id || null,
//       });

//       let nextMatNo = await getNextItemNumberForType(drawingDoc._id, "material");
//       let nextManNo = await getNextItemNumberForType(drawingDoc._id, "manhour");

//       const materialItems = [];
//       const manhourItems = [];

//       for (const { r, rowIndex } of list) {
//         const anyVal =
//           toStr(pick(r, "Child Part", "ChildPart", "childPart")) ||
//           toStr(pick(r, "MPN", "mpn")) ||
//           toStr(pick(r, "Description", "Child Description", "Part Description")) ||
//           toStr(pick(r, "UOM", "uom")) ||
//           toStr(pick(r, "Labour Skill Level", "Skill Level", "Labour Level")) ||
//           toStr(pick(r, "Labour Description", "Labour Remarks", "Remarks")) ||
//           toStr(pick(r, "Labour UOM", "UOM (Labour)", "LabourUOM")) ||
//           toStr(pick(r, "Labour Qty", "Qty (Labour)", "Labour Quantity", "Quantity"));
//         if (!anyVal) continue;

//         // ---------- MATERIAL ----------
//         const childParts = toStr(pick(r, "Child Part", "ChildPart", "childPart"));
//         if (childParts) {
//           let materialHasError = false;

//           // const childPart = await Child.findOne({ ChildPartNo: childParts }).populate({
//           //   path: "mpn",
//           //   populate: { path: "currency", select: "code" },
//           // });

//            const childPart = await Child.findOne({
//             ChildPartNo: childParts,
//           }).populate({
//             path: "mpn",
//             populate: [
//               { path: "currency", select: "code" },   // currency ka code
//               { path: "UOM", select: "code" },        // UOM ka code
//             ],
//           });

//           // console.log('------childPart', childPart)

//           if (!childPart) {
//             results.errors.push({ drawingNo, row: rowIndex, type: "material", field: "Child Part", value: childParts, message: `Child Part not found in system: ${childParts}` });
//             materialHasError = true;
//           } else if (!childPart.mpn) {
//             results.errors.push({ drawingNo, row: rowIndex, type: "material", field: "MPN", value: childParts, message: `No MPN linked to Child Part: ${childParts}` });
//             materialHasError = true;
//           }

//           const uomCell = toStr(pick(r, "UOM", "uom"));
//           if (!uomCell) {
//             results.errors.push({ drawingNo, row: rowIndex, type: "material", field: "UOM", value: "", message: "UOM is required for material line" });
//             materialHasError = true;
//           }

//           const uomId = uomCell ? await getUomId(uomCell) : null;
//           if (uomCell && !uomId) {
//             results.errors.push({ drawingNo, row: rowIndex, type: "material", field: "UOM", value: uomCell, message: `UOM not found: ${uomCell}` });
//             materialHasError = true;
//           }

//           const ChildQty = toNum(pick(r, "Child Qty", "child qty"), 0);
//           if (!(ChildQty > 0)) {
//             results.errors.push({ drawingNo, row: rowIndex, type: "material", field: "Child Qty", value: ChildQty, message: "Child Qty must be > 0" });
//             materialHasError = true;
//           }

//           const unitPriceRaw = toNum(childPart?.mpn?.RFQUnitPrice);

//           if (!materialHasError) {
//             const childDesc = toStr(pick(r, "Description", "Child Description", "Part Description"));
//             const manufacturer = toStr(pick(r, "Manufacturer", "manufacturer"));

//             const tolPct = toNum(pick(r, "Tol-%", "Tolerance %", "tolPct"), 0);
//             const sgaPct = toNum(pick(r, "SGA-%", "SGA %", "sgaPct"), 0);
//             const matBurdenPct = toNum(pick(r, "Mat Burden-% (9)", "Mat Burden-%", "Mat Burden %"), 0);
//             const freightPct = toNum(pick(r, "Freight cost-% (10)", "Freight cost-%", "Freight Cost %"), 0);
//             const fixedFreight = toNum(pick(r, "Fixed Freight cost", "Fixed Freight", "Fixed Freight Cost"), 0);


//              let qtyInMasterUom = toNum(ChildQty);
//             let drawingUomId = uomId;
//             let mpnMasterUomId = childPart?.mpn?.UOM
//             let newPrice;
//             try {
//                newPrice = await convertLengthUnitPrice(
//               unitPriceRaw,
//                childPart?.mpn?.UOM?.code,
//                uomCell,
//             );
//             } catch (convErr) {
//               results.errors.push({
//                 row: rowIndex,
//                 message: "UOM conversion failed",
//               });
//               continue;
//             }


//             // ✅ Source currency from excel column OR default USD
//             // const rowCurrency = normCur(pick(r, "Currency", "CUR", "Row Currency")) || defaultSourceCurrency;
//             const rowCurrency = childPart?.mpn?.currency?.code || "USD"
//             // ✅ Convert to drawing currency code
//            let unitPrice = unitPriceRaw;
//             try {
//               unitPrice =
//                 rowCurrency === drawingCurrencyCode
//                   ? roundTo(newPrice)
//                   : convertCurrency(newPrice, rowCurrency, drawingCurrencyCode, settings, 2);
//             } catch (ce) {
//               results.errors.push({
//                 drawingNo,
//                 row: rowIndex,
//                 type: "material",
//                 field: "Currency Conversion",
//                 value: `${rowCurrency} -> ${drawingCurrencyCode}`,
//                 message: ce.message || "Currency conversion failed",
//               });
//               materialHasError = true;
//             }

           

             



//             if (!materialHasError) {
//               const quantity = toNum(ChildQty);
//               const extPrice = round2(quantity * unitPrice);
//               const salesPrice = round2(extPrice * (1 + (sgaPct + matBurdenPct + freightPct) / 100) + fixedFreight);

//               materialItems.push({
//                 drawingId: drawingDoc._id,
//                 quoteType: "material",
//                 itemNumber: fmtNo4(nextMatNo),

//                 childPart: childPart?._id || null,
//                 mpn: childPart?.mpn?._id || null,
//                 description: toStr(childPart?.mpn?.Description) || childDesc || "",
//                 manufacturer: childPart?.mpn?.Manufacturer || manufacturer || "",
//                 uom: uomId,
//                 rfqDate: childPart?.mpn?.RFQDate,
//                 supplier: childPart?.mpn?.Supplier,
//                 leadTime: toNum(childPart?.mpn?.LeadTime_WK),

//                 quantity,
//                 tolerance: tolPct,
//                 sgaPercent: sgaPct,
//                 matBurden: matBurdenPct,
//                 freightPercent: freightPct,
//                 fixedFreightCost: fixedFreight,

//                 // ✅ keep codes for reporting
//                 currencyCode: drawingCurrencyCode,
//                 sourceCurrency: rowCurrency,
//                 sourceUnitPrice: round2(unitPriceRaw),

//                 unitPrice: round2(unitPrice),
//                 extPrice,
//                 salesPrice,

//                 lastEditedBy: req.user?._id || null,
//               });
//               nextMatNo++;
//             }
//           }
//         }

//         // ---------- MANHOUR ----------
//         const labourSkill = toStr(pick(r, "Labour Skill Level", "Skill Level", "Labour Level"));
//         const labourDesc = toStr(pick(r, "Labour Description", "Labour Remarks", "Remarks")) || labourSkill;
//         const labourUomTx = toStr(pick(r, "Labour UOM", "UOM (Labour)", "LabourUOM"));
//         const labourQty = toNum(pick(r, "Labour Qty", "Qty (Labour)", "Labour Quantity", "Quantity"), 0);

//         const hasLabour = (labourSkill || labourDesc || labourUomTx) && labourQty > 0;

//         if (hasLabour) {
//           let labourHasError = false;

//           if (!labourUomTx) {
//             results.errors.push({ drawingNo, row: rowIndex, type: "manhour", field: "Labour UOM", value: "", message: "Labour UOM is required" });
//             labourHasError = true;
//           }

//           const labourUomId = labourUomTx ? await getUomId(labourUomTx) : null;
//           if (labourUomTx && !labourUomId) {
//             results.errors.push({ drawingNo, row: rowIndex, type: "manhour", field: "Labour UOM", value: labourUomTx, message: `Labour UOM not found: ${labourUomTx}` });
//             labourHasError = true;
//           }

//           let skillLevel = null;
//           if (labourSkill) {
//             skillLevel = await SkillLevelCosting
//               .findOne({ skillLevelName: labourSkill })
//               .select("_id skillLevelName unitPrice rate type")
//               .populate("type")
//               .lean();

//             if (!skillLevel) {
//               results.errors.push({ drawingNo, row: rowIndex, type: "manhour", field: "Labour Skill Level", value: labourSkill, message: `Skill Level not found: ${labourSkill}` });
//               labourHasError = true;
//             }
//           }

//           if (!labourHasError) {
//             const unitRate = toNum(skillLevel?.unitPrice ?? skillLevel?.rate);
//             const extPrice = round2(unitRate * labourQty);
//             const salesPrice = extPrice;

//             manhourItems.push({
//               drawingId: drawingDoc._id,
//               quoteType: "manhour",
//               itemNumber: fmtNo4(nextManNo),

//               description: labourDesc,
//               uom: labourUomId,
//               quantity: labourQty,
//               skillLevel: skillLevel?._id || null,

//               currencyCode: drawingCurrencyCode,
//               unitPrice: unitRate,
//               extPrice,
//               salesPrice,

//               lastEditedBy: req.user?._id || null,
//             });
//             nextManNo++;
//           }
//         }
//       }

//       if (materialItems.length) {
//         await CostingItems.insertMany(materialItems);
//         results.itemsAdded += materialItems.length;
//       }
//       if (manhourItems.length) {
//         await CostingItems.insertMany(manhourItems);
//         results.manhourAdded += manhourItems.length;
//       }

//       // Totals recompute
//       {
//         const oid = new mongoose.Types.ObjectId(drawingDoc._id);
//         const grouped = await CostingItems.aggregate([
//           { $match: { drawingId: oid } },
//           { $group: { _id: "$quoteType", bucketTotal: { $sum: { $toDouble: "$salesPrice" } } } },
//         ]);

//         let materialTotal = 0, manhourTotal = 0, packingTotal = 0;

//         for (const g of grouped) {
//           const t = toNum(g.bucketTotal);
//           switch ((g._id || "").toLowerCase()) {
//             case "material": materialTotal = t; break;
//             case "manhour": manhourTotal = t; break;
//             case "packing": packingTotal = t; break;
//             default: break;
//           }
//         }

//         const materialMarkup = toNum(drawingDoc.materialMarkup);
//         const manhourMarkup = toNum(drawingDoc.manhourMarkup);
//         const packingMarkup = toNum(drawingDoc.packingMarkup);

//         const materialWithMarkup = round2(materialTotal + (materialTotal * materialMarkup) / 100);
//         const manhourWithMarkup = round2(manhourTotal + (manhourTotal * manhourMarkup) / 100);
//         const packingWithMarkup = round2(packingTotal + (packingTotal * packingMarkup) / 100);

//         const totalPriceRaw = round2(materialTotal + manhourTotal + packingTotal);
//         const totalPriceWithMarkup = round2(materialWithMarkup + manhourWithMarkup + packingWithMarkup);

//         const importedMaxLTW = Math.max(
//           toNum(drawingDoc.leadTimeWeeks),
//           ...materialItems.map((x) => toNum(x.leadTime)),
//           ...manhourItems.map((x) => toNum(x.leadTime))
//         );

//         drawingDoc.materialTotal = round2(materialTotal);
//         drawingDoc.manhourTotal = round2(manhourTotal);
//         drawingDoc.packingTotal = round2(packingTotal);
//         drawingDoc.totalPrice = totalPriceRaw;
//         drawingDoc.unitPrice = totalPriceRaw;
//         drawingDoc.totalPriceWithMarkup = totalPriceWithMarkup;
//         drawingDoc.leadTimeWeeks = importedMaxLTW;
//         drawingDoc.lastEditedBy = req?.user?._id || drawingDoc.lastEditedBy;

//         // ✅ IMPORTANT: keep ObjectId currency
//         drawingDoc.currency = drawingCurrencyId;

//         await drawingDoc.save();
//       }

//       results.drawingsAdded.push({
//         id: drawingDoc._id,
//         drawingNo,
//         rows: list.length,
//         materialItems: materialItems.length,
//         manhourItems: manhourItems.length,
//         currencyCode: projectCurrencyCode,
//       });
//     }

//     // cleanup
//     try { fs.unlinkSync(req.file.path); } catch { }

//     if (results.errors.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Import completed with issues",
//         data: results,
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: `Import complete — Drawings: ${results.drawingsAdded.length}, Material lines: ${results.itemsAdded}, Manhour lines: ${results.manhourAdded}`,
//       data: results,
//     });
//   } catch (error) {
//     try { if (req.file?.path) fs.unlinkSync(req.file.path); } catch { }
//     return res.status(500).json({
//       success: false,
//       message: "Error importing drawings",
//       error: error.message,
//     });
//   } finally {
//     if (filePath) {
//       try { await fs.promises.unlink(filePath); } catch { }
//     }
//   }
// };

export const importDrawings = async (req, res) => {
  let filePath = null;

  // ---------------- Currency Helpers ----------------
  const normCur = (c) => (c || "").toString().trim().toUpperCase();

  const roundTo = (num, decimals = 2) => {
    const p = Math.pow(10, decimals);
    const n = Number(num || 0);
    return Math.round((n + Number.EPSILON) * p) / p;
  };

  const round2 = (num) => roundTo(num, 2);

  // ---------------- Main ----------------
  try {
    // 1) Basic file & input checks
    if (!req.file?.path) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    filePath = req.file.path;

    const incomingQuoteType = toStr(req.body?.quoteType);
    if (!incomingQuoteType) {
      try { fs.unlinkSync(filePath); } catch { }
      return res.status(400).json({ success: false, message: "quoteType is required" });
    }

    const incomingProject = toStr(req.body?.project);
    if (!incomingProject) {
      try { fs.unlinkSync(filePath); } catch { }
      return res.status(400).json({ success: false, message: "Project is required" });
    }

    const name = (req.file.originalname || "").toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      try { fs.unlinkSync(filePath); } catch { }
      return res.status(400).json({ success: false, message: "Only .xlsx / .xls files are supported" });
    }

    // 2) Read Excel
    let workbook;
    try {
      workbook = XLSX.readFile(filePath);
    } catch (e) {
      try { fs.unlinkSync(filePath); } catch { }
      return res.status(400).json({ success: false, message: "Invalid Excel file", error: e.message });
    }

    if (!workbook.SheetNames?.length) {
      try { fs.unlinkSync(filePath); } catch { }
      return res.status(400).json({ success: false, message: "Excel has no sheets" });
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) {
      try { fs.unlinkSync(filePath); } catch { }
      return res.status(400).json({ success: false, message: "First sheet is missing" });
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (!Array.isArray(rows) || rows.length === 0) {
      try { fs.unlinkSync(filePath); } catch { }
      return res.status(400).json({ success: false, message: "Sheet is empty" });
    }

    // 3) Load project & currency
    const projectData = await Project.findById(incomingProject)
      .populate("currency", "code")
      .lean();

    if (!projectData) {
      try { fs.unlinkSync(filePath); } catch { }
      return res.status(400).json({ success: false, message: "Project Data missing" });
    }

    const settings = await SystemSettings.findOne({}).lean();
    if (!settings?.currencySettings) {
      try { fs.unlinkSync(filePath); } catch { }
      return res.status(500).json({ success: false, message: "Currency settings missing in SystemSettings" });
    }

    const projectCurrencyId = projectData?.currency?._id || null;
    const projectCurrencyCode = normCur(projectData?.currency?.code) || "USD";

    if (!projectCurrencyId) {
      try { fs.unlinkSync(filePath); } catch { }
      return res.status(400).json({
        success: false,
        message: "Project currency is missing (currency reference not set on project)",
      });
    }

    const defaultSourceCurrency = normCur(req.body?.sourceCurrency) || "USD";

    const master = await MarkupParameter.findOne({})
      .sort({ updatedAt: -1 })
      .select("materialsMarkup manhourMarkup packingMarkup")
      .lean();

    const masterMaterial = clampPct(master?.materialsMarkup, 0);
    const masterManhour = clampPct(master?.manhourMarkup, 0);
    const masterPacking = clampPct(master?.packingMarkup, 0);

    const results = { drawingsAdded: [], itemsAdded: 0, manhourAdded: 0, errors: [] };

    // 4) Group rows by Drawing no
    const groupRowsByDrawing = (rows) => {
      const groups = new Map();
      let current = null;

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const rowIndex = i + 2;

        const drawingNo = toStr(pick(r, "Drawing no", "Drawing No", "drawingNo", "Drawing", "Drawing_no"));
        if (drawingNo) {
          current = drawingNo;
          if (!groups.has(drawingNo)) groups.set(drawingNo, []);
          groups.get(drawingNo).push({ r, rowIndex });
        } else {
          if (!current) {
            results.errors.push({
              drawingNo: null,
              row: rowIndex,
              type: "header",
              field: "Drawing no",
              value: "",
              message: "Row found before any 'Drawing no' header",
            });
            continue;
          }
          groups.get(current).push({ r, rowIndex });
        }
      }
      return groups;
    };

    const getDrawingHeadValues = (list) => {
      const headEntry =
        list.find(({ r }) => {
          const hasDesc = toStr(pick(r, "Description", "drawingDescription"));
          const hasQty = toStr(pick(r, "Qty", "Quantity", "qty"));
          return hasDesc || hasQty;
        }) || list[0];

      const head = headEntry?.r || {};
      const drawingDesc = toStr(pick(head, "Description", "drawingDescription"));
      const drawingQty = toNum(pick(head, "Qty", "Quantity", "qty"), 1);
      return { drawingDesc, drawingQty };
    };

    // 5) quoteType validation
    if (!["other", "cable_harness"].includes(incomingQuoteType)) {
      try { fs.unlinkSync(filePath); } catch { }
      return res.status(400).json({
        success: false,
        message: `Unsupported quoteType "${incomingQuoteType}". Use "other" or "cable_harness".`,
      });
    }

    const groups = groupRowsByDrawing(rows);

    // 6) Process each drawing
    for (const [drawingNo, list] of groups.entries()) {
      const { drawingDesc, drawingQty } = getDrawingHeadValues(list);

      let drawingDoc = await Drawing.findOne({ drawingNo });
      let isNew = false;

      if (!drawingDoc) {
        isNew = true;
        drawingDoc = await Drawing.create({
          drawingNo,
          description: drawingDesc,
          qty: drawingQty || 1,
          projectId: projectData?._id || null,
          customerId: projectData?.customerId || null,
          currency: projectCurrencyId,
          unitPrice: 0,
          totalPrice: 0,
          quoteType: incomingQuoteType,
          quoteStatus: "active",
          materialMarkup: masterMaterial,
          manhourMarkup: masterManhour,
          packingMarkup: masterPacking,
          lastEditedBy: req.user?._id || null,
        });
      } else {
        // Update existing drawing
        drawingDoc.description = drawingDesc;
        drawingDoc.qty = drawingQty || 1;
        drawingDoc.quoteType = incomingQuoteType;
        drawingDoc.lastEditedBy = req.user?._id || drawingDoc.lastEditedBy;

        // Remove old items before adding new ones
        await CostingItems.deleteMany({ drawingId: drawingDoc._id });
      }

      let nextMatNo = await getNextItemNumberForType(drawingDoc._id, "material");
      let nextManNo = await getNextItemNumberForType(drawingDoc._id, "manhour");

      const materialItems = [];
      const manhourItems = [];

      for (const { r, rowIndex } of list) {
        const anyVal =
          toStr(pick(r, "Child Part", "ChildPart", "childPart")) ||
          toStr(pick(r, "MPN", "mpn")) ||
          toStr(pick(r, "Description", "Child Description", "Part Description")) ||
          toStr(pick(r, "UOM", "uom")) ||
          toStr(pick(r, "Labour Skill Level", "Skill Level", "Labour Level")) ||
          toStr(pick(r, "Labour Description", "Labour Remarks", "Remarks")) ||
          toStr(pick(r, "Labour UOM", "UOM (Labour)", "LabourUOM")) ||
          toStr(pick(r, "Labour Qty", "Qty (Labour)", "Labour Quantity", "Quantity"));
        if (!anyVal) continue;

        // ---------- MATERIAL ----------
        const childParts = toStr(pick(r, "Child Part", "ChildPart", "childPart"));
        if (childParts) {
          let materialHasError = false;

          const childPart = await Child.findOne({
            ChildPartNo: childParts,
          }).populate({
            path: "mpn",
            populate: [
              { path: "currency", select: "code" },
              { path: "UOM", select: "code" },
            ],
          });

          if (!childPart) {
            results.errors.push({ drawingNo, row: rowIndex, type: "material", field: "Child Part", value: childParts, message: `Child Part not found in system: ${childParts}` });
            materialHasError = true;
          } else if (!childPart.mpn) {
            results.errors.push({ drawingNo, row: rowIndex, type: "material", field: "MPN", value: childParts, message: `No MPN linked to Child Part: ${childParts}` });
            materialHasError = true;
          }

          const uomCell = toStr(pick(r, "UOM", "uom"));
          if (!uomCell) {
            results.errors.push({ drawingNo, row: rowIndex, type: "material", field: "UOM", value: "", message: "UOM is required for material line" });
            materialHasError = true;
          }

          const uomId = uomCell ? await getUomId(uomCell) : null;
          if (uomCell && !uomId) {
            results.errors.push({ drawingNo, row: rowIndex, type: "material", field: "UOM", value: uomCell, message: `UOM not found: ${uomCell}` });
            materialHasError = true;
          }

          const ChildQty = toNum(pick(r, "Child Qty", "child qty"), 0);
          if (!(ChildQty > 0)) {
            results.errors.push({ drawingNo, row: rowIndex, type: "material", field: "Child Qty", value: ChildQty, message: "Child Qty must be > 0" });
            materialHasError = true;
          }

          const unitPriceRaw = toNum(childPart?.mpn?.RFQUnitPrice);

          if (!materialHasError) {
            const childDesc = toStr(pick(r, "Description", "Child Description", "Part Description"));
            const manufacturer = toStr(pick(r, "Manufacturer", "manufacturer"));

            const tolPct = toNum(pick(r, "Tol-%", "Tolerance %", "tolPct"), 0);
            const sgaPct = toNum(pick(r, "SGA-%", "SGA %", "sgaPct"), 0);
            const matBurdenPct = toNum(pick(r, "Mat Burden-% (9)", "Mat Burden-%", "Mat Burden %"), 0);
            const freightPct = toNum(pick(r, "Freight cost-% (10)", "Freight cost-%", "Freight Cost %"), 0);
            const fixedFreight = toNum(pick(r, "Fixed Freight cost", "Fixed Freight", "Fixed Freight Cost"), 0);

            let newPrice;
            try {
              newPrice = await convertLengthUnitPrice(
                unitPriceRaw,
                childPart?.mpn?.UOM?.code,
                uomCell
              );
            } catch (convErr) {
              results.errors.push({ row: rowIndex, message: "UOM conversion failed" });
              continue;
            }

            const rowCurrency = childPart?.mpn?.currency?.code || "USD";
            let unitPrice = unitPriceRaw;
            try {
              unitPrice =
                rowCurrency === projectCurrencyCode
                  ? round2(newPrice)
                  : convertCurrency(newPrice, rowCurrency, projectCurrencyCode, settings, 2);
            } catch (ce) {
              results.errors.push({
                drawingNo,
                row: rowIndex,
                type: "material",
                field: "Currency Conversion",
                value: `${rowCurrency} -> ${projectCurrencyCode}`,
                message: ce.message || "Currency conversion failed",
              });
              materialHasError = true;
            }

            if (!materialHasError) {
              const quantity = toNum(ChildQty);
              const extPrice = round2(quantity * unitPrice);
              const salesPrice = round2(extPrice * (1 + (sgaPct + matBurdenPct + freightPct) / 100) + fixedFreight);

              materialItems.push({
                drawingId: drawingDoc._id,
                quoteType: "material",
                itemNumber: fmtNo4(nextMatNo),

                childPart: childPart?._id || null,
                mpn: childPart?.mpn?._id || null,
                description: toStr(childPart?.mpn?.Description) || childDesc || "",
                manufacturer: childPart?.mpn?.Manufacturer || manufacturer || "",
                uom: uomId,
                rfqDate: childPart?.mpn?.RFQDate,
                supplier: childPart?.mpn?.Supplier,
                leadTime: toNum(childPart?.mpn?.LeadTime_WK),

                quantity,
                tolerance: tolPct,
                sgaPercent: sgaPct,
                matBurden: matBurdenPct,
                freightPercent: freightPct,
                fixedFreightCost: fixedFreight,

                currencyCode: projectCurrencyCode,
                sourceCurrency: rowCurrency,
                sourceUnitPrice: round2(unitPriceRaw),

                unitPrice: round2(unitPrice),
                extPrice,
                salesPrice,

                lastEditedBy: req.user?._id || null,
              });
              nextMatNo++;
            }
          }
        }

        // ---------- MANHOUR ----------
        const labourSkill = toStr(pick(r, "Labour Skill Level", "Skill Level", "Labour Level"));
        const labourDesc = toStr(pick(r, "Labour Description", "Labour Remarks", "Remarks")) || labourSkill;
        const labourUomTx = toStr(pick(r, "Labour UOM", "UOM (Labour)", "LabourUOM"));
        const labourQty = toNum(pick(r, "Labour Qty", "Qty (Labour)", "Labour Quantity", "Quantity"), 0);

        const hasLabour = (labourSkill || labourDesc || labourUomTx) && labourQty > 0;

        if (hasLabour) {
          let labourHasError = false;

          if (!labourUomTx) {
            results.errors.push({ drawingNo, row: rowIndex, type: "manhour", field: "Labour UOM", value: "", message: "Labour UOM is required" });
            labourHasError = true;
          }

          const labourUomId = labourUomTx ? await getUomId(labourUomTx) : null;
          if (labourUomTx && !labourUomId) {
            results.errors.push({ drawingNo, row: rowIndex, type: "manhour", field: "Labour UOM", value: labourUomTx, message: `Labour UOM not found: ${labourUomTx}` });
            labourHasError = true;
          }

          let skillLevel = null;
          if (labourSkill) {
            skillLevel = await SkillLevelCosting
              .findOne({ skillLevelName: labourSkill })
              .select("_id skillLevelName unitPrice rate type")
              .populate("type")
              .lean();

            if (!skillLevel) {
              results.errors.push({ drawingNo, row: rowIndex, type: "manhour", field: "Labour Skill Level", value: labourSkill, message: `Skill Level not found: ${labourSkill}` });
              labourHasError = true;
            }
          }

          if (!labourHasError) {
            const unitRate = toNum(skillLevel?.unitPrice ?? skillLevel?.rate);
            const extPrice = round2(unitRate * labourQty);
            const salesPrice = extPrice;

            manhourItems.push({
              drawingId: drawingDoc._id,
              quoteType: "manhour",
              itemNumber: fmtNo4(nextManNo),

              description: labourDesc,
              uom: labourUomId,
              quantity: labourQty,
              skillLevel: skillLevel?._id || null,

              currencyCode: projectCurrencyCode,
              unitPrice: unitRate,
              extPrice,
              salesPrice,

              lastEditedBy: req.user?._id || null,
            });
            nextManNo++;
          }
        }
      }

      if (materialItems.length) {
        await CostingItems.insertMany(materialItems);
        results.itemsAdded += materialItems.length;
      }
      if (manhourItems.length) {
        await CostingItems.insertMany(manhourItems);
        results.manhourAdded += manhourItems.length;
      }

      // Totals recompute
      {
        const oid = new mongoose.Types.ObjectId(drawingDoc._id);
        const grouped = await CostingItems.aggregate([
          { $match: { drawingId: oid } },
          { $group: { _id: "$quoteType", bucketTotal: { $sum: { $toDouble: "$salesPrice" } } } },
        ]);

        let materialTotal = 0, manhourTotal = 0, packingTotal = 0;

        for (const g of grouped) {
          if (g._id === "material") materialTotal = g.bucketTotal;
          if (g._id === "manhour") manhourTotal = g.bucketTotal;
        }

        drawingDoc.materialTotal = materialTotal;
        drawingDoc.manhourTotal = manhourTotal;
        drawingDoc.totalPrice = materialTotal + manhourTotal + packingTotal;

        await drawingDoc.save();
      }

      results.drawingsAdded.push(drawingNo);
    }

    try { fs.unlinkSync(filePath); } catch { }

    return res.json({ success: true, results });
  } catch (err) {
    try { fs.unlinkSync(filePath); } catch { }
    console.error("Import Drawing error:", err);
    return res.status(500).json({ success: false, message: err.message, stack: err.stack });
  }
};



// export const importDrawings = async (req, res) => {
//   try {
//     // 1) Basic file & input checks
//     if (!req.file?.path) {
//       return res.status(400).json({ success: false, message: "No file uploaded" });
//     }
//     const filePath = req.file.path;

//     const incomingQuoteType = toStr(req.body?.quoteType); // "other" | "cable_harness"
//     if (!incomingQuoteType) {
//       try { fs.unlinkSync(filePath); } catch { }
//       return res.status(400).json({ success: false, message: "quoteType is required" });
//     }

//     const incomingProject = toStr(req.body?.project);
//     if (!incomingProject) {
//       try { fs.unlinkSync(filePath); } catch { }
//       return res.status(400).json({ success: false, message: "Project is required" });
//     }

//     const name = (req.file.originalname || "").toLowerCase();
//     if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
//       try { fs.unlinkSync(filePath); } catch { }
//       return res.status(400).json({ success: false, message: "Only .xlsx / .xls files are supported" });
//     }

//     // 2) Read Excel
//     let workbook;
//     try {
//       workbook = XLSX.readFile(filePath);
//     } catch (e) {
//       try { fs.unlinkSync(filePath); } catch { }
//       return res.status(400).json({ success: false, message: "Invalid Excel file", error: e.message });
//     }
//     if (!workbook.SheetNames?.length) {
//       try { fs.unlinkSync(filePath); } catch { }
//       return res.status(400).json({ success: false, message: "Excel has no sheets" });
//     }
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     if (!sheet) {
//       try { fs.unlinkSync(filePath); } catch { }
//       return res.status(400).json({ success: false, message: "First sheet is missing" });
//     }
//     const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
//     if (!Array.isArray(rows) || rows.length === 0) {
//       try { fs.unlinkSync(filePath); } catch { }
//       return res.status(400).json({ success: false, message: "Sheet is empty" });
//     }

//     // 3) Load project & markups
//     const projectData = await Project.findById(incomingProject).lean();
//     if (!projectData) {
//       try { fs.unlinkSync(filePath); } catch { }
//       return res.status(400).json({ success: false, message: "Project Data missing" });
//     }

//     const master = await MarkupParameter.findOne({})
//       .sort({ updatedAt: -1 })
//       .select("materialsMarkup manhourMarkup packingMarkup")
//       .lean();

//     const masterMaterial = clampPct(master?.materialsMarkup, 0);
//     const masterManhour = clampPct(master?.manhourMarkup, 0);
//     const masterPacking = clampPct(master?.packingMarkup, 0);

//     const results = { drawingsAdded: [], itemsAdded: 0, manhourAdded: 0, errors: [] };

//     // 4) Group rows by carrying-forward "Drawing no"
//     const groupRowsByDrawing = (rows) => {
//       const groups = new Map(); // drawingNo -> [{ r, rowIndex }]
//       let current = null;
//       for (let i = 0; i < rows.length; i++) {
//         const r = rows[i];
//         const rowIndex = i + 2; // Excel line (header=1)
//         const drawingNo = toStr(pick(r, "Drawing no", "Drawing No", "drawingNo", "Drawing", "Drawing_no"));

//         if (drawingNo) {
//           current = drawingNo;
//           if (!groups.has(drawingNo)) groups.set(drawingNo, []);
//           groups.get(drawingNo).push({ r, rowIndex });
//         } else {
//           if (!current) {
//             // row aa gaya but abhi tak koi Drawing no nahi
//             results.errors.push({
//               drawingNo: null,
//               row: rowIndex,
//               type: "header",
//               field: "Drawing no",
//               value: "",
//               message: "Row found before any 'Drawing no' header",
//             });
//             continue;
//           }
//           groups.get(current).push({ r, rowIndex });
//         }
//       }
//       return groups;
//     };

//     const getDrawingHeadValues = (list) => {
//       const headEntry =
//         list.find(({ r }) => {
//           const hasDesc = toStr(pick(r, "Description", "drawingDescription"));
//           const hasQty = toStr(pick(r, "Qty", "Quantity", "qty"));
//           return hasDesc || hasQty;
//         }) || list[0];

//       const head = headEntry?.r || {};
//       const drawingDesc = toStr(pick(head, "Description", "drawingDescription"));
//       const drawingQty = toNum(pick(head, "Qty", "Quantity", "qty"), 1);
//       return { drawingDesc, drawingQty };
//     };

//     // 5) Only support 'other' and 'cable_harness' here
//     if (!["other", "cable_harness"].includes(incomingQuoteType)) {
//       try { fs.unlinkSync(filePath); } catch { }
//       return res.status(400).json({
//         success: false,
//         message: `Unsupported quoteType "${incomingQuoteType}". Use "other" or "cable_harness".`,
//       });
//     }

//     const groups = groupRowsByDrawing(rows);

//     // 6) Process each drawing group
//     for (const [drawingNo, list] of groups.entries()) {
//       const { drawingDesc, drawingQty } = getDrawingHeadValues(list);

//       // Avoid duplicates
//       const exists = await Drawing.findOne({ drawingNo }).lean();
//       if (exists) {
//         results.errors.push({
//           drawingNo,
//           row: null,
//           type: "drawing",
//           field: "drawingNo",
//           value: drawingNo,
//           message: "Duplicate drawing number (already exists)",
//         });
//         continue;
//       }

//       // Create drawing
//       const drawingDoc = await Drawing.create({
//         drawingNo,
//         description: drawingDesc,
//         qty: drawingQty || 1,
//         projectId: projectData?._id || null,
//         customerId: projectData?.customerId || null,
//         currency: projectData?.currency || null,
//         unitPrice: 0,
//         totalPrice: 0,
//         quoteType: incomingQuoteType, // 'other' or 'cable_harness'
//         quoteStatus: "active",
//         materialMarkup: masterMaterial,
//         manhourMarkup: masterManhour,
//         packingMarkup: masterPacking,
//         lastEditedBy: req.user?._id || null,
//       });

//       // Seed next item numbers per type
//       let nextMatNo = await getNextItemNumberForType(drawingDoc._id, "material");
//       let nextManNo = await getNextItemNumberForType(drawingDoc._id, "manhour");

//       const materialItems = [];
//       const manhourItems = [];

//       for (const { r, rowIndex } of list) {
//         // Skip truly empty lines
//         const anyVal =
//           toStr(pick(r, "Child Part", "ChildPart", "childPart")) ||
//           toStr(pick(r, "MPN", "mpn")) ||
//           toStr(pick(r, "Description", "Child Description", "Part Description")) ||
//           toStr(pick(r, "UOM", "uom")) ||
//           toStr(pick(r, "Labour Skill Level", "Skill Level", "Labour Level")) ||
//           toStr(pick(r, "Labour Description", "Labour Remarks", "Remarks")) ||
//           toStr(pick(r, "Labour UOM", "UOM (Labour)", "LabourUOM")) ||
//           toStr(pick(r, "Labour Qty", "Qty (Labour)", "Labour Quantity", "Quantity"));
//         if (!anyVal) continue;

//         /* -------- Material line (if Child Part present) -------- */
//         const childParts = toStr(pick(r, "Child Part", "ChildPart", "childPart"));
//         if (childParts) {
//           let materialHasError = false;

//           const childPart = await Child.findOne({ ChildPartNo: childParts }).populate("mpn");

//           if (!childPart) {
//             results.errors.push({
//               drawingNo,
//               row: rowIndex,
//               type: "material",
//               field: "Child Part",
//               value: childParts,
//               message: `Child Part not found in system: ${childParts}`,
//             });
//             materialHasError = true;
//           } else if (!childPart.mpn) {
//             results.errors.push({
//               drawingNo,
//               row: rowIndex,
//               type: "material",
//               field: "MPN",
//               value: childParts,
//               message: `No MPN linked to Child Part: ${childParts}`,
//             });
//             materialHasError = true;
//           }

//           const uomCell = toStr(pick(r, "UOM", "uom"));
//           if (!uomCell) {
//             results.errors.push({
//               drawingNo,
//               row: rowIndex,
//               type: "material",
//               field: "UOM",
//               value: "",
//               message: "UOM is required for material line",
//             });
//             materialHasError = true;
//           }

//           const uomId = uomCell ? await getUomId(uomCell) : null;
//           if (uomCell && !uomId) {
//             results.errors.push({
//               drawingNo,
//               row: rowIndex,
//               type: "material",
//               field: "UOM",
//               value: uomCell,
//               message: `UOM not found: ${uomCell}`,
//             });
//             materialHasError = true;
//           }

//           const ChildQty = toNum(pick(r, "Child Qty", "child qty"), 0);
//           if (!(ChildQty > 0)) {
//             results.errors.push({
//               drawingNo,
//               row: rowIndex,
//               type: "material",
//               field: "Child Qty",
//               value: ChildQty,
//               message: "Child Qty must be > 0",
//             });
//             materialHasError = true;
//           }

//           const unitPrice = toNum(childPart?.mpn?.RFQUnitPrice);
//           // if (!materialHasError && !(unitPrice > 0)) {
//           //   results.errors.push({
//           //     drawingNo,
//           //     row: rowIndex,
//           //     type: "material",
//           //     field: "RFQUnitPrice",
//           //     value: unitPrice,
//           //     message: `RFQUnitPrice for MPN of Child Part ${childParts} is missing or 0`,
//           //   });
//           //   materialHasError = true;
//           // }

//           if (!materialHasError) {
//             const childDesc = toStr(pick(r, "Description", "Child Description", "Part Description"));
//             const manufacturer = toStr(pick(r, "Manufacturer", "manufacturer"));

//             const tolPct = toNum(pick(r, "Tol-%", "Tolerance %", "tolPct"), 0);
//             const sgaPct = toNum(pick(r, "SGA-%", "SGA %", "sgaPct"), 0);
//             const matBurdenPct = toNum(pick(r, "Mat Burden-% (9)", "Mat Burden-%", "Mat Burden %"), 0);
//             const freightPct = toNum(
//               pick(r, "Freight cost-% (10)", "Freight cost-%", "Freight Cost %"),
//               0
//             );
//             const fixedFreight = toNum(
//               pick(r, "Fixed Freight cost", "Fixed Freight", "Fixed Freight Cost"),
//               0
//             );

//             const quantity = toNum(ChildQty);
//             const extPrice = round2(quantity * unitPrice);
//             const salesPrice = round2(
//               extPrice * (1 + (sgaPct + matBurdenPct + freightPct) / 100) + fixedFreight
//             );

//             materialItems.push({
//               drawingId: drawingDoc._id,
//               quoteType: "material",
//               itemNumber: fmtNo4(nextMatNo),

//               childPart: childPart?._id || null,
//               mpn: childPart?.mpn?._id || null,
//               description: toStr(childPart?.mpn?.Description) || childDesc || "",
//               manufacturer: childPart?.mpn?.Manufacturer || manufacturer || "",
//               uom: uomId,
//               rfqDate: childPart?.mpn?.RFQDate,
//               supplier: childPart?.mpn?.Supplier,
//               leadTime: toNum(childPart?.mpn?.LeadTime_WK),

//               quantity,
//               tolerance: tolPct,
//               sgaPercent: sgaPct,
//               matBurden: matBurdenPct,
//               freightPercent: freightPct,
//               fixedFreightCost: fixedFreight,

//               unitPrice,
//               extPrice,
//               salesPrice,

//               lastEditedBy: req.user?._id || null,
//             });
//             nextMatNo++;
//           }
//         }

//         /* -------- Labour line (if labour columns present) -------- */
//         const labourSkill = toStr(pick(r, "Labour Skill Level", "Skill Level", "Labour Level"));
//         const labourDesc =
//           toStr(pick(r, "Labour Description", "Labour Remarks", "Remarks")) || labourSkill;
//         const labourUomTx = toStr(pick(r, "Labour UOM", "UOM (Labour)", "LabourUOM"));
//         const labourQty = toNum(
//           pick(r, "Labour Qty", "Qty (Labour)", "Labour Quantity", "Quantity"),
//           0
//         );

//         const hasLabour = (labourSkill || labourDesc || labourUomTx) && labourQty > 0;

//         if (hasLabour) {
//           let labourHasError = false;

//           if (!(labourQty > 0)) {
//             results.errors.push({
//               drawingNo,
//               row: rowIndex,
//               type: "manhour",
//               field: "Labour Qty",
//               value: labourQty,
//               message: "Labour Qty must be > 0",
//             });
//             labourHasError = true;
//           }

//           if (!labourUomTx) {
//             results.errors.push({
//               drawingNo,
//               row: rowIndex,
//               type: "manhour",
//               field: "Labour UOM",
//               value: "",
//               message: "Labour UOM is required",
//             });
//             labourHasError = true;
//           }

//           const labourUomId = labourUomTx ? await getUomId(labourUomTx) : null;
//           if (labourUomTx && !labourUomId) {
//             results.errors.push({
//               drawingNo,
//               row: rowIndex,
//               type: "manhour",
//               field: "Labour UOM",
//               value: labourUomTx,
//               message: `Labour UOM not found: ${labourUomTx}`,
//             });
//             labourHasError = true;
//           }

//           let skillLevel = null;
//           if (labourSkill) {
//             try {
//               skillLevel = await SkillLevelCosting
//                 .findOne({ skillLevelName: labourSkill })
//                 .select("_id skillLevelName unitPrice rate type")
//                 .populate("type")
//                 .lean();
//             } catch (e) {
//               results.errors.push({
//                 drawingNo,
//                 row: rowIndex,
//                 type: "manhour",
//                 field: "Labour Skill Level",
//                 value: labourSkill,
//                 message: `Error while fetching skill level: ${e.message}`,
//               });
//               labourHasError = true;
//             }

//             if (!skillLevel) {
//               results.errors.push({
//                 drawingNo,
//                 row: rowIndex,
//                 type: "manhour",
//                 field: "Labour Skill Level",
//                 value: labourSkill,
//                 message: `Skill Level not found: ${labourSkill}`,
//               });
//               labourHasError = true;
//             }
//           }

//           if (!labourHasError) {
//             const unitRate = toNum(skillLevel?.unitPrice ?? skillLevel?.rate);
//             const extPrice = round2(unitRate * labourQty);
//             const salesPrice = extPrice; // same for manhour

//             manhourItems.push({
//               drawingId: drawingDoc._id,
//               quoteType: "manhour",
//               itemNumber: fmtNo4(nextManNo),

//               description: labourDesc,
//               uom: labourUomId,
//               quantity: labourQty,
//               skillLevel: skillLevel?._id || null,
//               unitPrice: unitRate,
//               extPrice,
//               salesPrice,

//               lastEditedBy: req.user?._id || null,
//             });
//             nextManNo++;
//           }
//         }
//       }

//       // 7) Insert items for this drawing
//       if (materialItems.length) {
//         await CostingItems.insertMany(materialItems);
//         results.itemsAdded += materialItems.length;
//       }
//       if (manhourItems.length) {
//         await CostingItems.insertMany(manhourItems);
//         results.manhourAdded += manhourItems.length;
//       }

//       // 8) ✅ Recompute totals + markups (per drawing) and persist
//       {
//         const oid = new mongoose.Types.ObjectId(drawingDoc._id);
//         const grouped = await CostingItems.aggregate([
//           { $match: { drawingId: oid } },
//           {
//             $group: {
//               _id: "$quoteType",
//               bucketTotal: { $sum: { $toDouble: "$salesPrice" } },
//             },
//           },
//         ]);

//         let materialTotal = 0,
//           manhourTotal = 0,
//           packingTotal = 0;
//         for (const g of grouped) {
//           const t = toNum(g.bucketTotal);
//           switch ((g._id || "").toLowerCase()) {
//             case "material":
//               materialTotal = t;
//               break;
//             case "manhour":
//               manhourTotal = t;
//               break;
//             case "packing":
//               packingTotal = t;
//               break;
//             default:
//               break;
//           }
//         }

//         const materialMarkup = toNum(drawingDoc.materialMarkup);
//         const manhourMarkup = toNum(drawingDoc.manhourMarkup);
//         const packingMarkup = toNum(drawingDoc.packingMarkup);

//         const materialWithMarkup = round2(materialTotal + (materialTotal * materialMarkup) / 100);
//         const manhourWithMarkup = round2(manhourTotal + (manhourTotal * manhourMarkup) / 100);
//         const packingWithMarkup = round2(packingTotal + (packingTotal * packingMarkup) / 100);

//         const totalPriceRaw = round2(materialTotal + manhourTotal + packingTotal);
//         const totalPriceWithMarkup = round2(
//           materialWithMarkup + manhourWithMarkup + packingWithMarkup
//         );

//         const importedMaxLTW = Math.max(
//           toNum(drawingDoc.leadTimeWeeks),
//           ...materialItems.map((x) => toNum(x.leadTime)),
//           ...manhourItems.map((x) => toNum(x.leadTime))
//         );

//         drawingDoc.materialTotal = round2(materialTotal);
//         drawingDoc.manhourTotal = round2(manhourTotal);
//         drawingDoc.packingTotal = round2(packingTotal);
//         drawingDoc.totalPrice = totalPriceRaw;
//         drawingDoc.unitPrice = totalPriceRaw;
//         drawingDoc.totalPriceWithMarkup = totalPriceWithMarkup;
//         drawingDoc.leadTimeWeeks = importedMaxLTW;
//         drawingDoc.lastEditedBy = req?.user?._id || drawingDoc.lastEditedBy;

//         await drawingDoc.save();
//       }

//       // 9) For response summary
//       results.drawingsAdded.push({
//         id: drawingDoc._id,
//         drawingNo,
//         rows: list.length,
//         materialItems: materialItems.length,
//         manhourItems: manhourItems.length,
//       });
//     }

//     function formatImportErrors(errors = [], opts = {}) {
//       const {
//         maxDrawings = 8,      // kitne drawings show kare
//         maxLinesPerDrawing = 3, // per drawing max bullets
//       } = opts;

//       if (!Array.isArray(errors) || errors.length === 0) return "";

//       const clean = (v) => (v == null ? "" : String(v).trim());

//       // 1) Normalize
//       const normalized = errors.map((e) => {
//         const drawingNo = clean(e?.drawingNo) || "UNKNOWN";
//         const row = e?.row != null ? Number(e.row) : null;
//         const message = clean(e?.message) || "Unknown error";
//         const field = clean(e?.field);
//         const value = e?.value === 0 || e?.value ? clean(e.value) : "";

//         const key = `${drawingNo}||${message}||${field}||${value}`;
//         return { drawingNo, row, message, field, value, key };
//       });

//       // 2) Group by drawingNo
//       const byDrawing = new Map();
//       for (const e of normalized) {
//         if (!byDrawing.has(e.drawingNo)) byDrawing.set(e.drawingNo, []);
//         byDrawing.get(e.drawingNo).push(e);
//       }

//       // 3) Build output
//       const drawingEntries = Array.from(byDrawing.entries()).sort(([a], [b]) =>
//         a.localeCompare(b)
//       );

//       const shownDrawings = drawingEntries.slice(0, maxDrawings);
//       const remainingDrawings = drawingEntries.length - shownDrawings.length;

//       const lines = [];
//       lines.push(`Import completed with issues (${errors.length} issues):`);
//       lines.push("");

//       for (const [drawingNo, list] of shownDrawings) {
//         // Merge duplicates by same message/field/value (keep rows)
//         const merged = new Map(); // key -> { rows:Set, message, field, value }
//         for (const e of list) {
//           if (!merged.has(e.key)) {
//             merged.set(e.key, {
//               rows: new Set(),
//               message: e.message,
//               field: e.field,
//               value: e.value,
//             });
//           }
//           if (e.row != null && !Number.isNaN(e.row)) merged.get(e.key).rows.add(e.row);
//         }

//         const bullets = [];
//         for (const m of merged.values()) {
//           const rowList = [...m.rows].sort((a, b) => a - b);

//           // ✅ If rows exist → "Row 2" or "Rows 2, 3"
//           const rowText =
//             rowList.length === 0
//               ? "" // ✅ no "Row -"
//               : rowList.length === 1
//                 ? `Row ${rowList[0]}: `
//                 : `Rows ${rowList.join(", ")}: `;

//           const fieldText =
//             m.field
//               ? m.value !== ""
//                 ? ` (${m.field}: ${m.value})`
//                 : ` (${m.field})`
//               : "";

//           bullets.push(`- ${rowText}${m.message}${fieldText}`);
//         }

//         // limit bullets per drawing (optional)
//         const shownBullets = bullets.slice(0, maxLinesPerDrawing);
//         const remainingBullets = bullets.length - shownBullets.length;

//         lines.push(`• Drawing ${drawingNo}`);
//         lines.push(...shownBullets.map((b) => `  ${b}`));

//         if (remainingBullets > 0) {
//           lines.push(`  - (+${remainingBullets} more issues)`);
//         }

//         lines.push(""); // space between drawings
//       }

//       if (remainingDrawings > 0) {
//         lines.push(`(+${remainingDrawings} more drawings with issues)`);
//       }

//       return lines.join("\n").trim();
//     }




//     const errorMessage = formatImportErrors(results.errors);


//     // File cleanup
//     try {
//       fs.unlinkSync(req.file.path);
//     } catch { }

//     // 🔚 If there are errors -> 400 with combined message
//     if (results.errors.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: errorMessage, // 👈 ye hi frontend pe message.error() me dikhana
//         data: results, // (optional) agar UI ko counts chahiye to
//       });
//     }

//     // No errors -> Success
//     return res.status(200).json({
//       success: true,
//       message: `Import complete — Drawings: ${results.drawingsAdded.length}, Material lines: ${results.itemsAdded}, Manhour lines: ${results.manhourAdded}`,
//       data: results,
//     });
//   } catch (error) {
//     try {
//       if (req.file?.path) fs.unlinkSync(req.file.path);
//     } catch { }
//     return res.status(500).json({
//       success: false,
//       message: "Error importing drawings",
//       error: error.message,
//     });
//   }
// };


// export const importDrawings = async (req, res) => {
//   try {
//     if (!req.file?.path) {
//       return res.status(400).json({ success: false, message: "No file uploaded" });
//     }

//     const incomingQuoteType = toStr(req.body?.quoteType); // "other" | "cable_harness" | ...
//     if (!incomingQuoteType) {
//       return res.status(400).json({ success: false, message: "quoteType is required" });
//     }

//     const incomingproject = toStr(req.body?.project); // "other" | "cable_harness" | ...
//     if (!incomingproject) {
//       return res.status(400).json({ success: false, message: "Project is required" });
//     }

//     const name = (req.file.originalname || "").toLowerCase();
//     if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
//       return res.status(400).json({ success: false, message: "Only .xlsx / .xls files are supported" });
//     }

//     let workbook;
//     try {
//       workbook = XLSX.readFile(req.file.path);
//     } catch (e) {
//       return res.status(400).json({ success: false, message: "Invalid Excel file", error: e.message });
//     }

//     if (!workbook.SheetNames?.length) {
//       return res.status(400).json({ success: false, message: "Excel has no sheets" });
//     }

//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     if (!sheet) {
//       return res.status(400).json({ success: false, message: "First sheet is missing" });
//     }

//     const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
//     if (!Array.isArray(rows) || rows.length === 0) {
//       return res.status(400).json({ success: false, message: "Sheet is empty" });
//     }

//     const results = { drawingsAdded: [], itemsAdded: 0, manhourAdded: 0, errors: [] };

//     // 🔹 Load latest/active master markups ONCE
//     const master = await MarkupParameter
//       .findOne({})
//       .sort({ updatedAt: -1 })
//       .select("materialsMarkup manhourMarkup packingMarkup")
//       .lean();

//     const projectData = await Project.findById(incomingproject)
//     console.log('------projectData', projectData)
//     if (!projectData) {
//       return res.status(400).json({ success: false, message: "Project Data missing" });
//     }
//     const masterMaterial = clampPct(master?.materialsMarkup, 0);
//     const masterManhour = clampPct(master?.manhourMarkup, 0);
//     const masterPacking = clampPct(master?.packingMarkup, 0);

//     // ─────────────────────────────────────────────────────────────
//     // helpers to support header+child rows under same drawing
//     // ─────────────────────────────────────────────────────────────
//     const groupRowsByDrawing = (rows, results) => {
//       const groups = new Map(); // drawingNo -> [{ r, rowIndex }]
//       let currentDrawingNo = null;

//       for (let i = 0; i < rows.length; i++) {
//         const r = rows[i];
//         const rowIndex = i + 2; // Excel line number (header is line 1)
//         const drawingNo = toStr(pick(r, "Drawing no", "Drawing No", "drawingNo", "Drawing", "Drawing_no"));

//         if (drawingNo) {
//           currentDrawingNo = drawingNo;
//           if (!groups.has(drawingNo)) groups.set(drawingNo, []);
//           groups.get(drawingNo).push({ r, rowIndex });
//         } else {
//           if (!currentDrawingNo) {
//             results.errors.push({ row: rowIndex, error: "Row found before any 'Drawing no' header" });
//             continue;
//           }
//           groups.get(currentDrawingNo).push({ r, rowIndex });
//         }
//       }
//       return groups;
//     };

//     const getDrawingHeadValues = (list) => {
//       const headEntry =
//         list.find(({ r }) => {
//           const hasDesc = toStr(pick(r, "Description", "drawingDescription"));
//           const hasQty = toStr(pick(r, "Qty", "Quantity", "qty"));
//           return hasDesc || hasQty;
//         }) || list[0];

//       const head = headEntry?.r || {};
//       const drawingDesc = toStr(pick(head, "Description", "drawingDescription"));
//       const drawingQty = toNum(pick(head, "Qty", "Quantity", "qty"), 1);
//       return { drawingDesc, drawingQty };
//     };
//     // ─────────────────────────────────────────────────────────────

//     // === Accept both 'other' and 'cable_harness' with SAME column schema ===
//     if (["other", "cable_harness"].includes(incomingQuoteType)) {
//       /**
//        * Header + child rows pattern supported:
//        * - Header (has Drawing no) may also contain material/labour cells → import them.
//        * - Subsequent rows with blank Drawing no belong to the same drawing until next header.
//        *
//        * Columns expected among the rows:
//        * Drawing no | Description | Qty |
//        * Child Part | Description | MPN | Manufacturer | UOM | Qty | Tol-% | SGA-% | Mat Burden-% | Freight cost-% | Fixed Freight cost |
//        * Labour Skill Level | Labour Description | Labour UOM | Labour Qty
//        */

//       // 1) Group rows by (carry-forward) Drawing no
//       const groups = groupRowsByDrawing(rows, results);

//       // 2) Process each drawing group
//       for (const [drawingNo, list] of groups.entries()) {
//         const { drawingDesc, drawingQty } = getDrawingHeadValues(list);

//         // Prevent duplicate drawing
//         const exists = await Drawing.findOne({ drawingNo }).lean();
//         if (exists) {
//           results.errors.push({ drawingNo, error: "Duplicate drawing number (already exists)" });
//           continue;
//         }

//         // Create the drawing (store the incoming quoteType)
//         const drawingDoc = await Drawing.create({
//           drawingNo,
//           description: drawingDesc,
//           qty: drawingQty || 1,
//           projectId: projectData ? projectData?._id : null,
//           customerId: projectData ? projectData?.customerId : null,
//           currency: projectData ? projectData?.currency : null,
//           unitPrice: 0,
//           totalPrice: 0,
//           quoteType: incomingQuoteType,   // 'other' or 'cable_harness'
//           quoteStatus: "active",
//           materialMarkup: masterMaterial,
//           manhourMarkup: masterManhour,
//           packingMarkup: masterPacking,
//           lastEditedBy: req.user?._id || null,
//         });

//         // Independent counters per quoteType
//         let nextMatNo = await getNextItemNumberForType(drawingDoc._id, "material");
//         let nextManNo = await getNextItemNumberForType(drawingDoc._id, "manhour");


//         const materialItems = [];
//         const manhourItems = [];

//         for (const { r, rowIndex } of list) {
//           // Skip rows that truly have nothing
//           const anyVal =
//             toStr(pick(r, "Child Part", "ChildPart", "childPart")) ||
//             toStr(pick(r, "MPN", "mpn")) ||
//             toStr(pick(r, "Description", "Child Description", "Part Description")) ||
//             toStr(pick(r, "UOM", "uom")) ||
//             toStr(pick(r, "Labour Skill Level", "Skill Level", "Labour Level")) ||
//             toStr(pick(r, "Labour Description", "Labour Remarks", "Remarks")) ||
//             toStr(pick(r, "Labour UOM", "UOM (Labour)", "LabourUOM")) ||
//             toStr(pick(r, "Labour Qty", "Qty (Labour)", "Labour Quantity", "Quantity"));
//           if (!anyVal) continue;

//           // --- Material columns (can be on header row or child rows) ---
//           const childParts = toStr(pick(r, "Child Part", "ChildPart", "childPart"));
//           const childDesc = toStr(pick(r, "Description", "Child Description", "Part Description"));
//           const mpn = toStr(pick(r, "MPN", "mpn"));
//           const manufacturer = toStr(pick(r, "Manufacturer", "manufacturer"));
//           const uomCell = toStr(pick(r, "UOM", "uom"));
//           const ChildQty = toNum(pick(r, "Child Qty", "child qty"), 0);
//           const mQty = toNum(pick(r, "Material Qty", "material qty"), 0);
//           const tolPct = toNum(pick(r, "Tol-%", "Tolerance %", "tolPct"), 0);
//           const sgaPct = toNum(pick(r, "SGA-%", "SGA %", "sgaPct"), 0);
//           const matBurdenPct = toNum(pick(r, "Mat Burden-% (9)", "Mat Burden-%", "Mat Burden %"), 0);
//           const freightPct = toNum(pick(r, "Freight cost-% (10)", "Freight cost-%", "Freight Cost %"), 0);
//           const fixedFreight = toNum(pick(r, "Fixed Freight cost", "Fixed Freight", "Fixed Freight Cost"), 0);

//           const hasMaterialLine = childParts;
//           if (hasMaterialLine) {
//             const uomId = await getUomId(uomCell, results.errors, { rowIndex, drawingNo });

//             // If you want to enrich using Child→MPN, keep your lookup (optional):
//             const childPart = childParts
//               ? await Child.findOne({ ChildPartNo: childParts }).populate("mpn")
//               : null;

//             // Prefer MPN info if found; else keep Excel values
//             const unitPrice = Number(childPart?.mpn?.RFQUnitPrice || 0);
//             const quantity = Number(ChildQty || 0);
//             const tolerance = Number(tolPct || 0);
//             const extPrice = quantity * unitPrice;
//             const salesPrice =
//               extPrice * (1 + (Number(sgaPct) + Number(matBurdenPct) + Number(freightPct)) / 100) + Number(fixedFreight);

//             materialItems.push({
//               drawingId: drawingDoc._id,
//               quoteType: "material", // ✅ always "material"
//               itemNumber: fmtNo4(nextMatNo),

//               // from Excel
//               childPart: childPart?._id || null,
//               description: childPart?.mpn?.Description?.toString()?.trim() || childDesc || "",
//               mpn: childPart?.mpn?._id,
//               manufacturer: childPart?.mpn?.Manufacturer || manufacturer || "",
//               uom: uomId,
//               rfqDate: childPart?.mpn?.RFQDate,
//               supplier: childPart?.mpn?.Supplier,
//               // uomText: uomCell || null,
//               leadTime: Number(childPart?.mpn?.LeadTime_WK || 0),
//               quantity,
//               tolerance,
//               sgaPercent: sgaPct,
//               matBurden: matBurdenPct,
//               freightPercent: freightPct,
//               fixedFreightCost: fixedFreight,

//               unitPrice: Number(unitPrice || 0),
//               extPrice: Number((extPrice || 0).toFixed(2)),
//               salesPrice: Number((salesPrice || 0).toFixed(2)),

//               lastEditedBy: req.user?._id || null,
//             });
//             nextMatNo++;
//           }

//           // --- Labour columns (header or child rows) → manhour items ---
//           const labourSkill = toStr(pick(r, "Labour Skill Level", "Skill Level", "Labour Level"));
//           const labourDesc = toStr(pick(r, "Labour Description", "Labour Remarks", "Remarks"));
//           const labourUomTx = toStr(pick(r, "Labour UOM", "UOM (Labour)", "LabourUOM"));
//           const labourQty = toNum(pick(r, "Labour Qty", "Qty (Labour)", "Labour Quantity", "Quantity"), 0);
//           const remarks = toNum(pick(r, "Remarks", "remarks"), 0);
//           const hasLabour = (labourSkill || labourDesc || labourUomTx) && labourQty > 0;
//           if (hasLabour) {
//             const labourUomId = await getUomId(labourUomTx, results.errors, { rowIndex, drawingNo });
//             let skillLevel = null;
//             // optional pricing via SkillLevelCosting
//             try {
//               if (labourSkill) {
//                 skillLevel = await SkillLevelCosting
//                   .findOne({ skillLevelName: labourSkill })
//                   .select("_id skillLevelName unitPrice rate type") // fetch what you need
//                   .populate("type") // if UOM ref is needed
//                   .lean();


//               }
//             } catch (error) {
//               console.error("SkillLevelCosting lookup failed:", error.message);
//             }

//             const salesPrice = skillLevel?.rate * labourQty;
//             manhourItems.push({
//               drawingId: drawingDoc._id,
//               quoteType: "manhour",
//               itemNumber: fmtNo4(nextManNo),

//               description: labourDesc || labourSkill,
//               // skillLevelName: labourSkill,
//               uom: labourUomId,
//               remarks,
//               // uomText: labourUomTx || null,
//               quantity: labourQty,
//               skillLevel: skillLevel._id,
//               unitPrice: skillLevel?.rate,
//               extPrice: Number((salesPrice || 0).toFixed(2)),
//               salesPrice: Number((salesPrice || 0).toFixed(2)),

//               lastEditedBy: req.user?._id || null,
//             });
//             nextManNo++;
//           }
//         }

//         if (materialItems.length) {
//           await CostingItems.insertMany(materialItems);
//           results.itemsAdded += materialItems.length;
//         }
//         if (manhourItems.length) {
//           await CostingItems.insertMany(manhourItems);
//           results.manhourAdded += manhourItems.length;
//         }

//         results.drawingsAdded.push({
//           id: drawingDoc._id,
//           drawingNo,
//           rows: list.length,
//           materialItems: materialItems.length,
//           manhourItems: manhourItems.length,
//         });
//       }

//       return res.status(200).json({
//         success: true,
//         message: `Import complete — Drawings: ${results.drawingsAdded.length}, Material lines: ${results.itemsAdded}, Manhour lines: ${results.manhourAdded}, Errors: ${results.errors.length}`,
//         data: results,
//       });
//     }

//     // Fallback for any other quoteType
//     return res.status(400).json({
//       success: false,
//       message: `Unsupported quoteType "${incomingQuoteType}" in this endpoint. Use "other" or "cable_harness".`,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Error importing drawings",
//       error: error.message,
//     });
//   } finally {
//     try { if (req.file?.path) fs.unlinkSync(req.file.path); } catch { }
//   }
// };

// export const updateLatestPrice = async (req, res) => {
//   try {
//     const { id } = req.params; // costing item ID
//     const userId = req.user.id;

//     console.log("----- updateLatestPrice API Called -----");
//     console.log("Costing Item ID:", id);
//     console.log("User ID:", userId);

//     // 🟢 1) Find costing item by ID + populate MPN
//     const costingItem = await CostingItems.findById(id)
//       .populate("mpn", "RFQUnitPrice");

//     console.log("Found costingItem:", costingItem);
//     console.log("Related MPN:", costingItem?.mpn);

//     if (!costingItem) {
//       return res.status(404).json({
//         success: false,
//         message: "Costing item not found",
//       });
//     }

//     if (!costingItem.mpn) {
//       return res.status(400).json({
//         success: false,
//         message: "MPN not associated with this costing item",
//       });
//     }

//     // 🟢 2) Update Prices
//     const oldUnitPrice = Number(costingItem.unitPrice || 0);
//     const newUnitPrice = Number(costingItem.mpn.RFQUnitPrice || 0);

//     if (!newUnitPrice) {
//       return res.status(400).json({
//         success: false,
//         message: "MPN RFQUnitPrice is not set",
//       });
//     }

//     costingItem.unitPrice = newUnitPrice;
//     costingItem.updated_by = userId;

//     await costingItem.save();

//     return res.json({
//       success: true,
//       message: "Unit price updated successfully from MPN",
//       data: {
//         id: costingItem.id,
//         previousUnitPrice: oldUnitPrice,
//         newUnitPrice: newUnitPrice,
//         priceDifference: newUnitPrice - oldUnitPrice,
//       },
//     });

//   } catch (error) {
//     console.error("❌ Error updating latest price:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

const convertLengthUnitPriceNew = (pricePerBaseUnit, baseUnit, targetUnit) => {
  console.log('------pricePerBaseUnit, baseUnit, targetUnit',pricePerBaseUnit, baseUnit, targetUnit)
  if (!pricePerBaseUnit || !baseUnit || !targetUnit) return pricePerBaseUnit;

  const lengthMap = {
    M: 1,
    MM: 1000,
    CM: 100,
    FT: 3.28084,
    INCH: 39.3701,
    IN: 39.3701
  };

  // only for length units
  const isLengthUnit = (unit) =>
    ["M", "MM", "CM", "FT", "INCH", "IN"].includes(unit);

  if (!isLengthUnit(baseUnit) || !isLengthUnit(targetUnit)) {
    return pricePerBaseUnit;
  }

  if (!(baseUnit in lengthMap) || !(targetUnit in lengthMap)) {
    return pricePerBaseUnit;
  }

  // default quantity = 1
  const quantity = 1;

  // STEP 1: target → meters
  const targetInMeters = quantity / lengthMap[targetUnit];

  // STEP 2: meters → base unit
  const targetInBaseUnit = targetInMeters * lengthMap[baseUnit];

  // STEP 3: final price (NO currency conversion here)
  const finalPrice = targetInBaseUnit * pricePerBaseUnit;

  return Number(finalPrice.toFixed(2));
};

export const updateLatestPrice = async (req, res) => {
  try {
    const { id } = req.params;

    // -----------------------------
    // Helpers
    // -----------------------------
    const round2 = (n) =>
      Math.round((Number(n) + Number.EPSILON) * 100) / 100;

    const toNum = (v, d = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };

    // -----------------------------
    // 1️⃣ Load costing item + MPN
    // -----------------------------
    // const costingItem = await CostingItems.findById(id)
    //   .populate("mpn", "RFQUnitPrice MOQ LeadTime_WK currency Supplier RFQDate Description Manufacturer UOM")
    //   .lean(false);

     const costingItem = await CostingItems.findById(id)
  .populate("uom", "name code symbol") // 👈 CostingItems ka UOM
  .populate({
    path: "mpn",
    select:
      "RFQUnitPrice MOQ LeadTime_WK currency Supplier RFQDate Description Manufacturer UOM",
    populate: [
      {
        path: "currency",
        select: "code symbol name"
      },
      {
        path: "UOM", // 👈 MPN ka UOM
        select: "name code symbol"
      }
    ]
  })
      .lean(false)

      console.log('-------costingItem',costingItem)

    if (!costingItem) {
      return res.status(404).json({ success: false, message: "Costing item not found" });
    }

    if (!costingItem.mpn) {
      return res.status(400).json({ success: false, message: "MPN not associated" });
    }

    if (!mongoose.Types.ObjectId.isValid(costingItem?.drawingId)) {
      return res.status(400).json({ success: false, message: "Invalid drawingId" });
    }

    // -----------------------------
    // 2️⃣ Load Drawing + Currency
    // -----------------------------
    const drawing = await Drawing.findById(costingItem.drawingId)
      .populate("currency", "code symbol");

    if (!drawing) {
      return res.status(404).json({ success: false, message: "Drawing not found" });
    }

    const settings = await SystemSettings.findOne({}).lean();
    if (!settings?.currencySettings) {
      return res.status(500).json({ success: false, message: "Currency settings missing" });
    }

    const drawingCurrency = (drawing.currency?.code || "SGD").toUpperCase();
    const sourceCurrency = (costingItem.mpn.currency?.code || "USD").toUpperCase();


    console.log('------drawingCurrency----sourceCurrency',drawingCurrency,sourceCurrency)
    // -----------------------------
    // 3️⃣ Get & Convert Unit Price
    // -----------------------------
    const oldUnitPrice = toNum(costingItem.unitPrice);
    const incomingUnitPrice = toNum(costingItem.mpn.RFQUnitPrice);


    const newPrice = convertLengthUnitPriceNew(incomingUnitPrice,costingItem?.mpn?.UOM?.code,costingItem?.uom?.code)

    console.log('------newPrice',newPrice)

    if (!(incomingUnitPrice > 0)) {
      return res.status(400).json({
        success: false,
        message: "MPN RFQUnitPrice is invalid",
      });
    }

    const convertedUnitPrice =
      sourceCurrency === drawingCurrency
        ? round2(newPrice)
        : convertCurrency(
          newPrice,
          sourceCurrency,
          drawingCurrency,
          settings,
          { decimals: 2 }
        );

    console.log('------convertedUnitPrice',convertedUnitPrice)

    // -----------------------------
    // 4️⃣ Sync fields from MPN
    // -----------------------------
    costingItem.moq = toNum(costingItem.mpn.MOQ, toNum(costingItem.moq));
    costingItem.leadTime = toNum(costingItem.mpn.LeadTime_WK, toNum(costingItem.leadTime));
    costingItem.supplier = costingItem.mpn.Supplier || costingItem.supplier || null;
    costingItem.rfqDate = costingItem.mpn.RFQDate || costingItem.rfqDate || null;
    costingItem.description = String(costingItem.mpn.Description || costingItem.description || "").trim();
    costingItem.manufacturer = String(costingItem.mpn.Manufacturer || costingItem.manufacturer || "").trim();
    // costingItem.uom = costingItem.mpn.UOM || costingItem.uom || null;

    // -----------------------------
    // 5️⃣ Recalculate Pricing
    // -----------------------------
    costingItem.unitPrice = convertedUnitPrice;
    costingItem.currency = drawingCurrency;
    costingItem.sourceCurrency = sourceCurrency;
    costingItem.sourcePrice = round2(incomingUnitPrice);

    const quantity = toNum(costingItem.quantity);
    const tolerance = toNum(costingItem.tolerance);
    const sgaPercent = toNum(costingItem.sgaPercent);
    const matBurden = toNum(costingItem.matBurden);
    const freightPercent = toNum(costingItem.freightPercent);
    const fixedFreightCost = toNum(
      costingItem.fixedFreightCost,
      toNum(costingItem.freightCost, 0)
    );

    const actualQty = quantity + (quantity * tolerance) / 100;
    const extPrice = actualQty * convertedUnitPrice;

    const upliftPct = (sgaPercent + matBurden + freightPercent) / 100;
    const salesPrice = extPrice * (1 + upliftPct) + fixedFreightCost;

    costingItem.actualQty = round2(actualQty);
    costingItem.extPrice = round2(extPrice);
    costingItem.salesPrice = round2(salesPrice);
    costingItem.lastEditedBy = req.user?._id || costingItem.lastEditedBy;
    costingItem.updatedAt = new Date();

    await costingItem.save();

    // -----------------------------
    // 6️⃣ Recompute Drawing Totals
    // -----------------------------
    const oid = new mongoose.Types.ObjectId(costingItem.drawingId);

    const grouped = await CostingItems.aggregate([
      { $match: { drawingId: oid } },
      {
        $group: {
          _id: "$quoteType",
          bucketTotal: { $sum: { $toDouble: "$salesPrice" } },
        },
      },
    ]);

    let materialTotal = 0;
    let manhourTotal = 0;
    let packingTotal = 0;

    for (const g of grouped) {
      const t = toNum(g.bucketTotal);
      switch ((g._id || "").toLowerCase()) {
        case "material": materialTotal = t; break;
        case "manhour": manhourTotal = t; break;
        case "packing": packingTotal = t; break;
      }
    }

    const materialMarkup = toNum(drawing.materialMarkup);
    const manhourMarkup = toNum(drawing.manhourMarkup);
    const packingMarkup = toNum(drawing.packingMarkup);

    const materialWithMarkup = round2(materialTotal + (materialTotal * materialMarkup) / 100);
    const manhourWithMarkup = round2(manhourTotal + (manhourTotal * manhourMarkup) / 100);
    const packingWithMarkup = round2(packingTotal + (packingTotal * packingMarkup) / 100);

    const totalPriceRaw = round2(materialTotal + manhourTotal + packingTotal);
    const totalPriceWithMarkup = round2(materialWithMarkup + manhourWithMarkup + packingWithMarkup);

    drawing.materialTotal = round2(materialTotal);
    drawing.manhourTotal = round2(manhourTotal);
    drawing.packingTotal = round2(packingTotal);
    drawing.totalPrice = totalPriceRaw;
    drawing.totalPriceWithMarkup = totalPriceWithMarkup;
    drawing.leadTimeWeeks = Math.max(
      toNum(drawing.leadTimeWeeks),
      toNum(costingItem.leadTime)
    );
    drawing.lastEditedBy = req.user?._id || drawing.lastEditedBy;

    await drawing.save();

    // -----------------------------
    // Response
    // -----------------------------
    return res.json({
      success: true,
      message: "Latest MPN price applied with currency conversion",
      data: {
        itemId: costingItem._id,
        previousUnitPrice: oldUnitPrice,
        sourceCurrency,
        drawingCurrency,
        convertedUnitPrice,
        extPrice: costingItem.extPrice,
        salesPrice: costingItem.salesPrice,
      },
      totals: {
        currency: drawingCurrency,
        materialTotal: drawing.materialTotal,
        manhourTotal: drawing.manhourTotal,
        packingTotal: drawing.packingTotal,
        totalPrice: drawing.totalPrice,
        totalPriceWithMarkup: drawing.totalPriceWithMarkup,
        leadTimeWeeks: drawing.leadTimeWeeks,
      },
    });

  } catch (error) {
    console.error("updateLatestPrice error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


export const updateLatestPriceBulk = async (req, res) => {
  try {
    const { ids = [] } = req.body;

    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ success: false, message: "ids[] required" });
    }

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (!validIds.length) {
      return res.status(400).json({ success: false, message: "No valid ids" });
    }

    // helpers
    const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
    const toNum = (v, d = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };

    // Load all items
    // const items = await CostingItems.find({ _id: { $in: validIds } })
    //   .populate("mpn", "RFQUnitPrice MOQ LeadTime_WK currency Supplier RFQDate Description Manufacturer UOM")
    //   .lean(false);



    const items = await CostingItems.find({ _id: { $in: validIds } })
      .populate("uom", "name code symbol") // 👈 CostingItems ka UOM
  .populate({
    path: "mpn",
    select:
      "RFQUnitPrice MOQ LeadTime_WK currency Supplier RFQDate Description Manufacturer UOM",
    populate: [
      {
        path: "currency",
        select: "code symbol name"
      },
      {
        path: "UOM", // 👈 MPN ka UOM
        select: "name code symbol"
      }
    ]
  })
      .lean(false);

    // console.log('------items',items)

    if (!items.length) {
      return res.status(404).json({ success: false, message: "No costing items found" });
    }

    // ✅ all should be same drawingId (as per your use-case)
    const drawingId = items[0]?.drawingId;
    if (!mongoose.Types.ObjectId.isValid(drawingId)) {
      return res.status(400).json({ success: false, message: "Invalid drawingId" });
    }

    const settings = await SystemSettings.findOne({}).lean();
    if (!settings?.currencySettings) {
      return res.status(500).json({ success: false, message: "Currency settings missing" });
    }


    // Prepare bulk operations
    const ops = [];
    const failed = [];

    for (const costingItem of items) {
      try {
        // only material
        // if ((costingItem.quoteType || "").toLowerCase() !== "material") continue;

        if (!costingItem.mpn) {
          failed.push({ id: costingItem._id, reason: "MPN not linked" });
          continue;
        }

        const drawing = await Drawing.findById(costingItem?.drawingId).populate("currency", "code symbol");
        if (!drawing) {
          return res.status(404).json({ success: false, message: "Drawing not found" });
        }

        // console.log('------drawing',drawing)

        const drawingCurrency = (drawing.currency?.code || "SGD").toUpperCase();
        const sourceCurrency = (costingItem.mpn.currency?.code || "USD").toUpperCase();
        // console.log('--------drawingCurrency----sourceCurrency',drawingCurrency,sourceCurrency)

        const newUnitPrice = toNum(costingItem.mpn.RFQUnitPrice);
        if (!(newUnitPrice > 0)) {
          failed.push({ id: costingItem._id, reason: "MPN RFQUnitPrice missing/0" });
          continue;
        }


         const newPrice = convertLengthUnitPriceNew(newUnitPrice,costingItem?.mpn?.UOM?.code,costingItem?.uom?.code)

        const convertedUnitPrice =
          sourceCurrency === drawingCurrency
            ? round2(newPrice)
            : convertCurrency(
              newPrice,
              sourceCurrency,
              drawingCurrency,
              settings,
              { decimals: 2 }
            );

        // console.log('------convertedUnitPrice',convertedUnitPrice)

        // sync fields from mpn
        const moq = toNum(costingItem.mpn.MOQ, toNum(costingItem.moq));
        const leadTime = toNum(costingItem.mpn.LeadTime_WK, toNum(costingItem.leadTime));
        const supplier = costingItem.mpn.Supplier || costingItem.supplier || null;
        const rfqDate = costingItem.mpn.RFQDate || costingItem.rfqDate || null;
        const description = String(costingItem.mpn.Description || costingItem.description || "").trim();
        const manufacturer = String(costingItem.mpn.Manufacturer || costingItem.manufacturer || "").trim();
        // const uom = costingItem.mpn.UOM || costingItem.uom || null;

        // recalc
        const quantity = toNum(costingItem.quantity);
        const tolerance = toNum(costingItem.tolerance);
        const sgaPercent = toNum(costingItem.sgaPercent);
        const matBurden = toNum(costingItem.matBurden);
        const freightPercent = toNum(costingItem.freightPercent);
        const fixedFreightCost = toNum(costingItem.fixedFreightCost, toNum(costingItem.freightCost, 0));

        const actualQty = quantity + (quantity * tolerance) / 100;
        const extPrice = actualQty * convertedUnitPrice;

        const upliftPct = (sgaPercent + matBurden + freightPercent) / 100;
        const salesPrice = extPrice * (1 + upliftPct) + fixedFreightCost;

        ops.push({
          updateOne: {
            filter: { _id: costingItem._id },
            update: {
              $set: {
                unitPrice: convertedUnitPrice,
                moq,
                leadTime,
                supplier,
                rfqDate,
                description,
                manufacturer,
                // uom,
                actualQty: round2(actualQty),
                extPrice: round2(extPrice),
                salesPrice: round2(salesPrice),
                lastEditedBy: req.user?._id || costingItem.lastEditedBy,
                updatedAt: new Date(),
              },
            },
          },
        });
      } catch (e) {
        failed.push({ id: costingItem._id, reason: e.message });
      }
    }

    if (!ops.length) {
      return res.status(400).json({
        success: false,
        message: "No items eligible for update",
        failed,
      });
    }

    // ✅ bulk update
    const bulkRes = await CostingItems.bulkWrite(ops, { ordered: false });

    // ✅ recompute totals only once
    const drawing = await Drawing.findById(drawingId);
    if (!drawing) {
      return res.status(404).json({ success: false, message: "Drawing not found" });
    }

    const oid = new mongoose.Types.ObjectId(drawingId);

    const grouped = await CostingItems.aggregate([
      { $match: { drawingId: oid } },
      { $group: { _id: "$quoteType", bucketTotal: { $sum: { $toDouble: "$salesPrice" } } } },
    ]);

    let materialTotal = 0, manhourTotal = 0, packingTotal = 0;
    for (const g of grouped) {
      const t = toNum(g.bucketTotal);
      switch ((g._id || "").toLowerCase()) {
        case "material": materialTotal = t; break;
        case "manhour": manhourTotal = t; break;
        case "packing": packingTotal = t; break;
        default: break;
      }
    }

    const materialMarkup = toNum(drawing.materialMarkup);
    const manhourMarkup = toNum(drawing.manhourMarkup);
    const packingMarkup = toNum(drawing.packingMarkup);

    const materialWithMarkup = round2(materialTotal + (materialTotal * materialMarkup) / 100);
    const manhourWithMarkup = round2(manhourTotal + (manhourTotal * manhourMarkup) / 100);
    const packingWithMarkup = round2(packingTotal + (packingTotal * packingMarkup) / 100);

    const totalPrice = round2(materialTotal + manhourTotal + packingTotal);
    const totalPriceWithMarkup = round2(materialWithMarkup + manhourWithMarkup + packingWithMarkup);

    // lead time max
    const leadAgg = await CostingItems.aggregate([
      { $match: { drawingId: oid } },
      { $group: { _id: null, maxLT: { $max: "$leadTime" } } },
    ]);
    const maxLeadTime = toNum(leadAgg?.[0]?.maxLT, 0);

    drawing.materialTotal = round2(materialTotal);
    drawing.manhourTotal = round2(manhourTotal);
    drawing.packingTotal = round2(packingTotal);
    drawing.totalPrice = totalPrice;
    drawing.totalPriceWithMarkup = totalPriceWithMarkup;
    drawing.leadTimeWeeks = Math.max(toNum(drawing.leadTimeWeeks), maxLeadTime);
    drawing.lastEditedBy = req.user?._id || drawing.lastEditedBy;

    await drawing.save();

    return res.json({
      success: true,
      message: "✅ Bulk latest price update completed",
      updatedCount: bulkRes.modifiedCount || 0,
      failedCount: failed.length,
      failed,
      totals: {
        materialTotal: round2(materialTotal),
        manhourTotal: round2(manhourTotal),
        packingTotal: round2(packingTotal),
        totalPrice,
        totalPriceWithMarkup,
        leadTimeWeeks: drawing.leadTimeWeeks,
      },
    });
  } catch (error) {
    console.error("❌ updateLatestPriceBulk error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};




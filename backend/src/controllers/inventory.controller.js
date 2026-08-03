import { populate } from "dotenv";
import Inventory from "../models/Inventory.js";
import MPN from "../models/library/MPN.js";
import PurchaseOrders from "../models/PurchaseOrders.js";
import XLSX from 'xlsx'
import WorkOrder from "../models/WorkingOrders.js";
import Drawing from "../models/Drwaing.js";
import Customer from "../models/Customer.js";
import Project from "../models/Project.js";
import SystemSettings from "../models/SystemSettings.js";





import mongoose from "mongoose";
import CostingItems from "../models/CostingItem.js";
import { convertQty, convertToBaseUOM, convertToMeter, convertUom } from "../utils/uomController.js";
import { round } from "../utils/currency.js";


const calcShortageQty = (balanceQty = 0, incomingQty = 0, demandQty = 0) => {
  const availableQty = Number(balanceQty) + Number(incomingQty);

  const shortage = Number(demandQty) - availableQty;

  return shortage > 0 ? shortage : 0;
};

// DemandQty map: mpnId -> totalDemandQty
// async function buildDemandMap() {
//   // 1) Workorders (filter status if you want)
//   const workOrders = await WorkOrder.find({
//     // status: { $in: ["No Progress Yet", "In Progress"] } // optional
//   })
//     .select("_id drawingId quantity")
//     .lean();

//   if (!workOrders.length) return new Map();

//   // 2) group wo by drawingId and keep woQty sum
//   const woQtyByDrawing = new Map(); // drawingId -> total WO quantity
//   const drawingIds = new Set();

//   for (const wo of workOrders) {
//     const dId = String(wo.drawingId);
//     if (!dId) continue;
//     drawingIds.add(dId);
//     const prev = woQtyByDrawing.get(dId) || 0;
//     woQtyByDrawing.set(dId, prev + Number(wo.quantity || 1));
//   }

//   const drawingObjectIds = [...drawingIds].map((id) => new mongoose.Types.ObjectId(id));

//   // 3) CostingItems of those drawings (material)
//   const costingItems = await CostingItems.find({
//     drawingId: { $in: drawingObjectIds },
//     quoteType: "material",
//   })
//     .select("drawingId mpn quantity")
//     .lean();

//   if (!costingItems.length) return new Map();

//   // 4) mpn demand = sum( costingItem.qty * woQtyOfDrawing )
//   const demandMap = new Map(); // mpnId -> demandQty

//   for (const ci of costingItems) {
//     const dId = String(ci.drawingId);
//     const mpnId = String(ci.mpn);
//     if (!mpnId) continue;

//     const woQty = woQtyByDrawing.get(dId) || 0;
//     if (woQty <= 0) continue;

//     const needed = Number(ci.quantity || 0) * woQty;

//     demandMap.set(mpnId, (demandMap.get(mpnId) || 0) + needed);
//   }

//   return demandMap;
// }

async function buildDemandMap() {
  const workOrders = await WorkOrder.find({
    isProductionComplete: false,
  })
    .select("_id drawingId quantity")
    .lean();

  if (!workOrders.length) return new Map();

  const woQtyByDrawing = new Map();
  const drawingIds = new Set();

  for (const wo of workOrders) {
    const dId = String(wo.drawingId);
    if (!dId) continue;

    drawingIds.add(dId);
    woQtyByDrawing.set(
      dId,
      (woQtyByDrawing.get(dId) || 0) + Number(wo.quantity || 0)
    );
  }

  const costingItems = await CostingItems.find({
    drawingId: { $in: [...drawingIds] },
    quoteType: "material",
  })
    .populate({
      path: "mpn",
      populate: { path: "UOM", select: "code" },
    })
    .populate("uom", "code")
    .lean();

  const demandMap = new Map();

  for (const ci of costingItems) {
    const dId = String(ci.drawingId);
    const mpnId = String(ci.mpn?._id || ci.mpn);

    if (!mpnId) continue;

    const woQty = woQtyByDrawing.get(dId) || 0;
    if (!woQty) continue;

    const fromUOM = ci?.uom?.code || ci?.mpn?.UOM?.code || "M";

    const qtyInM = convertToBaseUOM(
      Number(ci.quantity || 0),
      fromUOM,
      "M"
    );

    const needed = Number((qtyInM * woQty).toFixed(6));

    demandMap.set(
      mpnId,
      Number(((demandMap.get(mpnId) || 0) + needed).toFixed(6))
    );
  }

  return demandMap;
}

export const buildLowStockDemandMap = async () => {
  const workOrders = await WorkOrder.find({
    isProductionComplete: false,
  })
    .select("_id drawingId workOrderNo quantity needDate")
    .lean();

  if (!workOrders.length) return new Map();

  const drawingWorkOrders = new Map();
  const drawingIds = new Set();

  for (const wo of workOrders) {
    const drawingId = String(wo.drawingId);
    if (!drawingId) continue;

    drawingIds.add(drawingId);

    if (!drawingWorkOrders.has(drawingId)) {
      drawingWorkOrders.set(drawingId, []);
    }

    drawingWorkOrders.get(drawingId).push(wo);
  }

  const costingItems = await CostingItems.find({
    drawingId: { $in: [...drawingIds] },
    quoteType: "material",
  })
    .populate({
      path: "mpn",
      populate: {
        path: "UOM",
        select: "code",
      },
    })
    .populate("uom", "code")
    .lean();

  const demandMap = new Map();

  for (const ci of costingItems) {
    const drawingId = String(ci.drawingId);
    const mpnId = String(ci.mpn?._id || ci.mpn);

    if (!mpnId) continue;

    const workOrders = drawingWorkOrders.get(drawingId) || [];

    const fromUOM =
      ci?.uom?.code ||
      ci?.mpn?.UOM?.code ||
      "M";

    const qtyPerDrawing = convertToBaseUOM(
      Number(ci.quantity || 0),
      fromUOM,
      "M"
    );

    for (const wo of workOrders) {

      const demandQty = Number(
        (qtyPerDrawing * Number(wo.quantity || 0)).toFixed(6)
      );

      const key =
        `${mpnId}_${new Date(wo.needDate)
          .toISOString()
          .split("T")[0]}`;

      if (!demandMap.has(key)) {
        demandMap.set(key, {
          mpnId,
          needDate: wo.needDate,
          demandQty: 0,
          workOrders: [],
        });
      }

      const row = demandMap.get(key);

      row.demandQty = Number(
        (row.demandQty + demandQty).toFixed(6)
      );

     const existingWO = row.workOrders.find(
  w => String(w.workOrderId) === String(wo._id)
);

if (existingWO) {
  existingWO.quantity = Number(
    (existingWO.quantity + demandQty).toFixed(6)
  );
} else {
  row.workOrders.push({
    workOrderId: wo._id,
    workOrderNo: wo.workOrderNo,
    drawingId: wo.drawingId,
    quantity: demandQty,
    needDate: wo.needDate,
  });
}
    }
  }

  return demandMap;
};

const buildPickedMap = async () => {
  const workOrders = await WorkOrder.find({
    isProductionComplete: false,
  }).lean();

  const pickedMap = new Map();

  for (const wo of workOrders) {
    for (const ph of wo.processHistory || []) {
      if (ph.process !== "picking") continue;

      for (const d of ph.details || []) {
        const mpnId = String(d.mpnId || "");
        if (!mpnId) continue;



        const qty = convertToBaseUOM(
          Number(d.pickedQty || 0),
          d.uom || "M",
          "M"
        );

        // ✅ KEY ONLY mpnId
        pickedMap.set(
          mpnId,
          (pickedMap.get(mpnId) || 0) + qty
        );
      }
    }
  }

  return pickedMap;
};

export const getInventoryList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
      view = "all", // all | shortage | incoming | low
    } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.max(parseInt(limit) || 10, 1);

    const filter = {};
    const isViewFiltered = view && view !== "all";

    // ✅ Search fix (MPNLibrary -> mpnIds -> Inventory filter)
    if (search && String(search).trim()) {
      const s = String(search).trim();

      const mpnDocs = await MPN.find({
        $or: [
          { MPN: { $regex: s, $options: "i" } },
          { Description: { $regex: s, $options: "i" } },
          { Manufacturer: { $regex: s, $options: "i" } },
        ],
      })
        .select("_id")
        .lean();

      const mpnIds = mpnDocs.map((d) => d._id);

      if (!mpnIds.length) {
        return res.json({
          success: true,
          data: [],
          total: 0,
          page: pageNum,
          limit: limitNum,
          totalPages: 0,
        });
      }

      filter.mpnId = { $in: mpnIds };
    }

    // ✅ demand map (ONE TIME)
    const demandMap = await buildDemandMap();

    const pickedMap = await buildPickedMap();

    // ✅ total (base)
    let total = 0;

    // ✅ inventory fetch
    let inventoryList = [];

    if (!isViewFiltered) {
      // ✅ FAST: normal pagination at DB level
      total = await Inventory.countDocuments(filter);

      inventoryList = await Inventory.find(filter)
        .populate({
          path: "mpnId",
          select: "MPN Description Manufacturer UOM StorageLocation",
          model: "MPNLibrary",
          populate: { path: "UOM", select: "code" },
        })
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean();
    } else {
      // ✅ view filter case: total must match filtered data, so fetch all (search-filtered)
      inventoryList = await Inventory.find(filter)
        .populate({
          path: "mpnId",
          select: "MPN Description Manufacturer UOM StorageLocation",
          model: "MPNLibrary",
          populate: { path: "UOM", select: "code" },
        })
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .lean();
    }

    // ✅ collect mpnIds from fetched list (page list OR full list)
    const mpnIdsOnList = inventoryList
      .map((x) => x?.mpnId?._id)
      .filter(Boolean);

    // ✅ one-time PO fetch for all mpnIds in this list
    let pendingPOs = [];
    if (mpnIdsOnList.length) {
      pendingPOs = await PurchaseOrders.find({
        // status: { $in: ["Emailed", "Approved", "Acknowledged", "Partially Received"] },
        status: { $in: ["Emailed", "Acknowledged", "Partially Received"] },
        "items.mpn": { $in: mpnIdsOnList },
      })
        .select(
          "poNumber commitDate needDate supplier items.idNumber items.mpn items.uom items.qty items.pendingQty items.receivedQtyTotal items.committedDate items.needDate status createdAt updatedAt"
        )
        .populate("items.mpn", "MPN Description Manufacturer")
        .populate("items.uom", "code")
        .populate("supplier", "companyName email phone contactPerson")
        .lean();
    }

    // ✅ build PO Map: mpnId -> summary
    const poMap = new Map();




    for (const po of pendingPOs) {
      for (const it of po.items || []) {

        const mid = String(
          it?.mpn?._id || it?.mpn || ""
        );

        if (!mid) continue;

        // ✅ find inventory item
        const inventoryItem =
          inventoryList.find(
            (x) =>
              String(x?.mpnId?._id) === mid
          );

        // ✅ raw qty
        const rawRemainingQty =
          Number(it.qty || 0) -
          Number(it.receivedQtyTotal || 0);

        if (rawRemainingQty <= 0)
          continue;

        // ✅ PO UOM
        const poUom =
          it?.uom?.code || "";

        // ✅ Inventory UOM
        const inventoryUom =
          inventoryItem?.mpnId?.UOM?.code || "";

        // ✅ FINAL converted qty
        const remainingQty =
          convertUom({
            qty: rawRemainingQty,
            fromUom: poUom,
            toUom: inventoryUom,
          });

        if (!poMap.has(mid)) {
          poMap.set(mid, {
            totalIncomingQty: 0,
            incomingPONumbers: new Set(),
            earliestCommitDate: null,
            purchaseData: [],
          });
        }

        const entry = poMap.get(mid);

        entry.totalIncomingQty +=
          remainingQty;

        entry.incomingPONumbers.add(
          po.poNumber
        );

        if (it.commitDate) {
          const cd = new Date(
            it.commitDate
          );

          if (
            !entry.earliestCommitDate ||
            cd < entry.earliestCommitDate
          ) {
            entry.earliestCommitDate =
              cd;
          }
        }

        entry.purchaseData.push({
          _id: po._id,
          idNumber: it?.idNumber,
          mpn: it.mpn,
          poNumber: po.poNumber,
          supplier:
            po.supplier || {
              name: "N/A",
            },

          quantity: remainingQty,

          totalQuantity: Number(it.qty || 0) -
            Number(it.receivedQtyTotal || 0),

          UOM: poUom,

          receivedQuantity:
            it.receivedQty || 0,

          needDate: po.needDate
            ? new Date(po.needDate).toLocaleDateString("en-GB")
            : "N/A",

          committedDate:
            it.committedDate
              ? new Date(
                it.committedDate
              ).toLocaleDateString()
              : "N/A",

          status: po.status,
          createdAt: po.createdAt,
          updatedAt: po.updatedAt,

          itemDescription:
            it.mpn?.Description ||
            "N/A",

          itemManufacturer:
            it.mpn?.Manufacturer ||
            "N/A",
        });
      }
    }



    // ✅ attach PO map to each inventory item
    const inventoryWithPOData = inventoryList.map((item) => {
      const mid = String(item.mpnId?._id || "");
      const p = poMap.get(mid);

      return {
        ...item,
        calculatedIncomingQty: p?.totalIncomingQty || 0,
        incomingPONumbers: p ? [...p.incomingPONumbers] : [],
        earliestCommitDate: p?.earliestCommitDate || null,
        purchaseData: p?.purchaseData || [],
      };
    });


    // ✅ transform + Demand + Shortage
    let transformedData = inventoryWithPOData.map((item) => {
      const mpnData = item.mpnId || {};
      const mpnIdStr = String(item.mpnId?._id || "");

      const balanceQty = toNum(item.balanceQuantity);
      const incomingQty = toNum(item.calculatedIncomingQty);


      const demandQty = demandMap.get(mpnIdStr) || 0;
      const pickedQty = pickedMap.get(mpnIdStr) || 0;


      // console.log('------mpnIdStr', mpnIdStr)
      // console.log('-------meter pickedMap', pickedMap)
      // console.log('-------meter demandMap', demandMap)
      // reduce picked globally
      const effectiveDemand = Math.max(demandQty - pickedQty, 0);
      // console.log('------effectiveDemand', effectiveDemand)



      const availableQty = balanceQty + incomingQty;

      const netQty = calcNetQty(
        availableQty,
        effectiveDemand
      );

      const shortageQty = netQty < 0 ? Math.abs(netQty) : 0;

      const surplusQty = netQty > 0 ? netQty : 0;


      let status = "In Stock";

      if (netQty < 0) {
        status = "Out of Stock";
      } else if (netQty <= 10) {
        status = "Low Stock";
      }

      return {
        _id: item._id,
        mpnId: item.mpnId?._id,

        MPN: mpnData.MPN || "N/A",
        Manufacturer: mpnData.Manufacturer || "N/A",
        Description: mpnData.Description || "N/A",
        Storage: mpnData.StorageLocation || "-",
        UOM: mpnData?.UOM?.code || "",

        balanceQuantity: balanceQty.toFixed(4),
        IncomingQty: incomingQty,
        DemandQty: effectiveDemand,
        PickedQty: pickedQty,
        EffectiveDemandQty: effectiveDemand,
        // ✅ IMPORTANT:
        NetQty: netQty,              // raw balance+incoming-demand
        ShortageQty: shortageQty.toFixed(4),    // display/alert qty (negative or 0)
        SurplusQty: surplusQty,      // optional

        IncomingPoNumber: item.incomingPONumbers?.length ? item.incomingPONumbers.join(", ") : "",
        commitDate: item.earliestCommitDate ? new Date(item.earliestCommitDate).toLocaleDateString() : "",

        Status: status,
        purchaseData: item.purchaseData,
        adjustLog: item?.adjustmentLogs
      };
    });


    // ✅ view filters
    if (view === "shortage") transformedData = transformedData.filter((x) => x.NetQty < 0);   // negative only
    if (view === "incoming") transformedData = transformedData.filter((x) => x.IncomingQty > 0);
    if (view === "low") transformedData = transformedData.filter((x) => x.NetQty >= 0);      // zero or positive


    // ✅ FIX: total should match returned data set
    if (isViewFiltered) {
      total = transformedData.length;

      // ✅ paginate AFTER filtering
      const start = (pageNum - 1) * limitNum;
      const end = start + limitNum;
      transformedData = transformedData.slice(start, end);
    }

    return res.json({
      success: true,
      data: transformedData,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error("Get Inventory List Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const adjustInventory = async (req, res) => {
  try {
    const { inventoryId, adjustmentQuantity, reason } = req.body;
    const adjustedBy = req.user._id; // From authentication middleware

    if (!inventoryId || adjustmentQuantity === undefined || !reason) {
      return res.status(400).json({
        success: false,
        message: "Inventory ID, adjustment quantity, and reason are required"
      });
    }

    const inventory = await Inventory.findById(inventoryId)
      .populate({
        path: "mpnId",
        select: "UOM MPN"
      });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory not found"
      });
    }

    if (!inventory.mpnId) {
      return res.status(400).json({
        success: false,
        message: "MPN missing in inventory"
      });
    }



    const baseUomId = inventory.mpnId.UOM; // ✅ BASE UOM (meter / EA)
    console.log('------baseUomId',baseUomId)
console.log("Input Qty:", adjustmentQuantity);

    const baseAdjustmentQty = await convertToMeter({
      qty: adjustmentQuantity,
      fromUom: baseUomId,
    });

    console.log("Converted Qty:", baseAdjustmentQty);

    // Use the static method for transaction safety
    const result = await Inventory.adjustInventory(
      inventoryId,
      baseAdjustmentQty,
      reason,
      adjustedBy
    );

    res.json({
      success: true,
      message: "Inventory adjusted successfully",
      data: {
        inventory: result.inventory,
        adjustment: result.adjustment
      }
    });

  } catch (error) {
    console.error("Adjust Inventory Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const calcNetQty = (balanceQty = 0, demandQty = 0) =>
  toNum(balanceQty) - toNum(demandQty);

const calcShortageAlertQty = (balanceQty = 0, incomingQty = 0, demandQty = 0) => {
  const net = calcNetQty(balanceQty, demandQty);
  return net < 0 ? net : 0; // ✅ key fix
};

const getInventoryStatusV2 = (balanceQty = 0, incomingQty = 0, demandQty = 0) => {
  const shortage = calcShortageAlertQty(balanceQty, incomingQty, demandQty);
  return shortage < 0 ? "Out of Stock" : "Low Stock";
};




// Helper function to determine inventory status
const getInventoryStatus = (balanceQty, incomingQty) => {
  if (balanceQty <= 0 && incomingQty <= 0) return "Out of Stock";
  if (balanceQty <= 0 && incomingQty > 0) return "On Order";
  if (balanceQty < 10) return "Low Stock";
  if (balanceQty >= 10 && balanceQty < 50) return "In Stock";
  return "Well Stocked";
};

// Material Required List - Shortage Calculation
export const getMaterialRequiredList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "shortageQty",
      sortOrder = "desc"
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Build filter
    const filter = {};

    if (search) {
      filter.$or = [
        { MPN: { $regex: search, $options: "i" } },
        { Description: { $regex: search, $options: "i" } },
        { Manufacturer: { $regex: search, $options: "i" } }
      ];
    }


    const demandMap = await buildDemandMap();
    const pickedMap = await buildPickedMap();


    // console.log("Demand Map Size:", demandMap.size);
    // console.log("Picked Map Size:", pickedMap.size);

    // Get all inventory items with MPN data
    const inventoryList = await Inventory.find(filter)
      .populate({
        path: "mpnId",
        select: "MPN Description Manufacturer UOM Supplier",
        model: "MPNLibrary"
      })
      .lean();

    // console.log("Inventory Count:", inventoryList.length);
    // console.log(inventoryList[0]);

    // Calculate shortage for each item
    const materialRequiredList = await Promise.all(
      inventoryList.map(async (item) => {
        try {
          const mpnData = item?.mpnId;
          const mpnId = String(item.mpnId?._id || "");

          const currentQty = Number(item.balanceQuantity || 0);

          const demandQty = Number(demandMap.get(mpnId) || 0);

          const pickedQty = Number(pickedMap.get(mpnId) || 0);

          // Actual remaining material required
          const requiredQty = Math.max(0, demandQty - pickedQty);

          // Inventory shortage
          const shortageQty = Math.max(0, requiredQty - currentQty);

          // Get preferred suppliers
          const supplierId = mpnData.Supplier;

          let supplierNames = "N/A";

          if (supplierId) {
            const supplier = await Supplier.findById(supplierId)
              .select("name")
              .lean();

            supplierNames = supplier?.name || "N/A";
          }

          // Only return items that have shortage or need attention
          if (requiredQty > 0) {
            return {
              _id: item._id,
              MPN: mpnData.MPN || "N/A",
              Description: mpnData.Description || "N/A",
              UOM: mpnData.UOM || "PCS",
              Suppliers: supplierNames,
              CurrentQty: currentQty,
              RequiredQty: requiredQty,
              PickedQty: pickedQty,
              ShortageQty: shortageQty,
              mpnId,
            };
          }
          return null;
        } catch (error) {
          console.error(`Error processing MPN ${item.mpnId?.MPN}:`, error);
          return null;
        }
      })
    );

    // Filter out null values and paginate
    const filteredList = materialRequiredList.filter(item => item !== null);

    // Apply sorting
    const sortedList = filteredList.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (sortOrder === "desc") {
        return bValue - aValue;
      }
      return aValue - bValue;
    });

    // Apply pagination
    const paginatedList = sortedList.slice(
      (pageNum - 1) * limitNum,
      pageNum * limitNum
    );

    res.json({
      success: true,
      data: paginatedList,
      total: filteredList.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(filteredList.length / limitNum)
    });

  } catch (error) {
    console.error("Get Material Required List Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function for shortage status
const getShortageStatus = (currentQty, minStockLevel) => {
  if (currentQty <= 0) return "Out of Stock";
  if (currentQty < minStockLevel * 0.3) return "Critical Shortage";
  if (currentQty < minStockLevel * 0.6) return "High Shortage";
  if (currentQty < minStockLevel) return "Low Stock";
  return "Adequate";
};


// import Inventory from "../models/Inventory.js";
// import MPN from "../models/MPN.js";
// import SystemSettings from "../models/SystemSettings.js"; // apna model name same rakho

const weeksBetween = (from, to) => {
  const diffMs = new Date(to).getTime() - new Date(from).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
};

export const getLowStockAlerts = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "urgency",
      sortOrder = "desc",
    } = req.query;

    page = Number(page) || 1;
    limit = Number(limit) || 10;
    const skip = (page - 1) * limit;


    const demandMap = await buildLowStockDemandMap();
    const pickedMap = await buildPickedMap();

    // ✅ 0) Load system thresholds (fallback values)
    const settings = await SystemSettings.findOne({}).lean();
    // console.log('-----settings', settings?.inventoryAlerts)
    const criticalWeeksLeft = settings?.inventoryAlerts?.criticalWeeksLeft ?? 2;
    const urgentWeeksLeft = settings?.inventoryAlerts?.urgentWeeksLeft ?? 3;
    const normalWeeksLeft = settings?.inventoryAlerts?.normalWeeksLeft ?? 6;

    // ✅ 1) MPN search filter
    const mpnFilter = {};
    if (search) {
      mpnFilter.$or = [
        { MPN: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { manufacturer: { $regex: search, $options: "i" } },
      ];
    }

    const mpnList = await MPN.find(mpnFilter)
      .select("MPN description manufacturer uom leadTimeWeeks")
      .lean();

    if (!mpnList?.length) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        counts: { critical: 0, urgent: 0, normal: 0 },
        thresholds: { criticalWeeksLeft, urgentWeeksLeft, normalWeeksLeft }
      });
    }

    const mpnIds = mpnList.map((m) => m._id);

    // ✅ 2) Inventories + workOrders
    const inventories = await Inventory.find({ mpnId: { $in: mpnIds } })
      .populate("mpnId", "MPN Description Manufacturer uom leadTimeWeeks")
      .select("mpnId balanceQuantity location workOrders updatedAt")
      .lean();

    const costingItems = await CostingItems.find({
      mpn: { $in: mpnIds },
    })
      .select("mpn drawingId")
      .lean();


    const mpnDrawingMap = new Map();

    for (const item of costingItems) {
      const mpnId = String(item.mpn);

      if (!mpnDrawingMap.has(mpnId)) {
        mpnDrawingMap.set(mpnId, new Set());
      }

      mpnDrawingMap.get(mpnId).add(String(item.drawingId));
    }


    const allDrawingIds = [
      ...new Set(costingItems.map(x => String(x.drawingId)))
    ];

    const workOrderDocs = await WorkOrder.find({
      drawingId: { $in: allDrawingIds }
    })
      .select("_id drawingId workOrderNo needDate quantity")
      .lean();


    const drawingWorkOrderMap = new Map();

    for (const wo of workOrderDocs) {
      const key = String(wo.drawingId);

      if (!drawingWorkOrderMap.has(key)) {
        drawingWorkOrderMap.set(key, []);
      }

      drawingWorkOrderMap.get(key).push(wo);
    }

    // ✅ 3) Build alerts
    const now = new Date();

    const alerts = inventories
      .map((inv) => {
        const mpn = inv.mpnId;



        // const drawingIds = [...new Set(costingItems.map(c => c.drawingId))];


        const mpnId = String(inv.mpnId._id);

        const drawingIds = [...(mpnDrawingMap.get(mpnId) || [])];

        const workOrders = [
          ...new Map(
            drawingIds
              .flatMap(id => drawingWorkOrderMap.get(id) || [])
              .map(w => [String(w._id), w])
          ).values()
        ];


        const currentStock = Number(inv.balanceQuantity || 0);

        // const mpnId = String(inv.mpnId?._id || inv.mpnId);

        const demandRows = [...demandMap.values()]
          .filter(x => x.mpnId === mpnId)
          .sort(
            (a, b) =>
              new Date(a.needDate) - new Date(b.needDate)
          );

        if (!demandRows.length) {
          return null;
        }

        let availableStock =
          currentStock -
          Number(pickedMap.get(mpnId) || 0);

        const rows = [];

        for (const row of demandRows) {

          availableStock -= row.demandQty;

          const shortfall =
            Math.max(0, -availableStock);

            if (!shortfall) return null;

          const weeksLeft = weeksBetween(
            new Date(),
            row.needDate
          );

          let urgency = "normal";

          if (weeksLeft <= criticalWeeksLeft) {
            urgency = "critical";
          } else if (weeksLeft <= urgentWeeksLeft) {
            urgency = "urgent";
          }

          rows.push({

            mpnId: mpn._id,

            mpnNumber: mpn.MPN,

            description: mpn.Description,

            manufacturer: mpn.Manufacturer,

            uom: mpn.uom,

            currentStock,

            totalRequired: row.demandQty,

            shortfall,

            earliestNeedDate: row.needDate,

            weeksLeft,

            urgency,

            workOrders: row.workOrders,

            lastUpdated: inv.updatedAt

          });


        }

        return rows;
      })
  .flat()
      .filter(Boolean);

    // ✅ 4) Sorting
    const urgencyOrder = { critical: 3, urgent: 2, normal: 1 };

    const sorted = alerts.sort((a, b) => {
      if (sortBy === "urgency") {
        const av = urgencyOrder[a.urgency] ?? 0;
        const bv = urgencyOrder[b.urgency] ?? 0;
        return sortOrder === "desc" ? bv - av : av - bv;
      }

      const av = a[sortBy];
      const bv = b[sortBy];

      if (typeof av === "number" && typeof bv === "number") {
        return sortOrder === "desc" ? bv - av : av - bv;
      }
      if (av instanceof Date && bv instanceof Date) {
        return sortOrder === "desc" ? bv - av : av - bv;
      }
      return String(av ?? "").localeCompare(String(bv ?? ""));
    });

    // ✅ 5) Pagination
    const total = sorted.length;
    const data = sorted.slice(skip, skip + limit);

    // ✅ counts
    const counts = {
      critical: alerts.filter(a => a.urgency === "critical").length,
      urgent: alerts.filter(a => a.urgency === "urgent").length,
      normal: alerts.filter(a => a.urgency === "normal").length,
    };

    return res.json({
      success: true,
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      counts,
      thresholds: { criticalWeeksLeft, urgentWeeksLeft, normalWeeksLeft }
    });
  } catch (error) {
    console.error("getLowStockAlerts Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


// export const getLowStockAlerts = async (req, res) => {
//   try {
//     let {
//       page = 1,
//       limit = 10,
//       search = "",
//       sortBy = "urgency",
//       sortOrder = "desc",
//     } = req.query;

//     const pageNum = parseInt(page, 10);
//     const limitNum = parseInt(limit, 10);

//     // 1️⃣ Pehle MPNLibrary se data lo (MPN, Description, Manufacturer, min/max stock)
//     const mpnFilter = {};

//     if (search) {
//       mpnFilter.$or = [
//         { MPN: { $regex: search, $options: "i" } },
//         { Description: { $regex: search, $options: "i" } },
//         { Manufacturer: { $regex: search, $options: "i" } },
//       ];
//     }

//     const mpnList = await MPN.find(mpnFilter)
//       .select("MPN Description Manufacturer UOM minStockLevel maxStockLevel")
//       .lean();

//     if (!mpnList || mpnList.length === 0) {
//       return res.json({
//         success: true,
//         data: [],
//         total: 0,
//         page: pageNum,
//         limit: limitNum,
//         totalPages: 0,
//         criticalCount: 0,
//         highCount: 0,
//       });
//     }

//     const mpnIds = mpnList.map((m) => m._id);

//     // 2️⃣ Ab Inventory se matching records lo
//     const inventoryList = await Inventory.find({ mpnId: { $in: mpnIds } })
//       .select("mpnId balanceQuantity incomingQuantity updatedAt")
//       .lean();

//     // Map for quick lookup
//     const inventoryMap = {};
//     inventoryList.forEach((inv) => {
//       inventoryMap[String(inv.mpnId)] = inv;
//     });

//     // 3️⃣ Ab combined data se low-stock alerts banao
//     const lowStockAlerts = mpnList
//       .map((mpn) => {
//         const inv = inventoryMap[String(mpn._id)] || {};
//         const currentQty = inv.balanceQuantity || 0;
//         const minStock = mpn.minStockLevel || 10; // default min
//         const maxStock = mpn.maxStockLevel || 50; // default max

//         if (minStock <= 0) {
//           // agar minStock define hi nahi hai / 0 hai to alert mat bana
//           return null;
//         }

//         const stockPercentage = (currentQty / minStock) * 100;

//         let urgency = "Low";
//         let alertType = "Info";

//         if (currentQty === 0) {
//           urgency = "Critical";
//           alertType = "Out of Stock";
//         } else if (currentQty < minStock * 0.2) {
//           urgency = "High";
//           alertType = "Critical Shortage";
//         } else if (currentQty < minStock * 0.5) {
//           urgency = "Medium";
//           alertType = "Low Stock";
//         } else if (currentQty < minStock) {
//           urgency = "Low";
//           alertType = "Below Minimum";
//         } else {
//           // stock theek hai → alert ki zarurat nahi
//           return null;
//         }

//         return {
//           _id: mpn._id,
//           MPN: mpn.MPN || "N/A",
//           Description: mpn.Description || "N/A",
//           Manufacturer: mpn.Manufacturer || "N/A",
//           UOM: mpn.UOM || "PCS",

//           CurrentStock: currentQty,
//           MinStock: minStock,
//           MaxStock: maxStock,
//           StockPercentage: Math.round(stockPercentage),

//           AlertType: alertType,
//           Urgency: urgency,

//           RecommendedOrder: Math.max(minStock - currentQty, 0),

//           LastUpdated: inv.updatedAt || new Date(),
//         };
//       })
//       .filter((item) => item !== null);

//     // 4️⃣ Sorting
//     const urgencyOrder = { Critical: 3, High: 2, Medium: 1, Low: 0 };

//     const sortedAlerts = lowStockAlerts.sort((a, b) => {
//       if (sortBy === "urgency") {
//         const aUrg = urgencyOrder[a.Urgency] ?? 0;
//         const bUrg = urgencyOrder[b.Urgency] ?? 0;
//         return sortOrder === "desc" ? bUrg - aUrg : aUrg - bUrg;
//       }

//       const aValue = a[sortBy];
//       const bValue = b[sortBy];

//       // Numeric sort
//       if (typeof aValue === "number" && typeof bValue === "number") {
//         return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
//       }

//       // String sort
//       if (typeof aValue === "string" && typeof bValue === "string") {
//         if (sortOrder === "desc") return bValue.localeCompare(aValue);
//         return aValue.localeCompare(bValue);
//       }

//       return 0;
//     });

//     // 5️⃣ Pagination
//     const total = sortedAlerts.length;
//     const paginatedAlerts = sortedAlerts.slice(
//       (pageNum - 1) * limitNum,
//       pageNum * limitNum
//     );

//     // 6️⃣ Final response


//     res.json({
//       success: true,
//       data: paginatedAlerts,
//       total: lowStockAlerts.length,
//       page: pageNum,
//       limit: limitNum,
//       totalPages: Math.ceil(lowStockAlerts.length / limitNum),
//       criticalCount: lowStockAlerts.filter(a => a.Urgency === "Critical").length,
//       highCount: lowStockAlerts.filter(a => a.Urgency === "High").length
//     });

//   } catch (error) {
//     console.error("Get Low Stock Alerts Error:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };


export const exportExcel = async (req, res) => {
  try {
    const { search = "" } = req.query;

    // console.log("Exporting inventory data to Excel...");

    const invFilter = {};

    // ✅ Search should be on MPNLibrary, then filter Inventory by mpnId
    if (search && String(search).trim()) {
      const s = String(search).trim();

      const mpnDocs = await MPN.find({
        $or: [
          { MPN: { $regex: s, $options: "i" } },
          { Description: { $regex: s, $options: "i" } },
          { Manufacturer: { $regex: s, $options: "i" } },
        ],
      })
        .select("_id")
        .lean();

      const mpnIds = mpnDocs.map((d) => d._id);

      if (!mpnIds.length) {
        // ✅ empty export (no matches)
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet([]);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory List");
        const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

        const fileName = `inventory-export-${Date.now()}.xlsx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
        return res.send(buffer);
      }

      invFilter.mpnId = { $in: mpnIds };
    }

    // ✅ demand map (ONE TIME)
    const demandMap = await buildDemandMap();

    // ✅ get inventory
    const inventoryList = await Inventory.find(invFilter)
      .populate({
        path: "mpnId",
        select: "MPN Description Manufacturer UOM StorageLocation minStockLevel unitPrice",
        model: "MPNLibrary",
        populate: { path: "UOM", select: "code" },
      })
      .sort({ createdAt: -1 })
      .lean();

    // ✅ collect mpnIds for PO calculation
    const mpnIds = inventoryList.map((x) => x?.mpnId?._id).filter(Boolean);

    // ✅ fetch all pending POs for these mpnIds (single query)
    let pendingPOs = [];
    if (mpnIds.length) {
      pendingPOs = await PurchaseOrders.find({
        status: { $in: ["Pending", "Approved", "Partially Received"] },
        "items.mpn": { $in: mpnIds },
      })
        .select("poNumber supplier items.mpn items.qty items.receivedQty items.commitDate items.needDate status createdAt updatedAt")
        .populate("items.mpn", "MPN Description Manufacturer")
        .populate("supplier", "name contactEmail phoneNumber")
        .lean();
    }

    // ✅ build PO map: mpnId -> incomingQty + poNumbers + earliestCommitDate
    const poMap = new Map();

    for (const po of pendingPOs) {
      for (const it of po.items || []) {
        const mid = String(it?.mpn?._id || it?.mpn || "");
        if (!mid) continue;

        const remaining = Number(it.qty || 0) - Number(it.receivedQty || 0);
        if (remaining <= 0) continue;

        if (!poMap.has(mid)) {
          poMap.set(mid, {
            incomingQty: 0,
            poNumbers: new Set(),
            earliestCommitDate: null,
          });
        }

        const entry = poMap.get(mid);
        entry.incomingQty += remaining;
        entry.poNumbers.add(po.poNumber);

        if (it.commitDate) {
          const cd = new Date(it.commitDate);
          if (!entry.earliestCommitDate || cd < entry.earliestCommitDate) entry.earliestCommitDate = cd;
        }
      }
    }

    // ✅ Transform data for Excel
    const exportData = inventoryList.map((item, index) => {
      const mpnData = item.mpnId || {};
      const mpnIdStr = String(mpnData?._id || "");

      const balanceQty = Number(item.balanceQuantity || 0);
      const incomingQty = Number(poMap.get(mpnIdStr)?.incomingQty || 0);
      const demandQty = Number(demandMap.get(mpnIdStr) || 0);

      const shortageQty = calcShortageQty(balanceQty, incomingQty, demandQty);
      const status = getInventoryStatusV2(balanceQty, incomingQty, demandQty);

      const poNumbers = poMap.get(mpnIdStr)?.poNumbers
        ? [...poMap.get(mpnIdStr).poNumbers].join(", ")
        : "";

      const commitDate = poMap.get(mpnIdStr)?.earliestCommitDate
        ? new Date(poMap.get(mpnIdStr).earliestCommitDate).toLocaleDateString()
        : "";

      const minStockLevel = Number(mpnData.minStockLevel || 0);
      const unitPrice = Number(mpnData.unitPrice || 0);
      const totalValue = balanceQty * unitPrice;

      return {
        "Running No.": index + 1,
        "MPN": mpnData.MPN || "N/A",
        "Manufacturer": mpnData.Manufacturer || "N/A",
        "Description": mpnData.Description || "N/A",
        "UOM": mpnData?.UOM?.code || "PCS",
        "Storage Location": mpnData.StorageLocation || "-",

        "Balance Qty": balanceQty,
        "Incoming Qty": incomingQty,
        "Demand Qty": demandQty,
        "Shortage Qty": shortageQty,

        "Incoming PO Numbers": poNumbers,
        "Earliest Commit Date": commitDate,

        "Min Stock Level": minStockLevel,
        "Unit Price": unitPrice,
        "Total Value": totalValue,

        "Status": status,
      };
    });

    // ✅ Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // ✅ set column widths
    worksheet["!cols"] = [
      { wch: 12 }, // Running No.
      { wch: 18 }, // MPN
      { wch: 22 }, // Manufacturer
      { wch: 45 }, // Description
      { wch: 8 },  // UOM
      { wch: 18 }, // Storage

      { wch: 12 }, // Balance
      { wch: 12 }, // Incoming
      { wch: 12 }, // Demand
      { wch: 12 }, // Shortage

      { wch: 35 }, // PO Numbers
      { wch: 18 }, // Commit date

      { wch: 15 }, // Min stock
      { wch: 12 }, // Unit price
      { wch: 15 }, // Total value

      { wch: 14 }, // Status
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory List");

    // ✅ buffer
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    const fileName = `inventory-export-${Date.now()}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    // console.log(`Inventory exported. Total records: ${exportData.length}`);
    return res.send(excelBuffer);
  } catch (error) {
    console.error("Export Excel Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to export inventory data",
    });
  }
};


export const exportMaterialRequiredExcel = async (req, res) => {
  try {
    const {
      search = ""
    } = req.query;

    // ---- Fetch original data using list logic ----
    const filter = {};

    if (search) {
      filter.$or = [
        { MPN: { $regex: search, $options: "i" } },
        { Description: { $regex: search, $options: "i" } },
        { Manufacturer: { $regex: search, $options: "i" } }
      ];
    }

    // Get all inventory with mpn data
    const inventoryList = await Inventory.find(filter)
      .populate({
        path: "mpnId",
        select: "MPN Description Manufacturer UOM minStockLevel preferredSuppliers",
        model: "MPNLibrary"
      })
      .lean();

    const excelData = [];

    for (const item of inventoryList) {
      if (!item.mpnId) continue;

      const mpn = item.mpnId.MPN || "N/A";
      const desc = item.mpnId.Description || "N/A";
      const uom = item.mpnId.UOM || "PCS";
      const currentQty = item.balanceQuantity || 0;
      const requiredQty = item.mpnId.minStockLevel || 0;
      const shortageQty = Math.max(0, requiredQty - currentQty);

      // Only include shortage rows
      if (shortageQty <= 0) continue;

      excelData.push({
        "MPN": mpn,
        "Description": desc,
        "UOM": uom,
        "Current Qty": currentQty,
        "Required Qty": requiredQty,
        "Shortage Qty": shortageQty,
      });
    }

    if (excelData.length === 0) {
      return res.status(200).json({
        success: false,
        message: "No shortage items found"
      });
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    ws["!cols"] = Object.keys(excelData[0]).map((c) => ({
      wch: Math.max(15, c.length + 2)
    }));

    XLSX.utils.book_append_sheet(wb, ws, "Material Required");
    const xlsBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Download
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=material-required.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    return res.end(xlsBuffer);
  } catch (error) {
    console.error("exportMaterialRequiredExcel Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportInventoryListExcel = async (req, res) => {
  try {
    const { search = "" } = req.query;

    // ✅ Inventory filter (mpnId based)
    const invFilter = {};

    // ✅ Search should be on MPNLibrary then apply to Inventory by mpnId
    if (search && String(search).trim()) {
      const s = String(search).trim();

      const mpnDocs = await MPN.find({
        $or: [
          { MPN: { $regex: s, $options: "i" } },
          { Description: { $regex: s, $options: "i" } },
          { Manufacturer: { $regex: s, $options: "i" } },
        ],
      })
        .select("_id")
        .lean();

      const mpnIds = mpnDocs.map((d) => d._id);

      if (!mpnIds.length) {
        // ✅ return empty excel
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet([]);
        XLSX.utils.book_append_sheet(wb, ws, "Inventory List");
        const xlsBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        res.setHeader("Content-Disposition", "attachment; filename=inventory-list.xlsx");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        return res.end(xlsBuffer);
      }

      invFilter.mpnId = { $in: mpnIds };
    }

    // ✅ demand map once
    const demandMap = await buildDemandMap();

    // ✅ fetch inventory + populate UOM.code
    const inventoryList = await Inventory.find(invFilter)
      .populate({
        path: "mpnId",
        select: "MPN Description Manufacturer UOM StorageLocation",
        model: "MPNLibrary",
        populate: { path: "UOM", select: "code" },
      })
      .sort({ createdAt: -1 })
      .lean();

    // ✅ mpnIds for PO incoming
    const mpnIdsOnList = inventoryList.map((x) => x?.mpnId?._id).filter(Boolean);

    // ✅ one PO query
    let pendingPOs = [];
    if (mpnIdsOnList.length) {
      pendingPOs = await PurchaseOrders.find({
        status: { $in: ["Pending", "Approved", "Partially Received"] },
        "items.mpn": { $in: mpnIdsOnList },
      })
        .select("poNumber items.mpn items.qty items.receivedQty items.commitDate")
        .lean();
    }

    // ✅ PO map: mpnId -> incomingQty + poNumbers + earliestCommitDate
    const poMap = new Map();

    for (const po of pendingPOs) {
      for (const it of po.items || []) {
        const mid = String(it?.mpn || "");
        if (!mid) continue;

        const remaining = Number(it.qty || 0) - Number(it.receivedQty || 0);
        if (remaining <= 0) continue;

        if (!poMap.has(mid)) {
          poMap.set(mid, {
            incomingQty: 0,
            poNumbers: new Set(),
            earliestCommitDate: null,
          });
        }

        const entry = poMap.get(mid);
        entry.incomingQty += remaining;
        entry.poNumbers.add(po.poNumber);

        if (it.commitDate) {
          const cd = new Date(it.commitDate);
          if (!entry.earliestCommitDate || cd < entry.earliestCommitDate) entry.earliestCommitDate = cd;
        }
      }
    }

    // ✅ excel rows
    const excelData = inventoryList.map((item, idx) => {
      const mpn = item.mpnId || {};
      const mpnIdStr = String(mpn?._id || "");

      const balanceQty = Number(item.balanceQuantity || 0);
      const incomingQty = Number(poMap.get(mpnIdStr)?.incomingQty || 0);
      const demandQty = Number(demandMap.get(mpnIdStr) || 0);

      const shortageQty = calcShortageQty(balanceQty, incomingQty, demandQty);
      const status = getInventoryStatusV2(balanceQty, incomingQty, demandQty);

      const poNumbers = poMap.get(mpnIdStr)?.poNumbers ? [...poMap.get(mpnIdStr).poNumbers].join(", ") : "";
      const commitDate = poMap.get(mpnIdStr)?.earliestCommitDate
        ? new Date(poMap.get(mpnIdStr).earliestCommitDate).toLocaleDateString()
        : "";

      return {
        "Running No.": idx + 1,
        "MPN": mpn.MPN || "N/A",
        "Description": mpn.Description || "N/A",
        "Manufacturer": mpn.Manufacturer || "N/A",
        "UOM": mpn?.UOM?.code || (typeof mpn.UOM === "string" ? mpn.UOM : "PCS"),
        "Storage Location": mpn.StorageLocation || "Main",

        "Balance Qty": balanceQty,
        "Incoming Qty": incomingQty,
        "Demand Qty": demandQty,
        "Shortage Qty": shortageQty,
        "Status": status,

        "Incoming PO Numbers": poNumbers,
        "Earliest Commit Date": commitDate,
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // ✅ safe cols even when empty
    const headers = excelData?.[0] ? Object.keys(excelData[0]) : [];
    ws["!cols"] = headers.map((c) => ({ wch: Math.max(15, c.length + 2) }));

    XLSX.utils.book_append_sheet(wb, ws, "Inventory List");
    const xlsBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", `attachment; filename=inventory-list-${Date.now()}.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    return res.end(xlsBuffer);
  } catch (error) {
    console.error("exportInventoryListExcel Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const exportInventoryAlertsExcel = async (req, res) => {
  try {
    const { search = "" } = req.query;

    const filter = {};

    if (search) {
      filter.$or = [
        { MPN: { $regex: search, $options: "i" } },
        { Description: { $regex: search, $options: "i" } }
      ];
    }

    const inventoryList = await Inventory.find(filter)
      .populate({
        path: "mpnId",
        select: "MPN Description Manufacturer UOM minStockLevel maxStockLevel",
        model: "MPNLibrary"
      })
      .lean();

    const excelData = [];

    for (const item of inventoryList) {
      const mpn = item.mpnId?.MPN || "N/A";
      const desc = item.mpnId?.Description || "N/A";
      const current = item.balanceQuantity || 0;
      const min = item.mpnId?.minStockLevel || 10;

      if (current >= min) continue; // No alert

      excelData.push({
        "MPN": mpn,
        "Description": desc,
        "Current Stock": current,
        "Minimum Stock": min,
        "Shortage": Math.max(min - current, 0),
        "Urgency": current === 0 ? "Critical" : current < min * 0.5 ? "High" : "Low",
      });
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    ws["!cols"] = Object.keys(excelData[0]).map((c) => ({
      wch: Math.max(15, c.length + 2)
    }));

    XLSX.utils.book_append_sheet(wb, ws, "Alerts");

    const xlsBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=inventory-alerts.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    return res.end(xlsBuffer);
  } catch (error) {
    console.error("exportInventoryAlertsExcel Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addShortage = async (req, res) => {
  try {
    const {
      mpnId,
      workOrderId,
      drawingId,
      requiredQty,
      pickedQty,
      needDate,
      workOrderNo,
    } = req.body;

    if (!mpnId || !workOrderId || !requiredQty) {
      return res.status(400).json({
        success: false,
        message: "mpnId, workOrderId, and requiredQty are required",
      });
    }

    if (requiredQty <= 0) {
      return res.status(400).json({
        success: false,
        message: "requiredQty must be greater than 0",
      });
    }

    const inv = await Inventory.findOne({ mpnId });

    if (!inv) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    // Ensure array exists
    if (!Array.isArray(inv.workOrders)) {
      inv.workOrders = [];
    }

    // 🔍 Check if this WO already exists in shortage list
    const existingIndex = inv.workOrders.findIndex(
      (w) => String(w.workOrderId) === String(workOrderId)
    );

    if (existingIndex >= 0) {
      // ✅ UPDATE existing shortage entry
      const existing = inv.workOrders[existingIndex];

      existing.requiredQty = requiredQty;
      existing.pickedQty = pickedQty;
      existing.needDate = needDate || existing.needDate;
      existing.workOrderNo = workOrderNo || existing.workOrderNo;
      existing.drawingId = drawingId || existing.drawingId;

      // if requiredQty becomes 0 in future, optionally remove:
      // if (requiredQty <= 0) inv.shortageWorkOrders.splice(existingIndex, 1);
    } else {
      // ✅ ADD new shortage entry
      inv.workOrders.push({
        workOrderId,
        workOrderNo,
        drawingId,
        requiredQty,
        pickedQty,
        needDate,
      });
    }

    await inv.save();

    return res.json({
      success: true,
      message: "Shortage updated successfully",
      data: inv.workOrders,
    });
  } catch (err) {
    console.error("Error addShortage:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
export const getMaterialShortages = async (req, res) => {
  try {
    const { mpnId, workOrderId, search } = req.query;

    // ✅ only in production + not completed
    const workOrders = await WorkOrder.find({
      isInProduction: true,
      isProductionComplete: false,
      ...(workOrderId ? { _id: workOrderId } : {}),
    }).lean();

    if (!workOrders.length) {
      return res.json({
        success: true,
        message: "No shortages found",
        data: [],
      });
    }

    // ✅ collect all shortage mpnIds
    const mpnIds = new Set();

    workOrders.forEach((wo) => {
      (wo.processHistory || []).forEach((ph) => {
        (ph.details || []).forEach((d) => {
          const shortageQty = Number(d.shortageQty || 0);

          if (
            (d.shortage === true || shortageQty > 0) &&
            d.mpnId
          ) {
            mpnIds.add(String(d.mpnId));
          }
        });
      });
    });

    // ✅ fetch mpn details
    const mpnDocs = await MPN.find({
      _id: { $in: [...mpnIds] },
    })
      .populate("UOM", "code")
      .lean();

    const mpnMap = new Map(
      mpnDocs.map((m) => [String(m._id), m])
    );

    const searchText = String(search || "")
      .trim()
      .toLowerCase();

    const shortages = [];

    // ✅ build shortages directly from processHistory.details
    workOrders.forEach((wo) => {
      (wo.processHistory || []).forEach((ph) => {
        (ph.details || []).forEach((d) => {
          const shortageQty = Number(d.shortageQty || 0);

          // ✅ only shortages
          if (
            d.shortage !== true &&
            shortageQty <= 0
          ) {
            return;
          }

          // ✅ optional mpn filter
          if (
            mpnId &&
            String(d.mpnId) !== String(mpnId)
          ) {
            return;
          }

          const mpnData = mpnMap.get(String(d.mpnId));

          const mpnCode = String(
            mpnData?.MPN || d.mpn || ""
          ).toLowerCase();

          const description = String(
            mpnData?.Description || ""
          ).toLowerCase();

          const woNo = String(
            wo.workOrderNo || ""
          ).toLowerCase();

          // ✅ search filter
          if (searchText) {
            const match =
              mpnCode.includes(searchText) ||
              description.includes(searchText) ||
              woNo.includes(searchText);

            if (!match) return;
          }

          // console.log("MPN FILTER", {
          //   requestMpnId: mpnId,
          //   detailMpnId: d.mpnId,
          // });

          shortages.push({
            workOrderId: wo._id,
            workOrderNo: wo.workOrderNo,

            drawingId: wo.drawingId,
            projectId: wo.projectId,
            projectType: wo.projectType,

            process: ph.process,

            mpnId: d.mpnId,

            mpn:
              mpnData?.MPN ||
              d.mpn ||
              "",

            description:
              mpnData?.Description || "",

            manufacturer:
              mpnData?.Manufacturer || "",

            uom:
              d.uom ||
              mpnData?.UOM?.code ||
              "",

            requiredQty: Number(d.quantity || 0),

            pickedQty: Number(d.pickedQty || 0),

            shortageQty: shortageQty,

            shortage: true,

            needDate: wo.needDate,

            status: wo.status,

            createdAt: wo.createdAt,

            pickedAt: d.pickedAt || null,
          });
        });
      });
    });

    return res.json({
      success: true,
      message: "Material shortages fetched successfully",
      count: shortages.length,
      data: shortages,
    });
  } catch (err) {
    console.error(
      "Error getMaterialShortages:",
      err
    );

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// export const getMaterialShortages = async (req, res) => {
//   try {
//     const { mpnId, workOrderId, search } = req.query;

//     const query = {
//       "workOrders.0": { $exists: true },
//     };

//     if (mpnId) query.mpnId = mpnId;
//     if (workOrderId) query["workOrders.workOrderId"] = workOrderId;

//     const inventories = await Inventory.find(query)
//       .populate("mpnId", "MPN description uom")
//       .lean();

//     const shortages = [];
//     // ✅ SEARCH FILTER
//     const searchText = String(search || "")
//       .trim()
//       .toLowerCase();


//     inventories.forEach((inv) => {

//       (inv.workOrders || []).forEach((wo) => {
//         console.log('-----search', inv)
//         // ✅ WorkOrder filter
//         if (workOrderId && String(wo.workOrderId) !== String(workOrderId)) {
//           return;
//         }



//         if (searchText) {

//           const mpn = String(
//             inv?.mpnId?.MPN || ""
//           )
//             .trim()
//             .toLowerCase();

//           const description = String(
//             inv?.mpnId?.description || ""
//           )
//             .trim()
//             .toLowerCase();

//           const workOrderNo = String(
//             wo?.workOrderNo || ""
//           )
//             .trim()
//             .toLowerCase();

//           const match =
//             mpn.includes(searchText) ||
//             description.includes(searchText) ||
//             workOrderNo.includes(searchText);

//           if (!match) {
//             return;
//           }
//         }

//         shortages.push({
//           mpnId: inv.mpnId?._id || inv.mpnId,
//           mpn: inv.mpnId?.MPN || "",
//           description: inv.mpnId?.description || "",
//           uom: inv.mpnId?.uom || "",
//           balanceQuantity: inv.balanceQuantity,
//           stockStatus: inv.stockStatus,

//           workOrderId: wo.workOrderId,
//           workOrderNo: wo.workOrderNo,
//           drawingId: wo.drawingId,
//           requiredQty: wo.requiredQty,
//           pickedQty: wo?.pickedQty,
//           needDate: wo.needDate,
//           createdAt: wo.createdAt,
//         });
//       });
//     });

//     return res.json({
//       success: true,
//       message: "Material shortages fetched",
//       data: shortages,
//     });

//   } catch (err) {
//     console.error("Error getMaterialShortages:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// export const getMaterialShortages = async (req, res) => {
//   try {
//     const { mpnId, workOrderId } = req.query;

//     const query = {
//       "workOrders.0": { $exists: true },
//     };

//     if (mpnId) query.mpnId = mpnId;
//     if (workOrderId) query["workOrders.workOrderId"] = workOrderId;

//     const inventories = await Inventory.find(query)
//       .populate("mpnId", "MPN description uom")
//       .lean();

//     const shortages = [];

//     inventories.forEach((inv) => {
//       (inv.workOrders || []).forEach((wo) => {

//         // agar specific WO chaahiye, filter here
//         if (workOrderId && String(wo.workOrderId) !== String(workOrderId)) {
//           return;
//         }

//         shortages.push({
//           // Inventory level fields
//           mpnId: inv.mpnId?._id || inv.mpnId,
//           mpn: inv.mpnId?.MPN || "",
//           description: inv.mpnId?.description || "",
//           uom: inv.mpnId?.uom || "",
//           balanceQuantity: inv.balanceQuantity,
//           stockStatus: inv.stockStatus,

//           // ❌ DON'T SEND FULL ARRAY (was wrong)
//           // workOrders: inv.workOrders,

//           // ✅ Only this WO as separate item
//           workOrderId: wo.workOrderId,
//           workOrderNo: wo.workOrderNo,
//           drawingId: wo.drawingId,
//           requiredQty: wo.requiredQty,
//           pickedQty: wo?.pickedQty,
//           needDate: wo.needDate,
//           createdAt: wo.createdAt,
//         });
//       });
//     });

//     return res.json({
//       success: true,
//       message: "Material shortages fetched",
//       data: shortages,
//     });

//   } catch (err) {
//     console.error("Error getMaterialShortages:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

export const getCompleteDrawingsMTO = async (req, res) => {
  try {
    let { page = 1, limit = 20, search } = req.query;

    page = Number(page) || 1;
    limit = Number(limit) || 20;
    const skip = (page - 1) * limit;

    // 1️⃣ Base query: sirf woh WorkOrders jo drawing ke saath linked hain
    const woQuery = {
      drawingId: { $exists: true, $ne: null },
      // QC Done
      isProductionComplete: true,

      // Delivered nahi hona chahiye
      delivered: { $ne: true }
    };

    // woQuery.isProductionComplete = true

    // Optional search on drawing no / project / customer later handle karenge UI level par
    // Ya tum yaha bhi search attach kar sakte ho (agar drawingNo, projectName ke basis par chahiye to aggregation se karein)

    // 2️⃣ Fetch WorkOrders (no pagination yaha, aggregation drawing level par hai)
    const workOrders = await WorkOrder.find(woQuery)
      .select(
        "drawingId doNumber quantity poNumber status completeDate  delivered projectId workOrderNo isInProduction"
      )
      .lean();

    if (!workOrders.length) {
      return res.json({
        success: true,
        message: "No work orders found for drawings",
        data: [],
        pagination: { total: 0, page, limit, pages: 0 },
      });
    }

    // 3️⃣ Collect all IDs for lookups
    const drawingIds = [
      ...new Set(workOrders.map((wo) => String(wo.drawingId)).filter(Boolean)),
    ];

    const projectIds = [
      ...new Set(
        workOrders
          .map((wo) => (wo.projectId ? String(wo.projectId) : null))
          .filter(Boolean)
      ),
    ];

    // 4️⃣ Lookups: Drawings, Projects, Customers
    const [drawingDocs, projectDocs] = await Promise.all([
      Drawing.find({ _id: { $in: drawingIds } })
        .select("drawingNo description")
        .lean(),
      Project.find({ _id: { $in: projectIds } })
        .select("projectName customerId")
        .lean(),
    ]);

    const drawingMap = new Map();
    drawingDocs.forEach((d) =>
      drawingMap.set(String(d._id), {
        drawingNo: d.drawingNo,
        description: d.description || "",
      })
    );

    const projectMap = new Map();
    const customerIds = [];

    projectDocs.forEach((p) => {
      projectMap.set(String(p._id), {
        projectName: p.projectName,
        customerId: p.customerId ? String(p.customerId) : null,
      });
      if (p.customerId) customerIds.push(String(p.customerId));
    });

    const uniqueCustomerIds = [...new Set(customerIds)];

    // Customer model se companyName nikaalo
    const customerDocs = await Customer.find({
      _id: { $in: uniqueCustomerIds },
    })
      .select("companyName")
      .lean();

    const customerMap = new Map();
    customerDocs.forEach((c) =>
      customerMap.set(String(c._id), c.companyName || "")
    );

    // 5️⃣ Aggregate per drawing
    const drawingAggMap = new Map();
    let doNumber;
    workOrders.forEach((wo) => {
      const dId = String(wo.drawingId);
      if (!dId) return;

      const drawingInfo = drawingMap.get(dId) || {
        drawingNo: null,
        description: "",
      };

      doNumber = wo?.doNumber;
      const projInfo = wo.projectId
        ? projectMap.get(String(wo.projectId))
        : null;

      const customerName =
        projInfo?.customerId
          ? customerMap.get(projInfo.customerId) || ""
          : "";

      let agg = drawingAggMap.get(dId);
      if (!agg) {
        agg = {
          drawingId: dId,
          drawingNo: drawingInfo.drawingNo,
          description: drawingInfo.description,
          totalQty: 0,
          completedQty: 0,
          workOrders: new Set(),
          projects: new Set(),
          customers: new Set(),
          doNumbers: new Set(), // ✅ add
          poNumbers: new Set(),
          completeDates: []
        };
      }


      const qty = Number(wo.quantity || 0);
      agg.totalQty += qty;
      agg.workOrders.add(wo.workOrderNo);

      if (wo.completeDate) {
        agg.completeDates.push(new Date(wo.completeDate));
      }


      if (projInfo?.projectName) {
        agg.projects.add(projInfo.projectName);
      }

      if (wo?.doNumber) {
        agg.doNumbers.add(wo.doNumber);
      }

      if (wo?.poNumber) {
        agg.poNumbers.add(wo.poNumber);
      }

      if (customerName) {
        agg.customers.add(customerName);
      }

      // ✅ Completed logic: status===completed ya delivered === true
      const isCompletedStage =
        wo.status === "completed" || wo.delivered === true;

      if (isCompletedStage) {
        agg.completedQty += qty;
      }

      drawingAggMap.set(dId, agg);
    });

    // 6️⃣ Convert map → array + compute Balance & Completed %
    let rows = Array.from(drawingAggMap.values()).map((agg, index) => {
      const balanceQty = Math.max(0, agg.totalQty - agg.completedQty);
      const outgoingQty = agg.completedQty;
      const completedPercent =
        agg.totalQty > 0
          ? Number(((agg.completedQty / agg.totalQty) * 100).toFixed(1))
          : 0;

      const completeDate =
        agg.completeDates.length > 0
          ? new Date(Math.max(...agg.completeDates.map(d => d.getTime())))
          : null;


      return {
        no: index + 1,
        drawingId: agg.drawingId,
        drawingNo: agg.drawingNo,
        description: agg.description,
        balanceQty,
        poNumbers: Array.from(agg.poNumbers),
        outgoingQty,
        doNumbers: Array.from(agg.doNumbers), // ✅ array of DOs
        workOrders: Array.from(agg.workOrders),
        projects: Array.from(agg.projects),
        customers: Array.from(agg.customers),
        completedPercent,
        isCompleted: balanceQty === 0,
        completeDate
      };

    });

    // 7️⃣ Optional search (frontend friendly: by drawingNo / project / customer)
    if (search) {
      const s = String(search).toLowerCase();
      rows = rows.filter((r) => {
        return (
          (r.drawingNo || "").toLowerCase().includes(s) ||
          (r.description || "").toLowerCase().includes(s) ||
          r.projects.some((p) => p.toLowerCase().includes(s)) ||
          r.customers.some((c) => c.toLowerCase().includes(s)) ||
          r.workOrders.some((c) => c.toLowerCase().includes(s))
        );
      });
    }

    const total = rows.length;
    const pagedRows = rows.slice(skip, skip + limit);

    return res.json({
      success: true,
      message: "Complete drawings MTO fetched",
      data: pagedRows,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error getCompleteDrawingsMTO:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};





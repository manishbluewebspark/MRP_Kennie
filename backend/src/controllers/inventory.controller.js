import { populate } from "dotenv";
import Inventory from "../models/Inventory.js";
import MPN from "../models/library/MPN.js";
import PurchaseOrders from "../models/PurchaseOrders.js";
import XLSX from 'xlsx'
import WorkOrder from "../models/WorkingOrders.js";
import Drawing from "../models/Drwaing.js";
import Customer from "../models/Customer.js";
import Project from "../models/Project.js";

// controllers/inventoryController.js
// export const getInventoryList = async (req, res) => {
//   try {
//     const { 
//       page = 1, 
//       limit = 10, 
//       search = "",
//       sortBy = "partNumber",
//       sortOrder = "asc" 
//     } = req.query;

//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);

//     // Build filter
//     const filter = {};

//     if (search) {
//       filter.$or = [
//         { MPN: { $regex: search, $options: "i" } },
//         { Description: { $regex: search, $options: "i" } },
//         { Manufacturer: { $regex: search, $options: "i" } }
//       ];
//     }

//     // Get total count
//     const total = await Inventory.countDocuments(filter);

//     // Get inventory data with population
//     const inventoryList = await Inventory.find(filter)
//       .populate({
//         path: "mpnId",
//         select: "MPN Description Manufacturer UOM StorageLocation ", // MPN field bhi select karo
//         model: "MPNLibrary"
//       })
//       .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
//       .skip((pageNum - 1) * limitNum)
//       .limit(limitNum)
//       .lean(); // Better performance

//     // Transform data to match required format
//     const transformedData = inventoryList.map(item => {
//       // MPN data from populated field or fallback
//       const mpnData = item.mpnId || {};

//       return {
//         _id: item._id,
//         MPN: mpnData.MPN || mpnData.partNumber || "N/A", // MPN field
//         Manufacturer: mpnData.Manufacturer || mpnData.Manufacturer || "N/A",
//         Description: mpnData.Description || mpnData.Description || "N/A",
//         Storage: mpnData.storageLocation || "Main Warehouse", // Adjust based on your schema
//         "Balance Qty": item.balanceQuantity || 0,
//         "Incoming Qty": item.incomingQuantity || 0,
//         "Incoming PO NO.": item.incomingPONumber || "N/A", // You might need to calculate this
//         "Commit Date": item.commitDate ? new Date(item.commitDate).toLocaleDateString() : "N/A",
//         Status: getInventoryStatus(item.balanceQuantity, item.incomingQuantity)
//       };
//     });

//     res.json({
//       success: true,
//       data: transformedData,
//       total,
//       page: pageNum,
//       limit: limitNum,
//       totalPages: Math.ceil(total / limitNum)
//     });

//   } catch (error) {
//     console.error("Get Inventory List Error:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// // Helper function to determine inventory status
// const getInventoryStatus = (balanceQty, incomingQty) => {
//   if (balanceQty <= 0 && incomingQty <= 0) return "Out of Stock";
//   if (balanceQty <= 0 && incomingQty > 0) return "On Order";
//   if (balanceQty > 0 && balanceQty < 10) return "Low Stock";
//   return "In Stock";
// };

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

    // Use the static method for transaction safety
    const result = await Inventory.adjustInventory(
      inventoryId,
      adjustmentQuantity,
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


export const getInventoryList = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "MPN",           // sorting on MPN master
      sortOrder = "asc"
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // 1️⃣ Filter on MPN master
    const mpnFilter = {};

    if (search) {
      mpnFilter.$or = [
        { MPN: { $regex: search, $options: "i" } },
        { Description: { $regex: search, $options: "i" } },
        { Manufacturer: { $regex: search, $options: "i" } },
      ];
    }

    // 2️⃣ Count from MPN (jitne MPN utni rows)
    const total = await MPN.countDocuments(mpnFilter);

    // 3️⃣ Fetch MPNs + populate UOM (code)
    const sortField = sortBy || "MPN";
    const sortDir = sortOrder === "desc" ? -1 : 1;

    const mpns = await MPN.find(mpnFilter)
      .populate("UOM", "code")   // 🟢 yahi se UOM code aa jayega
      .sort({ [sortField]: sortDir })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // If no MPNs, return empty
    if (!mpns.length) {
      return res.json({
        success: true,
        data: [],
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    }

    // 4️⃣ Get inventory records for these MPNs
    const mpnIds = mpns.map(m => m._id);
    const inventoryDocs = await Inventory.find({
      mpnId: { $in: mpnIds },
    }).lean();

    const inventoryMap = new Map(
      inventoryDocs.map(inv => [String(inv.mpnId), inv])
    );

    // 5️⃣ For each MPN, calculate pending POs + merge inventory
    const rows = await Promise.all(
      mpns.map(async (mpnDoc) => {
        const mpnIdStr = String(mpnDoc._id);
        const inventory = inventoryMap.get(mpnIdStr) || null;

        try {
          // 🔹 Pending POs for this MPN
          const pendingPOs = await PurchaseOrders.find({
            "items.mpn": mpnDoc._id,
            status: { $in: ["Pending", "Approved", "Partially Received"] },
          })
            .select(
              "_id poNumber supplier needDate  items.mpn items.idNumber items.qty items.receivedQtyTotal items.pendingQty items.committedDate items.needDate status createdAt updatedAt"
            )
            .populate("items.mpn", "MPN Description Manufacturer UOM") // UOM id yahan tak
            .populate("supplier", "companyName contactPerson companyAddress")
            .lean();

          console.log('--------pendingPOs', pendingPOs)

          let totalIncomingQty = 0;
          let incomingPONumbers = [];
          let earliestCommitDate = null;
          let purchaseData = [];

          pendingPOs.forEach((po) => {
            po.items.forEach((poItem) => {
              if (poItem.mpn && String(poItem.mpn._id) === mpnIdStr) {
                const remainingQty =
                  (poItem.qty || 0) - (poItem.receivedQtyTotal || 0);

                if (remainingQty > 0) {
                  totalIncomingQty += remainingQty;
                  incomingPONumbers.push(po.poNumber);

                  if (po.commitDate) {
                    const cDate = new Date(po.commitDate);
                    if (!earliestCommitDate || cDate < earliestCommitDate) {
                      earliestCommitDate = cDate;
                    }
                  }

                  purchaseData.push({
                    _id: po?._id,
                    idNumber: poItem?.idNumber,
                    mpn: poItem?.mpn,
                    poNumber: po.poNumber,
                    supplier: po.supplier || { name: "N/A" },
                    quantity: remainingQty,
                    totalQuantity: poItem.qty || 0,
                    receivedQuantity: poItem.receivedQtyTotal || 0,
                    pendingQuantity: poItem.pendingQty || 0,
                    needDate: po.needDate
                      ? new Date(po.needDate).toLocaleDateString()
                      : "N/A",
                    committedDate: poItem.committedDate
                      ? new Date(poItem.committedDate).toLocaleDateString()
                      : "N/A",
                    status: po.status,
                    createdAt: po.createdAt,
                    updatedAt: po.updatedAt,
                    poStatus: po.status,
                    itemDescription: poItem.mpn?.Description || "N/A",
                    itemManufacturer: poItem.mpn?.Manufacturer || "N/A",
                    // Agar aapko yahan bhi UOM code chahiye to
                    // itemUOM: (poItem.mpn?.UOM && poItem.mpn?.UOM.code) || undefined
                  });
                }
              }
            });
          });

          incomingPONumbers = [...new Set(incomingPONumbers)];

          const balanceQty = inventory?.balanceQuantity || 0;

          // 🔚 Final row + UOM code include
          return {
            _id: inventory?._id || null,           // inventory id (if any)
            mpnId: mpnDoc._id,                     // MPN id

            MPN: mpnDoc.MPN || "N/A",
            Manufacturer: mpnDoc.Manufacturer || "N/A",
            Description: mpnDoc.Description || "N/A",
            UOM: mpnDoc.UOM?.code || "N/A",        // 🟢 Yahi UOM code aa raha hai
            Storage: mpnDoc.StorageLocation || "Main Warehouse",
            UOM: mpnDoc?.UOM,
            balanceQuantity: balanceQty,
            IncomingQty: totalIncomingQty,
            IncomingPoNumber:
              incomingPONumbers.length > 0
                ? incomingPONumbers.join(", ")
                : "N/A",
            commitDate: earliestCommitDate
              ? new Date(earliestCommitDate).toLocaleDateString()
              : "N/A",

            Status: getInventoryStatus(balanceQty, totalIncomingQty),

            purchaseData, // full PO data
          };
        } catch (err) {
          console.error(`Error processing MPN ${mpnDoc.MPN}:`, err);
          const balanceQty = inventory?.balanceQuantity || 0;

          return {
            _id: inventory?._id || null,
            mpnId: mpnDoc._id,
            UOM: mpnDoc?.UOM,
            MPN: mpnDoc.MPN || "N/A",
            Manufacturer: mpnDoc.Manufacturer || "N/A",
            Description: mpnDoc.Description || "N/A",
            UOM: mpnDoc.UOM?.code || "N/A",
            Storage: mpnDoc.StorageLocation || "Main Warehouse",

            balanceQuantity: balanceQty,
            IncomingQty: 0,
            IncomingPoNumber: "N/A",
            commitDate: "N/A",
            Status: getInventoryStatus(balanceQty, 0),
            purchaseData: [],
          };
        }
      })
    );

    // 7️⃣ Final response
    return res.json({
      success: true,
      data: rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error("Get Inventory List Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// export const getInventoryList = async (req, res) => {
//   try {
//     const { 
//       page = 1, 
//       limit = 10, 
//       search = "",
//       sortBy = "partNumber",
//       sortOrder = "asc" 
//     } = req.query;

//     const pageNum = parseInt(page);
//     const limitNum = parseInt(limit);

//     // Build filter
//     const filter = {};

//     if (search) {
//       filter.$or = [
//         { MPN: { $regex: search, $options: "i" } },
//         { Description: { $regex: search, $options: "i" } },
//         { Manufacturer: { $regex: search, $options: "i" } }
//       ];
//     }

//     // Get total count
//     const total = await Inventory.countDocuments(filter);

//     // Get inventory data with population
//     const inventoryList = await Inventory.find(filter)
//       .populate({
//         path: "mpnId",
//         select: "MPN Description Manufacturer UOM StorageLocation",
//         model: "MPNLibrary"
//       })
//       .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
//       .skip((pageNum - 1) * limitNum)
//       .limit(limitNum)
//       .lean();

//     // Get incoming PO data for each inventory item
//     const inventoryWithPOData = await Promise.all(
//       inventoryList.map(async (item) => {
//         try {
//           // Find pending purchase orders for this MPN
//           const pendingPOs = await PurchaseOrders.find({
//             "items.mpn": item.mpnId?._id,
//             "status": { $in: ["Pending", "Approved", "Partially Received"] }
//           })
//           .select("poNumber supplier items.mpn items.qty items.receivedQty items.commitDate items.needDate status createdAt updatedAt")
//           .populate("items.mpn", "MPN Description Manufacturer")
//           .populate("supplier", "name contactEmail phoneNumber")
//           .lean();

//           let totalIncomingQty = 0;
//           let incomingPONumbers = [];
//           let earliestCommitDate = null;
//           let purchaseData = [];

//           // Calculate incoming quantities from pending POs and collect full PO data
//           pendingPOs.forEach(po => {
//             po.items.forEach(poItem => {
//               // Check if this PO item matches our MPN
//               if (poItem.mpn && poItem.mpn._id.toString() === item.mpnId?._id?.toString()) {
//                 const remainingQty = poItem.qty - (poItem.receivedQty || 0);

//                 if (remainingQty > 0) {
//                   totalIncomingQty += remainingQty;
//                   incomingPONumbers.push(po.poNumber);

//                   // Find earliest commit date
//                   if (poItem.commitDate) {
//                     const commitDate = new Date(poItem.commitDate);
//                     if (!earliestCommitDate || commitDate < earliestCommitDate) {
//                       earliestCommitDate = commitDate;
//                     }
//                   }

//                   // Add full PO data for this item
//                   purchaseData.push({
//                     poNumber: po.poNumber,
//                     supplier: po.supplier || { name: "N/A" },
//                     quantity: remainingQty,
//                     totalQuantity: poItem.qty,
//                     receivedQuantity: poItem.receivedQty || 0,
//                     needDate: poItem.needDate ? new Date(poItem.needDate).toLocaleDateString() : "N/A",
//                     committedDate: poItem.commitDate ? new Date(poItem.commitDate).toLocaleDateString() : "N/A",
//                     status: po.status,
//                     createdAt: po.createdAt,
//                     updatedAt: po.updatedAt,
//                     poStatus: po.status,
//                     // Additional fields you might need
//                     itemDescription: poItem.mpn?.Description || "N/A",
//                     itemManufacturer: poItem.mpn?.Manufacturer || "N/A"
//                   });
//                 }
//               }
//             });
//           });

//           // Remove duplicate PO numbers
//           incomingPONumbers = [...new Set(incomingPONumbers)];

//           return {
//             ...item,
//             calculatedIncomingQty: totalIncomingQty,
//             incomingPONumbers: incomingPONumbers,
//             earliestCommitDate: earliestCommitDate,
//             purchaseData: purchaseData // Full PO data added here
//           };

//         } catch (error) {
//           console.error(`Error processing MPN ${item.mpnId?.MPN}:`, error);
//           return {
//             ...item,
//             calculatedIncomingQty: 0,
//             incomingPONumbers: [],
//             earliestCommitDate: null,
//             purchaseData: [] // Empty array in case of error
//           };
//         }
//       })
//     );

//     // Transform data to match required format
//     const transformedData = inventoryWithPOData.map(item => {
//       const mpnData = item.mpnId || {};

//       return {
//         _id: item._id,
//         MPN: mpnData.MPN || "N/A",
//         Manufacturer: mpnData.Manufacturer || "N/A",
//         Description: mpnData.Description || "N/A",
//         Storage: mpnData.StorageLocation || "Main Warehouse",
//         balanceQuantity: item.balanceQuantity || 0,
//         IncomingQty: item.calculatedIncomingQty || 0, // From pending POs
//         IncomingPoNumber: item.incomingPONumbers.length > 0 
//           ? item.incomingPONumbers.join(", ") 
//           : "N/A",
//         commitDate: item.earliestCommitDate 
//           ? new Date(item.earliestCommitDate).toLocaleDateString() 
//           : "N/A",
//         Status: getInventoryStatus(item.balanceQuantity, item.calculatedIncomingQty),
//         mpnId: item.mpnId?._id, // For reference
//         purchaseData: item.purchaseData // Full purchase data included
//       };
//     });

//     res.json({
//       success: true,
//       data: transformedData,
//       total,
//       page: pageNum,
//       limit: limitNum,
//       totalPages: Math.ceil(total / limitNum)
//     });

//   } catch (error) {
//     console.error("Get Inventory List Error:", error);
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

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

    // Get all inventory items with MPN data
    const inventoryList = await Inventory.find(filter)
      .populate({
        path: "mpnId",
        select: "MPN Description Manufacturer UOM minStockLevel maxStockLevel preferredSuppliers",
        model: "MPNLibrary"
      })
      .lean();

    // Calculate shortage for each item
    const materialRequiredList = await Promise.all(
      inventoryList.map(async (item) => {
        try {
          const mpnData = item.mpnId || {};
          const currentQty = item.balanceQuantity || 0;
          const minStockLevel = mpnData.minStockLevel || 0;
          const requiredQty = minStockLevel;
          const shortageQty = Math.max(0, requiredQty - currentQty);

          // Get preferred suppliers
          const preferredSuppliers = mpnData.preferredSuppliers || [];
          let supplierNames = "N/A";

          if (preferredSuppliers.length > 0) {
            // If you have a Supplier model, populate the names
            const suppliers = await Supplier.find({
              _id: { $in: preferredSuppliers }
            }).select("name").lean();

            supplierNames = suppliers.map(s => s.name).join(", ");
          }

          // Only return items that have shortage or need attention
          if (shortageQty > 0 || currentQty < minStockLevel) {
            return {
              _id: item._id,
              MPN: mpnData.MPN || "N/A",
              Description: mpnData.Description || "N/A",
              UOM: mpnData.UOM || "PCS",
              Suppliers: supplierNames,
              CurrentQty: currentQty,
              RequiredQty: requiredQty,
              ShortageQty: shortageQty,
              Status: getShortageStatus(currentQty, minStockLevel),
              mpnId: item.mpnId?._id
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


export const getLowStockAlerts = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "urgency",
      sortOrder = "desc",
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // 1️⃣ Pehle MPNLibrary se data lo (MPN, Description, Manufacturer, min/max stock)
    const mpnFilter = {};

    if (search) {
      mpnFilter.$or = [
        { MPN: { $regex: search, $options: "i" } },
        { Description: { $regex: search, $options: "i" } },
        { Manufacturer: { $regex: search, $options: "i" } },
      ];
    }

    const mpnList = await MPN.find(mpnFilter)
      .select("MPN Description Manufacturer UOM minStockLevel maxStockLevel")
      .lean();

    if (!mpnList || mpnList.length === 0) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
        criticalCount: 0,
        highCount: 0,
      });
    }

    const mpnIds = mpnList.map((m) => m._id);

    // 2️⃣ Ab Inventory se matching records lo
    const inventoryList = await Inventory.find({ mpnId: { $in: mpnIds } })
      .select("mpnId balanceQuantity incomingQuantity updatedAt")
      .lean();

    // Map for quick lookup
    const inventoryMap = {};
    inventoryList.forEach((inv) => {
      inventoryMap[String(inv.mpnId)] = inv;
    });

    // 3️⃣ Ab combined data se low-stock alerts banao
    const lowStockAlerts = mpnList
      .map((mpn) => {
        const inv = inventoryMap[String(mpn._id)] || {};
        const currentQty = inv.balanceQuantity || 0;
        const minStock = mpn.minStockLevel || 10; // default min
        const maxStock = mpn.maxStockLevel || 50; // default max

        if (minStock <= 0) {
          // agar minStock define hi nahi hai / 0 hai to alert mat bana
          return null;
        }

        const stockPercentage = (currentQty / minStock) * 100;

        let urgency = "Low";
        let alertType = "Info";

        if (currentQty === 0) {
          urgency = "Critical";
          alertType = "Out of Stock";
        } else if (currentQty < minStock * 0.2) {
          urgency = "High";
          alertType = "Critical Shortage";
        } else if (currentQty < minStock * 0.5) {
          urgency = "Medium";
          alertType = "Low Stock";
        } else if (currentQty < minStock) {
          urgency = "Low";
          alertType = "Below Minimum";
        } else {
          // stock theek hai → alert ki zarurat nahi
          return null;
        }

        return {
          _id: mpn._id,
          MPN: mpn.MPN || "N/A",
          Description: mpn.Description || "N/A",
          Manufacturer: mpn.Manufacturer || "N/A",
          UOM: mpn.UOM || "PCS",

          CurrentStock: currentQty,
          MinStock: minStock,
          MaxStock: maxStock,
          StockPercentage: Math.round(stockPercentage),

          AlertType: alertType,
          Urgency: urgency,

          RecommendedOrder: Math.max(minStock - currentQty, 0),

          LastUpdated: inv.updatedAt || new Date(),
        };
      })
      .filter((item) => item !== null);

    // 4️⃣ Sorting
    const urgencyOrder = { Critical: 3, High: 2, Medium: 1, Low: 0 };

    const sortedAlerts = lowStockAlerts.sort((a, b) => {
      if (sortBy === "urgency") {
        const aUrg = urgencyOrder[a.Urgency] ?? 0;
        const bUrg = urgencyOrder[b.Urgency] ?? 0;
        return sortOrder === "desc" ? bUrg - aUrg : aUrg - bUrg;
      }

      const aValue = a[sortBy];
      const bValue = b[sortBy];

      // Numeric sort
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
      }

      // String sort
      if (typeof aValue === "string" && typeof bValue === "string") {
        if (sortOrder === "desc") return bValue.localeCompare(aValue);
        return aValue.localeCompare(bValue);
      }

      return 0;
    });

    // 5️⃣ Pagination
    const total = sortedAlerts.length;
    const paginatedAlerts = sortedAlerts.slice(
      (pageNum - 1) * limitNum,
      pageNum * limitNum
    );

    // 6️⃣ Final response


    res.json({
      success: true,
      data: paginatedAlerts,
      total: lowStockAlerts.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(lowStockAlerts.length / limitNum),
      criticalCount: lowStockAlerts.filter(a => a.Urgency === "Critical").length,
      highCount: lowStockAlerts.filter(a => a.Urgency === "High").length
    });

  } catch (error) {
    console.error("Get Low Stock Alerts Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


export const exportExcel = async (req, res) => {
  try {
    const { search = "" } = req.query;

    console.log("Exporting inventory data to Excel...");

    // Build filter
    const filter = {};

    if (search) {
      filter.$or = [
        { MPN: { $regex: search, $options: "i" } },
        { Description: { $regex: search, $options: "i" } },
        { Manufacturer: { $regex: search, $options: "i" } }
      ];
    }

    // Get inventory data with population
    const inventoryList = await Inventory.find(filter)
      .populate({
        path: "mpnId",
        select: "MPN Description Manufacturer UOM StorageLocation minStockLevel unitPrice",
        model: "MPNLibrary"
      })
      .sort({ createdAt: -1 })
      .lean();

    // Transform data for export with exact column names
    const exportData = inventoryList.map((item, index) => {
      const mpnData = item.mpnId || {};

      const balanceQty = item.balanceQuantity || 0;
      const unitPrice = mpnData.unitPrice || 0;
      const totalValue = balanceQty * unitPrice;

      // Calculate stock status
      const minStockLevel = mpnData.minStockLevel || 0;
      let stockStatus = "In Stock";
      if (balanceQty <= 0) stockStatus = "Out of Stock";
      else if (balanceQty < minStockLevel) stockStatus = "Low Stock";
      else if (balanceQty < minStockLevel * 2) stockStatus = "Adequate";
      else stockStatus = "Well Stocked";

      return {
        "Running No.": index + 1,
        "MPN Number": mpnData.MPN || "N/A",
        "MPN": mpnData.MPN || "N/A",
        "Manufacturer": mpnData.Manufacturer || "N/A",
        "Description": mpnData.Description || "N/A",
        "UOM": mpnData.UOM || "PCS",
        "Storage Location": mpnData.StorageLocation || "Main Warehouse",
        "Balance Qty": balanceQty,
        "Incoming Qty": item.IncomingQty || 0,
        "Min Stock Level": minStockLevel,
        "Unit Price": `$${unitPrice.toFixed(2)}`,
        "Total Value": `$${totalValue.toFixed(2)}`,
        "Stock Status": stockStatus
      };
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory List");

    // Set column widths
    const colWidths = [
      { wch: 12 }, // Running No.
      { wch: 15 }, // MPN Number
      { wch: 15 }, // MPN
      { wch: 20 }, // Manufacturer
      { wch: 40 }, // Description
      { wch: 10 }, // UOM
      { wch: 20 }, // Storage Location
      { wch: 12 }, // Balance Qty
      { wch: 12 }, // Incoming Qty
      { wch: 15 }, // Min Stock Level
      { wch: 12 }, // Unit Price
      { wch: 15 }, // Total Value
      { wch: 15 }  // Stock Status
    ];
    worksheet['!cols'] = colWidths;

    // Generate buffer
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'buffer'
    });

    // Set response headers
    const fileName = `inventory-export-${Date.now()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    // Send file
    res.send(excelBuffer);

    console.log(`Inventory data exported successfully. Total records: ${exportData.length}`);

  } catch (error) {
    console.error('Export Excel Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export inventory data'
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

    const filter = {};

    if (search) {
      filter.$or = [
        { MPN: { $regex: search, $options: "i" } },
        { Description: { $regex: search, $options: "i" } },
        { Manufacturer: { $regex: search, $options: "i" } }
      ];
    }

    const inventoryList = await Inventory.find(filter)
      .populate({
        path: "mpnId",
        select: "MPN Description Manufacturer UOM StorageLocation",
        model: "MPNLibrary"
      })
      .lean();

    const excelData = inventoryList.map((item) => ({
      "MPN": item.mpnId?.MPN || "N/A",
      "Description": item.mpnId?.Description || "N/A",
      "Manufacturer": item.mpnId?.Manufacturer || "N/A",
      "UOM": item.mpnId?.UOM || "PCS",
      "Storage Location": item.mpnId?.StorageLocation || "Main",
      "Current Stock": item.balanceQuantity || 0,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    ws["!cols"] = Object.keys(excelData[0]).map((c) => ({
      wch: Math.max(15, c.length + 2)
    }));

    XLSX.utils.book_append_sheet(wb, ws, "Inventory List");
    const xlsBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=inventory-list.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    return res.end(xlsBuffer);
  } catch (error) {
    console.error("exportInventoryListExcel Error:", error);
    res.status(500).json({ success: false, message: error.message });
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
    const { mpnId, workOrderId } = req.query;

    const query = {
      "workOrders.0": { $exists: true },
    };

    if (mpnId) query.mpnId = mpnId;
    if (workOrderId) query["workOrders.workOrderId"] = workOrderId;

    const inventories = await Inventory.find(query)
      .populate("mpnId", "MPN description uom")
      .lean();

    const shortages = [];

    inventories.forEach((inv) => {
      (inv.workOrders || []).forEach((wo) => {

        // agar specific WO chaahiye, filter here
        if (workOrderId && String(wo.workOrderId) !== String(workOrderId)) {
          return;
        }

        shortages.push({
          // Inventory level fields
          mpnId: inv.mpnId?._id || inv.mpnId,
          mpn: inv.mpnId?.MPN || "",
          description: inv.mpnId?.description || "",
          uom: inv.mpnId?.uom || "",
          balanceQuantity: inv.balanceQuantity,
          stockStatus: inv.stockStatus,

          // ❌ DON'T SEND FULL ARRAY (was wrong)
          // workOrders: inv.workOrders,

          // ✅ Only this WO as separate item
          workOrderId: wo.workOrderId,
          workOrderNo: wo.workOrderNo,
          drawingId: wo.drawingId,
          requiredQty: wo.requiredQty,
          pickedQty: wo?.pickedQty,
          needDate: wo.needDate,
          createdAt: wo.createdAt,
        });
      });
    });

    return res.json({
      success: true,
      message: "Material shortages fetched",
      data: shortages,
    });

  } catch (err) {
    console.error("Error getMaterialShortages:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getCompleteDrawingsMTO = async (req, res) => {
  try {
    let { page = 1, limit = 20, search } = req.query;

    page = Number(page) || 1;
    limit = Number(limit) || 20;
    const skip = (page - 1) * limit;

    // 1️⃣ Base query: sirf woh WorkOrders jo drawing ke saath linked hain
    const woQuery = {
      drawingId: { $exists: true, $ne: null },
    };

    // Optional search on drawing no / project / customer later handle karenge UI level par
    // Ya tum yaha bhi search attach kar sakte ho (agar drawingNo, projectName ke basis par chahiye to aggregation se karein)

    // 2️⃣ Fetch WorkOrders (no pagination yaha, aggregation drawing level par hai)
    const workOrders = await WorkOrder.find(woQuery)
      .select(
        "drawingId doNumber quantity status completeDate  delivered projectId workOrderNo isInProduction"
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
          completeDates:[]
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
          r.customers.some((c) => c.toLowerCase().includes(s))
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





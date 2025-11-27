import Inventory from "../models/Inventory.js";
import PurchaseOrders from "../models/PurchaseOrders.js";
import  XLSX from 'xlsx'

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
      sortBy = "partNumber",
      sortOrder = "asc" 
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

    // Get total count
    const total = await Inventory.countDocuments(filter);

    // Get inventory data with population
    const inventoryList = await Inventory.find(filter)
      .populate({
        path: "mpnId",
        select: "MPN Description Manufacturer UOM StorageLocation",
        model: "MPNLibrary"
      })
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // Get incoming PO data for each inventory item
    const inventoryWithPOData = await Promise.all(
      inventoryList.map(async (item) => {
        try {
          // Find pending purchase orders for this MPN
          const pendingPOs = await PurchaseOrders.find({
            "items.mpn": item.mpnId?._id,
            "status": { $in: ["Pending", "Approved", "Partially Received"] }
          })
          .select("poNumber supplier items.mpn items.qty items.receivedQty items.commitDate items.needDate status createdAt updatedAt")
          .populate("items.mpn", "MPN Description Manufacturer")
          .populate("supplier", "name contactEmail phoneNumber")
          .lean();

          let totalIncomingQty = 0;
          let incomingPONumbers = [];
          let earliestCommitDate = null;
          let purchaseData = [];

          // Calculate incoming quantities from pending POs and collect full PO data
          pendingPOs.forEach(po => {
            po.items.forEach(poItem => {
              // Check if this PO item matches our MPN
              if (poItem.mpn && poItem.mpn._id.toString() === item.mpnId?._id?.toString()) {
                const remainingQty = poItem.qty - (poItem.receivedQty || 0);
                
                if (remainingQty > 0) {
                  totalIncomingQty += remainingQty;
                  incomingPONumbers.push(po.poNumber);
                  
                  // Find earliest commit date
                  if (poItem.commitDate) {
                    const commitDate = new Date(poItem.commitDate);
                    if (!earliestCommitDate || commitDate < earliestCommitDate) {
                      earliestCommitDate = commitDate;
                    }
                  }

                  // Add full PO data for this item
                  purchaseData.push({
                    poNumber: po.poNumber,
                    supplier: po.supplier || { name: "N/A" },
                    quantity: remainingQty,
                    totalQuantity: poItem.qty,
                    receivedQuantity: poItem.receivedQty || 0,
                    needDate: poItem.needDate ? new Date(poItem.needDate).toLocaleDateString() : "N/A",
                    committedDate: poItem.commitDate ? new Date(poItem.commitDate).toLocaleDateString() : "N/A",
                    status: po.status,
                    createdAt: po.createdAt,
                    updatedAt: po.updatedAt,
                    poStatus: po.status,
                    // Additional fields you might need
                    itemDescription: poItem.mpn?.Description || "N/A",
                    itemManufacturer: poItem.mpn?.Manufacturer || "N/A"
                  });
                }
              }
            });
          });

          // Remove duplicate PO numbers
          incomingPONumbers = [...new Set(incomingPONumbers)];

          return {
            ...item,
            calculatedIncomingQty: totalIncomingQty,
            incomingPONumbers: incomingPONumbers,
            earliestCommitDate: earliestCommitDate,
            purchaseData: purchaseData // Full PO data added here
          };

        } catch (error) {
          console.error(`Error processing MPN ${item.mpnId?.MPN}:`, error);
          return {
            ...item,
            calculatedIncomingQty: 0,
            incomingPONumbers: [],
            earliestCommitDate: null,
            purchaseData: [] // Empty array in case of error
          };
        }
      })
    );

    // Transform data to match required format
    const transformedData = inventoryWithPOData.map(item => {
      const mpnData = item.mpnId || {};
      
      return {
        _id: item._id,
        MPN: mpnData.MPN || "N/A",
        Manufacturer: mpnData.Manufacturer || "N/A",
        Description: mpnData.Description || "N/A",
        Storage: mpnData.StorageLocation || "Main Warehouse",
        balanceQuantity: item.balanceQuantity || 0,
        IncomingQty: item.calculatedIncomingQty || 0, // From pending POs
        IncomingPoNumber: item.incomingPONumbers.length > 0 
          ? item.incomingPONumbers.join(", ") 
          : "N/A",
        commitDate: item.earliestCommitDate 
          ? new Date(item.earliestCommitDate).toLocaleDateString() 
          : "N/A",
        Status: getInventoryStatus(item.balanceQuantity, item.calculatedIncomingQty),
        mpnId: item.mpnId?._id, // For reference
        purchaseData: item.purchaseData // Full purchase data included
      };
    });

    res.json({
      success: true,
      data: transformedData,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });

  } catch (error) {
    console.error("Get Inventory List Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
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

// Low Stock Alert List
export const getLowStockAlerts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = "",
      sortBy = "urgency",
      sortOrder = "desc" 
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Build filter
    const filter = {};
    
    if (search) {
      filter.$or = [
        { MPN: { $regex: search, $options: "i" } },
        { Description: { $regex: search, $options: "i" } }
      ];
    }

    // Get inventory with MPN data
    const inventoryList = await Inventory.find(filter)
      .populate({
        path: "mpnId",
        select: "MPN Description Manufacturer UOM minStockLevel maxStockLevel",
        model: "MPNLibrary"
      })
      .lean();

    // Calculate stock alerts
    const lowStockAlerts = inventoryList.map((item) => {
      const mpnData = item.mpnId || {};
      const currentQty = item.balanceQuantity || 0;
      const minStock = mpnData.minStockLevel || 10; // Default min stock
      const maxStock = mpnData.maxStockLevel || 50; // Default max stock

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
        return null; // Don't return items with adequate stock
      }

      return {
        _id: item._id,
        MPN: mpnData.MPN || "N/A",
        Description: mpnData.Description || "N/A",
        Manufacturer: mpnData.Manufacturer || "N/A",
        UOM: mpnData.UOM || "PCS",
        CurrentStock: currentQty,
        MinStock: minStock,
        MaxStock: maxStock,
        StockPercentage: Math.round(stockPercentage),
        AlertType: alertType,
        Urgency: urgency,
        RecommendedOrder: Math.max(minStock - currentQty, 0),
        LastUpdated: item.updatedAt || new Date()
      };
    }).filter(item => item !== null);

    // Apply sorting
    const sortedAlerts = lowStockAlerts.sort((a, b) => {
      const urgencyOrder = { "Critical": 3, "High": 2, "Medium": 1, "Low": 0 };
      
      if (sortBy === "urgency") {
        const aUrgency = urgencyOrder[a.Urgency];
        const bUrgency = urgencyOrder[b.Urgency];
        return sortOrder === "desc" ? bUrgency - aUrgency : aUrgency - bUrgency;
      }
      
      // Default numeric sorting
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      return sortOrder === "desc" ? bValue - aValue : aValue - aValue;
    });

    // Apply pagination
    const paginatedAlerts = sortedAlerts.slice(
      (pageNum - 1) * limitNum,
      pageNum * limitNum
    );

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


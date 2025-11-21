import Inventory from "../models/Inventory.js";
import MPN from "../models/library/MPN.js";
import receiveMaterial from "../models/receiveMaterial.js";



export const createReceiveMaterial = async (req, res) => {
  try {
    const { purchaseOrderId, supplierId, items, notes } = req.body;
    const userId = req.user.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No items found in request." });
    }

    const grnNumber = `GRN-${Date.now()}`;
    const now = new Date();

    // 🧾 1) GRN (ReceiveMaterial) create
    const newGRN = new receiveMaterial({
      purchaseOrderId,
      supplierId,
      receivedBy: userId,
      items,
      notes,
      grnNumber,
      receivedDate: now, // agar field hai to
    });

    await newGRN.save();

    // 2) Har item ke liye Inventory + MPN.purchaseHistory update
    for (const item of items) {
      if (!item.mpnId) continue;

      const receivedQty = Number(item.receivedQty || 0);
      const rejectedQty = Number(item.rejectedQty || 0);
      const acceptedQty = receivedQty - rejectedQty;

      // ✅ Inventory update (sirf accepted quantity)
      if (acceptedQty > 0) {
        await Inventory.findOneAndUpdate(
          { mpnId: item.mpnId },
          {
            $inc: {
              balanceQuantity: acceptedQty,
              incomingQuantity: -acceptedQty, // ab incoming se nikal do
            },
            lastUpdated: now,
          },
          { upsert: true, new: true }
        );
      }

      // ✅ MPN.purchaseHistory me ek record push karo
    const purchaseHistoryEntry = {
  purchasedDate: now,
  purchasedPrice: item.unitPrice?.toString() || item.price?.toString() || "",
  Supplier: supplierId || item.supplierId || null,
  LeadTime_WK: Number(item.leadTimeWk || item.leadTime || 0),
  MOQ: Number(item.moq || item.orderQty || receivedQty || 0),
  entryDate: now,
};


     await MPN.findByIdAndUpdate(
  item.mpnId,
  {
    $push: {
      purchaseHistory: {
        $each: [purchaseHistoryEntry],
        $position: 0   // <-- Always insert at top
      }
    },
    // 🟩 Step 2: Update latest RFQUnitPrice
    $set: {
      RFQUnitPrice: purchaseHistoryEntry.purchasedPrice
    }
  },
  { new: true }
);

    }

    return res.status(201).json({
      success: true,
      message: "Material received, inventory & purchase history updated successfully.",
      data: newGRN,
    });
  } catch (error) {
    console.error("❌ Error in createReceiveMaterial:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// export const createReceiveMaterial = async (req, res) => {
//   try {
//     const { purchaseOrderId, supplierId, receivedBy, items, notes } = req.body;
//     const userId = req.user.id;
//     if (!items || !Array.isArray(items) || items.length === 0) {
//       return res.status(400).json({ success: false, message: "No items found in request." });
//     }

//     const grnNumber = `GRN-${Date.now()}`;

//     // 🧾 Create new GRN (ReceiveMaterial Entry)
//     const newGRN = new receiveMaterial({
//       purchaseOrderId,
//       supplierId,
//       receivedBy:userId,
//       items,
//       notes,
//       grnNumber
//     });

//     await newGRN.save();

//     // 🔁 Update Inventory for each accepted item
//     for (const item of items) {
//   const acceptedQty = item.receivedQty - (item.rejectedQty || 0);
  
//   if (acceptedQty > 0) {
//     await Inventory.findOneAndUpdate(
//       { mpnId: item.mpnId },
//       { 
//         $inc: { 
//           balanceQuantity: acceptedQty,
//           incomingQuantity: -acceptedQty // Reduce incoming since now received
//         }, 
//         lastUpdated: new Date() 
//       },
//       { upsert: true, new: true }
//     );
//   }
// }

//     return res.status(201).json({
//       success: true,
//       message: "Material received and inventory updated successfully.",
//       data: newGRN,
//     });
//   } catch (error) {
//     console.error("❌ Error in createReceiveMaterial:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

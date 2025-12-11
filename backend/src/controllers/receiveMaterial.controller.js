import Inventory from "../models/Inventory.js";
import MPN from "../models/library/MPN.js";
import PurchaseOrders from "../models/PurchaseOrders.js";
import ReceiveMaterial from "../models/ReceiveMaterial.js";


// imports example – apne paths / model names ke hisaab se adjust karo
// import ReceiveMaterial from "../models/receiveMaterial.js";
// import Inventory from "../models/Inventory.js";
// import MPN from "../models/MPN.js";              // ya "MPNLibrary"
// import PurchaseOrder from "../models/PurchaseOrder.js";

export const createReceiveMaterial = async (req, res) => {
  try {
    const { purchaseOrderId, supplierId, items, notes } = req.body;
    const userId = req.user?.id || req.user?._id || "system";

    // 🔹 Basic validations
    if (!purchaseOrderId) {
      return res
        .status(400)
        .json({ success: false, message: "purchaseOrderId is required." });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No items found in request." });
    }

    const now = new Date();
    const grnNumber = `GRN-${Date.now()}`;

    // 1️⃣ Purchase Order fetch
    const po = await PurchaseOrders.findById(purchaseOrderId);
    if (!po) {
      return res
        .status(404)
        .json({ success: false, message: "Purchase Order not found." });
    }

    const poItems = po.items || [];
    const grnItems = [];

    // 2️⃣ Loop through received items
    for (const line of items) {
      if (!line.mpnId) continue;

      const itemId = line.itemId; // frontend se aa raha hai (PO items ka _id)
      const poItem = itemId ? poItems.id(itemId) : null;

      const receivedQty = Number(line.receivedQty || 0);
      const rejectedQty = Number(line.rejectedQty || 0);
      const acceptedQty = Math.max(receivedQty - rejectedQty, 0);

      let orderedQty = 0;
      let prevReceivedTotal = 0;
      let prevRejectedTotal = 0;

      if (poItem) {
        orderedQty = Number(poItem.qty || line.orderedQty || 0);
        prevReceivedTotal = Number(poItem.receivedQtyTotal || 0);
        prevRejectedTotal = Number(poItem.rejectedQtyTotal || 0);

        const newReceivedTotal = prevReceivedTotal + receivedQty;
        const newRejectedTotal = prevRejectedTotal + rejectedQty;

        const newAcceptedTotal = Math.max(
          newReceivedTotal - newRejectedTotal,
          0
        );

        const pendingQty = Math.max(orderedQty - newAcceptedTotal, 0);

        // 🔹 PO item totals update
        poItem.receivedQtyTotal = newReceivedTotal;
        poItem.rejectedQtyTotal = newRejectedTotal;
        poItem.pendingQty = pendingQty;

        // 🔹 PO item status update
        if (newAcceptedTotal <= 0 && newRejectedTotal > 0) {
          poItem.status = "Rejected";
        } else if (newAcceptedTotal > 0 && pendingQty === 0) {
          poItem.status = "Accepted";
        } else if (newAcceptedTotal > 0 && pendingQty > 0) {
          poItem.status = "Partially Accepted";
        } else {
          poItem.status = "Pending";
        }

        // 🔹 remarks override if provided
        if (line.remarks) {
          poItem.remarks = line.remarks;
        }

        // 🔹 GRN item with TOTAL fields
        grnItems.push({
          mpnId: line.mpnId,
          itemId: itemId || null,
          receivedQty,
          rejectedQty,
          remarks: line.remarks || "",
          receivedQtyTotal: newReceivedTotal,
          rejectedQtyTotal: newRejectedTotal,
          pendingQty,
        });
      } else {
        // Agar PO item kahi se match nahi hua – phir bhi GRN me line save kar do
        const ordered = Number(line.orderedQty || 0);
        const acceptedTotal = Math.max(receivedQty - rejectedQty, 0);
        const pendingQty = Math.max(ordered - acceptedTotal, 0);

        grnItems.push({
          mpnId: line.mpnId,
          itemId: itemId || null,
          receivedQty,
          rejectedQty,
          remarks: line.remarks || "",
          receivedQtyTotal: receivedQty,
          rejectedQtyTotal: rejectedQty,
          pendingQty,
        });
      }

      // 3️⃣ Inventory update – sirf accepted quantity stock me dalna
      if (acceptedQty > 0) {
        await Inventory.findOneAndUpdate(
          { mpnId: line.mpnId },
          {
            $inc: {
              balanceQuantity: acceptedQty,
              incomingQuantity: -acceptedQty, // agar track kar rahe ho
            },
            lastUpdated: now,
          },
          { upsert: true, new: true }
        );
      }

      // 4️⃣ MPN.purchaseHistory update
      const purchaseHistoryEntry = {
        purchasedDate: now,
        purchasedPrice:
          line.unitPrice?.toString() ||
          line.price?.toString() ||
          "",
        Supplier: supplierId || line.supplierId || null,
        LeadTime_WK: Number(line.leadTimeWk || line.leadTime || 0),
        MOQ: Number(line.moq || line.orderQty || receivedQty || 0),
        entryDate: now,
      };

      await MPN.findByIdAndUpdate(
        line.mpnId,
        {
          $push: {
            purchaseHistory: {
              $each: [purchaseHistoryEntry],
              $position: 0, // latest upar
            },
          },
          $set: {
            RFQUnitPrice: purchaseHistoryEntry.purchasedPrice,
          },
        },
        { new: true }
      );
    }

    // 5️⃣ GRN (ReceiveMaterial) create with enriched items
    const newGRN = new ReceiveMaterial({
      purchaseOrderId,
      supplierId,
      receivedBy: userId,
      items: grnItems,
      notes,
      grnNumber,
      receivedDate: now,
    });

    await newGRN.save(); // pre('save') hook chalega (acceptedQty + overallStatus)

    // 6️⃣ PO ka overall status (Pending / Partially Received / Completed)
    const updatedItems = po.items || [];

    const allFullyReceived =
      updatedItems.length > 0 &&
      updatedItems.every((it) => {
        const qty = Number(it.qty || 0);
        const receivedTotal = Number(it.receivedQtyTotal || 0);
        const rejectedTotal = Number(it.rejectedQtyTotal || 0);
        const acceptedTotal = Math.max(receivedTotal - rejectedTotal, 0);
        return qty > 0 && acceptedTotal >= qty;
      });

    const someAccepted = updatedItems.some((it) => {
      const receivedTotal = Number(it.receivedQtyTotal || 0);
      const rejectedTotal = Number(it.rejectedQtyTotal || 0);
      const acceptedTotal = Math.max(receivedTotal - rejectedTotal, 0);
      return acceptedTotal > 0;
    });

    if (allFullyReceived) {
      po.status = "Completed";
    } else if (someAccepted) {
      po.status = "Partially Received";
    } else {
      if (!["Cancelled", "Closed"].includes(po.status)) {
        po.status = "Pending";
      }
    }

    await po.save();

    // 7️⃣ Final response
    return res.status(201).json({
      success: true,
      message:
        "Material received, inventory, purchase history & purchase order updated successfully.",
      data: {
        grn: newGRN,
        purchaseOrder: po,
      },
    });
  } catch (error) {
    console.error("❌ Error in createReceiveMaterial:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};




// export const createReceiveMaterial = async (req, res) => {
//   try {
//     const { purchaseOrderId, supplierId, items, notes } = req.body;
//     const userId = req.user.id;

//     if (!items || !Array.isArray(items) || items.length === 0) {
//       return res
//         .status(400)
//         .json({ success: false, message: "No items found in request." });
//     }

//     const grnNumber = `GRN-${Date.now()}`;
//     const now = new Date();

//     // 🧾 1) GRN (ReceiveMaterial) create
//     const newGRN = new receiveMaterial({
//       purchaseOrderId,
//       supplierId,
//       receivedBy: userId,
//       items,
//       notes,
//       grnNumber,
//       receivedDate: now, // agar field hai to
//     });

//     await newGRN.save();

//     // 2) Har item ke liye Inventory + MPN.purchaseHistory update
//     for (const item of items) {
//       if (!item.mpnId) continue;

//       const receivedQty = Number(item.receivedQty || 0);
//       const rejectedQty = Number(item.rejectedQty || 0);
//       const acceptedQty = receivedQty - rejectedQty;

//       // ✅ Inventory update (sirf accepted quantity)
//       if (acceptedQty > 0) {
//         await Inventory.findOneAndUpdate(
//           { mpnId: item.mpnId },
//           {
//             $inc: {
//               balanceQuantity: acceptedQty,
//               incomingQuantity: -acceptedQty, // ab incoming se nikal do
//             },
//             lastUpdated: now,
//           },
//           { upsert: true, new: true }
//         );
//       }

//       // ✅ MPN.purchaseHistory me ek record push karo
//     const purchaseHistoryEntry = {
//   purchasedDate: now,
//   purchasedPrice: item.unitPrice?.toString() || item.price?.toString() || "",
//   Supplier: supplierId || item.supplierId || null,
//   LeadTime_WK: Number(item.leadTimeWk || item.leadTime || 0),
//   MOQ: Number(item.moq || item.orderQty || receivedQty || 0),
//   entryDate: now,
// };


//      await MPN.findByIdAndUpdate(
//   item.mpnId,
//   {
//     $push: {
//       purchaseHistory: {
//         $each: [purchaseHistoryEntry],
//         $position: 0   // <-- Always insert at top
//       }
//     },
//     // 🟩 Step 2: Update latest RFQUnitPrice
//     $set: {
//       RFQUnitPrice: purchaseHistoryEntry.purchasedPrice
//     }
//   },
//   { new: true }
// );

//     }

//     return res.status(201).json({
//       success: true,
//       message: "Material received, inventory & purchase history updated successfully.",
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

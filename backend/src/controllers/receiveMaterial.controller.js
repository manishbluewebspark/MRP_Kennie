import mongoose from "mongoose";
import Inventory from "../models/Inventory.js";
import MPN from "../models/library/MPN.js";
import PurchaseOrders from "../models/PurchaseOrders.js";
import ReceiveMaterial from "../models/ReceiveMaterial.js";
import UOM from "../models/UOM.js";
import { convertQty, convertToInventoryUom } from "../utils/uomController.js";

// ============================
export const createReceiveMaterial = async (req, res) => {
  try {
    const { purchaseOrderId, supplierId, items, notes } = req.body;
    const userId = req.user?.id || req.user?._id || "system";

    const getId = (v) => {
      if (!v) return null;
      if (typeof v === "string") return v;
      if (typeof v === "object" && v._id) return String(v._id);
      return null;
    };

    if (!purchaseOrderId) {
      return res.status(400).json({ success: false, message: "purchaseOrderId is required." });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "No items found in request." });
    }

    const now = new Date();
    const grnNumber = `GRN-${Date.now()}`;

    // 1️⃣ Purchase Order fetch
    const po = await PurchaseOrders.findById(purchaseOrderId);
    if (!po) {
      return res.status(404).json({ success: false, message: "Purchase Order not found." });
    }

    const poItems = po.items || [];
    const grnItems = [];

    // ============================
    // ✅ Prefetch MPN master UOM (SAFE)
    // ============================
    const mpnIds = [
      ...new Set(
        items
          .map((x) => getId(x.mpnId || x.mpn)) // support both keys
          .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
      ),
    ];

    const mpnDocs = mpnIds.length
      ? await MPN.find({ _id: { $in: mpnIds.map((id) => new mongoose.Types.ObjectId(id)) } })
        .select("uom uomId") // master uom stored here
        .lean()
      : [];

    const mpnMap = new Map(mpnDocs.map((m) => [String(m._id), m]));

    // ============================
    // ✅ Prefetch UOM docs (id -> name)
    // ============================
    const uomIdSet = new Set();

    for (const it of poItems) {
      const uid = getId(it?.uomId || it?.uom);
      if (uid && mongoose.Types.ObjectId.isValid(uid)) uomIdSet.add(uid);
    }

    for (const line of items) {
      const uid = getId(line?.uomId || line?.uom);
      if (uid && mongoose.Types.ObjectId.isValid(uid)) uomIdSet.add(uid);
    }

    for (const m of mpnDocs) {
      const uid = getId(m?.uomId || m?.uom);
      if (uid && mongoose.Types.ObjectId.isValid(uid)) uomIdSet.add(uid);
    }

    const uomIds = [...uomIdSet];

    const uomDocs = uomIds.length
      ? await UOM.find({ _id: { $in: uomIds.map((id) => new mongoose.Types.ObjectId(id)) } })
        .select("name code")
        .lean()
      : [];

    const uomMap = new Map(uomDocs.map((u) => [String(u._id), u]));

    const getUomName = (uomIdOrName) => {
      if (!uomIdOrName) return "";
      const s = String(uomIdOrName);

      // already text like "ft"
      if (!mongoose.Types.ObjectId.isValid(s)) return s;

      const doc = uomMap.get(s);
      return doc?.code || doc?.name || "";
    };

    // ============================
    // 2️⃣ Loop through received items
    // ============================
    for (const line of items) {
      const mpnId = getId(line.mpnId || line.mpn);

      if (!mpnId || !mongoose.Types.ObjectId.isValid(mpnId)) continue;

      const mpnDoc = mpnMap.get(String(mpnId));

      // ✅ Master UOM from MPN (Reference)
      const masterUomId = getId(mpnDoc?.uomId || mpnDoc?.uom) || null;
      const masterUomName = getUomName(masterUomId);

      const itemId = getId(line.itemId); // PO item _id
      const poItem = itemId ? poItems.id(itemId) : null;

      const receivedQty = Number(line.receivedQty || 0);
      const rejectedQty = Number(line.rejectedQty || 0);
      const acceptedQty = Math.max(receivedQty - rejectedQty, 0);

      // ✅ from UOM priority: line.uom > poItem.uom > masterUOM
      const fromUomId = getId(line.uomId || line.uom || poItem?.uomId || poItem?.uom) || null;
      const fromUomName = getUomName(fromUomId) || masterUomName;
      const fromUOMId = await MPN.findById(line.mpnId._id)

      const acceptedQtyInMaster = await convertToInventoryUom({
        qty: acceptedQty,
        fromUom: fromUomId,
        toUom: masterUomId,
      });
      // ---- PO totals update ----
      if (poItem) {
        const orderedQty = Number(poItem.qty || line.orderedQty || 0);
        const prevReceivedTotal = Number(poItem.receivedQtyTotal || 0);
        const prevRejectedTotal = Number(poItem.rejectedQtyTotal || 0);

        const newReceivedTotal = prevReceivedTotal + receivedQty;
        const newRejectedTotal = prevRejectedTotal + rejectedQty;

        const newAcceptedTotal = Math.max(newReceivedTotal - newRejectedTotal, 0);
        const pendingQty = Math.max(orderedQty - newAcceptedTotal, 0);

        poItem.receivedQtyTotal = newReceivedTotal;
        poItem.rejectedQtyTotal = newRejectedTotal;
        poItem.pendingQty = pendingQty;

        if (newAcceptedTotal <= 0 && newRejectedTotal > 0) poItem.status = "Rejected";
        else if (newAcceptedTotal > 0 && pendingQty === 0) poItem.status = "Accepted";
        else if (newAcceptedTotal > 0 && pendingQty > 0) poItem.status = "Partially Accepted";
        else poItem.status = "Pending";

        if (line.remarks) poItem.remarks = line.remarks;

        grnItems.push({
          mpnId, // ✅ always string id
          itemId: itemId || null,
          receivedQty,
          rejectedQty,
          acceptedQty,
          fromUomId,
          fromUomName,
          masterUomId,
          masterUomName,
          acceptedQtyInMaster,
          remarks: line.remarks || "",
          receivedQtyTotal: newReceivedTotal,
          rejectedQtyTotal: newRejectedTotal,
          pendingQty,
        });
      } else {
        const ordered = Number(line.orderedQty || 0);
        const pendingQty = Math.max(ordered - acceptedQty, 0);

        grnItems.push({
          mpnId,
          itemId: itemId || null,
          receivedQty,
          rejectedQty,
          acceptedQty,
          fromUomId,
          fromUomName,
          masterUomId,
          masterUomName,
          acceptedQtyInMaster,
          remarks: line.remarks || "",
          receivedQtyTotal: receivedQty,
          rejectedQtyTotal: rejectedQty,
          pendingQty,
        });
      }

      // ============================
      // ✅ Inventory update (MASTER UOM)
      // ============================
      if (acceptedQtyInMaster > 0) {
        await Inventory.findOneAndUpdate(
          { mpnId: new mongoose.Types.ObjectId(mpnId) }, // ✅ objectId
          {
            $inc: {
              balanceQuantity: acceptedQtyInMaster,
              incomingQuantity: -acceptedQtyInMaster,
            },
            $set: {
              uomId: masterUomId ? new mongoose.Types.ObjectId(masterUomId) : null,
              lastUpdated: now,
            },
          },
          { upsert: true, new: true }
        );
      }

      // 4️⃣ MPN.purchaseHistory update
      const purchaseHistoryEntry = {
        purchasedDate: now,
        purchasedPrice: line.unitPrice?.toString() || line.price?.toString() || "",
        Supplier: supplierId || line.supplierId || null,
        LeadTime_WK: Number(line.leadTimeWk || line.leadTime || 0),
        MOQ: Number(line.moq || line.orderQty || receivedQty || 0),
        entryDate: now,
        fromUomName,
        masterUomName,
      };

      await MPN.findByIdAndUpdate(
        new mongoose.Types.ObjectId(mpnId), // ✅ objectId
        {
          $push: { purchaseHistory: { $each: [purchaseHistoryEntry], $position: 0 } },
          $set: { RFQUnitPrice: purchaseHistoryEntry.purchasedPrice },
        },
        { new: true }
      );
    }

    // 5️⃣ GRN create
    const newGRN = new ReceiveMaterial({
      purchaseOrderId,
      supplierId,
      receivedBy: userId,
      items: grnItems,
      notes,
      grnNumber,
      receivedDate: now,
    });

    await newGRN.save();

    // 6️⃣ PO overall status
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

    if (allFullyReceived) po.status = "Completed";
    else if (someAccepted) po.status = "Partially Received";
    else if (!["Cancelled", "Closed"].includes(po.status)) po.status = "Pending";

    await po.save();

    return res.status(201).json({
      success: true,
      message: "Material received successfully (inventory updated in MPN master UOM).",
      data: { grn: newGRN, purchaseOrder: po },
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
//     const userId = req.user?.id || req.user?._id || "system";

//     // 🔹 Basic validations
//     if (!purchaseOrderId) {
//       return res
//         .status(400)
//         .json({ success: false, message: "purchaseOrderId is required." });
//     }

//     if (!items || !Array.isArray(items) || items.length === 0) {
//       return res
//         .status(400)
//         .json({ success: false, message: "No items found in request." });
//     }

//     const now = new Date();
//     const grnNumber = `GRN-${Date.now()}`;

//     // 1️⃣ Purchase Order fetch
//     const po = await PurchaseOrders.findById(purchaseOrderId);
//     if (!po) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Purchase Order not found." });
//     }

//     const poItems = po.items || [];
//     const grnItems = [];

//     // 2️⃣ Loop through received items
//     for (const line of items) {
//       if (!line.mpnId) continue;

//       const itemId = line.itemId; // frontend se aa raha hai (PO items ka _id)
//       const poItem = itemId ? poItems.id(itemId) : null;

//       const receivedQty = Number(line.receivedQty || 0);
//       const rejectedQty = Number(line.rejectedQty || 0);
//       const acceptedQty = Math.max(receivedQty - rejectedQty, 0);

//       let orderedQty = 0;
//       let prevReceivedTotal = 0;
//       let prevRejectedTotal = 0;

//       if (poItem) {
//         orderedQty = Number(poItem.qty || line.orderedQty || 0);
//         prevReceivedTotal = Number(poItem.receivedQtyTotal || 0);
//         prevRejectedTotal = Number(poItem.rejectedQtyTotal || 0);

//         const newReceivedTotal = prevReceivedTotal + receivedQty;
//         const newRejectedTotal = prevRejectedTotal + rejectedQty;

//         const newAcceptedTotal = Math.max(
//           newReceivedTotal - newRejectedTotal,
//           0
//         );

//         const pendingQty = Math.max(orderedQty - newAcceptedTotal, 0);

//         // 🔹 PO item totals update
//         poItem.receivedQtyTotal = newReceivedTotal;
//         poItem.rejectedQtyTotal = newRejectedTotal;
//         poItem.pendingQty = pendingQty;

//         // 🔹 PO item status update
//         if (newAcceptedTotal <= 0 && newRejectedTotal > 0) {
//           poItem.status = "Rejected";
//         } else if (newAcceptedTotal > 0 && pendingQty === 0) {
//           poItem.status = "Accepted";
//         } else if (newAcceptedTotal > 0 && pendingQty > 0) {
//           poItem.status = "Partially Accepted";
//         } else {
//           poItem.status = "Pending";
//         }

//         // 🔹 remarks override if provided
//         if (line.remarks) {
//           poItem.remarks = line.remarks;
//         }

//         // 🔹 GRN item with TOTAL fields
//         grnItems.push({
//           mpnId: line.mpnId,
//           itemId: itemId || null,
//           receivedQty,
//           rejectedQty,
//           remarks: line.remarks || "",
//           receivedQtyTotal: newReceivedTotal,
//           rejectedQtyTotal: newRejectedTotal,
//           pendingQty,
//         });
//       } else {
//         // Agar PO item kahi se match nahi hua – phir bhi GRN me line save kar do
//         const ordered = Number(line.orderedQty || 0);
//         const acceptedTotal = Math.max(receivedQty - rejectedQty, 0);
//         const pendingQty = Math.max(ordered - acceptedTotal, 0);

//         grnItems.push({
//           mpnId: line.mpnId,
//           itemId: itemId || null,
//           receivedQty,
//           rejectedQty,
//           remarks: line.remarks || "",
//           receivedQtyTotal: receivedQty,
//           rejectedQtyTotal: rejectedQty,
//           pendingQty,
//         });
//       }

//       // 3️⃣ Inventory update – sirf accepted quantity stock me dalna
//       if (acceptedQty > 0) {
//         await Inventory.findOneAndUpdate(
//           { mpnId: line.mpnId },
//           {
//             $inc: {
//               balanceQuantity: acceptedQty,
//               incomingQuantity: -acceptedQty, // agar track kar rahe ho
//             },
//             lastUpdated: now,
//           },
//           { upsert: true, new: true }
//         );
//       }

//       // 4️⃣ MPN.purchaseHistory update
//       const purchaseHistoryEntry = {
//         purchasedDate: now,
//         purchasedPrice:
//           line.unitPrice?.toString() ||
//           line.price?.toString() ||
//           "",
//         Supplier: supplierId || line.supplierId || null,
//         LeadTime_WK: Number(line.leadTimeWk || line.leadTime || 0),
//         MOQ: Number(line.moq || line.orderQty || receivedQty || 0),
//         entryDate: now,
//       };

//       await MPN.findByIdAndUpdate(
//         line.mpnId,
//         {
//           $push: {
//             purchaseHistory: {
//               $each: [purchaseHistoryEntry],
//               $position: 0, // latest upar
//             },
//           },
//           $set: {
//             RFQUnitPrice: purchaseHistoryEntry.purchasedPrice,
//           },
//         },
//         { new: true }
//       );
//     }

//     // 5️⃣ GRN (ReceiveMaterial) create with enriched items
//     const newGRN = new ReceiveMaterial({
//       purchaseOrderId,
//       supplierId,
//       receivedBy: userId,
//       items: grnItems,
//       notes,
//       grnNumber,
//       receivedDate: now,
//     });

//     await newGRN.save(); // pre('save') hook chalega (acceptedQty + overallStatus)

//     // 6️⃣ PO ka overall status (Pending / Partially Received / Completed)
//     const updatedItems = po.items || [];

//     const allFullyReceived =
//       updatedItems.length > 0 &&
//       updatedItems.every((it) => {
//         const qty = Number(it.qty || 0);
//         const receivedTotal = Number(it.receivedQtyTotal || 0);
//         const rejectedTotal = Number(it.rejectedQtyTotal || 0);
//         const acceptedTotal = Math.max(receivedTotal - rejectedTotal, 0);
//         return qty > 0 && acceptedTotal >= qty;
//       });

//     const someAccepted = updatedItems.some((it) => {
//       const receivedTotal = Number(it.receivedQtyTotal || 0);
//       const rejectedTotal = Number(it.rejectedQtyTotal || 0);
//       const acceptedTotal = Math.max(receivedTotal - rejectedTotal, 0);
//       return acceptedTotal > 0;
//     });

//     if (allFullyReceived) {
//       po.status = "Completed";
//     } else if (someAccepted) {
//       po.status = "Partially Received";
//     } else {
//       if (!["Cancelled", "Closed"].includes(po.status)) {
//         po.status = "Pending";
//       }
//     }

//     await po.save();

//     // 7️⃣ Final response
//     return res.status(201).json({
//       success: true,
//       message:
//         "Material received, inventory, purchase history & purchase order updated successfully.",
//       data: {
//         grn: newGRN,
//         purchaseOrder: po,
//       },
//     });
//   } catch (error) {
//     console.error("❌ Error in createReceiveMaterial:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message || "Internal server error",
//     });
//   }
// };

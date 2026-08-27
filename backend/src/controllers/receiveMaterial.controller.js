import mongoose from "mongoose";
import Inventory from "../models/Inventory.js";
import MPN from "../models/library/MPN.js";
import PurchaseOrders from "../models/PurchaseOrders.js";
import ReceiveMaterial from "../models/ReceiveMaterial.js";
import UOM from "../models/UOM.js";
import { convertQty, convertToInventoryUom, convertToMeter } from "../utils/uomController.js";


const createPartialPurchaseOrder = async ({
  originalPO,
  remainingItems,
  userId,
}) => {
  if (!remainingItems?.length) {
    return null;
  }

  // =====================================================
  // 1. BASE PO NUMBER
  // =====================================================

  // P26-08-00012
  // P26-08-00012R1 -> P26-08-00012
  // P26-08-00012R2 -> P26-08-00012

  const basePoNumber = String(originalPO.poNumber || "")
    .replace(/R\d+$/i, "");

  if (!basePoNumber) {
    throw new Error("Invalid Purchase Order number.");
  }

  // =====================================================
  // 2. FIND LAST REVISION NUMBER
  // =====================================================

  const escapedBase = basePoNumber.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const existingRevisionPOs =
    await PurchaseOrders.find({
      poNumber: {
        $regex: `^${escapedBase}R\\d+$`,
        $options: "i",
      },
    })
      .select("poNumber revisionNo")
      .lean();

  let maxRevision = 0;

  for (const existing of existingRevisionPOs) {
    const poNumber = String(existing.poNumber || "");

    const match = poNumber.match(/R(\d+)$/i);

    if (match) {
      const revision = Number(match[1]);

      if (Number.isFinite(revision)) {
        maxRevision = Math.max(maxRevision, revision);
      }
    }
  }

  const revisionNo = maxRevision + 1;

  const newPoNumber = `${basePoNumber}R${revisionNo}`;

  // =====================================================
  // 3. CREATE REMAINING ITEMS
  // =====================================================

  let grossAmount = 0;
  let totalDiscount = 0;

  const newItems = remainingItems.map((item) => {
    const qty = Math.max(Number(item.qty || 0), 0);

    const unitPrice = Number(item.unitPrice || 0);

    const discount = Math.max(
      Number(
        item.discount ??
        item.discPercentage ??
        0
      ),
      0
    );

    // -----------------------------------------------------
    // Amount BEFORE discount
    // -----------------------------------------------------

    const grossLineAmount = qty * unitPrice;

    // -----------------------------------------------------
    // Discount amount
    // -----------------------------------------------------

    const discountAmount =
      grossLineAmount * (discount / 100);

    // -----------------------------------------------------
    // Amount AFTER discount
    // -----------------------------------------------------

    const extPrice =
      grossLineAmount - discountAmount;

    grossAmount += grossLineAmount;
    totalDiscount += discountAmount;

    return {
      ...item,

      // Remaining quantity only
      qty,

      unitPrice,

      discount,
      discPercentage: discount,

      extPrice,

      // Fresh receiving for revised PO
      receivedQtyTotal: 0,
      rejectedQtyTotal: 0,

      lastReceivedQty:
        item?.lastReceivedQty || 0,

      pendingQty: qty,

      status: "Pending",
    };
  });

  // =====================================================
  // 4. TOTALS
  // =====================================================

  const freightAmount = Number(
    originalPO.totals?.freightAmount || 0
  );

  // Subtotal BEFORE tax
  const subTotalAmount =
    grossAmount -
    totalDiscount +
    freightAmount;

  const taxPercentage = Number(
    originalPO.taxPercentage ??
    originalPO.totals?.taxPercentage ??
    0
  );

  const ostTax =
    subTotalAmount *
    (taxPercentage / 100);

  const finalAmount =
    subTotalAmount +
    ostTax;

  // =====================================================
  // 5. OLD PO SNAPSHOT
  // =====================================================

  const oldSnapshot =
    typeof originalPO.toObject === "function"
      ? originalPO.toObject()
      : { ...originalPO };

  // Remove Mongo internal fields
  delete oldSnapshot._id;
  delete oldSnapshot.__v;
  delete oldSnapshot.createdAt;
  delete oldSnapshot.updatedAt;

  // =====================================================
  // 6. REVISION HISTORY ENTRY
  // =====================================================

  const revisionEntry = {
    revisionNo,
    revisedAt: new Date(),
    snapshot: oldSnapshot,
  };

  // =====================================================
  // 7. NEW PO DATA
  // =====================================================

  const originalTotals =
    typeof originalPO.totals?.toObject === "function"
      ? originalPO.totals.toObject()
      : originalPO.totals || {};

  const newPOData = {
    ...oldSnapshot,

    // -----------------------------------------------------
    // PO Identity
    // -----------------------------------------------------

    poNumber: newPoNumber,
    revisionNo,
    isRevised: true,

    // -----------------------------------------------------
    // New PO status
    // -----------------------------------------------------

    status: "Pending",

    // -----------------------------------------------------
    // Remaining items
    // -----------------------------------------------------

    items: newItems,

    // -----------------------------------------------------
    // Tax
    // -----------------------------------------------------

    taxPercentage,

    // -----------------------------------------------------
    // Totals
    // -----------------------------------------------------

    totals: {
      ...originalTotals,

      subTotalAmount,
      freightAmount,
      totalDiscount,
      taxPercentage,
      ostTax,
      finalAmount,
    },

    // -----------------------------------------------------
    // Revision history
    // -----------------------------------------------------

    revisionHistory: [
      ...(Array.isArray(originalPO.revisionHistory)
        ? originalPO.revisionHistory
        : []),

      revisionEntry,
    ],

    // -----------------------------------------------------
    // Created by
    // -----------------------------------------------------

    createdBy: userId,
  };

  // =====================================================
  // 8. REMOVE OLD MONGOOSE FIELDS
  // =====================================================

  delete newPOData._id;
  delete newPOData.__v;
  delete newPOData.createdAt;
  delete newPOData.updatedAt;

  // =====================================================
  // 9. CREATE NEW REVISED PO
  // =====================================================

  const newPO =
    await PurchaseOrders.create(newPOData);

  return newPO;
};


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

    const remainingItemsForNewPO = [];
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
        .select("UOM") // master uom stored here
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
      if (
        Number(line.rejectedQty || 0) > 0 &&
        !line.remarks?.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Remarks is required when rejected quantity is entered."
        });
      }


      const mpnId = getId(line.mpnId || line.mpn);

      if (!mpnId || !mongoose.Types.ObjectId.isValid(mpnId)) continue;

      const mpnDoc = mpnMap.get(String(mpnId));

      // console.log('-------mpnDoc', mpnDoc)
      // ✅ Master UOM from MPN (Reference)
      const masterUomId = getId(mpnDoc?.UOM || mpnDoc?.uom) || null;
      const masterUomName = getUomName(masterUomId);

      const itemId = getId(line.itemId); // PO item _id
      const poItem = itemId ? poItems.id(itemId) : null;

      const receivedQty = Number(line.receivedQty || 0);
      const rejectedQty = Number(line.rejectedQty || 0);

      const acceptedQty = Math.max(
        receivedQty - rejectedQty,
        0
      );



      // ✅ from UOM priority: line.uom > poItem.uom > masterUOM
      const fromUomId = getId(line.uomId || line.uom || poItem?.uomId || poItem?.uom) || null;
      const fromUomName = getUomName(fromUomId) || masterUomName;
      const fromUOMId = await MPN.findById(line.mpnId._id)


      // console.log('-------acceptedQty', poItem.receivedQtyTotal, fromUomId,receivedQty)
      const acceptedQtyInMaster = await convertToMeter({
        qty: receivedQty,
        fromUom: fromUomId,
        // toUom: masterUomId,
      });

      // console.log('-------acceptedQtyInMaster',acceptedQtyInMaster)
      // ---- PO totals update ----
      if (poItem) {
        const orderedQty = Number(
          poItem.qty ||
          line.orderedQty ||
          0
        );

        const prevReceivedTotal = Number(
          poItem.receivedQtyTotal || 0
        );

        const prevRejectedTotal = Number(
          poItem.rejectedQtyTotal || 0
        );

        // =====================================================
        // TOTAL RECEIVED
        // =====================================================



        const newReceivedTotal =
          prevReceivedTotal + receivedQty;

        const newRejectedTotal =
          prevRejectedTotal + rejectedQty;

        // Remaining physical quantity
        const pendingQty = Math.max(
          orderedQty - newReceivedTotal,
          0
        );

        const ordered = Number(line.orderedQty || 0);

        const pen = Math.max(ordered - acceptedQty + rejectedQty)
        // =====================================================
        // UPDATE ORIGINAL PO ITEM
        // =====================================================

        poItem.receivedQtyTotal =
          newReceivedTotal;

        poItem.rejectedQtyTotal =
          newRejectedTotal;

        poItem.pendingQty =
          pendingQty;

        poItem.lastReceivedQty = receivedQty;
        // =====================================================
        // ITEM STATUS
        // =====================================================

        if (
          newReceivedTotal >=
          orderedQty
        ) {
          poItem.status = "Accepted";
        } else if (
          newReceivedTotal > 0
        ) {
          poItem.status =
            "Partially Accepted";
        } else {
          poItem.status = "Pending";
        }

        if (line.remarks?.trim()) {
          poItem.remarks =
            line.remarks.trim();
        }

        // =====================================================
        // GRN ITEM
        // =====================================================

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

          remarks:
            line.remarks || "",

          receivedQtyTotal:
            newReceivedTotal,
          lastReceivedQty: receivedQty,
          rejectedQtyTotal:
            newRejectedTotal,

          pendingQty: pen,
        });

        // =====================================================
        // REMAINING QTY FOR NEW PO
        // =====================================================

        if (pendingQty > 0) {
          const oldItemData =
            poItem.toObject();

          // Old receiving values remove/reset
          const newItem = {
            ...oldItemData,

            // ONLY REMAINING QTY
            qty: pendingQty,

            // Fresh receiving for new PO
            receivedQtyTotal: 0,
            rejectedQtyTotal: 0,
            lastReceivedQty: receivedQty,
            pendingQty,

            status: "Pending",

            // Keep pricing
            unitPrice:
              Number(
                poItem.unitPrice || 0
              ),

            discount:
              Number(
                poItem.discount ??
                poItem.discPercentage ??
                0
              ),

            discPercentage:
              Number(
                poItem.discPercentage ??
                poItem.discount ??
                0
              ),

            extPrice:
              pendingQty *
              Number(
                poItem.unitPrice || 0
              ) *
              (
                1 -
                Number(
                  poItem.discount ??
                  poItem.discPercentage ??
                  0
                ) / 100
              ),
          };

          delete newItem._id;

          remainingItemsForNewPO.push(
            newItem
          );
        }
      } else {
        const ordered = Number(line.orderedQty || 0);
        const pendingQty = Math.max(ordered - acceptedQty + rejectedQty);

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


      const before = await Inventory.findOne({
        mpnId: new mongoose.Types.ObjectId(mpnId)
      });

      // console.log(
      //   "BEFORE:",
      //   before.balanceQuantity
      // );
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

      const after = await Inventory.findOne({
        mpnId: new mongoose.Types.ObjectId(mpnId)
      });

      // console.log(
      //   "AFTER:",
      //   after.balanceQuantity
      // );

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

    let partialPurchaseOrder = null;
    let revisedPOBlocked = false;
    let revisedPOBlockMessage = null;




    if (remainingItemsForNewPO.length > 0) {
      const basePoNumber = String(
        po.poNumber || ""
      ).replace(/R\d+$/i, "");

      const escapedBase = basePoNumber.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const revisedPOs = await PurchaseOrders.find({
        poNumber: {
          $regex: `^${escapedBase}R\\d+$`,
          $options: "i",
        },
      })
        .select("poNumber status revisionNo")
        .lean();

      let latestRevisedPO = null;

      for (const current of revisedPOs) {
        const currentRevision = Number(
          String(current.poNumber || "")
            .match(/R(\d+)$/i)?.[1] || 0
        );

        if (!latestRevisedPO) {
          latestRevisedPO = current;
          continue;
        }

        const latestRevision = Number(
          String(latestRevisedPO.poNumber || "")
            .match(/R(\d+)$/i)?.[1] || 0
        );

        if (currentRevision > latestRevision) {
          latestRevisedPO = current;
        }
      }

      console.log("====================================");
      console.log("BASE PO:", basePoNumber);
      console.log(
        "LATEST REVISED PO:",
        latestRevisedPO?.poNumber
      );
      console.log(
        "LATEST REVISED PO STATUS:",
        latestRevisedPO?.status
      );
      console.log("====================================");

      // =====================================================
      // PREVIOUS REVISION EXISTS AND IS NOT READY
      // =====================================================

      if (
        latestRevisedPO &&
        !["Emailed", "Acknowledged"].includes(
          latestRevisedPO.status
        )
      ) {
        revisedPOBlocked = true;

        revisedPOBlockMessage =
          `New Revised Purchase Order was not created. ` +
          `Previous Revised Purchase Order "${latestRevisedPO.poNumber}" ` +
          `is currently "${latestRevisedPO.status}". ` +
          `Please Emailed or Acknowledged "${latestRevisedPO.poNumber}" ` +
          `before creating the next Revised Purchase Order.`;

        console.log(
          "❌ REVISED PO BLOCKED:",
          revisedPOBlockMessage
        );
      }

      // =====================================================
      // CREATE NEXT REVISION
      // =====================================================

      if (!revisedPOBlocked) {
        partialPurchaseOrder =
          await createPartialPurchaseOrder({
            originalPO: po,
            remainingItems: remainingItemsForNewPO,
            userId,
          });

        console.log(
          "✅ Partial PO created:",
          partialPurchaseOrder.poNumber
        );
      }
    }

    const updatedItems = po.items || [];

    // const allProcessed = updatedItems.length > 0 && updatedItems.every((it) => {
    //   const orderedQty = Number(it.qty || 0);
    //   const receivedTotal = Number(it.receivedQtyTotal || 0);
    //   const rejectedTotal = Number(it.rejectedQtyTotal || 0);

    //   const processedQty = receivedTotal + rejectedTotal;

    //   return processedQty >= orderedQty;
    // });

    // const anyProcessed = updatedItems.some((it) => {
    //   const receivedTotal = Number(it.receivedQtyTotal || 0);
    //   const rejectedTotal = Number(it.rejectedQtyTotal || 0);

    //   return (receivedTotal + rejectedTotal) > 0;
    // });

    // if (allProcessed) {
    //   po.status = "Closed";
    // } else if (anyProcessed) {
    //   po.status = "Partially Received";
    // } else if (!["Cancelled", "Closed"].includes(po.status)) {
    //   po.status = "Pending";
    // }

    const allReceived = updatedItems.every((it) => {
      const orderedQty = Number(it.qty || 0);
      const receivedQty = Number(it.receivedQtyTotal || 0);

      return receivedQty >= orderedQty;
    });

    const anyReceived = updatedItems.some((it) => {
      return Number(it.receivedQtyTotal || 0) > 0;
    });

    if (allReceived) {
      po.status = "Closed";
    } else if (anyReceived) {
      po.status = "Partially Received";
    } else {
      po.status = "Pending";
    }

    await po.save();

    // return res.status(201).json({
    //   success: true,

    //   message: partialPurchaseOrder
    //     ? `Material received successfully. Remaining quantity PO ${partialPurchaseOrder.poNumber} created.`
    //     : "Material received successfully.",

    //   data: {
    //     grn: newGRN,

    //     purchaseOrder: po,

    //     partialPurchaseOrder:
    //       partialPurchaseOrder || null,
    //   },
    // });
    return res.status(201).json({
      success: true,

      message: partialPurchaseOrder
        ? `Material received successfully. Remaining quantity PO ${partialPurchaseOrder.poNumber} created.`
        : revisedPOBlocked
          ? revisedPOBlockMessage
          : "Material received successfully.",

      data: {
        grn: newGRN,
        purchaseOrder: po,
        partialPurchaseOrder: partialPurchaseOrder || null,

        revisedPOBlocked,
        revisedPOBlockMessage,
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


export const closePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;


    const po = await PurchaseOrders.findById(id);

    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    if (po.status === "Closed") {
      return res.status(400).json({
        success: false,
        message: "Purchase Order already closed",
      });
    }

    po.status = "Closed";
    po.closedAt = new Date();
    po.closedBy = req.user._id;
    po.closeRemarks = "Close PO Manual";

    await po.save();

    return res.status(200).json({
      success: true,
      message: "Purchase Order closed successfully",
      data: po,
    });
  } catch (error) {
    console.error("closePurchaseOrder", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
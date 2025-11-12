import Inventory from "../models/Inventory.js";
import receiveMaterial from "../models/receiveMaterial.js";



export const createReceiveMaterial = async (req, res) => {
  try {
    const { purchaseOrderId, supplierId, receivedBy, items, notes } = req.body;
    const userId = req.user.id;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "No items found in request." });
    }

    // 🧾 Create new GRN (ReceiveMaterial Entry)
    const newGRN = new receiveMaterial({
      purchaseOrderId,
      supplierId,
      receivedBy:userId,
      items,
      notes,
    });

    await newGRN.save();

    // 🔁 Update Inventory for each accepted item
    for (const item of items) {
  const acceptedQty = item.receivedQty - (item.rejectedQty || 0);
  
  if (acceptedQty > 0) {
    await Inventory.findOneAndUpdate(
      { mpnId: item.mpnId },
      { 
        $inc: { 
          balanceQuantity: acceptedQty,
          incomingQuantity: -acceptedQty // Reduce incoming since now received
        }, 
        lastUpdated: new Date() 
      },
      { upsert: true, new: true }
    );
  }
}

    return res.status(201).json({
      success: true,
      message: "Material received and inventory updated successfully.",
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

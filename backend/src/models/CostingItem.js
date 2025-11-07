import mongoose from "mongoose";

const CostingItemSchema = new mongoose.Schema({
    drawingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Drawing",
        required: true,
    },
    itemNumber: { type: String, required: true },
    description: { type: String, required: true },
    quoteType: {
        type: String,
        enum: ["material", "manhour", "packing"],
        required: true
    },
    childPart: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChildLibrary",
    },
    // Material specific fields
    mpn: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MPNLibrary",
    },
    manufacturer: { type: String },
    uom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UOM",
    },
    quantity: { type: Number, default: 1 },
    moq: { type: Number, default: 0 },
    tolerance: { type: Number, default: 0 },
    actualQty: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    sgaPercent: { type: Number, default: 0 },
    freightCost: { type: Number, default: 0 },
    matBurden: { type: Number, default: 0 },
    leadTime: { type: Number, default: 0 },
    supplier: { type: String },
    rfqDate: { type: Date },

    // Manhour specific fields
    skillLevel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SkillLevelCosting",
    },
    remarks: { type: String },

    // Packing specific fields
    maxBurden: { type: Number, default: 0 },
    freightPercent: { type: Number, default: 0 },

    // Common fields
    salesPrice: { type: Number, default: 0 },
    extPrice: { type: Number, default: 0 },
    editedBy: { type: String },
    createdAt: { type: Date, default: Date.now },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

const CostingItems = mongoose.model("CostingItems", CostingItemSchema);

export default CostingItems;
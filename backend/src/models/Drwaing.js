import mongoose from "mongoose";

// const DrawingSchema = new mongoose.Schema(
//     {
//         drawingNo: { type: String, required: true, unique: true },
//         description: { type: String, required: true },

//         // References
//         projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
//         customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },

//         qty: { type: Number, default: 1 },
//         unitPrice: { type: Number, default: 0.0 },
//         totalPrice: { type: Number, default: 0.0 },
//         leadTimeWeeks: { type: Number, default: 0 },
//         quotedDate: { type: Date, default: null },
//         currency: {
//             type: String,
//             enum: ["USD", "EUR", "GBP", "INR"],
//             default: "INR",
//         },
//         quoteStatus: {
//             type: String,
//             enum: ["active", "inactive", "completed"],
//             default: "active",
//         },
//         quoteType: { type: String }, // e.g., "box_build_assembly"
//         lastEditedBy: { type: String, default: null },
//     },
//     { timestamps: true }
// );

const DrawingSchema = new mongoose.Schema(
    {
        drawingNo: { type: String, required: true, unique: true },
        description: { type: String, required: true },

        // References
        projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
        // Existing fields
        qty: { type: Number, default: 1 },
        unitPrice: { type: Number, default: 0.0 },
        totalPrice: { type: Number, default: 0.0 },
        freightPercent: { type: Number, default: 0 },
        leadTimeWeeks: { type: Number, default: 0 },
        quotedDate: { type: Date, default: null },
        currency: { type: mongoose.Schema.Types.ObjectId, ref: "Currency" },
        quoteStatus: {
            type: String,
            enum: ["active", "inactive", "completed"],
            default: "active",
        },
        quoteType: { type: String },
        lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        materialMarkup: { type: Number, default: null }, // per-drawing override
        manhourMarkup: { type: Number, default: null },
        packingMarkup: { type: Number, default: null },
        totalPriceWithMarkup: { type: Number, default: 0 },
        materialTotal: { type: Number, default: 0 },
        manhourTotal: { type: Number, default: 0 },
        packingTotal: { type: Number, default: 0 },
    },
    { timestamps: true }
);

const Drawing = mongoose.model("Drawing", DrawingSchema);

export default Drawing;

import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema(
    {
        companyName: { type: String, required: true },
        contactPerson: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        phone: { type: String, required: true },
        paymentTerms: { type: String },
        incoterms: { type: String },
        address: { type: String },
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    },
    { timestamps: true }
);

export default mongoose.model("Customer", CustomerSchema);

import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    contactPerson: {
      type: String,
      required: true,
      trim: true,
    },
    companyAddress:{
      type:String,
      default:""
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email address"],
    },
    phone: {
      type: String,
      trim: true,
    },
    currency: { type: mongoose.Schema.Types.ObjectId, ref: "Currency" },
    gst: {
      type: Boolean,
      default: false,
    },
    paymentTerms: {
      type: String,
      trim: true,
    },
    incoTerms: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "deactive"],
      default: "active",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Supplier", supplierSchema);

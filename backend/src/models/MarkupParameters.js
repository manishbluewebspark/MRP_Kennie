import mongoose from "mongoose";

const markupParameterSchema = new mongoose.Schema(
  {
    materialsMarkup: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    manhourMarkup: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    packingMarkup: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

const MarkupParameter = mongoose.model("MarkupParameter", markupParameterSchema);

export default MarkupParameter;

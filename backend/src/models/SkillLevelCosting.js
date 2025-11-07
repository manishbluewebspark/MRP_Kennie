import mongoose from "mongoose";

const SkillLevelCostingSchema = new mongoose.Schema(
  {
    skillLevelName: {
      type: String,
      required: true,
      trim: true,
    },
    rate: {
      type: Number,
      required: true,
      default: 0,
    },
    currencyType: {
     type: mongoose.Schema.Types.ObjectId,
      ref: "Currency",
    },
    type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UOM",
    },
    description: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const SkillLevelCosting = mongoose.model("SkillLevelCosting", SkillLevelCostingSchema);

export default SkillLevelCosting;

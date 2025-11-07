import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  token: { type: String, required: true },
  expires: { type: Date, required: true },
}, { timestamps: true });

export default mongoose.model("Token", tokenSchema);

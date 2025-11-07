import mongoose from "mongoose";

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // Admin, Manager, User etc.
  permissions: {
    type: [String], // list of permissions
    default: [],   // e.g. ["read:user","create:product"]
  },
}, { timestamps: true });

export default mongoose.model("Role", roleSchema);

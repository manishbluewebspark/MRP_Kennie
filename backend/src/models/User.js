import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    userName: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    tempPassword: { type: String, required: false },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },

    isActive: { type: Boolean, default: true },      // active/inactive
    isDeleted: { type: Boolean, default: false },    // soft delete

    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    lastLogin: { type: Date },
    resetPasswordOtp: { type: String },
    resetPasswordExpires: { type: Date },
    isOtpVerified: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Optional: Add phone, avatar, address if needed
    phone: { type: String },
    avatar: { type: String },
    address: { type: String },
    city: { type: String },
    postcode: { type: String },
    website: { type: String },
    dateOfBirth: { type: Date },
    permissions: [{ type: String }],
  },
  { timestamps: true }
);

// ===== Password hash before save =====
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ===== Compare password method =====
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// ===== Soft delete method =====
userSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  await this.save();
};

export default mongoose.model("User", userSchema);

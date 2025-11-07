import User from "../models/User.js";
import Role from "../models/Role.js";
import Token from "../models/Token.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { send } from "process";
import fs from 'fs';
import path from 'path';

// ===== Helper Functions =====
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role.name,
      permissions: user.role.permissions,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" } // access token
  );
};

const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString("hex");
};

// ===== Login =====
// export const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     const user = await User.findOne({ email }).populate("role");
//     if (!user) return res.status(400).json({ message: "Invalid credentials" });

//     const isMatch = await user.comparePassword(password);
//     if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

//     const accessToken = generateToken(user);
//     const refreshToken = generateRefreshToken();

//     const expires = new Date();
//     expires.setDate(expires.getDate() + 7); // refresh token 7 days

//     await Token.create({ user: user._id, token: refreshToken, expires });

//     res.status(200).send({
//       data: {
//         success: true,
//         message: "Login successful",
//         accessToken,
//         refreshToken,
//       }
//     });

//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // User find with role populated
    const user = await User.findOne({ email }).populate("role");
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Password check
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Tokens generate
    const accessToken = generateToken(user);        // JWT token
    const refreshToken = generateRefreshToken();    // random token

    const expires = new Date();
    expires.setDate(expires.getDate() + 7); // refresh token expires in 7 days

    // Save refresh token in DB
    await Token.create({ user: user._id, token: refreshToken, expires });

    // Send response with user details + tokens
    res.status(200).send({
      data: {
        success: true,
        message: "Login successful",
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role.name,         // role name
          permissions: user.permissions || [],
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// ===== Refresh Token =====
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: "Refresh token required" });

    const tokenDoc = await Token.findOne({ token: refreshToken }).populate("user");
    if (!tokenDoc || tokenDoc.expires < new Date()) {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    const user = await User.findById(tokenDoc.user._id).populate("role");
    const accessToken = generateToken(user);

    res.json({ accessToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== Logout =====
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    await Token.findOneAndDelete({ token: refreshToken });
    res.status(200).send({ data: { message: "Logged out successfully" } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== Forgot Password =====
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).send({ data: { message: "User not found" } });

    // 4 digit random OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Save OTP with 2 min expiry
    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = Date.now() + 2 * 60 * 1000; // 2 min
    await user.save();

    // Send OTP by email
    // await sendEmail(user.email, "Password Reset OTP", `Your OTP is ${otp}. It will expire in 2 minutes.`);

    res.json({ data: { message: "OTP sent ", data: { otp } } });
  } catch (error) {
    res.status(500).send({ data: { message: error.message } });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = Date.now() + 2 * 60 * 1000; // 2 min
    await user.save();

    // await sendEmail(user.email, "New Password Reset OTP", `Your new OTP is ${otp}. It will expire in 2 minutes.`);

    res.json({ message: "New OTP sent to email", data: { otp } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /auth/verify-otp
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: null
      });
    }

    if (user.resetPasswordOtp !== otp || user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
        data: null
      });
    }

    // OTP verified, remove it
    user.resetPasswordOtp = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(200).send({
      success: true,
      message: "OTP verified successfully",
      data: {
        email: user.email
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
      data: null
    });
  }
};



// ===== Reset Password =====
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body; // email client se bheja hoga
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: "User not found" });

    user.password = newPassword;
    user.resetPasswordOtp = undefined;     // clear OTP
    user.resetPasswordExpires = undefined; // clear expiry
    await user.save();

    res.status(200).send({ success: true, message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Profile Controller
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id; // from auth middleware

    const {
      name,
      email,
      userName,
      phoneNumber,
      website,
      address,
      city,
      postcode,
      dateOfBirth
    } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (userName) user.userName = userName  ;
    if (phoneNumber) user.phone = phoneNumber;
    if (website) user.website = website;
    if (address) user.address = address;
    if (city) user.city = city;
    if (postcode) user.postcode = postcode;
    if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);

    // Handle Avatar Upload
    if (req.file) {
      // Save only relative path
      user.avatar = `/uploads/${req.file.fieldname}/${req.file.filename}`;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyDetails = async (req, res) => {
  try {
    // authenticate middleware se user ID milega
    const userId = req.user.id || req.user._id;

    const user = await User.findById(userId).populate("role", "name permissions").lean(); // lean() se plain JS object milega

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Sensitive fields ko remove karo agar chahiye
    const { password, __v, ...userData } = user;

    res.json({ user: userData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const userId = req.user.id; // req.user auth middleware se aayega
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Both old and new password are required" });
    }

    // 1. Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(404).json({ message: "Old password is incorrect" });
    }

    // 3. Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // 4. Save updated user
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
      data: {
        userId: user._id,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Update password error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};


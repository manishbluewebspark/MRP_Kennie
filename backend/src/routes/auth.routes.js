import express from "express";
import {
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  resendOtp,
  verifyOtp,
  updateProfile,
  getMyDetails,
  updatePassword,
} from "../controllers/auth.controller.js";
import { upload } from '../middlewares/upload.js';
import { authenticate } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/resend-otp", resendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.patch('/profile', authenticate, upload.single('avatar'), updateProfile);
router.get('/me', authenticate, getMyDetails)
router.post("/update-password", authenticate, updatePassword);
export default router;

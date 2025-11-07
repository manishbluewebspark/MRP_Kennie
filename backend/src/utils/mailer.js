import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// ===== Create transporter =====
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "smtp.example.com",
  port: process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT) : 587,
  secure: process.env.MAIL_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// ===== Send mail helper =====
export const sendMail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: `"No-Reply" <${process.env.MAIL_FROM || process.env.MAIL_USER}>`,
      to,
      subject,
      text: text || "",
      html: html || "",
    });
    console.log("📧 Mail sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Error sending mail:", error);
    throw error;
  }
};

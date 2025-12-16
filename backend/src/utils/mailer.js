import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export const sendMailWithAttachment = async ({ to, subject, html, attachments = [] }) => {
  return transporter.sendMail({
    from: process.env.MAIL_FROM, // e.g. "sales@exxeltech.com"
    to,
    subject,
    html,
    attachments,
  });
};

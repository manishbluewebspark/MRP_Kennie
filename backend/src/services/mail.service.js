import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";

export const sendEmail = async (to, subject, template, data) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const templatePath = path.join(process.cwd(), "templates", `${template}.ejs`);
  const html = await ejs.renderFile(templatePath, data);

  await transporter.sendMail({
    from: `"Kenniee MRP" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });

  console.log(`📩 Email sent to ${to}`);
};

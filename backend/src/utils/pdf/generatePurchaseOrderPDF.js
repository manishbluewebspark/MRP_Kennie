import path from "path";
import ejs from "ejs";
import puppeteer from "puppeteer";

export const generatePurchaseOrderPDFBuffer = async (purchaseOrder) => {
  const templatePath = path.join(process.cwd(), "templates", "po.ejs");

  const html = await ejs.renderFile(
    templatePath,
    { po: purchaseOrder },
    { async: true }
  );

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    // A4 PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", right: "10mm", bottom: "12mm", left: "10mm" },
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
};

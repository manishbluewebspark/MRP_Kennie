import XLSX from "xlsx";
import fs from "fs";
import path from "path";

/**
 * Export data to Excel
 * @param {Array<Object>} data - Array of objects
 * @param {String} sheetName - Sheet name
 * @param {String} filename - Output filename
 * @returns {String} File path
 */
export const exportToExcel = (data, sheetName = "Sheet1", filename = "export.xlsx") => {
  if (!Array.isArray(data) || data.length === 0) throw new Error("No data to export");

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const filePath = path.join(process.cwd(), "uploads", filename);
  XLSX.writeFile(wb, filePath);

  return filePath;
};

/**
 * Import data from Excel
 * @param {String} filePath - Path to Excel file
 * @returns {Array<Object>} Parsed data
 */
export const importFromExcel = (filePath) => {
  if (!fs.existsSync(filePath)) throw new Error("File not found");

  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  const data = XLSX.utils.sheet_to_json(ws, { defval: null });
  return data;
};

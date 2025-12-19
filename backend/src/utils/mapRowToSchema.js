// // utils/mapRowToSchema.js
// export function mapRowToSchemaforMPN(row) {
//   // Normalize keys to lowercase + trim spaces
//   const normalizedRow = {};
//   for (const key in row) {
//     normalizedRow[key.toLowerCase().trim()] = row[key];
//   }

//   // Basic MPN data
//   const mapped = {
//     MPN: normalizedRow["mpn"] || "",
//     Manufacturer: normalizedRow["manufacturer"] || "",
//     Description: normalizedRow["description"] || "",
//     UOM: normalizedRow["uom"] || "",
//     StorageLocation: normalizedRow["storage location"] || "",
//     RFQUnitPrice: normalizedRow["rfq unit price"] || "",
//     currency: normalizedRow["Currency"] || "",
//     MOQ: normalizedRow["moq"] ? Number(normalizedRow["moq"]) : null,
//     RFQ: normalizedRow["rfq"] || "",
//     RFQDate: normalizedRow["rfq date"] ? new Date(normalizedRow["rfq date"]) : null,
//     Supplier: normalizedRow["supplier"] || "",
//     LeadTime_WK: normalizedRow["lead time_wk"] ? Number(normalizedRow["lead time_wk"]) : null,
//     Category: normalizedRow["category"] || "",
//     Status: normalizedRow["status"] || "active",
//     note: normalizedRow["notes"] || "",
//     purchaseHistory: []
//   };

//   // Handle dynamic purchase history (Purchased Price#1, MOQ#1, Purchased Date#1, Supplier#1, Lead Time#1_Wk)
//   let i = 1;
//   while (normalizedRow[`Purchased Price#${i}`] || normalizedRow[`Supplier#${i}`]) {
//     mapped.purchaseHistory.push({
//       purchasedPrice: normalizedRow[`purchased price#${i}`] || "",
//       moq: normalizedRow[`moq#${i}`] ? Number(normalizedRow[`moq#${i}`]) : null,
//       purchasedDate: normalizedRow[`purchased date#${i}`]
//         ? new Date(normalizedRow[`purchased date#${i}`])
//         : null,
//       supplier: normalizedRow[`supplier#${i}`] || "",
//       currency: normalizedRow[`Currency#${i}`] || "",
//       leadTimeWeeks: normalizedRow[`lead time#${i}_wk`]
//         ? Number(normalizedRow[`lead time#${i}_wk`])
//         : null
//     });
//     i++;
//   }

//   return mapped;
// }

const parseExcelDate = (val) => {
  if (val === null || val === undefined || val === "") return null;

  // Already Date
  if (val instanceof Date && !isNaN(val)) return val;

  // Excel serial number (e.g., 45839)
  if (typeof val === "number") {
    const utcDays = Math.floor(val - 25569);
    const utcValue = utcDays * 86400;
    const d = new Date(utcValue * 1000);
    return isNaN(d) ? null : d;
  }

  // String date
  const d = new Date(val);
  return isNaN(d) ? null : d;
};

// normalize key: lowercase, trim, collapse multiple spaces
const normKey = (k = "") =>
  String(k).toLowerCase().trim().replace(/\s+/g, " ");

// read value with multiple keys
const pick = (obj, keys) => {
  for (const k of keys) {
    const nk = normKey(k);
    const v = obj[nk];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return "";
};



export function mapRowToSchemaforMPN(row) {
  // 1) normalize all keys
  const normalizedRow = {};
  for (const key in row) {
    normalizedRow[normKey(key)] = row[key];
  }

  // 2) base fields (support both "storage location" and "storagelocation")
  const mapped = {
    MPN: pick(normalizedRow, ["mpn"]),
    Manufacturer: pick(normalizedRow, ["manufacturer"]),
    Description: pick(normalizedRow, ["description"]),
    UOM: pick(normalizedRow, ["uom"]),

    StorageLocation: pick(normalizedRow, ["storage location", "storagelocation"]),

    RFQUnitPrice: pick(normalizedRow, ["rfq unit price", "rfqunitprice"]),
    currency: pick(normalizedRow, ["currency"]), // ✅ lowercase key

    MOQ: (() => {
      const v = pick(normalizedRow, ["moq"]);
      return v !== "" ? Number(v) : null;
    })(),

    RFQ: pick(normalizedRow, ["rfq"]),
    RFQDate: (() => {
      const v = pick(normalizedRow, ["rfq date"]);
      return v ? parseExcelDate(v) : null;
    })(),

    Supplier: pick(normalizedRow, ["supplier"]), // ✅ handles "supplier " also
    LeadTime_WK: (() => {
      const v = pick(normalizedRow, ["lead time_wk", "lead time wk", "lead time_wk"]);
      return v !== "" ? Number(v) : null;
    })(),

    Category: pick(normalizedRow, ["category"]),
    Status: pick(normalizedRow, ["status"]) || "active",
    note: pick(normalizedRow, ["note", "notes"]),

    purchaseHistory: [],
  };

  // 3) purchase history dynamic columns
  // supports: "Purchased Price#1" OR "Purchased Price #1"
  let i = 1;
  while (true) {
    const price = pick(normalizedRow, [`purchased price#${i}`, `purchased price #${i}`]);
    const sup = pick(normalizedRow, [`supplier#${i}`, `supplier #${i}`]);

    // break if no meaningful data
    if (!price && !sup) break;

    const moqVal = pick(normalizedRow, [`moq#${i}`, `moq #${i}`]);
    const dateVal = pick(normalizedRow, [`purchased date#${i}`, `purchased date #${i}`]);
    const curVal = pick(normalizedRow, [`currency#${i}`, `currency #${i}`]);
    const ltVal = pick(normalizedRow, [
      `lead time#${i}_wk`,
      `lead time #${i} (wk)`,
      `lead time#${i}_wk`,
      `lead time#${i}_wk`,
    ]);

    mapped.purchaseHistory.push({
      purchasedPrice: price !== "" ? Number(price) : null,
      moq: moqVal !== "" ? Number(moqVal) : null,
      purchasedDate: dateVal ? parseExcelDate(dateVal) : null,
      supplier: sup || "",
      currency: curVal || "",
      leadTimeWeeks: ltVal !== "" ? Number(ltVal) : null,
    });

    i++;
  }

  return mapped;
}
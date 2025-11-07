// utils/mapRowToSchema.js
export function mapRowToSchemaforMPN(row) {
  // Normalize keys to lowercase + trim spaces
  const normalizedRow = {};
  for (const key in row) {
    normalizedRow[key.toLowerCase().trim()] = row[key];
  }

  // Basic MPN data
  const mapped = {
    MPN: normalizedRow["mpn"] || "",
    Manufacturer: normalizedRow["manufacturer"] || "",
    Description: normalizedRow["description"] || "",
    UOM: normalizedRow["uom"] || "",
    StorageLocation: normalizedRow["storage location"] || "",
    RFQUnitPrice: normalizedRow["rfq unit price"] || "",
    MOQ: normalizedRow["moq"] ? Number(normalizedRow["moq"]) : null,
    RFQ: normalizedRow["rfq"] || "",
    RFQDate: normalizedRow["rfq date"] ? new Date(normalizedRow["rfq date"]) : null,
    Supplier: normalizedRow["supplier"] || "",
    LeadTime_WK: normalizedRow["lead time_wk"] ? Number(normalizedRow["lead time_wk"]) : null,
    Category: normalizedRow["category"] || "",
    Status: normalizedRow["status"] || "active",
    note: normalizedRow["notes"] || "",
    purchaseHistory: []
  };

  // Handle dynamic purchase history (Purchased Price#1, MOQ#1, Purchased Date#1, Supplier#1, Lead Time#1_Wk)
  let i = 1;
  while (normalizedRow[`purchased price#${i}`] || normalizedRow[`supplier#${i}`]) {
    mapped.purchaseHistory.push({
      purchasedPrice: normalizedRow[`purchased price#${i}`] || "",
      moq: normalizedRow[`moq#${i}`] ? Number(normalizedRow[`moq#${i}`]) : null,
      purchasedDate: normalizedRow[`purchased date#${i}`]
        ? new Date(normalizedRow[`purchased date#${i}`])
        : null,
      supplier: normalizedRow[`supplier#${i}`] || "",
      leadTimeWeeks: normalizedRow[`lead time#${i}_wk`]
        ? Number(normalizedRow[`lead time#${i}_wk`])
        : null
    });
    i++;
  }

  return mapped;
}

import mongoose from "mongoose";
import UOM from "../models/UOM.js";

/* ------------------ helpers ------------------ */

const norm = (v = "") => String(v).trim().toLowerCase();

/* ------------------ LENGTH FACTORS (BASE = METER) ------------------ */

const LENGTH_TO_METER = {
  m: 1, meter: 1, metre: 1,
  cm: 0.01, centimeter: 0.01,
  mm: 0.001, millimeter: 0.001,
  ft: 0.3048, foot: 0.3048, feet: 0.3048,
  in: 0.0254, inch: 0.0254, inches: 0.0254,
};

const isLength = (code) => !!LENGTH_TO_METER[norm(code)];

/* ------------------ RESOLVE UOM CODE ------------------ */

const resolveUomCode = async (uomInput) => {
  console.log('-----uomInput',uomInput)
  if (typeof uomInput === "string" && !mongoose.Types.ObjectId.isValid(uomInput)) {
    return norm(uomInput);
  }

  if (!mongoose.Types.ObjectId.isValid(uomInput)) {
    throw new Error("Invalid UOM reference");
  }

  const uom = await UOM.findById(uomInput).lean();
  if (!uom) throw new Error("UOM not found");

  return norm(uom.code);
};

/* ------------------ CORE CONVERTER ------------------ */

/**
 * 🔒 Length → ALWAYS meter
 * EA / COUNT → no conversion
 */
export const convertQty = async ({
  qty,
  fromUomId,
}) => {
   console.log('-----qty',qty, fromUomId)
  const q = Number(qty);
  if (!Number.isFinite(q) || q === 0) return 0;

  const fromCode = await resolveUomCode(fromUomId);

  // -------- COUNT / EA --------
  if (!isLength(fromCode)) {
    return q;
  }

  // -------- LENGTH → METER --------
  const factor = LENGTH_TO_METER[fromCode];
  if (!factor) {
    throw new Error(`Unsupported length UOM: ${fromCode}`);
  }

  return Number((q * factor).toFixed(6)); // 👈 ALWAYS meter
};

export const convertToInventoryUom = async ({
  qty,
  fromUom,     // supplier UOM (FT / M / CM etc)
  toUom,       // MPN Master UOM
}) => {
  console.log('----ccc',qty,
  fromUom,     // supplier UOM (FT / M / CM etc)
  toUom,)
  const quantity = Number(qty);
  if (!Number.isFinite(quantity) || quantity === 0) return 0;

  // Resolve UOM codes (agar id aa raha ho to resolve karo, warna direct code use ho sakta hai)
  const fromCode = await resolveUomCode(fromUom);
  const toCode = await resolveUomCode(toUom);

  if (!fromCode || !toCode) {
    throw new Error("Invalid UOM");
  }

  // ✅ Same UOM → no conversion
  if (fromCode === toCode) {
    return Number(quantity.toFixed(6));
  }

  // -------- LENGTH TYPE --------
  if (isLength(fromCode) && isLength(toCode)) {

    const fromToMeter = LENGTH_TO_METER[fromCode];
    const toToMeter = LENGTH_TO_METER[toCode];

    if (!fromToMeter || !toToMeter) {
      throw new Error(`Unsupported length UOM: ${fromCode} or ${toCode}`);
    }

    // Step 1: Convert → Meter
    const inMeter = quantity * fromToMeter;

    // Step 2: Meter → Target UOM
    const finalQty = inMeter / toToMeter;

    return Number(finalQty.toFixed(6));
  }

  // -------- COUNT TYPE --------
  if (!isLength(fromCode) && !isLength(toCode)) {
    return quantity;
  }

  // -------- Invalid Mix --------
  throw new Error(
    `Cannot convert between different UOM types: ${fromCode} → ${toCode}`
  );
};

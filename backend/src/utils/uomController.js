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

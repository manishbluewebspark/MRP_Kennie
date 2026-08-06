import mongoose from "mongoose";
import UOM from "../models/UOM.js";

/* ------------------ helpers ------------------ */

const norm = (v = "") => String(v).trim().toLowerCase();

/* ------------------ LENGTH FACTORS (BASE = METER) ------------------ */


export const convertFromMeter = (qtyMeter, toUom) => {
  const q = Number(qtyMeter);
  if (!Number.isFinite(q)) return 0;

  const code = String(toUom || "").trim().toLowerCase();

  const LENGTH_TO_METER = {
    m: 1,
    meter: 1,
    metre: 1,

    cm: 0.01,
    centimeter: 0.01,
    centimeters: 0.01,

    mm: 0.001,
    millimeter: 0.001,
    millimeters: 0.001,

    ft: 0.3048,
    foot: 0.3048,
    feet: 0.3048,

    in: 0.0254,
    inch: 0.0254,
    inches: 0.0254,
  };

  const factor = LENGTH_TO_METER[code];

  // ❗ EA / PCS / NON-LENGTH
  if (factor == null) return q;

  // 🔥 meter → target unit
  return q / factor;
};


export const convertToMeter = async ({ qty, fromUom }) => {
  const q = Number(qty);

  if (!Number.isFinite(q)) return 0;

  const fromCode = await resolveUomCode(fromUom);

  if (!fromCode) return q;

  const code = fromCode.toUpperCase();

  const factor = LENGTH_TO_METER[code];

  // ✅ LENGTH TYPES → meter conversion
  if (factor !== undefined) {
    return q * factor;
  }

  // ✅ NON-LENGTH (EA, PCS, BOX etc) → no conversion
  return q;
};
const LENGTH_TO_METER = {
  M: 1,
  MM: 0.001,
  CM: 0.01,
  FT: 0.3048,
  IN: 0.0254,
};

const isLength = (code) => !!LENGTH_TO_METER[norm(code)];

/* ------------------ RESOLVE UOM CODE ------------------ */

const resolveUomCode = async (uomInput) => {
  if (!uomInput) return null;

  // already code
  if (typeof uomInput === "string" && !mongoose.Types.ObjectId.isValid(uomInput)) {
    return uomInput.trim().toUpperCase();
  }

  const uom = await UOM.findById(uomInput).lean();
  return uom?.code?.trim().toUpperCase() || null;
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
  //  console.log('-----qty',qty, fromUomId)
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
  // console.log('----ccc',qty,
  // fromUom,     // supplier UOM (FT / M / CM etc)
  // toUom,)
  const quantity = Number(qty);
  if (!Number.isFinite(quantity) || quantity === 0) return 0;

  // Resolve UOM codes (agar id aa raha ho to resolve karo, warna direct code use ho sakta hai)
  const fromCode = await resolveUomCode(fromUom);
  const toCode = await resolveUomCode(toUom);

  // console.log('------fromCode',fromCode,toCode)
  if (!fromCode || !toCode) {
    throw new Error("Invalid UOM");
  }

  const LENGTH_TO_METER = {
  M: 1,
  MM: 0.001,
  CM: 0.01,
  FT: 0.3048,
  IN: 0.0254,
};

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
    // const finalQty = inMeter / toToMeter;
    const finalQty = inMeter

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



const isLengthUnit = (uom) =>
  ["M", "MM", "CM", "FT", "IN"].includes(uom);

export const convertUom = ({
  qty,
  fromUom,
  toUom,
}) => {
  const value = Number(qty);

  if (!Number.isFinite(value)) return 0;

  // resolve code
  const from =
    typeof fromUom === "string"
      ? fromUom.toUpperCase()
      : fromUom?.code?.toUpperCase();

  const to =
    typeof toUom === "string"
      ? toUom.toUpperCase()
      : toUom?.code?.toUpperCase();

  if (!from || !to) {
    return value;
  }

  // =========================
  // SAME UNIT
  // =========================
  if (from === to) {
    return Number(value.toFixed(6));
  }

  // =========================
  // LENGTH UOM MAP
  // =========================
  const LENGTH_TO_METER = {
    M: 1,
    MM: 0.001,
    CM: 0.01,
    FT: 0.3048,
    IN: 0.0254,
  };

  const isLengthUnit = (uom) =>
    ["M", "MM", "CM", "FT", "IN"].includes(uom);

  // =========================
  // LENGTH CONVERSION
  // =========================
  if (isLengthUnit(from) && isLengthUnit(to)) {
    const fromFactor = LENGTH_TO_METER[from];
    const toFactor = LENGTH_TO_METER[to];

    // STEP 1 → source to meter
    const inMeter = value * fromFactor;

    // STEP 2 → meter to target
    const result = inMeter / toFactor;

    return Number(result.toFixed(6));
  }

  // =========================
  // COUNT TYPE
  // =========================
  const countUoms = ["EA", "PCS", "NOS"];

  if (countUoms.includes(from) && countUoms.includes(to)) {
    return value;
  }

  // =========================
  // 🔥 IMPORTANT FIX
  // if non-length / unsupported
  // return SAME VALUE
  // =========================
  return Number(value.toFixed(6));
};



// export const convertLengthUnitPrice = (pricePerMeter, uomCode) => {
//   if (!uomCode) return pricePerMeter;

//   const code = String(uomCode).toLowerCase();

//   const lengthUnits = ["mm", "cm", "m", "meter", "ft", "inch", "in"];

//   // non length unit bypass
//   if (!lengthUnits.includes(code)) {
//     return pricePerMeter;
//   }

//   switch (code) {
//     case "mm":
//       return pricePerMeter / 1000;

//     case "cm":
//       return pricePerMeter / 100;

//     case "ft":
//       return pricePerMeter * 0.3048;

//     case "inch":
//     case "in":
//       return pricePerMeter * 0.0254;

//     case "m":
//     case "meter":
//     default:
//       return pricePerMeter;
//   }
// };

export const convertToBaseUOM = (qty, from, to) => {
  // console.log('---------qty', qty, from, to);

  if (!qty || !from || !to) return qty;

  const map = {
    MM: 0.001,
    CM: 0.01,
    M: 1,
    FT: 0.3048,
    IN: 0.0254,
  };

  // ✅ IMPORTANT FIX
  if (!(from in map) || !(to in map)) {
    return qty; // ❗ no conversion
  }

  const fromFactor = map[from];
  const toFactor = map[to];

  return (qty * fromFactor) / toFactor;
};


export const convertLengthUnitPrice = (price, from, to) => {
  // console.log('------price',price,from,to)
  // agar price ya unit missing ho, return price
  if (!price || !from || !to) return price;

  // agar dono unit same hai, price wapas do
  if (from === to) return price;

  // length conversion map
  const lengthMap = {
    M: 1,
    MM: 1000,
    CM: 100,
    FT: 3.28084,
    INCH: 39.3701,
    IN: 39.3701
  };

  // agar koi bhi unit length map me nahi hai, original price wapas do
  if (!(from in lengthMap) || !(to in lengthMap)) {
    return price;
  }

  // convert price
  const base = price / lengthMap[from];
  return base * lengthMap[to];
};
/* ============================
   Length → Meter mapping
============================ */

const LENGTH_TO_METER = {
  m: 1,
  meter: 1,
  metre: 1,

  cm: 0.01,
  centimeter: 0.01,

  mm: 0.001,
  millimeter: 0.001,

  ft: 0.3048,
  foot: 0.3048,
  feet: 0.3048,

  in: 0.0254,
  inch: 0.0254,
  inches: 0.0254,
};

/* ============================
   Count-based units (NO conversion)
============================ */

const COUNT_UNITS = [
  "pcs",
  "pc",
  "ea",
  "each",
  "nos",
  "unit",
  "units"
];

/* ============================
   Helpers
============================ */

const normalizeUnit = (uom = "") =>
  uom.toLowerCase().trim();

const isCountUnit = (uom) =>
  COUNT_UNITS.includes(normalizeUnit(uom));

/* ============================
   Convert → METER (DB)
============================ */

// export const toMeter = (qty, fromUom) => {
//   console.log('----fromUom',qty, fromUom)
//   const unit = normalizeUnit(fromUom);

//   // ✅ PCS / EA → return same value
//   if (isCountUnit(unit)) {
//     return Number(qty);
//   }

//   const factor = LENGTH_TO_METER[unit];

//   if (!factor) {
//     console.warn(`Unknown unit "${fromUom}", returning raw value`);
//     return Number(qty);
//   }

//   return Number(qty) * factor;
// };

export const toMeter = (qty, fromUom, decimal = 4) => {
  // console.log("----fromUom", qty, fromUom);

  const unit = normalizeUnit(fromUom);

  // ✅ PCS / EA → return same value
  if (isCountUnit(unit)) {
    return Number(Number(qty).toFixed(decimal));
  }

  const factor = LENGTH_TO_METER[unit];

  if (!factor) {
    console.warn(`Unknown unit "${fromUom}", returning raw value`);
    return Number(Number(qty).toFixed(decimal));
  }

  return Number((Number(qty) * factor).toFixed(decimal));
};

/* ============================
   Convert METER → UI unit
============================ */

export const fromMeter = (meterQty, toUom) => {
    // console.log('----',meterQty,toUom)
  const unit = normalizeUnit(toUom);

  // ✅ PCS / EA → return same value
  if (isCountUnit(unit)) {
    return Number(meterQty);
  }

  const factor = LENGTH_TO_METER[unit];

  if (!factor) {
    console.warn(`Unknown unit "${toUom}", returning raw value`);
    return Number(meterQty);
  }

  return Number((Number(meterQty) / factor).toFixed(4));
};

/* ============================
   Formatter
============================ */

export const formatQty = (qty, decimals = 2) =>
  Number(qty).toFixed(decimals);


export const categorizeUOMs = (allUOMs, selectedCode) => {
  if(!selectedCode) return allUOMs
  const lengthUnits = ["M", "MM", "CM", "KM", "FT", "IN", "INCH", "YD"];
  const pieceUnits = ["PCS", "PC", "PK", "LOT", "EA"];
  const timeUnits = ["DAY", "HR", "MIN"];

  let category = [];

  if (lengthUnits.includes(selectedCode)) category = lengthUnits;
  else if (pieceUnits.includes(selectedCode)) category = pieceUnits;
  else if (timeUnits.includes(selectedCode)) category = timeUnits;
  else category = []; // agar unknown type

  return allUOMs.filter(uom => category.includes(uom.code));
};


// utils/currency.js

export const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// generic round
export const round = (n, decimals = 2) => {
  const factor = Math.pow(10, decimals);
  return Math.round((toNum(n) + Number.EPSILON) * factor) / factor;
};

// currency rounding (SGD, USD etc)
export const roundCurrency = (n) => round(n, 2);

// small price rounding (unitPrice etc)
export const roundPrice = (n) => round(n, 5);

/**
 * settings.currencySettings example:
 * {
 *   activeCurrencies: [ 'SGD' ],
 *   inactiveCurrencies: [ 'USD', 'EUR', 'RMB' ],
 *   exchangeRatesToUSD: { SGD: 0.77, EUR: 1.16, RMB: 0.14 },
 *   exchangeRatesToSGD: { USD: 1.3, EUR: 1.5, RMB: 0.18 }
 * }
 */

// export const getRate = (from, to, settings) => {
//   const cs = settings?.currencySettings || {};
//   const ratesToUSD = cs.exchangeRatesToUSD || {};
//   const ratesToSGD = cs.exchangeRatesToSGD || {};

//   const fromCur = (from || "USD").toUpperCase();
//   const toCur = (to || "USD").toUpperCase();

//   if (fromCur === toCur) return 1;

//   // Direct rate if converting to SGD
//   if (toCur === "SGD" && ratesToSGD[fromCur] != null) {
//     return toNum(ratesToSGD[fromCur]);
//   }

//   // Direct rate if converting from SGD to another
//   if (fromCur === "SGD" && ratesToSGD[toCur] != null) {
//     return 1 / toNum(ratesToSGD[toCur]);
//   }

//   // Fallback via USD
//   const getToUSD = (cur) => (cur === "USD" ? 1 : ratesToUSD[cur] != null ? toNum(ratesToUSD[cur]) : (() => { throw new Error(`Missing exchange rate for ${cur}->USD`) })());
//   const fromToUSD = getToUSD(fromCur);
//   const toToUSD = getToUSD(toCur);

//   return fromToUSD / toToUSD;
// };

export const getRate = (from, to, settings) => {
  const cs = settings?.currencySettings || {};
  const toUSD = cs.exchangeRatesToUSD || {};
  const toSGD = cs.exchangeRatesToSGD || {};

  const fromCur = (from || "USD").toUpperCase();
  const toCur = (to || "USD").toUpperCase();

  if (fromCur === toCur) return 1;

  // 🔥 1. Direct to USD
  if (toCur === "USD") {
    if (fromCur === "USD") return 1;
    if (toUSD[fromCur] != null) return Number(toUSD[fromCur]);
  }

  // 🔥 2. Direct to SGD
  if (toCur === "SGD") {
    if (fromCur === "SGD") return 1;
    if (toSGD[fromCur] != null) return Number(toSGD[fromCur]);
  }

  // 🔥 3. FROM SGD → something else
  if (fromCur === "SGD") {
    // SGD → USD → target
    const sgdToUSD = toUSD["SGD"] ?? 1;
    if (toCur === "USD") return sgdToUSD;

    if (toUSD[toCur] != null) {
      return sgdToUSD / Number(toUSD[toCur]);
    }
  }

  // 🔥 4. TO SGD from other currency
  if (toCur === "SGD") {
    if (toSGD[fromCur] != null) return Number(toSGD[fromCur]);

    // fallback via USD
    if (toUSD[fromCur] != null) {
      const usdToSGD = toSGD["USD"];
      return Number(toUSD[fromCur]) * Number(usdToSGD);
    }
  }

  // 🔥 5. FINAL fallback → via USD
  const getToUSD = (cur) => {
    if (cur === "USD") return 1;
    if (toUSD[cur] != null) return Number(toUSD[cur]);
    throw new Error(`Missing rate for ${cur}`);
  };

  const fromToUSD = getToUSD(fromCur);
  const toToUSD = getToUSD(toCur);

  return fromToUSD / toToUSD;
};

export const truncate = (n, decimals = 2) => {
  const factor = Math.pow(10, decimals);
  return Math.trunc(n * factor) / factor;
};

export const convertCurrency = (amount, from, to, settings) => {
  // console.log('-------ss',amount,from, to, settings)
  const n = toNum(amount);
  const rate = getRate(from, to, settings);
  const converted = n * rate;
  return truncate(converted, 2);
};
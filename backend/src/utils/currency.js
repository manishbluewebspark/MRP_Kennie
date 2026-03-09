// utils/currency.js

export const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const round2 = (n) =>
  Math.round((toNum(n) + Number.EPSILON) * 100) / 100;

/**
 * settings.currencySettings expects:
 * exchangeRatesToUSD: {
 *   SGD: 0.77,
 *   EUR: 1.16,
 *   RMB: 0.14
 * }
 *
 * Meaning:
 * 1 UNIT of currency = X USD
 */

export const getRate = (from, to, settings) => {
  const cs = settings?.currencySettings || {};
  const toUSD = cs.exchangeRatesToUSD || {};

  const fromCur = (from || "USD").toUpperCase();
  const toCur = (to || "USD").toUpperCase();

  if (fromCur === toCur) return 1;

  const getToUSD = (cur) => {
    if (cur === "USD") return 1;

    if (toUSD[cur] != null) {
      return toNum(toUSD[cur]);
    }

    throw new Error(`Missing exchange rate for ${cur} -> USD`);
  };

  const fromToUSD = getToUSD(fromCur);
  const toToUSD = getToUSD(toCur);

  // convert using USD bridge
  return fromToUSD / toToUSD;
};

export const convertCurrency = (amount, from, to, settings, opts = {}) => {
  const n = toNum(amount);

  const rate = getRate(from, to, settings);

  const converted = n * rate;

  const decimals = Number.isFinite(opts.decimals) ? opts.decimals : 2;

  const factor = Math.pow(10, decimals);

  return Math.round((converted + Number.EPSILON) * factor) / factor;
};
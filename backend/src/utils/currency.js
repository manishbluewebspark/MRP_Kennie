// utils/currency.js
export const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const round2 = (n) => Math.round((toNum(n) + Number.EPSILON) * 100) / 100;

/**
 * settings.currencySettings expects:
 * exchangeRatesToUSD: { SGD: 0.77, EUR: 1.16, RMB: 0.14 }  // 1 UNIT => USD
 * exchangeRatesToSGD: { USD: 1.3, EUR: 1.5, RMB: 0.18 }   // 1 UNIT => SGD
 *
 * NOTE: We'll handle any pair using USD as bridge if needed.
 */
export const getRate = (from, to, settings) => {
  const cs = settings?.currencySettings || {};
  const fromCur = (from || "USD").toUpperCase();
  const toCur = (to || "USD").toUpperCase();

  if (fromCur === toCur) return 1;

  // normalize maps
  const toUSD = cs.exchangeRatesToUSD || {}; // 1 FROM => USD
  const toSGD = cs.exchangeRatesToSGD || {}; // 1 FROM => SGD

  // helper: convert 1 unit of currency X to USD
  const oneToUSD = (cur) => {
    const c = cur.toUpperCase();
    if (c === "USD") return 1;

    // if direct exists
    if (toUSD[c] != null) return toNum(toUSD[c]);

    // if we have toSGD for this currency and also SGD->USD
    // 1 cur -> SGD (toSGD[cur]) -> USD (toUSD["SGD"])
    if (toSGD[c] != null && toUSD["SGD"] != null) {
      return toNum(toSGD[c]) * toNum(toUSD["SGD"]);
    }

    throw new Error(`Missing exchange rate for ${c} -> USD`);
  };

  // helper: convert 1 USD to currency Y
  const usdToOne = (cur) => {
    const c = cur.toUpperCase();
    if (c === "USD") return 1;

    // if we know 1 unit -> USD, then USD->unit = 1/(unit->USD)
    if (toUSD[c] != null) return 1 / toNum(toUSD[c]);

    // if we can go USD->SGD and SGD->currency using derived
    // USD->SGD is exchangeRatesToSGD["USD"]
    if (toSGD["USD"] != null && oneToUSD(c) != null && toUSD["SGD"] != null) {
      // easiest is: USD -> currency = 1 / (currency -> USD)
      return 1 / oneToUSD(c);
    }

    throw new Error(`Missing exchange rate for USD -> ${c}`);
  };

  // rate: 1 from -> USD -> to
  const fromToUSD = oneToUSD(fromCur);
  const USDToTo = usdToOne(toCur);

  return fromToUSD * USDToTo;
};

export const convertCurrency = (amount, from, to, settings, opts = {}) => {
  const n = toNum(amount);
  const rate = getRate(from, to, settings);
  const converted = n * rate;

  const decimals = Number.isFinite(opts.decimals) ? opts.decimals : 2;
  const factor = Math.pow(10, decimals);
  return Math.round((converted + Number.EPSILON) * factor) / factor;
};

// Example rates relative to USD
const exchangeRates = {
  USD: 1,         // US Dollar
  SGD: 1.35,      // Singapore Dollar
  EUR: 0.92,      // Euro
  INR: 82.5,      // Indian Rupee
  GBP: 0.79,      // British Pound
  AUD: 1.5,       // Australian Dollar
  // Add more currencies as needed
};

/**
 * Convert an amount from one currency to another
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Base currency, e.g. "USD"
 * @param {string} toCurrency - Target currency, e.g. "SGD"
 * @returns {number} - Converted amount (2 decimals)
 */
export const convertCurrency = (amount, fromCurrency, toCurrency) => {
  if (!exchangeRates[fromCurrency] || !exchangeRates[toCurrency]) {
    console.warn("Currency not found in exchangeRates, returning original amount");
    return amount;
  }

  if (fromCurrency === toCurrency) return amount;

  const usdAmount = amount / exchangeRates[fromCurrency]; // Convert to USD first
  const convertedAmount = usdAmount * exchangeRates[toCurrency]; // Then to target currency

  return parseFloat(convertedAmount.toFixed(2));
};

// utils/formatDate.js
export const formatDate = (date, options = {}) => {
  if (!date) return "-";

  try {
    const d = new Date(date);
    if (isNaN(d)) return "-";

    // default to DD/MM/YYYY
    const defaultOptions = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      ...options,
    };

    return d.toLocaleDateString("en-GB", defaultOptions);
  } catch {
    return "-";
  }
};

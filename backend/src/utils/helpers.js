export const toNum = (v, d = 0) => {
  const n = Number(String(v).toString().trim());
  return Number.isFinite(n) ? n : d;
};
export const toStr = (v) => (v == null ? "" : String(v).trim());
export const toDateOrNull = (v) => {
  if (!v) return null;
  // xlsx may give JS Date directly
  if (v instanceof Date && !isNaN(v.valueOf())) return v;
  // try parse text
  const d = new Date(v);
  return isNaN(d.valueOf()) ? null : d;
};



export const formatDate = (d) => {
  if (!d) return "";

  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getProcess = (wo, process) => {
  return (
    wo.processHistory?.find(
      (p) => p.process === process
    ) || {}
  );
};

export const getUserName = (processObj) => {
  return (
    processObj?.completedBy?.name ||
    processObj?.completedBy?.fullName ||
    ""
  );
};
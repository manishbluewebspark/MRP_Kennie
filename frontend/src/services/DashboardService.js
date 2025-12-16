import fetch from "auth/FetchInterceptor";

const DashboardService = {};

// ✅ System Check (no auth required usually)
DashboardService.systemCheck = function () {
  return fetch({
    url: "/dashboard/system-check",
    method: "get",
  });
};

// ✅ Top Summary (single API for all cards)
DashboardService.getSummary = function (params = {}) {
  return fetch({
    url: "/dashboard/summary",
    method: "get",
    params,
  });
};

// ✅ Work Orders Stats
DashboardService.getWorkOrderStats = function (params = {}) {
  return fetch({
    url: "/dashboard/workorders/stats",
    method: "get",
    params,
  });
};

// ✅ Inventory Stats
DashboardService.getInventoryStats = function (params = {}) {
  return fetch({
    url: "/dashboard/inventory/stats",
    method: "get",
    params,
  });
};

// ✅ Purchase Order Stats
DashboardService.getPurchaseStats = function (params = {}) {
  return fetch({
    url: "/dashboard/purchase/stats",
    method: "get",
    params,
  });
};

// ✅ Alerts Stats
DashboardService.getAlertsStats = function (params = {}) {
  return fetch({
    url: "/dashboard/alerts/stats",
    method: "get",
    params,
  });
};

export default DashboardService;

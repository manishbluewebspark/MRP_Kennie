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
DashboardService.getPurchaseFollowUps = function (params = {}) {
  return fetch({
    url: "/dashboard/purchase-followups",
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

DashboardService.getDashboardCardsStats = function (params = {}) {
  return fetch({
    url: "/dashboard/cards/stats",
    method: "get",
    params,
  });
};

// ✅ Purchase Order Stats
DashboardService.getProductionDashboard = function (params = {}) {
  return fetch({
    url: "/dashboard/production/list",
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

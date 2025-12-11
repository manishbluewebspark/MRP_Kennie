import fetch from 'auth/FetchInterceptor'

const InventoryService = {}

InventoryService.getInventoryList = function (params) {
  return fetch({
    url: `/inventory`,
    method: 'get',
    params
  });
};

InventoryService.getMaterialRequiredList = function (params) {
  return fetch({
    url: `/inventory/material-required`,
    method: 'get',
    params
  });
};


InventoryService.getLowStockAlertList = function (params) {
  return fetch({
    url: `/inventory/low-stock-alerts`,
    method: 'get',
    params
  });
};

InventoryService.adjustInventory = function (adjustmentData) {
  return fetch({
    url: '/inventory/adjust',
    method: 'post',
    data: adjustmentData
  });
};

InventoryService.addShortage = function (data) {
  return fetch({
    url: "/inventory/addShortage",
    method: "post",
    data
  });
};

// InventoryService.js
InventoryService.getMaterialShortages = function (params = {}) {
  return fetch({
    url: "/inventory/material-shortages/list",
    method: "get",
    params,
  });
};



InventoryService.exportMaterialRequired = () => {
  return fetch({
    url: "/inventory/inventory/export/material-required",
    method: "get",
    responseType: "arraybuffer"
  });
};

InventoryService.exportInventoryList = () => {
  return fetch({
    url: "/inventory/inventory/export/list",
    method: "get",
    responseType: "arraybuffer"
  });
};

InventoryService.exportInventoryAlerts = () => {
  return fetch({
    url: "/inventory/inventory/export/alerts",
    method: "get",
    responseType: "arraybuffer"
  });
};



export default InventoryService;


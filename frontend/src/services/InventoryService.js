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

InventoryService.exportToExcel = function (data) {
  return fetch({
    url: `/inventory/export/excel`,
    method: 'get',
    data,
    responseType: 'blob' // Important for file download
  });
};


export default InventoryService;


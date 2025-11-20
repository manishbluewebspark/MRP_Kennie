import fetch from 'auth/FetchInterceptor';

const PurchaseOrderService = {};

// ➕ Add Purchase Order
PurchaseOrderService.addPurchaseOrder = function (data) {
  return fetch({
    url: '/purchase-orders',
    method: 'post',
    data: data,
  });
};

// ✏️ Update Purchase Order
PurchaseOrderService.updatePurchaseOrder = function (id, data) {
  return fetch({
    url: `/purchase-orders/${id}`,
    method: 'put',
    data: data,
  });
};

// ✏️ Update Purchase Order
PurchaseOrderService.updatePurchaseOrderstatus = function (id, data) {
  return fetch({
    url: `/purchase-orders/updateStatus/${id}`,
    method: 'put',
    data: data,
  });
};

// 🗑️ Delete Purchase Order
PurchaseOrderService.deletePurchaseOrder = function (id) {
  return fetch({
    url: `/purchase-orders/${id}`,
    method: 'delete',
  });
};

// 📄 Get All Purchase Orders
PurchaseOrderService.getAllPurchaseOrders = function (params) {
  return fetch({
    url: '/purchase-orders',
    method: 'get',
    params: params, // optional for pagination/filter
  });
};

// 📄 Get All Purchase Orders
PurchaseOrderService.getLastPurachseOrderNumber = function () {
  return fetch({
    url: '/purchase-orders/purchase/getLastPurachseOrderNumber',
    method: 'get'
  });
};

// 🔍 Get Purchase Order by ID
PurchaseOrderService.getPurchaseOrderById = function (id) {
  return fetch({
    url: `/purchase-orders/${id}`,
    method: 'get',
  });
};

PurchaseOrderService.getPurchaseOrdersSummaryByPeriod = function (params) {
  return fetch({
    url: `/purchase-orders/summary`,
    method: 'get',
    params: params
  });
};

PurchaseOrderService.getPurchaseOrdersHistory = function (params) {
  return fetch({
    url: `/purchase-orders/history`,
    method: 'get',
    params: params
  });
};

// ✉️ Send Purchase Order Mail
PurchaseOrderService.sendPurchaseOrderMail = function (id, data) {
  return fetch({
    url: `/purchase-orders/${id}/send-mail`,
    method: 'post',
    data: data, // e.g. { email: "client@domain.com", message: "...", attachments: [...] }
  });
};

PurchaseOrderService.getPurchaseShortageList = function (params) {
  return fetch({
    url: '/purchase-orders/purchase/shortageList',
    method: 'get',
    params: params, // optional for pagination/filter
  });
};

PurchaseOrderService.exportPurchaseOrders = function (exportName) {
 return fetch({
    url: `/purchase-orders/purchase/excel?type=${exportName}`,  // your backend route
    method: 'get',            // send selected IDs
    responseType: 'arraybuffer',            // important for file downloads
  });
}

export default PurchaseOrderService;

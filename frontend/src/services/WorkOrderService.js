import fetch from "auth/FetchInterceptor";

const WorkOrderService = {};

// Get all work orders with pagination, search, filters
WorkOrderService.getAllWorkOrders = (params = {}) => {
  return fetch({
    url: "/work-orders",
    method: "get",
    params,
  });
};

// Get work order by ID
WorkOrderService.getWorkOrderById = (id) => {
  return fetch({
    url: `/work-orders/${id}`,
    method: "get",
  });
};

// Create new work order
WorkOrderService.createWorkOrder = (data) => {
  return fetch({
    url: "/work-orders",
    method: "post",
    data,
  });
};

WorkOrderService.saveProcessStage = (workOrderId, data) => {
  return fetch({
    url: `/work-orders/workorder/production/${workOrderId}/stage`,
    method: "post",
    data,
  });
};



// Update work order
WorkOrderService.updateWorkOrder = (id, data) => {
  return fetch({
    url: `/work-orders/${id}`,
    method: "put",
    data,
  });
};

// Delete work order
WorkOrderService.deleteWorkOrder = (id) => {
  return fetch({
    url: `/work-orders/${id}`,
    method: "delete",
  });
};

// Update work order status
WorkOrderService.updateWorkOrderStatus = (id, status) => {
  return fetch({
    url: `/work-orders/${id}/status`,
    method: "patch",
    data: { status },
  });
};

// Get work orders by project
WorkOrderService.getWorkOrdersByProject = (projectId) => {
  return fetch({
    url: `/work-orders/project/${projectId}`,
    method: "get",
  });
};

WorkOrderService.getDeliveryOrders = (params) => {
  return fetch({
    url: `/work-orders/workOrder/deliveryOrders`,
    method: "get",
    params
  });
};

// Export work orders
WorkOrderService.exportWorkOrders = (payload) => {
  return fetch({
    url: "/work-orders/workOrder/export",
    method: "get",
    responseType: 'arraybuffer',
    data: payload,
  });
};

WorkOrderService.exportDeliveryWorkOrders = (payload) => {
  return fetch({
    url: "/work-orders/workOrder/export/delivery/excel",
    method: "post",
    responseType: 'arraybuffer',
    data:payload
  });
};

WorkOrderService.exportWorkOrdersPDF = (payload) => {
  return fetch({
    url: "/work-orders/workOrder/export/delivery/pdf",
    method: "post",
    responseType: "arraybuffer", // ✅ MUST for PDF
    data:payload,
    headers: {
      Accept: "application/pdf",
    },
  });
};


WorkOrderService.exportWorkOrdersWord = (payload) => {
  return fetch({
    url: "/work-orders/workOrder/export/delivery/word",
    method: "post",
    responseType: 'arraybuffer',
    data:payload
  });
};

// Import work orders
WorkOrderService.importWorkOrders = (formData) => {
  return fetch({
    url: "/work-orders/workOrder/import",
    method: "post",
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

WorkOrderService.updateDeliveryInfo = (id, payload) => {
  return fetch({
    url: `/work-orders/${id}/delivery`,
    method: "patch",
    data: payload,
  });
};

WorkOrderService.moveToProduction = (id) => {
  return fetch({
    url: `/work-orders/workOrder/${id}/move-to-production`,
    method: "post"
  });
};

WorkOrderService.getAllProductionWorkOrders = () => {
  return fetch({
    url: `/work-orders/workOrder/production`,
    method: "get"
  });
};

WorkOrderService.getCompleteWorkOrders = () => {
  return fetch({
    url: `/work-orders/workOrder/getCompleteWorkOrders`,
    method: "get"
  });
};

WorkOrderService.getAllChilPartByDrawingId = (drawingId) => {
  return fetch({
    url: `/work-orders/workOrder/getAllChilPartByDrawingId`,
    method: "get",
    params:drawingId
  });
};

WorkOrderService.getTotalMPNNeeded = (params = {}) => {
  return fetch({
    url: `/work-orders/workOrder/totalMPNNeeded`,
    method: "get",
    params
  });
};

WorkOrderService.getEachMPNUsage = (params) => {
  return fetch({
    url: `/work-orders/workOrder/getEachMPNUsage`,
    method: "get",
    params
  });
};


WorkOrderService.exportGetTotalMPNNeeded = () => {
  return fetch({
    url: `/mpn-tracker/export/total-mpn-needed`,
    method: "get",
    responseType: 'arraybuffer'
  });
};

WorkOrderService.exportGetEachMPNUsage = ({ mpnId }) => {
  return fetch({
    url: `/mpn-tracker/export/each-mpn-usage?mpnId=${mpnId}`,
    method: "get",
    responseType: "arraybuffer"
  });
};



export default WorkOrderService;
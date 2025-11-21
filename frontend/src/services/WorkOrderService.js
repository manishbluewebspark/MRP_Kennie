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
WorkOrderService.exportWorkOrders = () => {
  return fetch({
    url: "/work-orders/workOrder/export",
    method: "get",
    responseType: 'arraybuffer'
  });
};

WorkOrderService.exportDeliveryWorkOrders = () => {
  return fetch({
    url: "/work-orders/workOrder/export/delivery/excel",
    method: "get",
    responseType: 'arraybuffer'
  });
};

WorkOrderService.exportWorkOrdersPDF = () => {
  return fetch({
    url: "/work-orders/workOrder/export/delivery/pdf",
    method: "get",
    responseType: 'arraybuffer'
  });
};

WorkOrderService.exportWorkOrdersWord = () => {
  return fetch({
    url: "/work-orders/workOrder/export/delivery/word",
    method: "get",
    responseType: 'arraybuffer'
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

WorkOrderService.getTotalMPNNeeded = () => {
  return fetch({
    url: `/work-orders/workOrder/totalMPNNeeded`,
    method: "get"
  });
};

WorkOrderService.getEachMPNUsage = (params) => {
  return fetch({
    url: `/work-orders/workOrder/getEachMPNUsage`,
    method: "get",
    params
  });
};



export default WorkOrderService;
// DrawingService.js
import fetch from "auth/FetchInterceptor";

const DrawingService = {};

// Create
DrawingService.createDrawing = function (data) {
  return fetch({
    url: "/drawings",
    method: "post",
    data,
  });
};

// Update
DrawingService.updateDrawing = function (drawingId, data) {
  return fetch({
    url: `/drawings/${drawingId}`,
    method: "put",
    data,
  });
};

// Delete
DrawingService.deleteDrawing = function (drawingId) {
  return fetch({
    url: `/drawings/${drawingId}`,
    method: "delete",
  });
};

// Get by ID
DrawingService.getDrawingById = function (drawingId) {
  return fetch({
    url: `/drawings/${drawingId}`,
    method: "get",
  });
};

// Get all with pagination + search + sorting
DrawingService.getAllDrawings = function (params = {}) {
  return fetch({
    url: "/drawings",
    method: "get",
    params,
  });
};

// Import (Excel file upload)
DrawingService.importDrawings = function (formData) {
  return fetch({
    url: "/drawings/import",
    method: "post",
    data: formData,
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// Export (Excel download)
DrawingService.exportDrawings = function (params = {}) {
  return fetch({
    url: "/drawings/export",
    method: "get",
    params,
    responseType: "blob",
  });
};

DrawingService.duplicateDrawing = function (drawingId, data = {}) {
  return fetch({
    url: `/drawings/${drawingId}/duplicate`,
    method: "post",
    data,
  });
};

// ✅ 1. Get All Costing Items
DrawingService.getAllCostingItems = function (drawingId) {
  return fetch({
    url: `/drawings/${drawingId}/costing`,
    method: "get",
  });
};

// ✅ 2. Add New Costing Item
DrawingService.addCostingItem = function (drawingId, data) {
  return fetch({
    url: `/drawings/${drawingId}/costing`,
    method: "post",
    data,
  });
};

// ✅ 3. Update Costing Item
DrawingService.updateCostingItem = function (drawingId, itemId, data) {
  return fetch({
    url: `/drawings/${drawingId}/costing/${itemId}`,
    method: "put",
    data,
  });
};

// ✅ 4. Delete Costing Item
DrawingService.deleteCostingItem = function (drawingId, itemId) {
  return fetch({
    url: `/drawings/${drawingId}/costing/${itemId}`,
    method: "delete",
  });
};


DrawingService.importCostingItems = function (drawingId, formData) {
  return fetch({
      url: `/drawings/${drawingId}/costing/import`,
      method: "post",
      data: formData,
      headers: { "Content-Type": "multipart/form-data" },
    });
};


export default DrawingService;

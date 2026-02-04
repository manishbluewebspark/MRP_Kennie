import fetch from "auth/FetchInterceptor";

const DemandListService = {};

/**
 * 📤 Upload Demand List Excel
 * formData:
 *  - file (excel)
 *  - name (optional)
 */
DemandListService.uploadDemandExcel = (formData) => {
  return fetch({
    url: "/demand-lists/upload",
    method: "post",
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

/**
 * 📄 Get all Demand Lists (table view)
 * params: page, limit, search, status
 */
DemandListService.getAllDemandLists = (params = {}) => {
  return fetch({
    url: "/demand-lists",
    method: "get",
    params,
  });
};

/**
 * 🔍 Get Demand List by ID (File + Items)
 */
DemandListService.getDemandListById = (id) => {
  return fetch({
    url: `/demand-lists/${id}`,
    method: "get",
  });
};

/**
 * ❌ Delete Demand List (File + Items)
 */
DemandListService.deleteDemandList = (id) => {
  return fetch({
    url: `/demand-lists/${id}`,
    method: "delete",
  });
};

/**
 * ✏️ Update Single Demand Item
 * payload example:
 * {
 *   qtyRequired,
 *   stock,
 *   requiredDate
 * }
 */
DemandListService.updateDemandListItem = (itemId, data) => {
  return fetch({
    url: `/demand-lists/item/${itemId}`,
    method: "put",
    data,
  });
};

export default DemandListService;

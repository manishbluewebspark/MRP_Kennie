import fetch from "auth/FetchInterceptor";

const MarkupParameterService = {};

// Get all markup parameters
MarkupParameterService.getAllMarkupParameters = function (params = {}) {
  return fetch({
    url: "/markup-parameter",
    method: "get",
    params, // optional query params
  });
};

// Add or update markup parameter
MarkupParameterService.addOrUpdateMarkupParameter = function (data) {
  return fetch({
    url: "/markup-parameter",
    method: "post",
    data, // { materialsMarkup, manhourMarkup, packingMarkup }
  });
};

export default MarkupParameterService;

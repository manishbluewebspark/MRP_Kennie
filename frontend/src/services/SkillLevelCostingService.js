import fetch from "auth/FetchInterceptor";

const SkillLevelCostingService = {};

// ➕ Add new costing
SkillLevelCostingService.addSkillLevelCosting = function (data) {
  return fetch({
    url: "/skill-level-costings",
    method: "post",
    data,
  });
};

// ✏️ Update costing
SkillLevelCostingService.updateSkillLevelCosting = function (id, data) {
  return fetch({
    url: `/skill-level-costings/${id}`,
    method: "put",
    data,
  });
};

// 🗑️ Delete costing
SkillLevelCostingService.deleteSkillLevelCosting = function (id) {
  return fetch({
    url: `/skill-level-costings/${id}`,
    method: "delete",
  });
};

// 📄 Get all costings (supports pagination, search, sort)
SkillLevelCostingService.getAllSkillLevelCostings = function (params) {
  return fetch({
    url: "/skill-level-costings",
    method: "get",
    params, // e.g., { page: 1, limit: 10, search: "operator", sortBy: "createdAt", sortOrder: "desc" }
  });
};

// 🔍 Get by ID
SkillLevelCostingService.getSkillLevelCostingById = function (id) {
  return fetch({
    url: `/skill-level-costings/${id}`,
    method: "get",
  });
};

export default SkillLevelCostingService;

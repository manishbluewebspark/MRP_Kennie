import fetch from "auth/FetchInterceptor";

const ProjectService = {};

// Create Project
ProjectService.createProject = function (data) {
  return fetch({
    url: "/projects",
    method: "post",
    data: data,
  });
};

// Update Project
ProjectService.updateProject = function (projectId, data) {
  return fetch({
    url: `/projects/${projectId}`,
    method: "put",
    data: data,
  });
};

// Delete Project (soft delete)
ProjectService.deleteProject = function (projectId, data = {}) {
  return fetch({
    url: `/projects/${projectId}`,
    method: "delete",
    data: data, // pass updatedBy if needed
  });
};

// Get Project by ID
ProjectService.getProjectById = function (projectId) {
  return fetch({
    url: `/projects/${projectId}`,
    method: "get",
  });
};

// Get All Projects with pagination & search
ProjectService.getAllProjects = function (params = {}) {
  return fetch({
    url: "/projects",
    method: "get",
    params: params, // { page, limit, search, customerId, isActive }
  });
};

export default ProjectService;

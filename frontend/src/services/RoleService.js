import fetch from 'auth/FetchInterceptor';

const RoleService = {};

// Get all roles
RoleService.getAllRoles = function () {
  return fetch({
    url: '/role',
    method: 'get',
  });
};

// Get role by ID
RoleService.getRoleById = function (roleId) {
  return fetch({
    url: `/role/${roleId}`,
    method: 'get',
  });
};

// Create new role
RoleService.createRole = function (data) {
  return fetch({
    url: '/role',
    method: 'post',
    data: data,
  });
};

// Update role
RoleService.updateRole = function (roleId, data) {
  return fetch({
    url: `/role/${roleId}`,
    method: 'put',
    data: data,
  });
};

// Delete role
RoleService.deleteRole = function (roleId) {
  return fetch({
    url: `/role/${roleId}`,
    method: 'delete',
  });
};

export default RoleService;

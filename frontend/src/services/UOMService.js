import fetch from 'auth/FetchInterceptor';

const UOMService = {};

// Create UOM
UOMService.addUOM = function (data) {
  return fetch({
    url: '/uoms',
    method: 'post',
    data: data,
  });
};

// Get All UOMs
UOMService.getAllUOMs = function (params = {}) {
  return fetch({
    url: '/uoms',
    method: 'get',
    params: params,
  });
};

// Get UOM by ID
UOMService.getUOMById = function (id) {
  return fetch({
    url: `/uoms/${id}`,
    method: 'get',
  });
};

// Update UOM
UOMService.updateUOM = function (id, data) {
  return fetch({
    url: `/uoms/${id}`,
    method: 'put',
    data: data,
  });
};

// Delete UOM
UOMService.deleteUOM = function (id) {
  return fetch({
    url: `/uoms/${id}`,
    method: 'delete',
  });
};

export default UOMService;
import fetch from 'auth/FetchInterceptor';

const CategoryService = {};

// Create Category
CategoryService.addCategory = function (data) {
  return fetch({
    url: '/categories',
    method: 'post',
    data: data,
  });
};

// Get All Categories
CategoryService.getAllCategories = function (params = {}) {
  return fetch({
    url: '/categories',
    method: 'get',
    params: params,
  });
};

// Get Category by ID
CategoryService.getCategoryById = function (id) {
  return fetch({
    url: `/categories/${id}`,
    method: 'get',
  });
};

// Update Category
CategoryService.updateCategory = function (id, data) {
  return fetch({
    url: `/categories/${id}`,
    method: 'put',
    data: data,
  });
};

// Delete Category
CategoryService.deleteCategory = function (id) {
  return fetch({
    url: `/categories/${id}`,
    method: 'delete',
  });
};

export default CategoryService;
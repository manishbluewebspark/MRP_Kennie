import fetch from 'auth/FetchInterceptor';

const CustomerService = {};

// Create Customer
CustomerService.createCustomer = function (data) {
  return fetch({
    url: '/customers',
    method: 'post',
    data: data,
  });
};

// Update Customer
CustomerService.updateCustomer = function (customerId, data) {
  return fetch({
    url: `/customers/${customerId}`,
    method: 'put',
    data: data,
  });
};

// Delete Customer
CustomerService.deleteCustomer = function (customerId) {
  return fetch({
    url: `/customers/${customerId}`,
    method: 'delete',
  });
};

// Get Customer by ID
CustomerService.getCustomerById = function (customerId) {
  return fetch({
    url: `/customers/${customerId}`,
    method: 'get',
  });
};

// Get All Customers with pagination & search
CustomerService.getAllCustomers = function (params = {}) {
  return fetch({
    url: '/customers',
    method: 'get',
    params: params, // { page, limit, search }
  });
};

export default CustomerService;

import fetch from 'auth/FetchInterceptor';

const CurrencyService = {};

// Create Currency
CurrencyService.addCurrency = function (data) {
  return fetch({
    url: '/currencies',
    method: 'post',
    data: data,
  });
};

// Get All Currencies
CurrencyService.getAllCurrencies = function (params = {}) {
  return fetch({
    url: '/currencies',
    method: 'get',
    params: params,
  });
};

// Get Currency by ID
CurrencyService.getCurrencyById = function (id) {
  return fetch({
    url: `/currencies/${id}`,
    method: 'get',
  });
};

// Update Currency
CurrencyService.updateCurrency = function (id, data) {
  return fetch({
    url: `/currencies/${id}`,
    method: 'put',
    data: data,
  });
};

// Delete Currency
CurrencyService.deleteCurrency = function (id) {
  return fetch({
    url: `/currencies/${id}`,
    method: 'delete',
  });
};

export default CurrencyService;
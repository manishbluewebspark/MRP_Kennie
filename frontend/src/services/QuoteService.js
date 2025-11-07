import fetch from 'auth/FetchInterceptor';

const QuoteService = {};

// Get all quotes (with params: page, limit, search, status, customerId, date range)
QuoteService.getAllQuotes = function (params) {
  return fetch({
    url: '/quotes',
    method: 'get',
    params,
  });
};

// Get quote by ID
QuoteService.getQuoteById = function (quoteId) {
  return fetch({
    url: `/quotes/${quoteId}`,
    method: 'get',
  });
};

// Create new quote
QuoteService.createQuote = function (data) {
  return fetch({
    url: '/quotes',
    method: 'post',
    data,
  });
};

// Update quote
QuoteService.updateQuote = function (quoteId, data) {
  return fetch({
    url: `/quotes/${quoteId}`,
    method: 'put',
    data,
  });
};

// Delete quote
QuoteService.deleteQuote = function (quoteId, data) {
  return fetch({
    url: `/quotes/${quoteId}`,
    method: 'delete',
    data, // e.g., { updatedBy }
  });
};

// Get quotes by customer
QuoteService.getQuotesByCustomer = function (customerId) {
  return fetch({
    url: `/quotes/customer/${customerId}`,
    method: 'get',
  });
};

// Update quote status
QuoteService.updateQuoteStatus = function (quoteId, statusData) {
  return fetch({
    url: `/quotes/status/${quoteId}`,
    method: 'put',
    data: statusData, // { status }
  });
};

// Export single quote to Excel
QuoteService.exportQuoteToExcel = function (quoteId) {
  return fetch({
    url: `/quotes/export/excel/${quoteId}`,
    method: 'get',
    responseType: 'arraybuffer',
  });
};

// Export single quote to Word
QuoteService.exportQuoteToWord = function (quoteId) {
  return fetch({
    url: `/quotes/export/word/${quoteId}`,
    method: 'get',
    responseType: 'arraybuffer',
  });
};

// Export all quotes
QuoteService.exportSelectedQuotesToExcel = function (quoteIds) {
  return fetch({
    url: `/quotes/export/excel`,  // your backend route
    method: 'post',
    data: { quoteIds },              // send selected IDs
    responseType: 'blob',            // important for file downloads
  });
};


export default QuoteService;

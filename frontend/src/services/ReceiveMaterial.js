import fetch from 'auth/FetchInterceptor'

const ReceiveMaterialService = {}

ReceiveMaterialService.takeReceiveMaterial = function (data) {
  return fetch({
    url: `/receive-material`,
    method: 'post',
    data: data,
  });
};

ReceiveMaterialService.closePurchaseOrder = function (id) {
  return fetch({
    url: `/receive-material/close-po/${id}`,
    method: "put",
  });
};

export default ReceiveMaterialService;


import fetch from 'auth/FetchInterceptor'

const ReceiveMaterialService = {}

ReceiveMaterialService.takeReceiveMaterial = function (data) {
  return fetch({
    url: `/receive-material`,
    method: 'post',
    data: data,
  });
};

export default ReceiveMaterialService;


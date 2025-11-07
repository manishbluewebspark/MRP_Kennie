import fetch from "auth/FetchInterceptor";

const PurchaseSettingService = {};

// Get all purchase settings or by search
PurchaseSettingService.getAllPurchaseSettings = (params = {}) =>
  fetch({
    url: "/purchase-settings",
    method: "get",
    params
  });

// Get single by ID
PurchaseSettingService.getPurchaseSettingById = (id) =>
  fetch({
    url: `/purchase-settings/${id}`,
    method: "get"
  });

// Add new or update existing
PurchaseSettingService.addOrUpdatePurchaseSetting = (data) =>
  fetch({
    url: "/purchase-settings",
    method: "post",
    data
  });

// Delete
PurchaseSettingService.deletePurchaseSetting = (settingId,addressId) =>
  fetch({
    url: `/purchase-settings/${settingId}/address/${addressId}`,
    method: "delete"
  });

export default PurchaseSettingService;
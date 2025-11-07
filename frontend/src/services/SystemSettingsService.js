import fetch from "auth/FetchInterceptor";

const SystemSettingsService = {};

// Get settings
SystemSettingsService.getSystemSettings = () => {
  return fetch({
    url: "/system-settings",
    method: "get",
  });
};

// Add or update settings
SystemSettingsService.addOrUpdateSystemSettings = (data) => {
  return fetch({
    url: "/system-settings",
    method: "post",
    data,
  });
};

export default SystemSettingsService;

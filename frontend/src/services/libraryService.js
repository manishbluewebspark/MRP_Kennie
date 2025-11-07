import fetch from "auth/FetchInterceptor";

const LibraryService = {};

/**
 * ----------------------------
 * MPN APIs
 * ----------------------------
 */
LibraryService.addMpn = (data) =>
  fetch({ url: "/library/mpn", method: "post", data });

LibraryService.updateMpn = (id, data) =>
  fetch({ url: `/library/mpn/${id}`, method: "put", data });

LibraryService.deleteMpn = (id) =>
  fetch({ url: `/library/mpn/${id}`, method: "delete" });

LibraryService.getMpnById = (id) =>
  fetch({ url: `/library/mpn/${id}`, method: "get" });

LibraryService.getAllMpn = (params) =>
  fetch({ url: "/library/mpn", method: "get", params });

LibraryService.importMpn = (data) =>
  fetch({
    url: "/library/mpn/import",
    method: "post",
    data,
    headers: { "Content-Type": "multipart/form-data" },
  });

LibraryService.exportMpn = () =>
  fetch({
    url: "/library/mpn/export/all",
    method: "get",
    responseType: "blob", // important for Excel download
  });

/**
 * ----------------------------
 * Child APIs
 * ----------------------------
 */
LibraryService.addChild = (data) =>
  fetch({ url: "/library/child", method: "post", data });

LibraryService.updateChild = (id, data) =>
  fetch({ url: `/library/child/${id}`, method: "put", data });

LibraryService.deleteChild = (id) =>
  fetch({ url: `/library/child/${id}`, method: "delete" });

LibraryService.getChildById = (id) =>
  fetch({ url: `/library/child/${id}`, method: "get" });

LibraryService.getAllChild = (params) =>
  fetch({ url: "/library/child", method: "get", params });

LibraryService.importChild = (data) =>
  fetch({
    url: "/library/child/import",
    method: "post",
    data,
    headers: { "Content-Type": "multipart/form-data" },
  });

LibraryService.exportChild = () =>
  fetch({ url: "/library/child/export/all", method: "get",responseType: "blob" });

export default LibraryService;

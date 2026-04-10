// import React, { useEffect, useMemo, useState } from "react";
// import { Table, Button, Tag, message, Space } from "antd";
// import { DeleteFilled, PlusOutlined } from "@ant-design/icons";
// import { hasPermission } from "utils/auth";
// import ActionButtons from "components/ActionButtons";
// import AddChildPartModal from "./AddChildPartModal";
// import GlobalTableActions from "components/GlobalTableActions";
// import LibraryService from "services/libraryService";
// import useDebounce from "utils/debouce";
// import GlobalFilterModal from "components/GlobalFilterModal";
// import { useDispatch, useSelector } from "react-redux";
// import { getAllCategories } from "store/slices/categorySlice";
// import { API_BASE_URL } from "configs/AppConfig";
// import ConfirmDeleteModal from "components/ConfirmDeleteModal";

// // Badge helper
// const renderBadge = (text, type) => {
//   let color = "gray";
//   if (type === "status") {
//     color = String(text || "").toLowerCase() === "active" ? "green" : "red";
//   } else {
//     color = "blue";
//   }
//   return <Tag color={color}>{text || "-"}</Tag>;
// };

// const ChildPartLibrary = () => {
//   const dispatch = useDispatch();
//   const { categories } = useSelector((state) => state.categories);

//   // ✅ table data
//   const [data, setChild] = useState([]);
//   const [loading, setLoading] = useState(false);

//   // ✅ pagination
//   const [page, setPage] = useState(1);
//   const [limit, setLimit] = useState(10);
//   const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });


//   const [deleteModalVisible, setDeleteModalVisible] = useState(false);
//   const [deleteMode, setDeleteMode] = useState("single"); // "single" | "bulk"
//   const [deleteId, setDeleteId] = useState(null);

//   // ✅ search
//   const [search, setSearch] = useState("");
//   const handleSearch = useDebounce((value) => {
//     const v = String(value || "");
//     setSearch(v);   // ✅ ALWAYS string
//     setPage(1);     // ✅ reset page
//     fetchChildParts({ page: 1, limit, search: v, ...filters }); // ✅ send string
//   }, 500);

//   // ✅ filters
//   const [filterVisible, setFilterVisible] = useState(false);
//   const [filters, setFilters] = useState({}); // {category, mpn, status}

//   // ✅ modal/edit
//   const [showAddChildPart, setShowAddChildPart] = useState(false);
//   const [editingRecord, setEditingRecord] = useState(null);
//   const [formData, setFormData] = useState({});

//   // ✅ mpn options
//   const [mpnOptions, setMnpOption] = useState([]);
//   const [importExcel, setImportExcel] = useState(false);
//   const [selectedRowKeys, setSelectedRowKeys] = useState([]);

// const rowSelection = {
//   selectedRowKeys,
//   preserveSelectedRowKeys: true,
//   onChange: (keys) => setSelectedRowKeys(keys),
// };

//   const handleDeleteSelected = () => {
//     if (!selectedRowKeys.length) {
//       message.warning("Please select at least one item");
//       return;
//     }
//     setDeleteMode("bulk");
//     setDeleteModalVisible(true);
//   };


//   const handleConfirmDelete = async () => {
//     try {
//       setLoading(true);
//       message.loading({ content: "Deleting...", key: "bulkDel" });

//       if (deleteMode === "bulk") {
//         await LibraryService.deleteChildPartsBulk({ ids: selectedRowKeys });
//         message.success({ content: "Selected items deleted", key: "bulkDel" });
//         setSelectedRowKeys([]);
//       } else {
//         await LibraryService.deleteChild(deleteId);
//         message.success({ content: "Item deleted", key: "bulkDel" });
//       }

//       setDeleteModalVisible(false);
//       setDeleteId(null);
//       fetchChildParts();
//     } catch (err) {
//       console.error(err);
//       message.error({ content: "Failed to delete", key: "bulkDel" });
//     } finally {
//       setLoading(false);
//     }
//   };



//   // ================= Columns =================
//   const columns = useMemo(
//     () => [
//       { title: "Child Part No", dataIndex: "ChildPartNo", key: "ChildPartNo" },
//       {
//         title: "Linked MPN",
//         dataIndex: ["mpn", "MPN"],
//         key: "mpn",
//         render: (text) => text || "-",
//       },
//       {
//         title: "Category",
//         dataIndex: "LinkedMPNCategory",
//         key: "LinkedMPNCategory",
//         render: (category) => renderBadge(category?.name || "—", "category"),
//       },
//       {
//         title: "Status",
//         dataIndex: "status",
//         key: "status",
//         render: (text) => renderBadge(text, "status"),
//       },
//       {
//         title: (
//           <Space>
//             Actions
//             {hasPermission("library.child:create_edit_delete") && (
//               <Button
//                 danger
//                 size="small"
//                 icon={<DeleteFilled style={{ color: "#FF4D4F" }} />}
//                 // disabled={selectedRowKeys?.length == 0}
//                 onClick={handleDeleteSelected}
//               >
//               </Button>


//             )}
//           </Space>
//         ),

//         key: "actions",
//         fixed: "right",
//         width: 150,
//         render: (_, record) => (
//           <ActionButtons
//             onEdit={() => handleEdit(record?._id)}
//             onDelete={() => handleDelete(record?._id)}
//             showEdit={hasPermission("library.child:create_edit_delete")}
//             showDelete={hasPermission("library.child:create_edit_delete")}
//             showDeleteConfirm
//           />
//         ),
//       },
//     ],
//     []
//   );



//   // ================= Filter Config =================
//   const filterConfig = useMemo(
//     () => [
//       {
//         type: "select",
//         name: "category",
//         label: "Category",
//         placeholder: "Select Category",
//         options: (categories || []).map((c) => ({ label: c.name, value: c._id })),
//       },
//       {
//         type: "select",
//         name: "mpn",
//         label: "MPN",
//         placeholder: "Select MPN",
//         options: (mpnOptions || []).map((m) => ({ label: m.label, value: m.value })),
//       },
//       {
//         type: "select",
//         name: "status",
//         label: "Status",
//         placeholder: "Select Status",
//         options: [
//           { value: "active", label: "Active" },
//           { value: "inActive", label: "InActive" },
//         ],
//       },
//     ],
//     [categories, mpnOptions]
//   );

//   // ================= API Calls =================
//   const fetchChildParts = async () => {
//     setLoading(true);
//     try {
//       const res = await LibraryService.getAllChild({
//         page,
//         limit,
//         search: search, // ✅ ALWAYS string
//         ...filters,
//       });

//       if (res?.success) {
//         setChild(res.data || []);
//         const pg = res?.pagination || { total: 0, page, limit, totalPages: 0 };
//         setPagination(pg);

//         // optional sync
//         // if (pg?.page && pg.page !== page) setPage(pg.page);
//         // if (pg?.limit && pg.limit !== limit) setLimit(pg.limit);
//       } else {
//         setChild([]);
//         setPagination({ total: 0, page, limit, totalPages: 0 });
//       }
//     } catch (err) {
//       console.error("Error fetching Child Parts:", err);
//       setChild([]);
//       setPagination({ total: 0, page: 1, limit: 10, totalPages: 0 });
//       message.error("Failed to load child parts");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchMpn = async () => {
//     try {
//       const res = await LibraryService.getAllMpn();
//       if (res?.success) {
//         setMnpOption(
//           (res.data || []).map((mpn) => ({
//             label: mpn?.MPN,
//             value: mpn?._id,
//           }))
//         );
//       }
//     } catch (err) {
//       console.error("Error fetching MPNs:", err);
//     }
//   };

//   // ================= Lifecycle =================
//   useEffect(() => {
//     dispatch(getAllCategories());
//     fetchMpn();
//   }, [dispatch]);

//   // ✅ SINGLE fetch trigger (no race)
//   useEffect(() => {
//     fetchChildParts();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [page, limit, search, JSON.stringify(filters)]);

//   // ✅ search change => reset page
//   useEffect(() => {
//     setPage(1);
//   }, [search]);

//   // ================= Actions =================
//   const handleDelete = async (id) => {
//     try {
//       const res = await LibraryService.deleteChild(id);
//       if (res?.success) {
//         message.success("Deleted");
//         fetchChildParts();
//       } else message.error(res?.message || "Delete failed");
//     } catch (err) {
//       console.error("Delete error:", err);
//       message.error("Delete failed");
//     }
//   };

//   const handleEdit = async (id) => {
//     try {
//       const res = await LibraryService.getChildById(id);
//       if (res?.success) {
//         setFormData(res.data);
//         setEditingRecord(res.data);
//         setShowAddChildPart(true);
//       } else message.error(res?.message || "Failed to load record");
//     } catch (err) {
//       console.error("Edit fetch error:", err);
//       message.error("Failed to fetch record");
//     }
//   };

//   const handleFilterSubmit = (filterData) => {
//     setFilters(filterData || {});
//     setPage(1);
//     setFilterVisible(false);
//   };

//   const handleClearFilters = () => {
//     setFilters({});
//     setPage(1);
//   };

//   const handleSubmit = async (form) => {
//     try {
//       const payload = {
//         ChildPartNo: form.childPartNo,
//         mpn: form.linkedMpn,
//         LinkedMPNCategory: form.LinkedMPNCategory,
//         status: form.status || "active",
//       };

//       let res;
//       if (editingRecord?._id) res = await LibraryService.updateChild(editingRecord._id, payload);
//       else res = await LibraryService.addChild(payload);

//       if (res?.success) {
//         message.success(editingRecord ? "Child Part updated" : "Child Part added");
//         setShowAddChildPart(false);
//         setEditingRecord(null);
//         setFormData({});
//         fetchChildParts();
//       } else {
//         message.error(res?.message || "Operation failed");
//       }
//     } catch (err) {
//       console.error("Submit error:", err);
//       message.error("Something went wrong");
//     }
//   };

//   // ✅ Import (popup safe)
//   const handleMpnImport = async (file) => {
//     setImportExcel(true);
//     if (!file) {
//       setImportExcel(false);
//       message.error("Please select file");
//       return;
//     }

//     const downloadWin = window.open("", "_blank");

//     try {
//       const formData = new FormData();
//       formData.append("file", file);

//       const res = await LibraryService.importChild(formData);

//       if (res?.missingMpnsFileUrl) {
//         const apiBase = (API_BASE_URL || "").replace(/\/$/, "");
//         console.log('-----apiBase', apiBase)
//         const fullUrl = `${apiBase}${res.missingMpnsFileUrl}`;
//         if (downloadWin) downloadWin.location.href = fullUrl;
//         else window.location.href = fullUrl;

//         message.warning({
//           duration: 6,
//           content: (
//             <span>
//               Missing MPN found: <b>{res.missingMpnCount}</b>. File opened/downloaded.
//             </span>
//           ),
//         });
//       } else {
//         if (downloadWin) downloadWin.close();
//       }

//       if (res?.success) message.success(res?.message || "Imported successfully!", 6);
//       else message.error(res?.message || "Import completed with errors!", 3);

//       fetchChildParts();
//     } catch (err) {
//       if (downloadWin) downloadWin.close();
//       console.error("Import failed:", err);
//       message.error(err?.response?.data?.message || "Import failed!");
//     } finally {
//       setImportExcel(false);
//     }
//   };

//   const handleExport = async () => {
//     try {
//       const res = await LibraryService.exportChild({ search, ...filters });
//       if (!res) return;

//       const blob = new Blob([res], {
//         type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//       });

//       const url = window.URL.createObjectURL(blob);
//       const link = document.createElement("a");
//       link.href = url;
//       link.setAttribute("download", `child_export_${Date.now()}.xlsx`);
//       document.body.appendChild(link);
//       link.click();
//       link.remove();
//       window.URL.revokeObjectURL(url);

//       message.success("Export successful");
//     } catch (err) {
//       console.error("Export error:", err);
//       message.error("Failed to export");
//     }
//   };

//   return (
//     <div>
//       {/* Header */}
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
//         <div>
//           <h2 style={{ margin: 0 }}>Child Part Library</h2>
//           <p style={{ margin: 0, fontSize: 14, color: "#888" }}>Child Parts Linked to MPNs with Auto Costing Data</p>
//         </div>

//         {hasPermission("library.child:create_edit_delete") && (
//           <Button onClick={() => setShowAddChildPart(true)} type="primary" icon={<PlusOutlined />}>
//             Add Child Part
//           </Button>
//         )}
//       </div>

//       {/* Actions */}
//       <GlobalTableActions
//         showSearch
//         onSearch={(value) => { handleSearch(value) }} // ✅ only set string
//         showImport={hasPermission("library.child:import")}
//         onImport={handleMpnImport}
//         onImportLoader={importExcel}
//         showExport={hasPermission("library.child:export")}
//         onExport={handleExport}
//         showFilter
//         onFilter={() => setFilterVisible(true)}
//       />

//       {/* optional: clear filters button */}
//       {Object.keys(filters || {}).length > 0 && (
//         <div style={{ marginBottom: 10 }}>
//           <Button onClick={handleClearFilters}>Clear Filters</Button>
//         </div>
//       )}

//       {/* Table */}
//       <Table
//         columns={columns}
//         dataSource={data}
//         loading={loading}
//         rowKey="_id"
//         rowSelection={rowSelection}
//         pagination={{
//           current: page,
//           pageSize: limit,
//           total: pagination?.total || 0,
//           showSizeChanger: true,
//           onChange: (p, l) => {
//             setPage(p);
//             setLimit(l);
//           }
//         }}

//       />

//       {/* Modal */}
//       <AddChildPartModal
//         visible={showAddChildPart}
//         onCancel={() => {
//           setShowAddChildPart(false);
//           setEditingRecord(null);
//           setFormData({});
//         }}
//         formData={formData}
//         onSubmit={handleSubmit}
//         mpnOptions={mpnOptions}
//         categories={categories}
//       />

//       {/* Filter Modal */}
//       <GlobalFilterModal
//         visible={filterVisible}
//         onClose={() => setFilterVisible(false)}
//         onSubmit={handleFilterSubmit}
//         filters={filterConfig}
//         title="Filters"
//       />

//       <ConfirmDeleteModal
//         open={deleteModalVisible}
//         loading={loading}
//         mode={deleteMode}
//         count={selectedRowKeys.length}
//         onCancel={() => !loading && setDeleteModalVisible(false)}
//         onConfirm={handleConfirmDelete}
//       />
//     </div>
//   );
// };

// export default ChildPartLibrary;

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Table, Button, Tag, message, Space } from "antd";
import { DeleteFilled, PlusOutlined } from "@ant-design/icons";
import { hasPermission } from "utils/auth";
import ActionButtons from "components/ActionButtons";
import AddChildPartModal from "./AddChildPartModal";
import GlobalTableActions from "components/GlobalTableActions";
import LibraryService from "services/libraryService";
import useDebounce from "utils/debouce";
import GlobalFilterModal from "components/GlobalFilterModal";
import { useDispatch, useSelector } from "react-redux";
import { getAllCategories } from "store/slices/categorySlice";
import { API_BASE_URL } from "configs/AppConfig";
import ConfirmDeleteModal from "components/ConfirmDeleteModal";

// Badge helper
const renderBadge = (text, type) => {
  let color = "gray";
  if (type === "status") {
    color = String(text || "").toLowerCase() === "active" ? "green" : "red";
  } else {
    color = "blue";
  }
  return <Tag color={color}>{text || "-"}</Tag>;
};

const ChildPartLibrary = () => {
  const dispatch = useDispatch();
  const { categories } = useSelector((state) => state.categories);

  // table data
  const [data, setChild] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);

  // pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });

  // search + filters
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const filtersKey = useMemo(() => JSON.stringify(filters || {}), [filters]);

  // filter modal
  const [filterVisible, setFilterVisible] = useState(false);

  // edit/add modal
  const [showAddChildPart, setShowAddChildPart] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({});

  // mpn options
  const [mpnOptions, setMnpOption] = useState([]);
  const [importExcel, setImportExcel] = useState(false);

  // bulk selection
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // delete modal (single/bulk)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteMode, setDeleteMode] = useState("single"); // "single" | "bulk"
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ✅ fetch child parts (supports override)
  const fetchChildParts = useCallback(
    async (override = {}) => {
      const p = override.page ?? page;
      const l = override.limit ?? limit;
      const s = override.search ?? search;
      const f = override.filters ?? filters;

      setTableLoading(true);
      try {
        const res = await LibraryService.getAllChild({
          page: p,
          limit: l,
          search: String(s || ""),
          ...f,
        });

        if (res?.success) {
          setChild(res.data || []);
          setPagination(res?.pagination || { total: 0, page: p, limit: l, totalPages: 0 });
        } else {
          setChild([]);
          setPagination({ total: 0, page: p, limit: l, totalPages: 0 });
        }
      } catch (err) {
        console.error("Error fetching Child Parts:", err);
        setChild([]);
        setPagination({ total: 0, page: 1, limit: 10, totalPages: 0 });
        message.error("Failed to load child parts");
      } finally {
        setTableLoading(false);
      }
    },
    [page, limit, search, filters]
  );

  // ✅ fetch MPN options
  const fetchMpn = async () => {
    try {
      const res = await LibraryService.getAllMpn();
      if (res?.success) {
        setMnpOption(
          (res.data || []).map((mpn) => ({
            label: mpn?.MPN,
            value: mpn?._id,
            category:mpn?.Category?.name,
            categoryId:mpn?.Category?._id
          }))
        );
      }
    } catch (err) {
      console.error("Error fetching MPNs:", err);
    }
  };

  // initial load
  useEffect(() => {
    dispatch(getAllCategories());
    fetchMpn();
  }, [dispatch]);

  // ✅ single fetch trigger
  useEffect(() => {
    fetchChildParts();
  }, [page, limit, search, filtersKey, fetchChildParts]);

  // ✅ debounced search: only setSearch (no direct fetch here)
  const debouncedSetSearch = useDebounce((v) => {
    setSearch(String(v || ""));
  }, 500);

  const onSearchChange = (value) => {
    setPage(1);
    debouncedSetSearch(value);
  };

  // ✅ row selection
  const rowSelection = useMemo(
    () => ({
      selectedRowKeys,
      preserveSelectedRowKeys: true,
      onChange: (keys) => setSelectedRowKeys(keys),
    }),
    [selectedRowKeys]
  );

  // ✅ open bulk delete modal
  const handleDeleteSelected = () => {
    if (!selectedRowKeys.length) {
      message.warning("Please select at least one item");
      return;
    }
    setDeleteMode("bulk");
    setDeleteModalVisible(true);
  };

  // ✅ open single delete modal
  const handleDeleteOne = (id) => {
    setDeleteMode("single");
    setDeleteId(id);
    setDeleteModalVisible(true);
  };

    const handleDelete = async (id) => {
    try {
      const res = await LibraryService.deleteChild(id);
      if (res?.success) {
        message.success("Deleted");
        fetchChildParts();
      } else message.error(res?.message || "Delete failed");
    } catch (err) {
      console.error("Delete error:", err);
      message.error("Delete failed");
    }
  };

  // ✅ confirm delete (single/bulk)
  const handleConfirmDelete = async () => {
    try {
      setDeleteLoading(true);
      message.loading({ content: "Deleting...", key: "bulkDel" });

      if (deleteMode === "bulk") {
        await LibraryService.deleteChildPartsBulk({ ids: selectedRowKeys });
        message.success({ content: "Selected items deleted", key: "bulkDel" });
        setSelectedRowKeys([]);
      } else {
        await LibraryService.deleteChild(deleteId);
        message.success({ content: "Item deleted", key: "bulkDel" });
      }

      setDeleteModalVisible(false);
      setDeleteId(null);

      // ✅ reload current page
      fetchChildParts();
    } catch (err) {
      console.error(err);
      message.error({ content: "Failed to delete", key: "bulkDel" });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ✅ edit
  const handleEdit = async (id) => {
    try {
      const res = await LibraryService.getChildById(id);
      if (res?.success) {
        setFormData(res.data);
        setEditingRecord(res.data);
        setShowAddChildPart(true);
      } else message.error(res?.message || "Failed to load record");
    } catch (err) {
      console.error("Edit fetch error:", err);
      message.error("Failed to fetch record");
    }
  };

  // ✅ filter submit
  const handleFilterSubmit = (filterData) => {
    setFilters(filterData || {});
    setPage(1);
    setFilterVisible(false);
  };

  const handleClearFilters = () => {
    setFilters({});
    setPage(1);
  };

  // ✅ submit add/edit
  const handleSubmit = async (form) => {
    try {
      const payload = {
        ChildPartNo: form.childPartNo,
        mpn: form.linkedMpn,
        LinkedMPNCategory: form.LinkedMPNCategory,
        status: form.status || "active",
      };

      let res;
      if (editingRecord?._id) res = await LibraryService.updateChild(editingRecord._id, payload);
      else res = await LibraryService.addChild(payload);

      if (res?.success) {
        message.success(editingRecord ? "Child Part updated" : "Child Part added");
        setShowAddChildPart(false);
        setEditingRecord(null);
        setFormData({});
        fetchChildParts();
      } else {
        message.error(res?.message || "Operation failed");
      }
    } catch (err) {
      console.error("Submit error:", err);
      message.error("Something went wrong");
    }
  };

  // ✅ Import (popup safe)
  const handleMpnImport = async (file) => {
    setImportExcel(true);
    if (!file) {
      setImportExcel(false);
      message.error("Please select file");
      return;
    }

    const downloadWin = window.open("", "_blank");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await LibraryService.importChild(formData);

      if (res?.missingMpnsFileUrl) {
        const apiBase = (API_BASE_URL || "").replace(/\/$/, "");
        const fullUrl = `${apiBase}${res.missingMpnsFileUrl}`;
        if (downloadWin) downloadWin.location.href = fullUrl;
        else window.location.href = fullUrl;

        message.warning({
          duration: 6,
          content: (
            <span>
              Missing MPN found: <b>{res.missingMpnCount}</b>. File opened/downloaded.
            </span>
          ),
        });
      } else {
        if (downloadWin) downloadWin.close();
      }

      if (res?.success) message.success(res?.message || "Imported successfully!", 6);
      else message.error(res?.message || "Import completed with errors!", 6);
    } catch (err) {
      
      if (downloadWin) downloadWin.close();
      console.error("Import failed:", err);
      message.error(err?.response?.data?.message || "Import failed!");
    } finally {
      setImportExcel(false);
      fetchChildParts();
    }
  };

  // ✅ export
  const handleExport = async () => {
    try {
      const res = await LibraryService.exportChild({ search, ...filters });
      if (!res) return;

      const blob = new Blob([res], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `child_export_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success("Export successful");
    } catch (err) {
      console.error("Export error:", err);
      message.error("Failed to export");
    }
  };

  // ✅ columns (deps included)
  const columns = useMemo(
    () => [
      { title: "Child Part No", dataIndex: "ChildPartNo", key: "ChildPartNo" },
      {
        title: "Linked MPN",
        dataIndex: ["mpn", "MPN"],
        key: "mpn",
        render: (text) => text || "-",
      },
      {
        title: "Category",
        dataIndex: "LinkedMPNCategory",
        key: "LinkedMPNCategory",
        render: (category) => renderBadge(category?.name || "—", "category"),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (text) => renderBadge(text, "status"),
      },
      {
        title: (
          <Space>
            Actions
            {hasPermission("library.child:create_edit_delete") && (
              <Button
                danger
                size="small"
                icon={<DeleteFilled />}
                disabled={!selectedRowKeys.length}
                onClick={handleDeleteSelected}
              />
            )}
          </Space>
        ),
        key: "actions",
        fixed: "right",
        width: 150,
        render: (_, record) => (
          <ActionButtons
            onEdit={() => handleEdit(record?._id)}
            onDelete={() => handleDelete(record?._id)}   // ✅ modal open
            showEdit={hasPermission("library.child:create_edit_delete")}
            showDelete={hasPermission("library.child:create_edit_delete")}
            showDeleteConfirm={false}                       // ✅ IMPORTANT (avoid double confirm)
          />
        ),
      },
    ],
    [selectedRowKeys.length, categories] // selectedRowKeys length important
  );

  // filter config
  const filterConfig = useMemo(
    () => [
      {
        type: "select",
        name: "category",
        label: "Category",
        placeholder: "Select Category",
        options: (categories || []).map((c) => ({ label: c.name, value: c._id })),
      },
      {
        type: "select",
        name: "mpn",
        label: "MPN",
        placeholder: "Select MPN",
        options: (mpnOptions || []).map((m) => ({ label: m.label, value: m.value })),
      },
      {
        type: "select",
        name: "status",
        label: "Status",
        placeholder: "Select Status",
        options: [
          { value: "active", label: "Active" },
          { value: "inActive", label: "InActive" },
        ],
      },
    ],
    [categories, mpnOptions]
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Child Part Library</h2>
          <p style={{ margin: 0, fontSize: 14, color: "#888" }}>Child Parts Linked to MPNs with Auto Costing Data</p>
        </div>

        {hasPermission("library.child:create_edit_delete") && (
          <Button onClick={() => setShowAddChildPart(true)} type="primary" icon={<PlusOutlined />}>
            Add Child Part
          </Button>
        )}
      </div>

      {/* Actions */}
      <GlobalTableActions
        showSearch
        onSearch={onSearchChange}
        showImport={hasPermission("library.child:import")}
        onImport={handleMpnImport}
        onImportLoader={importExcel}
        showExport={hasPermission("library.child:export")}
        onExport={handleExport}
        showFilter
        onFilter={() => setFilterVisible(true)}
      />

      {/* Clear filters */}
      {Object.keys(filters || {}).length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <Button onClick={handleClearFilters}>Clear Filters</Button>
        </div>
      )}

      {/* Table */}
      <Table
        columns={columns}
        dataSource={data}
        loading={tableLoading}
        rowKey="_id"
        rowSelection={rowSelection}
        pagination={{
          current: page,
          pageSize: limit,
          total: pagination?.total || 0,
          showSizeChanger: true,
          onChange: (p, l) => {
            setPage(p);
            setLimit(l);
          },
        }}
      />

      {/* Add/Edit Modal */}
      <AddChildPartModal
        visible={showAddChildPart}
        onCancel={() => {
          setShowAddChildPart(false);
          setEditingRecord(null);
          setFormData({});
        }}
        formData={formData}
        onSubmit={handleSubmit}
        mpnOptions={mpnOptions}
        categories={categories}
      />

      {/* Filter Modal */}
      <GlobalFilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onSubmit={handleFilterSubmit}
        filters={filterConfig}
        title="Filters"
      />

      {/* Delete confirm modal */}
      <ConfirmDeleteModal
        open={deleteModalVisible}
        loading={deleteLoading}
        mode={deleteMode}
        count={selectedRowKeys.length}
        onCancel={() => !deleteLoading && setDeleteModalVisible(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default ChildPartLibrary;



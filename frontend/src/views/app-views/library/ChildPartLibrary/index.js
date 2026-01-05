// import React, { useEffect, useState } from "react";
// import { Table, Button, Space, Popconfirm, Tag, message } from "antd";
// import { EditOutlined, DeleteOutlined, InfoCircleOutlined, PlusOutlined, InfoCircleFilled, EditFilled, DeleteFilled } from "@ant-design/icons";
// import { hasPermission } from "utils/auth";
// import ActionButtons from "components/ActionButtons";
// import AddMpnModal from "../MpnMasterList/AddMpnModal";
// import AddChildPartModal from "./AddChildPartModal";
// import GlobalTableActions from "components/GlobalTableActions";
// import LibraryService from "services/libraryService";
// import useDebounce from "utils/debouce";
// import Fixed from "views/app-views/components/layout/layout/Fixed";
// import GlobalFilterModal from "components/GlobalFilterModal";
// import { useDispatch, useSelector } from "react-redux";
// import { getAllCategories } from "store/slices/categorySlice";
// import { fetchAllMpn } from "store/slices/librarySlice";

// // Badge render helper
// const renderBadge = (text, type) => {
//     let color;
//     switch (type) {
//         case "status":
//             const activeValues = ["active", "Active", "ACTIVE", "aCtive"];
//             color = activeValues.includes(text) ? "green" : "red";
//             break;
//         case "uom":
//             color = "blue";
//             break;
//         default:
//             color = "gray";
//     }
//     return <Tag color={color}>{text}</Tag>;
// };

// // Columns definition


// const ChildPartLibrary = () => {
//     const dispatch = useDispatch()
//     const [data, setChild] = useState();
//     const [showAddChildPart, setShowAddChildPart] = useState(false);
//     const [loading, setLoading] = useState(false);
//     const [search, setSearch] = useState("");
//     const [page, setPage] = useState(1);
//     const [limit, setLimit] = useState(10);
//     const [editingRecord, setEditingRecord] = useState(null);
//     const [formData, setFormData] = useState({});
//     const [mpnOptions, setMnpOption] = useState([])
//     const [filterVisible, setFilterVisible] = useState(false);
//     const { categories } = useSelector((state) => state.categories);
//     const { librarys } = useSelector((state) => state);

//     console.log('-----Child Part Library', librarys)
//     const [pagination, setPagination] = useState(null)
//     const [importExcel, setImportExcel] = useState(false);
//     const columns = [
//         { title: "Child Part No", dataIndex: "ChildPartNo", key: "ChildPartNo", sorter: (a, b) => a.ChildPartNo - b.ChildPartNo },
//         {
//             title: "Linked MPN",
//             dataIndex: ["mpn", "MPN"], // mpn object ke andar MPN field
//             key: "mpn",
//             render: text => text || "-", // agar null ho to dash dikha de
//         },
//         {
//             title: "Category",
//             dataIndex: "LinkedMPNCategory", // keep base field
//             key: "LinkedMPNCategory",
//             render: (category) => renderBadge(category?.name || "—", "LinkedMPNCategory.name"),
//         }
//         ,
//         { title: "Status", dataIndex: "status", key: "status", render: text => renderBadge(text, "status") },
//         {
//             title: "Actions",
//             key: "actions",
//             Fixed: 'right',
//             width: 150,
//             render: (_, record) => (
//                 <ActionButtons
//                     // onInfo={() => console.log("Info")}
//                     onEdit={() => handleEdit(record?._id)}
//                     onDelete={() => handleDelete(record?._id)}
//                     // showInfo={true}
//                     showEdit={hasPermission('library.child:create_edit_delete')}
//                     showDelete={hasPermission('library.child:create_edit_delete')}
//                     showDeleteConfirm={true}
//                 />

//             )
//         }
//     ];


//     const filterConfig = [
//         {
//             type: 'select',
//             name: 'category',
//             label: 'Category',
//             placeholder: 'Select Category',
//             options: categories.map(customer => ({
//                 label: customer.name,
//                 value: customer._id
//             }))
//         },
//         {
//             type: 'select',
//             name: 'mpn',
//             label: 'MPN',
//             placeholder: 'Select Mpn',
//             options: mpnOptions?.map(customer => ({
//                 label: customer?.label,
//                 value: customer?.value
//             }))
//         },
//         {
//             type: 'select',
//             name: 'status',
//             label: 'Status',
//             placeholder: 'Select Status',
//             options: [
//                 { value: 'active', label: 'Active' },
//                 { value: 'inActive', label: 'InActive' }
//             ]
//         }
//     ];

//     const handleDelete = async (id) => {
//         try {
//             const res = await LibraryService.deleteChild(id);
//             console.log("MPN Deleted:", res);
//             fetchChildParts()
//         } catch (err) {
//             console.error("Error deleting MPN:", err);
//         }
//     };

//     const handleEdit = async (id) => {
//         try {
//             const res = await LibraryService.getChildById(id);
//             if (res.success) {
//                 setFormData(res.data);
//                 setEditingRecord(res.data);
//                 setShowAddChildPart(true);
//             }
//         } catch (err) {
//             console.error("Error fetching MPN:", err);
//             message.error("Failed to fetch MPN data");
//         }
//     };

//     const autoDownloadMissingMpn = (fileUrl) => {
//         if (!fileUrl) return;

//         const apiBase = process.env.REACT_APP_API_URL?.replace(/\/$/, "");
//         const fullUrl = `${apiBase}${fileUrl}`;
//         console.log('------missingMpnsFileUrl',fullUrl)
//         // auto open / download
//         window.open(fullUrl, "_blank");
//     };


//  const handleMpnImport = async (file) => {
//   setImportExcel(true);

//   if (!file) {
//     setImportExcel(false);
//     message.error("Please select file");
//     return;
//   }

//   // ✅ user gesture time par tab open
//   const downloadWin = window.open("", "_blank");

//   try {
//     const formData = new FormData();
//     formData.append("file", file);

//     const res = await LibraryService.importChild(formData);

//     if (res?.missingMpnsFileUrl) {
//       const apiBase = (process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
//       const fullUrl = `${apiBase}${res.missingMpnsFileUrl}`;

//       // ✅ now redirect already-open tab
//       if (downloadWin) {
//         downloadWin.location.href = fullUrl;
//       } else {
//         // fallback if blocked
//         window.location.href = fullUrl;
//       }

//       message.warning({
//         duration: 6,
//         content: (
//           <span>
//             Missing MPN found: <b>{res.missingMpnCount}</b>. File opened/downloaded.
//           </span>
//         ),
//       });
//     } else {
//       // ✅ if no file, close blank tab
//       if (downloadWin) downloadWin.close();
//     }

//     if (res?.success) message.success(res?.message || "MPN imported successfully!", 6);
//     else message.error(res?.message || "MPN import completed with errors!", 3);

//     fetchChildParts();
//     setImportExcel(false);
//     return res;
//   } catch (err) {
//     if (downloadWin) downloadWin.close();
//     setImportExcel(false);
//     console.error("Import failed:", err);
//     message.error(err?.response?.data?.message || "Import failed!");
//     throw err;
//   }
// };



//     const fetchChildParts = async (params = {}) => {
//         setLoading(true);
//         try {
//             const { page = 1, limit = 10, search = "", ...filters } = params;
//             const res = await LibraryService.getAllChild({ page, limit, search, ...filters });
//             if (res.success) {
//                 setChild(res.data);
//                 setPagination(res?.pagination)
//                 setPage(res?.pagination?.page)
//                 setLimit(res?.pagination?.limit)
//             }
//         } catch (err) {
//             console.error("Error fetching MPNs:", err);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const fetchMpn = async (params = {}) => {
//         try {
//             const res = await LibraryService.getAllMpn();
//             console.log('-----res', res)
//             if (res.success) {
//                 const options = res?.data?.map(mpn => ({
//                     label: mpn?.MPN,   // show part number
//                     value: mpn?._id,   // use _id as value
//                     category: mpn?.Category?._id // optional, if you want to auto-fill category
//                 }));
//                 console.log('----options', options)
//                 setMnpOption(options);
//             }
//         } catch (err) {
//             console.error("Error fetching MPNs:", err);
//         } finally {

//         }
//     };

//     const handleFilterSubmit = async (filterData) => {
//         console.log('Filter data submitted:', filterData);
//         await fetchChildParts({ page: 1, limit: 10, ...filterData });
//         setFilterVisible(false)
//     };

//     useEffect(() => {
//         dispatch(getAllCategories())
//         // dispatch(fetchAllMpn())
//     }, [dispatch]);

//     useEffect(() => {
//         fetchMpn()
//         fetchChildParts();
//     }, [page, limit])

//     const handleSearch = useDebounce((value) => {
//         setPage(1); // reset page on search
//         fetchChildParts({ page: 1, limit, search: value });
//     }, 500); // 500ms debounce

//     const handleExport = async () => {
//         try {
//             const res = await LibraryService.exportChild();
//             if (!res) return;

//             // If using Axios / custom fetch, res is already blob
//             const blob = new Blob([res], {
//                 type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//             });

//             const url = window.URL.createObjectURL(blob);
//             const link = document.createElement("a");
//             link.href = url;
//             link.setAttribute("download", "child_export.xlsx");
//             document.body.appendChild(link);
//             link.click();
//             link.remove();

//             message.success("Export successful");
//         } catch (err) {
//             console.error("Error exporting MPN:", err);
//             message.error("Failed to export MPN");
//         }
//     };

//     const handleSubmit = async (data) => {
//         try {
//             const payload = {
//                 ChildPartNo: data.childPartNo,
//                 mpn: data.linkedMpn,
//                 LinkedMPNCategory: data.LinkedMPNCategory,
//                 status: data.status || "Active",
//             };

//             let res;
//             if (editingRecord) {
//                 // Edit case
//                 res = await LibraryService.updateChild(editingRecord._id, payload);
//             } else {
//                 // Add case
//                 res = await LibraryService.addChild(payload);
//             }

//             if (res.success) {
//                 message.success(editingRecord ? "Child Part updated" : "Child Part added");
//                 setShowAddChildPart(false);
//                 setEditingRecord(null);
//                 fetchChildParts(); // refresh table
//             } else {
//                 message.error(res.message || "Operation failed");
//             }
//         } catch (err) {
//             console.error("Error submitting child part:", err);
//             message.error("Something went wrong");
//         }
//     };

//     return (
//         <div>

//             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, width: '100%' }}>
//                 <div>
//                     <h2 style={{ margin: 0 }}>Child Part Library</h2>
//                     <p style={{ margin: 0, fontSize: 14, color: '#888' }}>Child Parts Linkedto MPNs with Auto Costing Data</p>
//                 </div>
//                 {hasPermission('library.child:create_edit_delete') && (
//                     <Button onClick={() => setShowAddChildPart(true)} type="primary" icon={<PlusOutlined />}>
//                         Add Child Part
//                     </Button>
//                 )}
//             </div>

//             <GlobalTableActions
//                 showSearch={true}
//                 onSearch={(value) => {
//                     setSearch(value);
//                     handleSearch(value)
//                 }}
//                 showImport={hasPermission('library.child:import')}
//                 onImport={(file) => handleMpnImport(file)}
//                 onImportLoader={importExcel}
//                 showExport={hasPermission('library.child:export')}
//                 onExport={() => handleExport()}
//                 showFilter={true}
//                 onFilter={() => setFilterVisible(true)}
//             />

//             <Table
//                 columns={columns}
//                 dataSource={data}
//                 rowKey="key"
//                 pagination={{
//                     current: page,
//                     pageSize: limit,
//                     total: pagination?.total || 0,
//                     onChange: (p, l) => {
//                         setPage(p);
//                         setLimit(l)
//                     }
//                 }}
//             />

//             <AddChildPartModal
//                 visible={showAddChildPart}

//                 onCancel={() => {
//                     setShowAddChildPart(false);
//                     setEditingRecord(null);
//                     setFormData()
//                 }}
//                 formData={formData}
//                 onSubmit={handleSubmit}
//                 mpnOptions={mpnOptions}
//                 categories={categories}
//             />

//             <GlobalFilterModal
//                 visible={filterVisible}
//                 onClose={() => setFilterVisible(false)}
//                 onSubmit={handleFilterSubmit}
//                 filters={filterConfig}
//                 title="Filters"
//             />

//         </div>
//     );
// };

// export default ChildPartLibrary;

import React, { useEffect, useMemo, useState } from "react";
import { Table, Button, Tag, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
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

  // ✅ table data
  const [data, setChild] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });

  // ✅ search
  const [search, setSearch] = useState("");
 const handleSearch = useDebounce((value) => {
  const v = String(value || "");
  setSearch(v);   // ✅ ALWAYS string
  setPage(1);     // ✅ reset page
  fetchChildParts({ page: 1, limit, search: v, ...filters }); // ✅ send string
}, 500);

  // ✅ filters
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState({}); // {category, mpn, status}

  // ✅ modal/edit
  const [showAddChildPart, setShowAddChildPart] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({});

  // ✅ mpn options
  const [mpnOptions, setMnpOption] = useState([]);
  const [importExcel, setImportExcel] = useState(false);

  // ================= Columns =================
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
        title: "Actions",
        key: "actions",
        fixed: "right",
        width: 150,
        render: (_, record) => (
          <ActionButtons
            onEdit={() => handleEdit(record?._id)}
            onDelete={() => handleDelete(record?._id)}
            showEdit={hasPermission("library.child:create_edit_delete")}
            showDelete={hasPermission("library.child:create_edit_delete")}
            showDeleteConfirm
          />
        ),
      },
    ],
    []
  );

  // ================= Filter Config =================
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

  // ================= API Calls =================
  const fetchChildParts = async () => {
    setLoading(true);
    try {
      const res = await LibraryService.getAllChild({
        page,
        limit,
        search: search, // ✅ ALWAYS string
        ...filters,
      });

      if (res?.success) {
        setChild(res.data || []);
        const pg = res?.pagination || { total: 0, page, limit, totalPages: 0 };
        setPagination(pg);

        // optional sync
        // if (pg?.page && pg.page !== page) setPage(pg.page);
        // if (pg?.limit && pg.limit !== limit) setLimit(pg.limit);
      } else {
        setChild([]);
        setPagination({ total: 0, page, limit, totalPages: 0 });
      }
    } catch (err) {
      console.error("Error fetching Child Parts:", err);
      setChild([]);
      setPagination({ total: 0, page: 1, limit: 10, totalPages: 0 });
      message.error("Failed to load child parts");
    } finally {
      setLoading(false);
    }
  };

  const fetchMpn = async () => {
    try {
      const res = await LibraryService.getAllMpn();
      if (res?.success) {
        setMnpOption(
          (res.data || []).map((mpn) => ({
            label: mpn?.MPN,
            value: mpn?._id,
          }))
        );
      }
    } catch (err) {
      console.error("Error fetching MPNs:", err);
    }
  };

  // ================= Lifecycle =================
  useEffect(() => {
    dispatch(getAllCategories());
    fetchMpn();
  }, [dispatch]);

  // ✅ SINGLE fetch trigger (no race)
  useEffect(() => {
    fetchChildParts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search, JSON.stringify(filters)]);

  // ✅ search change => reset page
  useEffect(() => {
    setPage(1);
  }, [search]);

  // ================= Actions =================
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

  const handleFilterSubmit = (filterData) => {
    setFilters(filterData || {});
    setPage(1);
    setFilterVisible(false);
  };

  const handleClearFilters = () => {
    setFilters({});
    setPage(1);
  };

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
        console.log('-----apiBase',apiBase)
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
      else message.error(res?.message || "Import completed with errors!", 3);

      fetchChildParts();
    } catch (err) {
      if (downloadWin) downloadWin.close();
      console.error("Import failed:", err);
      message.error(err?.response?.data?.message || "Import failed!");
    } finally {
      setImportExcel(false);
    }
  };

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
        onSearch={(value) => {handleSearch(value)}} // ✅ only set string
        showImport={hasPermission("library.child:import")}
        onImport={handleMpnImport}
        onImportLoader={importExcel}
        showExport={hasPermission("library.child:export")}
        onExport={handleExport}
        showFilter
        onFilter={() => setFilterVisible(true)}
      />

      {/* optional: clear filters button */}
      {Object.keys(filters || {}).length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <Button onClick={handleClearFilters}>Clear Filters</Button>
        </div>
      )}

      {/* Table */}
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey={(r) => r?._id} // ✅ IMPORTANT
         pagination={{
    current: page,
    pageSize: limit,
    total: pagination?.total || 0,
    showSizeChanger: true,
    onChange: (p, l) => {
      setPage(p);
      setLimit(l);
    }
  }}

      />

      {/* Modal */}
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
    </div>
  );
};

export default ChildPartLibrary;


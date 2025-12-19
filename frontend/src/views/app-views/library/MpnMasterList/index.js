import React, { useEffect, useState } from "react";
import { Table, Button, Tag, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { hasPermission } from "utils/auth";
import ActionButtons from "components/ActionButtons";
import AddMpnModal from "./AddMpnModal";
import GlobalTableActions from "components/GlobalTableActions";
import LibraryService from "services/libraryService";
import useDebounce from "utils/debouce";
import { useDispatch, useSelector } from "react-redux";
import { getAllUOMs } from "store/slices/uomSlice";
import { getAllCategories } from "store/slices/categorySlice";
import { fetchSuppliers } from "store/slices/supplierSlice";
import GlobalFilterModal from "components/GlobalFilterModal";
import { formatDate } from "utils/formatDate";
import { getAllCurrencies } from "store/slices/currencySlice";

// 🔹 Fix: hum hamesha max 4 purchase history columns dikhayenge
const MAX_PURCHASE_HISTORY = 3;

// Badge render helper
const renderBadge = (text, type) => {
    let color;
    switch (type) {
        case "status":
            color = text === "Active" ? "green" : "red";
            break;
        case "uom":
            color = "blue";
            break;
        default:
            color = "gray";
    }
    return <Tag color={color}>{text}</Tag>;
};

// 🔹 Purchase history columns helper
// Order: MOQ, Purchased Date, Purchased Price, Supplier, Lead Time
const getPurchaseHistoryColumns = (maxPurchaseCount = MAX_PURCHASE_HISTORY) => {
    const cols = [];
    for (let i = 0; i < maxPurchaseCount; i++) {
        const index = i + 1;
        cols.push(

            {
                title: `Purchased Price#${index}`,
                dataIndex: ["purchaseHistory", i, "purchasedPrice"],
                key: `purchaseHistory_purchasedPrice_${index}`,
                render: (price, record) => {
                    const currency = record.purchaseHistory[i]?.currency?.symbol || "";
                    return price ? `${currency} ${parseFloat(price).toFixed(2)}` : "-";
                }
            },
            {
                title: `Purchased Date#${index}`,
                dataIndex: ["purchaseHistory", i, "purchasedDate"],
                key: `purchaseHistory_purchasedDate_${index}`,
                render: (date) => (date ? new Date(date).toLocaleDateString("en-GB") : "-"),
            },
            {
                title: `MOQ#${index}`,
                dataIndex: ["purchaseHistory", i, "MOQ"],
                key: `purchaseHistory_MOQ_${index}`,
            },
            {
                title: `Supplier#${index}`,
                dataIndex: ["purchaseHistory", i, "Supplier"],
                key: `purchaseHistory_supplier_${index}`,
                render: (s) =>
                    typeof s === "object"
                        ? s?.companyName || s?.name || "-"
                        : s || "-",
            },
            {
                title: `Lead Time#${index}_WK`,
                dataIndex: ["purchaseHistory", i, "LeadTime_WK"],
                key: `purchaseHistory_LeadTime_WK_${index}`,
            }
        );
    }
    return cols;
};

const MpnMasterList = () => {
    const [data, setMpns] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [formData, setFormData] = useState({});
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [isExpanded, setIsExpanded] = useState(false);
    const [filterVisible, setFilterVisible] = useState(false);
    const [pagination, setPagination] = useState(null);
    const [importExcel, setImportExcel] = useState(false);
    const [exportExcel, setExportExcel] = useState(false);
    const dispatch = useDispatch();
    const { uoms } = useSelector((state) => state.uoms);
    const { suppliers } = useSelector((state) => state.suppliers);
    const { categories } = useSelector((state) => state.categories);
    const { currencies } = useSelector((state) => state.currency);
    // 🔹 Base columns (without dynamic purchase history)
    const columns = [
        {
            title: "No.",
            key: "rowIndex",
            ellipsis: true,
            align: 'center',
            fixed: 'left',
            render: (text, record, index) => index + 1,
        },
        {
            title: "MPN",
            dataIndex: "MPN",
            key: "MPN",
            fixed: 'left',
            width: 450,
            ellipsis: true,
            sorter: (a, b) => (a.MPN || '').localeCompare(b.MPN || ''),
        },
        {
            title: "Manufacturer",
            dataIndex: "Manufacturer",
            key: "Manufacturer",
            fixed: 'left',
            width: 450,
            ellipsis: true,
            sorter: (a, b) => (a.Manufacturer || '').localeCompare(b.Manufacturer || ''),
        },
        {
            title: "Description",
            dataIndex: "Description",
            key: "Description",
            fixed: 'left',
            width: 250,
            ellipsis: true,
        },
        {
            title: "Storage Location",
            dataIndex: "StorageLocation",
            key: "StorageLocation",
        },
        {
            title: "RFQ Unit Price",
            dataIndex: "RFQUnitPrice",
            key: "RFQUnitPrice",
            sorter: (a, b) => (a.RFQUnitPrice || 0) - (b.RFQUnitPrice || 0),
        },
        {
            title: "MOQ",
            dataIndex: "MOQ",
            key: "MOQ",
            sorter: (a, b) => (a.MOQ || 0) - (b.MOQ || 0),
        },
        {
            title: "RFQ Date",
            dataIndex: "RFQDate",
            key: "RFQDate",
            render: (date) => formatDate(date),
            sorter: (a, b) => new Date(a.RFQDate) - new Date(b.RFQDate),
        },
        {
            title: "Supplier",
            dataIndex: "Supplier",
            key: "Supplier",
            render: (Supplier) => Supplier?.companyName || "-",
        },
        {
            title: "Lead Time (WK)",
            dataIndex: "LeadTime_WK",
            key: "LeadTime_WK",
            sorter: (a, b) => (a.LeadTime_WK || 0) - (b.LeadTime_WK || 0),
        },
        {
            title: "UOM",
            dataIndex: "UOM",
            key: "UOM",
            render: (text) => renderBadge(text?.code, "uom"),
        },
        {
            title: "Category",
            dataIndex: "Category",
            key: "Category",
            render: (text) => renderBadge(text?.name, "category"),
        },
        {
            title: "Status",
            dataIndex: "Status",
            key: "Status",
            render: (text) => renderBadge(text, "status"),
        },
        {
            title: "Actions",
            key: "actions",
            // fixed: "right",
            render: (_, record) => (
                <ActionButtons
                    onInfo={() => console.log("Info")}
                    onEdit={() => handleEdit(record?._id)}
                    onDelete={() => handleDelete(record?._id)}
                    showInfo={hasPermission("library.mpn:view")}
                    showEdit={hasPermission("library.mpn:create_edit_delete")}
                    showDelete={hasPermission("library.mpn:create_edit_delete")}
                    showDeleteConfirm={true}
                />
            ),
        },
        ...(isExpanded ? getPurchaseHistoryColumns(MAX_PURCHASE_HISTORY) : []),

    ];

    const filterConfig = [
        {
            type: "select",
            name: "category",
            label: "Category",
            placeholder: "Select Category",
            options: categories.map((cat) => ({
                label: cat.name,
                value: cat._id,
            })),
        },
        {
            type: "select",
            name: "status",
            label: "Status",
            placeholder: "Select Status",
            options: [
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
            ],
        },
    ];

    const handleMpnImport = async (file) => {
        setImportExcel(true);
        if (!file) {
            setImportExcel(true);
            return
        }
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await LibraryService.importMpn(formData);
            message.success("MPN imported successfully!");
            setImportExcel(false)
            fetchMpn();
            return res;
        } catch (err) {
            setImportExcel(false)
            console.error("❌ Import failed:", err);
            message.error(err?.response?.data?.message || "Import failed!");
            throw err;
        }
    };

    const fetchMpn = async (params = {}) => {
        setLoading(true);
        try {
            const { page = 1, limit = 10, search = "", ...filters } = params;
            const res = await LibraryService.getAllMpn({
                page,
                limit,
                search,
                ...filters,
            });
            if (res.success) {
                setMpns(res.data || []);
                setPagination(res?.pagination);
            }
        } catch (err) {
            console.error("Error fetching MPNs:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterSubmit = async (filterData) => {
        await fetchMpn({ page: 1, limit: 10, ...filterData });
        setFilterVisible(false);
    };

    useEffect(() => {
        fetchMpn();
        dispatch(getAllUOMs());
        dispatch(fetchSuppliers());
        dispatch(getAllCategories());
        dispatch(getAllCurrencies());
    }, []);

    const handleDelete = async (id) => {
        try {
            const res = await LibraryService.deleteMpn(id);
            console.log("MPN Deleted:", res);
            fetchMpn({ page, limit, search });
        } catch (err) {
            console.error("Error deleting MPN:", err);
        }
    };

    const handleEdit = async (id) => {
        try {
            const res = await LibraryService.getMpnById(id);
            if (res.success) {
                setFormData(res.data);
                setEditingRecord(id);
                setShowAddModal(true);
            }
        } catch (err) {
            console.error("Error fetching MPN:", err);
            message.error("Failed to fetch MPN data");
        }
    };

    const handleSearch = useDebounce((value) => {
        setPage(1);
        fetchMpn({ page: 1, limit, search: value });
    }, 500);

    const handleSubmit = async (data) => {
        try {
            const payload = {
                MPN: data.mpn,
                Manufacturer: data.manufacture[0],
                UOM: data.uom,
                Description: data.description,
                StorageLocation: data.storageLocation,
                RFQUnitPrice: data.rfq,
                MOQ: data.moq,
                RFQDate: data.rfqDate,
                Supplier: data.supplier,
                LeadTime_WK: data.leadTime,
                Category: data.category,
                note: data.note,
                Status: data.status || "Active",
                currency: data?.currency
            };

            let res;
            if (editingRecord) {
                res = await LibraryService.updateMpn(editingRecord, payload);
            } else {
                res = await LibraryService.addMpn(payload);
            }

            if (res.success) {
                message.success(
                    editingRecord ? "MPN updated successfully" : "MPN added successfully"
                );
                setShowAddModal(false);
                setEditingRecord(null);
                fetchMpn({ page, limit, search });
            } else {
                message.error(res.message || "Operation failed");
            }
        } catch (err) {
            console.error("Error submitting MPN:", err);
            message.error("Something went wrong");
        }
    };


    const handleExport = async () => {
        setExportExcel(true)
        try {
            const response = await LibraryService.exportMpn();

            if (!response) {
                message.error("No response received");
                setExportExcel(false)
                return;
            }

            // Determine the blob based on your HTTP client
            let blob;
            if (response.data instanceof Blob) {
                blob = response.data; // Axios with responseType: 'blob'
            } else if (response instanceof Blob) {
                blob = response; // Native fetch or custom implementation
            } else {
                blob = new Blob([response], {
                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                });
            }

            // Verify blob type and size
            if (blob.size === 0) {
                message.error("Exported file is empty");
                return;
            }

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `mpn_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(link);
            link.click();
            setExportExcel(false)
            // Cleanup
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 100);

            message.success("Export successful");
        } catch (err) {
            setExportExcel(false)
            console.error("Error exporting MPN:", err);
            message.error("Failed to export MPN");
        }
    };

    return (
        <div>
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                    width: "100%",
                }}
            >
                <div>
                    <h2 style={{ margin: 0 }}>Manufacturing Part No (MPN) Master List</h2>
                    <p style={{ margin: 0, fontSize: 14, color: "#888" }}>
                        Complete Database of part and supplier
                    </p>
                </div>
                {hasPermission("library.mpn:create_edit_delete") && (
                    <Button
                        onClick={() => setShowAddModal(true)}
                        type="primary"
                        icon={<PlusOutlined />}
                    >
                        Add MPN
                    </Button>
                )}
            </div>

            {/* Global actions */}
            <GlobalTableActions
                showSearch={true}
                onSearch={(value) => {
                    setSearch(value);
                    handleSearch(value);
                }}
                showImport={hasPermission("library.mpn:import")}
                onImportLoader={importExcel}
                onImport={(file) => handleMpnImport(file)}
                showExport={hasPermission("library.mpn:export")}
                onExport={handleExport}
                showUpdatePurchaseHistory={true}
                onUpdatePurchaseHistory={() =>
                    fetchMpn()
                }
                showFilter={true}
                onFilter={() => setFilterVisible(true)}
                showPurchase={true}
                showPurchaseText={
                    isExpanded ? "Hide Purchase History" : "Show Purchase History"
                }
                onShowPurchaseHistory={() => setIsExpanded((prev) => !prev)}
            />

            {/* Table */}
            <Table
                columns={columns}
                dataSource={data}
                rowKey="_id" // 🔹 important: backend se _id aa raha hoga
                loading={loading}
                pagination={{
                    current: page,
                    pageSize: limit,
                    total: pagination?.totalItems || 0,
                    onChange: (p, l) => {
                        setPage(p);
                        setLimit(l);
                        fetchMpn({ page: p, limit: l, search });
                    },
                }}
                scroll={{ x: true }}
            />

            {/* Add / Edit Modal */}
            <AddMpnModal
                visible={showAddModal}
                onCancel={() => {
                    setShowAddModal(false);
                    setEditingRecord(null);
                }}
                formData={formData}
                onSubmit={handleSubmit}
                uoms={uoms}
                suppliers={suppliers}
                categories={categories}
                  currencies={currencies}
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

export default MpnMasterList;

import React, { useEffect, useState } from "react";
import { Table, Button, Space, Popconfirm, Tag, Input, message } from "antd";
import { EditOutlined, DeleteOutlined, InfoCircleOutlined, PlusOutlined, InfoCircleFilled, EditFilled, DeleteFilled, UploadOutlined, DownloadOutlined, FilterOutlined, SearchOutlined } from "@ant-design/icons";
import { hasPermission } from "utils/auth";
import ActionButtons from "components/ActionButtons";
import GlobalModal from "components/GlobalModal";
import AddMpnModal from "./AddMpnModal";
import GlobalTableActions from "components/GlobalTableActions";
import LibraryService from "services/libraryService";
import useDebounce from "utils/debouce";
import Fixed from "views/app-views/components/layout/layout/Fixed";
import { useDispatch, useSelector } from "react-redux";
import { getAllUOMs } from "store/slices/uomSlice";
import { getAllCategories } from "store/slices/categorySlice";
import { fetchSuppliers } from "store/slices/supplierSlice";
import GlobalFilterModal from "components/GlobalFilterModal";
import { formatDate } from "utils/formatDate";

// Dummy data
const dummyData = [
    {
        key: "1",
        no: 1,
        mpn: "MPN-001",
        manufacture: "Samsung",
        description: "High capacity hard drive",
        uom: "PCS",
        storageLocation: "Warehouse A",
        rfq: "RFQ-1001",
        unitPrice: 120,
        moq: 10,
        rfqDate: "2025-09-01",
        supplier: "Supplier A",
        leadTime: 2,
        status: "Active",
    },
    {
        key: "2",
        no: 2,
        mpn: "MPN-002",
        manufacture: "Western Digital",
        description: "External SSD",
        uom: "PCS",
        storageLocation: "Warehouse B",
        rfq: "RFQ-1002",
        unitPrice: 150,
        moq: 5,
        rfqDate: "2025-09-05",
        supplier: "Supplier B",
        leadTime: 3,
        status: "Inactive",
    },
    {
        key: "3",
        no: 3,
        mpn: "MPN-003",
        manufacture: "Intel",
        description: "CPU i7 12th Gen",
        uom: "PCS",
        storageLocation: "Warehouse C",
        rfq: "RFQ-1003",
        unitPrice: 350,
        moq: 2,
        rfqDate: "2025-09-10",
        supplier: "Supplier C",
        leadTime: 1,
        status: "Active",
    },
];

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

// Utility: Generate columns from purchaseHistory
const getPurchaseHistoryColumns = (maxPurchaseCount = 3) => {
    let cols = [];
    for (let i = 0; i < maxPurchaseCount; i++) {
        const index = i + 1;
        cols.push(
            { title: `Purchased Price#${index}`, dataIndex: ["purchaseHistory", i, "purchasedPrice"], key: `purchasedPrice${index}` },
            { title: `MOQ#${index}`, dataIndex: ["purchaseHistory", i, "moq"], key: `moq${index}` },
            {
                title: `Purchased Date#${index}`,
                dataIndex: ["purchaseHistory", i, "purchasedDate"],
                key: `purchasedDate${index}`,
                render: (date) => date ? new Date(date).toLocaleDateString() : "-"
            },
            { title: `Supplier#${index}`, dataIndex: ["purchaseHistory", i, "supplier"], key: `supplier${index}` },
            { title: `Lead Time#${index}_Wk`, dataIndex: ["purchaseHistory", i, "leadTimeWeeks"], key: `leadTimeWeeks${index}` }
        );
    }
    return cols;
};


// Columns definition

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
    const [pagination, setPagination] = useState(null)
    const dispatch = useDispatch()
    const { uoms } = useSelector((state) => state.uoms);
    const { suppliers } = useSelector((state) => state.suppliers);
    const { categories } = useSelector((state) => state.categories);
    console.log('------categories', categories)

    const maxPurchaseCount = data.length > 0
        ? Math.max(...data.map(item => item.purchaseHistory?.length || 0))
        : 0;

    const columns = [
        {
            title: "No.",
            key: "",
            render: (text, record, index) => index + 1, // 1,2,3...
            sorter: (a, b) => a.no - b.no, // optional if you want frontend sort
        },
        { title: "MPN", dataIndex: "MPN", key: "MPN" },
        { title: "Manufacture", dataIndex: "Manufacturer", key: "Manufacturer" },
        { title: "Description", dataIndex: "Description", key: "Description" },
        { title: "Storage Location", dataIndex: "StorageLocation", key: "StorageLocation" },
        { title: "RFQ Unit Price", dataIndex: "RFQUnitPrice", key: "RFQUnitPrice", sorter: (a, b) => a.RFQUnitPrice - b.RFQUnitPrice },
        { title: "MOQ", dataIndex: "MOQ", key: "MOQ", sorter: (a, b) => a.MOQ - b.MOQ },
        {
            title: "RFQ Date",
            dataIndex: "RFQDate",
            key: "RFQDate",
            render: (date) => formatDate(date),
            sorter: (a, b) => new Date(a.RFQDate) - new Date(b.RFQDate),
        },
        { title: "Supplier", dataIndex: "Supplier", key: "Supplier", render: Supplier => Supplier?.companyName },
        { title: "Lead Time (WK)", dataIndex: "LeadTime_WK", key: "LeadTime_WK", sorter: (a, b) => a.LeadTime_WK - b.LeadTime_WK },
        { title: "UOM", dataIndex: "UOM", key: "UOM", render: text => renderBadge(text?.code, "UOM") },
        {
            title: "Category",
            dataIndex: "Category",
            key: "Category",
            render: text => renderBadge(text?.name, "Category.name")
        }
        ,
        ...(isExpanded ? getPurchaseHistoryColumns(maxPurchaseCount) : []),
        { title: "Status", dataIndex: "Status", key: "Status", render: text => renderBadge(text, "Status") },
        {
            title: "Actions",
            key: "actions",
            Fixed: 'right',
            width: 150,
            render: (_, record) => (
                <ActionButtons
                    onInfo={() => console.log("Info")}
                    onEdit={() => handleEdit(record?._id)}
                    onDelete={() => handleDelete(record?._id)}
                    showInfo={hasPermission('library.mpn:view')}
                    showEdit={hasPermission('library.mpn:edit')}
                    showDelete={hasPermission('library.mpn:delete')}
                    showDeleteConfirm={true}
                />

            )
        }
    ];



    const filterConfig = [
        {
            type: 'select',
            name: 'category',
            label: 'Category',
            placeholder: 'Select Category',
            options: categories.map(customer => ({
                label: customer.name,
                value: customer._id
            }))
        },
        {
            type: 'select',
            name: 'status',
            label: 'Status',
            placeholder: 'Select Status',
            options: [
                { value: 'active', label: 'Active' },
                { value: 'Inactive', label: 'InActive' }
            ]
        }
    ];


    // const fullColumns = [
    //     ...minimalColumns.slice(0, -1), // remove last actions
    //     ...getPurchaseHistoryColumns(maxPurchaseCount),
    //     {
    //         title: "Actions",
    //         key: "actions",
    //         render: (_, record) => (
    //             <ActionButtons
    //                 onInfo={() => console.log("Info")}
    //                 onEdit={() => handleEdit(record?.id)}
    //                 onDelete={() => handleDelete(record?.id)}
    //             />
    //         )
    //     }
    // ];


    const handleMpnImport = async (file) => {
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await LibraryService.importMpn(formData);
            message.success("MPN imported successfully!");
            fetchMpn()
            return res;
        } catch (err) {
            console.error("❌ Import failed:", err);
            message.error(err?.response?.data?.message || "Import failed!");
            throw err;
        }
    };



    const fetchMpn = async (params = {}) => {
        setLoading(true);
        try {
            const { page = 1, limit = 10, search = "", ...filters } = params;
            const res = await LibraryService.getAllMpn({ page, limit, search, ...filters });
            if (res.success) {
                setMpns(res.data);
                setPagination(res?.pagination)
            }
        } catch (err) {
            console.error("Error fetching MPNs:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterSubmit = async (filterData) => {
        console.log('Filter data submitted:', filterData);
        await fetchMpn({ page: 1, limit: 10, ...filterData });
        setFilterVisible(false)
    };


    useEffect(() => {
        fetchMpn();
        dispatch(getAllUOMs())
        dispatch(fetchSuppliers())
        dispatch(getAllCategories())
    }, []);

    const handleDelete = async (id) => {
        try {
            const res = await LibraryService.deleteMpn(id);
            console.log("MPN Deleted:", res);
            fetchMpn()
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
        setPage(1); // reset page on search
        fetchMpn({ page: 1, limit, search: value });
    }, 500); // 500ms debounce



    const handleSubmit = async (data) => {
        try {
            // Map form data to schema
            const payload = {
                MPN: data.mpn,
                Manufacturer: data.manufacture,
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
                Status: data.status,
            };

            let res;
            if (editingRecord) {
                // Edit case
                res = await LibraryService.updateMpn(editingRecord, payload);
            } else {
                // Add case
                res = await LibraryService.addMpn(payload);
            }

            if (res.success) {
                message.success(editingRecord ? "MPN updated successfully" : "MPN added successfully");
                setShowAddModal(false);
                setEditingRecord(null);
                fetchMpn(); // refresh table
            } else {
                message.error(res.message || "Operation failed");
            }
        } catch (err) {
            console.error("Error submitting MPN:", err);
            message.error("Something went wrong");
        }
    };

    const handleExport = async () => {
        try {
            const res = await LibraryService.exportMpn();
            if (!res) return;

            // If using Axios / custom fetch, res is already blob
            const blob = new Blob([res], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "mpn_export.xlsx");
            document.body.appendChild(link);
            link.click();
            link.remove();

            message.success("Export successful");
        } catch (err) {
            console.error("Error exporting MPN:", err);
            message.error("Failed to export MPN");
        }
    };

    return (
        <div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, width: '100%' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Manufacturing Part No (MPN) Master List</h2>
                    <p style={{ margin: 0, fontSize: 14, color: '#888' }}>Complete Database of part and supplier</p>
                </div>
                {hasPermission('library.mpn:create') && (
                    <Button onClick={() => setShowAddModal(true)} type="primary" icon={<PlusOutlined />}>
                        Add MPN
                    </Button>
                )}
            </div>
            <GlobalTableActions
                showSearch={true}
                onSearch={(value) => {
                    setSearch(value);
                    handleSearch(value)
                }}
                showImport={hasPermission('library.mpn:import')}
                onImport={(file) => handleMpnImport(file)}
                showExport={hasPermission('library.mpn:export')}
                onExport={() => handleExport()}
                showUpdatePurchaseHistory={true}
                onUpdatePurchaseHistory={() => console.log("Update Purchase clicked")}
                showFilter={true}
                onFilter={() => setFilterVisible(true)}
                showPurchase={hasPermission('library.mpn:update_purchase_history')}
                showPurchaseText="Show Purchase History"
                onShowPurchaseHistory={() => setIsExpanded(!isExpanded)}

            />


            <Table
                columns={columns}
                dataSource={data}
                rowKey="key"
                pagination={{
                    current: page,
                    pageSize: limit,
                    total: pagination?.totalItems || 0,
                    onChange: (p, l) => {
                        setPage(p);
                        setLimit(l);
                        fetchMpn({ page: p, limit: l, search });
                    }
                }}
            />

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
            />

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

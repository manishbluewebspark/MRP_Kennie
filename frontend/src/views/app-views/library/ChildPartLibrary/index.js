import React, { useEffect, useState } from "react";
import { Table, Button, Space, Popconfirm, Tag, message } from "antd";
import { EditOutlined, DeleteOutlined, InfoCircleOutlined, PlusOutlined, InfoCircleFilled, EditFilled, DeleteFilled } from "@ant-design/icons";
import { hasPermission } from "utils/auth";
import ActionButtons from "components/ActionButtons";
import AddMpnModal from "../MpnMasterList/AddMpnModal";
import AddChildPartModal from "./AddChildPartModal";
import GlobalTableActions from "components/GlobalTableActions";
import LibraryService from "services/libraryService";
import useDebounce from "utils/debouce";
import Fixed from "views/app-views/components/layout/layout/Fixed";
import GlobalFilterModal from "components/GlobalFilterModal";
import { useDispatch, useSelector } from "react-redux";
import { getAllCategories } from "store/slices/categorySlice";
import { fetchAllMpn } from "store/slices/librarySlice";

// Badge render helper
const renderBadge = (text, type) => {
    let color;
    switch (type) {
        case "status":
    const activeValues = ["active", "Active", "ACTIVE", "aCtive"];
    color = activeValues.includes(text) ? "green" : "red";
    break;
        case "uom":
            color = "blue";
            break;
        default:
            color = "gray";
    }
    return <Tag color={color}>{text}</Tag>;
};

// Columns definition


const ChildPartLibrary = () => {
    const dispatch = useDispatch()
    const [data, setChild] = useState();
    const [showAddChildPart, setShowAddChildPart] = useState(false);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [editingRecord, setEditingRecord] = useState(null);
    const [formData, setFormData] = useState({});
    const [mpnOptions, setMnpOption] = useState([])
    const [filterVisible, setFilterVisible] = useState(false);
    const { categories } = useSelector((state) => state.categories);
    const { librarys } = useSelector((state) => state);

    console.log('-----Child Part Library',librarys)
    const [pagination, setPagination] = useState(null)
    const [importExcel,setImportExcel] = useState(false);
    const columns = [
        { title: "Child Part No", dataIndex: "ChildPartNo", key: "ChildPartNo", sorter: (a, b) => a.ChildPartNo - b.ChildPartNo },
        {
            title: "Linked MPN",
            dataIndex: ["mpn", "MPN"], // mpn object ke andar MPN field
            key: "mpn",
            render: text => text || "-", // agar null ho to dash dikha de
        },
        {
            title: "Category",
            dataIndex: "LinkedMPNCategory", // keep base field
            key: "LinkedMPNCategory",
            render: (category) => renderBadge(category?.name || "—", "LinkedMPNCategory.name"),
        }
        ,
        { title: "Status", dataIndex: "status", key: "status", render: text => renderBadge(text, "status") },
        {
            title: "Actions",
            key: "actions",
            Fixed: 'right',
            width: 150,
            render: (_, record) => (
                <ActionButtons
                    // onInfo={() => console.log("Info")}
                    onEdit={() => handleEdit(record?._id)}
                    onDelete={() => handleDelete(record?._id)}
                    // showInfo={true}
                    showEdit={hasPermission('library.child:edit')}
                    showDelete={hasPermission('library.child:delete')}
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
            name: 'mpn',
            label: 'MPN',
            placeholder: 'Select Mpn',
            options: mpnOptions?.map(customer => ({
                label: customer?.label,
                value: customer?.value
            }))
        },
        {
            type: 'select',
            name: 'status',
            label: 'Status',
            placeholder: 'Select Status',
            options: [
                { value: 'active', label: 'Active' },
                { value: 'inActive', label: 'InActive' }
            ]
        }
    ];

    const handleDelete = async (id) => {
        try {
            const res = await LibraryService.deleteChild(id);
            console.log("MPN Deleted:", res);
            fetchChildParts()
        } catch (err) {
            console.error("Error deleting MPN:", err);
        }
    };

    const handleEdit = async (id) => {
        try {
            const res = await LibraryService.getChildById(id);
            if (res.success) {
                setFormData(res.data);
                setEditingRecord(res.data);
                setShowAddChildPart(true);
            }
        } catch (err) {
            console.error("Error fetching MPN:", err);
            message.error("Failed to fetch MPN data");
        }
    };

    const handleMpnImport = async (file) => {
        setImportExcel(true)

        if (!file) {
            setImportExcel(false)
            message.error("Please select file")
            return
        }
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await LibraryService.importChild(formData);
            message.success("MPN imported successfully!");
            fetchChildParts()
            setImportExcel(false)
            return res;
        } catch (err) {
            setImportExcel(false)
            console.error("Import failed:", err);
            message.error(err?.response?.data?.message || "Import failed!");
            throw err;
        }
    };

    const fetchChildParts = async (params = {}) => {
        setLoading(true);
        try {
            const { page = 1, limit = 10, search = "", ...filters } = params;
            const res = await LibraryService.getAllChild({ page, limit, search, ...filters });
            if (res.success) {
                setChild(res.data);
                setPagination(res?.pagination)
            }
        } catch (err) {
            console.error("Error fetching MPNs:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMpn = async (params = {}) => {
        try {
            const res = await LibraryService.getAllMpn();
            console.log('-----res',res)
            if (res.success) {
                const options = res?.data?.map(mpn => ({
                    label: mpn?.MPN,   // show part number
                    value: mpn?._id,   // use _id as value
                    category: mpn?.Category?._id // optional, if you want to auto-fill category
                }));
                console.log('----options',options)
                setMnpOption(options);
            }
        } catch (err) {
            console.error("Error fetching MPNs:", err);
        } finally {

        }
    };

    const handleFilterSubmit = async (filterData) => {
        console.log('Filter data submitted:', filterData);
        await fetchChildParts({ page: 1, limit: 10, ...filterData });
        setFilterVisible(false)
    };

    useEffect(() => {
        dispatch(getAllCategories())
        // dispatch(fetchAllMpn())
    }, [dispatch]);

    useEffect(()=>{
        fetchMpn()
        fetchChildParts();
    },[])

    const handleSearch = useDebounce((value) => {
        setPage(1); // reset page on search
        fetchChildParts({ page: 1, limit, search: value });
    }, 500); // 500ms debounce

    const handleExport = async () => {
        try {
            const res = await LibraryService.exportChild();
            if (!res) return;

            // If using Axios / custom fetch, res is already blob
            const blob = new Blob([res], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "child_export.xlsx");
            document.body.appendChild(link);
            link.click();
            link.remove();

            message.success("Export successful");
        } catch (err) {
            console.error("Error exporting MPN:", err);
            message.error("Failed to export MPN");
        }
    };

    const handleSubmit = async (data) => {
        try {
            const payload = {
                ChildPartNo: data.childPartNo,
                mpn: data.linkedMpn,
                LinkedMPNCategory: data.LinkedMPNCategory,
                status: data.status,
            };

            let res;
            if (editingRecord) {
                // Edit case
                res = await LibraryService.updateChild(editingRecord._id, payload);
            } else {
                // Add case
                res = await LibraryService.addChild(payload);
            }

            if (res.success) {
                message.success(editingRecord ? "Child Part updated" : "Child Part added");
                setShowAddChildPart(false);
                setEditingRecord(null);
                fetchChildParts(); // refresh table
            } else {
                message.error(res.message || "Operation failed");
            }
        } catch (err) {
            console.error("Error submitting child part:", err);
            message.error("Something went wrong");
        }
    };

    return (
        <div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, width: '100%' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Child Part Library</h2>
                    <p style={{ margin: 0, fontSize: 14, color: '#888' }}>Child Parts Linkedto MPNs with Auto Costing Data</p>
                </div>
                {hasPermission('library.child:create') && (
                    <Button onClick={() => setShowAddChildPart(true)} type="primary" icon={<PlusOutlined />}>
                        Add Child Part
                    </Button>
                )}
            </div>

            <GlobalTableActions
                showSearch={true}
                onSearch={(value) => {
                    setSearch(value);
                    handleSearch(value)
                }}
                showImport={hasPermission('library.child:import')}
                onImport={(file) => handleMpnImport(file)}
                onImportLoader={importExcel}
                showExport={hasPermission('library.child:export')}
                onExport={() => handleExport()}
                showFilter={true}
                onFilter={() => setFilterVisible(true)}
            />

            <Table
                columns={columns}
                dataSource={data}
                rowKey="key"
                pagination={{
                    current: page,
                    pageSize: limit,
                    total: pagination?.total || 0,
                    onChange: (p, l) => {
                        setPage(p);
                        setLimit(l);
                        fetchChildParts({ page: p, limit: l, search });
                    }
                }}
            />

            <AddChildPartModal
                visible={showAddChildPart}

                onCancel={() => {
                    setShowAddChildPart(false);
                    setEditingRecord(null);
                }}
                formData={formData}
                onSubmit={handleSubmit}
                mpnOptions={mpnOptions}
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

export default ChildPartLibrary;

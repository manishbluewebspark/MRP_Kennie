import React, { useEffect, useState } from "react";
import { Table, Button, Space, Tag, message, Card, Modal, Drawer, Divider, Tooltip, Tabs, Col, Radio } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined, ExclamationCircleOutlined, CloseOutlined, PlayCircleOutlined, PlayCircleFilled, ClockCircleOutlined, ExperimentOutlined, ToolOutlined, HourglassOutlined, CheckCircleOutlined, PauseCircleOutlined, LoadingOutlined, BarcodeOutlined, TagsOutlined, DeleteFilled } from "@ant-design/icons";
import { hasPermission } from "utils/auth";
import ActionButtons from "components/ActionButtons";
import GlobalTableActions from "components/GlobalTableActions";
import { useNavigate } from "react-router-dom";
import CreateWorkOrderModal from "./CreateWorkOrderModal";
import WorkOrderService from "services/WorkOrderService";
import useDebounce from "utils/debouce";
import WorkOrderSettingsModal from "./ProductSettingsModal";
import ImportWorkOrderModal from "./ImportWorkOrderModal";
import { useDispatch, useSelector } from "react-redux";
import { fetchSystemSettings } from "store/slices/systemSettingsSlice";
import dayjs from 'dayjs'
import ProjectService from "services/ProjectService";
import MoveToProductionModal from "./MoveToProductionModal";
import SystemSettingsService from "services/SystemSettingsService";
import WorkOrderExportModal from "./WorkOrderExportModal";
import GlobalFilterModal from "components/GlobalFilterModal";
import { fetchCustomers } from "store/slices/customerSlice";
import ConfirmDeleteModal from "components/ConfirmDeleteModal";
const { confirm } = Modal;

const fmt = (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "-");
const safe = (v) => (v === 0 ? 0 : v || "-");


export const STATUS_META = {
    "Picking Started": {
        color: "blue",
        icon: <PlayCircleOutlined />,
    },
    "Picking Completed": {
        color: "green",
        icon: <CheckCircleOutlined />,
    },
    "Assembly Started": {
        color: "purple",
        icon: <ToolOutlined />,
    },
    "Assembly Completed": {
        color: "green",
        icon: <CheckCircleOutlined />,
    },
    "Cable Harness Started": {
        color: "purple",
        icon: <ToolOutlined />,
    },
    "Cable Harness Completed": {
        color: "green",
        icon: <CheckCircleOutlined />,
    },
    "Labelling Started": {
        color: "orange",
        icon: <TagsOutlined />,
    },
    "Labelling Completed": {
        color: "green",
        icon: <CheckCircleOutlined />,
    },
    "QC Started": {
        color: "cyan",
        icon: <BarcodeOutlined />,
    },
    "Quality Check Completed": {
        color: "green",
        icon: <CheckCircleOutlined />,
    },
    Completed: {
        color: "green",
        icon: <CheckCircleOutlined />,
    },
    "No Progress Yet": {
        color: "default",
        icon: <PlayCircleOutlined />,
    },
    "Picking In Progress": {
        color: "blue",
        icon: <PlayCircleOutlined />,
    }
};

// Badge render helper
export const renderBadge = (status) => {
    if (!status) return <Tag>No Status</Tag>;

    const lower = status?.toLowerCase();
    let color = "default";

    // 🔄 IN PROGRESS STATES
    if (lower === "picking in progress") {
        color = "processing"; // 🔵 animated blue (best for progress)
    } else if (lower === "assembly in progress") {
        color = "purple";
    } else if (lower === "cable harness in progress") {
        color = "purple";
    } else if (lower === "labelling in progress") {
        color = "orange";
    } else if (lower === "quality check in progress") {
        color = "cyan";
    } else if (lower === "picking & assembly in progress") {
        color = "geekblue";
    }

    // ✅ DONE STATES
    else if (lower === "assembly done") {
        color = "purple";
    } else if (lower === "cable harness done") {
        color = "purple";
    } else if (lower === "labelling done") {
        color = "orange";
    } else if (lower === "quality check done") {
        color = "cyan";
    } else if (lower === "picking & assembly done") {
        color = "geekblue";
    } else if (lower === "picking done") {
        color = "blue";
    } else if (lower === "completed") {
        color = "green";
    }

    return (
        <Tag
            color={color}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 500,
                width: 200,
            }}
        >
            <CheckCircleOutlined />
            {status}
        </Tag>
    );
};

const renderQyoteTypeBadge = (type) => {
    const typeConfig = {
        cable_harness: { color: "purple", text: "Cable Harness" },
        box_build: { color: "cyan", text: "Box Build" },
        other: { color: "default", text: "Other" },
    };

    const cfg = typeConfig[type] || { color: "default", text: type };
    return <Tag color={cfg.color}>{cfg.text}</Tag>;
};



const DeliveryOrderPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch()
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingWorkOrder, setEditingWorkOrder] = useState(null);
    const [totalCount, setTotalCount] = useState(0);
    const [isProductSettingmodalVisible, setIsProductSettingmodalVisible] = useState(false);
    const [importWorkOrderModalVisible, setImportWorkOrderModalVisible] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [filterVisible, setFilterVisible] = useState(false)


    const [posOptions, setPosOptions] = useState([]);
    const [projectOptions, setProjectOptions] = useState([]);
    const [drawingOptions, setDrawingOptions] = useState([]);
    const [workOrderOptions, setWorkOrderOptions] = useState([]);
    const [filters, setFilters] = useState({});
    const [activeTab, setActiveTab] = useState("NON_PRODUCTION");


    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deleteMode, setDeleteMode] = useState("single");
    const [deleteId, setDeleteId] = useState(null);

    const { workOrderSettings } = useSelector(
        (state) => state.systemSettings
    );

    const { list } = useSelector(
        (state) => state.customers
    );


    const [selectedRecord, setSelectedRecord] = useState(null);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);

    const [isProductionvisible, setisProductionvisible] = useState(false);
    const [projectData, setProjectData] = useState([])
    const [moveToProdId, setMoveToProdId] = useState(null)

    const [moving, setMoving] = useState(false);
    const [lastWorkOrderNo, setLastOrderNumber] = useState('')

    const statusOptions = [
        { label: "Completed", value: "Completed" },
        { label: "Picking In Progress", value: "Picking In Progress" }
    ]
    const handleMoveToProduction = (record) => {
        setSelectedRecord(record);
        setisProductionvisible(true);
        setMoveToProdId(record?._id)
    }

       const rowSelection = {
        selectedRowKeys,
        preserveSelectedRowKeys: true,
        onChange: (keys) => setSelectedRowKeys(keys),
    };

    const handleDeleteSelected = () => {
        if (!selectedRowKeys.length) {
            message.warning("Please select at least one work order");
            return;
        }

        setDeleteMode("bulk");
        setDeleteModalVisible(true);
    };

    const handleConfirmDelete = async () => {
        try {
            setLoading(true);

            message.loading({
                content: "Deleting...",
                key: "workOrderDelete",
            });

            if (deleteMode === "bulk") {

                // ✅ BULK DELETE API
                await WorkOrderService.deleteBulkWorkOrders({
                    ids: selectedRowKeys,
                });

                message.success({
                    content: "Selected work orders deleted",
                    key: "workOrderDelete",
                });

                setSelectedRowKeys([]);

            } else {

                // ✅ SINGLE DELETE API
                await WorkOrderService.deleteWorkOrder(deleteId);

                message.success({
                    content: "Work order deleted",
                    key: "workOrderDelete",
                });
            }

            setDeleteModalVisible(false);
            setDeleteId(null);

            fetchWorkOrders();

        } catch (err) {
            console.error(err);

            message.error({
                content: "Failed to delete work orders",
                key: "workOrderDelete",
            });

        } finally {
            setLoading(false);
        }
    };

    const filterConfig = [
        {
            type: "select",
            name: "projectNo",
            label: "Project No",
            placeholder: "Select Project No",
            options: projectOptions.map((cat) => ({
                label: cat.label,
                value: cat.value,
            })),
        },
        {
            type: "select",
            name: "posNo",
            label: "POS No",
            placeholder: "Select POS No",
            options: posOptions.map((cat) => ({
                label: cat.label,
                value: cat.value,
            })),
        },
        {
            type: "select",
            name: "drawingNo",
            label: "Drawing No",
            placeholder: "Select Drawing No",
            options: drawingOptions.map((cat) => ({
                label: cat.label,
                value: cat.value,
            })),
        }

    ];


    const columns = [
        {
            title: "Drawing No",
            dataIndex: "drawingNo",
            key: "drawingNo",
            sorter: true,
            render: (text) => <strong style={{ fontSize: '14px' }}>{text}</strong>
        },
        {
            title: "Work Order No",
            dataIndex: "workOrderNo",
            key: "workOrderNo",
            sorter: true,
            render: (text) => <span style={{ fontSize: '14px' }}>{text}</span>
        },
        {
            title: "Project No",
            dataIndex: "projectNo",
            key: "projectNo",
            sorter: true,
            render: (text) => <span style={{ fontSize: '14px' }}>{text}</span>
        },
        // {
        //     title: "Customer",
        //     dataIndex: ["project", "customer", "companyName"],
        //     key: "customer",
        //     render: (text) => <span style={{ fontSize: '13px' }}>{text || 'N/A'}</span>
        // },
        // {
        //     title: "Project No",
        //     dataIndex: "projectNo",
        //     key: "projectNo",
        //     render: (text) => <Tag color="blue">{text}</Tag>
        // },
        // {
        //     title: "Drawing No",
        //     dataIndex: ["drawing", "drawingNumber"],
        //     key: "drawingNo",
        //     render: (text) => <span style={{ fontSize: '13px', color: '#666' }}>{text || 'N/A'}</span>
        // },
        {
            title: "PO No",
            dataIndex: "poNumber",
            key: "poNumber",
            sorter: true,
            render: (text) => <span style={{ fontSize: '13px', color: '#666' }}>{text}</span>
        },
        {
            title: "POS No",
            dataIndex: "posNo",
            key: "posNo",
            sorter: true,
            render: (text) => <span style={{ fontSize: '13px', color: '#666' }}>{text}</span>
        },

        // {
        //     title: "POS Number",
        //     dataIndex: "posNumber",
        //     key: "posNumber",
        //     render: (text) => <span style={{ fontSize: '13px', color: '#666' }}>{text}</span>
        // },
        // {
        //     title: "Qty",
        //     dataIndex: "qty",
        //     key: "qty",
        //     render: (text) => <span style={{ fontSize: '13px', color: '#666' }}>{text}</span>
        // },
        {
            title: "Need Date",
            dataIndex: "needDate",
            key: "needDate",
            sorter: true,
            render: (text) => <span style={{ fontSize: '12px', color: '#888' }}>
                {text ? new Date(text).toLocaleDateString('en-GB') : 'N/A'}
            </span>
        },
        {
            title: "Commit Date",
            dataIndex: "commitDate",
            key: "commitDate",
            sorter: true,
            render: (text) => (
                <Tag
                    style={{
                        borderRadius: '12px',
                        background: '#16A34A',
                        color: 'white',
                        border: 'none',
                        padding: '2px 10px'
                    }}
                >
                    {text ? new Date(text).toLocaleDateString('en-GB') : 'N/A'}
                </Tag>
            )
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            sorter: true,
            render: (status, record) => (
                <Space>
                    {renderBadge(status)}

                    {/* Show Move to Production Icon Only When No Progress */}
                    {status === "No Progress Yet" && (
                        record?.isCostingComplete ? (
                            <PlayCircleFilled
                                onClick={() => handleMoveToProduction(record)}
                                style={{ color: "#473bb1ff", cursor: "pointer", fontSize: 18 }}
                            />
                        ) : (
                            <span
                                title="Costing incomplete"
                                style={{
                                    display: "inline-block",
                                    width: 10,
                                    height: 10,
                                    backgroundColor: "red",
                                    borderRadius: "50%",
                                }}
                            />
                        )
                    )}
                </Space>
            )
        },
        {
            title: "Project Type",
            dataIndex: "projectType",
            key: "projectType",
            sorter: true,
            render: renderQyoteTypeBadge
        },
        {
            title: (
        <Space>
            Actions

            {hasPermission("work_order.work_order_managment:create_edit_delete") && (
                <Button
                    danger
                    size="small"
                    icon={<DeleteFilled style={{ color: "#FF4D4F" }} />}
                    onClick={handleDeleteSelected}
                />
            )}
        </Space>
    ),
            key: "actions",
            width: 150,
            render: (_, record) => (
                <ActionButtons
                    onEdit={() => handleEdit(record)}
                    onDelete={() => handleDelete(record._id)}
                    showInfo={hasPermission("work_order.work_order_managment:view")}
                    showEdit={hasPermission("work_order.work_order_managment:create_edit_delete")}
                    showDelete={hasPermission("work_order.work_order_managment:create_edit_delete")}
                    showDeleteConfirm={true}
                    onInfo={() => handleInfo(record)}
                />
            )
        }
    ];

 

    const handleEdit = (record) => {
        setEditingWorkOrder(record);
        setIsModalVisible(true);
    };

    const handleInfo = (record) => {
        setSelectedRecord(record);
        setIsDrawerVisible(true);
    };

    // 🔴 Close drawer
    const handleCloseDrawer = () => {
        setIsDrawerVisible(false);
        setSelectedRecord(null);
    };

    const normalizeProjectsResponse = (res) => {
        if (!res) return [];
        // axios response usually in res.data
        const body = res.data ?? res;
        // if API returns { success:true, data: [...] }
        if (body?.success !== undefined) return body.data ?? [];
        // if API returns { data: [...], pagination: {...} }
        if (Array.isArray(body?.data)) return body.data;
        // if API returns array directly
        if (Array.isArray(body)) return body;
        // fallback
        return [];
    };

    const handleDelete = (id) => {
        confirm({
            title: 'Are you sure you want to delete this work order?',
            icon: <ExclamationCircleOutlined />,
            content: 'This action cannot be undone.',
            okText: 'Yes, Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk() {
                deleteWorkOrder(id);
            }
        });
    };

    const fetchProjects = async (params = {}) => {
        try {
            const res = await ProjectService.getAllProjects(params);
            const projects = normalizeProjectsResponse(res);
            setProjectData(projects);
        } catch (err) {
            console.error("Error fetching projects:", err);
            message.error("Failed to fetch projects");
        } finally {
        }
    };

    const deleteWorkOrder = async (id) => {
        try {
            const response = await WorkOrderService.deleteWorkOrder(id);
            if (response.success) {
                message.success('Work order deleted successfully');
                fetchWorkOrders();
            } else {
                message.error(response.message || 'Failed to delete work order');
            }
        } catch (err) {
            console.error("Error deleting work order:", err);
            message.error(err.message || 'Failed to delete work order');
        }
    };

    const fetchWorkOrders = async (params = {}) => {
        setLoading(true);
        try {
            const {
                page = 1,
                limit = 10,
                search = "",
                filters: f = filters,
                sortBy = "createdAt",
                sortOrder = "desc",
                activeTab: tab = activeTab, // ✅ fallback fix
            } = params;

            const response = await WorkOrderService.getAllWorkOrders({
                page,
                limit,
                search,
                sortBy,
                sortOrder,
                projectId: f?.projectNo || undefined,
                posNo: f?.posNo || undefined,
                drawingId: f?.drawingNo || undefined,
                activeTab: tab // ✅ ALWAYS correct tab
            });

            if (response.success) {
                const formattedData = response.data.map(item => ({
                    ...item,
                    key: item._id
                }));

                setData(formattedData);
                setLastOrderNumber(response?.lastWorkOrderNo);
                setTotalCount(response.pagination?.totalItems || 0);
            } else {
                message.error(response.message || 'Failed to fetch work orders');
            }
        } catch (err) {
            console.error("Error fetching work orders:", err);
            message.error('Failed to fetch work orders');
        } finally {
            setLoading(false);
        }
    };

    // const fetchWorkOrders = async (params = {}) => {
    //     setLoading(true);
    //     try {
    //         const { page = 1, limit = 10, search = "", filters: f = filters, sortBy = "createdAt",
    //             sortOrder = "desc", activeTab } = params;
    //         const response = await WorkOrderService.getAllWorkOrders({
    //             page,
    //             limit,
    //             search,
    //             sortBy,
    //             sortOrder,
    //             projectId: f?.projectNo || undefined,
    //             posNo: f?.posNo || undefined,
    //             drawingId: f?.drawingNo || undefined,
    //             activeTab
    //         });

    //         if (response.success) {
    //             const formattedData = response.data.map(item => ({
    //                 ...item,
    //                 key: item._id
    //             }));
    //             setData(formattedData);
    //             setLastOrderNumber(response?.lastWorkOrderNo)
    //             setTotalCount(response.totalCount || response.data.length);
    //         } else {
    //             message.error(response.message || 'Failed to fetch work orders');
    //         }
    //     } catch (err) {
    //         console.error("Error fetching work orders:", err);
    //         message.error('Failed to fetch work orders');
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    const handleExport = async (filter) => {
        console.log("-------filter", filter);

        try {
            const resp = await WorkOrderService.exportWorkOrders({
                customerMode: filter.customerMode,
                customerId: filter.customerId,
                filterMode: filter.filterMode,
                projectIds: filter.projectNames, // array
                posNos: filter.posNos,
                drawingIds: filter.drawingNos,
                workOrderNos: filter.workOrderNos,
                status: filter.status
            });

            let arrayBuffer;
            let mime =
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

            if (resp?.data instanceof ArrayBuffer) {
                arrayBuffer = resp.data;
                mime = resp?.headers?.["content-type"] || mime;
            } else {
                throw new Error("Invalid export response");
            }

            const blob = new Blob([arrayBuffer], { type: mime });
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = "work_orders_export.xlsx";
            document.body.appendChild(a);
            a.click();
            a.remove();

            window.URL.revokeObjectURL(url);
            message.success("Work orders exported successfully");
        } catch (err) {
            console.error("Export error:", err);
            message.error("Failed to export work orders");
        }
    };



    const handleImport = async (file) => {
        try {
            const response = await WorkOrderService.importWorkOrders(file);
            if (response.success) {
                message.success("Work orders imported successfully");
                fetchWorkOrders();
            } else {
                message.error(response.message || "Failed to import work orders");
            }
        } catch (err) {
            console.error("Error importing work orders:", err);
            message.error("Failed to import work orders");
        }
    };

    // useEffect(() => {
    //     fetchWorkOrders({ page, limit, search, activeTab });
    // }, [page, limit, activeTab]);

    useEffect(() => {
        loadData();
    }, [page, limit, activeTab, search]);

    const loadData = async () => {
        await fetchWorkOrders({
            page,
            limit,
            search,
            filters,
            activeTab
        });
    };



    useEffect(() => {
        dispatch(fetchSystemSettings())
        dispatch(fetchCustomers())
    }, [dispatch])


    const fetchFilterData = async () => {
        try {
            const res = await WorkOrderService.getFilterData();

            if (res?.status) {
                const data = res?.data || {};

                setPosOptions(data.poNumbers || []);
                setProjectOptions(data.projectNos || []);
                setDrawingOptions(data.drawings || []);
                setWorkOrderOptions(data.workOrders || [])
            } else {
                message.error(res?.message || "Failed to load filter data");
            }
        } catch (error) {
            console.error("fetchFilterData error:", error);
            message.error("Error loading filter data");
        } finally {
            // setLoadingFilters(false);
        }
    };


    useEffect(() => {
        fetchFilterData()
        fetchProjects()
    }, [])

    const handleSearch = useDebounce((value) => {
        setPage(1);
        setSearch(value);
        fetchWorkOrders({ page: 1, limit, search: value });
    }, 500);

    const items = selectedRecord?.items?.length
        ? selectedRecord.items
        : [
            {
                drawingNo: selectedRecord?.drawingNo,
                posNo: selectedRecord?.posNo,
                quantity: selectedRecord?.actualQty,
                prodQty: selectedRecord?.prodQty,
                status: selectedRecord?.itemStatus,
                description: selectedRecord?.description,
                prodType: selectedRecord?.prodType,
            },
        ];

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingWorkOrder(null);
    };
    const handleCreate = async (workOrderData) => {
        try {
            let response;
            if (editingWorkOrder && editingWorkOrder._id) {
                response = await WorkOrderService.updateWorkOrder(editingWorkOrder._id, workOrderData);
            } else {
                response = await WorkOrderService.createWorkOrder(workOrderData);
            }

            if (response && response.success) {
                message.success(editingWorkOrder ? "Work order updated successfully!" : "Work order created successfully!");
                setIsModalVisible(false);
                setEditingWorkOrder(null);
                await fetchWorkOrders();
            } else {
                message.error(response?.message || "Operation failed");
            }
        } catch (error) {
            console.error("Error saving work order:", error);
            message.error(error?.message || "Failed to save work order");
        }
    };



    const handleTableChange = (pagination, filters, sorter) => {
        setPage(pagination.current);
        setLimit(pagination.pageSize);
    };

    const handleSave = async (settings) => {

        const payload = {
            produtionSettings: settings
        }
        const res = await SystemSettingsService.addOrUpdateSystemSettings(payload);
        // console.log('------produtionSettings', res)
        if (res.data?.success) {
            dispatch(fetchSystemSettings())
        }
        setIsProductSettingmodalVisible(false);
    }

    const handleCloseImportWorkOrderModal = async (data) => {
        setImportWorkOrderModalVisible(false);
    }


    const handleQuoteTypeSelect = async (data) => {
        try {
            // console.log("Quote type selected:", data);
            const { type, file } = data;

            if (!file) {
                return message.warning("Please select a file to import.");
            }

            const formData = new FormData();
            formData.append("file", file);
            formData.append("quoteType", type); // send quote type too

            const response = await WorkOrderService.importWorkOrders(formData);

            if (response.success) {
                fetchWorkOrders()
                message.success(response.message || "Work orders imported successfully");
            } else {
                message.error(response.message || "Import failed");
            }
        } catch (err) {
            console.error("Import error:", err);
            message.error("Error while importing work orders");
        }
    };

    const handleConfirm = async () => {
        if (!moveToProdId) return;
        setMoving(true);

        try {
            await WorkOrderService.moveToProduction(moveToProdId, {}); // body optional
            message.success("Moved to production");
            setisProductionvisible(false);
            // refresh list
            fetchWorkOrders();
        } catch (e) {
            message.error(e?.response?.data?.message || e.message || "Failed to move");
        } finally {
            setMoving(false);

        }
    };

    const handleFilterSubmit = async (filterData) => {
        // console.log("---------filterData", filterData);

        // ✅ save filters in state
        setFilters(filterData);
        setFilterVisible(false)
        // ✅ reset to first page & fetch
        fetchWorkOrders({
            page: 1,
            limit: limit,
            filters: filterData,
        });
    };

    return (
        <div>
            {/* Header Section */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                width: '100%'
            }}>


                <div>
                    <h2 style={{ margin: 0 }}>Work Order Management</h2>
                    <p style={{ margin: 0, fontSize: 14, color: '#888' }}>
                        All Work Order List
                    </p>
                </div>

                <div>

                    <Col>
                        {hasPermission("work_order.work_order_managment:create_edit_delete") && (
                            <Button
                                onClick={() => setIsModalVisible(true)}
                                type="primary"
                                icon={<PlusOutlined />}
                                className="mr-3"
                            >
                                Create Work Order
                            </Button>
                        )}
                        <Radio.Group
                            value={activeTab}
                            optionType="button"
                            buttonStyle="solid"
                            onChange={(e) => {
                                const tab = e.target.value;
                                setActiveTab(tab);
                                setPage(1);
                            }}
                        >
                            <Radio.Button value="PRODUCTION">
                                Production List
                            </Radio.Button>

                            <Radio.Button value="NON_PRODUCTION">
                                Not In Production
                            </Radio.Button>
                        </Radio.Group>
                    </Col>



                </div>


            </div>

            {/* Global Table Actions */}
            <GlobalTableActions
                showSearch={true}
                onSearch={(value) => {
                    setSearch(value);
                    handleSearch(value);
                }}
                showImport={false}
                // importText="Import work order"
                exportText="Export"
                // onImport={(file) => handleImport(file)}
                showExport={hasPermission("work_order.work_order_managment:export")}
                onExport={() => { setExportModalOpen(true) }}
                // onExport={() => handleExport()}
                showFilter={true}
                onFilter={() => setFilterVisible(true)}
                showProductSetting={hasPermission("work_order.work_order_managment:setting")}
                onProductSetting={() => { setIsProductSettingmodalVisible(true) }}
                showMPNTracker={hasPermission("work_order.work_order_managment:mpn_tracker")}
                onMPNTracker={() => {
                    navigate('/app/work-order/mpn-tracker')
                }}
                showImportWorkOrder={hasPermission("work_order.work_order_managment:import")}
                onImportWorkOrder={() => { setImportWorkOrderModalVisible(true) }}
            />

            {/* Table */}
            <Card>
                <Table
                columns={columns}
                dataSource={data}
                loading={loading}
                rowSelection={rowSelection}
                pagination={{
                    current: page,
                    pageSize: limit,
                    total: totalCount,
                }}
                onChange={(pagination, filters, sorter) => {
                    const sortField = sorter?.field;

                    const sortOrder =
                        sorter?.order === "ascend"
                            ? "asc"
                            : sorter?.order === "descend"
                                ? "desc"
                                : undefined;

                    setPage(pagination.current);
                    setLimit(pagination.pageSize);

                    fetchWorkOrders({
                        page: pagination.current,
                        limit: pagination.pageSize,
                        search,
                        sortBy: sortField,
                        sortOrder,
                        activeTab,
                    });
                }}
            />
            </Card>

            <CreateWorkOrderModal
                visible={isModalVisible}
                onCancel={handleCancel}
                onCreate={handleCreate}
                editingWorkOrder={editingWorkOrder}
                workOrderSettings={workOrderSettings?.workOrderSettings}
                projectData={projectData}
                lastWorkOrderNo={lastWorkOrderNo}
            />

            <MoveToProductionModal
                visible={isProductionvisible}
                onCancel={() => setisProductionvisible(false)}
                onConfirm={handleConfirm}
                projectName={selectedRecord?.workOrderNo}
                loading={moving}
            />

            <GlobalFilterModal
                visible={filterVisible}
                onClose={() => setFilterVisible(false)}
                onSubmit={handleFilterSubmit}
                filters={filterConfig}
                title="Filters"
            />

            <WorkOrderSettingsModal
                visible={isProductSettingmodalVisible}
                onCancel={() => setIsProductSettingmodalVisible(false)}
                onSave={handleSave}
                produtionSettings={workOrderSettings?.produtionSettings}
            />

            <ImportWorkOrderModal
                visible={importWorkOrderModalVisible}
                onClose={handleCloseImportWorkOrderModal}
                onQuoteTypeSelect={handleQuoteTypeSelect}
            />

            <WorkOrderExportModal
                open={exportModalOpen}
                onCancel={() => setExportModalOpen(false)}
                onExport={(filters) => handleExport(filters)}
                poOptions={posOptions}
                projectOptions={projectOptions}
                workOrderOptions={workOrderOptions}
                customerOptions={list}
                statusOptions={statusOptions}
            />


            <Drawer
                width={600}
                placement="right"
                onClose={handleCloseDrawer}
                open={isDrawerVisible}
                closable={false}
                bodyStyle={{ padding: 0, backgroundColor: "#f9f9f9" }}
            >
                {selectedRecord && (
                    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                        {/* Header */}
                        <div
                            style={{
                                padding: "16px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            <h4 style={{ fontSize: 16, fontWeight: 600, color: "#111", margin: 0 }}>
                                {safe(selectedRecord?.workOrderNo)} – Work Order Details
                            </h4>
                        </div>

                        <Divider style={{ margin: "0 0 12px 0" }} />

                        <div style={{ padding: "0 16px 16px", overflowY: "auto", flex: 1 }}>
                            {/* SINGLE BOX (Earlier items.map → removed) */}
                            <div
                                style={{
                                    background: "#fff",
                                    padding: "16px",
                                    borderRadius: 8,
                                    border: "1px solid #e5e7eb",
                                    marginBottom: 16,
                                }}
                            >
                                <h5 style={{ fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 12 }}>
                                    Drawing No - {safe(selectedRecord?.drawingNo)}
                                </h5>

                                <Divider style={{ margin: "0 0 12px 0" }} />

                                {[
                                    {
                                        label1: "Drawing No.",
                                        value1: safe(selectedRecord?.drawingNo),
                                        label2: "PO No.",
                                        value2: safe(selectedRecord?.poNumber),
                                        label3: "POS No.",
                                        value3: safe(selectedRecord?.posNo),
                                    },
                                    {
                                        label1: "Actual Qty",
                                        value1: safe(selectedRecord?.quantity),
                                        label2: "Prod Qty",
                                        value2: safe(selectedRecord?.quantity),
                                        label3: "Commit Date",
                                        value3: fmt(selectedRecord?.commitDate),
                                    },
                                    {
                                        label1: "Need Date",
                                        value1: fmt(selectedRecord?.needDate),
                                        label2: "Work Order No.",
                                        value2: safe(selectedRecord?.workOrderNo),
                                        label3: "Prod Type (C/B/O)",
                                        value3: safe(selectedRecord?.projectType),
                                    },
                                    {
                                        label1: "Status",
                                        value1: safe(selectedRecord?.status),
                                        label2: "Remark",
                                        value2: safe(selectedRecord?.remarks),
                                        label3: "UOM",
                                        value3: safe(selectedRecord?.uom),
                                    },
                                ].map((row, i) => (
                                    <div key={i} style={{ marginBottom: 8 }}>
                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: "repeat(3, 1fr)",
                                                columnGap: 12,
                                                fontSize: 12,
                                                color: "#6b7280",
                                                marginBottom: 2,
                                            }}
                                        >
                                            <div>{row.label1}</div>
                                            <div>{row.label2}</div>
                                            <div>{row.label3}</div>
                                        </div>

                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: "repeat(3, 1fr)",
                                                columnGap: 12,
                                                fontWeight: 600,
                                                color: "#111827",
                                            }}
                                        >
                                            <div>{row.value1}</div>
                                            <div>{row.value2}</div>
                                            <div>{row.value3}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </Drawer>



            <ConfirmDeleteModal
                open={deleteModalVisible}
                loading={loading}
                mode={deleteMode}
                count={selectedRowKeys.length}
                onCancel={() => !loading && setDeleteModalVisible(false)}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
};

export default DeliveryOrderPage;
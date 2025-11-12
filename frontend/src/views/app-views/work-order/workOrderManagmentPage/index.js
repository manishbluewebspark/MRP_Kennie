import React, { useEffect, useState } from "react";
import { Table, Button, Space, Tag, message, Card, Modal, Drawer, Divider, Tooltip } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined, ExclamationCircleOutlined, CloseOutlined, PlayCircleOutlined, PlayCircleFilled } from "@ant-design/icons";
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
const { confirm } = Modal;

const fmt = (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "-");
const safe = (v) => (v === 0 ? 0 : v || "-");

// Badge render helper
const renderBadge = (text, type) => {
    let color;
    switch (type) {
        case "status":
            if (text === 'on_hold') color = 'orange';
            else if (text === 'in_progress') color = 'blue';
            else if (text === 'completed') color = 'green';
            else if (text === 'cancelled') color = 'red';
            else color = 'gray';
            break;
        case "priority":
            color = text === "High" ? "red" : text === "Medium" ? "orange" : "green";
            break;
        default:
            color = "gray";
    }
    return <Tag color={color}>{text?.replace('_', ' ')?.toUpperCase()}</Tag>;
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
    const { workOrderSettings } = useSelector(
        (state) => state.systemSettings
    );
  
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const { projects } = useSelector(
        (state) => state
    );
    const [isProductionvisible, setisProductionvisible] = useState(false);
    const [projectData, setProjectData] = useState([])
    const [moveToProdId, setMoveToProdId] = useState(null)
    console.log('---workOrderSettings', workOrderSettings)
    const [moving, setMoving] = useState(false);


    const handleMoveToProduction = (id) => {
        setisProductionvisible(true);
        setMoveToProdId(id)
    }


    const columns = [
        {
            title: "Work Order No",
            dataIndex: "workOrderNo",
            key: "workOrderNo",
            sorter: (a, b) => a.workOrderNo.localeCompare(b.workOrderNo),
            render: (text) => <strong style={{ fontSize: '14px' }}>{text}</strong>
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
        {
            title: "Drawing No",
            dataIndex: ["drawing", "drawingNumber"],
            key: "drawingNo",
            render: (text) => <span style={{ fontSize: '13px', color: '#666' }}>{text || 'N/A'}</span>
        },
        {
            title: "PO Number",
            dataIndex: "poNumber",
            key: "poNumber",
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
            render: (text) => <span style={{ fontSize: '12px', color: '#888' }}>
                {text ? new Date(text).toLocaleDateString('en-GB') : 'N/A'}
            </span>
        },
        {
            title: "Commit Date",
            dataIndex: "commitDate",
            key: "commitDate",
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
            render: (text, record) => (
                <Space>
                    {renderBadge(text, "status")}
                    {record?.status === "on_hold" && (<PlayCircleFilled onClick={() => handleMoveToProduction(record?._id)} style={{ color: "#473bb1ff" }} />)}
                </Space>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            width: 150,
            render: (_, record) => (
                <ActionButtons
                    onEdit={() => handleEdit(record)}
                    onDelete={() => handleDelete(record._id)}
                    showInfo={true}
                    showEdit={true}
                    showDelete={true}
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
            const { page = 1, limit = 10, search = "" } = params;
            const response = await WorkOrderService.getAllWorkOrders({
                page,
                limit,
                search,
                sortBy: 'createdAt',
                sortOrder: 'desc'
            });

            if (response.success) {
                const formattedData = response.data.map(item => ({
                    ...item,
                    key: item._id
                }));
                setData(formattedData);
                setTotalCount(response.totalCount || response.data.length);
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

    const handleExport = async () => {
        try {
            const resp = await WorkOrderService.exportWorkOrders();

            let arrayBuffer;
            let mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

            // Axios instance returns { data: ArrayBuffer, headers: {...} }
            if (resp?.data instanceof ArrayBuffer) {
                arrayBuffer = resp.data;
                mime = resp?.headers?.['content-type'] || mime;

                // Some Axios wrappers return ArrayBuffer directly
            } else if (resp instanceof ArrayBuffer) {
                arrayBuffer = resp;

                // Native fetch path we returned { blob, contentType }
            } else if (resp?.blob instanceof Blob) {
                mime = resp.contentType || mime;
                arrayBuffer = await resp.blob.arrayBuffer();

            } else {
                throw new Error("Unknown response shape from exportWorkOrders()");
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
            console.error("Error exporting work orders:", err);
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

    useEffect(() => {
        fetchWorkOrders({ page, limit, search });
    }, [page, limit]);



    useEffect(() => {
        dispatch(fetchSystemSettings())
        fetchProjects()
    }, [dispatch])

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
        console.log('------produtionSettings',res)
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
            console.log("Quote type selected:", data);
            const { type, file } = data;

            if (!file) {
                return message.warning("Please select a file to import.");
            }

            const formData = new FormData();
            formData.append("file", file);
            formData.append("quoteType", type); // send quote type too

            const response = await WorkOrderService.importWorkOrders(formData);

            if (response.success) {
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

                <Button
                    onClick={() => setIsModalVisible(true)}
                    type="primary"
                    icon={<PlusOutlined />}
                >
                    Create Work Order
                </Button>
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
                showExport={true}
                onExport={() => handleExport()}
                showFilter={false}
                onFilter={() => console.log("Filter clicked")}
                showProductSetting={true}
                onProductSetting={() => { setIsProductSettingmodalVisible(true) }}
                showMPNTracker={true}
                onMPNTracker={() => {
                    navigate('/app/work-order/mpn-tracker')
                }}
                showImportWorkOrder={true}
                onImportWorkOrder={() => { setImportWorkOrderModalVisible(true) }}
            />

            {/* Table */}
            <Card>
                <Table
                    columns={columns}
                    dataSource={data}
                    loading={loading}
                    pagination={{
                        current: page,
                        pageSize: limit,
                        total: totalCount,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                            `${range[0]}-${range[1]} of ${total} items`
                    }}
                    scroll={{ x: 1000 }}
                    onChange={handleTableChange}
                />
            </Card>

            <CreateWorkOrderModal
                visible={isModalVisible}
                onCancel={handleCancel}
                onCreate={handleCreate}
                editingWorkOrder={editingWorkOrder}
                workOrderSettings={workOrderSettings?.workOrderSettings}
                projectData={projectData}
            />

            <MoveToProductionModal
                visible={isProductionvisible}
                onCancel={() => setisProductionvisible(false)}
                onConfirm={handleConfirm}
                projectName="Project Alpha"
                loading={moving}
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
                                justifyContent: "space-between", // 👈 pushes items left & right
                                alignItems: "center", // 👈 vertically centers them
                            }}
                        >
                            <h4 style={{ fontSize: 16, fontWeight: 600, color: "#111", margin: 0 }}>
                                {safe(selectedRecord?.assignedTo || selectedRecord?.customerName)} – Web Design
                            </h4>

                            <Tag
                                color="green"
                                style={{
                                    marginTop: 0,
                                    fontSize: 13,
                                    padding: "4px 10px",
                                    borderRadius: 20,
                                }}
                            >
                                Cable Harness Done
                            </Tag>
                        </div>


                        <Divider style={{ margin: "0 0 12px 0" }} />

                        <div style={{ padding: "0 16px 16px", overflowY: "auto", flex: 1 }}>
                            {items.map((it, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        background: "#fff",
                                        padding: "16px",
                                        borderRadius: 8,
                                        //   boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                                        border: "1px solid #e5e7eb",
                                        marginBottom: 16,
                                    }}
                                >
                                    <h5 style={{ fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 12 }}>
                                        Project No - {safe(selectedRecord?.projectNo)}
                                    </h5>
                                    <Divider style={{ margin: "0 0 12px 0" }} />
                                    {/* Table Section */}
                                    {[
                                        {
                                            label1: "Drawing No.",
                                            value1: safe(it?.drawingNo),
                                            label2: "PO No.",
                                            value2: safe(selectedRecord?.poNumber),
                                            label3: "POS No.",
                                            value3: safe(it?.posNo),
                                        },
                                        {
                                            label1: "Actual Qty",
                                            value1: safe(it?.quantity),
                                            label2: "Prod Qty",
                                            value2: safe(it?.prodQty),
                                            label3: "Commit Date",
                                            value3: fmt(selectedRecord?.commitDate),
                                        },
                                        {
                                            label1: "Need Date",
                                            value1: fmt(selectedRecord?.needDate),
                                            label2: "Work Order No.",
                                            value2: safe(selectedRecord?.workOrderNo),
                                            label3: "Prod Type (C/B/O)",
                                            value3: safe(it?.prodType),
                                        },
                                        {
                                            label1: "Status",
                                            value1: safe(it?.status),
                                            label2: "Description",
                                            value2: safe(it?.description),
                                            colspan: true,
                                        },
                                    ].map((row, i) => (
                                        <div key={i} style={{ marginBottom: 8 }}>
                                            <div
                                                style={{
                                                    display: "grid",
                                                    gridTemplateColumns: row.colspan
                                                        ? "1fr 2fr"
                                                        : "repeat(3, 1fr)",
                                                    columnGap: 12,
                                                    fontSize: 12,
                                                    color: "#6b7280",
                                                    marginBottom: 2,
                                                }}
                                            >
                                                <div>{row.label1}</div>
                                                <div>{row.label2}</div>
                                                {!row.colspan && <div>{row.label3}</div>}
                                            </div>
                                            <div
                                                style={{
                                                    display: "grid",
                                                    gridTemplateColumns: row.colspan
                                                        ? "1fr 2fr"
                                                        : "repeat(3, 1fr)",
                                                    columnGap: 12,
                                                    fontWeight: 600,
                                                    color: "#111827",
                                                }}
                                            >
                                                <div>{row.value1}</div>
                                                <div>{row.value2}</div>
                                                {!row.colspan && <div>{row.value3}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Drawer>



        </div>
    );
};

export default DeliveryOrderPage;
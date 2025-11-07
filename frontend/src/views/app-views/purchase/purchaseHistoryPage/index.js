import React, { useEffect, useState } from "react";
import { Table, Button, Space, Tag, message, Card, Modal } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { hasPermission } from "utils/auth";
import ActionButtons from "components/ActionButtons";
import GlobalTableActions from "components/GlobalTableActions";
import { useNavigate } from "react-router-dom";
import WorkOrderService from "services/WorkOrderService";
import useDebounce from "utils/debouce";


const { confirm } = Modal;

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

const PurchaseHistoryPage = () => {
    const navigate = useNavigate();
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


    const columns = [
        {
            title: "Work Order No",
            dataIndex: "workOrderNo",
            key: "workOrderNo",
            sorter: (a, b) => a.workOrderNo.localeCompare(b.workOrderNo),
            render: (text) => <strong style={{ fontSize: '14px' }}>{text}</strong>
        },
        {
            title: "Customer",
            dataIndex: ["project", "customer", "companyName"],
            key: "customer",
            render: (text) => <span style={{ fontSize: '13px' }}>{text || 'N/A'}</span>
        },
        {
            title: "Project No",
            dataIndex: "projectNo",
            key: "projectNo",
            render: (text) => <Tag color="blue">{text}</Tag>
        },
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
        {
            title: "POS Number",
            dataIndex: "posNumber",
            key: "posNumber",
            render: (text) => <span style={{ fontSize: '13px', color: '#666' }}>{text}</span>
        },
        {
            title: "Qty",
            dataIndex: "qty",
            key: "qty",
            render: (text) => <span style={{ fontSize: '13px', color: '#666' }}>{text}</span>
        },
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
            render: text => renderBadge(text, "status")
        },
        {
            title: "Actions",
            key: "actions",
            width: 150,
            render: (_, record) => (
                <ActionButtons
                    onEdit={() => handleEdit(record)}
                    onDelete={() => handleDelete(record._id)}
                    showEdit={true}
                    showDelete={true}
                    showDeleteConfirm={true}
                />
            )
        }
    ];

    const handleEdit = (record) => {
        setEditingWorkOrder(record);
        setIsModalVisible(true);
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
            const response = await WorkOrderService.exportWorkOrders();
            if (response) {
                const blob = new Blob([response], {
                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.setAttribute("download", "work_orders_export.xlsx");
                document.body.appendChild(link);
                link.click();
                link.remove();
                message.success("Work orders exported successfully");
            }
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

    const handleSearch = useDebounce((value) => {
        setPage(1);
        setSearch(value);
        fetchWorkOrders({ page: 1, limit, search: value });
    }, 500);

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingWorkOrder(null);
    };

    const handleCreate = async (workOrderData) => {
        try {
            let response;
            if (editingWorkOrder) {
                response = await WorkOrderService.updateWorkOrder(editingWorkOrder._id, workOrderData);
            } else {
                response = await WorkOrderService.createWorkOrder(workOrderData);
            }

            if (response.success) {
                message.success(
                    editingWorkOrder
                        ? 'Work order updated successfully!'
                        : 'Work order created successfully!'
                );
                setIsModalVisible(false);
                setEditingWorkOrder(null);
                fetchWorkOrders();
            } else {
                message.error(response.message || 'Operation failed');
            }
        } catch (error) {
            console.error('Error saving work order:', error);
            message.error(error.message || 'Failed to save work order');
        }
    };

    const handleTableChange = (pagination, filters, sorter) => {
        setPage(pagination.current);
        setLimit(pagination.pageSize);
    };

    const handleSave = async (settings) => {
        console.log('---------save', settings)
        setIsProductSettingmodalVisible(false);
    }

    const handleCloseImportWorkOrderModal = async (data) => {
        console.log('----------dataa----modal', data)
        setImportWorkOrderModalVisible(false);
    }


    const handleQuoteTypeSelect = async () => {

    }
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
                    <h2 style={{ margin: 0 }}>Purchase History by Year</h2>
                    <p style={{ margin: 0, fontSize: 14, color: '#888' }}>
                       Total spending breakdown by supplier and time period
                    </p>
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
                exportText="Export CSV"
                // onImport={(file) => handleImport(file)}
                showExport={true}
                onExport={() => handleExport()}
                showFilter={true}
                onFilter={() => console.log("Filter clicked")}
              
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

          

        </div>
    );
};

export default PurchaseHistoryPage;
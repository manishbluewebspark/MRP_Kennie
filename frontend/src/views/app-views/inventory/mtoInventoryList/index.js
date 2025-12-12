import React, { useEffect, useState } from "react";
import { Table, Button, Space, Tag, message, Card, Modal } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined, ExclamationCircleOutlined, EyeOutlined, RightOutlined, EyeFilled } from "@ant-design/icons";
import { hasPermission } from "utils/auth";
import ActionButtons from "components/ActionButtons";
import GlobalTableActions from "components/GlobalTableActions";
import { useNavigate } from "react-router-dom";
import WorkOrderService from "services/WorkOrderService";
import useDebounce from "utils/debouce";
import UpdateOutgoingQuantityModal from "./UpdateOutgoingQuantityModal";
import DeliveryOrderInformationModal from "./DeliveryOrderInformationModal";
import InventoryService from "services/InventoryService";
import { formatDate } from "utils/formatDate";

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

const MtoInventoryList = () => {
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingWorkOrder, setEditingWorkOrder] = useState(null);
    const [totalCount, setTotalCount] = useState(0);
    const [isViewQtyModal, setIsViewQtyModal] = useState(false);
const [selectedDORecord, setSelectedDORecord] = useState(null);

    const columns = [
        { title: "No.", dataIndex: "no", key: "no", width: 60 },
        { title: "Drawing No.", dataIndex: "drawingNo", key: "drawingNo" },
        { title: "Description", dataIndex: "description", key: "description" },
        { title: "Balance Qty", dataIndex: "balanceQty", key: "balanceQty" },
        {
            title: "Outgoing Qty",
            dataIndex: "outgoingQty",
            key: "outgoingQty",
            width: 120,
            align: "center",
            render: (qty, record) => (
                <span
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                    }}
                >
                    <b>{qty ?? 0}</b>
                    <EyeFilled
                        style={{ fontSize: 17, color: "#1890ff", cursor: "pointer" }}
                        onClick={() => {
                            setSelectedDORecord(record);      // ✅ add this state
                            setIsViewQtyModal(true);
                        }}
                    />
                </span>
            ),
        },
        ,
        {
            title: "Work Order",
            dataIndex: "workOrders",
            key: "workOrders",
            render: (arr) => arr?.join(", "),
        },
        {
            title: "Project",
            dataIndex: "projects",
            key: "projects",
            render: (arr) => arr?.join(", "),
        },
        {
            title: "Customer",
            dataIndex: "customers",
            key: "customers",
            render: (arr) => arr?.join(", "),
        },
        {
            title: "Completed",
            dataIndex: "completeDate",
            key: "completeDate",
            render: (val) => formatDate(val),
        },
    ];


    // const columns = [
    //     {
    //         title: 'No.',
    //         dataIndex: 'no',
    //         key: 'no',
    //         width: 60,
    //         align: 'center',
    //         fixed: 'left'
    //     },
    //     {
    //         title: 'Drawing No.',
    //         dataIndex: 'drawingNo',
    //         key: 'drawingNo',
    //         width: 100,
    //     },
    //     {
    //         title: 'Description',
    //         dataIndex: 'description',
    //         key: 'description',
    //         width: 120,
    //     },
    //     {
    //         title: 'Balance Qty',
    //         dataIndex: 'balanceQty',
    //         key: 'balanceQty',
    //         width: 100,
    //         align: 'center',
    //     },
    // {
    //     title: 'Outgoing Qty',
    //     dataIndex: 'outgoingQty',
    //     key: 'outgoingQty',
    //     width: 100,
    //     align: 'center',
    //     render: (qty) => (
    //         <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
    //             {qty}
    //             <EyeFilled style={{ fontSize: 17, color: '#1890ff' }}  onClick={()=>{setIsViewQtyModal(true)}}/>
    //         </span>
    //     ),
    // },
    //     {
    //         title: 'WorkOrder',
    //         dataIndex: 'workOrder',
    //         key: 'workOrder',
    //         width: 100,
    //     },
    //     {
    //         title: 'Project',
    //         dataIndex: 'project',
    //         key: 'project',
    //         width: 120,
    //     },
    //     {
    //         title: 'Customer',
    //         dataIndex: 'customer',
    //         key: 'customer',
    //         width: 200,
    //         ellipsis: true,
    //     },
    //     {
    //         title: 'Competed',
    //         dataIndex: 'completed',
    //         key: 'completed',
    //         width: 100,
    //         align: 'center',
    //         render: (date) => <Tag color="green">{date}</Tag>
    //     },
    //     {
    //         title: '',
    //         key: 'actions',
    //         // width: 120,
    //         align: 'center',
    //         fixed: 'right',
    //         render: (_, record) => (
    //             <Space size="small">
    //                 <ActionButtons
    //                     showEdit
    //                     onEdit={() => handleEdit(record)}
    //                 />
    //             </Space>
    //         ),
    //     },
    // ];

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
            const response = await InventoryService.getCompleteDrawingsMTO({
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

    // const handleSave = async (settings) => {
    //     console.log('---------save', settings)
    //     setIsProductSettingmodalVisible(false);
    // }

    // const handleCloseImportWorkOrderModal = async (data) => {
    //     console.log('----------dataa----modal', data)
    //     setImportWorkOrderModalVisible(false);
    // }


    const handleUpdateSubmit = async (values) => {
        console.log('--------data subit', values)
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
                    <h2 style={{ margin: 0 }}>Make To Order (MTO) Inventory List</h2>
                    <p style={{ margin: 0, fontSize: 14, color: '#888' }}>
                        Completed drawings available for delivery
                    </p>
                </div>


            </div>



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
                    // scroll={{ x: 1000 }}
                    onChange={handleTableChange}
                />
            </Card>


            <UpdateOutgoingQuantityModal
                visible={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onUpdate={handleUpdateSubmit}
            />

           <DeliveryOrderInformationModal
  visible={isViewQtyModal}
  onCancel={() => setIsViewQtyModal(false)}
  data={selectedDORecord}
/>




        </div>
    );
};

export default MtoInventoryList;
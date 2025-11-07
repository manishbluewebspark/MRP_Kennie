import React, { useEffect, useState } from "react";
import { Table, Button, Space, Tag, message, Card, Input, Checkbox, Col, Radio, Row, Typography } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined, ExclamationCircleOutlined, ExclamationCircleFilled, SettingFilled } from "@ant-design/icons";
import { hasPermission } from "utils/auth";
import ActionButtons from "components/ActionButtons";
import GlobalTableActions from "components/GlobalTableActions";
import useDebounce from "utils/debouce";
import GlobalFilterModal from "components/GlobalFilterModal";
import SelectPurchaseOrderModal from "./SelectPurchaseOrderModal";
import ReceiveMaterialsModal from "./ReceiveMaterialsModal";

const { Title, Text } = Typography;

// Badge render helper
const renderBadge = (text, type) => {
    let color;
    switch (type) {
        case "status":
            color = text === "Active" ? "green" : text === "Completed" ? "blue" : "red";
            break;
        case "priority":
            color = text === "High" ? "red" : text === "Medium" ? "orange" : "green";
            break;
        default:
            color = "gray";
    }
    return <Tag color={color}>{text}</Tag>;
};

const customerData = [];
const projectData = [];

const InventoryListPage = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('material_required');

    const [isPurchaseOrderModalOpen, setIsPurchaseOrderModalOpen] = useState(false);
    const [isReceiveMaterialModalOpen, setIsReceiveMaterialModalOpen] = useState(false);
    // Sample data for different tabs
    const materialRequiredData = [
        {
            key: '1',
            headerContent: {
                title: "CABLE-AWG22",
                tag: "EEEID",
                workOrders: "2508-02",
                current: "0",
                alphaUome: "M",
                required: "20"
            }
        },
        {
            key: '2',
            headerContent: {
                title: "CONNECTOR-5PIN",
                tag: "URGENT",
                workOrders: "2509-01",
                current: "5",
                alphaUome: "PCS",
                required: "50"
            }
        }
    ];

    const inventoryAlertsData = [
        {
            key: '1',
            headerContent: {
                title: "RESISTOR-10K",
                tag: "LOW STOCK",
                workOrders: "2510-03",
                current: "2",
                alphaUome: "PCS",
                required: "100"
            }
        },
        {
            key: '2',
            headerContent: {
                title: "CAPACITOR-100UF",
                tag: "CRITICAL",
                workOrders: "2511-04",
                current: "1",
                alphaUome: "PCS",
                required: "25"
            }
        }
    ];

    const inventoryListData = [
        {
            key: '1',
            no: '1',
            mpn: 'oaoraa',
            manufacturer: 'phoenixcontact',
            description: 'EC-BIN-EDS',
            storage: 'ELEC-BIN-E05',
            balanceQty: '1345',
            incomingQty: '-',
            incomingPONo: '12345',
            commitDate: '12/02/2025',
            status: 'In Stock'
        },
        {
            key: '2',
            no: '2',
            mpn: 'BS8151-0',
            manufacturer: 'Turck',
            description: 'Straight Male connector 5 pin',
            storage: 'WH-A',
            balanceQty: '0',
            incomingQty: '10',
            incomingPONo: 'PO-12345',
            commitDate: '8/12/2025',
            status: 'On Order'
        },
        {
            key: '3',
            no: '3',
            mpn: 'CAP-100UF',
            manufacturer: 'Panasonic',
            description: 'Electrolytic Capacitor 100uF',
            storage: 'ELEC-BIN-C12',
            balanceQty: '5',
            incomingQty: '50',
            incomingPONo: 'PO-12346',
            commitDate: '9/15/2025',
            status: 'Low Stock'
        }
    ];

    // Material Required Columns
    const materialRequiredColumns = [
        {
            title: "",
            dataIndex: "headerContent",
            key: "headerContent",
            render: (headerContent) => (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <ExclamationCircleFilled style={{
                        color: '#ff4d4f',
                        fontSize: '24px',
                        alignSelf: 'center'
                    }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <Title level={4} style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                                    {headerContent.title}
                                </Title>
                            </div>
                            <div>
                                <Tag color="red" style={{ fontSize: '14px', fontWeight: 'bold', padding: '2px 8px' }}>
                                    {headerContent.tag}
                                </Tag>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                            <div>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Required by Work Orders: {headerContent.workOrders}
                                </Text>
                            </div>
                            <div>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Current: {headerContent.current}
                                </Text>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                            <div>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Alpha + UOME: {headerContent.alphaUome}
                                </Text>
                            </div>
                            <div>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Required: {headerContent.required}
                                </Text>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    ];

    // Inventory Alerts Columns
    const inventoryAlertsColumns = [
        {
            title: "",
            dataIndex: "headerContent",
            key: "headerContent",
            render: (headerContent) => (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <ExclamationCircleFilled style={{
                        color: '#ff4d4f',
                        fontSize: '24px',
                        marginTop: 5
                    }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <Title level={4} style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                                    {headerContent.title}
                                </Title>
                            </div>
                            <div>
                                <Tag color="red" style={{ fontSize: '14px', fontWeight: 'bold', padding: '2px 8px' }}>
                                    {headerContent.tag}
                                </Tag>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                            <div>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Required by Work Orders: {headerContent.workOrders}
                                </Text>
                            </div>
                            <div>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Current: {headerContent.current}
                                </Text>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                            <div>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Alpha + UOME: {headerContent.alphaUome}
                                </Text>
                            </div>
                            <div>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Required: {headerContent.required}
                                </Text>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    ];

    // Inventory List Columns
    const inventoryListColumns = [
        {
            title: 'No.',
            dataIndex: 'no',
            key: 'no',
            width: 60,
            align: 'center',
        },
        {
            title: 'MPN',
            dataIndex: 'mpn',
            key: 'mpn',
            width: 120,
        },
        {
            title: 'Manufacturer',
            dataIndex: 'manufacturer',
            key: 'manufacturer',
            width: 150,
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            width: 180,
        },
        {
            title: 'Storage',
            dataIndex: 'storage',
            key: 'storage',
            width: 100,
            align: 'center',
        },
        {
            title: 'Balance Qty',
            dataIndex: 'balanceQty',
            key: 'balanceQty',
            width: 100,
            align: 'center',
        },
        {
            title: 'Incoming Qty',
            dataIndex: 'incomingQty',
            key: 'incomingQty',
            width: 120,
            align: 'center',
        },
        {
            title: 'Incoming PO NO.',
            dataIndex: 'incomingPONo',
            key: 'incomingPONo',
            width: 150,
        },
        {
            title: 'Commit Date',
            dataIndex: 'commitDate',
            key: 'commitDate',
            width: 120,
            align: 'center',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            align: 'center',
            render: (status) => (
                <Tag
                    color={
                        status === 'In Stock' ? 'green' :
                            status === 'On Order' ? 'blue' :
                                status === 'Low Stock' ? 'orange' : 'red'
                    }
                >
                    {status}
                </Tag>
            ),
        },
        {
            title: 'Actions',
            dataIndex: 'actions',
            key: 'actions',
            width: 100,
            align: 'center',
            render: (text, record) => (
                <SettingFilled
                    style={{
                        color: '#1890ff',
                        fontSize: '18px',
                        cursor: 'pointer'
                    }}
                    onClick={() => { handleEdit(record.key); setIsReceiveMaterialModalOpen(true) }}
                />
            ),
        },
    ];

    const filterConfig = [
        {
            type: 'date',
            name: 'drawingDate',
            label: 'Drawing Date',
            placeholder: 'Select Drawing Date'
        },
        {
            type: 'select',
            name: 'customer',
            label: 'Customer',
            placeholder: 'Select Customer',
            options: customerData.map(customer => ({
                label: customer.companyName,
                value: customer._id
            }))
        },
        {
            type: 'select',
            name: 'project',
            label: 'Project',
            placeholder: 'Select Project',
            options: projectData.map(project => ({
                label: project.projectName,
                value: project._id
            }))
        },
        {
            type: 'select',
            name: 'drawingRange',
            label: 'Drawing Range',
            placeholder: 'Select Drawing Range',
            options: [
                { value: 'range1', label: '0–50' },
                { value: 'range2', label: '51–100' },
                { value: 'range3', label: '101–200' }
            ]
        }
    ];

    // Get current data based on active tab
    const getCurrentData = () => {
        switch (activeTab) {
            case 'material_required':
                return materialRequiredData;
            case 'inventory_alerts':
                return inventoryAlertsData;
            case 'inventory_list':
                return inventoryListData;
            default:
                return materialRequiredData;
        }
    };

    // Get current columns based on active tab
    const getCurrentColumns = () => {
        switch (activeTab) {
            case 'material_required':
                return materialRequiredColumns;
            case 'inventory_alerts':
                return inventoryAlertsColumns;
            case 'inventory_list':
                return inventoryListColumns;
            default:
                return materialRequiredColumns;
        }
    };

    const handleEdit = async (id) => {
        try {
            console.log("Edit record:", id);
            message.info("Edit functionality to be implemented");
            // Add your edit logic here
        } catch (err) {
            console.error("Error editing record:", err);
            message.error("Failed to edit record");
        }
    };

    const handleDelete = async (id) => {
        try {
            console.log("Delete record:", id);
            message.success("Record deleted successfully");
            // Add your delete logic here
            fetchData();
        } catch (err) {
            console.error("Error deleting record:", err);
            message.error("Failed to delete record");
        }
    };

    const fetchData = async (params = {}) => {
        setLoading(true);
        try {
            // Simulate API call
            setTimeout(() => {
                setData(getCurrentData());
                setLoading(false);
            }, 500);
        } catch (err) {
            console.error("Error fetching data:", err);
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            console.log("Exporting data...");
            message.success("Data exported successfully");
            // Add your export logic here
        } catch (err) {
            console.error("Error exporting data:", err);
            message.error("Failed to export data");
        }
    };

    const handleImport = async (file) => {
        try {
            console.log("Importing file:", file);
            message.success("Data imported successfully");
            fetchData();
            // Add your import logic here
        } catch (err) {
            console.error("Error importing data:", err);
            message.error("Failed to import data");
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]); // Refetch data when tab changes

    const handleSearch = useDebounce((value) => {
        setPage(1);
        // Add search functionality here
        console.log("Search:", value);
    }, 500);

    const handleFilterSubmit = async (data) => {
        console.log('Filter data:', data);
    };

    const handlePurchaseOrderSubmit = async (status) => {
        console.log('Received handlePurchaseOrderSubmit Data:', status);
        setIsPurchaseOrderModalOpen(false);
    }

    const handleReceiveSubmit = async (formData) => {
        console.log('Received Materials Data:', formData);
        setIsReceiveMaterialModalOpen(false)
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
                    <h2 style={{ margin: 0 }}>
                        {activeTab === 'material_required' && 'Materials Required for All Work Orders'}
                        {activeTab === 'inventory_alerts' && 'Inventory Alerts'}
                        {activeTab === 'inventory_list' && 'Inventory List'}
                    </h2>
                    <p style={{ margin: 0, fontSize: 14, color: '#888' }}>
                        {activeTab === 'material_required' && 'Materials with insufficient stock for pending work orders'}
                        {activeTab === 'inventory_alerts' && 'Critical inventory items that need attention'}
                        {activeTab === 'inventory_list' && 'Complete inventory list with current stock levels'}
                    </p>
                </div>

                <Col>
                    <Radio.Group
                        value={activeTab}
                        onChange={e => setActiveTab(e.target.value)}
                        optionType="button"
                        buttonStyle="solid"
                    >
                        <Radio.Button value="material_required">Material Required</Radio.Button>
                        <Radio.Button value="inventory_alerts">Inventory Alerts</Radio.Button>
                        <Radio.Button value="inventory_list">Inventory List</Radio.Button>
                    </Radio.Group>
                </Col>
            </div>

            {/* Global Table Actions */}
            <GlobalTableActions
                showSearch={true}
                onSearch={(value) => {
                    setSearch(value);
                    handleSearch(value);
                }}
                showExport={true}
                onExport={() => handleExport()}
                showFilter={false}
                onFilter={() => setIsFilterModalOpen(true)}
                showExportPDF={false}
                showProductSetting={true}
                onProductSetting={() => { setIsPurchaseOrderModalOpen(true) }}
                showProductSettingText="Receive Material"
                onExportPDF={() => { }}
            />

            {/* Table */}
            <Card>
                <Table
                    columns={getCurrentColumns()}
                    dataSource={getCurrentData()}
                    loading={loading}
                    pagination={activeTab === 'inventory_list' ? {
                        current: page,
                        pageSize: limit,
                        total: getCurrentData().length,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                            `${range[0]}-${range[1]} of ${total} items`
                    } : false}
                    scroll={activeTab === 'inventory_list' ? { x: 1300 } : undefined}
                />
            </Card>

            <GlobalFilterModal
                visible={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                onSubmit={handleFilterSubmit}
                filters={filterConfig}
                title="Filters"
            />

            <SelectPurchaseOrderModal
                visible={isPurchaseOrderModalOpen}
                onCancel={() => { setIsPurchaseOrderModalOpen(false) }}
                onSubmit={handlePurchaseOrderSubmit}
            />

            <ReceiveMaterialsModal
                visible={isReceiveMaterialModalOpen}
                onCancel={() => setIsReceiveMaterialModalOpen(false)}
                onSubmit={handleReceiveSubmit}
                purchaseOrderData={{
                    purchaseOrderDetails: {
                        poNumber: "123",
                        projectNumber: "project1",
                        projectType: "type1"
                    },
                    materials: [
                        {
                            key: "1",
                            mpn: "1292C",
                            manufacturer: "Alpha",
                            description: "Cable, 22AWG",
                            uom: "FEET",
                            orderedQty: 155,
                            needDate: "08/09/2025",
                            committedDate: "03/09/2025",
                            receivedQty: "50",
                            rejectedQty: "5"
                        }
                    ],
                    purchaseOrderHeader: {
                        id: "P25-00006",
                        vendor: "Jaytron",
                        poDate: "13/08/2025",
                        needDate: "11/08/2025"
                    }
                }}
            />
        </div>
    );
};

export default InventoryListPage;
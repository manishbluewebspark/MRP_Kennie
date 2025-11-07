import React, { useEffect, useState } from "react";
import { Table, Button, Space, Tag, message, Card, Input, Checkbox, Col, Radio } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { hasPermission } from "utils/auth";
import ActionButtons from "components/ActionButtons";
import GlobalTableActions from "components/GlobalTableActions";
import useDebounce from "utils/debouce";
import GlobalFilterModal from "components/GlobalFilterModal";

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

const customerData = []
const projectData = []

const MPNTrackerPage = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('total_mpn_needed');
    // Sample data - replace with your API data
    // Sample data for MPN Tracker
    const sampleData = [
        {
            key: '1',
            mpnNumber: '12345',
            description: 'Cable, 22AWG',
            manufacturer: 'Alpha',
            uom: 'Feet',
            totalNeeded: '176',
            currentStock: '30',
            shortfall: '146',
            workOrder: '2508-01-02'
        },
        {
            key: '2',
            mpnNumber: '67890',
            description: 'Connector, RJ45',
            manufacturer: 'Beta',
            uom: 'Pieces',
            totalNeeded: '50',
            currentStock: '15',
            shortfall: '35',
            workOrder: '2508-01-03'
        }
    ];

    const columns = [
        {
            title: "MPN Number",
            dataIndex: "mpnNumber",
            key: "mpnNumber",
            sorter: (a, b) => a.mpnNumber - b.mpnNumber,
            render: (text) => <strong style={{ fontSize: '14px' }}>{text}</strong>
        },
        {
            title: "Description",
            dataIndex: "description",
            key: "description",
            render: (text) => <span style={{ fontSize: '13px' }}>{text}</span>
        },
        {
            title: "Manufacturer",
            dataIndex: "manufacturer",
            key: "manufacturer",
            render: (text) => <span style={{ fontSize: '13px', color: '#666' }}>{text}</span>
        },
        {
            title: "UoM",
            dataIndex: "uom",
            key: "uom",
            render: (text) => <Tag color="blue">{text}</Tag>
        },
        {
            title: "Total Needed",
            dataIndex: "totalNeeded",
            key: "totalNeeded",
            render: (text) => <span style={{ fontSize: '13px', color: '#666' }}>{text}</span>
        },
        {
            title: "Current Stock",
            dataIndex: "currentStock",
            key: "currentStock",
            render: (text) => <span style={{ fontSize: '13px', color: '#666' }}>{text}</span>
        },
        {
            title: "Shortfall",
            dataIndex: "shortfall",
            key: "shortfall",
            render: (text) => (
                <Tag
                    color="red"
                    style={{
                        borderRadius: '12px',
                        background: '#ff4d4f',
                        color: 'white',
                        border: 'none',
                        padding: '2px 10px'
                    }}
                >
                    {text}
                </Tag>
            )
        },
        {
            title: "Work Order",
            dataIndex: "workOrder",
            key: "workOrder",
            render: (text) => (
                <Tag
                    style={{
                        borderRadius: '12px',
                        background: '#1890ff',
                        color: 'white',
                        border: 'none',
                        padding: '2px 10px'
                    }}
                >
                    {text}
                </Tag>
            )
        }
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

    const handleEdit = async (id) => {
        try {
            console.log("Edit record:", id);
            message.info("Edit functionality to be implemented");
            // Add your edit logic here
        } catch (err) {
            console.error("Error editing work order:", err);
            message.error("Failed to edit work order");
        }
    };

    const handleDelete = async (id) => {
        try {
            console.log("Delete record:", id);
            message.success("Work order deleted successfully");
            // Add your delete logic here
            fetchWorkOrders();
        } catch (err) {
            console.error("Error deleting work order:", err);
            message.error("Failed to delete work order");
        }
    };

    const fetchWorkOrders = async (params = {}) => {
        setLoading(true);
        try {
            // Simulate API call
            setTimeout(() => {
                setData(sampleData);
                setLoading(false);
            }, 1000);

            // Replace with your actual API call:
            // const { page = 1, limit = 10, search = "" } = params;
            // const res = await WorkOrderService.getAllWorkOrders({ page, limit, search });
            // if (res.success) {
            //     setData(res.data);
            // }
        } catch (err) {
            console.error("Error fetching work orders:", err);
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            console.log("Exporting work orders...");
            message.success("Work orders exported successfully");
            // Add your export logic here
        } catch (err) {
            console.error("Error exporting work orders:", err);
            message.error("Failed to export work orders");
        }
    };

    const handleImport = async (file) => {
        try {
            console.log("Importing file:", file);
            message.success("Work orders imported successfully");
            fetchWorkOrders();
            // Add your import logic here
        } catch (err) {
            console.error("Error importing work orders:", err);
            message.error("Failed to import work orders");
        }
    };

    useEffect(() => {
        fetchWorkOrders();
    }, []);

    const handleSearch = useDebounce((value) => {
        setPage(1);
        fetchWorkOrders({ page: 1, limit, search: value });
    }, 500);

    const handleFilterSubmit = async (data) => {
        console.log('-------filter', data)
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
                    <h2 style={{ margin: 0 }}>Total MPN Requirement</h2>
                    <p style={{ margin: 0, fontSize: 14, color: '#888' }}>
                        All MPN List
                    </p>
                </div>

                <Col>
                    <Radio.Group
                        value={activeTab}
                        onChange={e => setActiveTab(e.target.value)}
                        optionType="button"
                        buttonStyle="solid"
                    >
                        <Radio.Button value="total_mpn_needed">Total MPN Needed</Radio.Button>
                        <Radio.Button value="each_mpn_usage">Each MPN Usage</Radio.Button>
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
                showImport={true}
                onImport={(file) => handleImport(file)}
                showExport={true}
                onExport={() => handleExport()}
                showFilter={true}
                onFilter={() => {setIsFilterModalOpen(true)}}
            />

            {/* Table */}
            <Card>
                <Table
                    columns={columns}
                    dataSource={data}
                    loading={loading}
                // pagination={{
                //     current: page,
                //     pageSize: limit,
                //     showSizeChanger: true,
                //     showQuickJumper: true,
                //     showTotal: (total, range) =>
                //         `${range[0]}-${range[1]} of ${total} items`
                // }}
                // scroll={{ x: 1000 }}
                />
            </Card>

            <GlobalFilterModal
                visible={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                onSubmit={handleFilterSubmit}
                filters={filterConfig}
                title="Filters"
            />
        </div>
    );
};

export default MPNTrackerPage;
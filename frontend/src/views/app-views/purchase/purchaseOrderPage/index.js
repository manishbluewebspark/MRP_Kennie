import React, { useEffect, useState } from "react";
import { Table, Button, Space, Tag, message, Card, Input, Checkbox, Col, Radio, Row } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined, FileExcelFilled, ImportOutlined, ExportOutlined, CloudDownloadOutlined, ExclamationCircleOutlined, ExclamationCircleFilled } from "@ant-design/icons";
import { hasPermission } from "utils/auth";
import ActionButtons from "components/ActionButtons";
import GlobalTableActions from "components/GlobalTableActions";
import useDebounce from "utils/debouce";
import GlobalFilterModal from "components/GlobalFilterModal";
import { useNavigate } from "react-router-dom";

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

const formatMoney = (amount = 0, currency = "USD") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount || 0))

const customerData = []
const projectData = []
const PurchaseOrderPage = () => {
    const navigate = useNavigate()
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('opening_orders');
    const [selectedRows, setSelectedRows] = useState([]);

    // Sample data for different tabs
    const openingOrdersData = [
        {
            key: '1',
            workOrderNo: 'P25-00010',
            supplier: 'ABC Pte Ltd',
            createdDate: '29/08/2025',
            price: '1334',
            status: 'Active'
        },
        {
            key: '2',
            workOrderNo: 'P25-00011',
            supplier: 'XYZ Corp',
            createdDate: '30/08/2025',
            price: '2500',
            status: 'Pending'
        }
    ];

    const partialCompletionData = [
        {
            key: '1',
            poData: {
                poNumber: 'P25-00010',
                supplier: 'ABC Pte Ltd',
                createdDate: '29/08/2025',
                amount: '1334',
                ordered: 100,
                received: 60,
                pending: 40
            }
        },
        {
            key: '2',
            poData: {
                poNumber: 'P25-00011',
                supplier: 'XYZ Corporation',
                createdDate: '30/08/2025',
                amount: '2500',
                ordered: 200,
                received: 150,
                pending: 50
            }
        }
    ];

    const closedOrdersData = [
        {
            key: '1',
            workOrderNo: 'P25-00012',
            supplier: 'DEF Suppliers',
            createdDate: '31/08/2025',
            price: '1800',
            status: 'Completed'
        }
    ];

    const mpnShortageData = [
        {
            key: '1',
            mpn: '04 HPQ-D12',
            details: {
                description: 'Spill sensor, 24vde',
                manufacturer: 'Altech',
                location: 'Not Set',
                leadTime: '2weeks',
                workOrder: '2508-12',
                current: 'Ope',
                short: 'Spe',
                needDate: '31/08/2025',
                supplier: 'TBD'
            }
        },
        {
            key: '2',
            mpn: '05 ABC-E34',
            details: {
                description: 'Temperature sensor',
                manufacturer: 'Siemens',
                location: 'Warehouse A',
                leadTime: '1week',
                workOrder: '2508-13',
                current: 'Low',
                short: 'High',
                needDate: '31/08/2025',
                supplier: 'TechCorp'
            }
        }
    ];

    // Columns for Opening Orders
    const openingOrderColumns = [
        {
            title: "",
            key: "work",
            render: (_, record) => (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* LEFT: Work order + meta */}
                    <div style={{ minWidth: 260 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>
                            {record.workOrderNo || "P25-00010"}
                        </div>

                        <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                            Supplier: {record.supplier || "ABC Pte Ltd"}
                        </div>

                        <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                            Created:{" "}
                            {record.createdDate
                            }
                        </div>
                    </div>

                    {/* PRICE CHIP */}
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            border: "1px solid #D1D5DB",
                            background: "#F9FAFB",
                            padding: "2px 10px",
                            borderRadius: 16,
                            fontSize: 13,
                            color: "#111827",
                            fontWeight: 600,
                            height: 24,
                        }}
                    >
                        {formatMoney(record.price, record.currency || "USD")}
                    </div>
                </div>
            ),
        },

        // STATUS at far right
        {
            title: "",
            dataIndex: "status",
            key: "status",
            align: "right",
            width: 140,
            render: (status) => {
                const label = status || "Pending";
                const style =
                    label.toLowerCase() === "pending"
                        ? { bg: "#FB923C", color: "#FFFFFF" }
                        : label.toLowerCase() === "approved"
                            ? { bg: "#22C55E", color: "#FFFFFF" }
                            : { bg: "#6B7280", color: "#FFFFFF" };

                return (
                    <span
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "2px 10px",
                            borderRadius: 16,
                            fontSize: 12,
                            fontWeight: 700,
                            background: style.bg,
                            color: style.color,
                        }}
                    >
                        {label}
                    </span>
                );
            },
        },

        // ACTION ICONS
        {
            title: "",
            key: "actions",
            align: "right",
            width: 220,
            render: (_, record) => (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <ActionButtons
                        onEdit={() => handleEdit(record?.key)}
                        onDelete={() => handleDelete(record?.key)}
                        onInfo={() => navigate(`/app/purchase/view-purchase-order`)}
                        onMail={() => { }}
                        onCross={() => { }}
                        showEdit
                        showInfo
                        showDelete
                        showDeleteConfirm
                        showCross
                        showMail
                        // optional: soft rounded icon backgrounds like screenshot
                        styleEdit={{ background: "#DBEAFE", color: "#1D4ED8", borderRadius: 8, padding: 8 }}
                        styleDelete={{ background: "#FEE2E2", color: "#DC2626", borderRadius: 8, padding: 8 }}
                        styleMail={{ background: "#E5E7EB", color: "#374151", borderRadius: 8, padding: 8 }}
                        styleCross={{ background: "#FEE2E2", color: "#DC2626", borderRadius: 8, padding: 8 }}
                        styleInfo={{ background: "#E5E7EB", color: "#111827", borderRadius: 8, padding: 8 }}
                    />
                </div>
            ),
        },
    ];

    // Columns for Partial Completion
    const partialCompletionColumns = [
        {
            title: "",
            key: "poData",
            render: (_, record) => (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        width: "100%",
                        padding: "12px 0",
                        borderBottom: "1px solid #E5E7EB",
                    }}
                >
                    {/* LEFT CONTENT */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {/* PO Number */}
                        <div
                            style={{
                                fontSize: 16,
                                fontWeight: 600,
                                color: "#111827",
                                lineHeight: 1.2,
                            }}
                        >
                            {record?.poNumber || "P25-00010"}
                        </div>

                        {/* Supplier */}
                        <div style={{ fontSize: 13, color: "#6B7280" }}>
                            Supplier: {record?.supplier || "ABC Pte Ltd"}
                        </div>

                        {/* Created Date + Price chip */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 13,
                                color: "#6B7280",
                            }}
                        >
                            <span>
                                Created:{" "}
                                {record?.createdDate
                                    ? new Date(record.createdDate).toLocaleDateString("en-GB")
                                    : "29/08/2025"}
                            </span>
                            <div
                                style={{
                                    border: "1px solid #D1D5DB",
                                    borderRadius: 16,
                                    background: "#F9FAFB",
                                    fontSize: 12,
                                    padding: "2px 8px",
                                    fontWeight: 600,
                                    color: "#111827",
                                }}
                            >
                                ${Number(record?.amount || 13.34).toFixed(2)}
                            </div>
                        </div>

                        {/* Quantity Stats Row */}
                        <div
                            style={{
                                marginTop: 8,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                maxWidth: 420,
                                fontSize: 13,
                                color: "#6B7280",
                                borderTop: "1px solid #E5E7EB",
                                paddingTop: 8,
                                gap: '40px'
                            }}
                        >
                            <div>
                                Ordered:{" "}
                                <strong style={{ color: "#111827" }}>
                                    {record?.ordered ?? 100}
                                </strong>
                            </div>
                            <div>
                                Received:{" "}
                                <strong style={{ color: "#111827" }}>
                                    {record?.received ?? 60}
                                </strong>
                            </div>
                            <div>
                                Pending:{" "}
                                <strong style={{ color: "#111827" }}>
                                    {record?.pending ?? 40}
                                </strong>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SIDE BUTTON */}
                    <div style={{ display: "flex", alignItems: "flex-start" }}>
                        <button
                            onClick={() => console.log("Receive Goods clicked")}
                            style={{
                                border: "1px solid #F97316",
                                color: "#F97316",
                                background: "transparent",
                                borderRadius: 16,
                                padding: "4px 12px",
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: "pointer",
                                transition: "all 0.2s",
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = "#FFF7ED";
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = "transparent";
                            }}
                        >
                            Receive Goods
                        </button>
                    </div>
                </div>
            ),
        },
    ];


    // Columns for Closed Orders
    const closedOrderColumns = [
        {
            title: '',
            dataIndex: 'workOrderNo',
            key: 'workOrderNo',
            render: (text, record) => (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div>
                        <div
                            style={{
                                fontSize: 16,
                                fontWeight: 600,
                                color: "#111827",
                                lineHeight: 1.2,
                            }}
                        >
                            {record.workOrderNo || "P25-00010"}
                        </div>
                        <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                            Supplier: {record.supplier || "ABC Pte Ltd"}
                        </div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 13,
                                color: "#6B7280",
                                marginTop: 2,
                            }}
                        >
                            <span>
                                Created:{" "}
                                {record.createdDate
                                }
                            </span>
                            <div
                                style={{
                                    border: "1px solid #D1D5DB",
                                    borderRadius: 16,
                                    background: "#F9FAFB",
                                    fontSize: 12,
                                    padding: "2px 8px",
                                    fontWeight: 600,
                                    color: "#111827",
                                    gap: '20px'
                                }}
                            >
                                ${Number(record.price || 13.34).toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>

            ),
        },
        {
            title: '',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag
                    color="green"
                    style={{
                        margin: 0,
                        fontSize: '12px',
                        fontWeight: 'bold',
                        padding: '2px 8px'
                    }}
                >
                    {status}
                </Tag>
            ),
            align: 'center',
        },
        {
            title: '',
            key: 'actions',
            width: 120,
            render: (_, record) => (
                <ActionButtons
                    showReset={true}
                    onReset={() => {

                    }}
                    showInfo={true}
                    onInfo={() => {

                    }}
                />
            ),
            align: 'center',
        },
    ];

    // Columns for MPN Shortage with Checkbox
   const mpnShortageColumns = [
  {
    title: "",
    key: "shortageCard",
    render: (_, record) => {
      const d = record?.details || {};
      return (
         <div
          style={{
            width: "100%",           // ⬅️ make it fill the cell
            boxSizing: "border-box",
            borderRadius: 14,
            padding: 12,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
         

          {/* Alert badge */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "#FDE8E8",
              display: "grid",
              placeItems: "center",
              color: "#EF4444",
              flexShrink: 0,
            }}
          >
            <ExclamationCircleFilled style={{ fontSize: 20 }} />
          </div>

          {/* Middle: Title + subtitle */}
          <div style={{ minWidth: 170 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#111827",
                lineHeight: 1.1,
              }}
            >
              {record?.mpn || "HPQ-D12"}
            </div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
              {d?.description || "Spill sensor, 24vdc"}
            </div>
          </div>

          {/* Right: inline spec row (8 items) */}
          <div
            style={{
              display: "grid",
              gridAutoFlow: "column",
              gridAutoColumns: "max-content",
              columnGap: 28,
              rowGap: 4,
              alignItems: "center",
              flex: 1,
              paddingLeft: 8,
            }}
          >
            {/* Helper blocks */}
            <div>
              <div style={{ fontSize: 12, color: "#9CA3AF" }}>Manufacturer</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                {d?.manufacturer || "Altech"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#9CA3AF" }}>Location</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                {d?.location || "Not Set"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#9CA3AF" }}>Lead Time</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                {d?.leadTime || "2 weeks"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#9CA3AF" }}>Work Order</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                {d?.workOrder || "2508-12"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#9CA3AF" }}>Current</div>
              <Tag
                color="default"
                style={{ margin: 0, fontSize: 12, padding: "0 6px" }}
              >
                {d?.current ?? 0} pc
              </Tag>
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#9CA3AF" }}>Short</div>
              <Tag
                color="red"
                style={{ margin: 0, fontSize: 12, padding: "0 6px" }}
              >
                {d?.short ?? 5} pc
              </Tag>
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#9CA3AF" }}>Need Date</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                {d?.needDate || "Oct 25, 2025"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#9CA3AF" }}>Supplier</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                {d?.supplier || "TBD"}
              </div>
            </div>
          </div>
        </div>
      );
    },
  },
];

    // Get current columns and data based on active tab
    const getCurrentColumns = () => {
        switch (activeTab) {
            case 'opening_orders':
                return openingOrderColumns;
            case 'partial_completion':
                return partialCompletionColumns;
            case 'closed_orders':
                return closedOrderColumns;
            case 'mpn_shortage':
                return mpnShortageColumns;
            default:
                return openingOrderColumns;
        }
    };

    const getCurrentData = () => {
        switch (activeTab) {
            case 'opening_orders':
                return openingOrdersData;
            case 'partial_completion':
                return partialCompletionData;
            case 'closed_orders':
                return closedOrdersData;
            case 'mpn_shortage':
                return mpnShortageData;
            default:
                return openingOrdersData;
        }
    };

    const getPageTitle = () => {
        switch (activeTab) {
            case 'opening_orders':
                return "Opening Purchase Orders";
            case 'partial_completion':
                return "Partial Completion Purchase Orders";
            case 'closed_orders':
                return "Closed Purchase Orders";
            case 'mpn_shortage':
                return "MPN Shortage Items";
            default:
                return "Purchase Orders";
        }
    };

    const getPageDescription = () => {
        switch (activeTab) {
            case 'opening_orders':
                return "Active purchase orders that are still open";
            case 'partial_completion':
                return "Purchase orders with partial completion status";
            case 'closed_orders':
                return "Completed and closed purchase orders";
            case 'mpn_shortage':
                return "Items with material shortage that need attention";
            default:
                return "Manage your purchase orders";
        }
    };

    // Checkbox handlers for MPN Shortage tab
    const handleSelectAll = (checked) => {
        if (checked) {
            const allKeys = mpnShortageData.map(item => item.key);
            setSelectedRows(allKeys);
        } else {
            setSelectedRows([]);
        }
    };

    const handleRowSelect = (key, checked) => {
        if (checked) {
            setSelectedRows(prev => [...prev, key]);
        } else {
            setSelectedRows(prev => prev.filter(k => k !== key));
        }
    };

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
        navigate(`/app/purchase/edit-purchase-order/${id}`)
    };

    const handleDelete = async (id) => {
        try {
            console.log("Delete record:", id);
            message.success("Work order deleted successfully");
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
                setData(getCurrentData());
                setLoading(false);
            }, 1000);
        } catch (err) {
            console.error("Error fetching work orders:", err);
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            console.log("Exporting work orders...");
            message.success("Work orders exported successfully");
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
        } catch (err) {
            console.error("Error importing work orders:", err);
            message.error("Failed to import work orders");
        }
    };

    useEffect(() => {
        fetchWorkOrders();
    }, [activeTab]);

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
                    <h2 style={{ margin: 0 }}>{getPageTitle()}</h2>
                    <p style={{ margin: 0, fontSize: 14, color: '#888' }}>
                        {getPageDescription()}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <Button icon={<CloudDownloadOutlined />}>
                        Export
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                        navigate('/app/purchase/create-purchase-order')
                    }}>
                        Create PO
                    </Button>
                </div>
            </div>

            {/* Global Table Actions */}
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }} gutter={[16, 16]}>
                <Col xs={24} md={12} lg={10}>
                    <GlobalTableActions
                        showSearch={true}
                        onSearch={(value) => {
                            setSearch(value);
                            handleSearch(value);
                        }}
                        showExport={false}
                        onExport={() => handleExport()}
                        showFilter={false}
                        onFilter={() => setIsFilterModalOpen(true)}
                        showExportPDF={false}
                        onExportPDF={() => { }}
                    />
                </Col>

                <Col xs={24} md={12} lg={8} style={{ textAlign: 'right' }}>
                    <Radio.Group
                        value={activeTab}
                        onChange={e => setActiveTab(e.target.value)}
                        optionType="button"
                        buttonStyle="solid"
                        size="small"
                    >
                        <Radio.Button value="opening_orders" style={{ fontSize: '12px', padding: '0 8px' }}>
                            Opening Orders
                        </Radio.Button>
                        <Radio.Button value="partial_completion" style={{ fontSize: '12px', padding: '0 8px' }}>
                            Partial completion
                        </Radio.Button>
                        <Radio.Button value="closed_orders" style={{ fontSize: '12px', padding: '0 8px' }}>
                            Closed Orders
                        </Radio.Button>
                        <Radio.Button value="mpn_shortage" style={{ fontSize: '12px', padding: '0 8px' }}>
                            MPN Shortage
                        </Radio.Button>
                    </Radio.Group>
                </Col>
            </Row>

            {/* Selected rows info for MPN Shortage */}
            {activeTab === 'mpn_shortage' && selectedRows.length > 0 && (
                <div style={{ marginBottom: 16, padding: '8px 16px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '6px' }}>
                    <span style={{ color: '#1890ff' }}>
                        {selectedRows.length} item(s) selected
                    </span>
                </div>
            )}

            {/* Table */}
            <Card>
                <Table
                    columns={getCurrentColumns()}
                    dataSource={getCurrentData()}
                    loading={loading}
                    pagination={false}
                    scroll={{ x: 1000 }}
                    rowSelection={activeTab === 'mpn_shortage' ? {
                        selectedRowKeys: selectedRows,
                        onChange: (selectedRowKeys) => setSelectedRows(selectedRowKeys),
                        // selections: [
                        //     Table.SELECTION_ALL,
                        //     Table.SELECTION_INVERT,
                        //     Table.SELECTION_NONE,
                        // ]
                    } : null}
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

export default PurchaseOrderPage;
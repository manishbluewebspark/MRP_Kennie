import React, { useEffect, useState } from "react";
import {
    Table,
    Button,
    Tag,
    message,
    Card,
    Col,
    Radio,
    Row,
    Modal,
} from "antd";
import {
    PlusOutlined,
    CloudDownloadOutlined,
    ExclamationCircleFilled,
    FilterOutlined,
} from "@ant-design/icons";

import { hasPermission } from "utils/auth";
import ActionButtons from "components/ActionButtons";
import GlobalTableActions from "components/GlobalTableActions";
import useDebounce from "utils/debouce";
import GlobalFilterModal from "components/GlobalFilterModal";
import { useNavigate } from "react-router-dom";
import PurchaseOrderService from "services/PurchaseOrderService";
import { useDispatch, useSelector } from "react-redux";
import { fetchSuppliers } from "store/slices/supplierSlice";
import { getAllCurrencies } from "store/slices/currencySlice";

const formatMoney = (amount = 0, currency = "USD") =>
    new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
    }).format(Number(amount || 0));

const customerData = [];
const projectData = [];

const PurchaseOrderPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch()
    const [data, setData] = useState([]);
    const [mpnShortageData, setMpnShortageData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("opening_orders");
    const [selectedRows, setSelectedRows] = useState([]);
    const { suppliers } = useSelector(state => state.suppliers);
    // ---- API CALLS ----

    const fetchWorkOrders = async (params = {}) => {
        const {
            page: p = page,
            limit: l = limit,
            search: s = search,
            activeTab: tab = activeTab,
        } = params;

        setLoading(true);
        try {
            const statusFilter =
                tab === "opening_orders"
                    ? ["Pending", "Emailed"]
                    : tab === "closed_orders"
                        ? "Closed"
                        : undefined;

            const res = await PurchaseOrderService.getAllPurchaseOrders({
                page: p,
                limit: l,
                search: s,
                status: statusFilter,
            });

            setData(res?.data || []);
        } catch (e) {
            console.error(e);
            message.error("Failed to fetch purchase orders");
        } finally {
            setLoading(false);
        }
    };

    const getPurchaseShortageData = async ({
        page = 1,
        limit = 10,
        manufacturer,
        supplier,
    } = {}) => {
        try {
            const res = await PurchaseOrderService.getPurchaseShortageList({
                page,
                limit,
                manufacturer,
                supplier,
            });

            setMpnShortageData(res?.data || []);
        } catch (error) {
            console.error("getPurchaseShortageData error:", error);
            message.error("Failed to fetch MPN shortage list");
        }
    };

    useEffect(() => {
        fetchWorkOrders({ page: 1, limit, search, activeTab });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    useEffect(() => {
        getPurchaseShortageData();
    }, []);

    useEffect(() => {
        dispatch(fetchSuppliers());
        dispatch(getAllCurrencies());
    }, [dispatch]);

    // ---- CLOSE / RESET PO ----

    const confirmClose = (poId) => {
        Modal.confirm({
            title: "Are you sure?",
            content: "Do you really want to close this Purchase Order?",
            okText: "Yes, Close",
            cancelText: "Cancel",
            okType: "danger",
            onOk: () => handleClosePurchaseOrder(poId),
        });
    };

    const confirmResetPO = (poId) => {
        Modal.confirm({
            title: "Re-open Purchase Order?",
            content: "Are you sure you want to open this Purchase Order again?",
            okText: "Yes, Open",
            cancelText: "Cancel",
            okType: "primary",
            onOk: () => handleResetPurchaseOrder(poId),
        });
    };

    const handleResetPurchaseOrder = async (pId) => {
        try {
            const res = await PurchaseOrderService.updatePurchaseOrderstatus(pId, {
                status: "Pending",
            });

            if (res.success) {
                message.success("Purchase Order Opened Successfully");
                fetchWorkOrders();
            } else {
                message.error(res.message || "Failed to reopen PO");
            }
        } catch (err) {
            console.error("Reset PO Error:", err);
            message.error("Something went wrong");
        }
    };

    const handleClosePurchaseOrder = async (poId) => {
        try {
            const res = await PurchaseOrderService.updatePurchaseOrderstatus(poId, {
                status: "Closed",
            });

            if (res.success) {
                message.success("Purchase Order Closed Successfully");
                fetchWorkOrders();
            } else {
                message.error(res.message || "Failed to close PO");
            }
        } catch (err) {
            console.error("Close PO Error:", err);
            message.error("Something went wrong");
        }
    };


    const handleSendMail = async(poId)=>{
         const res = await PurchaseOrderService.sendPurchaseOrderMail(poId);
            if (res.success) {
       
        alert('Purchase Order sent successfully via email with PDF attachment!');
      } else {
        alert('Failed to send Purchase Order: ' + res.error);
      }

    }

    // ---- COLUMNS ----

    const openingOrderColumns = [
        {
            title: "",
            key: "work",
            render: (_, record) => (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* LEFT */}
                    <div style={{ minWidth: 260 }}>
                        <div
                            style={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: "#111827",
                                lineHeight: 1.2,
                            }}
                        >
                            {record?.poNumber || "P25-00010"}
                        </div>

                        <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                            Supplier: {record?.supplier?.companyName || "ABC Pte Ltd"}
                        </div>

                        <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                            Created:{" "}
                            {record?.createdAt
                                ? new Date(record?.createdAt).toLocaleDateString("en-GB")
                                : "-"}
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
                        {formatMoney(
                            record?.totals?.finalAmount,
                            record.currency || "USD"
                        )}
                    </div>
                </div>
            ),
        },
        {
            title: "",
            dataIndex: "status",
            key: "status",
            align: "right",
            width: 140,
            render: (status) => {
                const label = status || "Pending";
                const lower = label.toLowerCase();
                const style =
                    lower === "pending"
                        ? { bg: "#FB923C", color: "#FFFFFF" }
                        : lower === "approved"
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
        {
            title: "",
            key: "actions",
            align: "right",
            width: 220,
            render: (_, record) => (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <ActionButtons
                        onEdit={() => handleEdit(record?._id)}
                        onDelete={() => handleDelete(record?._id)}
                        onInfo={() =>
                            navigate(`/app/purchase/view-purchase-order/${record?._id}`)
                        }
                        onMail={() => {handleSendMail(record?._id) }}
                        onCross={() => {
                            confirmClose(record?._id);
                        }}
                        showEdit
                        showInfo
                        showDelete
                        showDeleteConfirm
                        showCross
                        showMail={record?.status === "Pending"}
                        styleEdit={{
                            background: "#DBEAFE",
                            color: "#1D4ED8",
                            borderRadius: 8,
                            padding: 8,
                        }}
                        styleDelete={{
                            background: "#FEE2E2",
                            color: "#DC2626",
                            borderRadius: 8,
                            padding: 8,
                        }}
                        styleMail={{
                            background: "#E5E7EB",
                            color: "#374151",
                            borderRadius: 8,
                            padding: 8,
                        }}
                        styleCross={{
                            background: "#FEE2E2",
                            color: "#DC2626",
                            borderRadius: 8,
                            padding: 8,
                        }}
                        styleInfo={{
                            background: "#E5E7EB",
                            color: "#111827",
                            borderRadius: 8,
                            padding: 8,
                        }}
                    />
                </div>
            ),
        },
    ];

    // Dummy partial completion data (if you want real, replace with API)
    const partialCompletionData = [];

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
                    {/* LEFT */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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

                        <div style={{ fontSize: 13, color: "#6B7280" }}>
                            Supplier: {record?.supplier || "ABC Pte Ltd"}
                        </div>

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
                                gap: "40px",
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

                    {/* RIGHT BUTTON */}
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

    const closedOrderColumns = [
        {
            title: "",
            dataIndex: "workOrderNo",
            key: "workOrderNo",
            render: (_, record) => (
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
                            {record.poNumber || "P25-00010"}
                        </div>
                        <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                            Supplier: {record?.supplier?.companyName || "ABC Pte Ltd"}
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
                                {record?.createdAt
                                    ? new Date(record?.createdAt).toLocaleDateString("en-GB")
                                    : "-"}
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
                                    gap: "20px",
                                }}
                            >
                                ${Number(record?.totals?.finalAmount || 0).toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: "",
            dataIndex: "status",
            key: "status",
            render: (status) => (
                <Tag
                    color="red"
                    style={{
                        margin: 0,
                        fontSize: "12px",
                        fontWeight: "bold",
                        padding: "2px 8px",
                    }}
                >
                    {status}
                </Tag>
            ),
            align: "center",
        },
        {
            title: "",
            key: "actions",
            width: 120,
            render: (_, record) => (
                <ActionButtons
                    showReset={true}
                    onReset={() => confirmResetPO(record?._id)}
                    showInfo={true}
                    onInfo={() =>
                        navigate(`/app/purchase/view-purchase-order/${record?._id}`)
                    }
                />
            ),
            align: "center",
        },
    ];

    const InfoBlock = ({ label, value }) => (
        <div>
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                {value}
            </div>
        </div>
    );

    const PurchaseShortageCard = ({ record }) => {
        return (
            <div
                style={{
                    width: "100%",
                    borderRadius: 12,
                    padding: "10px 16px",
                    background: "#FFF7F7",
                    border: "1px solid #F5D0D0",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                }}
            >
                <div
                    style={{
                        minWidth: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "#FDE8E8",
                        display: "grid",
                        placeItems: "center",
                        color: "#DC2626",
                        flexShrink: 0,
                        marginTop: 4,
                    }}
                >
                    <ExclamationCircleFilled style={{ fontSize: 18 }} />
                </div>

                <div style={{ flex: 1 }}>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            width: "100%",
                        }}
                    >
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: "#111827",
                                    lineHeight: 1.2,
                                }}
                            >
                                {record.mpn}
                            </div>
                            <div
                                style={{
                                    fontSize: 12,
                                    color: "#6B7280",
                                    marginTop: 2,
                                }}
                            >
                                {record.description}
                            </div>
                        </div>

                        <span
                            style={{
                                background: "#EF4444",
                                color: "white",
                                padding: "2px 10px",
                                borderRadius: 20,
                                fontSize: 11,
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                            }}
                        >
                            Short: {record.shortage} PCS
                        </span>
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, 1fr)",
                            gap: 18,
                            marginTop: 5,
                        }}
                    >
                        <InfoBlock label="Manufacturer" value={record.manufacturer} />
                        <InfoBlock label="Supplier" value={record.supplier} />
                        <InfoBlock
                            label="Current Stock"
                            value={`${record.currentStock} pc`}
                        />
                        <InfoBlock
                            label="Required"
                            value={
                                <span style={{ color: "#DC2626", fontWeight: 700 }}>
                                    {record.required}
                                </span>
                            }
                        />
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 12, color: "#6B7280" }}>
                            Required by Work Orders:
                        </div>

                        <div style={{ marginTop: 2 }}>
                            {(record.requireByWorkOrders || []).map((wo, idx) => (
                                <a
                                    key={idx}
                                    style={{
                                        display: "inline-block",
                                        color: "#1D4ED8",
                                        fontWeight: 600,
                                        fontSize: 12,
                                        marginRight: 10,
                                    }}
                                >
                                    {wo}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const mpnShortageColumns = [
        {
            title: "",
            key: "shortageCard",
            render: (_, record) => <PurchaseShortageCard record={record} />,
        },
    ];

    // ---- CURRENT COLUMNS/DATA ----

    const getCurrentColumns = () => {
        switch (activeTab) {
            case "opening_orders":
                return openingOrderColumns;
            case "partial_completion":
                return partialCompletionColumns;
            case "closed_orders":
                return closedOrderColumns;
            case "mpn_shortage":
                return mpnShortageColumns;
            default:
                return openingOrderColumns;
        }
    };

    const getCurrentData = () => {
        switch (activeTab) {
            case "opening_orders":
                return data;
            case "partial_completion":
                return partialCompletionData;
            case "closed_orders":
                return data;
            case "mpn_shortage":
                return mpnShortageData;
            default:
                return data;
        }
    };

    const getPageTitle = () => {
        switch (activeTab) {
            case "opening_orders":
                return "Opening Purchase Orders";
            case "partial_completion":
                return "Partial Completion Purchase Orders";
            case "closed_orders":
                return "Closed Purchase Orders";
            case "mpn_shortage":
                return "MPN Shortage Items";
            default:
                return "Purchase Orders";
        }
    };

    const getPageDescription = () => {
        switch (activeTab) {
            case "opening_orders":
                return "Active purchase orders that are still open";
            case "partial_completion":
                return "Purchase orders with partial completion status";
            case "closed_orders":
                return "Completed and closed purchase orders";
            case "mpn_shortage":
                return "Items with material shortage that need attention";
            default:
                return "Manage your purchase orders";
        }
    };

    // ---- ROW SELECTION (MPN SHORTAGE) ----

    const handleCreatePOFromShortage = () => {
        if (!selectedRows.length) {
            message.warning("Please select at least one shortage item.");
            return;
        }

        // Selected rows filter
        const selectedItems = mpnShortageData.filter((row) =>
            selectedRows.includes(row.mpnId)
        );

        if (!selectedItems.length) {
            message.error("No valid items found!");
            return;
        }

        // ---- SUPPLIER VALIDATION ----
        const supplierList = selectedItems.map((item) => item.supplierId[0]).filter(Boolean);

        const uniqueSuppliers = [...new Set(supplierList)];

        console.log('------uniqueSuppliers', uniqueSuppliers)

        if (uniqueSuppliers.length > 1) {
            return message.error(
                "You can only create a PO for items from the SAME supplier. Please select items from one supplier only."
            );
        }

        // Selected supplier
        const finalSupplier = uniqueSuppliers[0] || null;

        // ---- Build Payload ----
        const payload = selectedItems.map((item) => ({
            mpnId: item.mpnId,
            mpn: item.mpn,
            required: item.required,
            shortage: item.shortage,
            uom: item.uom,
            manufacturer: item.manufacturer,
            supplierName: item.supplier,
            workOrders: item.requireByWorkOrders || [],
        }));

        // ---- Navigate with data ----
        navigate("/app/purchase/create-purchase-order", {
            state: {
                fromShortage: true,
                shortageItems: payload,
                supplier: finalSupplier,
            },
        });
    };



    // ---- FILTER CONFIG ----

    const filterConfig = [
        {
            type: "select",
            name: "supplier",
            label: "Supplier",
            placeholder: "Select Supplier",
            options: suppliers.map((customer) => ({
                label: customer.companyName,
                value: customer._id,
            })),
        },
        {
            type: "select",
            name: "manufacturer",
            label: "Manufacturer",
            placeholder: "Select Manufacturer",
            options: [
                { label: "Alpha", value: "Alpha" },
                { label: "Molex", value: "Molex" },
                { label: "Lapp", value: "Lapp" },
            ]
        }

    ];

    // ---- HANDLERS ----

    const handleEdit = (id) => {
        navigate(`/app/purchase/edit-purchase-order/${id}`);
    };

    const handleDelete = async (id) => {
        try {
            const res = await PurchaseOrderService.deletePurchaseOrder(id);
            if (res.success) {
                message.success("Purchase Order deleted successfully");
                fetchWorkOrders();
            } else {
                message.error(res.message || "Failed to delete Purchase Order");
            }
        } catch (err) {
            console.error("Delete PO Error:", err);
            message.error("Something went wrong while deleting");
        }
    };

    const handleExport = async () => {
        try {
            // const exportName = "opening_order"; // <-- CHANGE NAME AS NEEDED

            const res = await PurchaseOrderService.exportPurchaseOrders(activeTab);

            if (!res || !res.data) {
                return message.error("Export failed!");
            }

            // Backend is expected to return blob/file
            const blob = new Blob([res.data], { type: "application/octet-stream" });
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = `${activeTab}.xlsx`; // automatic filename
            document.body.appendChild(link);
            link.click();

            window.URL.revokeObjectURL(url);
            link.remove();

            message.success("Exported successfully!");
        } catch (err) {
            console.error("Export error:", err);
            message.error("Failed to export data");
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

    const handleSearch = useDebounce((value) => {
        setPage(1);
        fetchWorkOrders({ page: 1, limit, search: value });
    }, 500);

    const handleFilterSubmit = async (data) => {
        console.log("----- FILTER SUBMIT DATA -----", data);

        const { supplier, manufacturer } = data;

        // Build query object
        const query = {};

        if (supplier) query.supplier = supplier;
        if (manufacturer) query.manufacturer = manufacturer;

        try {
            await getPurchaseShortageData({
                page: 1,
                limit: 10,
                ...query,
            });
            setIsFilterModalOpen(false)
            message.success("Filters applied successfully!");
        } catch (err) {
            console.error("Filter Error:", err);
            message.error("Failed to apply filters");
        }
    };


    return (
        <div>
            {/* HEADER */}
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
                    <h2 style={{ margin: 0 }}>{getPageTitle()}</h2>
                    <p style={{ margin: 0, fontSize: 14, color: "#888" }}>
                        {getPageDescription()}
                    </p>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                    <Button
                        icon={<CloudDownloadOutlined />}
                        onClick={handleExport}
                    >
                        Export
                    </Button>

                    {activeTab === "mpn_shortage" && (
                        <Button icon={<FilterOutlined />} type="default" onClick={() => { setIsFilterModalOpen(true) }}>
                            Filter
                        </Button>
                    )}

                    {activeTab === "mpn_shortage" ? (
                        <Button
                            type="primary"
                            disabled={selectedRows.length === 0}
                            onClick={handleCreatePOFromShortage}
                        >
                            Create PO ({selectedRows.length || 0})
                        </Button>
                    ) : (
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => {
                                navigate("/app/purchase/create-purchase-order");
                            }}
                        >
                            Create PO
                        </Button>
                    )}
                </div>
            </div>

            {/* GLOBAL ACTIONS + TABS */}
            <Row
                justify="space-between"
                align="middle"
                style={{ marginBottom: 16 }}
                gutter={[16, 16]}
            >
                <Col xs={24} md={12} lg={10}>
                    <GlobalTableActions
                        showSearch={true}
                        onSearch={(value) => {
                            setSearch(value);
                            handleSearch(value);
                        }}
                        showExport={false}
                        onExport={handleExport}
                        showFilter={false}
                        onFilter={() => setIsFilterModalOpen(true)}
                        showExportPDF={false}
                        onExportPDF={() => { }}
                    />
                </Col>

                <Col xs={24} md={12} lg={8} style={{ textAlign: "right" }}>
                    <Radio.Group
                        value={activeTab}
                        onChange={(e) => {
                            setActiveTab(e.target.value);
                            setSelectedRows([]); // Tab change par selection reset
                        }}
                        optionType="button"
                        buttonStyle="solid"
                        size="small"
                    >
                        <Radio.Button
                            value="opening_orders"
                            style={{ fontSize: "12px", padding: "0 8px" }}
                        >
                            Opening Orders
                        </Radio.Button>
                        <Radio.Button
                            value="partial_completion"
                            style={{ fontSize: "12px", padding: "0 8px" }}
                        >
                            Partial completion
                        </Radio.Button>
                        <Radio.Button
                            value="closed_orders"
                            style={{ fontSize: "12px", padding: "0 8px" }}
                        >
                            Closed Orders
                        </Radio.Button>
                        <Radio.Button
                            value="mpn_shortage"
                            style={{ fontSize: "12px", padding: "0 8px" }}
                        >
                            MPN Shortage
                        </Radio.Button>
                    </Radio.Group>
                </Col>
            </Row>

            {/* SELECTED ROW INFO BAR */}
            {activeTab === "mpn_shortage" && selectedRows.length > 0 && (
                <div
                    style={{
                        marginBottom: 16,
                        padding: "8px 16px",
                        backgroundColor: "#e6f7ff",
                        border: "1px solid #91d5ff",
                        borderRadius: "6px",
                    }}
                >
                    <span style={{ color: "#1890ff" }}>
                        {selectedRows.length} item(s) selected
                    </span>
                </div>
            )}

            {/* TABLE CARD */}
            <Card>
                <Table
                    rowKey={activeTab === "mpn_shortage" ? "mpnId" : "_id"}
                    columns={getCurrentColumns()}
                    dataSource={getCurrentData()}
                    loading={loading}
                    pagination={false}
                    scroll={{ x: 1000 }}
                    rowSelection={
                        activeTab === "mpn_shortage"
                            ? {
                                type: "checkbox",
                                selectedRowKeys: selectedRows,
                                onChange: (selectedKeys) => setSelectedRows(selectedKeys),
                            }
                            : null
                    }
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

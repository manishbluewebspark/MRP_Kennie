import React, { useEffect, useState } from "react";
import {
    Table,
    Button,
    Tag,
    message,
    Card,
    Col,
    Row,
    Modal,
    Input,
} from "antd";
import {
    CheckOutlined,
    CloseOutlined,
} from "@ant-design/icons";

import GlobalTableActions from "components/GlobalTableActions";
import useDebounce from "utils/debouce";
import { useNavigate } from "react-router-dom";
import PurchaseOrderService from "services/PurchaseOrderService";
import { useDispatch, useSelector } from "react-redux";
import { fetchSuppliers } from "store/slices/supplierSlice";
import { getAllCurrencies } from "store/slices/currencySlice";

const { TextArea } = Input;

const formatMoney = (amount = 0, currency = "USD") =>
    new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
    }).format(Number(amount || 0));

const PurchaseOrderApprovalPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch()
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [selectedPOId, setSelectedPOId] = useState(null);
    
    const { suppliers } = useSelector(state => state.suppliers);

    // ---- API CALLS ----

    const fetchWorkOrders = async (params = {}) => {
        const {
            page: p = page,
            limit: l = limit,
            search: s = search
        } = params;

        setLoading(true);
        try {
            const res = await PurchaseOrderService.getAllPurchaseOrders({
                page: p,
                limit: l,
                search: s,
                status: ["Pending Approval"], // Sirf pending approval wale dikhao
            });

            setData(res?.data || []);
        } catch (e) {
            console.error(e);
            message.error("Failed to fetch purchase orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkOrders({ page: 1, limit, search });
    }, []);

    useEffect(() => {
        dispatch(fetchSuppliers());
        dispatch(getAllCurrencies());
    }, [dispatch]);

    // ---- APPROVAL / REJECTION FUNCTIONS ----

    const handleApprove = (poId) => {
        Modal.confirm({
            title: "Approve Purchase Order",
            content: "Are you sure you want to approve this Purchase Order?",
            okText: "Yes, Approve",
            cancelText: "Cancel",
            okType: "primary",
            onOk: () => processApproval(poId),
        });
    };

    const processApproval = async (poId) => {
        try {
            const res = await PurchaseOrderService.updatePurchaseOrderstatus(poId, {
                status: "Approved",
            });

            if (res.success) {
                message.success("Purchase Order Approved Successfully");
                fetchWorkOrders(); // List refresh karo
            } else {
                message.error(res.message || "Failed to approve PO");
            }
        } catch (err) {
            console.error("Approve PO Error:", err);
            message.error("Something went wrong");
        }
    };

    const showRejectModal = (poId) => {
        setSelectedPOId(poId);
        setRejectReason("");
        setRejectModalVisible(true);
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            message.warning("Please provide a rejection reason");
            return;
        }

        try {
            const res = await PurchaseOrderService.updatePurchaseOrderstatus(selectedPOId, {
                status: "Rejected",
                secondLevelRejectionReason: rejectReason,
            });

            if (res.success) {
                message.success("Purchase Order Rejected Successfully");
                setRejectModalVisible(false);
                setRejectReason("");
                setSelectedPOId(null);
                fetchWorkOrders(); // List refresh karo
            } else {
                message.error(res.message || "Failed to reject PO");
            }
        } catch (err) {
            console.error("Reject PO Error:", err);
            message.error("Something went wrong");
        }
    };

    // ---- COLUMNS ----

    const columns = [
        {
            title: "",
            key: "orderCard",
            width: "100%",
            render: (_, record) => (
                <div
                    style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "#F9FAFB",
                        border: "1px solid #E5E7EB",
                    }}
                >
                    {/* LEFT – DETAILS */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                            style={{
                                fontSize: 15,
                                fontWeight: 700,
                                color: "#111827",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {record?.poNumber || "P25-00010"}
                        </div>

                        <div
                            style={{
                                fontSize: 13,
                                color: "#6B7280",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            Supplier: {record?.supplier?.companyName || "ABC Pte Ltd"}
                        </div>

                        <div style={{ fontSize: 12, color: "#9CA3AF" }}>
                            Created:{" "}
                            {record?.createdAt
                                ? new Date(record.createdAt).toLocaleDateString("en-GB")
                                : "-"}
                        </div>
                    </div>

                    {/* AMOUNT */}
                    <span
                        style={{
                            padding: "4px 10px",
                            borderRadius: 14,
                            fontSize: 12,
                            fontWeight: 700,
                            background: "#EEF2FF",
                            color: "#3730A3",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {formatMoney(record?.totals?.finalAmount, record.currency || "USD")}
                    </span>

                    {/* STATUS */}
                    <span
                        style={{
                            padding: "4px 10px",
                            borderRadius: 14,
                            fontSize: 12,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            background: "#FB923C",
                            color: "#fff",
                        }}
                    >
                        {record?.status || "Pending"}
                    </span>

                    {/* ACTIONS - Approve/Reject/View */}
                    <div style={{ display: "flex", gap: 6 }}>
                        <Button
                            type="primary"
                            icon={<CheckOutlined />}
                            size="small"
                            onClick={() => handleApprove(record?._id)}
                            style={{ backgroundColor: "#22C55E", borderColor: "#22C55E" }}
                        >
                            Approve
                        </Button>
                        <Button
                            danger
                            icon={<CloseOutlined />}
                            size="small"
                            onClick={() => showRejectModal(record?._id)}
                        >
                            Reject
                        </Button>
                        <Button
                            type="link"
                            size="small"
                            onClick={() =>
                                navigate(`/app/purchase/view-purchase-order/${record?._id}`)
                            }
                        >
                            View
                        </Button>
                    </div>
                </div>
            ),
        },
    ];

    // ---- HANDLERS ----

    const handleSearch = useDebounce((value) => {
        setPage(1);
        fetchWorkOrders({ page: 1, limit, search: value });
    }, 500);

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
                    <h2 style={{ margin: 0 }}>Purchase Orders Awaiting Approval</h2>
                    <p style={{ margin: 0, fontSize: 14, color: "#888" }}>
                        Review and approve/reject pending purchase orders
                    </p>
                </div>
            </div>

            {/* SEARCH BAR */}
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
                        showFilter={false}
                    />
                </Col>
            </Row>

            {/* TABLE CARD */}
            <Card>
                <Table
                    rowKey="_id"
                    columns={columns}
                    dataSource={data}
                    loading={loading}
                    pagination={false}
                    scroll={{ x: 1000 }}
                />
            </Card>

            {/* REJECTION REASON MODAL */}
            <Modal
                title="Reject Purchase Order"
                open={rejectModalVisible}
                onOk={handleReject}
                onCancel={() => {
                    setRejectModalVisible(false);
                    setRejectReason("");
                    setSelectedPOId(null);
                }}
                okText="Reject"
                okButtonProps={{ danger: true }}
            >
                <p>Please provide a reason for rejecting this purchase order:</p>
                <TextArea
                    rows={4}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter rejection reason..."
                />
            </Modal>
        </div>
    );
};

export default PurchaseOrderApprovalPage;
// pages/PurchaseHistoryByPeriod.jsx - UPDATED WITH SUMMARY CARDS
import React, { useEffect, useMemo, useState } from "react";
import { Card, Row, Col, Select, DatePicker, Radio, Pagination, message, Skeleton, Statistic } from "antd";
import {
    DollarOutlined,
    ShoppingOutlined,
    TeamOutlined,
    BarChartOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined
} from '@ant-design/icons';
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { fetchSuppliers } from "store/slices/supplierSlice";
import PurchaseOrderService from "services/PurchaseOrderService";
import { useNavigate } from "react-router-dom";

const { Option } = Select;

const money = (n = 0, currency = "USD") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(n || 0));

const chip = (label) => (
    <span style={{
        display: "inline-flex", alignItems: "center", border: "1px solid #D1D5DB",
        background: "#F9FAFB", padding: "2px 10px", borderRadius: 16, fontSize: 13,
        color: "#111827", fontWeight: 600, height: 24,
    }}>{label}</span>
);

const statusPill = (s) => {
    const label = (s || "open").toLowerCase();
    const style =
        label === "pending" || label === "open" ? { bg: "#E5F3FF", color: "#1D4ED8" }
            : label === "closed" || label === "approved" ? { bg: "#DCFCE7", color: "#166534" }
                : { bg: "#F3F4F6", color: "#111827" };
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            padding: "2px 10px", borderRadius: 16, fontSize: 12, fontWeight: 700,
            background: style.bg, color: style.color,
        }}>
            {label.toUpperCase()}
        </span>
    );
};

const PurchaseHistoryByPeriod = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { suppliers = [], loading: suppliersLoading } = useSelector((s) => s.suppliers || {});

    const [periodType, setPeriodType] = useState("month");
    const [year, setYear] = useState(dayjs().year());
    const [month, setMonth] = useState(dayjs().month() + 1);
    const [supplier, setSupplier] = useState();
    const [status, setStatus] = useState();

    const [groups, setGroups] = useState([]);
    const [periodLabel, setPeriodLabel] = useState("");
    const [loading, setLoading] = useState(false);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);

    // ✅ NEW: Summary state
    const [summary, setSummary] = useState({
        totalCount: 0,
        sumSubTotal: 0,
        sumFreight: 0,
        sumTax: 0,
        sumFinal: 0,
        activeSuppliersCount: 0,
        avgOrderValue: 0
    });

    useEffect(() => {
        const loadSuppliers = async () => {
            try {
                await dispatch(fetchSuppliers()).unwrap();
            } catch (error) {
                message.error("Failed to load suppliers");
            }
        };
        loadSuppliers();
    }, [dispatch]);

    const params = useMemo(() => ({
        year,
        month: periodType === "month" ? month : undefined,
        supplier,
        status,
        page,
        limit,
    }), [year, month, periodType, supplier, status, page, limit]);

    // ✅ NEW: Fetch summary data
    const fetchSummary = async () => {
        setSummaryLoading(true);
        try {
            const summaryParams = {
                year,
                month: periodType === "month" ? month : undefined,
                supplier,
                status
            };

            const response = await PurchaseOrderService.getPurchaseOrdersSummaryByPeriod(summaryParams);
            console.log('Summary API Response:', response);

            if (response?.data?.success) {
                setSummary(response.data.summary);
            } else if (response?.success) {
                setSummary(response.summary);
            } else {
                // Fallback to empty summary
                setSummary({
                    totalCount: 0,
                    sumSubTotal: 0,
                    sumFreight: 0,
                    sumTax: 0,
                    sumFinal: 0,
                    activeSuppliersCount: 0,
                    avgOrderValue: 0
                });
            }
        } catch (error) {
            console.error("Failed to fetch summary:", error);
            message.error("Failed to load summary data");
            setSummary({
                totalCount: 0,
                sumSubTotal: 0,
                sumFreight: 0,
                sumTax: 0,
                sumFinal: 0,
                activeSuppliersCount: 0,
                avgOrderValue: 0
            });
        } finally {
            setSummaryLoading(false);
        }
    };

    // ✅ CORRECT: Robust API response handling for history
    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await PurchaseOrderService.getPurchaseOrdersHistory(params);
            console.log('History API Response:', response);

            // Handle different response structures safely
            let data = response?.data;
            if (data?.success && data.data) {
                setGroups(Array.isArray(data.data) ? data.data : []);
                setTotal(data.total || 0);
                setPeriodLabel(data.period || "");
            } else if (data?.data) {
                // Alternative response structure
                setGroups(Array.isArray(data.data) ? data.data : []);
                setTotal(data.total || 0);
                setPeriodLabel(data.period || "");
            } else {
                // Fallback handling
                setGroups(Array.isArray(data) ? data : []);
                setTotal(0);
                setPeriodLabel("");
            }
        } catch (error) {
            console.error("Failed to fetch purchase history:", error);
            message.error("Failed to load purchase history data");
            setGroups([]);
            setTotal(0);
            setPeriodLabel("");
        } finally {
            setLoading(false);
        }
    };

    // ✅ CORRECT: Reset pagination when filters change
    useEffect(() => {
        setPage(1);
    }, [periodType, year, month, supplier, status]);

    // ✅ CORRECT: Fetch both history and summary when params change
    useEffect(() => {
        fetchHistory();
        fetchSummary();
    }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleYearChange = (date) => {
        if (date) {
            setYear(date.year());
        } else {
            setYear(dayjs().year());
        }
    };

    const handleMonthChange = (date) => {
        if (date) {
            setYear(date.year());
            setMonth(date.month() + 1);
        } else {
            setMonth(dayjs().month() + 1);
        }
    };

    // ✅ NEW: Summary Cards Component
    const renderSummaryCards = () => (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            {/* Total Spent Card */}
            <Col xs={24} sm={12} lg={6}>
                <Card
                    size="small"
                    loading={summaryLoading}
                    bodyStyle={{ padding: '16px' }}
                >
                    <Statistic
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B7280', fontSize: '14px' }}>
                                <DollarOutlined />
                                <span>Total Spent</span>
                            </div>
                        }
                        value={summary.sumFinal}
                        formatter={(value) => money(value)}
                        valueStyle={{
                            color: '#10B981',
                            fontSize: '20px',
                            fontWeight: 700
                        }}
                        prefix={<ArrowUpOutlined style={{ fontSize: '14px', marginRight: '4px' }} />}
                    />
                    <div style={{
                        fontSize: '12px',
                        color: '#9CA3AF',
                        marginTop: '8px'
                    }}>
                        {periodType === 'month' ? 'This month' : 'This year'}
                    </div>
                </Card>
            </Col>

            {/* Total Orders Card */}
            <Col xs={24} sm={12} lg={6}>
                <Card
                    size="small"
                    loading={summaryLoading}
                    bodyStyle={{ padding: '16px' }}
                >
                    <Statistic
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B7280', fontSize: '14px' }}>
                                <ShoppingOutlined />
                                <span>Total Orders</span>
                            </div>
                        }
                        value={summary.totalCount}
                        valueStyle={{
                            color: '#3B82F6',
                            fontSize: '20px',
                            fontWeight: 700
                        }}
                    />
                    <div style={{
                        fontSize: '12px',
                        color: '#9CA3AF',
                        marginTop: '8px'
                    }}>
                        Purchase orders
                    </div>
                </Card>
            </Col>

            {/* Active Suppliers Card */}
            <Col xs={24} sm={12} lg={6}>
                <Card
                    size="small"
                    loading={summaryLoading}
                    bodyStyle={{ padding: '16px' }}
                >
                    <Statistic
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B7280', fontSize: '14px' }}>
                                <TeamOutlined />
                                <span>Active Suppliers</span>
                            </div>
                        }
                        value={summary.activeSuppliersCount}
                        valueStyle={{
                            color: '#8B5CF6',
                            fontSize: '20px',
                            fontWeight: 700
                        }}
                    />
                    <div style={{
                        fontSize: '12px',
                        color: '#9CA3AF',
                        marginTop: '8px'
                    }}>
                        Unique vendors
                    </div>
                </Card>
            </Col>

            {/* Avg Order Value Card */}
            <Col xs={24} sm={12} lg={6}>
                <Card
                    size="small"
                    loading={summaryLoading}
                    bodyStyle={{ padding: '16px' }}
                >
                    <Statistic
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B7280', fontSize: '14px' }}>
                                <BarChartOutlined />
                                <span>Avg Order Value</span>
                            </div>
                        }
                        value={summary.avgOrderValue || 0}
                        formatter={(value) => money(value)}
                        valueStyle={{
                            color: '#F59E0B',
                            fontSize: '20px',
                            fontWeight: 700
                        }}
                        prefix={<ArrowUpOutlined style={{ fontSize: '14px', marginRight: '4px' }} />}
                    />
                    <div style={{
                        fontSize: '12px',
                        color: '#9CA3AF',
                        marginTop: '8px'
                    }}>
                        Per purchase order
                    </div>
                </Card>
            </Col>
        </Row>
    );

    return (
        <div>
            {/* ✅ CORRECT: Proper header section */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                    <h2 style={{ margin: 0 }}>
                        {periodType === "month" ? "Purchase History by Month" : "Purchase History by Year"}
                    </h2>
                    <p style={{ margin: 0, fontSize: 14, color: "#888" }}>
                        Total spending breakdown by supplier and time period
                    </p>
                </div>
            </div>

            {/* ✅ NEW: Summary Cards */}
            {renderSummaryCards()}

            {/* ✅ CORRECT: Organized filter section */}
            <Card style={{ marginBottom: 16 }}>
                <Row gutter={[12, 12]}>
                    <Col xs={24} md={8} lg={6}>
                        <div style={{ fontSize: 12, marginBottom: 6, fontWeight: 500 }}>Period Type</div>
                        <Radio.Group
                            value={periodType}
                            onChange={(e) => setPeriodType(e.target.value)}
                            optionType="button"
                            buttonStyle="solid"
                            size="small"
                        >
                            <Radio.Button value="month">Month</Radio.Button>
                            <Radio.Button value="year">Year</Radio.Button>
                        </Radio.Group>
                    </Col>

                    {periodType === "month" ? (
                        <>
                            <Col xs={24} md={8} lg={6}>
                                <div style={{ fontSize: 12, marginBottom: 6, fontWeight: 500 }}>Year</div>
                                <DatePicker
                                    picker="year"
                                    style={{ width: "100%" }}
                                    value={dayjs().year(year)}
                                    onChange={handleYearChange}
                                    disabled={suppliersLoading}
                                />
                            </Col>
                            <Col xs={24} md={8} lg={6}>
                                <div style={{ fontSize: 12, marginBottom: 6, fontWeight: 500 }}>Month</div>
                                <DatePicker
                                    picker="month"
                                    style={{ width: "100%" }}
                                    value={dayjs().year(year).month(month - 1)}
                                    onChange={handleMonthChange}
                                    disabled={suppliersLoading}
                                />
                            </Col>
                        </>
                    ) : (
                        <Col xs={24} md={8} lg={6}>
                            <div style={{ fontSize: 12, marginBottom: 6, fontWeight: 500 }}>Year</div>
                            <DatePicker
                                picker="year"
                                style={{ width: "100%" }}
                                value={dayjs().year(year)}
                                onChange={handleYearChange}
                                disabled={suppliersLoading}
                            />
                        </Col>
                    )}

                    <Col xs={24} md={8} lg={6}>
                        <div style={{ fontSize: 12, marginBottom: 6, fontWeight: 500 }}>Supplier</div>
                        <Select
                            allowClear
                            placeholder="All suppliers"
                            style={{ width: "100%" }}
                            value={supplier}
                            onChange={setSupplier}
                            showSearch
                            optionFilterProp="children"
                            loading={suppliersLoading}
                            disabled={suppliersLoading}
                        >
                            {suppliers.map((s) => (
                                <Option key={s._id} value={s._id}>{s.companyName}</Option>
                            ))}
                        </Select>
                    </Col>
                </Row>
            </Card>

            {/* ✅ CORRECT: Proper loading and empty states */}
            {loading ? (
                <Card><Skeleton active /></Card>
            ) : groups.length === 0 ? (
                <Card>
                    <div style={{ padding: 40, textAlign: "center", color: "#6B7280" }}>
                        No purchase orders found for the selected filters.
                    </div>
                </Card>
            ) : (
                groups.map((g, idx) => (
                    <Card key={g?.supplier?._id || idx} style={{ marginBottom: 12 }} bodyStyle={{ padding: 16 }}>
                        {/* Header Row */}
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                                    {g?.supplier?.companyName || "Unknown Supplier"}
                                </div>
                                <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                                    Period: {periodLabel}
                                </div>
                            </div>
                            <div style={{ textAlign: "right", minWidth: 150 }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                                    {money(g?.totals?.sumFinal || 0)}
                                </div>
                                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                                    {g?.count || 0} {g?.count === 1 ? "order" : "orders"} • Avg: {money((g?.totals?.sumFinal || 0) / (g?.count || 1))}
                                </div>
                            </div>
                        </div>

                        <div style={{ height: 1, background: "#E5E7EB", margin: "12px 0" }} />

                        {/* Orders */}
                        <div style={{ fontSize: 13, color: "#374151", marginBottom: 8, fontWeight: 500 }}>
                            Orders in this period:
                        </div>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                            gap: 12,
                            overflowX: "auto",
                            paddingBottom: 6
                        }}>
                            {(g.orders || []).map((o, i) => (
                                <div key={o.poNumber || i} style={{
                                    border: "1px solid #E5E7EB",
                                    borderRadius: 8,
                                    padding: "12px",
                                    background: "#FFFFFF",
                                    minHeight: 100,
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{o.poNumber || "N/A"}</div>
                                        {chip(money(o.finalAmount || 0))}
                                    </div>
                                    <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>
                                        {o.poDate ? dayjs(o.poDate).format("DD/MM/YYYY") : "No date"}
                                    </div>
                                    <div style={{ marginBottom: 8 }}>{statusPill(o.status)}</div>

                                    <div
                                        onClick={() => navigate(`/app/purchase/view-purchase-order/${o._id}`)}
                                        style={{
                                            fontSize: 12,
                                            color: "#1D4ED8",
                                            cursor: "pointer",
                                            fontWeight: 500,
                                            textDecoration: "underline"
                                        }}
                                    >
                                        View Details
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                ))
            )}

            {/* ✅ CORRECT: Proper pagination */}
            {total > 0 && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                    <Pagination
                        current={page}
                        pageSize={limit}
                        total={total}
                        showSizeChanger
                        showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
                        onChange={(p, l) => {
                            setPage(p);
                            setLimit(l || 10);
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default PurchaseHistoryByPeriod;
import React, { useEffect, useMemo, useState } from "react";
import {
    Table,
    Tag,
    message,
    Card,
    Col,
    Radio,
    Select,
    Row,
} from "antd";
import { WarningOutlined, NumberOutlined } from "@ant-design/icons";
import GlobalTableActions from "components/GlobalTableActions";
import useDebounce from "utils/debouce";
import GlobalFilterModal from "components/GlobalFilterModal";
import WorkOrderService from "services/WorkOrderService";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllMpn } from "store/slices/librarySlice";
import { fetchCustomers } from "store/slices/customerSlice";
import ProjectService from "services/ProjectService";

const { Option } = Select;

const chipStyle = {
    borderRadius: "12px",
    background: "#f5f5f5",
    border: "1px solid #e5e5e5",
    padding: "2px 10px",
    marginRight: 6,
    marginBottom: 6,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
};

const MPNTrackerPage = () => {
    const dispatch = useDispatch();

    const { list: customers } = useSelector((state) => state.customers);
    const { librarys } = useSelector((state) => state);

    const [projectData, setProjectData] = useState([]);

    // ✅ total tab data (grouped)
    const [data, setData] = useState([]);

    // ✅ each tab raw rows
    const [eachMpnData, setEachMpnData] = useState([]);

    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit] = useState(10);

    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("total_mpn_needed");

    // ✅ Each MPN filter bar states
    const [filterType, setFilterType] = useState("show_all_mpns");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);

    // ✅ MPN selection
    const [selectedMpn, setSelectedMpn] = useState(null);

    // -------------------- helpers --------------------

    // ✅ group total tab rows (if backend gives one row per work order)
    const groupTotalMpnRows = (rows = []) => {
        const map = new Map();

        rows.forEach((r) => {
            const mpnKey = r.mpnId || r.mpn;
            if (!mpnKey) return;

            const totalNeeded = Number(r.totalNeeded || 0);
            const currentStock = Number(r.currentStock || 0);
            const wo = r.workOrderNo ? String(r.workOrderNo) : null;

            if (!map.has(mpnKey)) {
                map.set(mpnKey, {
                    _id: mpnKey,
                    mpnId: r.mpnId || null,
                    mpn: r.mpn || "",
                    description: r.description || "",
                    manufacturer: r.manufacturer || "",
                    uom: r.uom || "",
                    totalNeeded: 0,
                    currentStock: currentStock,
                    shortfall: 0,
                    workOrders: [],
                });
            }

            const item = map.get(mpnKey);
            item.totalNeeded += totalNeeded;
            item.currentStock = Math.max(Number(item.currentStock || 0), currentStock);

            if (wo && !item.workOrders.includes(wo)) item.workOrders.push(wo);
            map.set(mpnKey, item);
        });

        return Array.from(map.values()).map((x) => ({
            ...x,
            shortfall: Math.max(0, Number(x.totalNeeded || 0) - Number(x.currentStock || 0)),
        }));
    };

    const renderWorkOrderChips = (workOrders = []) => {
        const arr = Array.isArray(workOrders) ? workOrders : [];
        if (!arr.length) return <span style={{ color: "#999" }}>N/A</span>;

        const first = arr.slice(0, 3);
        const more = arr.length - first.length;

        return (
            <div style={{ display: "flex", flexWrap: "wrap" }}>
                {first.map((w) => (
                    <span key={w} style={chipStyle}>
                        {w}
                    </span>
                ))}
                {more > 0 && (
                    <span style={{ ...chipStyle, background: "#fff" }}>
                        +{more} more
                    </span>
                )}
            </div>
        );
    };

    // ✅ work order dropdown options (auto build from eachMpnData)
    const workOrderOptions = useMemo(() => {
        const map = new Map();

        (eachMpnData || []).forEach((r) => {
            if (r.workOrderId && r.workOrderNo) {
                // 🔑 key = id (unique), value = label
                if (!map.has(String(r.workOrderId))) {
                    map.set(String(r.workOrderId), {
                        value: String(r.workOrderId),   // ✅ _id
                        label: r.workOrderNo,            // ✅ WO number
                    });
                }
            }
        });

        return Array.from(map.values());
    }, [eachMpnData]);


    const eachStats = useMemo(() => {
        const rows = Array.isArray(eachMpnData) ? eachMpnData : [];
        const totalQtyUsed = rows.reduce((sum, r) => sum + Number(r.quantityUsed || 0), 0);
        const drawingSet = new Set(rows.map((r) => (r.drawingNo || "").trim()).filter(Boolean));
        return {
            drawingsAffected: drawingSet.size,
            totalQtyUsed,
            drawings: Array.from(drawingSet),
        };
    }, [eachMpnData]);

    // -------------------- columns --------------------

    const totalMpnColumns = useMemo(() => {
        return [
            {
                title: "MPN Number",
                dataIndex: "mpn",
                key: "mpn",
                sorter: (a, b) => (a.mpn || "").localeCompare(b.mpn || ""),
                render: (text) => <strong style={{ fontSize: 14 }}>{text}</strong>,
            },
            {
                title: "Description",
                dataIndex: "description",
                key: "description",
                render: (text) => <span style={{ fontSize: 13 }}>{text}</span>,
            },
            {
                title: "Manufacturer",
                dataIndex: "manufacturer",
                key: "manufacturer",
                render: (text) => <span style={{ fontSize: 13, color: "#666" }}>{text}</span>,
            },
            {
                title: "UOM",
                dataIndex: "uom",
                key: "uom",
                render: (text) => <Tag color="blue">{text || "N/A"}</Tag>,
            },
            {
                title: "Total Needed",
                dataIndex: "totalNeeded",
                key: "totalNeeded",
                render: (v) => <span style={{ fontSize: 13 }}>{Number(v || 0)}</span>,
            },
            {
                title: "Current Stock",
                dataIndex: "currentStock",
                key: "currentStock",
                render: (v) => <span style={{ fontSize: 13 }}>{Number(v || 0)}</span>,
            },
            {
                title: "Shortfall",
                dataIndex: "shortfall",
                key: "shortfall",
                render: (v) => {
                    const n = Number(v || 0);
                    if (n <= 0) {
                        return (
                            <Tag
                                style={{
                                    borderRadius: 12,
                                    background: "#f6ffed",
                                    color: "#389e0d",
                                    border: "1px solid #b7eb8f",
                                    padding: "2px 10px",
                                }}
                            >
                                0
                            </Tag>
                        );
                    }
                    return (
                        <Tag
                            style={{
                                borderRadius: 12,
                                background: "#ff4d4f",
                                color: "white",
                                border: "none",
                                padding: "2px 10px",
                            }}
                        >
                            {n}
                        </Tag>
                    );
                },
            },
            {
                title: "Work Orders",
                dataIndex: "workOrders",
                key: "workOrders",
                render: (arr) => renderWorkOrderChips(arr),
            },
        ];
    }, []);

    const eachMpnColumns = useMemo(() => {
        return [
            {
                title: "Drawing No",
                dataIndex: "drawingNo",
                key: "drawingNo",
                render: (text) => <span style={{ fontSize: 13 }}>{text}</span>,
            },
            {
                title: "Project Name",
                dataIndex: "projectName",
                key: "projectName",
                render: (text) => <span style={{ fontSize: 13 }}>{text}</span>,
            },
            {
                title: "Work Order No",
                dataIndex: "workOrderNo",
                key: "workOrderNo",
                render: (text) => (
                    <Tag
                        style={{
                            borderRadius: 12,
                            background: "#1890ff",
                            color: "white",
                            border: "none",
                            padding: "2px 10px",
                        }}
                    >
                        {text}
                    </Tag>
                ),
            },
            {
                title: "Quantity Used",
                dataIndex: "quantityUsed",
                key: "quantityUsed",
                render: (text) => <span style={{ fontSize: 13, color: "#333" }}>{text}</span>,
            },
            {
                title: "Need Date",
                dataIndex: "needDate",
                key: "needDate",
                render: (text) => (text ? <span style={{ fontSize: 13 }}>{dayjs(text).format("YYYY-MM-DD")}</span> : "-"),
            },
            {
                title: "Status",
                dataIndex: "status",
                key: "status",
                render: (text) => {
                    const color = text === "on_hold" ? "orange" : text === "completed" ? "green" : "blue";
                    return (
                        <Tag color={color} style={{ borderRadius: 12, padding: "2px 10px" }}>
                            {text}
                        </Tag>
                    );
                },
            },
        ];
    }, []);

    // -------------------- filter config (Total tab modal) --------------------

    const filterConfig = useMemo(() => {
        return [
            { type: "date", name: "drawingDate", label: "Drawing Date", placeholder: "Select Drawing Date" },
            {
                type: "select",
                name: "customer",
                label: "Customer",
                placeholder: "Select Customer",
                options: (customers || []).map((c) => ({ label: c.companyName, value: c._id })),
            },
            {
                type: "select",
                name: "project",
                label: "Project",
                placeholder: "Select Project",
                options: (projectData || []).map((p) => ({ label: p.projectName, value: p._id })),
            },
            {
                type: "select",
                name: "drawingRange",
                label: "Drawing Range",
                placeholder: "Select Drawing Range",
                options: [
                    { value: "range1", label: "0–50" },
                    { value: "range2", label: "51–100" },
                    { value: "range3", label: "101–200" },
                ],
            },
        ];
    }, [customers, projectData]);

    // -------------------- APIs --------------------

    const fetchTotalMpnNeeded = async (params = {}) => {
        setLoading(true);
        try {
            const { page = 1, limit = 10, search = "", customer, project, drawingDate, drawingRange } = params;

            const res = await WorkOrderService.getTotalMPNNeeded({
                page,
                limit,
                search,
                customer,
                project,
                drawingDate,
                drawingRange,
            });

            if (res?.status) {
                const rawList = res.data || [];
                const grouped = groupTotalMpnRows(rawList);
                setData(grouped);
            }
        } catch (err) {
            console.error("Error fetching total MPN needed:", err);
            message.error("Failed to fetch total MPN needed");
        } finally {
            setLoading(false);
        }
    };

    const fetchEachMpnUsage = async (params = {}) => {
        setLoading(true);
        try {
            const res = await WorkOrderService.getEachMPNUsage({
                page: params.page || 1,
                limit: params.limit || 10,
                mpnId: params.mpnId || null,
                customer: params.customer || null,
                project: params.project || null,
                workOrderId: params.workOrderId || null,
                drawingDate: params.drawingDate || null,
                drawingRange: params.drawingRange || null,
            });

            if (res?.status) {
                setEachMpnData(res.data || []);
            } else {
                setEachMpnData([]);
            }
        } catch (err) {
            console.error("Error fetching each MPN usage:", err);
            message.error("Failed to fetch MPN usage");
        } finally {
            setLoading(false);
        }
    };

    const normalizeProjectsResponse = (res) => {
        if (!res) return [];
        const body = res.data ?? res;
        if (body?.success !== undefined) return body.data ?? [];
        if (Array.isArray(body?.data)) return body.data;
        if (Array.isArray(body)) return body;
        return [];
    };

    const fetchProjects = async () => {
        try {
            const res = await ProjectService.getAllProjects({});
            const projects = normalizeProjectsResponse(res);
            setProjectData(projects);
        } catch (err) {
            console.error("Error fetching projects:", err);
            message.error("Failed to fetch projects");
        }
    };

    // -------------------- effects --------------------

    useEffect(() => {
        dispatch(fetchAllMpn());
        dispatch(fetchCustomers());
        fetchProjects();
        fetchTotalMpnNeeded({ page, limit, search });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ✅ set default selected mpn when mpnList arrives
    useEffect(() => {
        if (!selectedMpn && librarys?.mpnList?.length) {
            setSelectedMpn(librarys.mpnList[0]._id);
        }
    }, [librarys?.mpnList, selectedMpn]);

    // -------------------- handlers --------------------

    const isTotalTab = activeTab === "total_mpn_needed";

    const handleTabChange = (value) => {
        setActiveTab(value);
        setPage(1);

        if (value === "total_mpn_needed") {
            fetchTotalMpnNeeded({ page: 1, limit, search });
        } else {
            // each usage: load default if possible
            if (selectedMpn) {
                fetchEachMpnUsage({ page: 1, limit, mpnId: selectedMpn });
            } else {
                setEachMpnData([]);
            }
        }
    };

    const handleSearch = useDebounce((value) => {
        setPage(1);
        setSearch(value);
        if (activeTab === "total_mpn_needed") {
            fetchTotalMpnNeeded({ page: 1, limit, search: value });
        }
    }, 500);

    const handleFilterSubmit = async (filters) => {
        try {
            setIsFilterModalOpen(false);

            const params = {
                page: 1,
                limit,
                search,
                customer: filters.customer,
                project: filters.project,
                drawingDate: filters.drawingDate,
                drawingRange: filters.drawingRange,
            };

            setPage(1);

            if (activeTab === "total_mpn_needed") {
                await fetchTotalMpnNeeded(params);
            }
        } catch (err) {
            console.error("Filter error:", err);
            message.error("Filter failed");
        }
    };

    // ✅ dynamic fetch for Each Usage based on filterType + selected values
    const refetchEachUsage = (overrides = {}) => {
        const mpnId = overrides.mpnId ?? selectedMpn;

        const customer =
            filterType === "by_customer" ? (overrides.customer ?? selectedCustomer) : null;

        const project =
            filterType === "by_project" ? (overrides.project ?? selectedProject) : null;

        const workOrderId =
            filterType === "by_work_order" ? (overrides.workOrderId ?? selectedWorkOrder) : null;

        // show_all_mpns => only mpn filter
        fetchEachMpnUsage({
            page: 1,
            limit,
            mpnId,
            customer,
            project,
            workOrderId,
        });
    };

    // -------------------- computed cards (Total tab) --------------------

    const stats = useMemo(() => {
        if (!isTotalTab) return null;
        const totalMpnsTracked = data.length;
        const mpnsWithShortfall = data.filter((x) => Number(x.shortfall || 0) > 0).length;
        const totalShortfallItems = data.reduce((sum, x) => sum + Number(x.shortfall || 0), 0);
        return { totalMpnsTracked, mpnsWithShortfall, totalShortfallItems };
    }, [data, isTotalTab]);

    return (
        <div>
            {/* Header + Tabs */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                    width: "100%",
                }}
            >
                <div>
                    <h2 style={{ margin: 0 }}>
                        {isTotalTab ? "Total MPN Requirements" : "Each MPN Usage"}
                    </h2>
                    <p style={{ margin: 0, fontSize: 14, color: "#888" }}>
                        {isTotalTab
                            ? "Shows filtered MPN requirements based on selected criteria"
                            : "Usage breakdown per MPN"}
                    </p>
                </div>

                <Col>
                    <Radio.Group
                        value={activeTab}
                        onChange={(e) => handleTabChange(e.target.value)}
                        optionType="button"
                        buttonStyle="solid"
                    >
                        <Radio.Button value="total_mpn_needed">Total MPN Needed</Radio.Button>
                        <Radio.Button value="each_mpn_usage">Each MPN Usage</Radio.Button>
                    </Radio.Group>
                </Col>
            </div>

            {/* ✅ Each MPN Usage filter bar */}
            {activeTab === "each_mpn_usage" && (
                <>
                    <Card style={{ marginBottom: 12, background: "#f5faff", border: "1px solid #d6e4ff" }}>
                        <Row gutter={12} align="middle">
                            {/* Filter Type */}
                            <Col xs={24} md={6}>
                                <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                                    Filter Type
                                </div>
                                <Select
                                    value={filterType}
                                    style={{ width: "100%" }}
                                    onChange={(val) => {
                                        setFilterType(val);
                                        setSelectedCustomer(null);
                                        setSelectedProject(null);
                                        setSelectedWorkOrder(null);

                                        // ✅ refetch based on new type (keep mpn)
                                        setTimeout(() => {
                                            refetchEachUsage();
                                        }, 0);
                                    }}
                                >
                                    <Option value="show_all_mpns">Show All MPNs</Option>
                                    <Option value="by_customer">By Customer</Option>
                                    <Option value="by_project">By Project</Option>
                                    <Option value="by_work_order">By Work Order</Option>
                                </Select>
                            </Col>

                            {/* Dynamic 2nd dropdown */}
                            {filterType === "by_customer" && (
                                <Col xs={24} md={9}>
                                    <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Customer</div>
                                    <Select
                                        placeholder="Select customer"
                                        value={selectedCustomer}
                                        style={{ width: "100%" }}
                                        onChange={(customerId) => {
                                            setSelectedCustomer(customerId);
                                            setPage(1);
                                            refetchEachUsage({ customer: customerId });
                                        }}
                                        showSearch
                                        optionFilterProp="children"
                                    >
                                        {customers?.map((c) => (
                                            <Option key={c._id} value={c._id}>
                                                {c.companyName}
                                            </Option>
                                        ))}
                                    </Select>
                                </Col>
                            )}

                            {filterType === "by_project" && (
                                <Col xs={24} md={9}>
                                    <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Project</div>
                                    <Select
                                        placeholder="Select project"
                                        value={selectedProject}
                                        style={{ width: "100%" }}
                                        onChange={(projectId) => {
                                            setSelectedProject(projectId);
                                            setPage(1);
                                            refetchEachUsage({ project: projectId });
                                        }}
                                        showSearch
                                        optionFilterProp="children"
                                    >
                                        {projectData?.map((p) => (
                                            <Option key={p._id} value={p._id}>
                                                {p.projectName}
                                            </Option>
                                        ))}
                                    </Select>
                                </Col>
                            )}

                            {filterType === "by_work_order" && (
                                <Col xs={24} md={9}>
                                    <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Work Order</div>
                                    <Select
                                        placeholder="Select Work Order"
                                        style={{ width: "100%" }}
                                        onChange={(workOrderId) => {
                                            setSelectedWorkOrder(workOrderId)
                                            setPage(1);
                                            refetchEachUsage({ workOrderId: workOrderId });
                                        }}
                                        showSearch
                                        optionFilterProp="label"
                                    >
                                        {workOrderOptions.map((opt) => (
                                            <Option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </Option>
                                        ))}
                                    </Select>

                                </Col>
                            )}

                            {/* MPN (always shown) */}
                            <Col xs={24} md={filterType === "show_all_mpns" ? 18 : 9}>
                                <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>MPN</div>
                                <Select
                                    placeholder="Select MPN"
                                    value={selectedMpn}
                                    style={{ width: "100%" }}
                                    onChange={(mpnId) => {
                                        setSelectedMpn(mpnId);
                                        setPage(1);
                                        refetchEachUsage({ mpnId });
                                    }}
                                    showSearch
                                    optionFilterProp="children"
                                >
                                    {librarys?.mpnList?.map((m) => (
                                        <Option key={m._id} value={m._id}>
                                            {m.MPN}
                                        </Option>
                                    ))}
                                </Select>
                            </Col>
                        </Row>
                    </Card>

                    {/* ✅ Cards Row */}
                    <Row gutter={12} style={{ marginBottom: 12 }}>
                        <Col xs={24} md={8}>
                            <Card>
                                <div style={{ color: "#666", fontSize: 13 }}>Selected MPN</div>
                                <div style={{ fontSize: 18, fontWeight: 700 }}>
                                    {librarys?.mpnList?.find((m) => String(m._id) === String(selectedMpn))?.MPN || "N/A"}
                                </div>
                                <div style={{ fontSize: 12, color: "#999" }}>
                                    {librarys?.mpnList?.find((m) => String(m._id) === String(selectedMpn))?.Description || ""}
                                </div>
                            </Card>
                        </Col>

                        <Col xs={24} md={8}>
                            <Card>
                                <div style={{ color: "#666", fontSize: 13 }}>Drawings Affected</div>
                                <div style={{ fontSize: 26, fontWeight: 800 }}>{eachStats.drawingsAffected}</div>
                            </Card>
                        </Col>

                        <Col xs={24} md={8}>
                            <Card>
                                <div style={{ color: "#666", fontSize: 13 }}>Total Quantity Used</div>
                                <div style={{ fontSize: 26, fontWeight: 800 }}>{eachStats.totalQtyUsed}</div>
                            </Card>
                        </Col>
                    </Row>

                    {/* ✅ Drawings chips */}
                    <Card style={{ marginBottom: 12, background: "#fff7e6", border: "1px solid #ffd591" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#ad4e00" }}>
                            Drawings Using This MPN
                        </div>
                        <div style={{ fontSize: 13, color: "#d46b08", marginBottom: 12 }}>
                            All drawing numbers that contain this MPN in their material list
                        </div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {eachStats.drawings.length ? (
                                eachStats.drawings.map((d) => (
                                    <Tag
                                        key={d}
                                        style={{
                                            borderRadius: 14,
                                            border: "1px solid #ffa940",
                                            background: "#fff",
                                            padding: "4px 10px",
                                            color: "#ad4e00",
                                        }}
                                    >
                                        {d}
                                    </Tag>
                                ))
                            ) : (
                                <span style={{ color: "#999" }}>No drawings found</span>
                            )}
                        </div>
                    </Card>
                </>
            )}

            {/* ✅ Total tab stats cards */}
            {isTotalTab && stats && (
                <Row gutter={12} style={{ marginBottom: 12 }}>
                    <Col xs={24} md={8}>
                        <Card>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <div style={{ color: "#666", fontSize: 13 }}>Total MPNs Tracked</div>
                                    <div style={{ fontSize: 26, fontWeight: 700 }}>{stats.totalMpnsTracked}</div>
                                </div>
                                <NumberOutlined style={{ fontSize: 26, color: "#1890ff" }} />
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} md={8}>
                        <Card>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <div style={{ color: "#666", fontSize: 13 }}>MPNs with Shortfall</div>
                                    <div style={{ fontSize: 26, fontWeight: 700, color: "#ff4d4f" }}>
                                        {stats.mpnsWithShortfall}
                                    </div>
                                </div>
                                <WarningOutlined style={{ fontSize: 26, color: "#ff4d4f" }} />
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} md={8}>
                        <Card>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <div style={{ color: "#666", fontSize: 13 }}>Total Shortfall Items</div>
                                    <div style={{ fontSize: 26, fontWeight: 700, color: "#ff4d4f" }}>
                                        {stats.totalShortfallItems}
                                    </div>
                                </div>
                                <span style={{ fontSize: 26, color: "#ff4d4f" }}>↗</span>
                            </div>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Global Actions */}
            <GlobalTableActions
                showSearch={isTotalTab}
                onSearch={(value) => {
                    setSearch(value);
                    handleSearch(value);
                }}
                showImport={false}
                showExport={true}
                onExport={() => message.info("Export function same as your old one (call your export API here).")}
                showFilter={isTotalTab}
                onFilter={() => setIsFilterModalOpen(true)}
            />

            {/* Table */}
            <Card style={{ marginTop: 10 }}>
                <Table
                    columns={isTotalTab ? totalMpnColumns : eachMpnColumns}
                    dataSource={isTotalTab ? data : eachMpnData}
                    loading={loading}
                    rowKey={(record) => record._id || record.mpnId || record.mpn || Math.random()}
                    pagination={false}
                />
            </Card>

            {/* Total tab filter modal */}
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

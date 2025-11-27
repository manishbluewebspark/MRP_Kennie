import React, { useEffect, useState } from "react";
import {
    Table,
    Button,
    Space,
    Tag,
    message,
    Card,
    Input,
    Checkbox,
    Col,
    Radio,
    Select,
} from "antd";
import {
    EditOutlined,
    DeleteOutlined,
    PlusOutlined,
} from "@ant-design/icons";
import { hasPermission } from "utils/auth";
import ActionButtons from "components/ActionButtons";
import GlobalTableActions from "components/GlobalTableActions";
import useDebounce from "utils/debouce";
import GlobalFilterModal from "components/GlobalFilterModal";
import WorkOrderService from "services/WorkOrderService";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllMpn } from "store/slices/librarySlice";
import { fetchCustomers } from "store/slices/customerSlice";
import { fetchProjects } from "store/slices/ProjectSlice";
import ProjectService from "services/ProjectService";

// Badge render helper
const renderBadge = (text, type) => {
    let color;
    switch (type) {
        case "status":
            color =
                text === "Active"
                    ? "green"
                    : text === "Completed"
                        ? "blue"
                        : "red";
            break;
        case "priority":
            color =
                text === "High"
                    ? "red"
                    : text === "Medium"
                        ? "orange"
                        : "green";
            break;
        default:
            color = "gray";
    }
    return <Tag color={color}>{text}</Tag>;
};



const { Option } = Select;
const MPNTrackerPage = () => {
    const { list } = useSelector((state) => state.customers)
    const [projectData, setProjectData] = useState([])
    const dispatch = useDispatch()
    const { librarys } = useSelector((state) => state);
    const [data, setData] = useState([]); // Total MPN Needed data
    const [eachMpnData, setEachMpnData] = useState([]); // Each MPN Usage data
    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("total_mpn_needed");

    // Dropdown for MPN
    const [mpnOptions, setMpnOptions] = useState([]);
    const [selectedMpn, setSelectedMpn] = useState(librarys?.mpnList[0]?._id);

    // ================== COLUMNS ==================

    // Total MPN Needed columns
    const totalMpnColumns = [
        {
            title: "MPN Number",
            dataIndex: "mpn",
            key: "mpn",
            sorter: (a, b) => (a.mpn || "").localeCompare(b.mpn || ""),
            render: (text) => (
                <strong style={{ fontSize: "14px" }}>{text}</strong>
            ),
        },
        {
            title: "Description",
            dataIndex: "description",
            key: "description",
            render: (text) => (
                <span style={{ fontSize: "13px" }}>{text}</span>
            ),
        },
        {
            title: "Manufacturer",
            dataIndex: "manufacturer",
            key: "manufacturer",
            render: (text) => (
                <span style={{ fontSize: "13px", color: "#666" }}>{text}</span>
            ),
        },
        {
            title: "UoM",
            dataIndex: "uom",
            key: "uom",
            render: (text) => <Tag color="blue">{text}</Tag>,
        },
        {
            title: "Total Needed",
            dataIndex: "totalNeeded",
            key: "totalNeeded",
            render: (text) => (
                <span style={{ fontSize: "13px", color: "#666" }}>{text}</span>
            ),
        },
        {
            title: "Current Stock",
            dataIndex: "currentStock",
            key: "currentStock",
            render: (text) => (
                <span style={{ fontSize: "13px", color: "#666" }}>{text}</span>
            ),
        },
        {
            title: "Shortfall",
            dataIndex: "shortfall",
            key: "shortfall",
            render: (text) => (
                <Tag
                    color="red"
                    style={{
                        borderRadius: "12px",
                        background: "#ff4d4f",
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
            title: "Work Order",
            dataIndex: "workOrderNo",
            key: "workOrderNo",
            render: (text) => (
                <Tag
                    style={{
                        borderRadius: "12px",
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
    ];

    // Each MPN Usage columns
    const eachMpnColumns = [
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
            render: (text) => (
                <span style={{ fontSize: 13, color: "#333" }}>{text}</span>
            ),
        },
        {
            title: "Need Date",
            dataIndex: "needDate",
            key: "needDate",
            render: (text) =>
                text ? (
                    <span style={{ fontSize: 13 }}>
                        {dayjs(text).format("YYYY-MM-DD")}
                    </span>
                ) : (
                    "-"
                ),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (text) => {
                const color =
                    text === "on_hold"
                        ? "orange"
                        : text === "completed"
                            ? "green"
                            : "blue";
                return (
                    <Tag
                        color={color}
                        style={{ borderRadius: 12, padding: "2px 10px" }}
                    >
                        {text}
                    </Tag>
                );
            },
        },
    ];

    const filterConfig = [
        {
            type: "date",
            name: "drawingDate",
            label: "Drawing Date",
            placeholder: "Select Drawing Date",
        },
        {
            type: "select",
            name: "customer",
            label: "Customer",
            placeholder: "Select Customer",
            options: list?.map((customer) => ({
                label: customer.companyName,
                value: customer._id,
            })),
        },
        {
            type: "select",
            name: "project",
            label: "Project",
            placeholder: "Select Project",
            options: projectData.map((project) => ({
                label: project.projectName,
                value: project._id,
            })),
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

    // ================== API CALLS ==================

    const fetchTotalMpnNeeded = async (params = {}) => {
        setLoading(true);
        try {
            const { page = 1, limit = 10, search = "",customer,project } = params;
            const res = await WorkOrderService.getTotalMPNNeeded({
                page,
                limit,
                search,
                project,
                customer
            });

            if (res?.status) {
                const list = res.data || [];
                setData(list);

                // Build MPN dropdown options from total list
                // Assume each row has mpnId (backend se bhejna hoga)
                const mpnMap = new Map();
                list.forEach((item) => {
                    const key = item.mpnId || item.mpn;
                    if (!key) return;
                    if (!mpnMap.has(key)) {
                        mpnMap.set(key, {
                            label: `${item.mpn} ${item.description ? `- ${item.description}` : ""
                                }`,
                            value: key,
                        });
                    }
                });
                setMpnOptions(Array.from(mpnMap.values()));
            }
        } catch (err) {
            console.error("Error fetching total MPN needed:", err);
            message.error("Failed to fetch total MPN needed");
        } finally {
            setLoading(false);
        }
    };

    const fetchEachMpnUsage = async (mpnId, params = {}) => {
        if (!mpnId) {
            console.log("❌ No MPN ID selected");
            return;
        }

        setLoading(true);
        try {
            const { page = 1, limit = 10 } = params;
            const res = await WorkOrderService.getEachMPNUsage({
                mpnId,
                page,
                limit,
            });

            if (res?.status) {
                setEachMpnData(res.data || []);
            }
        } catch (err) {
            console.error("Error fetching each MPN usage:", err);
            message.error("Failed to fetch MPN usage");
        } finally {
            setLoading(false);
        }
    };

    // ================== EFFECTS ==================

    useEffect(() => {
        // default tab: Total MPN Needed
        fetchTotalMpnNeeded({ page, limit, search });
        dispatch(fetchAllMpn());
        dispatch(fetchCustomers())
        fetchProjects()
    }, []);

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

    // When tab changes
    const handleTabChange = (value) => {
        setActiveTab(value);
        if (value === "total_mpn_needed") {
            // refresh total tab
            fetchTotalMpnNeeded({ page: 1, limit, search });
            setPage(1);
        } else if (value === "each_mpn_usage") {
            // if already selected MPN, load its usage
            if (selectedMpn) {
                fetchEachMpnUsage(selectedMpn, { page: 1, limit });
                setPage(1);
            }
        }
    };

    // ================== HANDLERS ==================

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

        let params = {
            page: 1,
            limit,
            search,
        };

        // 🔹 Drawing Date (convert to ISO start-end range)
        if (filters.drawingDate) {
            params.drawingDate = filters.drawingDate; 
        }

        // 🔹 Customer
        if (filters.customer) {
            params.customer = filters.customer;
        }

        // 🔹 Project
        if (filters.project) {
            params.project = filters.project;
        }

        // 🔹 Drawing Range (range1 → server me handle)
        if (filters.drawingRange) {
            params.drawingRange = filters.drawingRange;
        }

        setPage(1);

        if (activeTab === "total_mpn_needed") {
            await fetchTotalMpnNeeded(params);
        } else if (activeTab === "each_mpn_usage") {
            if (!selectedMpn) {
                message.warning("Please select MPN first");
                return;
            }
            await fetchEachMpnUsage(selectedMpn, params);
        }

    } catch (err) {
        console.error("Filter error:", err);
        message.error("Filter failed");
    }
};


    const handleExport = async () => {
        try {
            if (activeTab === "total_mpn_needed") {
                const res = await WorkOrderService.exportGetTotalMPNNeeded();

                const blob = new Blob([res.data], {
                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                });

                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "total_mpn_needed.xlsx";
                a.click();
                window.URL.revokeObjectURL(url);

                message.success("Total MPN Needed Exported!");
            }
            else if (activeTab === "each_mpn_usage") {

                if (!selectedMpn) {
                    message.warning("Please select an MPN!");
                    return;
                }

                const res = await WorkOrderService.exportGetEachMPNUsage({
                    mpnId: selectedMpn,
                });

                const blob = new Blob([res.data], {
                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                });

                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "each_mpn_usage.xlsx";
                a.click();
                window.URL.revokeObjectURL(url);

                message.success("Each MPN Usage Exported!");
            }
        } catch (err) {
            console.error("Export error:", err);
            message.error("Failed to export");
        }
    };




    const handleImport = async (file) => {
        try {
            console.log("Importing file:", file);
            message.success("Import triggered");
        } catch (err) {
            console.error("Error importing:", err);
            message.error("Failed to import");
        }
    };

    // ================== RENDER ==================

    const isTotalTab = activeTab === "total_mpn_needed";

    return (
        <div>
            {/* Header Section */}
            {/* Header + Tabs Row */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                    width: "100%",
                }}
            >
                <div>
                    <h2 style={{ margin: 0 }}>
                        {isTotalTab ? "Total MPN Requirement" : "Each MPN Usage"}
                    </h2>
                    <p style={{ margin: 0, fontSize: 14, color: "#888" }}>
                        {isTotalTab ? "All MPN List" : "Usage breakdown per MPN"}
                    </p>
                </div>

                <Col>
                    <Radio.Group
                        value={activeTab}
                        onChange={(e) => handleTabChange(e.target.value)}
                        optionType="button"
                        buttonStyle="solid"
                    >
                        <Radio.Button value="total_mpn_needed">
                            Total MPN Needed
                        </Radio.Button>
                        <Radio.Button value="each_mpn_usage">
                            Each MPN Usage
                        </Radio.Button>
                    </Radio.Group>
                </Col>
            </div>

            {/* 🔻 Select row – tabs ke niche, sirf each_mpn_usage pe */}
            {activeTab === "each_mpn_usage" && (
                <div
                    style={{
                        marginBottom: 16,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                    }}
                >
                    {/* <span style={{ fontSize: 14, fontWeight: 500 }}>Select MPN:</span> */}
                    <Select
                        placeholder="Select MPN"
                        value={selectedMpn} // store _id
                        onChange={(value) => {
                            setSelectedMpn(value);
                            setPage(1);
                            fetchEachMpnUsage(value, { page: 1, limit });
                        }}
                        style={{ minWidth: 260 }}
                        showSearch
                        optionFilterProp="children"
                    >
                        {librarys?.mpnList?.map((opt) => (
                            <Option key={opt._id} value={opt._id}>
                                {opt.MPN}
                            </Option>
                        ))}
                    </Select>
                </div>
            )}


            {/* Global Table Actions */}
            <GlobalTableActions
                showSearch={isTotalTab}            // search sirf Total tab me
                onSearch={(value) => {
                    setSearch(value);
                    handleSearch(value);
                }}
                showImport={false}                 // abhi disable, chahe to on kar sakte ho
                onImport={(file) => handleImport(file)}
                showExport={true}
                onExport={() => handleExport()}
                showFilter={isTotalTab}
                onFilter={() => {
                    setIsFilterModalOpen(true);
                }}
            />

            {/* Table */}
            <Card>
                <Table
                    columns={isTotalTab ? totalMpnColumns : eachMpnColumns}
                    dataSource={isTotalTab ? data : eachMpnData}
                    loading={loading}
                    rowKey={(record, index) => record._id || index}
                // pagination add karna ho to niche branch wise laga sakte ho
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

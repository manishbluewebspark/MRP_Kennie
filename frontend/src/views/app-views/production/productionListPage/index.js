import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Row,
  Col,
  Input,
  Space,
  Typography,
  Tag,
  Radio,
  Card,
  Divider,
  Progress,
  Tooltip,
  message,
  Select,
} from "antd";
import {
  CalendarOutlined,
  UserOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  ToolOutlined,
  BarcodeOutlined,
  ApartmentOutlined,
  EyeOutlined,
  SearchOutlined,
  SettingOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import useDebounce from "utils/debouce";
import {
  addSkillLevelCosting,
  deleteSkillLevelCosting,
  fetchSkillLevelCostings,
  updateSkillLevelCosting,
} from "store/slices/skillLevelCostingSlice";
import SkillLevelCostingService from "services/SkillLevelCostingService";
import PickingDetailModal from "../PickingDetailModal";
import WorkOrderService from "services/WorkOrderService";
import InventoryService from "services/InventoryService";
import GlobalFilterModal from "components/GlobalFilterModal";
import { fetchCustomers } from "store/slices/customerSlice";
import { hasPermission } from "utils/auth";
import { useLocation } from "react-router-dom";
const { Option } = Select;
const { Title, Text } = Typography;

// ---------------- Info Item Component ----------------
const InfoItem = ({ label, value, icon }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
    <span style={{ color: "#1890ff", fontSize: 13 }}>{icon}</span>
    <span style={{ color: "#666", fontSize: 12 }}>{label}:</span>
    <span style={{ color: "#000", fontWeight: 500, fontSize: 12 }}>
      {value}
    </span>
  </div>
);

const formatProjectType = (str) => {
  if (!str) return "";
  return str
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
};

const formatDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const statusTagColor = (status, isInProduction) => {
  if (isInProduction) return "blue";
  switch ((status || "").toLowerCase()) {
    case "in_progress":
      return "blue";
    case "open":
    case "released":
      return "gold";
    case "completed":
    case "done":
      return "green";
    case "cancelled":
    case "closed":
      return "red";
    default:
      return "default";
  }
};

const STAGE_PERMISSION_MAP = {
  "Box Build": {
    picking: "production.box_build:picking_process",
    assembly: "production.box_build:assembly",
    quality_check: "production.box_build:qc",
  },
  "Cable Harness": {
    picking: "production.cable_harness_assembly:picking_process",
    cable_harness: "production.cable_harness_assembly:cable_harness",
    labelling: "production.cable_harness_assembly:labelling",
    quality_check: "production.cable_harness_assembly:qc",
    packing: "production.cable_harness_assembly:packing",
  },
  "Others": {
    picking_assembly: "production.other_assembly:picking_assembly_process",
    quality_check: "production.other_assembly:qc",
  },
};


// ---------------- Cable Assembly Card ----------------
const CableAssemblyCard = ({
  record,
  setModalVisible,
  setSelectWorkOrderData,
  setActiveStage,
}) => {
  // console.log('-----record', record)
  const need = formatDate(record?.needDate);
  const commit = formatDate(record?.commitDate);
  const statusColor = statusTagColor(record?.status, record?.isInProduction);



  // ------- Stage Config + Summary -------

  const getStageConfig = (projectType) => {
    const formatted = formatProjectType(projectType); // "Box Build" | "Cable Harness" | etc

    if (formatted === "Box Build") {
      return [
        { label: "Picking", key: "picking" },
        { label: "Assembly", key: "assembly" },
        { label: "Quality Check", key: "quality_check" },
      ];
    }

    if (formatted === "Others") {
      return [
        { label: "Picking/Assembly", key: "picking_assembly" },
        { label: "Quality Check", key: "quality_check" },
      ];
    }

    // Default (Cable Harness)
    return [
      { label: "Picking", key: "picking" },
      { label: "Cable Harness", key: "cable_harness" }, // same process key
      { label: "Labelling", key: "labelling" },
      { label: "Quality Check", key: "quality_check" },
    ];
  };

  const getStageIcon = (key) => {
    switch (key) {
      case "picking":
        return <BarcodeOutlined />;
      case "assembly":
        return <ToolOutlined />;
      case "labelling":
        return <FileTextOutlined />;
      case "quality_check":
        return <FileDoneOutlined />;
      default:
        return <ToolOutlined />;
    }
  };

  // record = work order row (jisme processHistory, quantity, status, etc)
  const getStageSummary = (record) => {
    const qtyRequired = Number(record.quantity || 0) || 0;
    const history = record.processHistory || [];
    const STAGE_CONFIG = getStageConfig(record.projectType);

    const projectType = formatProjectType(record.projectType);
    const permissionConfig = STAGE_PERMISSION_MAP[projectType] || {};

    const stages = STAGE_CONFIG.map((stage) => {
      const entry = history.find((p) => p.process === stage.key);

      const doneRaw = Number(entry?.qty || 0);

      const doneQty =
        qtyRequired > 0 ? Math.min(doneRaw, qtyRequired) : doneRaw;

      const outstandingQty =
        qtyRequired > 0 ? Math.max(qtyRequired - doneQty, 0) : 0;

      // ✅ stage exist check
      const stageStarted = !!entry;

      let status = "new";

      if (!stageStarted) {
        status = "new";
      }
      else if (doneQty >= qtyRequired && qtyRequired > 0) {
        status = "completed";
      }
      else {
        status = "in_progress";
      }

      return {
        ...stage,
        icon: getStageIcon(stage.key),
        doneQty,
        outstandingQty,
        status,
        permission: permissionConfig[stage.key] || null,
      };
    });

    // Active stage = first not completed, else last
    const firstNotCompleted = stages.find((s) => s.status !== "completed");
    const activeKey = firstNotCompleted
      ? firstNotCompleted.key
      : stages.length
        ? stages[stages.length - 1].key
        : null;

    return { stages, activeKey };
  };

  const getOverallProgress = (record) => {
    const { stages } = getStageSummary(record);
    if (!stages.length) return 0;

    const qtyRequired = Number(record.quantity || 0) || 1;

    const totalRatio =
      stages.reduce((sum, s) => {
        const ratio =
          qtyRequired > 0 ? Math.min(1, s.doneQty / qtyRequired) : 0;
        return sum + ratio;
      }, 0) / stages.length;

    return Math.round(totalRatio * 100);
  };

  const progress = getOverallProgress(record);
  const { stages, activeKey } = getStageSummary(record);


  return (
    <>
      {/* blink anim once per card */}
      <style>
        {`
          @keyframes blinkStage {
            0% { opacity: 1; }
            50% { opacity: 0.4; }
            100% { opacity: 1; }
          }
        `}
      </style>

      <Card
        bordered={false}
        style={{
          border: "1px solid #e0e0e0",
          borderRadius: 10,
          boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
        }}
        bodyStyle={{ padding: 8 }}
        title={
          <Row justify="space-between" align="top">
            {/* Left Section */}
            <Col>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* <FileTextOutlined style={{ color: "#1890ff", fontSize: 18 }} /> */}

                <div style={{ display: "flex", flexDirection: "column" }}>

                  {/* Top Row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
                      Drawing - {record?.drawingNo || "-"}
                    </span>

                    <Tag color="purple" style={{ fontSize: 11, padding: "6 6px" }}>
                      Qty: {record?.quantity ?? 0}
                    </Tag>
                  </div>

                  {/* Description */}
                  <span
                    style={{
                      fontSize: 13,
                      color: "#666",
                      marginTop: 2,
                      lineHeight: "18px",
                    }}
                  >
                    Description:- {record?.description || "No description"}
                  </span>

                </div>
              </div>
            </Col>

            {/* Right Section */}
            <Col>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 4,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <CalendarOutlined
                    style={{ color: "#1890ff", fontSize: 14 }}
                  />
                  <span
                    style={{ fontSize: 12, color: "#333", fontWeight: 500 }}
                  >
                    Need: {need}
                  </span>
                  <span style={{ fontSize: 12, color: "#999" }}>
                    &nbsp;|&nbsp;
                  </span>
                  <span
                    style={{ fontSize: 12, color: "#333", fontWeight: 500 }}
                  >
                    Commit: {commit}
                  </span>
                </div>

                {/* <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Tag
                    color={statusColor}
                    style={{ fontWeight: 500, fontSize: 11, padding: "0 6px" }}
                  >
                    {record?.isInProduction
                      ? "In Production"
                      : record?.status || "-"}
                  </Tag>
                  <EyeOutlined style={{ fontSize: 20, color: "#1890ff" }} />
                </div> */}
              </div>
            </Col>
          </Row>
        }
      >
        {/* Cable Assembly Info */}
        <div>
          {/* <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#000",
              marginBottom: 6,
            }}
          >
            <ToolOutlined style={{ marginRight: 5, color: "#1890ff" }} />
            {formatProjectType(record?.projectType)} Details
          </h3> */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 6,
            }}
          >
            <InfoItem
              label="Work Order No"
              value={record?.workOrderNo}
              icon={<FileDoneOutlined />}
            />
            <InfoItem
              label="PO No"
              value={record?.poNumber}
              icon={<BarcodeOutlined />}
            />
            <InfoItem
              label="POS No"
              value={record?.posNo}
              icon={<BarcodeOutlined />}
            />
            {/* <InfoItem
              label="Work Order No"
              value={record?.workOrderNo}
              icon={<ApartmentOutlined />}
            /> */}
            <InfoItem
              label="Project"
              value={record?.projectName}
              icon={<ApartmentOutlined />}
            />
            <InfoItem
              label="Customer"
              value={record?.companyName || "N/A"}
              icon={<UserOutlined />}
            />
          </div>
        </div>

        <Divider style={{ margin: "8px 0" }} />

        {/* Production Workflow */}
        {/* <div>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#000",
              marginBottom: 6,
            }}
          >
            Production Workflow{" "}
            <span
              style={{
                color: "#888",
                fontWeight: "normal",
                fontSize: 11,
              }}
            >
              (Picking & Assembly can run concurrently)
            </span>
          </h3>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            {stages.map((stage, index) => {
              const isActive = stage.key === activeKey;
              const { status } = stage;

              // 🎨 Base colours
              let bg = "#f5f5f5";
              let textColor = "#555";
              let borderColor = 'white';
              let boxShadow = ''

              const sequenceAllowed = index === 0 || stages.slice(0, index).every(s => s.status === "completed");
              const permissionAllowed = hasPermission(
                stage.permission
              );

              // console.log('-----permissionAllowed', stage.permission, permissionAllowed)

              // const canClick =
              //   permissionAllowed &&
              //   sequenceAllowed &&
              //   (stage.status === "new" || stage.status === "in_progress");

              const canClick = permissionAllowed;

              // const canClick = sequenceAllowed && (status === "new" || status === "in_progress");
              // Completed = solid green (no blink)
              if (status === "completed") {
                bg = "#2e7d32";       // dark green
                textColor = "#fff";
              }

              // Active stage (new / in_progress) = green + blink
              if (isActive && status !== "completed") {
                bg = "#DBEAFE";       // bright green
                textColor = "black";
                borderColor = '#93c5fd'
                boxShadow = 'rgba(59, 130, 246, 0.8) 0px 0px 9.97317px 0px'
              }

              if (status === "in_progress") {
                bg = "#f59e0b";       // bright green
                textColor = "white";
                borderColor = '#f59e0b'
                boxShadow = 'rgba(185, 125, 53, 0.8) 0px 0px 9.97317px 0px'
              }




              return (
                <Tooltip
                  key={stage.key}
                  // title={`Stage: ${stage.label} | Done: ${stage.doneQty}/${record.quantity}`}
                  title={
                    !permissionAllowed
                      ? "You do not have permission for this stage"
                      : `${stage.label}: ${stage.doneQty}/${record.quantity}`
                  }
                >
                  <div
                    onClick={() => {
                      if (!canClick) return;
                      setModalVisible(true);
                      setSelectWorkOrderData(record);
                      setActiveStage({
                        name: stage.label,
                        status: stage.status,
                      });
                    }}
                    style={{
                      width: 350,
                      height: 72,
                      borderRadius: 10,
                      border: borderColor,
                      background: bg,
                      color: textColor,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: canClick ? "pointer" : "not-allowed",
                      boxShadow:
                        status === "completed"
                          ? "0 2px 4px rgba(0,0,0,0.18)"
                          : "0 1px 3px rgba(0,0,0,0.12)",
                      transform:
                        isActive && status !== "completed"
                          ? "translateY(-2px)"
                          : "none",
                      animation:
                        isActive && status !== "completed" && status !== "in_progress"
                          ? "blinkStage 1.1s infinite"
                          : "none",

                      transition: "all 0.2s ease-out",

                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{stage.icon}</span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: textColor,
                        }}
                      >
                        {stage.label}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        opacity: 0.9,
                      }}
                    >
                      {stage.doneQty} Done,&nbsp;
                      {stage.outstandingQty} Outstanding
                    </div>
                  </div>
                </Tooltip>
              );
            })}

          </div>
        </div> */}

        {/* Production Workflow */}
        <div>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#000",
              marginBottom: 6,
            }}
          >
            Production Workflow{" "}
            <span
              style={{
                color: "#888",
                fontWeight: "normal",
                fontSize: 11,
              }}
            >
              (Picking & Assembly can run concurrently)
            </span>
          </h3>

          <div
            style={{
              display: "flex",
              flexWrap: "nowrap",
              gap: 8,
              width: "100%", // Ensure full width
            }}
          >
            {stages.map((stage, index) => {
              const isActive = stage.key === activeKey;
              const { status } = stage;

              // 🎨 Base colours
              let bg = "#f5f5f5";
              let textColor = "#555";
              let borderColor = 'white';
              let boxShadow = ''

              const sequenceAllowed = index === 0 || stages.slice(0, index).every(s => s.status === "completed");
              const permissionAllowed = hasPermission(
                stage.permission
              );

              const canClick = permissionAllowed;

              // Completed = solid green (no blink)
              if (status === "completed") {
                bg = "#2e7d32";       // dark green
                textColor = "#fff";
              }

              // Active stage (new / in_progress) = green + blink
              if (isActive && status !== "completed") {
                bg = "#DBEAFE";       // bright green
                textColor = "black";
                borderColor = '#93c5fd'
                boxShadow = 'rgba(59, 130, 246, 0.8) 0px 0px 9.97317px 0px'
              }

              if (status === "in_progress") {
                bg = "#f59e0b";       // bright green
                textColor = "white";
                borderColor = '#f59e0b'
                boxShadow = 'rgba(185, 125, 53, 0.8) 0px 0px 9.97317px 0px'
              }

              // Calculate dynamic width based on number of stages
              const stageWidth = `${100 / stages.length}%`;

              return (
                <Tooltip
                  key={stage.key}
                  title={
                    !permissionAllowed
                      ? "You do not have permission for this stage"
                      : `${stage.label}: ${stage.doneQty}/${record.quantity}`
                  }
                >
                  <div
                    onClick={() => {
                      if (!canClick) return;
                      setModalVisible(true);
                      setSelectWorkOrderData(record);
                      setActiveStage({
                        name: stage.label,
                        status: stage.status,
                      });
                    }}
                    style={{
                      width: stageWidth, // Dynamic width based on number of stages
                      height: "60px", // Reduced height
                      borderRadius: 8,
                      border: `2px solid ${borderColor}`,
                      background: bg,
                      color: textColor,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: canClick ? "pointer" : "not-allowed",
                      boxShadow:
                        status === "completed"
                          ? "0 2px 4px rgba(0,0,0,0.18)"
                          : "0 1px 3px rgba(0,0,0,0.12)",
                      transform:
                        isActive && status !== "completed"
                          ? "translateY(-2px)"
                          : "none",
                      animation:
                        isActive && status !== "completed" && status !== "in_progress"
                          ? "blinkStage 1.1s infinite"
                          : "none",
                      transition: "all 0.2s ease-out",
                      padding: "4px 6px",
                      minWidth: "60px", // Minimum width to prevent too small
                      flexShrink: 1, // Allow shrinking
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        marginBottom: 2,
                      }}
                    >
                      <span style={{
                        fontSize: window.innerWidth < 768 ? 14 : 16 // Responsive icon size
                      }}>
                        {stage.icon}
                      </span>
                      <span
                        style={{
                          fontSize: window.innerWidth < 768 ? 11 : 12, // Responsive font size
                          fontWeight: 600,
                          color: textColor,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {stage.label}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        opacity: 0.9,
                      }}
                    >
                      {stage.doneQty} Done,&nbsp;
                      {stage.outstandingQty} Outstanding
                    </div>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {progress > 0 && (
          <>
            <Divider style={{ margin: "8px 0" }} />
            <div>
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#000",
                  marginBottom: 0,
                }}
              >
                Overall Progress
              </h3>
              <Progress
                percent={progress}
                size="small"
                strokeColor="#1890ff"
              />
            </div>
          </>
        )}
      </Card>
    </>
  );
};

// ---------------- Main Component ----------------
const SkillLevelCostingList = () => {
  const dispatch = useDispatch();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [skillLevelCostings, setSkillLevelCostings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const [activeTab, setActiveTab] = useState("active_production");
  const [modalVisible, setModalVisible] = useState(false);

  const [workOrders, setAllWordOrders] = useState([]);
  const [completeWorkOrders, setCompleteWorkOrders] = useState([]);
  const [materialShortages, setMaterialShortages] = useState([]);
  const [activeStage, setActiveStage] = useState("picking");
  const [selectWorkOrderData, setSelectWorkOrderData] = useState();
  const [filterVisible, setFilterVisible] = useState(false)
  const [filters, setFilters] = useState({});
  const [poOptions, setPoOptions] = useState([]);
  const [projectNoOptions, setProjectNoOptions] = useState([]);
  // const [drawingOptions, setDrawingOptions] = useState([]);
  const [workOrderOptions, setWorkOrderOptions] = useState([]);
  const [filterType, setFilterType] = useState("show_all_mpns");
  const [needDatesOptions, setNeedDatesOptions] = useState([])
  const { list } = useSelector(
    (state) => state.customers
  );


  const { state } = useLocation();
  const workOrderId = state?.workOrderId;
  // console.log('------workOrderId',workOrderId)


  // useEffect(() => {
  //   fetchData();
  //   fetchWorkOrdersData();
  //   fetchCompleteWorkOrdersData();
  //   fetchMaterialShortagesData()
  // }, [page, limit, search]);

  useEffect(() => {
    if (activeTab === "active_production") {
      if (workOrderId) {
        fetchWorkOrdersData({ workOrderId });
      } else {
        fetchWorkOrdersData({ page, limit, search, filters });
      }
    }
  }, [activeTab, page, limit, search, filters, workOrderId]);

  useEffect(() => {
    fetchData({
      page,
      limit,
      search,
      filters,
    });
  }, [page, limit, search, filters]);

  useEffect(() => {
    if (activeTab === "recent_completions") {
      fetchCompleteWorkOrdersData();
    }
  }, [activeTab, page, limit, search]);

  useEffect(() => {
    if (activeTab === "material_shortages") {
      fetchMaterialShortagesData();
    }
  }, [activeTab, page, limit, search]);


  const fetchFilterData = async () => {
    try {
      const res = await WorkOrderService.getFilterData();

      if (res?.status) {
        const data = res?.data || {};

        setPoOptions(data.poNumbers || []);
        setProjectNoOptions(data.projectNos || []);
        setNeedDatesOptions(data?.needDates || [])
        // setDrawingOptions(data.drawings || []);
        setWorkOrderOptions(data.workOrders || [])
      } else {
        message.error(res?.message || "Failed to load filter data");
      }
    } catch (error) {
      console.error("fetchFilterData error:", error);
      message.error("Error loading filter data");
    } finally {
      // setLoadingFilters(false);
    }
  };

  useEffect(() => {
    fetchFilterData()
  }, [])

  useEffect(() => {
    dispatch(fetchCustomers({ limit: 3000 }))
  }, [dispatch])

  const fetchCompleteWorkOrdersData = async () => {
    try {
      const res = await WorkOrderService.getCompleteWorkOrders({
        page,
        limit,
        search
      });
      // console.log("-------complete res", res);
      setCompleteWorkOrders(res?.data || []);
    } catch (err) {
      message.error("Failed to fetch complete work orders");
      console.error(err);
    }
  };

  const filterConfig = [
    {
      type: "select",
      name: "projectNo",
      label: "Project No",
      placeholder: "Select Project No",
      options: projectNoOptions.map((cat) => ({
        label: cat.label,
        value: cat.value,
      })),
    },
    {
      type: "select",
      name: "poNo",
      label: "PO No",
      placeholder: "Select PO No",
      options: poOptions.map((cat) => ({
        label: cat.label,
        value: cat.value,
      })),
    },
    {
      type: "select",
      name: "needDate",
      label: "Need Date",
      placeholder: "Select Need Date",
      options: needDatesOptions,
    },
    // {
    //   type: "select",
    //   name: "drawingNo",
    //   label: "Drawing No",
    //   placeholder: "Select Drawing No",
    //   options: drawingOptions.map((cat) => ({
    //     label: cat.label,
    //     value: cat.value,
    //   })),
    // },
    {
      type: "select",
      name: "customerId",
      label: "Customer",
      placeholder: "Select Customer",
      options: list.map((cat) => ({
        label: cat.companyName,
        value: cat._id,
      })),
    }

  ];

  const handleFilterSubmit = async (filterData) => {
    // console.log("---------filterData", filterData);

    setFilters(filterData);
    setFilterVisible(false);

    // ✅ Reset page to 1 and fetch with new filters
    setPage(1);
    fetchWorkOrdersData({ page: 1, limit, filters: filterData });
  };

  const handleSearch = useDebounce((value) => {
    setPage(1);
    setSearch(value);
    // fetchWorkOrders({ page: 1, limit, search: value });
  }, 500);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res =
        await SkillLevelCostingService.getAllSkillLevelCostings({
          page,
          limit,
        });
      setSkillLevelCostings(res.data || []);
    } catch (err) {
      message.error("Failed to fetch data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderQyoteTypeBadge = (type) => {
    const typeConfig = {
      cable_harness: { color: "purple", text: "Cable Harness" },
      box_build: { color: "cyan", text: "Box Build" },
      other: { color: "default", text: "Other" },
    };

    const cfg = typeConfig[type] || { color: "default", text: type };
    return <Tag color={cfg.color}>{cfg.text}</Tag>;
  };

  // const fetchWorkOrdersData = async () => {
  //   try {
  //     setLoading(true);
  //     const res = await WorkOrderService.getAllProductionWorkOrders({
  //       page,
  //       limit,
  //     });
  //     console.log("-------active res", res);
  //     setAllWordOrders(res.data || []);
  //   } catch (err) {
  //     message.error("Failed to fetch work orders");
  //     console.error(err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };


  const fetchWorkOrdersData = async (params = {}) => {
    try {
      setLoading(true);

      const payload = {
        page: params.page ?? page,
        limit: params.limit ?? limit,

        // ✅ filters (map names correctly)
        // projectId: (params.filters ?? filters)?.projectNo || undefined,   // actually projectId
        customerId: (params.filters ?? filters)?.customerId || undefined,   // actually projectId
        // drawingId: (params.filters ?? filters)?.drawingNo || undefined,   // actually drawingId
        posNo: (params.filters ?? filters)?.posNo || undefined,
        projectNo: (params.filters ?? filters)?.projectNo || undefined,
        poNo: (params.filters ?? filters)?.poNo || undefined,
        needDate: (params.filters ?? filters)?.needDate || undefined,
        status: (params.filters ?? filters)?.status || undefined,
        search: params.search || "", // optional
        projectType: params?.filters?.projectType || undefined,

        workOrderId: workOrderId || undefined,

      };

      const res = await WorkOrderService.getAllProductionWorkOrders(payload);

      // console.log("-------production res", res);

      setAllWordOrders(res?.data || []);
      // if pagination comes from backend, store it too
      // setTotal(res?.pagination?.totalItems || 0);

    } catch (err) {
      message.error("Failed to fetch work orders");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const fetchMaterialShortagesData = async () => {
    try {
      setLoading(true);

      // ✅ clear old data first
      setMaterialShortages([]);

      const res = await InventoryService.getMaterialShortages({
        page,
        limit,
        search,
      });

      console.log("Material shortage response:", res);

      if (res?.success && Array.isArray(res?.data)) {
        setMaterialShortages(res.data);
      } else {
        setMaterialShortages([]);
      }
    } catch (err) {
      setMaterialShortages([]);
      message.error("Failed to fetch work orders");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Table Column Sets ----------------

  const activeProductionColumns = [
    {
      title: "",
      key: "projectDetails",
      width: "100%",
      render: (_, record) => (
        <CableAssemblyCard
          record={record}
          setModalVisible={setModalVisible}
          setSelectWorkOrderData={setSelectWorkOrderData}
          setActiveStage={setActiveStage}
        />
      ),
    },
  ];

  const recentCompletionsColumns = [
    {
      title: "Drawing No",
      dataIndex: "drawingNo",
      key: "drawingNo",
      sorter: true,
      render: (text) => <strong style={{ fontSize: '14px' }}>{text}</strong>
    },
    {
      title: "Work Order",
      dataIndex: "workOrderNo",
      key: "workOrderNo",
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Title level={5} style={{ margin: 0 }}>
            {text || "-"}
          </Title>
          <Text type="secondary">
            {formatProjectType(record?.projectType) || "–"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Project No",
      dataIndex: "projectNo",
      key: "projectNo",
      sorter: true,
      render: (text) => <span style={{ fontSize: '14px' }}>{text}</span>
    },
    {
      title: "PO No",
      dataIndex: "poNumber",
      key: "poNumber",
      sorter: true,
      render: (text) => <span style={{ fontSize: '13px', color: '#666' }}>{text}</span>
    },
    {
      title: "POS No",
      dataIndex: "posNo",
      key: "posNo",
      sorter: true,
      render: (text) => <span style={{ fontSize: '13px', color: '#666' }}>{text}</span>
    },

    {
      title: "Need Date",
      dataIndex: "needDate",
      key: "needDate",
      sorter: true,
      render: (text) => <span style={{ fontSize: '12px', color: '#888' }}>
        {text ? new Date(text).toLocaleDateString('en-GB') : 'N/A'}
      </span>
    },
    {
      title: "Commit Date",
      dataIndex: "commitDate",
      key: "commitDate",
      sorter: true,
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
      title: "Project Type",
      dataIndex: "projectType",
      key: "projectType",
      sorter: true,
      render: renderQyoteTypeBadge
    },
    {
      title: "Qty",
      key: "qty",
      render: (_, record) => (
        <Tag color="green">Qty: {record?.quantity ?? 0}</Tag>
      ),
    },
    {
      title: "Completed On",
      key: "completedDate",
      render: (_, record) => (
        <Text>{formatDate(record?.completeDate || record?.completedDate)}</Text>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => (
        <Tag color={statusTagColor(record?.status, false)}>
          {record?.status || "Completed"}
        </Tag>
      ),
    },
  ];

  const materialShortagesColumns = [
    {
      title: "Work Order",
      dataIndex: "workOrderNo",
      key: "workOrderNo",
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Title level={5} style={{ margin: 0 }}>
            {record?.mpn}
          </Title>
          <Text type="secondary">
            Work Order {record?.workOrderNo || "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Shortage",
      key: "shortage",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Tag color="red">Short: {record?.shortageQty ?? 0}</Tag>
          <Text>Picked: {record?.pickedQty ?? 0}</Text>
        </Space>
      ),
    },
  ];



  const handleSave = async (data) => {
    try {
      // console.log("Saved data:", data);

      const workOrderId = selectWorkOrderData?.workOrderId;
      if (!workOrderId) {
        message.error("Work Order ID missing");
        return;
      }

      const payload = {
        stage: data.stage,
        comments: data.comments,
        stageQty: data.stageQty,
        pickedQuantities: data.pickedQuantities,
        materials: data.materials,
      };

      const res = await WorkOrderService.saveProcessStage(workOrderId, payload);

      if (res?.success) {
        message.success("Stage updated!");
        setModalVisible(false);
        fetchWorkOrdersData();
      } else {
        message.error(res?.message || "Failed to save stage");
      }
    } catch (err) {
      message.error(err?.message || "Error saving stage");
    }
  };

  const getColumns = () => {
    switch (activeTab) {
      case "recent_completions":
        return recentCompletionsColumns;
      case "material_shortages":
        return materialShortagesColumns;
      case "active_production":
      default:
        return activeProductionColumns;
    }
  };

  const getDataSource = () => {
    switch (activeTab) {
      case "recent_completions":
        return completeWorkOrders || [];

      case "material_shortages":
        return materialShortages || [];

      case "active_production":
      default:
        return workOrders || [];
    }
  };

  return (
    <div>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <h2 style={{ marginBottom: 4 }}>
            {activeTab === "active_production"
              ? "Active Production"
              : activeTab === "recent_completions"
                ? "Recent Completions"
                : "Material Shortages"}
          </h2>
          <p style={{ color: "#888" }}>
            {activeTab === "active_production"
              ? "Current work orders in production"
              : activeTab === "recent_completions"
                ? "Recently completed work orders"
                : "Orders with missing materials"}
          </p>
        </Col>

        <Col>
          <Radio.Group
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="active_production">
              Active Production
            </Radio.Button>
            <Radio.Button value="recent_completions">
              Recent Completions
            </Radio.Button>
            <Radio.Button value="material_shortages">
              Material Shortages
            </Radio.Button>
          </Radio.Group>
        </Col>
      </Row>

      {/* Search + Button */}
      <Row justify="space-between" style={{ marginBottom: 12 }}>
        {/* 🔍 SEARCH → ALWAYS VISIBLE */}
        <Col span={6}>
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined />}
            value={inputValue}

            onChange={(e) => {
              handleSearch(e.target.value)
              setInputValue(e.target.value);
            }}
          />
        </Col>

        {/* 🎯 FILTER → ONLY FOR ACTIVE PRODUCTION */}
        {activeTab === "active_production" && (
          <Col xs={24} md={6} style={{ display: "flex", alignItems: "center" }}>
            <Select
              value={filterType}
              style={{ width: "70%" }}
              placeholder="Select Type"
              onChange={(val) => {
                setFilterType(val);
                fetchWorkOrdersData({
                  page: 1,
                  filters: {
                    ...filters,
                    projectType: val === "show_all_mpns" ? undefined : val,
                  },
                });
              }}
            >
              <Select.Option value="show_all_mpns">Show All</Select.Option>
              <Select.Option value="cable_harness">Cable Harness</Select.Option>
              <Select.Option value="box_build">Box Build</Select.Option>
              <Select.Option value="other">Others</Select.Option>
            </Select>

            <Button
              icon={<FilterOutlined />}
              className="ml-4"
              type="default"
              onClick={() => setFilterVisible(true)}
            >
              Filter
            </Button>
          </Col>
        )}
      </Row>


      {/* Table */}
      <Table
        key={activeTab}
        columns={getColumns()}
        dataSource={Array.isArray(getDataSource()) ? getDataSource() : []}
        loading={loading}
        rowKey={(record, index) =>
          record.workOrderId ||
          record._id ||
          `${activeTab}-${index}`
        }
        locale={{
          emptyText: "No Data Found",
        }}
        pagination={false}
      />

      <GlobalFilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onSubmit={handleFilterSubmit}
        filters={filterConfig}
        title="Filters"
      />

      <PickingDetailModal
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          fetchWorkOrdersData()
        }}
        onSave={handleSave}
        selectWorkOrderData={selectWorkOrderData}
        stage={activeStage?.name}
        stageStatus={activeStage?.status}
      />
    </div>
  );
};

export default SkillLevelCostingList;


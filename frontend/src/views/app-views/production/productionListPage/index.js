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
} from "@ant-design/icons";
import { useDispatch } from "react-redux";
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

// ---------------- Cable Assembly Card ----------------
const CableAssemblyCard = ({
  record,
  setModalVisible,
  setSelectWorkOrderData,
  setActiveStage,
}) => {
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

    // Default (Cable Harness)
    return [
      { label: "Picking", key: "picking" },
      { label: "Cable Harness", key: "assembly" }, // same process key
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

    const stages = STAGE_CONFIG.map((stage) => {
      const entry = history.find((p) => p.process === stage.key);
      const doneRaw = Number(entry?.qty || 0);

      const doneQty =
        qtyRequired > 0 ? Math.min(doneRaw, qtyRequired) : doneRaw;
      const outstandingQty =
        qtyRequired > 0 ? Math.max(qtyRequired - doneQty, 0) : 0;

      let status = "new"; // new | in_progress | completed
      if (doneQty <= 0) status = "new";
      else if (doneQty > 0 && doneQty < qtyRequired) status = "in_progress";
      else if (qtyRequired > 0 && doneQty >= qtyRequired) status = "completed";

      return {
        ...stage,
        icon: getStageIcon(stage.key),
        doneQty,
        outstandingQty,
        status,
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
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <FileTextOutlined style={{ color: "#1890ff", fontSize: 18 }} />
                <span
                  style={{ fontSize: 15, fontWeight: 600, color: "#000" }}
                >
                  {record?.workOrderNo || "-"} —{" "}
                  {formatProjectType(record?.projectType || "-")}
                </span>
                <Tag color="purple" style={{ fontSize: 11, padding: "0 6px" }}>
                  Qty: {record?.quantity ?? 0}
                </Tag>
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

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Tag
                    color={statusColor}
                    style={{ fontWeight: 500, fontSize: 11, padding: "0 6px" }}
                  >
                    {record?.isInProduction
                      ? "In Production"
                      : record?.status || "-"}
                  </Tag>
                  {/* <EyeOutlined style={{ fontSize: 20, color: "#1890ff" }} /> */}
                </div>
              </div>
            </Col>
          </Row>
        }
      >
        {/* Cable Assembly Info */}
        <div>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#000",
              marginBottom: 6,
            }}
          >
            <ToolOutlined style={{ marginRight: 5, color: "#1890ff" }} />
            {formatProjectType(record?.projectType)} Details
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 6,
            }}
          >
            <InfoItem
              label="Drawing No"
              value={record?.drawingNo}
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
            <InfoItem
              label="Work Order No"
              value={record?.workOrderNo}
              icon={<ApartmentOutlined />}
            />
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
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            {stages.map((stage) => {
              const isActive = stage.key === activeKey;
              const { status } = stage;

              // 🎨 Base colours
              let bg = "#f5f5f5";
              let textColor = "#555";
              let borderColor = 'white';
              let boxShadow = ''
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

              const canClick = status === "new" || status === "in_progress";

              return (
                <Tooltip
                  key={stage.key}
                  title={`Stage: ${stage.label} | Done: ${stage.doneQty}/${record.quantity}`}
                >
                  <div
                    onClick={() => {
                      if (!canClick) return;
                      setModalVisible(true);
                      setSelectWorkOrderData(record);
                      setActiveStage(stage.label);
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
                      cursor: canClick ? "pointer" : "default",
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

  const [activeTab, setActiveTab] = useState("active_production");
  const [modalVisible, setModalVisible] = useState(false);

  const [workOrders, setAllWordOrders] = useState([]);
  const [completeWorkOrders, setCompleteWorkOrders] = useState([]);
  const [materialShortages, setMaterialShortages] = useState([]);
  const [activeStage, setActiveStage] = useState("picking");
  const [selectWorkOrderData, setSelectWorkOrderData] = useState();

  useEffect(() => {
    fetchData();
    fetchWorkOrdersData();
    fetchCompleteWorkOrdersData();
    fetchMaterialShortagesData()
  }, [page, limit]);

  const fetchCompleteWorkOrdersData = async () => {
    try {
      const res = await WorkOrderService.getCompleteWorkOrders({
        page,
        limit,
      });
      console.log("-------complete res", res);
      setCompleteWorkOrders(res?.data || []);
    } catch (err) {
      message.error("Failed to fetch complete work orders");
      console.error(err);
    }
  };

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

  const fetchWorkOrdersData = async () => {
    try {
      setLoading(true);
      const res = await WorkOrderService.getAllProductionWorkOrders({
        page,
        limit,
      });
      console.log("-------active res", res);
      setAllWordOrders(res.data || []);
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
      const res = await InventoryService.getMaterialShortages({
        page,
        limit,
      });
      console.log("-------active res", res);
      setMaterialShortages(res.data || []);
    } catch (err) {
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
      title: "Project",
      key: "projectName",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{record?.projectName || "-"}</Text>
          <Text type="secondary">{record?.customerName || "-"}</Text>
        </Space>
      ),
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
          <Tag color="red">Short: {record?.requiredQty ?? 0}</Tag>
          <Text>Picked: {record?.pickedQty ?? 0}</Text>
        </Space>
      ),
    },
  ];

  const handleSave = async (data) => {
    try {
      console.log("Saved data:", data);

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
        return completeWorkOrders;
      case "material_shortages":
        return materialShortages;
      case "active_production":
      default:
        return workOrders;
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
        <Col span={6}>
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Col>
        {/* <Button type="primary" icon={<SettingOutlined />}>
          Update Progress
        </Button> */}
      </Row>

      {/* Table */}
      <Table
        columns={getColumns()}
        dataSource={getDataSource()}
        loading={loading}
        rowKey={(record) => record.workOrderId || record._id}
        pagination={false}
      />

      <PickingDetailModal
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false);
        }}
        onSave={handleSave}
        selectWorkOrderData={selectWorkOrderData}
        stage={activeStage}
      />
    </div>
  );
};

export default SkillLevelCostingList;


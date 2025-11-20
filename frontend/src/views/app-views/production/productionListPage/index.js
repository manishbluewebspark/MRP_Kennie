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
  RightOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SettingOutlined,
  CalendarOutlined,
  UserOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  ToolOutlined,
  BarcodeOutlined,
  ApartmentOutlined,
  EyeOutlined,
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

const { Title, Text } = Typography;

// ---------------- Info Item Component ----------------
const InfoItem = ({ label, value, icon }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
    <span style={{ color: "#1890ff", fontSize: 13 }}>{icon}</span>
    <span style={{ color: "#666", fontSize: 12 }}>{label}:</span>
    <span style={{ color: "#000", fontWeight: 500, fontSize: 12 }}>{value}</span>
  </div>
);

const formatProjectType = (str) => {
  if (!str) return "";
  return str
    .split("_")                // ["cable", "harness"]
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))  // ["Cable","Harness"]
    .join(" ");
};


const getQty = (record) =>
  Array.isArray(record?.items)
    ? record.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)
    : 0;

const formatDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  // dd/mm/yyyy
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
const CableAssemblyCard = ({ record, setModalVisible,setSelectWorkOrderData }) => {
  const qty = getQty(record);
  const need = formatDate(record?.needDate);
  const commit = formatDate(record?.commitDate);
  const statusColor = statusTagColor(record?.status, record?.isInProduction);

  // Stages to click (example)
  const stages = ["Picking", "Cable Harness", "Labelling", "Quality Check"];

  const getStagesForProject = (projectType) => {
    if (!projectType) return [];

    // box_build → no stages
    if (projectType === "Box Build") return ["Picking", "Labelling", "Quality Check"];

    // otherwise return all stages
    return stages;
  };

  const finalStages = getStagesForProject(record?.projectType);


  return (
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
              <span style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
                {record?.workOrderNo || "-"} — {formatProjectType(record?.projectType || "-")}
              </span>
              <Tag color="purple" style={{ fontSize: 11, padding: "0 6px" }}>
                Qty: {record?.quantity}
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
                <CalendarOutlined style={{ color: "#1890ff", fontSize: 14 }} />
                <span style={{ fontSize: 12, color: "#333", fontWeight: 500 }}>
                  Need: {need}
                </span>
                <span style={{ fontSize: 12, color: "#999" }}>&nbsp;|&nbsp;</span>
                <span style={{ fontSize: 12, color: "#333", fontWeight: 500 }}>
                  Commit: {commit}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Tag
                  color={statusColor}
                  style={{ fontWeight: 500, fontSize: 11, padding: "0 6px" }}
                >
                  {record?.isInProduction ? "In Production" : (record?.status || "-")}
                </Tag>
                <EyeOutlined style={{ fontSize: 20, color: "#1890ff" }} />
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
          <InfoItem label="PO No" value={record?.poNumber} icon={<BarcodeOutlined />} />
          <InfoItem label="POS No" value={record?.posNo} icon={<BarcodeOutlined />} />
          <InfoItem
            label="Work Order No"
            value={record?.workOrderNo}
            icon={<ApartmentOutlined />}
          />
          <InfoItem label="Project No" value={record?.projectName} icon={<ApartmentOutlined />} />
          <InfoItem label="Customer" value={record?.customerName || "JHON"} icon={<UserOutlined />} />
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
          <span style={{ color: "#888", fontWeight: "normal", fontSize: 11 }}>
            (Picking & Assembly can run concurrently)
          </span>
        </h3>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {finalStages.map((stage, idx) => (
            <Tooltip key={idx} title={`Stage: ${stage}`}>
              <Card
                size="small"
                style={{
                  fontSize: 12,
                  color: "#000",
                  padding: "2px 6px",
                  borderRadius: 6,
                  borderLeft: "3px solid #1890ff",
                  minWidth: 100,
                  textAlign: "center",
                  background: "#fafafa",
                  flex: "1 1 auto",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setModalVisible(true)
                  setSelectWorkOrderData(record)
                }}
              >
                {stage}
              </Card>
            </Tooltip>
          ))}
        </div>
      </div>



      {/* Progress (placeholder: you can compute from stages) */}
      {record?.progress < 0 && (
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
            <Progress percent={record?.progress} size="small" strokeColor="#1890ff" />
          </div>
        </>)}

    </Card>
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
  const [workOrders, setAllWordOrders] = useState([])
  const [selectWorkOrderData,setSelectWorkOrderData] = useState()
  const [completeWorkOrders, setCompleteWorkOrders] = useState([])
  useEffect(() => {
    fetchData();
    fetchWorkOrdersData()
    fetchCompleteWorkOrdersData()
  }, [page, limit]);


  const fetchCompleteWorkOrdersData = async () => {
    try {
     
      const res = await WorkOrderService.getCompleteWorkOrders({
        page,
        limit,
      });
      console.log('-------res',res)
      setCompleteWorkOrders(res?.data)
    } catch (err) {
      message.error("Failed to fetch data");
      console.error(err);
    } finally {
    }
  };


  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await SkillLevelCostingService.getAllSkillLevelCostings({
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
      console.log('-------res', res)
      setAllWordOrders(res.data || []);
    } catch (err) {
      message.error("Failed to fetch data");
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
      render: (_, record) => <CableAssemblyCard record={record} setModalVisible={setModalVisible} setSelectWorkOrderData={setSelectWorkOrderData}/>,
    },
  ];

  const recentCompletionsColumns = [
    {
      title: "Project",
      key: "projectDetails",
      render: () => (
        <Space direction="vertical" size={0}>
          <Title level={5} style={{ margin: 0 }}>
            2508-03
          </Title>
          <Text type="secondary">Cable Assembly</Text>
        </Space>
      ),
    },
    {
      title: "Qty",
      key: "qty",
      render: () => <Tag color="green">Qty: 2</Tag>,
    },
    {
      title: "Status",
      key: "status",
      render: () => <Tag color="green">Completed</Tag>,
    },
  ];

  const materialShortagesColumns = [
    {
      title: "Work Order",
      key: "projectDetails",
      render: () => (
        <Space direction="vertical" size={0}>
          <Title level={5} style={{ margin: 0 }}>
            12345
          </Title>
          <Text type="secondary">Work Order: 1234567777-A</Text>
        </Space>
      ),
    },
    {
      title: "Status",
      key: "actions",
      render: () => (
        <Space direction="vertical" size={0}>
          <Tag color="red">Short: 1</Tag>
          <Text>Picked: 0</Text>
        </Space>
      ),
    },
  ];

  const handleSave = (data) => {
    console.log('Saved data:', data);
    setModalVisible(false);
  };


  // ---------------- Dynamic Column Switch ----------------
  const getColumns = () => {
    switch (activeTab) {
      case "recent_completions":
        return recentCompletionsColumns;
      case "material_shortages":
        return materialShortagesColumns;
      default:
        return activeProductionColumns;
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
        <Button type="primary" icon={<SettingOutlined />}>
          Update Progress
        </Button>
      </Row>

      {/* Table */}
      <Table
        columns={getColumns()}
        dataSource={workOrders}
        loading={loading}
        rowKey="_id"
        pagination={false}
      />

      <PickingDetailModal
        visible={modalVisible}
        onCancel={() => { setModalVisible(false) }}
        onSave={handleSave}
        selectWorkOrderData={selectWorkOrderData}
      />
    </div>
  );
};

export default SkillLevelCostingList;

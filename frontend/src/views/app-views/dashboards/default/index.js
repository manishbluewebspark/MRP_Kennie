import React, { useEffect, useMemo, useState } from "react";
import { Row, Col, Button, Table, Tag, Progress, List } from "antd";
import StatisticWidget from "components/shared-components/StatisticWidget";
import GoalWidget from "components/shared-components/GoalWidget";
import Card from "components/shared-components/Card";
import Flex from "components/shared-components/Flex";
import {
  FileExcelOutlined,
  PrinterOutlined,
  PlusOutlined,
  EllipsisOutlined,
  StopOutlined,
  ReloadOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  PlayCircleOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  TagsOutlined,
  BarcodeOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { fetchCurrentUser } from "store/slices/authSlice";
import DashboardService from "services/DashboardService";
import InventoryService from "services/InventoryService";
import LowStockAlertCard from "components/shared-components/LowStockAlertCard";


// ---------------- Dropdown UI ----------------
import { Dropdown } from "antd";
import LatestAlertsCard from "components/shared-components/LowStockAlertCard/LatestAlertsCard";



export const PurchaseFollowUpsCard = ({ data, loading }) => {
  const items = data?.items || [];
  const thresholdDays = data?.thresholdDays ?? 3;

  return (
    <Card
      title="Purchase Follow-ups"
      extra={<Tag color="blue">{thresholdDays} days</Tag>}
    >
      {items.length > 0 ? (
        <List
          loading={loading}
          dataSource={items}
          renderItem={(po) => (
            <List.Item style={{ padding: "10px 0" }}>
              <div style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <b>{po.poNumber}</b>
                  <Tag color={po.status === "Pending" ? "orange" : "blue"}>
                    {po.status}
                  </Tag>
                </div>

                <div style={{ fontSize: 12, color: "#595959", marginTop: 2 }}>
                  Pending for <b>{po.ageDays}</b> day(s)
                </div>

                {po.isAttention && (
                  <div style={{ fontSize: 12, color: "#ff4d4f", marginTop: 4, fontWeight: 600 }}>
                    ✅ {po.actionText}
                  </div>
                )}
              </div>
            </List.Item>
          )}
        />
      ) : (
        <div style={{ textAlign: "center", color: "#999",alignContent:'center', padding: 12,height:'25vh' }}>
          No pending purchase follow-ups 
        </div>
      )}
    </Card>
  );
};


export const STATUS_META = {
  "Picking Started": {
    color: "blue",
    icon: <PlayCircleOutlined />,
  },
  "Picking Completed": {
    color: "green",
    icon: <CheckCircleOutlined />,
  },
  "Assembly Started": {
    color: "purple",
    icon: <ToolOutlined />,
  },
  "Assembly Completed": {
    color: "green",
    icon: <CheckCircleOutlined />,
  },
  "Cable Harness Started": {
    color: "purple",
    icon: <ToolOutlined />,
  },
  "Cable Harness Completed": {
    color: "green",
    icon: <CheckCircleOutlined />,
  },
  "Labelling Started": {
    color: "orange",
    icon: <TagsOutlined />,
  },
  "Labelling Completed": {
    color: "green",
    icon: <CheckCircleOutlined />,
  },
  "QC Started": {
    color: "cyan",
    icon: <BarcodeOutlined />,
  },
  "Quality Check Completed": {
    color: "green",
    icon: <CheckCircleOutlined />,
  },
  Completed: {
    color: "green",
    icon: <CheckCircleOutlined />,
  },
  "No Progress Yet": {
    color: "default",
    icon: <PlayCircleOutlined />,
  },
  "Picking In Progress": {
    color: "blue",
    icon: <PlayCircleOutlined />,
  }
};

// Badge render helper
export const renderBadge = (status) => {
  // safety
  if (!status) return <Tag>No Status</Tag>;

  // If status contains "%" → (e.g. “Picking: 50% Done”)
  if (status.includes("%")) {
    let color = "blue";

    if (status.toLowerCase().includes("picking")) color = "blue";
    if (status.toLowerCase().includes("assembly") || status.toLowerCase().includes("harness"))
      color = "purple";
    if (status.toLowerCase().includes("labelling")) color = "orange";
    if (status.toLowerCase().includes("quality") || status.toLowerCase().includes("qc"))
      color = "cyan";

    return (
      <Tag
        color={color}
        style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 500, width: 200 }}
      >
        <LoadingOutlined />
        {status}
      </Tag>
    );
  }

  // Static statuses from META
  const meta = STATUS_META[status] || {
    color: "default",
    icon: <LoadingOutlined />,
  };

  return (
    <Tag
      color={meta.color}
      style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 500, width: 200 }}
    >
      {meta.icon}
      {status}
    </Tag>
  );
};


const latestTransactionOption = [
  {
    key: "Refresh",
    label: (
      <Flex alignItems="center" gap={8}>
        <ReloadOutlined />
        <span className="ml-2">Refresh</span>
      </Flex>
    ),
  },
  {
    key: "Print",
    label: (
      <Flex alignItems="center" gap={8}>
        <PrinterOutlined />
        <span className="ml-2">Print</span>
      </Flex>
    ),
  },
  {
    key: "Export",
    label: (
      <Flex alignItems="center" gap={8}>
        <FileExcelOutlined />
        <span className="ml-2">Export</span>
      </Flex>
    ),
  },
];

const CardDropdown = ({ items }) => {
  return (
    <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
      <a
        href="/#"
        className="text-gray font-size-lg"
        onClick={(e) => e.preventDefault()}
      >
        <EllipsisOutlined />
      </a>
    </Dropdown>
  );
};

// ---------------- Icon Box styles ----------------
const styles = {
  redIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    background: "#ff4d4f",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: 18,
  },
  orangeIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    background: "#fa8c16",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: 18,
  },
  greenIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    background: "#52c41a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: 18,
  },
};

export const DefaultDashboard = () => {
  const dispatch = useDispatch();
  const { user, token, loading: authLoading } = useSelector((state) => state.auth);

  // ✅ dashboard loading (separate)
  const [pageLoading, setPageLoading] = useState(false);

  // cards stats
  const [stats, setStats] = useState({
    activeWorkOrders: 0,
    urgentActions: 0,
    attentionRequired: 0,
  });

  // alerts list (latest 5)
  const [alertData, setAlertData] = useState([]);
  const [poFollowUps, setPoFollowUps] = useState([])
  // low stock list
  const [lowStockList, setLowStockList] = useState([]);

  // production dashboard
  const [prod, setProd] = useState({ cards: {}, list: [] });

  // ---------- load user ----------
  useEffect(() => {
    if (token && !user) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, token, user]);

  // ---------- build cards ----------
  const annualStatisticData = useMemo(
    () => [
      {
        title: "Urgent Actions",
        value: stats?.urgentActions || 0,
        status: 0,
        subtitle: "Critical + Warning alerts",
        prefix: (
          <div style={styles.redIcon}>
            <WarningOutlined />
          </div>
        ),
      },
      {
        title: "Attention Required",
        value: stats?.attentionRequired || 0,
        status: 0,
        subtitle: "Warning alerts",
        prefix: (
          <div style={styles.orangeIcon}>
            <ExclamationCircleOutlined />
          </div>
        ),
      },
      {
        title: "Active Work Orders",
        value: stats?.activeWorkOrders || 0,
        status: 0,
        subtitle: "Running smoothly",
        prefix: (
          <div style={styles.greenIcon}>
            <PlayCircleOutlined />
          </div>
        ),
      },
    ],
    [stats]
  );

  // ---------- API calls ----------
  const getDashboardCardsStats = async () => {
    const res = await DashboardService.getDashboardCardsStats();
    // ✅ Axios: res.data.success
    if (res?.success) setStats(res.data);
  };

  const getLowStockAlerts = async () => {
    const res = await InventoryService.getLowStockAlertList();
    if (res?.success) setLowStockList(res.data || []);
  };

  const getLatestAlerts = async () => {
    const res = await DashboardService.getAlertsStats(); // latest 5 alerts API
    if (res?.success) setAlertData(res.data || []);
  };

  const fetchProduction = async () => {
    const res = await DashboardService.getProductionDashboard();
    if (res?.success) setProd(res.data || { cards: {}, list: [] });
  };

  const getPurchaseFollowUps = async () => {
    const res = await DashboardService.getPurchaseFollowUps(6);
    if (res?.success) setPoFollowUps(res.data);
  };

  const loadDashboard = async () => {
    try {
      setPageLoading(true);
      await Promise.all([
        getDashboardCardsStats(),
        getLowStockAlerts(),
        getLatestAlerts(),
        fetchProduction(),
        getPurchaseFollowUps(),
      ]);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // ---------- Production table columns ----------
  const productionColumns = useMemo(
    () => [
      {
        title: "Work Order",
        dataIndex: "workOrderNoDisplay",
        key: "wo",
        render: (v) => <b>{v}</b>,
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (v) => renderBadge(v),
      },
      {
        title: "Commit",
        dataIndex: "daysToCommit",
        key: "daysToCommit",
        render: (d) => {
          if (d === null || d === undefined) return "-";
          if (d < 0) return <Tag color="red">Overdue {Math.abs(d)}d</Tag>;
          if (d <= 2) return <Tag color="orange">{d}d left</Tag>;
          return <Tag color="green">{d}d left</Tag>;
        },
      },
      {
        title: "Picking",
        key: "picking",
        render: (_, r) => (
          <Progress percent={r.stagePercent?.picking || 0} size="small" />
        ),
      },
      {
        title: "Assembly",
        key: "assembly",
        render: (_, r) => (
          <Progress percent={r.stagePercent?.assembly || 0} size="small" />
        ),
      },
      {
        title: "Labelling",
        key: "labelling",
        render: (_, r) =>
          r.stagePercent?.labelling === null || r.stagePercent?.labelling === undefined
            ? "-"
            : <Progress percent={r.stagePercent?.labelling || 0} size="small" />,
      },
      {
        title: "QC",
        key: "qc",
        render: (_, r) => (
          <Progress percent={r.stagePercent?.qc || 0} size="small" />
        ),
      },
    ],
    []
  );

  return (
    <>
      {/* TOP ROW */}
      <Row gutter={16}>
        <Col xs={24} sm={24} md={24} lg={18}>
          <Row gutter={16}>
            {annualStatisticData.map((elm, i) => (
              <Col xs={24} sm={24} md={24} lg={24} xl={8} key={i}>
                <StatisticWidget
                  title={elm.title}
                  value={elm.value}
                  status={elm.status}
                  subtitle={elm.subtitle}
                  prefix={elm.prefix}
                />
              </Col>
            ))}
          </Row>

          {/* PRODUCTION TABLE */}
          <Row gutter={16}>
            <Col span={24}>
              <Card
                title="Production Status"
                extra={
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={loadDashboard}
                    loading={pageLoading}
                  >
                    Refresh
                  </Button>
                }
                style={{ marginTop: 16 }}
              >
                <Table
                  loading={pageLoading || authLoading}
                  rowKey="_id"
                  dataSource={prod.list || []}
                  pagination={{ pageSize: 10 }}
                  columns={productionColumns}
                />
              </Card>
            </Col>
          </Row>
        </Col>

        {/* RIGHT SIDEBAR */}
        <Col xs={24} sm={24} md={24} lg={6}>
            <PurchaseFollowUpsCard data={poFollowUps} loading={pageLoading} />
          
          {/* You can remove this if not needed */}
          <StatisticWidget
            title="System"
            value="OK"
            status={0}
            subtitle="Dashboard running"
          />
        </Col>
      </Row>

      {/* SECOND ROW */}
      <Row gutter={16}>
        {/* LOW STOCK */}
        <Col xs={24} sm={24} md={24} lg={7}>
          <Card
            title="Low Stock Alerts"
            extra={
              <Button
                type="link"
                icon={<ReloadOutlined />}
                onClick={getLowStockAlerts}
              >
                Refresh
              </Button>
            }
          >
            <div style={{ display: "grid", gap: 12 }}>
              {lowStockList?.length > 0 ? (
                lowStockList.map((item) => (
                  <LowStockAlertCard key={item._id || item.id} item={item} />
                ))
              ) : (
                <div style={{ textAlign: "center",justifyContent:'center',alignContent:'center', color: "#999", padding: 12,height:'33vh' }}>
                  No low stock alerts 
                </div>
              )}
            </div>
          </Card>
        </Col>

        {/* RECENT ACTIVITIES / LATEST ALERTS */}
        <Col xs={24} sm={24} md={24} lg={17}>
          <Card
            title="Recent Activities"
            extra={<CardDropdown items={latestTransactionOption} />}
          >
            <LatestAlertsCard latestAlerts={alertData} loading={pageLoading} />
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default DefaultDashboard;

import React, { useEffect, useState, useCallback } from "react";
import { Table, message, Card, Col, Radio, Typography, Tag } from "antd";
import {
  ExclamationCircleFilled,
  WarningFilled,
  InfoCircleFilled,
  FileSearchOutlined,
  SettingFilled,
  CheckCircleFilled,
} from "@ant-design/icons";

import GlobalTableActions from "components/GlobalTableActions";
import useDebounce from "utils/debouce";
import { useDispatch, useSelector } from "react-redux";
import { fetchPurchaseOrders } from "store/slices/purchaseOrderSlice";
import ReceiveMaterialService from "services/ReceiveMaterial";
import InventoryService from "services/InventoryService";
import GlobalFilterModal from "components/GlobalFilterModal";
import SelectPurchaseOrderModal from "./SelectPurchaseOrderModal";
import ReceiveMaterialsModal from "./ReceiveMaterialsModal";
import UpdateOutgoingQuantityModal from "../mtoInventoryList/UpdateOutgoingQuantityModal";
import IncomingStockModal from "./IncomingStockModal";
import { render } from "@testing-library/react";
import { fromMeter, toMeter } from "utils/unitConversion";
import WorkOrderService from "services/WorkOrderService";

const { Title, Text } = Typography;

const urgencyMeta = {
  critical: {
    icon: <ExclamationCircleFilled style={{ color: "#ff4d4f", fontSize: 22, marginTop: 4 }} />,
    tagColor: "red",
    label: "CRITICAL",
  },
  urgent: {
    icon: <WarningFilled style={{ color: "#faad14", fontSize: 22, marginTop: 4 }} />,
    tagColor: "gold",
    label: "URGENT",
  },
  normal: {
    icon: <InfoCircleFilled style={{ color: "#1677ff", fontSize: 22, marginTop: 4 }} />,
    tagColor: "blue",
    label: "NORMAL",
  },
};

const InventoryListPage = () => {
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("inventory_list");

  const [inventoryData, setInventoryData] = useState([]);
  const [lowStockAlertData, setLowStockAlertData] = useState([]);
  const [materialRequiredData, setMaterialRequiredData] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [isPurchaseOrderModalOpen, setIsPurchaseOrderModalOpen] = useState(false);
  const [isReceiveMaterialModalOpen, setIsReceiveMaterialModalOpen] = useState(false);
  const [isUpdateInventoryModalOpen, setIsUpdateInventoryModalOpen] = useState(false);
  const [showPoDataModal, setShowPoDataModal] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  const [selectedPurchaseData, setSelectedPurchaseData] = useState(null);
  const [view, setView] = useState("all"); // all | incoming | shortage | low

  const { purchaseOrders } = useSelector((state) => state.purchaseOrders);

  // ✅ Debounced Search (page reset)
  const handleSearch = useDebounce((value) => {
    setSearch(value);
    setPagination((prev) => ({ ...prev, page: 1, total: 0 })); // ✅ important
  }, 500);

  // ✅ Inventory List API (ONLY inventory_list needs pagination+search)
  const getInventoryList = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search,
        view
      };

      const response = await InventoryService.getInventoryList(params);

      if (response?.success) {
        setInventoryData(response.data || []);
        setPagination((prev) => ({
          ...prev,
          total: Number(response.total || 0),
          // keep page/limit from state (source of truth)
        }));
      } else {
        message.error(response?.message || "Failed to fetch inventory data");
      }
    } catch (err) {
      console.error(err);
      message.error("Error loading inventory data");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, view]);

  // ✅ Other tabs API (no pagination in UI, but still can use same keys)
  const getMaterialRequiredList = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search,
      };

      const response = await WorkOrderService.getTotalMPNNeeded(params);
      // console.log('-----response',response)
      if (response?.status) {
        setMaterialRequiredData(response.data || []);
        setPagination((prev) => ({
          ...prev,
          total: Number(response.total || 0),
        }));
      } else {
        message.error(response?.message || "Failed to fetch material required data");
      }
    } catch (e) {
      console.error(e);
      message.error("Error loading material required data");
    } finally {
      setLoading(false);
    }
  }, [search]);

  const getLowStockAlertList = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search,
      };

      const response = await InventoryService.getLowStockAlertList(params);

      if (response?.success) {
        setLowStockAlertData(response.data || []);
        setPagination((prev) => ({
          ...prev,
          total: Number(response.total || 0),
        }));
      } else {
        message.error(response?.message || "Failed to fetch low stock alerts");
      }
    } catch (e) {
      console.error(e);
      message.error("Error loading low stock alerts");
    } finally {
      setLoading(false);
    }
  }, [search]);

  // ✅ Fetch data based on active tab
  useEffect(() => {
    if (activeTab === "inventory_list") {
      getInventoryList();
    } else if (activeTab === "inventory_alerts") {
      getLowStockAlertList();
    } else if (activeTab === "material_required") {
      getMaterialRequiredList();
    }
  }, [activeTab, getInventoryList, getLowStockAlertList, getMaterialRequiredList]);

  // ✅ When tab changes reset pagination (only relevant for inventory_list)
  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      page: 1,
      total: 0,
    }));
  }, [activeTab]);

  useEffect(() => {
    dispatch(fetchPurchaseOrders({ status: "Pending" }));
  }, [dispatch]);

  const handleOpenIncomingStock = (data) => {
    setSelectedPurchaseData(data);
    setShowPoDataModal(true);
  };

  const handleEdit = (inventoryItem) => {
    setSelectedInventoryItem(inventoryItem);
    setIsUpdateInventoryModalOpen(true);
  };

  const handleUpdateOutgoing = async (updateData) => {
    try {
      const adjustmentPayload = {
        inventoryId: updateData.inventoryId,
        adjustmentQuantity: updateData.adjustmentQuantity,
        reason: updateData.reason,
      };

      const response = await InventoryService.adjustInventory(adjustmentPayload);

      if (response?.success === true) {
        message.success(`Success! New balance: ${response.data.inventory.balanceQuantity}`);
        setIsUpdateInventoryModalOpen(false);
        await getInventoryList();
        return true;
      } else {
        throw new Error(response?.message || "Unknown error");
      }
    } catch (error) {
      console.error(error);
      message.error(error.message || "Adjustment failed");
      throw error;
    }
  };

  const handleExport = async () => {
    try {
      let resp;
      let fileName = "";
      let mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

      if (activeTab === "material_required") {
        resp = await InventoryService.exportMaterialRequired({ search }, { responseType: "arraybuffer" });
        fileName = `material-required-${Date.now()}.xlsx`;
      } else if (activeTab === "inventory_list") {
        resp = await InventoryService.exportInventoryList({ search }, { responseType: "arraybuffer" });
        fileName = `inventory-list-${Date.now()}.xlsx`;
      } else if (activeTab === "inventory_alerts") {
        resp = await InventoryService.exportInventoryAlerts({ search }, { responseType: "arraybuffer" });
        fileName = `inventory-alerts-${Date.now()}.xlsx`;
      } else {
        message.error("Invalid tab selected");
        return;
      }

      let arrayBuffer;
      if (resp?.data instanceof ArrayBuffer) {
        arrayBuffer = resp.data;
        mime = resp?.headers?.["content-type"] || mime;
      } else if (resp instanceof ArrayBuffer) {
        arrayBuffer = resp;
      } else if (resp?.blob instanceof Blob) {
        mime = resp.contentType || mime;
        arrayBuffer = await resp.blob.arrayBuffer();
      } else {
        throw new Error("Unknown response format for Excel export");
      }

      const blob = new Blob([arrayBuffer], { type: mime });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
      message.success("Excel exported successfully!");
    } catch (err) {
      console.error(err);
      message.error("Failed to export Excel");
    }
  };

  const handlePurchaseOrderSubmit = async (status) => {
    setSelectedPO(status);
    setIsPurchaseOrderModalOpen(false);
    setIsReceiveMaterialModalOpen(true);
  };

  const handleReceiveSubmit = async (formData) => {
    try {
      const response = await ReceiveMaterialService.takeReceiveMaterial(formData);
      if (response.success) {
        message.success(response?.message);
        setIsReceiveMaterialModalOpen(false);
        dispatch(fetchPurchaseOrders());
        // refresh current tab data
        if (activeTab === "inventory_list") await getInventoryList();
      } else {
        message.error("Failed to receive materials");
      }
    } catch (error) {
      console.error(error);
      message.error("Error receiving materials");
    }
  };

  // ================= Columns =================
  const materialRequiredColumns = [
  {
    title: "",
    key: "mpn",
    render: (_, record) => (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "right",
          width: "100%",
        }}
      >
        {/* LEFT */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ExclamationCircleFilled
            style={{
              color: record.shortfall > 0 ? "#ff4d4f" : "#52c41a",
              fontSize: 18,
            }}
          />

          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                {record.mpn}
              </span>

              <Tag
                color={record.shortfall > 0 ? "red" : "green"}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {record.shortfall} {record.uom}
              </Tag>
            </div>

            <div
              style={{
                fontSize: 12,
                color: "#888",
              }}
            >
              {record.description}
            </div>
          </div>
        </div>

  

        {/* RIGHT */}
        <div
          style={{
            textAlign: "right",
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {record.workOrderNo}
          </div>

          <div
            style={{
              color: "#999",
              fontSize: 13,
            }}
          >
            Stock {record.currentStock} / Need {record.totalNeeded} {record.uom}
          </div>
        </div>

       
      </div>
    ),
  },
];

  const urgencyMeta = {
    critical: {
      color: "#ff4d4f",
      bg: "#fff1f0",
      label: "CRITICAL",
      icon: <ExclamationCircleFilled style={{ color: "#ff4d4f", fontSize: 20 }} />
    },
    urgent: {
      color: "#faad14",
      bg: "#fffbe6",
      label: "URGENT",
      icon: <ExclamationCircleFilled style={{ color: "#faad14", fontSize: 20 }} />
    },
    normal: {
      color: "#52c41a",
      bg: "#f6ffed",
      label: "NORMAL",
      icon: <CheckCircleFilled style={{ color: "#52c41a", fontSize: 20 }} />
    }
  };

  const inventoryAlertsColumns = [
    {
      title: "Item",
      key: "index",
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: "Work Order no.",
      dataIndex: "workOrderNo",
      key: "workOrderNo",
      render: (workOrderNo, record) => {
        // If multiple work orders, show all
        if (record?.workOrders?.length > 0) {
          return record.workOrders.map(w => w.workOrderNo).join(", ");
        }
        return workOrderNo || "N/A";
      }
    },
    {
      title: "MPN",
      dataIndex: "mpnNumber",
      key: "mpnNumber",
      render: (mpn, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 500 }}>{mpn}</span>
        </div>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (desc) => desc || "N/A",
      ellipsis: true,
    },
    {
      title: "Manufacturer",
      dataIndex: "manufacturer",
      key: "manufacturer",
      render: (mfr) => mfr || "N/A",
    },
    {
      title: "UOM",
      dataIndex: "uom",
      key: "uom",
      render: (uom) => uom || "PCS",
      width: 80,
      align: 'center'
    },
    {
      title: "Need Date",
      key: "needDate",
      render: (_, record) => {
        if (record?.workOrders?.length > 0) {
          return record.workOrders.map(w =>
            new Date(w.needDate).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric"
            })
          ).join(", ");
        }
        if (record?.earliestNeedDate) {
          return new Date(record.earliestNeedDate).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
          });
        }
        return "N/A";
      },
    },
    {
      title: "Shortage Qty",
      key: "shortfall",
      width: 120,
      align: 'center',
      render: (_, record) => {
        const shortfall = Number(record?.shortfall ?? 0);
        const urgency = record?.urgency || "normal";

        const styles = {
          critical: {
            bg: "#fff1f0",
            color: "#ff4d4f",
            border: "#ffccc7",
          },
          urgent: {
            bg: "#fff7e6",
            color: "#fa8c16",
            border: "#ffd591",
          },
          normal: {
            bg: "#f6ffed",
            color: "#52c41a",
            border: "#b7eb8f",
          },
        };

        const style = styles[urgency] || styles.normal;

        return (
          <span
            style={{
              display: "inline-block",
              padding: "2px 12px",
              borderRadius: "4px",
              backgroundColor: style.bg,
              color: style.color,
              fontWeight: "bold",
              border: `1px solid ${style.border}`,
              minWidth: "50px",
              textAlign: "center",
            }}
          >
            {shortfall} {record?.uom}
          </span>
        );
      },
    },
  ];

  const inventoryListColumns = [
    {
      title: "No.",
      key: "serial",
      width: 80,
      render: (_, __, index) => (pagination.page - 1) * pagination.limit + (index + 1), // ✅ correct serial with pagination
    },
    { title: "MPN", dataIndex: "MPN", key: "MPN", width: 120 },
    { title: "Manufacturer", dataIndex: "Manufacturer", key: "Manufacturer", width: 150 },
    { title: "Description", dataIndex: "Description", key: "Description", width: 180 },
    {
      title: "UOM",
      dataIndex: "UOM",
      key: "UOM",
      width: 120,
      render: (_, record) => {
        const uom = record?.UOM;

        if (!uom) return <Text>-</Text>;
        if (typeof uom === "string") return <Text>{uom}</Text>;
        if (typeof uom === "object" && uom.code) return <Text>{uom.code}</Text>;

        return <Text>-</Text>;
      },
    },
    { title: "Storage", dataIndex: "Storage", key: "Storage", width: 100, align: "center" },
    {
      title: "Balance Qty",
      dataIndex: "balanceQuantity",
      key: "balanceQuantity",
      width: 200,
      align: "center",
      render: (_, record) => {
        return fromMeter(
          record?.balanceQuantity,
          record?.UOM   // yaha apna correct field name do
        );
      }
    },
    {
      title: "Incoming Qty",
      dataIndex: "IncomingQty",
      key: "IncomingQty",
      width: 120,
      align: "center",
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <FileSearchOutlined onClick={() => handleOpenIncomingStock(record)} style={{ fontSize: 15, color: "#1890ff" }} />
          {/* <span>{fromMeter(
      record?.IncomingQty,
      record?.UOM   // yaha apna correct field name do
    )}</span> */}
          {record?.IncomingQty}
        </div>
      ),
    },
    {
      title: "Demand Qty", dataIndex: "DemandQty", key: "DemandQty", width: 120, align: "center", render: (_, record) => {
        return fromMeter(
          record?.DemandQty,
          record?.UOM   // yaha apna correct field name do
        );
      }
    },
    {
      title: "Shortage Qty", dataIndex: "ShortageQty", key: "ShortageQty", width: 120, align: "center", render: (_, record) => {
        return fromMeter(
          record?.ShortageQty,
          record?.UOM   // yaha apna correct field name do
        );
      }
    },
    {
      title: "Status",
      dataIndex: "Status",
      key: "Status",
      width: 120,
      align: "center",
      render: (status) => (
        <Tag color={status === "In Stock" ? "green" : status === "On Order" ? "blue" : status === "Low Stock" ? "orange" : "red"}>
          {status}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      align: "center",
      render: (_, record) => (
        <SettingFilled style={{ color: "#1890ff", fontSize: 18, cursor: "pointer" }} onClick={() => handleEdit(record)} />
      ),
    },
  ];

  const getCurrentData = () => {
    if (activeTab === "material_required") return materialRequiredData;
    if (activeTab === "inventory_alerts") return lowStockAlertData;
    return inventoryData;
  };

  const getCurrentColumns = () => {
    if (activeTab === "material_required") return materialRequiredColumns;
    if (activeTab === "inventory_alerts") return inventoryAlertsColumns;
    return inventoryListColumns;
  };

  const filterConfig = [
    {
      type: "select",
      name: "view",                 // ✅ important: Form.Item expects `name`
      label: "View",
      placeholder: "Select filter",
      options: [
        { label: "All", value: "all" },
        { label: "Show Shortage Only", value: "shortage" },
        { label: "Show Incoming Qty Only", value: "incoming" },
        { label: "Show Low Stock Only", value: "low" }, // optional
      ],
    },
  ];


  const handleFilterSubmit = async (data) => {
    setView(data?.view || "all");
    setPagination((p) => ({ ...p, page: 1, total: 0 })); // ✅ important
    setIsFilterModalOpen(false);
  };



  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>
            {activeTab === "material_required" && "Materials Required for All Work Orders"}
            {activeTab === "inventory_alerts" && "Inventory Alerts"}
            {activeTab === "inventory_list" && "Inventory List"}
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: "#888" }}>
            {activeTab === "material_required" && "Materials with insufficient stock for pending work orders"}
            {activeTab === "inventory_alerts" && "Critical inventory items that need attention"}
            {activeTab === "inventory_list" && "Complete inventory list with current stock levels"}
          </p>
        </div>

        <Col>
          <Radio.Group value={activeTab} onChange={(e) => setActiveTab(e.target.value)} optionType="button" buttonStyle="solid">
            <Radio.Button value="material_required">Material Required</Radio.Button>
            <Radio.Button value="inventory_alerts">Inventory Alerts</Radio.Button>
            <Radio.Button value="inventory_list">Inventory List</Radio.Button>
          </Radio.Group>
        </Col>
      </div>

      {/* Actions */}
      <GlobalTableActions
        showSearch={true}
        onSearch={(value) => {
          handleSearch(value); // ✅ debounce + reset page
        }}
        showExport={true}
        onExport={handleExport}
        showFilter={activeTab === "inventory_list"}
        onFilter={() => setIsFilterModalOpen(true)}
        showExportPDF={false}
        showProductSetting={false}
        onProductSetting={() => setIsPurchaseOrderModalOpen(true)}
        showProductSettingText="Receive Material"
        onExportPDF={() => { }}
      />

      <Card>
        <Table
          columns={getCurrentColumns()}
          dataSource={getCurrentData()}
          loading={loading}
          rowKey="_id"
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: true,
            onChange: (page, pageSize) => {
              setPagination((prev) => ({
                ...prev,
                page,
                limit: pageSize,
              }));
            },
          }}
        />
      </Card>

      <GlobalFilterModal visible={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} onSubmit={(data) => handleFilterSubmit(data)} filters={filterConfig} title="Filters" />

      <SelectPurchaseOrderModal
        visible={isPurchaseOrderModalOpen}
        onCancel={() => setIsPurchaseOrderModalOpen(false)}
        onSubmit={handlePurchaseOrderSubmit}
        purchaseOrders={purchaseOrders}
      />

      <ReceiveMaterialsModal
        visible={isReceiveMaterialModalOpen}
        onCancel={() => setIsReceiveMaterialModalOpen(false)}
        onSubmit={handleReceiveSubmit}
        purchaseOrderData={selectedPO}
      />

      <UpdateOutgoingQuantityModal
        visible={isUpdateInventoryModalOpen}
        onCancel={() => setIsUpdateInventoryModalOpen(false)}
        onUpdate={handleUpdateOutgoing}
        inventoryItem={selectedInventoryItem}
      />

      <IncomingStockModal visible={showPoDataModal} onCancel={() => { setShowPoDataModal(false); getInventoryList() }} purchaseData={selectedPurchaseData} />
    </div>
  );
};

export default InventoryListPage;

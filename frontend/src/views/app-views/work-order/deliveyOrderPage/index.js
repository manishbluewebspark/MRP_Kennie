import React, { useEffect, useState } from "react";
import { Table, Button, Space, Tag, message, Card, Input, Checkbox, DatePicker } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import GlobalTableActions from "components/GlobalTableActions";
import useDebounce from "utils/debouce";
import GlobalFilterModal from "components/GlobalFilterModal";
import WorkOrderService from "services/WorkOrderService"; // ← make sure this exists
import dayjs from "dayjs";
const renderBadge = (text, type) => {
  let color = "default";
  if (type === "status") {
    color = text === "Active" ? "green" : text === "Completed" ? "blue" : "orange";
  }
  return <Tag color={color}>{text || "-"}</Tag>;
};

const DeliveryOrderPage = () => {
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // table state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // local edit state for DO No. and Delivered
  const [doMap, setDoMap] = useState({});         // { [workOrderId]: "DO-123" }
  const [deliveredMap, setDeliveredMap] = useState({}); // { [workOrderId]: true/false }

  const handleSearch = useDebounce((value) => {
    setPage(1);
    fetchWorkOrders({ page: 1, limit, search: value });
  }, 500);

  const normalizeRow = (wo) => {
    // show first item’s drawing/pos qty if present (safe fallback)
    const firstItem = Array.isArray(wo.items) && wo.items.length ? wo.items[0] : {};
    return {
      key: wo._id,
      _id: wo._id,
      workOrderNo: wo.workOrderNo,
      drawingNo: wo?.drawingName || wo?.drawingName || "-",
      project: wo.projectName || "-",
      customer: wo.customerName || wo.customer?.companyName || "-",
      qty: wo?.quantity ?? wo.qty ?? "-",
      poNumber: wo.poNumber || "-",
      completedDate: wo.completeDate
        ? new Date(wo.completeDate).toLocaleDateString("en-GB")
        : "-",
      targetDeliveryDate: wo.targetDeliveryDate
        ? new Date(wo.targetDeliveryDate).toLocaleDateString("en-GB")
        : "-",
      status: wo.status || "-",
      doNumber: wo.doNumber || "",
      delivered: !!wo.delivered,
    };
  };

  const fetchWorkOrders = async (params = {}) => {
    setLoading(true);
    try {
      const {
        page: p = page,
        limit: l = limit,
        search: q = search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = params;

      const res = await WorkOrderService.getDeliveryOrders({
        page: p,
        limit: l,
        search: q,
        sortBy,
        sortOrder,
      });

      if (res?.success) {
        const rows = (res.data || []).map(normalizeRow);
        setData(rows);
        setTotalCount(res.totalCount ?? rows.length);

        // hydrate local edit maps so inputs/checkboxes reflect API
        const nextDo = {};
        const nextDelivered = {};
        rows.forEach((r) => {
          nextDo[r._id] = r.doNumber || "";
          nextDelivered[r._id] = !!r.delivered;
        });
        setDoMap(nextDo);
        setDeliveredMap(nextDelivered);
      } else {
        message.error(res?.message || "Failed to fetch work orders");
      }
    } catch (err) {
      console.error("Error fetching work orders:", err);
      message.error("Failed to fetch work orders");
    } finally {
      setLoading(false);
    }
  };

  // ✔ Check if all delivered
const isAllDeliveredChecked =
  data.length > 0 &&
  data.every((item) => deliveredMap[item._id] === true);

// ✔ Check if some delivered
const isSomeDeliveredChecked =
  data.some((item) => deliveredMap[item._id] === true) &&
  !isAllDeliveredChecked;

// ✔ Select All handler
const handleSelectAllDelivered = (checked) => {
  const newState = {};
  data.forEach((item) => {
    newState[item._id] = checked;
  });
  setDeliveredMap(newState);

  // Optional: Save to DB for each row
  if (checked) {
    data.forEach((item) => handleDeliveredToggle(item, true));
  } else {
    data.forEach((item) => handleDeliveredToggle(item, false));
  }
};


  useEffect(() => {
    fetchWorkOrders({ page: 1, limit, search });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // optimistic update for DO No.
  const handleDoChange = (id, value) => {
    setDoMap((m) => ({ ...m, [id]: value }));
  };
  const handleDoBlur = async (record) => {
    const id = record._id;
    const value = doMap[id] ?? "";
    try {
      // optimistic UI already done in handleDoChange
      await WorkOrderService.updateDeliveryInfo(id, { doNumber: value });
      message.success("DO No. saved");
    } catch (e) {
      message.error("Failed to save DO No.");
      // revert to server state by refetching that row quickly
      fetchWorkOrders({ page, limit, search });
    }
  };

  // Update Target Delivery Date
const handleTargetDeliveryChange = async (record, date) => {
  try {
    const isoDate = date ? date.toISOString() : null;

    await WorkOrderService.updateWorkOrder(record._id, {             // ensure backend knows which item
      targetDeliveryDate: isoDate,         // ISO date string
    });

    message.success("Target Delivery Date updated");
  } catch (e) {
    console.error(e);
    message.error("Failed to update Target Delivery Date");
  }
};


  // optimistic toggle for delivered
  const handleDeliveredToggle = async (record, checked) => {
    const id = record._id;
    setDeliveredMap((m) => ({ ...m, [id]: checked }));
    try {
      await WorkOrderService.updateDeliveryInfo(id, {
        delivered: checked,
        // if you also want to send doNumber together:
        doNumber: doMap[id] ?? "",
      });
      message.success("Delivery status updated");
    } catch (e) {
      message.error("Failed to update status");
      setDeliveredMap((m) => ({ ...m, [id]: !checked })); // rollback
    }
  };

  const columns = [
    {
      title: "Work Order No",
      dataIndex: "workOrderNo",
      key: "workOrderNo",
      sorter: (a, b) => String(a.workOrderNo).localeCompare(String(b.workOrderNo)),
      render: (text) => <strong style={{ fontSize: 14 }}>{text}</strong>,
    },
    {
      title: "Drawing No",
      dataIndex: "drawingNo",
      key: "drawingNo",
      render: (text) => <span style={{ fontSize: 13, color: "#666" }}>{text}</span>,
    },
    {
      title: "Project",
      dataIndex: "project",
      key: "project",
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Customer",
      dataIndex: "customer",
      key: "customer",
      render: (text) => <span style={{ fontSize: 13 }}>{text}</span>,
    },
    {
      title: "Qty",
      dataIndex: "qty",
      key: "qty",
      render: (text) => <span style={{ fontSize: 13, color: "#666" }}>{text}</span>,
    },
    {
      title: "PO Number",
      dataIndex: "poNumber",
      key: "poNumber",
      render: (text) => <span style={{ fontSize: 13, color: "#666" }}>{text}</span>,
    },
    {
      title: "Completed Date",
      dataIndex: "completedDate",
      key: "completedDate",
      render: (text) => (
        <Tag style={{ borderRadius: 12, background: "#16A34A", color: "#fff", border: "none", padding: "2px 10px" }}>
          {text}
        </Tag>
      ),
    },
    {
  title: "Target Delivery Date",
  dataIndex: "targetDeliveryDate",
  key: "targetDeliveryDate",
  render: (_, record) => (
    <DatePicker
      value={record.targetDeliveryDate ? dayjs(record.targetDeliveryDate) : null}
      onChange={(date) => handleTargetDeliveryChange(record, date)}
      format="DD/MM/YYYY"
      style={{ width: 130 }}
      disabled={loading}
    />
  ),
},
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (text) => renderBadge(text, "status"),
    },
    {
      title: "DO No.",
      dataIndex: "doNumber",
      key: "doNumber",
      width: 170,
      render: (_, record) => (
        <Input
          placeholder="Enter DO No."
          size="small"
          style={{ width: 150 }}
          value={doMap[record._id] ?? ""}
          onChange={(e) => handleDoChange(record._id, e.target.value)}
          onBlur={() => handleDoBlur(record)}
        />
      ),
    },
    {
  title: (
    <Checkbox
      checked={isAllDeliveredChecked}
      indeterminate={isSomeDeliveredChecked}
      onChange={(e) => handleSelectAllDelivered(e.target.checked)}
    >
      Delivered
    </Checkbox>
  ),
  dataIndex: "delivered",
  key: "delivered",
  align: "center",
  width: 110,
  render: (_, record) => (
    <Checkbox
      checked={!!deliveredMap[record._id]}
      onChange={(e) => handleDeliveredToggle(record, e.target.checked)}
    />
  ),
}

  ];

  const filterConfig = [
    { type: "date", name: "drawingDate", label: "Drawing Date", placeholder: "Select Drawing Date" },
    // add your real options here
  ];

  const handleExport = async () => {
    try {
      const res = await WorkOrderService.exportDeliveryWorkOrders();
      const blob = new Blob([res], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "work_orders_export.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      message.success("Work orders exported successfully");
    } catch (err) {
      console.error(err);
      message.error("Failed to export work orders");
    }
  };

  const handleExportPDF = async () => {
  try {
    const res = await WorkOrderService.exportWorkOrdersPDF();
    const blob = new Blob([res], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "work_orders_export.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    message.success("Work orders PDF exported successfully");
  } catch (err) {
    console.error(err);
    message.error("Failed to export PDF");
  }
};

const handleExportWord = async () => {
  try {
    const res = await WorkOrderService.exportWorkOrdersWord();
    const blob = new Blob([res], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "work_orders_export.docx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    message.success("Work orders Word exported successfully");
  } catch (err) {
    console.error(err);
    message.error("Failed to export Word file");
  }
};


  const handleFilterSubmit = async (vals) => {
    // plug into your API when ready
    setIsFilterModalOpen(false);
    fetchWorkOrders({ page: 1, limit, search }); // refresh
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Delivery Order</h2>
          <p style={{ margin: 0, fontSize: 14, color: "#888" }}>View all work orders and export delivery documentation</p>
        </div>
        {/* <Button type="primary" icon={<PlusOutlined />}>New</Button> */}
      </div>

      {/* Global table actions */}
      <GlobalTableActions
        showSearch
        onSearch={(val) => {
          setSearch(val);
          handleSearch(val);
        }}
        showExport
        onExport={handleExport}
        onExportPDF={handleExportPDF}
        onExportWord={handleExportWord}
        showExportPDF={true}
        showExportWord={true}
        showFilter
        onFilter={() => setIsFilterModalOpen(true)}
      />

      <Card>
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={{
            current: page,
            pageSize: limit,
            total: totalCount,
            showSizeChanger: true,
            showQuickJumper: true,
            onChange: (p, ps) => {
              setPage(p);
              setLimit(ps);
              fetchWorkOrders({ page: p, limit: ps, search });
            },
            showTotal: (total) => `${total} items`,
          }}
          scroll={{ x: 1100 }}
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

export default DeliveryOrderPage;

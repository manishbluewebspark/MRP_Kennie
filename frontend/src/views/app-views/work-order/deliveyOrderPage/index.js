import React, { useEffect, useState } from "react";
import { Table, Tag, message, Card, Input, Checkbox, DatePicker } from "antd";
import GlobalTableActions from "components/GlobalTableActions";
import GlobalFilterModal from "components/GlobalFilterModal";
import WorkOrderService from "services/WorkOrderService";
import useDebounce from "utils/debouce";
import dayjs from "dayjs";
import { formatDate } from "utils/formatDate";
import ProjectService from "services/ProjectService";
import CustomerService from "services/CustomerService";
import { hasPermission } from "utils/auth";

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
 const [projectData, setProjectData] = useState([])
  const [customerData, setCustomerData] = useState([])
  // table state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // local edit state for DO No. and Delivered
  const [doMap, setDoMap] = useState({}); // { [workOrderId]: "DO-123" }
  const [deliveredMap, setDeliveredMap] = useState({}); // { [workOrderId]: true/false }

  // ✅ selection
  const [selectedRowKeys, setSelectedRowKeys] = useState([]); // array of _id
  const selectedRows = data.filter((d) => selectedRowKeys.includes(d._id));

  const handleSearch = useDebounce((value) => {
    setPage(1);
    fetchWorkOrders({ page: 1, limit, search: value });
  }, 500);

  const normalizeRow = (wo) => {
    return {
      key: wo._id,
      _id: wo._id,
      workOrderNo: wo.workOrderNo,
      drawingNo: wo?.drawingName || wo?.drawingNo || "-",
      project: wo.projectName || "-",
      customer: wo.customerName || wo.customer?.companyName || "-",
      qty: wo?.quantity ?? wo.qty ?? "-",
      poNumber: wo.poNumber || "-",
      completedDate: wo.completedDate || null,
      targetDeliveryDate: wo.targetDeliveryDate || null,
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
        filters
      } = params;

      const res = await WorkOrderService.getDeliveryOrders({
        page: p,
        limit: l,
        search: q,
        sortBy,
        sortOrder,
        status: "Completed",
        filters
      });

      if (res?.success) {
        const rows = (res.data || []).map(normalizeRow);
        setData(rows);
        setTotalCount(res.totalCount ?? rows.length);

        // hydrate local edit maps
        const nextDo = {};
        const nextDelivered = {};
        rows.forEach((r) => {
          nextDo[r._id] = r.doNumber || "";
          nextDelivered[r._id] = !!r.delivered;
        });
        setDoMap(nextDo);
        setDeliveredMap(nextDelivered);

        // reset selection if rows changed
        setSelectedRowKeys([]);
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
  
    const fetchCustomers = async () => {
      try {
        const res = await CustomerService.getAllCustomers();
        if (res.success) setCustomerData(res.data);
      } catch (err) {
        console.error("Error fetching customers:", err);
        message.error("Failed to fetch customers");
      } finally {
      }
    };
  

  useEffect(() => {
    fetchWorkOrders({ page: 1, limit, search });
    fetchProjects()
    fetchCustomers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Delivered header checkbox state (based on visible data)
  const isAllDeliveredChecked =
    data.length > 0 && data.every((item) => deliveredMap[item._id] === true);

  const isSomeDeliveredChecked =
    data.some((item) => deliveredMap[item._id] === true) && !isAllDeliveredChecked;

  // ✅ Select All Delivered (selected rows first, otherwise whole page)
  const handleSelectAllDelivered = (checked) => {
    const targetIds = selectedRowKeys.length ? selectedRowKeys : data.map((d) => d._id);

    const newState = { ...deliveredMap };
    targetIds.forEach((id) => (newState[id] = checked));
    setDeliveredMap(newState);

    // persist in DB
    targetIds.forEach((id) => {
      const rec = data.find((x) => x._id === id);
      if (rec) handleDeliveredToggle(rec, checked);
    });
  };

  // optimistic update for DO No.
  const handleDoChange = (id, value) => {
    setDoMap((m) => ({ ...m, [id]: value }));
  };

  const handleDoBlur = async (record) => {
    const id = record._id;
    const value = (doMap[id] ?? "").trim();
    try {
      await WorkOrderService.updateDeliveryInfo(id, { doNumber: value });
      message.success("DO No. saved");
    } catch (e) {
      message.error("Failed to save DO No.");
      fetchWorkOrders({ page, limit, search });
    }
  };

  // Update Target Delivery Date
  const handleTargetDeliveryChange = async (record, date) => {
    try {
      const isoDate = date ? date.toISOString() : null;
      await WorkOrderService.updateWorkOrder(record._id, { targetDeliveryDate: isoDate });
      fetchWorkOrders({ page, limit, search });
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
        doNumber: (doMap[id] ?? "").trim(),
      });
      message.success("Delivery status updated");
    } catch (e) {
      message.error("Failed to update status");
      setDeliveredMap((m) => ({ ...m, [id]: !checked }));
    }
  };

  // ✅ Export validation (DO No. required + optional Delivered required)
  const validateBeforeExport = ({ requireDelivered = false } = {}) => {
    if (!selectedRowKeys.length) {
      message.error("Please select at least one work order");
      return false;
    }

    // DO No required
    const missingDo = selectedRows.filter((r) => !(doMap[r._id] || "").trim());
    if (missingDo.length) {
      message.error(`DO No. required for ${missingDo.length} selected item(s)`);
      return false;
    }

    // Delivered required (optional)
    if (requireDelivered) {
      const notDelivered = selectedRows.filter((r) => deliveredMap[r._id] !== true);
      if (notDelivered.length) {
        message.error(`Please mark Delivered for ${notDelivered.length} selected item(s)`);
        return false;
      }
    }

    return true;
  };

  // ✅ Export PDF (selected only)
  const handleExportPDF = async () => {
    try {
      if (!validateBeforeExport({ requireDelivered: false })) return;

      const payload = {
        ids: selectedRowKeys,
        deliveryInfo: selectedRowKeys.map((id) => ({
          id,
          doNumber: (doMap[id] || "").trim(),
          delivered: !!deliveredMap[id],
        })),
      };

      console.log('----payload',payload)

      const res = await WorkOrderService.exportWorkOrdersPDF(payload);

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "delivery_orders.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      message.success("PDF exported successfully");
    } catch (err) {
      console.error("PDF export error:", err);
      message.error("Failed to export PDF");
    }
  };

  // ✅ Export Excel (selected only)
  const handleExportExcel = async () => {
    try {
      if (!validateBeforeExport({ requireDelivered: false })) return;

      const payload = {
        ids: selectedRowKeys,
        deliveryInfo: selectedRowKeys.map((id) => ({
          id,
          doNumber: (doMap[id] || "").trim(),
          delivered: !!deliveredMap[id],
        })),
      };

      const res = await WorkOrderService.exportDeliveryWorkOrders(payload);

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "delivery_orders.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      message.success("Excel exported successfully");
    } catch (err) {
      console.error(err);
      message.error("Failed to export Excel");
    }
  };

const handleExportWork = async () => {
  try {
    if (!validateBeforeExport({ requireDelivered: false })) return;

    const payload = {
      ids: selectedRowKeys,
      deliveryInfo: selectedRowKeys.map((id) => ({
        id,
        doNumber: (doMap[id] || "").trim(),
        delivered: !!deliveredMap[id],
      })),
    };

    const res = await WorkOrderService.exportWorkOrdersWord(payload);

    // ✅ axios-style => res.data, wrapper-style => res
    const fileData = res?.data ? res.data : res;

    const blob = new Blob([fileData], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `delivery_orders_${new Date().toISOString().slice(0, 10)}.docx`;
    document.body.appendChild(a);
    a.click();

    a.remove();
    window.URL.revokeObjectURL(url);

    message.success("Word exported successfully");
  } catch (err) {
    console.error("Word export error:", err);
    message.error(err?.response?.data?.message || "Failed to export Word");
  }
};


  const columns = [
    {
      title: "Work Order No",
      dataIndex: "workOrderNo",
      key: "workOrderNo",
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
      render: (_, record) => (
        <Tag style={{ borderRadius: 12, background: "#16A34A", color: "#fff", border: "none", padding: "2px 10px" }}>
          {formatDate(record?.completedDate)}
        </Tag>
      ),
    },
    {
      title: "Target Delivery Date",
      dataIndex: "targetDeliveryDate",
      key: "targetDeliveryDate",
      render: (_, record) => {
        const raw = record?.targetDeliveryDate;
        const dateValue = raw && dayjs(raw).isValid() ? dayjs(raw) : null;

        return (
          <DatePicker
            value={dateValue}
            onChange={(date) => handleTargetDeliveryChange(record, date)}
            format="DD/MM/YYYY"
            style={{ width: 130 }}
            disabled={loading}
          />
        );
      },
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
        disabled={record?.status !== "Completed"}
          checked={!!deliveredMap[record._id]}
          onChange={(e) => handleDeliveredToggle(record, e.target.checked)}
        />
      ),
    },
  ];


  const filterConfig = [
    { type: "date", name: "drawingDate", label: "Drawing Date", placeholder: "Select Drawing Date" },
    {
            type: 'select',
            name: 'customer',
            label: 'Customer',
            placeholder: 'Select Customer',
            options: customerData.map(customer => ({
                label: customer.companyName,
                value: customer._id
            }))
        },
     {
            type: 'select',
            name: 'project',
            label: 'Project',
            placeholder: 'Select Project',
            options: projectData.map(project => ({
                label: project.projectName,
                value: project._id
            }))
        },
  ];

  const handleFilterSubmit = async (data) => {
     const nextFilters = {
    drawingDate: data?.drawingDate ? dayjs(data.drawingDate).toISOString() : null,
    customer: data?.customer || null,
    project: data?.project || null,
  };
    setIsFilterModalOpen(false);
    fetchWorkOrders({ page: 1, limit, search,filters: nextFilters });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Delivery Order</h2>
          <p style={{ margin: 0, fontSize: 14, color: "#888" }}>
            View completed work orders and export delivery documentation
          </p>
        </div>
      </div>

      <GlobalTableActions
        showSearch
        onSearch={(val) => {
          setSearch(val);
          handleSearch(val);
        }}
        showExport={hasPermission("work_order.delivery_order:export")}
        showExportWord={hasPermission("work_order.delivery_order:export")}
        onExportWord={handleExportWork}
        onExport={handleExportExcel}
        onExportPDF={handleExportPDF}
        showExportPDF={hasPermission("work_order.delivery_order:export")}
        showFilter
        onFilter={() => setIsFilterModalOpen(true)}
      />

      <Card>
        <Table
          rowKey="_id"
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={{
            current: page,
            pageSize: limit,
            total: totalCount,
            // showSizeChanger: true,
            // showQuickJumper: true,
            onChange: (p, ps) => {
              setPage(p);
              setLimit(ps);
              fetchWorkOrders({ page: p, limit: ps, search });
            },
           
          }}
          // scroll={{ x: 1100 }}
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

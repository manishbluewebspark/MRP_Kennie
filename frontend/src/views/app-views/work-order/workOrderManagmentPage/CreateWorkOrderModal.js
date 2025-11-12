import React, { useEffect, useState, useRef } from "react";
import {
  Modal,
  Button,
  Input,
  DatePicker,
  Table,
  Space,
  Tag,
  Divider,
  Row,
  Col,
  Checkbox,
  Form,
  Select,
  message,
  InputNumber,
} from "antd";
import { SearchOutlined, FilterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import DrawingService from "services/DrawingService"; // <-- adjust path if needed
import GlobalFilterModal from "components/GlobalFilterModal";

const { Option } = Select;

const CreateWorkOrderModal = ({
  visible,
  onCancel,
  onCreate,
  editingWorkOrder,      // { workOrderNo, projectNo, ... , items:[{drawingId,posNo,quantity,uom,remarks}] }
  workOrderSettings,
  projectData    // e.g. { needDateCalculation: 2 }  (weeks before commit)
}) => {
  const [form] = Form.useForm();
  const [selectedRows, setSelectedRows] = useState([]);   // array of row keys
  const [drawingsData, setDrawingsData] = useState([]);   // table rows
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  // ⛑️ Guard to prevent re-applying edit overlay and wiping user changes
  const hasPatchedOnceRef = useRef(false);

  const filterConfig = [
    {
      type: 'date',
      name: 'drawingdate',
      label: 'Drawing Date Range',
      placeholder: ['start']
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
    {
      type: 'select',
      name: 'drawingRange',
      label: 'Drawing Range',
      placeholder: 'Select Drawing Range',
      options: [
        { value: 'range1', label: '0–50' },
        { value: 'range2', label: '51–100' },
        { value: 'range3', label: '101–200' }
      ]
    }
  ];

  // ---------- Helpers ----------
  const generateWorkOrderNumber = (existingNumbers = []) => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const currentMonthNumbers = existingNumbers
      .filter((num) => num.startsWith(`WO${year}${month}`))
      .map((num) => parseInt(num.slice(-5), 10))
      .filter((n) => !isNaN(n));
    const nextSeq = currentMonthNumbers.length ? Math.max(...currentMonthNumbers) + 1 : 1;
    const seqStr = String(nextSeq).padStart(5, "0");
    return `WO${year}${month}-${seqStr}`;
  };

  const fetchDrawings = async (params = {}) => {
    setLoading(true);
    try {
      const response = await DrawingService.getAllDrawings(params);
      if (response?.success) {
        const formatted = (response.data || []).map((drawing, index) => ({
          key: drawing._id || String(index),
          drawingId: drawing._id,
          drawingNo: drawing.drawingNo || "-",
          project: drawing.projectId?.projectName || drawing.projectName || "-",
          projectId: drawing.projectId?._id || null,
          customer: drawing.customerId?.companyName || drawing.customerName || "-",
          qty: drawing.qty || 0,
          unitPrice: drawing.unitPrice ?? 0,
          unitPriceDisplay: `$ ${(drawing.unitPrice ?? 0).toFixed(2)}`,
          totalPriceDisplay: `$ ${(((drawing.qty ?? 0) * (drawing.unitPrice ?? 0))).toFixed(2)}`,
          quotedDate: drawing.quotedDate ? dayjs(drawing.quotedDate).format("DD/MM/YYYY") : "-",
          posNo: drawing.posNumber || "",
          status: drawing.quoteStatus || "draft",
          // Work-order specific editable fields
          workOrderQty: drawing.qty || 0,
          uom: drawing.uom || "PCS",
          remarks: drawing.remarks || "",
        }));

        // Reset the overlay guard so we can patch once on this fresh dataset
        hasPatchedOnceRef.current = false;
        setDrawingsData(formatted);
      } else {
        message.error("Failed to fetch drawings");
      }
    } catch (err) {
      console.error(err);
      message.error("Failed to fetch drawings");
    } finally {
      setLoading(false);
    }
  };

  const handleRowChange = (key, field, value) =>
    setDrawingsData((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  const quotedDrawingsColumns = [
    {
      title: "",
      key: "selection",
      width: 50,
      render: (_, record) => (
        <Checkbox
          checked={selectedRows.includes(record.key)}
          onChange={(e) => {
            if (e.target.checked) setSelectedRows((s) => [...s, record.key]);
            else setSelectedRows((s) => s.filter((k) => k !== record.key));
          }}
        />
      ),
    },
    {
      title: "Drawing No",
      dataIndex: "drawingNo",
      key: "drawingNo",
      render: (text) => <strong>{text}</strong>,
      sorter: (a, b) => (a.drawingNo || "").localeCompare(b.drawingNo || ""),
    },
    {
      title: "Project",
      dataIndex: "project",
      key: "project",
      render: (t) => <Tag color="blue">{t}</Tag>,
      sorter: (a, b) => (a.project || "").localeCompare(b.project || ""),
    },
    {
      title: "Customer",
      dataIndex: "customer",
      key: "customer",
      sorter: (a, b) => (a.customer || "").localeCompare(b.customer || ""),
    },
    {
      title: "Qty",
      dataIndex: "qty",
      key: "qty",
      sorter: (a, b) => (a.qty || 0) - (b.qty || 0),
    },
    {
      title: "Unit Price",
      dataIndex: "unitPriceDisplay",
      key: "unitPriceDisplay",
      sorter: (a, b) => (a.unitPrice || 0) - (b.unitPrice || 0),
    },
    {
      title: "Total Price",
      dataIndex: "totalPriceDisplay",
      key: "totalPriceDisplay",
      sorter: (a, b) => ((a.unitPrice || 0) * (a.qty || 0)) - ((b.unitPrice || 0) * (b.qty || 0)),
    },
    {
      title: "Quoted Date",
      dataIndex: "quotedDate",
      key: "quotedDate",
      sorter: (a, b) => {
        const da = a.quotedDate === "-" ? 0 : dayjs(a.quotedDate, "DD/MM/YYYY").valueOf();
        const db = b.quotedDate === "-" ? 0 : dayjs(b.quotedDate, "DD/MM/YYYY").valueOf();
        return da - db;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === "quoted" ? "green" : status === "approved" ? "blue" : "orange"}>
          {status?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "POS No",
      dataIndex: "posNo",
      key: "posNo",
      render: (text, record) => (
        <Input
          value={record.posNo}
          placeholder="Enter POS No"
          onChange={(e) => handleRowChange(record.key, "posNo", e.target.value)}
        />
      ),
    },
    {
      title: "Work Order Qty",
      dataIndex: "workOrderQty",
      key: "workOrderQty",
      render: (text, record) => (
        <InputNumber
          min={0}
          value={record.workOrderQty}
          onChange={(val) => handleRowChange(record.key, "workOrderQty", val)}
          style={{ width: "100%" }}
        />
      ),
    },
  ];

  const handleSearch = (value) => {
    setSearchQuery(value);
    fetchDrawings({ search: value });
  };

  const handleFilter = () => {
    setIsFilterModalOpen(true)
  };
  const handleFilterSubmit = (data) => {
    console.log('--------handle filter', data)
    let filterQur = {
      projectId: data?.project,
      drawingDate: data?.drawingdate
    }
    fetchDrawings(filterQur)
    setIsFilterModalOpen(false)
  }
  const handleCreateOrder = async (values) => {
    try {
      if (selectedRows.length === 0) {
        message.error("Please select at least one drawing");
        return;
      }

      const items = selectedRows.map((key) => {
        const row = drawingsData.find((d) => d.key === key);
        return {
          drawingId: row?.drawingId,
          posNo: row?.posNo || "",
          quantity: row?.workOrderQty || 0,
          uom: row?.uom || "PCS",
          remarks: row?.remarks || "",
        };
      });

      const workOrderData = {
        workOrderNo: values.workOrderNo,
        projectNo: values.projectNo,
        projectId: drawingsData.find((d) => d.key === selectedRows[0])?.projectId || null,
        poNumber: values.poNumber,
        projectType: values.projectType,
        needDate: values.needDate ? values.needDate.format("YYYY-MM-DD") : null,
        commitDate: values.commitDate ? values.commitDate.format("YYYY-MM-DD") : null,
        status: values.status || "on_hold",
        isTriggered: false,
        items,
      };

      await onCreate(workOrderData);
    } catch (err) {
      console.error(err);
      message.error("Failed to create work order");
    }
  };

  const handleReset = () => {
    form.resetFields();
    setSelectedRows([]);
    setSearchQuery("");
  };

  const handleCancel = () => {
    hasPatchedOnceRef.current = false; // reset guard when closing
    handleReset();
    onCancel?.();
  };

  // ---------- Effects ----------
  // Fetch drawings when modal opens
  useEffect(() => {
    if (visible) fetchDrawings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Prefill form + apply edit overlay (only once per dataset)
  useEffect(() => {
    if (!visible) return;

    // Prefill form values
    if (editingWorkOrder) {
      form.setFieldsValue({
        workOrderNo: editingWorkOrder.workOrderNo,
        projectNo: editingWorkOrder.projectNo,
        poNumber: editingWorkOrder.poNumber,
        projectType: editingWorkOrder.projectType,
        needDate: editingWorkOrder.needDate ? dayjs(editingWorkOrder.needDate) : null,
        commitDate: editingWorkOrder.commitDate ? dayjs(editingWorkOrder.commitDate) : null,
        status: editingWorkOrder.status,
      });
    } else {
      // Fresh create mode
      handleReset();
      const workOrderNo = generateWorkOrderNumber();
      form.setFieldsValue({ workOrderNo });
    }

    // Apply overlay exactly once after drawings load
    if (
      visible &&
      drawingsData.length > 0 &&
      editingWorkOrder?.items?.length > 0 &&
      !hasPatchedOnceRef.current
    ) {
      const { patched, selectedKeys } = applyEditingItemsToRows(drawingsData, editingWorkOrder);
      setDrawingsData(patched);
      if (selectedKeys.length) setSelectedRows(selectedKeys);
      hasPatchedOnceRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, drawingsData, editingWorkOrder]);

  // Overlay helper: map editing items onto table rows
  const applyEditingItemsToRows = (rows, workOrder) => {
    if (!workOrder?.items?.length) return { patched: rows, selectedKeys: [] };

    const byId = new Map(
      workOrder.items
        .filter((it) => it?.drawingId)
        .map((it) => [String(it.drawingId), it])
    );

    const selectedKeys = [];
    const patched = rows.map((r) => {
      const it = byId.get(String(r.drawingId));
      if (!it) return r;

      const next = {
        ...r,
        posNo: it.posNo ?? r.posNo ?? "",
        workOrderQty:
          typeof it.quantity === "number" ? it.quantity : (r.workOrderQty ?? 0),
        uom: it.uom || r.uom || "PCS",
        remarks: it.remarks ?? r.remarks ?? "",
      };
      selectedKeys.push(r.key);
      return next;
    });

    return { patched, selectedKeys };
  };

  return (
    <Modal
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={1200}
      style={{ top: 20 }}
      destroyOnClose
    >
      <Row align="middle" justify="space-between" gutter={[16, 16]} style={{ marginBottom: 10 }}>
        <Col>
          <div style={{ fontSize: 20, fontWeight: 600 }}>
            {editingWorkOrder ? "Edit Work Order" : "Create Work Order"}
          </div>
          <div style={{ fontSize: 14, color: "#666" }}>
            Select quoted drawings and fill work order details
          </div>
        </Col>
        <Col style={{ width: "45%" }}>
          <Row gutter={8} align="middle">
            <Col flex="auto">
              <Input
                placeholder="Search by Customer or Drawing No"
                prefix={<SearchOutlined />}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </Col>
            <Col>
              <Button icon={<FilterOutlined />} onClick={handleFilter}>
                Filter
              </Button>
            </Col>
          </Row>
        </Col>
      </Row>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Select Quoted Drawings</div>
        <Table
          columns={quotedDrawingsColumns}
          dataSource={drawingsData}
          pagination={false}
          loading={loading}
          scroll={{ x: 1100 }}
          size="small"
        />
      </div>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Work Order Details</div>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateOrder}
          onValuesChange={(changedValues, allValues) => {
            if (changedValues.commitDate) {
              const weeksBefore = Number(workOrderSettings?.needDateCalculation || 0);
              if (weeksBefore > 0 && allValues.commitDate) {
                const needDate = dayjs(allValues.commitDate).subtract(weeksBefore, "week");
                form.setFieldsValue({ needDate });
              }
            }
          }}
        >
          <Row gutter={[24, 16]}>
            <Col xs={24} md={8}>
              <Form.Item name="workOrderNo" label="Work Order No." rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            {/* <Col xs={24} md={8}>
              <Form.Item name="projectNo" label="Project No." rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col> */}
            <Col xs={24} md={8}>
              <Form.Item name="poNumber" label="PO Number">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24, 16]}>
            <Col xs={24} md={8}>
              <Form.Item name="projectType" label="Project Type" rules={[{ required: true }]}>
                <Select placeholder="Select project type">
                  <Option value="cable_assembly">Cable Assembly</Option>
                  <Option value="box_Build_assembly">Box-Build Assembly</Option>
                  <Option value="others_assembly">Others Assembly</Option>
                </Select>
              </Form.Item>
            </Col>
            {/* <Col xs={24} md={6}>
              <Form.Item name="status" label="Status">
                <Select placeholder="Select status">
                  <Option value="on_hold">On Hold</Option>
                  <Option value="in_progress">In Progress</Option>
                  <Option value="completed">Completed</Option>
                  <Option value="cancelled">Cancelled</Option>
                </Select>
              </Form.Item>
            </Col> */}
            <Col xs={24} md={8}>
              <Form.Item name="needDate" label="Need Date" rules={[{ required: true }]}>
                <DatePicker disabled style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
              <div style={{ fontSize: 12, color: "#98c585", marginTop: -8 }}>
                Automatically calculated from Commit Date minus {workOrderSettings?.needDateCalculation || 0} weeks
              </div>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="commitDate" label="Commit Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={handleCancel}>Cancel</Button>
              <Button type="primary" htmlType="submit" disabled={selectedRows.length === 0}>
                {editingWorkOrder ? "Update Order" : "Create Order"}
              </Button>
            </Space>
          </div>
        </Form>
      </div>

      <GlobalFilterModal
        visible={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onSubmit={handleFilterSubmit}
        filters={filterConfig}
        title="Filters"
      />
    </Modal>
  );
};

export default CreateWorkOrderModal;

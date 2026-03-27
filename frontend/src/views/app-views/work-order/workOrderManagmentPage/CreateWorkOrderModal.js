import React, { useEffect, useMemo, useState } from "react";
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
  message,
  InputNumber,
} from "antd";
import { SearchOutlined, FilterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import DrawingService from "services/DrawingService";
import GlobalFilterModal from "components/GlobalFilterModal";

const CreateWorkOrderModal = ({
  visible,
  onCancel,
  onCreate,
  editingWorkOrder, // ✅ your edit object is flat (drawingId, posNo, quantity, etc.)
  workOrderSettings,
  projectData,
  lastWorkOrderNo,
}) => {

  // console.log('----projectData',projectData)
  const [form] = Form.useForm();

  // ✅ store all rows (never directly filtered by edit)
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ selection by drawingId (stable)
  const [selectedDrawingIds, setSelectedDrawingIds] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const isEditMode = !!editingWorkOrder?._id;
  const editDrawingId = editingWorkOrder?.drawingId ? String(editingWorkOrder.drawingId) : null;

  const filterConfig = useMemo(() => {
    return [
      {
        type: "date",
        name: "drawingdate",
        label: "Drawing Date Range",
        placeholder: ["start"],
      },
      {
        type: "select",
        name: "project",
        label: "Project",
        placeholder: "Select Project",
        options: (projectData || []).map((project) => ({
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
  }, [projectData]);

  const generateWorkOrderNumber = (lastWorkOrderNoInput) => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, "0");

    const arr = Array.isArray(lastWorkOrderNoInput)
      ? lastWorkOrderNoInput
      : lastWorkOrderNoInput
      ? [lastWorkOrderNoInput]
      : [];

    const currentMonthNumbers = arr
      .filter((num) => String(num).startsWith(`WO${year}${month}`))
      .map((num) => parseInt(String(num).split("-")[1], 10))
      .filter((n) => !isNaN(n));

    const nextSeq = currentMonthNumbers.length ? Math.max(...currentMonthNumbers) + 1 : 1;
    const seqStr = String(nextSeq).padStart(5, "0");
    return `WO${year}${month}-${seqStr}`;
  };

  const fetchDrawings = async (params = {}) => {
    setLoading(true);
    try {
      const response = await DrawingService.getAllDrawings({...params,showOnlyQuoted:true});
      if (!response?.success) {
        message.error("Failed to fetch drawings");
        setAllRows([]);
        return;
      }

      const formatted = (response.data || []).map((drawing, index) => {
        const drawingId = drawing._id ? String(drawing._id) : String(index);

        const qty = Number(drawing.qty || 0);
        const unitPriceNum = Number(drawing?.totalPrice ?? 0);
        const totalPriceNum = qty * drawing?.totalPrice;

        return {
          key: drawingId,
          drawingId,
          drawingNo: drawing.drawingNo || "-",
          project: drawing.projectId?.projectName || drawing.projectName || "-",
          projectId: drawing.projectId?._id || null,
          customer: drawing.customerId?.companyName || drawing.customerName || "-",
          qty,
          unitPriceNum,
          unitPrice: `${drawing?.currency?.symbol} ${unitPriceNum.toFixed(2)}`,
          totalPrice: `${drawing?.currency?.symbol}  ${totalPriceNum.toFixed(2)}`,
          quotedDate: drawing.quotedDate ? dayjs(drawing.quotedDate).format("DD/MM/YYYY") : "-",
          // editable fields
          posNo: drawing.posNumber || "",
          workOrderQty: qty || 0,
          uom: drawing.uom || "PCS",
          remarks: drawing.remarks || "",
          status: drawing.quoteStatus || "draft",
        };
      });

      setAllRows(formatted);
    } catch (err) {
      console.error(err);
      message.error("Failed to fetch drawings");
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ edit-mode me sirf selected drawing row show
  const tableRows = useMemo(() => {
    if (!isEditMode) return allRows;
    if (!editDrawingId) return [];
    return allRows.filter((r) => String(r.drawingId) === String(editDrawingId));
  }, [allRows, isEditMode, editDrawingId]);

  const handleRowChange = (drawingId, field, value) => {
    setAllRows((prev) =>
      prev.map((r) => (String(r.drawingId) === String(drawingId) ? { ...r, [field]: value } : r))
    );
  };

  const quotedDrawingsColumns = useMemo(() => {
    return [
      {
        title: "",
        key: "selection",
        width: 50,
        render: (_, record) => (
          <Checkbox
            checked={selectedDrawingIds.includes(String(record.drawingId))}
            onChange={(e) => {
              const id = String(record.drawingId);
              if (e.target.checked) {
                setSelectedDrawingIds((s) => (s.includes(id) ? s : [...s, id]));
              } else {
                setSelectedDrawingIds((s) => s.filter((x) => x !== id));
              }
            }}
            disabled={isEditMode} // ✅ edit mode me selection change nahi (sirf wahi row)
          />
        ),
      },
      {
        title: "Drawing No",
        dataIndex: "drawingNo",
        key: "drawingNo",
        width:200,
        render: (text) => <strong>{text}</strong>,
      },
      {
        title: "Project",
        dataIndex: "project",
        key: "project",
        render: (t) => <Tag color="blue">{t}</Tag>,
      },
      {
        title: "Customer",
        dataIndex: "customer",
        key: "customer",
             width:200,
      },
      { title: "Qty", dataIndex: "qty", key: "qty" },
      { title: "Unit Price", dataIndex: "unitPrice", key: "unitPrice",width:100 },
      { title: "Total Price", dataIndex: "totalPrice", key: "totalPrice",width:100 },
      { title: "Quoted Date", dataIndex: "quotedDate", key: "quotedDate" },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (status) => (
          <Tag color={status === "quoted" ? "green" : status === "approved" ? "blue" : "orange"}>
            {String(status || "").toUpperCase()}
          </Tag>
        ),
      },
      // {
      //   title: "POS No",
      //   dataIndex: "posNo",
      //   key: "posNo",
      //   render: (_, record) => (
      //     <Input
      //       value={record.posNo}
      //       placeholder="Enter POS No"
      //       onChange={(e) => handleRowChange(record.drawingId, "posNo", e.target.value)}
      //       disabled={isEditMode} // ✅ edit mode me bhi allow karna ho to false kar do
      //     />
      //   ),
      // },
      {
  title: (
    <span>
      POS No <span style={{ color: "red" }}>*</span>
    </span>
  ),
  dataIndex: "posNo",
  key: "posNo",
  render: (_, record) => (
    <Input
      value={record.posNo}
      placeholder="Enter POS No"
      status={
        selectedDrawingIds.includes(String(record.drawingId)) &&
        (!record.posNo || record.posNo.trim() === "")
          ? "error"
          : ""
      }
      onChange={(e) =>
        handleRowChange(record.drawingId, "posNo", e.target.value)
      }
      disabled={isEditMode}
    />
  ),
}
,
      {
        title: "Work Order Qty",
        dataIndex: "workOrderQty",
        key: "workOrderQty",
        render: (_, record) => (
          <InputNumber
            min={0}
            value={record.workOrderQty}
            onChange={(val) => handleRowChange(record.drawingId, "workOrderQty", val)}
            style={{ width: "100%" }}
          />
        ),
      },
    ];
  }, [selectedDrawingIds, isEditMode]);

  const handleSearch = (value) => {
    setSearchQuery(value);
    if (isEditMode) return; // ✅ edit mode me search hide/disable feel
    fetchDrawings({ search: value });
  };

  const handleFilterSubmit = (data) => {
    if (isEditMode) {
      setIsFilterModalOpen(false);
      return;
    }
    fetchDrawings({
      projectId: data?.project,
      drawingDate: data?.drawingdate,
    });
    setIsFilterModalOpen(false);
  };

  const resetAll = () => {
    form.resetFields();
    setSelectedDrawingIds([]);
    setSearchQuery("");
    setAllRows([]);
  };

  const handleCancel = () => {
    resetAll();
    onCancel?.();
  };

  // ✅ open modal => fetch drawings
  useEffect(() => {
    if (!visible) return;

    // fetch first
    fetchDrawings();

    // set form defaults
    if (!isEditMode) {
      form.setFieldsValue({
        workOrderNo: generateWorkOrderNumber(lastWorkOrderNo),
      });
    }
  }, [visible]); // ✅ only depends on visible

  // ✅ when edit data + rows loaded => patch once
  useEffect(() => {
    if (!visible) return;

    if (isEditMode && editingWorkOrder) {
      form.setFieldsValue({
        workOrderNo: editingWorkOrder.workOrderNo,
        poNumber: editingWorkOrder.poNumber,
        projectNo : editingWorkOrder.projectNo,
        needDate: editingWorkOrder.needDate ? dayjs(editingWorkOrder.needDate) : null,
        commitDate: editingWorkOrder.commitDate ? dayjs(editingWorkOrder.commitDate) : null,
      });

      if (editDrawingId) {
        // ✅ lock selection to this drawing
        setSelectedDrawingIds([editDrawingId]);

        // ✅ patch row fields for edit (posNo, qty)
        setAllRows((prev) =>
          prev.map((r) => {
            if (String(r.drawingId) !== String(editDrawingId)) return r;
            return {
              ...r,
              posNo: editingWorkOrder.posNo ?? r.posNo ?? "",
              workOrderQty: typeof editingWorkOrder.quantity === "number" ? editingWorkOrder.quantity : r.workOrderQty,
              uom: editingWorkOrder.uom || r.uom || "PCS",
              remarks: editingWorkOrder.remarks ?? r.remarks ?? "",
            };
          })
        );
      }
    }
  }, [visible, isEditMode, editDrawingId, editingWorkOrder, form]);

  const handleCreateOrder = async (values) => {
    try {
      if (!selectedDrawingIds.length) {
        message.error("Please select at least one drawing");
        return;
      }

      const invalidRow = selectedDrawingIds
      .map((id) => allRows.find((r) => String(r.drawingId) === String(id)))
      .find((row) => !row?.posNo || row.posNo.trim() === "");

    if (invalidRow) {
      message.error("POS No is mandatory for all selected drawings");
      return;
    }

      const items = selectedDrawingIds
        .map((drawingId) => allRows.find((r) => String(r.drawingId) === String(drawingId)))
        .filter(Boolean)
        .map((row) => ({
          drawingId: row.drawingId,
          posNo: row.posNo || "",
          quantity: Number(row.workOrderQty || 0),
          uom: row.uom || "PCS",
          remarks: row.remarks || "",
        }));

      const firstRow = items[0];
      const firstDrawing = allRows.find((r) => String(r.drawingId) === String(firstRow?.drawingId));

      const workOrderData = {
        workOrderNo: values.workOrderNo,
        projectId: firstDrawing?.projectId || null,
        poNumber: values.poNumber,
        projectNo: values.projectNo,
        needDate: values.needDate ? values.needDate.format("YYYY-MM-DD") : null,
        commitDate: values.commitDate ? values.commitDate.format("YYYY-MM-DD") : null,
        status: values.status || "on_hold",
        isTriggered: false,
        items,
        // ✅ if edit save also needed, you can add _id
        ...(isEditMode ? { _id: editingWorkOrder?._id } : {}),
      };

      await onCreate(workOrderData);
       resetAll();
    } catch (err) {
      console.error(err);
      message.error("Failed to create/update work order");
    }
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
            {isEditMode ? "Edit Work Order" : "Create Work Order"}
          </div>
          <div style={{ fontSize: 14, color: "#666" }}>
            {isEditMode ? "Edit selected drawing work order details" : "Select quoted drawings and fill work order details"}
          </div>
        </Col>

        {!isEditMode && (
          <Col style={{ width: "45%", marginTop: 30 }}>
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
                <Button icon={<FilterOutlined />} onClick={() => setIsFilterModalOpen(true)}>
                  Filter
                </Button>
              </Col>
            </Row>
          </Col>
        )}
      </Row>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          {isEditMode ? "Selected Drawing" : "Select Quoted Drawings"}
        </div>

        <Table
          columns={quotedDrawingsColumns}
          dataSource={tableRows}
          pagination={false}
          loading={loading}
          scroll={{ x: 1100 }}
          size="small"
          rowKey="drawingId"
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
                <Input disabled={isEditMode} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="poNumber" label="PO Number" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>

             <Col xs={24} md={8}>
              <Form.Item name="projectNo" label="Project No" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24, 16]}>
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
                <DatePicker
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY"
                  disabled={editingWorkOrder?.status === "in_progress"}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={handleCancel}>Cancel</Button>
              <Button type="primary" htmlType="submit" disabled={!selectedDrawingIds.length}>
                {isEditMode ? "Update Order" : "Create Order"}
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


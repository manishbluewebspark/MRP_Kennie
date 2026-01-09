import React from "react";
import { Modal, Form, Radio, Select, Input, Row, Col } from "antd";

const { Option } = Select;

const WorkOrderExportModal = ({
  open,
  onCancel,
  onExport,

  // options
  customerOptions = [], // [{ value:"id", label:"ABC Pvt Ltd" }]
  projectOptions = [],  // [{ value:"K-Tools", label:"K-Tools" }] OR strings
  poOptions = [],       // strings
  workOrderOptions = [],// strings
}) => {
  const [form] = Form.useForm();

  const customerMode = Form.useWatch("customerMode", form) || "all"; // all | customer
  const filterMode = Form.useWatch("filterMode", form) || "none";     // none | project | projectRange | po | poRange | wo

  const handleOk = async () => {
    const values = await form.validateFields();
    onExport(values);
    onCancel();
    form.resetFields();
  };

  const resetDependentFields = () => {
    form.setFieldsValue({
      customerId: undefined,
      filterMode: "none",
      projectNames: undefined,
      projectNoFrom: undefined,
      projectNoTo: undefined,
      poNumbers: undefined,
      poFrom: undefined,
      poTo: undefined,
      workOrderNos: undefined,
    });
  };

  return (
    <Modal
      title="Export Work Orders"
      open={open}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={handleOk}
      okText="Export"
      width={520}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ customerMode: "all", filterMode: "none" }}
      >
        {/* 1) Customer Mode */}
        <Form.Item name="customerMode" label="Customers">
          <Radio.Group
            style={{ width: "100%" }}
            onChange={() => {
              // switching between all/customer resets dependent filters
              resetDependentFields();
            }}
          >
            <Radio value="all">All Customers</Radio>
            <Radio value="customer">Select Customer</Radio>
          </Radio.Group>
        </Form.Item>

        {/* 2) Customer Select (only if needed) */}
        {customerMode === "customer" && (
          <Form.Item
            name="customerId"
            label="Customer"
            rules={[{ required: true, message: "Select customer" }]}
          >
            <Select
              placeholder="Select customer"
              showSearch
              optionFilterProp="children"
              allowClear
              onChange={() => {
                // customer change -> reset filter selections
                form.setFieldsValue({
                  filterMode: "none",
                  projectNames: undefined,
                  projectNoFrom: undefined,
                  projectNoTo: undefined,
                  poNumbers: undefined,
                  poFrom: undefined,
                  poTo: undefined,
                  workOrderNos: undefined,
                });
              }}
            >
              {customerOptions.map((c) => (
                <Option key={c._id} value={c._id}>
                  {c.companyName}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* Divider-like spacing */}
        <div style={{ height: 8 }} />

        {/* 3) Filter Mode (after customer) */}
        <Form.Item name="filterMode" label="Filter (Optional)">
          <Radio.Group style={{ width: "100%" }}>
            <Radio value="none">No Filter</Radio>
            <Radio value="project">Project Name</Radio>
            <Radio value="projectRange">Project No Range</Radio>
            <Radio value="po">PO No</Radio>
            <Radio value="poRange">PO No Range</Radio>
            <Radio value="wo">Work Order No</Radio>
          </Radio.Group>
        </Form.Item>

        {/* Project Name (multi) */}
        {filterMode === "project" && (
          <Form.Item
            name="projectNames"
            label="Select Project(s)"
            rules={[{ required: true, message: "Select project(s)" }]}
          >
            <Select mode="multiple" placeholder="Select projects" showSearch>
              {projectOptions.map((p) => {
                // allow string or {value,label}
                const value = typeof p === "string" ? p : p.value;
                const label = typeof p === "string" ? p : p.label;
                return (
                  <Option key={value} value={value}>
                    {label}
                  </Option>
                );
              })}
            </Select>
          </Form.Item>
        )}

        {/* Project Range */}
        {filterMode === "projectRange" && (
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="projectNoFrom"
                label="Project No From"
                rules={[{ required: true, message: "Enter from" }]}
              >
                <Input placeholder="e.g. 1000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="projectNoTo"
                label="Project No To"
                rules={[{ required: true, message: "Enter to" }]}
              >
                <Input placeholder="e.g. 2000" />
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* PO multi */}
        {filterMode === "po" && (
          <Form.Item
            name="poNumbers"
            label="Select PO(s)"
            rules={[{ required: true, message: "Select PO(s)" }]}
          >
            <Select mode="multiple" placeholder="Select PO" showSearch>
              {poOptions.map((p) => (
                <Option key={p.value} value={p.value}>
                  {p.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* PO Range */}
        {filterMode === "poRange" && (
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="poFrom"
                label="PO From"
                rules={[{ required: true, message: "Enter from" }]}
              >
                <Input placeholder="e.g. PO-001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="poTo"
                label="PO To"
                rules={[{ required: true, message: "Enter to" }]}
              >
                <Input placeholder="e.g. PO-050" />
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* Work Order multi */}
        {filterMode === "wo" && (
          <Form.Item
            name="workOrderNos"
            label="Select Work Order(s)"
            rules={[{ required: true, message: "Select work order(s)" }]}
          >
            <Select mode="multiple" placeholder="Select Work Orders" showSearch>
              {workOrderOptions.map((w) => (
                <Option key={w.value} value={w.value}>
                  {w.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default WorkOrderExportModal;

import { Modal, Form, Radio, Select } from "antd";
const { Option } = Select;

const WorkOrderExportModal = ({
  open,
  onCancel,
  onExport,
  poOptions = [],
  projectOptions = [],
  workOrderOptions = [],
}) => {
  const [form] = Form.useForm();
  const mode = Form.useWatch("mode", form) || "all";

  const handleOk = async () => {
    const values = await form.validateFields();
    onExport(values);
    onCancel();
    form.resetFields();
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
      width={400}
    >
      <Form form={form} layout="vertical" initialValues={{ mode: "all" }}>

        <Form.Item name="mode" label="Filter By">
          <Radio.Group style={{ width: "100%" }}>
            <Radio value="all">All</Radio>
            <Radio value="po">PO No</Radio>
            <Radio value="project">Project No</Radio>
            <Radio value="wo">Work Order No</Radio>
          </Radio.Group>
        </Form.Item>

        {mode === "po" && (
          <Form.Item
            name="poNumbers"
            label="Select PO"
            rules={[{ required: true, message: "Select PO" }]}
          >
            <Select mode="multiple" placeholder="Select PO">
              {poOptions.map((p) => (
                <Option key={p} value={p}>
                  {p}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {mode === "project" && (
          <Form.Item
            name="projectNos"
            label="Select Project"
            rules={[{ required: true, message: "Select Project" }]}
          >
            <Select mode="multiple" placeholder="Select Project">
              {projectOptions.map((p) => (
                <Option key={p} value={p}>
                  {p}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {mode === "wo" && (
          <Form.Item
            name="workOrderNos"
            label="Select Work Order"
            rules={[{ required: true, message: "Select Work Order" }]}
          >
            <Select mode="multiple" placeholder="Select Work Order">
              {workOrderOptions.map((w) => (
                <Option key={w} value={w}>
                  {w}
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

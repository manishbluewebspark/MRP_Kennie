import React, { useEffect } from "react";
import { Select, Form, Row, Col } from "antd";
import GlobalModal from "components/GlobalModal";
import {
  RoundedInput,
  RoundedTextArea,
  RoundedInputNumber,
} from "components/FormFields";

const { Option } = Select; // ⚠️ Use AntD Select's Option

const AddSkillLevelModal = ({ visible, onCancel, onSubmit, formData, currencies = [], uoms = [] }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (formData) {
      form.setFieldsValue(formData);
    } else {
      form.resetFields();
    }
  }, [formData, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values, !!formData);
      form.resetFields();
    } catch (err) {
      console.error("Validation failed:", err);
    }
  };

  return (
    <GlobalModal
      visible={visible}
      onCancel={() => {
        onCancel();
        form.resetFields();
      }}
      onOk={handleOk}
      header={formData ? "Edit Skill Level" : "Add Skill Level"}
      okText={formData ? "Update" : "Submit"}
      width={800}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Skill Level Name"
          name="skillLevelName"
          rules={[{ required: true, message: "Enter skill level name" }]}
        >
          <RoundedInput placeholder="Enter skill level name" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="Rate"
              name="rate"
              rules={[{ required: true, message: "Enter rate" }]}
            >
              <RoundedInputNumber placeholder="Enter rate" />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              label="Currency Type"
              name="currencyType"
              rules={[{ required: true, message: "Select currency type" }]}
            >
              <Select placeholder="Select currency">
                {currencies.map((c) => (
                  <Option key={c._id} value={c._id}>
                    {c.symbol} {c.code} - {c.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              label="Rate Type"
              name="type"
              rules={[{ required: true, message: "Select rate type" }]}
            >
              <Select placeholder="Select UOM">
                {uoms.map(option => (
                  <Option key={option._id} value={option._id}>
                    {option.code}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Description" name="description">
          <RoundedTextArea rows={3} placeholder="Enter description" />
        </Form.Item>
      </Form>
    </GlobalModal>
  );
};

export default AddSkillLevelModal;

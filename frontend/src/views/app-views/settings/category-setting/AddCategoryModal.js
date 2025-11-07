import React, { useEffect, useState } from "react";
import { Form, Row, Col, Input, Switch, Select } from "antd";
import GlobalModal from "components/GlobalModal";
import { RoundedInput } from "components/FormFields";

const { TextArea } = Input;
const { Option } = Select;

const AddCategoryModal = ({ visible, onCancel, onSubmit, formData, loading }) => {
  const [form] = Form.useForm();
  const [status, setStatus] = useState("active");

  useEffect(() => {
    if (formData) {
      form.setFieldsValue({
        name: formData.name,
        description: formData.description,
        status: formData.status,
      });
      setStatus(formData.status || "active");
    } else {
      form.resetFields();
      setStatus("active");
    }
  }, [formData, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      const submitData = {
        name: values.name,
        description: values.description,
        status: values.status,
      };

      await onSubmit(submitData);
      form.resetFields();
      setStatus("active");
    } catch (err) {
      console.error("Form validation failed:", err);
    }
  };

  return (
    <GlobalModal
      visible={visible}
      onCancel={() => { onCancel(); form.resetFields(); }}
      onOk={handleOk}
      header={formData ? "Edit Category" : "Add New Category"}
      okText={formData ? "Update" : "Submit"}
      width={500}
      confirmLoading={loading}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item 
              label="Category Name" 
              name="name" 
              rules={[
                { required: true, message: 'Please enter category name' },
                { min: 2, message: 'Category name must be at least 2 characters' },
                { max: 50, message: 'Category name cannot exceed 50 characters' }
              ]}
            >
              <RoundedInput placeholder="Enter category name" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item 
              label="Description" 
              name="description"
              rules={[
                { max: 200, message: 'Description cannot exceed 200 characters' }
              ]}
            >
              <TextArea
                placeholder="Enter category description (optional)"
                rows={3}
                style={{ borderRadius: '8px' }}
                showCount
                maxLength={200}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item 
              label="Status" 
              name="status" 
              initialValue="active"
            >
              <Select 
                style={{ borderRadius: '8px' }}
                value={status}
                onChange={setStatus}
              >
                <Option value="active">Active</Option>
                <Option value="deactive">Inactive</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </GlobalModal>
  );
};

export default AddCategoryModal;
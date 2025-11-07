import React, { useEffect } from "react";
import { Form, Row, Col, Select } from "antd";
import GlobalModal from "components/GlobalModal";
import { RoundedInput, RoundedTextArea } from "components/FormFields";

const { Option } = Select;

const AddProjectModal = ({
  visible,
  onCancel,
  onSubmit,
  formData,
  customers = [],
  currencies = [],
}) => {
  const [form] = Form.useForm();

  // useEffect(() => {
  //   if (formData) {
  //     form.setFieldsValue({
  //       projectName: formData.projectName,
  //       customerId: formData.customer?._id,
  //       currency: formData.currency,
  //       description: formData.description,
  //     });
  //   } else {
  //     form.resetFields();
  //   }
  // }, [formData, form]);

  useEffect(() => {
    if (formData) {
      // Debug logs
      console.log('Editing project:', formData);
      console.log('Customer ID to set:', formData.customerId?._id);

      // Set form values
      form.setFieldsValue({
        projectName: formData.projectName || '',
        customerId: formData.customerId?._id || formData.customerId || '',
        currency: formData?.currency?._id,
        description: formData.description || '',
      });

    } else {
      form.resetFields();
    }
  }, [formData, form, visible]); // visible भी add करें

  const handleOk = () => {
    form.validateFields().then((values) => {
      onSubmit(values);
      form.resetFields();
    });
  };

  return (
    <GlobalModal
      visible={visible}
      onCancel={() => {
        onCancel();
        form.resetFields();
      }}
      onOk={handleOk}
      header={formData ? "Edit Project" : "Add New Project"}
      okText={formData ? "Update" : "Submit"}
      width={700}
      height={500}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="Project Name"
              name="projectName"
              rules={[{ required: true, message: "Enter project name" }]}
            >
              <RoundedInput placeholder="Enter project name" />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item
              label="Customer"
              name="customerId"
              rules={[{ required: true, message: "Select a customer" }]}
            >
              <Select placeholder="Select customer">
                {customers.map((c) => (
                  <Option key={c._id} value={c._id}>
                    {c.companyName} - {c.contactPerson}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item
              label="Currency"
              name="currency"
              rules={[{ required: true, message: "Select currency" }]}
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

          <Col span={24}>
            <Form.Item label="Description" name="description">
              <RoundedTextArea placeholder="Enter description" rows={3} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </GlobalModal>
  );
};

export default AddProjectModal;

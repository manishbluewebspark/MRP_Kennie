import React, { useEffect } from "react";
import { Form, Row, Col, Select } from "antd";
import GlobalModal from "components/GlobalModal";
import { RoundedInput, RoundedTextArea } from "components/FormFields";
const {Option} = Select;
const AddCustomerModal = ({ visible, onCancel, onSubmit, formData,currencies=[] }) => {
  const [form] = Form.useForm();

  // Prefill form in case of edit
  useEffect(() => {
    if (formData && visible) {
      form.setFieldsValue({
        companyName: formData.companyName || '',
        contactPerson: formData.contactPerson || '',
        email: formData.email || '',
        phone: formData.phone || '',
        paymentTerms: formData.paymentTerms || '',
        incoterms: formData.incoterms || '',
        address: formData.address || '',
      });
    } else {
      form.resetFields();
    }
  }, [formData, form, visible]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      onSubmit(values);
      form.resetFields();
    }).catch((error) => {
      console.log('Validation failed:', error);
    });
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <GlobalModal
      visible={visible}
      onCancel={handleCancel}
      onOk={handleOk}
      header={formData ? "Edit Customer" : "Add New Customer"}
      okText={formData ? "Update" : "Submit"}
      width={700}
      height={500}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Company Name"
              name="companyName"
              rules={[{ required: true, message: "Please enter company name" }]}
            >
              <RoundedInput placeholder="Enter company name" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="Contact Person"
              name="contactPerson"
              rules={[{ required: true, message: "Please enter contact person" }]}
            >
              <RoundedInput placeholder="Enter contact person" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: "Please enter email" },
                { type: "email", message: "Please enter a valid email" },
              ]}
            >
              <RoundedInput placeholder="Enter email" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="Phone"
              name="phone"
              rules={[{ required: true, message: "Please enter phone number" }]}
            >
              <RoundedInput placeholder="Enter phone number" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item label="Payment Terms" name="paymentTerms">
              <RoundedInput placeholder="Enter payment terms" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item label="Incoterms" name="incoterms">
              <RoundedInput placeholder="Enter Incoterms" />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item label="Address" name="address">
              <RoundedTextArea placeholder="Enter address" rows={3} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </GlobalModal>
  );
};

export default AddCustomerModal;
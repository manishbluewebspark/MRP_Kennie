import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Checkbox, Button, Row, Col, Space, message } from 'antd';

const { Option } = Select;
const { TextArea } = Input;

const AddSupplierModal = ({ visible, onCancel, onCreate, onEdit, editData, isEdit, currencies = [],setGstApplicable, gstApplicable }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens/closes or editData changes
  useEffect(() => {
    if (visible) {
      if (editData) {
        // Set form values for edit mode
        form.setFieldsValue({
          companyName: editData.companyName,
          contactPerson: editData.contactPerson?.name || editData.contactPerson,
          email: editData.contactPerson?.email || editData.email,
          phone: editData.phone,
          currency: editData.currency._id,
          paymentTerms: editData.paymentTerms,
          incoTerms: editData.incoTerms,
          companyAddress: editData.companyAddress,
          // gst:editData.gst
        });
        setGstApplicable(editData.gst);
      } else {
        // Reset form for add mode
        form.resetFields();
        setGstApplicable(false);
      }
    }
  }, [visible, editData, form]);

  const handleCancel = () => {
    form.resetFields();
    setGstApplicable(false);
    onCancel();
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      if (editData) {
        // Edit mode
        await onEdit(editData._id, values);
        message.success('Supplier updated successfully!');
      } else {
        // Create mode
        await onCreate(values);
        message.success('Supplier created successfully!');
      }

      form.resetFields();
      setGstApplicable(false);
      onCancel();
    } catch (error) {
      console.log('Validation Failed:', error);
      message.error('Please fill all required fields correctly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={isEdit ? "Edit Supplier" : "Add New Supplier"}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: '20px' }}
      >
        {/* Company Name */}
        <Row>
          <Col span={24}>
            <Form.Item
              label="Company Name"
              name="companyName"
              rules={[{ required: true, message: 'Please enter company name' }]}
            >
              <Input placeholder="Enter name" size="large" />
            </Form.Item>
          </Col>
        </Row>

        {/* Contact Person & Email Address */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Contact Person"
              name="contactPerson"
              rules={[{ required: true, message: 'Please enter contact person' }]}
            >
              <Input placeholder="Enter name" size="large" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Email Address"
              name="email"
              rules={[
                { required: true, message: 'Please enter email address' },
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input placeholder="Enter address" size="large" />
            </Form.Item>
          </Col>
        </Row>

        {/* Phone Number & Currency */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Phone Number"
              name="phone"
              rules={[{ required: true, message: 'Please enter phone number' }]}
            >
              <Input placeholder="Enter number" size="large" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Currency"
              name="currency"
              rules={[{ required: true, message: 'Please select currency' }]}
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
        </Row>

        {/* Payment Terms & Incoterms */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Payment Terms"
              name="paymentTerms"
              rules={[{ required: true, message: 'Please select payment terms' }]}
            >
              <Select placeholder="Select" size="large">
                <Option value="Net 30">Net 30</Option>
                <Option value="Net 15">Net 15</Option>
                <Option value="Net 45">Net 45</Option>
                <Option value="Net 60">Net 60</Option>
                <Option value="Due on receipt">Due on receipt</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Incoterms"
              name="incoTerms"
              rules={[{ required: true, message: 'Please select incoterms' }]}
            >
              <Select placeholder="Select" size="large">
                <Option value="DAP">DAP (Delivered at Place)</Option>
                <Option value="EXW">EXW (Ex Works)</Option>
                <Option value="FOB">FOB (Free on Board)</Option>
                <Option value="CIF">CIF (Cost, Insurance and Freight)</Option>
                <Option value="DDP">DDP (Delivered Duty Paid)</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* GST Checkbox */}
        <Form.Item >
          <Checkbox
            checked={gstApplicable}
            onChange={(e) => setGstApplicable(e.target.checked)}
            style={{ marginBottom: '16px' }}
          >
            GST Applicable: Check this box if GST charges apply to this supplier
          </Checkbox>
        </Form.Item>

        {/* Company Address */}
        <Form.Item
          label="Company Address"
          name="companyAddress"
          rules={[{ required: true, message: 'Please enter company address' }]}
        >
          <TextArea
            placeholder="Enter address"
            rows={4}
            style={{ resize: 'vertical' }}
          />
        </Form.Item>

        {/* Action Buttons */}
        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button size="large" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="primary"
              size="large"
              onClick={handleSubmit}
              loading={loading}
            >
              {editData ? 'Update' : 'Create'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddSupplierModal;
import React from 'react';
import { Modal, Form, Input, Typography, Space } from 'antd';

const { Title, Text } = Typography;

const UpdateOutgoingQuantityModal = ({ visible, onCancel, onUpdate }) => {
  const [form] = Form.useForm();

  const handleSubmit = (values) => {
    console.log('Update values:', values);
    if (onUpdate) {
      onUpdate(values);
    }
    form.resetFields();
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="Update Outgoing Quantity"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={400}
      centered
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>
            Update outgoing quantity for <Text strong>11223355-C</Text>
          </Text>
        </div>

        <div style={{ 
          marginBottom: 16, 
          padding: '8px 12px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: 6 
        }}>
          <Text type="secondary">Available balance: </Text>
          <Text strong>0</Text>
        </div>

        <Form.Item
          name="outgoingQuantity"
          label="Outgoing Quantity"
          rules={[{ required: true, message: 'Please enter quantity' }]}
        >
          <Input 
            placeholder="Enter quantity" 
            size="large"
          />
        </Form.Item>

        <div style={{ textAlign: 'right', marginTop: 24 }}>
          <Space>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                padding: '8px 16px',
                border: '1px solid #d9d9d9',
                borderRadius: 6,
                backgroundColor: '#fff',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                border: '1px solid #1890ff',
                borderRadius: 6,
                backgroundColor: '#1890ff',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Update
            </button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
};

export default UpdateOutgoingQuantityModal;
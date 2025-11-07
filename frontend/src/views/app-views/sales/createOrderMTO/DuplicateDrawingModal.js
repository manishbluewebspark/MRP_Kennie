import React from 'react';
import { Modal, Form, Input, Button, Typography, Divider } from 'antd';

const { Title, Text } = Typography;

const DuplicateDrawingModal = ({ visible, onClose, onDuplicate }) => {
  const [form] = Form.useForm();

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  const handleDuplicate = () => {
    form.validateFields()
      .then(values => {
        console.log('Duplicate drawing with number:', values.newDrawingNumber);
        onDuplicate(values.newDrawingNumber);
        handleCancel();
      })
      .catch(errorInfo => {
        console.log('Validation failed:', errorInfo);
      });
  };

  return (
    <Modal
      title={
        <Title level={3} style={{ margin: 0, textAlign: 'center' }}>
          Duplicate Drawing
        </Title>
      }
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel} size="large">
          Cancel
        </Button>,
        <Button 
          key="duplicate" 
          type="primary" 
          onClick={handleDuplicate}
          size="large"
        >
          Duplicate Drawing
        </Button>,
      ]}
      width={500}
      centered
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Text style={{ fontSize: '14px', lineHeight: '1.5' }}>
          Copy all costings from the current drawing to a new drawing number
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
      >
        <Form.Item
          name="newDrawingNumber"
          label={
            <Text strong style={{ fontSize: '14px' }}>
              New Drawing Number
            </Text>
          }
          rules={[{ required: true, message: 'Please enter new drawing number' }]}
        >
          <Input 
            placeholder="Enter Number" 
            size="large"
          />
        </Form.Item>
      </Form>

      <Divider />

      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ display: 'block', marginBottom: 16, fontSize: '14px' }}>
          This will copy:
        </Text>
        
        <div style={{ paddingLeft: 8 }}>
          <div style={{ marginBottom: 8 }}>
            <Text>• All Materials Costing items</Text>
          </div>
          <div style={{ marginBottom: 8 }}>
            <Text>• All Manhour Costing items</Text>
          </div>
          <div style={{ marginBottom: 8 }}>
            <Text>• All Packing/Others Costing items</Text>
          </div>
          <div>
            <Text>• Drawing basic information (excluding project assignment)</Text>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DuplicateDrawingModal;
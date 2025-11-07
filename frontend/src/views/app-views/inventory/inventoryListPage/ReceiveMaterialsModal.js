import React, { useState } from 'react';
import { Modal, Card, Typography, Button, Table, Input, Select, Divider, Row, Col, Form, message } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

const ReceiveMaterialsModal = ({ visible, onCancel, onSubmit, purchaseOrderData }) => {
  const [form] = Form.useForm();
  const [receivedQuantities, setReceivedQuantities] = useState({});
  const [rejectedQuantities, setRejectedQuantities] = useState({});

  // Table columns definition
  const columns = [
    {
      title: 'MPN',
      dataIndex: 'mpn',
      key: 'mpn',
      width: 80,
    },
    {
      title: 'Manufacturer',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      width: 100,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 120,
    },
    {
      title: 'UOM',
      dataIndex: 'uom',
      key: 'uom',
      width: 70,
    },
    {
      title: 'Ordered Qty',
      dataIndex: 'orderedQty',
      key: 'orderedQty',
      width: 90,
    },
    {
      title: 'Need Date',
      dataIndex: 'needDate',
      key: 'needDate',
      width: 100,
    },
    {
      title: 'Committed Date',
      dataIndex: 'committedDate',
      key: 'committedDate',
      width: 110,
    },
    {
      title: 'Received Qty',
      dataIndex: 'receivedQty',
      key: 'receivedQty',
      width: 100,
      render: (_, record) => (
        <Input 
          placeholder="Enter Qty" 
          size="small" 
          style={{ width: 80 }}
          value={receivedQuantities[record.key] || ''}
          onChange={(e) => handleQuantityChange(record.key, 'received', e.target.value)}
        />
      ),
    },
    {
      title: 'Rejected Qty',
      dataIndex: 'rejectedQty',
      key: 'rejectedQty',
      width: 100,
      render: (_, record) => (
        <Input 
          placeholder="Enter Qty" 
          size="small" 
          style={{ width: 80 }}
          value={rejectedQuantities[record.key] || ''}
          onChange={(e) => handleQuantityChange(record.key, 'rejected', e.target.value)}
        />
      ),
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
      key: 'remarks',
      width: 100,
      render: (_, record) => (
        <Input 
          placeholder="Enter Qty" 
          size="small" 
          style={{ width: 80 }}
          value={rejectedQuantities[record.key] || ''}
          onChange={(e) => handleQuantityChange(record.key, 'remarks', e.target.value)}
        />
      ),
    },
  ];

  // Table data
  const tableData = [
    {
      key: '1',
      mpn: '1292C',
      manufacturer: 'Alpha',
      description: 'Cable, 22AWG',
      uom: 'FEET',
      orderedQty: 155,
      needDate: '08/09/2025',
      committedDate: '03/09/2025',
    },
  ];

  const handleQuantityChange = (key, type, value) => {
    if (type === 'received') {
      setReceivedQuantities(prev => ({
        ...prev,
        [key]: value
      }));
    } else {
      setRejectedQuantities(prev => ({
        ...prev,
        [key]: value
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      // Validate form
      const values = await form.validateFields();
      
      // Prepare submission data
      const submissionData = {
        purchaseOrderDetails: values,
        materials: tableData.map(item => ({
          ...item,
          receivedQty: receivedQuantities[item.key] || 0,
          rejectedQty: rejectedQuantities[item.key] || 0
        })),
        purchaseOrderHeader: purchaseOrderData || {
          id: "P25-00006",
          vendor: "Jaytron",
          poDate: "13/08/2025",
          needDate: "11/08/2025"
        }
      };

      // Call onSubmit prop with all data
      if (onSubmit) {
        onSubmit(submissionData);
      }

      // Show success message
      message.success('Materials received successfully!');
      
      // Reset form and close modal
      form.resetFields();
      setReceivedQuantities({});
      setRejectedQuantities({});
      
    } catch (error) {
      console.error('Form validation failed:', error);
      message.error('Please fill all required fields correctly.');
    }
  };

  const handleCancel = () => {
    // Reset form when canceling
    form.resetFields();
    setReceivedQuantities({});
    setRejectedQuantities({});
    onCancel();
  };

  return (
    <Modal
      title="Receive Materials"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={1200}
    //   style={{ top: 20 }}
    >
      <Form form={form} layout="vertical">
        {/* Purchase Order Header */}
        <Card
          size="small"
          style={{
            marginBottom: 16,
            border: '1px solid #d9d9d9',
            borderRadius: 6,
          }}
          bodyStyle={{ padding: '12px 16px' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <Text strong style={{ fontSize: '14px' }}>
                  {purchaseOrderData?.id || "P25-00006"}
                </Text>
              </div>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: 4 }}>
                {purchaseOrderData?.vendor || "Jaytron"}
              </Text>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <CalendarOutlined style={{ fontSize: '12px', color: '#8c8c8c', marginRight: 4 }} />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  PO Date: {purchaseOrderData?.poDate || "13/08/2025"}
                </Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <CalendarOutlined style={{ fontSize: '12px', color: '#8c8c8c', marginRight: 4 }} />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Need Date: {purchaseOrderData?.needDate || "11/08/2025"}
                </Text>
              </div>
            </div>
          </div>
        </Card>

        {/* Materials Table */}
        <div style={{ marginBottom: 24 }}>
          <Table
            columns={columns}
            dataSource={tableData}
            pagination={false}
            size="small"
            scroll={{ x: 800 }}
            style={{ 
              border: '1px solid #d9d9d9',
              borderRadius: 6,
            }}
          />
        </div>

        <Divider style={{ margin: '16px 0' }} />

        {/* Purchase Order Details Section */}
        <div style={{ marginBottom: 24 }}>
          <Title level={4} style={{ marginBottom: 16 }}>
            Purchase Order Details
          </Title>
          
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="poNumber"
                label={<Text strong>PO No.</Text>}
                rules={[{ required: true, message: 'Please enter PO number' }]}
              >
                <Input placeholder="Enter number" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="projectNumber"
                label={<Text strong>Project No.</Text>}
                rules={[{ required: true, message: 'Please select project number' }]}
              >
                <Select placeholder="Select">
                  <Option value="project1">Project 1</Option>
                  <Option value="project2">Project 2</Option>
                  <Option value="project3">Project 3</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="projectType"
                label={<Text strong>Project Type</Text>}
                rules={[{ required: true, message: 'Please select project type' }]}
              >
                <Select placeholder="Select">
                  <Option value="type1">Type 1</Option>
                  <Option value="type2">Type 2</Option>
                  <Option value="type3">Type 3</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

        </div>

        {/* Footer Buttons */}
        <div style={{ textAlign: 'right' }}>
          <Button onClick={handleCancel} style={{ marginRight: 8 }}>
            Cancel
          </Button>
          <Button type="primary" onClick={handleSubmit}>
            Receive Materials
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default ReceiveMaterialsModal;
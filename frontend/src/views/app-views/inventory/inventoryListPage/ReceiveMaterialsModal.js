import React, { useState, useEffect } from 'react';
import { Modal, Card, Typography, Button, Table, Input, Select, Divider, Row, Col, Form, message, Tooltip } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { formatDate } from 'utils/formatDate';

const { Title, Text } = Typography;
const { Option } = Select;

const ReceiveMaterialsModal = ({ visible, onCancel, onSubmit, purchaseOrderData }) => {
  const [form] = Form.useForm();
  const [receivedQuantities, setReceivedQuantities] = useState({});
  const [rejectedQuantities, setRejectedQuantities] = useState({});
  const [remarks, setRemarks] = useState({});

  // Initialize quantities when modal opens or purchaseOrderData changes
  useEffect(() => {
    if (visible && purchaseOrderData?.items) {
      const initialReceived = {};
      const initialRejected = {};
      const initialRemarks = {};
      
      purchaseOrderData.items.forEach(item => {
        const key = item._id || item.key;
        initialReceived[key] = '';
        initialRejected[key] = '';
        initialRemarks[key] = '';
      });
      
      setReceivedQuantities(initialReceived);
      setRejectedQuantities(initialRejected);
      setRemarks(initialRemarks);
    }
  }, [visible, purchaseOrderData]);

  // Table columns definition
  const columns = [
    {
      title: 'MPN',
      dataIndex: 'mpnData',
      key: 'mpn',
      width: 120,
      render: (mpnData, record) => (
      
          <div style={{ fontWeight: 500 }}>
            {mpnData?.MPN || record?.mpnData?.partNumber || 'N/A'}
          </div>
     
      )
    },
    {
      title: 'Manufacturer',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      width: 120,
      render: (text, record) => (
        <Text>{text || record?.mpnData?.manufacturer || 'N/A'}</Text>
      )
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
      render: (text, record) => (
        <Tooltip title={text}>
          <Text>{text}</Text>
        </Tooltip>
      )
    },
    {
      title: 'UOM',
      dataIndex: 'uomData',
      key: 'uom',
      width: 80,
      render: (uomData, record) => {
        const uomInfo = uomData || record?.uomDetails || {};
        const displayText = uomInfo.symbol || uomInfo.name || 'N/A';
        
        return (
          <div style={{ 
            padding: '4px 8px',
            backgroundColor: '#f0f7ff',
            border: '1px solid #d0e3ff',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#1890ff',
            textAlign: 'center',
            minWidth: '40px'
          }}>
            {displayText}
          </div>
        );
      }
    },
    {
      title: 'Ordered Qty',
      dataIndex: 'qty',
      key: 'orderedQty',
      width: 100,
      align: 'center',
      render: (qty) => <Text strong>{qty}</Text>
    },
    {
      title: 'Need Date',
      dataIndex: 'needDate',
      key: 'needDate',
      width: 110,
      render: (_, record) => formatDate(record?.needDate || purchaseOrderData?.needDate)
    },
    {
      title: 'Received Qty',
      dataIndex: 'receivedQty',
      key: 'receivedQty',
      width: 120,
      render: (_, record) => {
        const key = record._id || record.key;
        return (
          <Input 
            type="number"
            placeholder="0" 
            size="small" 
            style={{ width: '100%' }}
            value={receivedQuantities[key] || ''}
            onChange={(e) => handleQuantityChange(key, 'received', e.target.value)}
            min={0}
            max={record.qty}
          />
        );
      },
    },
    {
      title: 'Rejected Qty',
      dataIndex: 'rejectedQty',
      key: 'rejectedQty',
      width: 120,
      render: (_, record) => {
        const key = record._id || record.key;
        return (
          <Input 
            type="number"
            placeholder="0" 
            size="small" 
            style={{ width: '100%' }}
            value={rejectedQuantities[key] || ''}
            onChange={(e) => handleQuantityChange(key, 'rejected', e.target.value)}
            min={0}
            max={record.qty}
          />
        );
      },
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
      key: 'remarks',
      width: 150,
      render: (_, record) => {
        const key = record._id || record.key;
        return (
          <Input 
            placeholder="Enter remarks" 
            size="small" 
            style={{ width: '100%' }}
            value={remarks[key] || ''}
            onChange={(e) => handleQuantityChange(key, 'remarks', e.target.value)}
          />
        );
      },
    },
  ];

  const handleQuantityChange = (key, type, value) => {
    if (type === 'received') {
      setReceivedQuantities(prev => ({
        ...prev,
        [key]: value
      }));
    } else if (type === 'rejected') {
      setRejectedQuantities(prev => ({
        ...prev,
        [key]: value
      }));
    } else if (type === 'remarks') {
      setRemarks(prev => ({
        ...prev,
        [key]: value
      }));
    }
  };

const handleSubmit = async () => {
  try {
    // Validate received quantities
    const itemsWithQuantities = purchaseOrderData?.items.filter(item => {
      const key = item._id || item.key;
      const receivedQty = parseInt(receivedQuantities[key] || 0);
      return receivedQty > 0;
    });

    if (!itemsWithQuantities || itemsWithQuantities.length === 0) {
      message.error('Please enter received quantity for at least one item');
      return;
    }

    // Prepare items array
    const items = itemsWithQuantities.map(item => {
      const key = item._id || item.key;
      const receivedQty = parseInt(receivedQuantities[key] || 0);
      const rejectedQty = parseInt(rejectedQuantities[key] || 0);

      // Validate quantities don't exceed ordered
      if (receivedQty + rejectedQty > item.qty) {
        throw new Error(`Total quantity cannot exceed ordered quantity for ${item.description}`);
      }

      return {
        mpnId: item.mpn, // ✅ Backend ko mpnId chahiye
        itemId: item._id,
        receivedQty: receivedQty,
        rejectedQty: rejectedQty,
        description: item.description,
        orderedQty: item.qty,
        unitPrice: item.unitPrice,
        remarks: remarks[key] || ''
      };
    });

    // Final submission data
    const submissionData = {
      purchaseOrderId: purchaseOrderData?._id,
      supplierId: purchaseOrderData?.supplier?._id,
      receivedBy: "user_id_here", // ✅ Actual user ID dalo
      items: items, // ✅ Yeh main field hai
      notes: `Materials received for PO: ${purchaseOrderData?.poNumber}`,
      receiveDate: new Date()
    };

    console.log('Final Submission Data:', JSON.stringify(submissionData, null, 2));

    if (onSubmit) {
      await onSubmit(submissionData);
    }

  } catch (error) {
    console.error('Validation failed:', error);
    message.error(error.message || 'Failed to receive materials');
  }
};

  const handleCancel = () => {
    // Reset form when canceling
    form.resetFields();
    setReceivedQuantities({});
    setRejectedQuantities({});
    setRemarks({});
    onCancel();
  };

  // Prepare table data with proper keys
  const tableData = purchaseOrderData?.items?.map(item => ({
    ...item,
    key: item._id || item.key
  })) || [];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span>Receive Materials</span>
          <Text type="secondary" style={{ marginLeft: 8, fontSize: '14px' }}>
            - {purchaseOrderData?.poNumber}
          </Text>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={1300}
      style={{ top: 20 }}
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
          <Row gutter={16}>
            <Col span={8}>
              <div style={{ marginBottom: 8 }}>
                <Text strong style={{ fontSize: '14px' }}>
                  PO Number: {purchaseOrderData?.poNumber}
                </Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <CalendarOutlined style={{ fontSize: '12px', color: '#8c8c8c', marginRight: 4 }} />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  PO Date: {formatDate(purchaseOrderData?.poDate)}
                </Text>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 8 }}>
                <Text strong style={{ fontSize: '14px' }}>
                  Supplier: {purchaseOrderData?.supplier?.companyName}
                </Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <CalendarOutlined style={{ fontSize: '12px', color: '#8c8c8c', marginRight: 4 }} />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Need Date: {formatDate(purchaseOrderData?.needDate)}
                </Text>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 8 }}>
                <Text strong>Status: </Text>
                <Text type="secondary">{purchaseOrderData?.status}</Text>
              </div>
              <div>
                <Text strong>Reference: </Text>
                <Text type="secondary">{purchaseOrderData?.referenceNo || 'N/A'}</Text>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Materials Table */}
        <div style={{ marginBottom: 24 }}>
          <Table
            columns={columns}
            dataSource={tableData}
            pagination={false}
            size="small"
            scroll={{ x: 1000 }}
            style={{ 
              border: '1px solid #d9d9d9',
              borderRadius: 6,
            }}
          />
        </div>

        <Divider style={{ margin: '16px 0' }} />

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
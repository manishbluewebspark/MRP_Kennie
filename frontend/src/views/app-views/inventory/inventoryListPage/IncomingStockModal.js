import React from 'react';
import { Modal, Table, Tag, Card, Typography, Space, DatePicker } from 'antd';
import { MailOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs'
const { Text, Title } = Typography;

const IncomingStockModal = ({ visible, onCancel, purchaseData }) => {
  // Extract the purchaseData array from the inventory item object
  const safePurchaseData = purchaseData?.purchaseData || [];
  console.log('-----safePurchaseData',safePurchaseData)
  // If no purchase data, show empty state
  if (safePurchaseData.length === 0) {
    return (
      <Modal
        title="Incoming Stock Details"
        visible={visible}
        onCancel={onCancel}
        width={800}
        footer={null}
        centered
      >
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Text type="secondary">No incoming stock data available</Text>
        </div>
      </Modal>
    );
  }

  // Use the main object data for product information
  const productData = {
    mpn: purchaseData?.MPN || 'N/A',
    manufacturer: purchaseData?.Manufacturer || 'N/A',
    description: purchaseData?.Description || 'N/A',
    uom: 'PCS',
    totalIncoming: purchaseData?.IncomingQty || 0
  };

  // Transform purchaseData for the table
  const poData = safePurchaseData.map((item, index) => ({
    key: index,
    poNumber: item.poNumber || 'N/A',
    supplier: item.supplier?.companyName || (item.supplier?.companyName ? 'Supplier ID: ' + item.supplier.contactPerson : 'N/A'),
    qty: item.quantity || 0,
    needDate: item.needDate || 'N/A',
    committedDate: item.committedDate || 'N/A',
    status: item.poStatus || item.status || 'Pending',
    statusIcon: getStatusIcon(item.poStatus || item.status)
  }));

  // Helper function to get status icon
  function getStatusIcon(status) {
    const statusIcons = {
      'Emailed': '💹',
      'Pending': '',
      'Approved': '✅',
      'Partially Received': '📦',
      'Received': '📬',
      'Cancelled': '❌'
    };
    return statusIcons[status] || '📋';
  }

  // Helper function to get status tag color
  function getStatusColor(status) {
    const statusColors = {
      'Emailed': 'blue',
      'Pending': 'orange',
      'Approved': 'green',
      'Partially Received': 'purple',
      'Received': 'green',
      'Cancelled': 'red'
    };
    return statusColors[status] || 'default';
  }

  // Columns for the PO table
  const poColumns = [
    {
      title: 'PO Number',
      dataIndex: 'poNumber',
      key: 'poNumber',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Supplier',
      dataIndex: 'supplier',
      key: 'supplier',
    },
    {
      title: 'Qty',
      dataIndex: 'qty',
      key: 'qty',
      render: (qty) => (
        <Space>
          <Text>{qty}</Text>
          {/* <Text type="secondary">{productData.uom}</Text> */}
        </Space>
      ),
    },
    {
      title: 'Need Date',
      dataIndex: 'needDate',
      key: 'needDate',
      render: (date) => (
        <Space>
          <CalendarOutlined />
          <Text>{date === 'N/A' ? 'Not Specified' : date}</Text>
        </Space>
      ),
    },
 {
  title: 'Supplier Committed Date',
  dataIndex: 'committedDate',
  key: 'committedDate',
  render: (date, record) => {
    const hasDate = record && date !== "N/A";

    return (
      <Space>
        <CalendarOutlined />

        {/* If date exists → show DatePicker for editing */}
        {hasDate ? (
          <DatePicker
            value={dayjs(date)}
            format="DD/MM/YYYY"
            // onChange={(newDate) => handleCommitDateChange(record, newDate)}
          />
        ) : (
          // If no date → show plain text
          <Text type="secondary">Not Committed</Text>
        )}
      </Space>
    );
  },
}
,
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => (
        <Space>
          {/* <span style={{ fontSize: '16px' }}>{record.statusIcon}</span> */}
          <Tag 
            icon={<MailOutlined />} 
            color={getStatusColor(status)}
          >
            {status}
          </Tag>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space direction="vertical" size={0}>
          <Title level={4} style={{ margin: 0 }}>Incoming Stock Details</Title>
          <Text type="secondary">{productData.mpn}</Text>
        </Space>
      }
      visible={visible}
      onCancel={onCancel}
      width={1000}
      footer={null}
      centered
    >
      {/* Product Details Card */}
      <Card 
        title="Product Information" 
        size="small" 
        style={{ marginBottom: 16 }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <Text strong>MPN: </Text>
            <Text>{productData.mpn}</Text>
          </div>
          <div>
            <Text strong>Manufacturer: </Text>
            <Text>{productData.manufacturer}</Text>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Text strong>Description: </Text>
            <Text>{productData.description}</Text>
          </div>
          <div>
            <Text strong>UOM: </Text>
            <Text>{productData.uom}</Text>
          </div>
        </div>
      </Card>

      {/* Purchase Orders Card */}
      <Card 
        title={
          <Space>
            <span>Contributing Purchase Orders</span>
            <Tag color="blue">{safePurchaseData.length}</Tag>
          </Space>
        } 
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Table
          columns={poColumns}
          dataSource={poData}
          pagination={false}
          size="small"
        />
      </Card>

      {/* Total Incoming Quantity */}
      <Card size="small">
        <div style={{ textAlign: 'center', padding: '8px' }}>
          <Text strong>Total Incoming Quantity: </Text>
          <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
            {productData.totalIncoming} {productData.uom}
          </Text>
        </div>
      </Card>
    </Modal>
  );
};

export default IncomingStockModal;
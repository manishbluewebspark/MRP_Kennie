import React from 'react';
import { Modal, Table, Tag, Card, Typography, Space, DatePicker, message } from 'antd';
import { MailOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import PurchaseOrderService from 'services/PurchaseOrderService';
const { Text, Title } = Typography;



dayjs.extend(customParseFormat);


const parseCommittedDate = (raw) => {
  if (!raw) return null;
  if (raw === "N/A") return null;

  // 1) Try ISO / normal date string
  let d = dayjs(raw);
  if (d.isValid()) return d;

  // 2) Try DD/MM/YYYY (agar aise store kiya ho DB me)
  d = dayjs(raw, "DD/MM/YYYY", true);
  if (d.isValid()) return d;

  // 3) Kuch bhi samajh na aaye → null (no crash)
  return null;
};


const IncomingStockModal = ({ visible, onCancel, purchaseData }) => {
  // Extract the purchaseData array from the inventory item object
  const safePurchaseData = purchaseData?.purchaseData || [];
  console.log('-----safePurchaseData',purchaseData)
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
    poID:item?._id,
    key: index,
    mpn:item?.mpn?._id,
    idNumber:item?.idNumber,
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

  const handleCommitDateChange = async (record, newDate) => {
  try {
    console.log('--------re',record,newDate)
    const formatted = newDate ? newDate.toISOString() : null;

    await PurchaseOrderService.updatePurchaseOrder(record?.poID, {
      idNumber:record?.idNumber,
      mpn:record?.mpn,
      committedDate: formatted,
    });

    message.success("Committed date updated");

    // getWorkOrders(); // refresh table
  } catch (err) {
    console.error(err);
    message.error("Failed to update committed date");
  }
};


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
    const value = parseCommittedDate(record.committedDate);


    return (
      <Space>
        <DatePicker
          value={value}
          placeholder="Add Date"
          format="DD/MM/YYYY"
          onChange={(newDate) => handleCommitDateChange(record, newDate)}
          allowClear={true}
          style={{ width: 140 }}
        />
      </Space>
    );
  }
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
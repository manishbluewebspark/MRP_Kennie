import React from 'react';
import { 
  Card, 
  Descriptions, 
  Table, 
  Typography, 
  Divider,
  Tag,
  Row,
  Col
} from 'antd';

const { Title, Text } = Typography;

const PurchaseOrderDetailsPage = () => {
  // Purchase Order Information Data
  const poInfoData = {
    poNumber: 'P25-00011',
    poDate: '16/09/2025',
    referenceNo: '$5555',
    workOrderNo: '345',
    needDate: '16/09/2025',
    expectedDate: '16/09/2025',
    shipToAddress: 'Exxel Technology Pte Ltd'
  };

  // Supplier Information Data
  const supplierInfoData = {
    company: 'Jqytron',
    contactPerson: 'Steven',
    currency: 'USD',
    incoterms: 'DAP (Delivered at Place)'
  };

  // Purchase Order Items Table Columns
  const poItemsColumns = [
    {
      title: 'Description ↓',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'MPN ↓',
      dataIndex: 'mpn',
      key: 'mpn',
      width: 150,
    },
    {
      title: 'UOM ↓',
      dataIndex: 'uom',
      key: 'uom',
      width: 80,
      align: 'center',
    },
    {
      title: 'Qty ↓',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'center',
    },
    {
      title: 'Unit Price ↓',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 100,
      align: 'right',
      render: (text) => `$${text}`
    },
    {
      title: 'Disc % ↓',
      dataIndex: 'discount',
      key: 'discount',
      width: 100,
      align: 'center',
      render: (text) => `${text}%`
    },
    {
      title: 'Ext. Price ↓',
      dataIndex: 'extendedPrice',
      key: 'extendedPrice',
      width: 120,
      align: 'right',
      render: (text) => <Text strong>${text}</Text>
    },
  ];

  // Purchase Order Items Data
  const poItemsData = [
    {
      key: '1',
      description: 'RJ45 Ethernet Connector',
      mpn: 'CONNECTOR-RJ45',
      uom: 'PCS',
      quantity: 15,
      unitPrice: '0.85',
      discount: '1.00',
      extendedPrice: '12.62'
    }
  ];

  // Terms & Conditions Data
  const termsConditions = [
    {
      title: 'Delivery',
      content: 'The seller agrees to deliver the goods/services by the date specified in the PO. Any delays in delivery must be communicated and approved in writing by the buyer.'
    },
    {
      title: 'Warranty',
      content: 'The seller warrants that the goods/services are free from defects, conform to specifications and meet applicable industry standards. Defect found within 12 months after delivery must be replace or repair at no additional cost.'
    },
    {
      title: 'Confidentiality',
      content: 'Both parties agree to keep any proprietary information received during the course of the transaction confidential and not disclose it to third parties, unless required by Singapore Law.'
    }
  ];

  return (
    <div style={{ padding: '24px', margin: '0 auto' }}>
      {/* Main Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={1} style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
          Purchase Order Details
        </Title>
        <Text style={{ fontSize: '16px', color: '#1890ff', fontWeight: '500' }}>
          PO Number: {poInfoData.poNumber}
        </Text>
      </div>

      {/* Purchase Order Information Card */}
      <Card 
        style={{ marginBottom: 24 }}
        bodyStyle={{ padding: '24px' }}
      >
        <Title level={2} style={{ marginBottom: 20, fontSize: '20px' }}>
          Purchase Order Information
        </Title>
        
        <Descriptions 
          bordered 
          column={2}
          size="middle"
          labelStyle={{ 
            fontWeight: '600', 
            backgroundColor: '#fafafa',
            width: '180px'
          }}
          contentStyle={{ backgroundColor: '#fff' }}
        >
          <Descriptions.Item label="PO Number">
            <Text strong>{poInfoData.poNumber}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="PO Date">
            {poInfoData.poDate}
          </Descriptions.Item>
          <Descriptions.Item label="Reference No">
            {poInfoData.referenceNo}
          </Descriptions.Item>
          <Descriptions.Item label="Work Order No">
            {poInfoData.workOrderNo}
          </Descriptions.Item>
          <Descriptions.Item label="Need Date">
            {poInfoData.needDate}
          </Descriptions.Item>
          <Descriptions.Item label="Expected Date">
            {poInfoData.expectedDate}
          </Descriptions.Item>
          <Descriptions.Item label="Ship To Address" span={2}>
            <Text>{poInfoData.shipToAddress}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Divider />

      {/* Supplier Information Card */}
      <Card 
        style={{ marginBottom: 24 }}
        bodyStyle={{ padding: '24px' }}
      >
        <Title level={2} style={{ marginBottom: 20, fontSize: '20px' }}>
          Supplier Information
        </Title>
        
        <Descriptions 
          bordered 
          column={2}
          size="middle"
          labelStyle={{ 
            fontWeight: '600', 
            backgroundColor: '#fafafa',
            width: '180px'
          }}
          contentStyle={{ backgroundColor: '#fff' }}
        >
          <Descriptions.Item label="Company">
            <Text strong>{supplierInfoData.company}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Contact Person">
            {supplierInfoData.contactPerson}
          </Descriptions.Item>
          <Descriptions.Item label="Currency">
            <Tag color="blue">{supplierInfoData.currency}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Incoterms">
            <Text>{supplierInfoData.incoterms}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Divider />

      {/* Purchase Order Details Card */}
      <Card 
        style={{ marginBottom: 24 }}
        bodyStyle={{ padding: '24px' }}
      >
        <div style={{ marginBottom: 20 }}>
          <Title level={2} style={{ margin: 0, fontSize: '20px', display: 'inline' }}>
            Purchase Order Details
          </Title>
          <Text style={{ marginLeft: 12, fontSize: '16px', color: '#1890ff', fontWeight: '500' }}>
            PO Number: {poInfoData.poNumber}
          </Text>
        </div>
        
        <Table
          columns={poItemsColumns}
          dataSource={poItemsData}
          pagination={false}
          size="middle"
          scroll={{ x: 800 }}
          style={{ marginBottom: 24 }}
        />

        {/* Order Summary */}
        <div style={{ 
          backgroundColor: '#fafafa', 
          padding: '16px 24px', 
          borderRadius: '6px',
          marginTop: 24
        }}>
          <Row gutter={16} justify="end">
            <Col span={8}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ marginBottom: 8 }}>
                  <Text strong>Subtotal: </Text>
                  <Text>$12.62</Text>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text strong>Tax: </Text>
                  <Text>$0.00</Text>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text strong>Shipping: </Text>
                  <Text>$0.00</Text>
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <div>
                  <Text strong style={{ fontSize: '16px' }}>Total Amount: </Text>
                  <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>$12.62</Text>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </Card>

      <Divider />

      {/* Terms & Conditions Card */}
      <Card 
        style={{ marginBottom: 24 }}
        bodyStyle={{ padding: '24px' }}
      >
        <Title level={2} style={{ marginBottom: 20, fontSize: '20px' }}>
          Terms & Conditions
        </Title>
        
        <div style={{ lineHeight: '1.6' }}>
          {termsConditions.map((term, index) => (
            <div key={index} style={{ marginBottom: 20 }}>
              <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: 8 }}>
                {term.title}
              </Text>
              <Text style={{ color: '#666' }}>
                {term.content}
              </Text>
            </div>
          ))}
        </div>
      </Card>

      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        gap: 12,
        padding: '16px 0',
        borderTop: '1px solid #d9d9d9'
      }}>
        <button
          style={{
            padding: '8px 24px',
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            backgroundColor: '#fff',
            cursor: 'pointer'
          }}
        >
          Print
        </button>
        <button
          style={{
            padding: '8px 24px',
            border: '1px solid #1890ff',
            borderRadius: '6px',
            backgroundColor: '#1890ff',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          Export PDF
        </button>
      </div>
    </div>
  );
};

export default PurchaseOrderDetailsPage;
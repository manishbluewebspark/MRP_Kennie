import React, { useState } from 'react';
import { Modal, Card, Typography, Button, Divider, message } from 'antd';
import { CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const SelectPurchaseOrderModal = ({ visible, onCancel, onSubmit }) => {
  const purchaseOrders = [
    {
      id: "P25-00006",
      vendor: "Jaytron",
      poDate: "13/08/2025",
      needDate: "11/08/2025",
      pendingItems: "1/1 items pending"
    },
    {
      id: "P25-00007",
      vendor: "Jaytron",
      poDate: "13/08/2025",
      needDate: "11/08/2025",
      pendingItems: "1/1 items pending"
    },
    {
      id: "P25-00008",
      vendor: "Jaytron",
      poDate: "13/08/2025",
      needDate: "11/08/2025",
      pendingItems: "1/1 items pending"
    }
  ];

  const handleReceiveClick = (purchaseOrder) => {
    // Call the onSubmit prop with the selected purchase order data
    if (onSubmit) {
      onSubmit(purchaseOrder);
    }
  };

  return (
    <Modal
      title="Select Purchase Order"
      open={visible}
      onCancel={onCancel}
      footer={null} // Remove default footer since we're using custom one
      width={1000}
    //   style={{ top: 20 }}
    >
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          Outstanding Purchase Orders ({purchaseOrders.length})
        </Title>
      </div>

      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {purchaseOrders.map((po, index) => (
          <div key={index}>
            <Card
              size="small"
              style={{
                marginBottom: 12,
                border: '1px solid #d9d9d9',
                borderRadius: 6,
                cursor: 'pointer'
              }}
              bodyStyle={{ padding: '12px 16px' }}
              onClick={() => handleReceiveClick(po)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                    <Text strong style={{ fontSize: '14px' }}>
                      {po.id}
                    </Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: 4 }}>
                    {po.vendor}
                  </Text>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                    <CalendarOutlined style={{ fontSize: '12px', color: '#8c8c8c', marginRight: 4 }} />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      PO Date: {po.poDate}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <ClockCircleOutlined style={{ fontSize: '12px', color: '#8c8c8c', marginRight: 4 }} />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      • Need Date: {po.needDate}
                    </Text>
                  </div>
                </div>
                
                <div style={{ textAlign: 'right', minWidth: 120 }}>
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: 8 }}>
                    {po.pendingItems}
                  </Text>
                  <Button 
                    type="primary" 
                    size="small" 
                    style={{ fontSize: '12px' }}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click event
                      handleReceiveClick(po);
                    }}
                  >
                    Click to receive
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>

      <Divider style={{ margin: '16px 0' }} />

      <div style={{ textAlign: 'right' }}>
        <Button onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
};

export default SelectPurchaseOrderModal
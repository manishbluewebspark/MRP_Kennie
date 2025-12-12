import React from 'react';
import { Modal, Descriptions, Typography, Tag } from 'antd';

const { Title, Text } = Typography;

const DeliveryOrderInformationModal = ({ visible, onCancel, data }) => {
  console.log('-----data',data)
  return (
    <Modal
      title="Delivery Order Information"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={500}
      centered
    >
      <div style={{ marginBottom: 16 }}>
        <Text>
          Delivery order details for <Text strong>{data?.drawingNo}</Text>
        </Text>
      </div>

      <Descriptions 
        column={1} 
        size="small"
        labelStyle={{ 
          fontWeight: 'bold', 
          width: '120px',
          paddingRight: '16px'
        }}
        contentStyle={{ 
          paddingBottom: '8px'
        }}
      >
        <Descriptions.Item label="Drawing No:">
          <Text>{data?.drawingNo}</Text>
        </Descriptions.Item>
        
        <Descriptions.Item label="Work Order:">
          <Text>{data?.workOrders[0]}</Text>
        </Descriptions.Item>
        
        <Descriptions.Item label="Outgoing Qty:">
          <Text>{data?.outgoingQty}</Text>
        </Descriptions.Item>
        
        <Descriptions.Item label="DO Number:">
          <Tag color="orange">{data?.doNumbers[0] ? data?.doNumbers[0] : "Not Assigned"}</Tag>
        </Descriptions.Item>
      </Descriptions>

      <div style={{ marginTop: 16, marginBottom: 8 }}>
        <Text strong>Customer: </Text>
        <Text>{data?.customers[0]}</Text>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text strong>Project: </Text>
        <Text>{data?.projects[0]}</Text>
      </div>

      <div style={{ textAlign: 'right', marginTop: 24 }}>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            border: '1px solid #d9d9d9',
            borderRadius: 6,
            backgroundColor: '#fff',
            cursor: 'pointer'
          }}
        >
          Close
        </button>
      </div>
    </Modal>
  );
};

export default DeliveryOrderInformationModal;
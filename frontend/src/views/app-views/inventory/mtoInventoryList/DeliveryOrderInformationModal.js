import React from 'react';
import { Modal, Descriptions, Typography, Tag } from 'antd';

const { Title, Text } = Typography;

const DeliveryOrderInformationModal = ({ visible, onCancel }) => {
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
          Delivery order details for <Text strong>11223355-C</Text>
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
          <Text>11223355-C</Text>
        </Descriptions.Item>
        
        <Descriptions.Item label="Work Order:">
          <Text>2508-03</Text>
        </Descriptions.Item>
        
        <Descriptions.Item label="Outgoing Qty:">
          <Text>1</Text>
        </Descriptions.Item>
        
        <Descriptions.Item label="DO Number:">
          <Tag color="orange">Not assigned</Tag>
        </Descriptions.Item>
      </Descriptions>

      <div style={{ marginTop: 16, marginBottom: 8 }}>
        <Text strong>Customer: </Text>
        <Text>VDL Enabling Technologies Group (S) Pte Ltd</Text>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text strong>Project: </Text>
        <Text>EPIK</Text>
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
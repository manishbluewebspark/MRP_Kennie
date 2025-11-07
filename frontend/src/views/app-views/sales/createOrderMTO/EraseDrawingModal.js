import React from 'react';
import { Modal, Button, Typography, Divider, Alert } from 'antd';
import { ExclamationCircleOutlined, DeleteOutlined, DeleteFilled } from '@ant-design/icons';

const { Title, Text } = Typography;

const EraseDrawingModal = ({ 
  visible, 
  onClose, 
  onErase,
  drawingName = "Manish Shukla - Web Design",
  materialsCount = 0,
  manhourCount = 0,
  packingCount = 0
}) => {
  const handleCancel = () => {
    onClose();
  };

  const handleErase = () => {
    console.log('Erasing drawing:', drawingName);
    onErase();
    onClose();
  };

  return (
    <Modal
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel} size="large">
          Cancel
        </Button>,
        <Button 
          key="erase" 
          type="primary" 
          danger
          onClick={handleErase}
          size="large"
          icon={<ExclamationCircleOutlined />}
        >
          Yes, Erase
        </Button>,
      ]}
      width={500}
      centered
    >
      {/* New Header with Big Red Icon and Text */}
      <div style={{ textAlign: 'center', marginBottom: 24,marginTop:30 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 16
        }}>
          <div style={{
            position: 'relative',
            display: 'inline-flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {/* Outer red circle */}
            <div style={{
              position: 'absolute',
              width: 100,
              height: 100,
              backgroundColor: '#ff4d4f',
              borderRadius: '50%',
              opacity: 0.2
            }}></div>
            
            {/* Middle red circle */}
            <div style={{
              position: 'absolute',
              width: 80,
              height: 80,
              backgroundColor: '#ff4d4f',
              borderRadius: '50%',
              opacity: 0.4
            }}></div>
            
            {/* Inner red circle */}
            <div style={{
              position: 'absolute',
              width: 60,
              height: 60,
              backgroundColor: '#ff4d4f',
              borderRadius: '50%',
              opacity: 0.6
            }}></div>
            
            {/* Delete icon */}
            <DeleteFilled style={{
              fontSize: 40,
              color: '#ff4d4f',
              position: 'relative',
              zIndex: 1
            }} />
          </div>
        </div>
        
        <Title level={2} style={{ marginBottom:8 }}>
          Erase Drawing - Confirmation Required
        </Title>
        
        <Text style={{ fontSize: '14px', lineHeight: '1.5' }}>
          This action will permanently remove the drawing and all associated data from the system.
        </Text>
      </div>

      <Divider />

      <Alert
        message={
          <Text strong style={{ color: '#ff4d4f' }}>
            Warning: This action cannot be undone!
          </Text>
        }
        type="warning"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ display: 'block', marginBottom: 16, fontSize: '14px' }}>
          The following will be permanently deleted:
        </Text>
        
        <div style={{ paddingLeft: 8 }}>
          <div style={{ marginBottom: 8 }}>
            <Text strong>• Drawing: </Text>
            <Text>{drawingName}</Text>
          </div>
          <div style={{ marginBottom: 8 }}>
            <Text>• All Materials Costing items </Text>
            <Text type="secondary">({materialsCount} items)</Text>
          </div>
          <div style={{ marginBottom: 8 }}>
            <Text>• All Manhour Costing items </Text>
            <Text type="secondary">({manhourCount} items)</Text>
          </div>
          <div style={{ marginBottom: 8 }}>
            <Text>• All Packing/Others Costing items </Text>
            <Text type="secondary">({packingCount} items)</Text>
          </div>
          <div>
            <Text>• All calculation data and history</Text>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default EraseDrawingModal;
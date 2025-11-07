import React from 'react';
import { Modal, Button, Space, Typography } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

const MoveToProductionModal = ({ 
  visible, 
  onCancel, 
  onConfirm, 
  projectName = "this Project",
  loading = false 
}) => {
  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onCancel}
      footer={null}
      centered
      width={380}
      style={{ borderRadius: '8px' }}
    >
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        {/* Icon */}
        <ExclamationCircleOutlined 
          style={{ 
            color: '#faad14', 
            fontSize: '32px', 
            marginBottom: '16px' 
          }} 
        />
        
        {/* Title */}
        <Title level={4} style={{ marginBottom: '8px' }}>
          Move Project to Production
        </Title>
        
        {/* Message */}
        <Text style={{ fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
          Are you sure you want to move <strong>{projectName}</strong> to production?
        </Text>
        
        {/* Buttons */}
        <Space size="middle" style={{ marginTop: '24px', width: '100%', justifyContent: 'center' }}>
          <Button 
            onClick={onCancel} 
            disabled={loading}
            size="large"
            style={{ minWidth: '80px' }}
          >
            Cancel
          </Button>
          <Button 
            type="primary" 
            onClick={onConfirm}
            loading={loading}
            size="large"
            style={{ 
              minWidth: '80px',
              background: '#1890ff', 
              borderColor: '#1890ff' 
            }}
          >
            Yes
          </Button>
        </Space>
      </div>
    </Modal>
  );
};

export default MoveToProductionModal;
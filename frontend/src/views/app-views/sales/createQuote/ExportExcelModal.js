import React from 'react';
import { Modal, Button, Typography } from 'antd';

const { Title, Text } = Typography;

const ExportExcelModal = ({ visible, onCancel, onConfirm }) => {
  return (
    <Modal
      title={
        <Title level={4} style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
          Export Excel
        </Title>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="confirm" type="primary" onClick={onConfirm}>
          Yes
        </Button>,
      ]}
      width={400}
      centered
    >
      <div style={{ padding: '10px 0' }}>
        <Text style={{ fontSize: '14px', lineHeight: '1.5', display: 'block' }}>
          Are you sure you want to export this Excel?
        </Text>
        
        <Text style={{ fontSize: '14px', lineHeight: '1.5', display: 'block', marginTop: '8px' }}>
          After export, the drawing will move to the quoted drawing.
        </Text>
      </div>
    </Modal>
  );
};

export default ExportExcelModal;
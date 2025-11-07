import React, { useEffect } from 'react';
import { Modal, Typography } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';

const { Title, Text } = Typography;

const QuoteSuccessModal = ({ visible, onOk }) => {

    useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onOk(); // auto-close
      }, 2000); // 3000ms = 3 seconds

      return () => clearTimeout(timer); // cleanup if modal closes early
    }
  }, [visible, onOk]);

    return (
        <Modal
            title={null}
            open={visible}
            onCancel={onOk}
            footer={null}
            width={450}
            centered
            closable={false}
            maskClosable={false}
        >
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                {/* Green Check Icon with Light/Glow Effect */}
                <div
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        backgroundColor: '#f6ffed',
                        border: '2px solid #b7eb8f',
                        boxShadow: '0 0 0 4px rgba(82, 196, 26, 0.1), 0 0 0 8px rgba(82, 196, 26, 0.05)',
                        marginBottom: '20px'
                    }}
                >
                    <CheckCircleFilled
                        style={{
                            fontSize: '48px',
                            color: '#52c41a'
                        }}
                    />
                </div>

                {/* Title */}
                <Title level={3} style={{ marginBottom: '16px', color: '#52c41a', fontWeight: '600' }}>
                    Quote Created Successfully
                </Title>

                {/* Text Lines */}
                <div style={{ textAlign: 'center', lineHeight: '1.5' }}>
                    <Text style={{ fontSize: '14px', display: 'block', color: '#000000' }}>
                        1 drawing added to Pending Quotes. You can
                    </Text>
                    <Text style={{ fontSize: '14px', display: 'block', color: '#000000' }}>
                        export them individually from the Pending
                    </Text>
                    <Text style={{ fontSize: '14px', display: 'block', color: '#000000' }}>
                        Quotes section.
                    </Text>
                </div>
            </div>
        </Modal>
    );
};

export default QuoteSuccessModal;
import React, { useState } from 'react';
import { Modal, Form, Input, InputNumber, Card, Divider, Alert, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const WorkOrderSettingsModal = ({ visible, onCancel, onSave }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        try {
            setLoading(true);
            const values = await form.validateFields();
            await onSave(values);
            form.resetFields();
        } catch (error) {
            console.error('Validation failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        onCancel();
    };

    return (
        <Modal
            title="Work Order Settings"
            open={visible}
            onCancel={handleCancel}
            onOk={handleSave}
            confirmLoading={loading}
            width={600}
            okText="Save"
            cancelText="Cancel"
            style={{ top: 20 }}
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={{
                    productLeadTime: 2,
                    alertThreshold: 2
                }}
            >
                {/* Product Lead Time Section */}
                <Card size="small" style={{ marginBottom: 16, border: '1px solid #d9d9d9' }}>
                    <Title level={5} style={{ marginBottom: 8 }}>
                        Product Lead Time (Weeks)
                    </Title>
                    <Form.Item
                        name="productLeadTime"
                        // label="Enter number"
                        style={{ marginBottom: 8 }}
                    >
                        <InputNumber
                            min={1}
                            max={52}
                            style={{ width: '100%' }}
                            placeholder="Enter number of weeks"
                        />
                    </Form.Item>
                    <Text type="secondary">
                        This setting determines how many weeks before the commit date production should start. Current setting: 2 weeks
                    </Text>
                </Card>

                {/* Alert Threshold Section */}
                <Card size="small" style={{ marginBottom: 16, border: '1px solid #d9d9d9' }}>
                    <Title level={5} style={{ marginBottom: 8 }}>
                        Alert Threshold (Days)
                    </Title>
                    <Form.Item
                        name="alertThreshold"
                        // label="Enter number"
                        style={{ marginBottom: 8 }}
                    >
                        <InputNumber
                            min={1}
                            max={30}
                            style={{ width: '100%' }}
                            placeholder="Enter number of days"
                        />
                    </Form.Item>
                    <Text type="secondary">
                        Get alerts when work orders are within this many days of commit date and not completed. Current setting: 2 days
                    </Text>
                </Card>

                <Divider />

                {/* Example Calculation Section */}
                <Alert
                    message="Example Calculation"
                    description="If commit date is March 15th and production weeks is set to 2, production should start by 01/09/2025."
                    type="info"
                    showIcon
                    icon={<InfoCircleOutlined />}
                    style={{ marginBottom: 16 }}
                />

                {/* Alert Example Section */}
                <Alert
                    message="Alert Example"
                    description="Work orders within 2 days of their commit date and not in 'Packing done' status will trigger alerts automatically."
                    type="warning"
                    showIcon
                    icon={<InfoCircleOutlined />}
                    style={{ marginBottom: 0 }}
                />
            </Form>
        </Modal>
    );
};

export default WorkOrderSettingsModal;
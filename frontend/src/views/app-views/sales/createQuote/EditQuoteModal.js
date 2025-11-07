import React, { useEffect } from 'react';
import { Modal, Button, Input, InputNumber, Form, Row, Col, Divider, Select } from 'antd';
const { Option } = Select;

const EditQuoteModal = ({ visible, onCancel, onUpdate, loading = false, initialData,projectData }) => {
    const [form] = Form.useForm();

    console.log('-------initialData',initialData)
    // Set initial values when modal opens or initialData changes
    useEffect(() => {
        if (visible) {
            if (initialData) {
                form.setFieldsValue({
                    drawingNumber: initialData.drawingNumber,
                    project: initialData.project,
                    quantity: initialData.quantity,
                    unitPrice: initialData.unitPrice,
                    leadTime: initialData.leadTime
                });
            } else {
                // Reset form if no initialData (for new quotes)
                form.resetFields();
            }
        }
    }, [visible, initialData, form]);

    const handleSubmit = async (values) => {
        try {
            await onUpdate(values);
            // Don't reset form here - let parent component handle it after successful update
        } catch (error) {
            console.error('Update failed:', error);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        onCancel();
    };

    return (
        <Modal
            title={
                <div>
                    <div style={{ fontSize: '20px', fontWeight: '600', lineHeight: '28px' }}>
                        Edit Quote
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginTop: '2px' }}>
                        Update the quote information
                    </div>
                </div>
            }
            open={visible}
            onCancel={handleCancel}
            footer={null}
            width={500}
            centered
            destroyOnClose // This ensures form is reset when modal closes
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                preserve={false} // This ensures form state is not preserved when hidden
            >
                {/* Drawing Number */}
                <Form.Item
                    name="drawingNumber"
                    label="Drawing Number *"
                    rules={[{ required: true, message: 'Please enter drawing number' }]}
                    style={{ marginBottom: 20 }}
                >
                    <Input 
                        size="large" 
                        placeholder="Enter drawing number"
                    />
                </Form.Item>

                {/* Project - Fixed to use form value instead of hardcoded */}
                <Form.Item 
              label="Project" 
              name="project" 
              rules={[{ required: true, message: "Please select project" }]}
            >
              <Select placeholder="Select Project" showSearch optionFilterProp="children">
                {projectData?.map((project) => (
                  <Option key={project._id} value={project._id}>
                    {project.projectName}
                  </Option>
                ))}
              </Select>
            </Form.Item>

                {/* Quantity and Unit Price Row */}
                <Row gutter={16} style={{ marginBottom: 20 }}>
                    <Col span={12}>
                        <Form.Item
                            name="quantity"
                            label="Quantity"
                            rules={[{ 
                                required: true, 
                                message: 'Please enter quantity',
                                type: 'number',
                                min: 0
                            }]}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                size="large"
                                min={0}
                                placeholder="0"
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="unitPrice"
                            label="Unit Price"
                            rules={[{ 
                                required: true, 
                                message: 'Please enter unit price',
                                type: 'number',
                                min: 0
                            }]}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                size="large"
                                min={0}
                                step={0.01}
                                precision={2}
                                placeholder="0.00"
                                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={value => value.replace(/\$\s?|(,*)/g, '')}
                            />
                        </Form.Item>
                    </Col>
                </Row>

                {/* Lead Time */}
                <Form.Item
                    name="leadTime"
                    label="Lead Time (Weeks)"
                    rules={[{ 
                        required: true, 
                        message: 'Please enter lead time',
                        type: 'number',
                        min: 0
                    }]}
                    style={{ marginBottom: 30 }}
                >
                    <InputNumber
                        style={{ width: '100%' }}
                        size="large"
                        min={0}
                        placeholder="0"
                    />
                </Form.Item>

                <Divider style={{ margin: '20px 0' }} />

                {/* Action Buttons */}
                <div style={{ textAlign: 'right' }}>
                    <Button 
                        size="large" 
                        onClick={handleCancel}
                        disabled={loading}
                        style={{ 
                            marginRight: 12, 
                            minWidth: 100,
                            height: 40 
                        }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        type="primary" 
                        size="large" 
                        htmlType="submit"
                        loading={loading}
                        style={{ 
                            minWidth: 120,
                            height: 40,
                            background: '#1890ff',
                            borderColor: '#1890ff'
                        }}
                    >
                        Update Quote
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};

export default EditQuoteModal;
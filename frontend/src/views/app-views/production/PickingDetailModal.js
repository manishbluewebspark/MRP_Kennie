import React, { useState } from 'react';
import {
    Modal,
    Table,
    Card,
    Typography,
    Input,
    Button,
    Space,
    Divider,
    Form,
    InputNumber,
    Tag,
    Checkbox,
} from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

const PickingDetailModal = ({ visible, onCancel, onSave,selectWorkOrderData }) => {
    const [form] = Form.useForm();
    const [pickedQuantities, setPickedQuantities] = useState({});
    console.log('-------selectWorkOrderData',selectWorkOrderData)
    // Dummy data matching the screenshot structure
    const dummyData = [
        {
            key: '1',
            item: '1',
            childPart: '1234568-A',
            description: 'Cable, 22AWG',
            mpn: '12345',
            uom: 'PCS',
            qty: 16,
            location: 'A10-5',
            maxQty: 16,
        },
        {
            key: '2',
            item: '2',
            childPart: '1234568-A',
            description: 'Cable, 22AWG',
            mpn: '12345',
            uom: 'PCS',
            qty: 16,
            location: 'A10-5',
            maxQty: 16,
        },
        {
            key: '3',
            item: '3',
            childPart: '1234568-A',
            description: 'Cable, 22AWG',
            mpn: '12345',
            uom: 'PCS',
            qty: 16,
            location: 'A10-5',
            maxQty: 16,
        },
    ];

    const columns = [
        {
            title: 'Item',
            dataIndex: 'item',
            key: 'item',
            width: 60,
        },
        {
            title: 'Child Part',
            dataIndex: 'childPart',
            key: 'childPart',
            width: 120,
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            width: 150,
        },
        {
            title: 'MPN',
            dataIndex: 'mpn',
            key: 'mpn',
            width: 100,
        },
        {
            title: 'UOM',
            dataIndex: 'uom',
            key: 'uom',
            width: 80,
        },
        {
            title: 'Qty',
            dataIndex: 'qty',
            key: 'qty',
            width: 80,
        },
        {
            title: 'Location',
            dataIndex: 'location',
            key: 'location',
            width: 100,
        },
        {
            title: 'Picked Qty',
            dataIndex: 'pickedQty',
            key: 'pickedQty',
            width: 120,
            render: (_, record) => (
                <InputNumber
                    min={0}
                    max={record.maxQty}
                    placeholder={`Max: ${record.maxQty}`}
                    style={{ width: '100%' }}
                    onChange={(value) =>
                        setPickedQuantities(prev => ({
                            ...prev,
                            [record.key]: value
                        }))
                    }
                />
            ),
        }
    ];

    const handleSave = () => {
        form.validateFields().then(values => {
            const formData = {
                comments: values.comments,
                pickedQuantities,
            };
            onSave(formData);
        });
    };

    return (
        <Modal
            title={
                <Space>
                    <ShoppingCartOutlined />
                    <span>Picking Detail - 12345</span>
                </Space>
            }
            open={visible}
            onCancel={onCancel}
            width={1200}
            style={{ top: 20 }}
            footer={[
                <Button key="cancel" onClick={onCancel}>
                    Cancel
                </Button>,
                <Button key="save-progress" type="primary" onClick={handleSave}>
                    Save Progress
                </Button>,
            ]}
        >
            {/* Work Order Information */}
            <Card
                title="Work Order Information"
                size="small"
                style={{ marginBottom: 16 }}
            >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    <div>
                        <Text strong>Project No.</Text>
                        <br />
                        <Text>{selectWorkOrderData?.projectName}</Text>
                    </div>
                    <div>
                        <Text strong>PO Number</Text>
                        <br />
                        <Text>{selectWorkOrderData?.poNumber}</Text>
                    </div>
                    <div>
                        <Text strong>POS Number</Text>
                        <br />
                        <Text>{selectWorkOrderData?.posNumber}</Text>
                    </div>
                </div>

                <Divider style={{ margin: '12px 0' }} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    <div>
                        <Text strong>Work Order No.</Text>
                        <br />
                        <Text>{selectWorkOrderData?.workOrderNo}</Text>
                    </div>
                    <div>
                        <Text strong>Quantity</Text>
                        <br />
                        <Text>{selectWorkOrderData?.quantity}</Text>
                    </div>
                    <div>
                        <Text strong>Picking Qty * (Max: 2)</Text>
                        <InputNumber
                            min={0}
                            max={10}
                            value={selectWorkOrderData?.pickingQty}
                            // onChange={handleChange}
                            style={{ width: "100%", marginTop: 4 }}
                            placeholder="Enter picking quantity"
                        />
                    </div>
                </div>

                <div style={{ marginTop: 12, padding: 8, backgroundColor: '#f0f8ff', borderRadius: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        You can pick partial quantities. Remaining materials can be picked later.
                    </Text>
                </div>
            </Card>

            {/* Remarks & Comments */}
            <Card title="Remarks & Comments" size="small" style={{ marginBottom: 16 }}>
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="comments"
                        label="Add New Comments"
                    >
                        <TextArea
                            placeholder="Enter comments"
                            rows={3}
                        />
                    </Form.Item>
                </Form>
            </Card>

            {/* Materials for Picking */}
            <Card title="Materials for Picking" size="small">
                <Table
                    columns={columns}
                    dataSource={dummyData}
                    pagination={false}
                    size="small"
                    scroll={{ x: 800 }}
                />
            </Card>
        </Modal>
    );
};

// Usage example
const App = () => {
    const [modalVisible, setModalVisible] = useState(false);

    const showModal = () => {
        setModalVisible(true);
    };

    const handleCancel = () => {
        setModalVisible(false);
    };

    const handleSave = (data) => {
        console.log('Saved data:', data);
        setModalVisible(false);
    };

    return (
        <div style={{ padding: 24 }}>
            <Button type="primary" onClick={showModal}>
                Open Picking Detail Modal
            </Button>

            <PickingDetailModal
                visible={modalVisible}
                onCancel={handleCancel}
                onSave={handleSave}
            />
        </div>
    );
};

export default PickingDetailModal;
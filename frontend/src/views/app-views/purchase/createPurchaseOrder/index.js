import React, { useState, useEffect } from 'react';
import {
    Card,
    Form,
    Input,
    Select,
    DatePicker,
    Button,
    Row,
    Col,
    Divider,
    Typography,
    InputNumber,
    Table,
    message
} from 'antd';
import {
    MinusCircleOutlined,
    PlusOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllMpn } from 'store/slices/librarySlice';
import { fetchSuppliers } from 'store/slices/supplierSlice';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const PurchaseOrderPage = () => {
    const dispatch = useDispatch()
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const { id } = useParams(); // For edit mode
    const [loading, setLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);


    const { librarys } = useSelector((state) => state);
    const { suppliers } = useSelector((state) => state.suppliers);
    console.log('-----librarys', librarys)



    // Sample data for the order items table
    const orderItemsColumns = [
        {
            title: 'ID Number',
            dataIndex: 'idNumber',
            key: 'idNumber',
            width: 120,
            render: (text, record) => (
                <Input
                    placeholder={text}
                    size="small"
                    style={{ marginTop: 4 }}
                    value={record.idNumber}
                    onChange={(e) => handleItemChange(record.key, 'idNumber', e.target.value)}
                />
            )
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            width: 100,
            render: (text, record) => (
                <Input
                    size="small"
                    value={record.description}
                    onChange={(e) => handleItemChange(record.key, 'description', e.target.value)}
                />
            )
        },
        {
            title: 'MPN',
            dataIndex: 'mpn',
            key: 'mpn',
            width: 10,
            render: (text, record) => (
                <Select
                    placeholder="Select"
                    value={record.mpn}
                    onChange={(value) => handleItemChange(record.key, 'mpn', value)}
                >
                    {librarys?.mpnList.map(option => (
                        <Option key={option._id} value={option._id}>
                            {option.MPN}
                        </Option>
                    ))}
                </Select>
            )
        },
        {
            title: 'Manufacturer',
            dataIndex: 'manufacturer',
            key: 'manufacturer',
            width: 100,
            render: (text, record) => (
                <Select
                    placeholder="Select"
                    size="small"
                    style={{ width: '100%' }}
                    value={record.manufacturer}
                    onChange={(value) => handleItemChange(record.key, 'manufacturer', value)}
                >
                    <Option value="Altech">Altech</Option>
                    <Option value="Siemens">Siemens</Option>
                    <Option value="ABB">ABB</Option>
                </Select>
            )
        },
        {
            title: 'UOM',
            dataIndex: 'uom',
            key: 'uom',
            width: 100,
            render: (text, record) => (
                <Select
                    placeholder="Select"
                    size="small"
                    style={{ width: '100%' }}
                    value={record.uom}
                    onChange={(value) => handleItemChange(record.key, 'uom', value)}
                >
                    <Option value="PCS">PCS</Option>
                    <Option value="BOX">BOX</Option>
                    <Option value="SET">SET</Option>
                </Select>
            )
        },
        {
            title: 'Qty',
            dataIndex: 'qty',
            key: 'qty',
            width: 80,
            render: (text, record) => (
                <InputNumber
                    size="small"
                    min={1}
                    value={record.qty}
                    onChange={(value) => handleItemChange(record.key, 'qty', value)}
                    style={{ width: '100%' }}
                />
            )
        },
        {
            title: 'Unit Price',
            dataIndex: 'unitPrice',
            key: 'unitPrice',
            width: 100,
            render: (text, record) => (
                <InputNumber
                    size="small"
                    min={0}
                    step={0.01}
                    value={record.unitPrice}
                    onChange={(value) => handleItemChange(record.key, 'unitPrice', value)}
                    style={{ width: '100%' }}
                    formatter={value => `$ ${value}`}
                    parser={value => value.replace('$ ', '')}
                />
            )
        },
        {
            title: 'Disc %',
            dataIndex: 'discPercentage',
            key: 'discPercentage',
            width: 80,
            render: (text, record) => (
                <InputNumber
                    size="small"
                    min={0}
                    max={100}
                    value={record.discPercentage}
                    onChange={(value) => handleItemChange(record.key, 'discPercentage', value)}
                    style={{ width: '100%' }}
                    formatter={value => `${value}%`}
                    parser={value => value.replace('%', '')}
                />
            )
        },
        {
            title: 'Ext. Price',
            dataIndex: 'extPrice',
            key: 'extPrice',
            width: 100,
            render: (text, record) => {
                const qty = record.qty || 0;
                const unitPrice = record.unitPrice || 0;
                const discount = record.discPercentage || 0;
                const extPrice = (qty * unitPrice) * (1 - discount / 100);
                return `$${extPrice.toFixed(2)}`;
            }
        },
        {
            title: '',
            dataIndex: 'actions',
            key: 'actions',
            width: 50,
            render: (_, record) => (
                <MinusCircleOutlined
                    onClick={() => handleRemoveItem(record.key)}
                    style={{ color: '#ff4d4f', cursor: 'pointer' }}
                />
            )
        }
    ];

    const [orderItems, setOrderItems] = useState([
    ]);

    // Calculate totals
    const calculateTotals = () => {
        const subtotal = orderItems.reduce((sum, item) => {
            const qty = item.qty || 0;
            const unitPrice = item.unitPrice || 0;
            const discount = item.discPercentage || 0;
            return sum + (qty * unitPrice) * (1 - discount / 100);
        }, 0);

        const freightAmount = form.getFieldValue('freightAmount') || 0;
        const taxRate = 0.09; // 9% tax
        const taxAmount = subtotal * taxRate;
        const finalAmount = subtotal + freightAmount + taxAmount;

        return {
            subtotal: subtotal.toFixed(2),
            freightAmount: freightAmount.toFixed(2),
            taxAmount: taxAmount.toFixed(2),
            finalAmount: finalAmount.toFixed(2)
        };
    };

    const generatePONumber = (existingPONumbers = []) => {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2); // last 2 digits of year
        const month = String(now.getMonth() + 1).padStart(2, "0"); // 2-digit month

        // Filter existing PO numbers for current year-month
        const currentMonthPOs = existingPONumbers
            .filter((po) => po.startsWith(`P${year}-${month}`))
            .map((po) => parseInt(po.slice(-5), 10)) // get last 5 digits as number
            .filter((n) => !isNaN(n));

        const nextSeq = currentMonthPOs.length
            ? Math.max(...currentMonthPOs) + 1
            : 1;

        const seqStr = String(nextSeq).padStart(5, "0");

        return `P${year}-${month}-${seqStr}`;
    };


    const [totals, setTotals] = useState(calculateTotals());

    // Load data for edit mode
    useEffect(() => {
        if (id) {
            setIsEditMode(true);
            loadPurchaseOrderData(id);
        }
    }, [id]);

    useEffect(() => {
        dispatch(fetchAllMpn())
        dispatch(fetchSuppliers())
        if (!isEditMode) {
            // Generate PO number automatically when creating new PO
            const existingPONumbers = orderItems.map(item => item.poNumber).filter(Boolean);
            const poNumber = generatePONumber(existingPONumbers);
            form.setFieldsValue({ poNumber });
        }
    }, [form, isEditMode, orderItems]);

    const loadPurchaseOrderData = async (poId) => {
        setLoading(true);
        try {
            // Simulate API call
            setTimeout(() => {
                const sampleData = {
                    poNumber: 'P25-00011',
                    poDate: '2025-09-16',
                    referenceNo: '5555',
                    workOrderNo: '345',
                    needDate: '2025-09-16',
                    supplier: 'supplier1',
                    shipToAddress: 'Exxel Technology Pte Ltd',
                    termsConditions: 'Standard terms and conditions apply.',
                    freightAmount: 0
                };

                const sampleItems = [
                ];

                form.setFieldsValue(sampleData);
                setOrderItems(sampleItems);
                setLoading(false);
            }, 1000);
        } catch (error) {
            message.error('Failed to load purchase order data');
            setLoading(false);
        }
    };

    const handleAddItem = () => {
        const newKey = Date.now().toString();
        const newItem = {
            key: newKey,
            idNumber: '',
            description: '',
            mpn: '',
            manufacturer: '',
            uom: '',
            qty: 1,
            unitPrice: 0,
            discPercentage: 0,
            extPrice: 0
        };
        setOrderItems([...orderItems, newItem]);
    };

    const handleRemoveItem = (key) => {
        if (orderItems.length > 1) {
            setOrderItems(orderItems.filter(item => item.key !== key));
        } else {
            message.warning('At least one item is required');
        }
    };

    // const handleItemChange = (key, field, value) => {
    //     setOrderItems(prevItems =>
    //         prevItems.map(item =>
    //             item.key === key ? { ...item, [field]: value } : item
    //         )
    //     );
    // };

    const handleItemChange = (key, field, value) => {
        setOrderItems(prevItems =>
            prevItems.map(item => {
                if (item.key === key) {
                    let updatedItem = { ...item, [field]: value };

                    // If MPN is changed, auto-fill related fields
                    if (field === 'mpn') {
                        const mpnData = librarys?.mpnList.find(mp => mp._id === value);
                        if (mpnData) {
                            updatedItem = {
                                ...updatedItem,
                                description: mpnData.Description || '',
                                manufacturer: mpnData.Manufacturer || '',
                                uom: mpnData.UOM?._id || '',
                                qty: 1,
                                unitPrice: mpnData.RFQUnitPrice || 0,
                                discPercentage: 0
                            };
                        }
                    }

                    return updatedItem;
                }
                return item;
            })
        );
    };


    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const formData = {
                ...values,
                items: orderItems,
                totals: calculateTotals()
            };

            console.log('Form data:', formData);

            // Simulate API call
            setTimeout(() => {
                if (isEditMode) {
                    message.success('Purchase order updated successfully!');
                } else {
                    message.success('Purchase order created successfully!');
                }
                setLoading(false);
                navigate('/app/purchase');
            }, 1500);

        } catch (error) {
            message.error('Failed to save purchase order');
            setLoading(false);
        }
    };

    const handleCancel = () => {
        navigate('/app/purchase');
    };

    // Update totals when items or freight amount changes
    useEffect(() => {
        setTotals(calculateTotals());
    }, [orderItems, form.getFieldValue('freightAmount')]);

    return (
        <div style={{ padding: '24px', margin: '0 auto' }}>
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                disabled={loading}
            >
                {/* First PO Information Section */}
                <Card
                    style={{ marginBottom: 24 }}
                    bodyStyle={{ padding: '24px' }}
                    loading={loading}
                >
                    <div style={{ marginBottom: 16 }}>
                        <Title level={2} style={{ margin: 0, fontSize: '24px' }}>
                            {isEditMode ? 'Edit Purchase Order' : 'Create Purchase Order'}
                        </Title>
                        <Text type="secondary">
                            Purchase order details and supplier information
                        </Text>
                    </div>

                    <Row gutter={16}>
                        {/* First Row: PO Number, PO Date, Supplier */}
                        <Col span={8}>
                            <div style={{ marginBottom: 24 }}>
                                <Title level={4} style={{ marginBottom: 16, fontSize: '16px' }}>
                                    PO Number
                                </Title>
                                <Form.Item
                                    name="poNumber"
                                    rules={[{ required: true, message: 'Please enter PO number' }]}
                                >
                                    <Input placeholder="Enter number" size="large" />
                                </Form.Item>
                            </div>
                        </Col>

                        <Col span={8}>
                            <div style={{ marginBottom: 24 }}>
                                <Title level={4} style={{ marginBottom: 16, fontSize: '16px' }}>
                                    PO Date
                                </Title>
                                <Form.Item
                                    name="poDate"
                                    rules={[{ required: true, message: 'Please select PO date' }]}
                                >
                                    <DatePicker
                                        placeholder="Select"
                                        size="large"
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </div>
                        </Col>

                        <Col span={8}>
                            <div style={{ marginBottom: 24 }}>
                                <Title level={4} style={{ marginBottom: 16, fontSize: '16px' }}>
                                    Supplier
                                </Title>
                                <Form.Item
                                    name="supplier"
                                    rules={[{ required: true, message: 'Please select supplier' }]}
                                >
                                    <Select placeholder="Select Supplier">
                                        {suppliers.map(option => (
                                            <Option key={option._id} value={option._id}>
                                                {option.companyName}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </div>
                        </Col>
                    </Row>

                    {/* Second Row: Reference No, Need Date, Work Order No */}
                    <Row gutter={16}>
                        <Col span={8}>
                            <div style={{ marginBottom: 24 }}>
                                <Text type="secondary" style={{ fontSize: '12px', marginBottom: 8, display: 'block' }}>
                                    Reference No
                                </Text>
                                <Form.Item name="referenceNo">
                                    <Input placeholder="Enter number" size="large" />
                                </Form.Item>
                            </div>
                        </Col>

                        <Col span={8}>
                            <div style={{ marginBottom: 24 }}>
                                <Text type="secondary" style={{ fontSize: '12px', marginBottom: 8, display: 'block' }}>
                                    Need Date
                                </Text>
                                <Form.Item name="needDate">
                                    <DatePicker
                                        placeholder="Select"
                                        size="large"
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </div>
                        </Col>

                        <Col span={8}>
                            <div style={{ marginBottom: 24 }}>
                                <Text type="secondary" style={{ fontSize: '12px', marginBottom: 8, display: 'block' }}>
                                    Work Order No
                                </Text>
                                <Form.Item name="workOrderNo">
                                    <Select placeholder="Select" size="large">
                                        <Option value="wo1">WO-001</Option>
                                        <Option value="wo2">WO-002</Option>
                                        <Option value="wo3">WO-003</Option>
                                    </Select>
                                </Form.Item>
                            </div>
                        </Col>
                    </Row>

                    <div style={{ marginBottom: 24 }}>
                        <Title level={4} style={{ marginBottom: 16, fontSize: '16px' }}>
                            Ship To Address
                        </Title>
                        <Form.Item name="shipToAddress">
                            <TextArea
                                placeholder="Enter address"
                                rows={3}
                                style={{ resize: 'none' }}
                            />
                        </Form.Item>
                    </div>
                    <div>
                        <Title level={4} style={{ marginBottom: 16, fontSize: '16px' }}>
                            Terms & Conditions
                        </Title>
                        <Form.Item name="termsConditions">
                            <TextArea
                                placeholder="Enter terms & conditions"
                                rows={3}
                                style={{ resize: 'none' }}
                            />
                        </Form.Item>
                    </div>
                </Card>

                <Divider />

                {/* Second PO Information Section */}
                <Card
                    style={{ marginBottom: 24 }}
                    bodyStyle={{ padding: '24px' }}
                >
                    <div style={{ marginBottom: 16 }}>
                        <Title level={2} style={{ margin: 0, fontSize: '24px' }}>
                            PO Items
                        </Title>
                        <Text type="secondary">
                            Purchase order items and pricing
                        </Text>
                    </div>

                    {/* Order Items Table */}
                    <div style={{ marginBottom: 24 }}>
                        <Table
                            columns={orderItemsColumns}
                            dataSource={orderItems}
                            pagination={false}
                            size="small"
                            scroll={{ x: 1000 }}
                            footer={() => (
                                <Button
                                    type="dashed"
                                    onClick={handleAddItem}
                                    icon={<PlusOutlined />}
                                    style={{ width: '100%' }}
                                >
                                    Add Item
                                </Button>
                            )}
                        />
                    </div>

                    {/* Order Totals */}
                    <div style={{
                        backgroundColor: '#fafafa',
                        padding: '16px',
                        borderRadius: '6px',
                        marginBottom: 24
                    }}>
                        <Title level={4} style={{ marginBottom: 16, fontSize: '16px' }}>
                            Order Totals
                        </Title>

                        <Row gutter={24} style={{ marginBottom: 12 }}>
                            <Col span={24}>
                                <Text strong>Freight Amount:</Text>
                                <Form.Item name="freightAmount" style={{ marginBottom: 0 }}>
                                    <InputNumber
                                        defaultValue={0}
                                        style={{ width: '100%', marginTop: 4 }}
                                        size="small"
                                        min={0}
                                        formatter={value => `$ ${value}`}
                                        parser={value => value.replace('$ ', '')}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Divider style={{ margin: '16px 0' }} />

                        <Row gutter={16} style={{ marginBottom: 8 }}>
                            <Col span={12}>
                                <Text strong>Sub-Total Amount:</Text>
                            </Col>
                            <Col span={12} style={{ textAlign: 'right' }}>
                                <Text>${totals.subtotal}</Text>
                            </Col>
                        </Row>

                        <Row gutter={16} style={{ marginBottom: 8 }}>
                            <Col span={12}>
                                <Text>Freight Amount:</Text>
                            </Col>
                            <Col span={12} style={{ textAlign: 'right' }}>
                                <Text>${totals.freightAmount}</Text>
                            </Col>
                        </Row>

                        <Row gutter={16} style={{ marginBottom: 8 }}>
                            <Col span={12}>
                                <Text>OST Tax (9%):</Text>
                            </Col>
                            <Col span={12} style={{ textAlign: 'right' }}>
                                <Text>${totals.taxAmount}</Text>
                            </Col>
                        </Row>

                        <Divider style={{ margin: '16px 0' }} />

                        <Row gutter={16}>
                            <Col span={12}>
                                <Text strong style={{ fontSize: '16px' }}>Final Amount:</Text>
                            </Col>
                            <Col span={12} style={{ textAlign: 'right' }}>
                                <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                                    ${totals.finalAmount}
                                </Text>
                            </Col>
                        </Row>
                    </div>
                </Card>

                {/* Footer Buttons */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'end',
                    alignItems: 'center',
                    padding: '16px 0',
                    borderTop: '1px solid #d9d9d9'
                }}>
                    <Button
                        size="large"
                        style={{ minWidth: 120 }}
                        onClick={handleCancel}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="primary"
                        size="large"
                        htmlType="submit"
                        style={{ minWidth: 180, marginLeft: 10 }}
                        loading={loading}
                    >
                        {isEditMode ? 'Update Purchase Order' : 'Create Purchase Order'}
                    </Button>
                </div>
            </Form>
        </div>
    );
};

export default PurchaseOrderPage;
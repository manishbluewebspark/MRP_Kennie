import React, { useEffect, useState } from "react";
import { Form, Row, Col } from "antd";
import GlobalModal from "components/GlobalModal";
import { RoundedInput, RoundedTextArea, RoundedSelect, RoundedInputNumber, RoundedDatePicker } from "components/FormFields";
import moment from "moment";
import dayjs from 'dayjs';
import { Select } from "antd";
const { Option } = Select;

const AddMpnModal = ({ visible, onCancel, onSubmit, formData, uoms = [], suppliers = [], categories = [], currencies = [] }) => {
    const [form] = Form.useForm();
    const [selectRFQUnitPriceCurrency, setSelectRFQUnitPriceCurrency] = useState()
    // Prefill form for Edit
    useEffect(() => {
        if (formData) {
            form.setFieldsValue({
                mpn: formData.MPN,
                manufacture: formData.Manufacturer,
                uom: formData.UOM,
                description: formData.Description,
                storageLocation: formData.StorageLocation,
                rfq: formData.RFQUnitPrice,
                moq: formData.MOQ,
                rfqDate: formData.RFQDate ? dayjs(formData.RFQDate) : null,
                supplier: formData.Supplier,
                leadTime: formData.LeadTime_WK,
                category: formData.Category,
                note: formData.note,
                status: formData.Status,
                currency: formData.currency
            });
        } else {
            form.resetFields(); // Add case
        }
    }, [formData, form]);

    const handleOk = () => {
        form.validateFields().then(values => {
            onSubmit(values);
            form.resetFields();
        });
    };

    return (
        <GlobalModal
            visible={visible}
            onCancel={() => {
                onCancel();
                form.resetFields();
            }}
            onOk={handleOk}
            header={formData ? "Edit MPN" : "Add New MPN"}
            okText={formData ? "Update" : "Submit"}
            width={800}
            height={600}
        >
            <Form form={form} layout="vertical">
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item label="MPN" name="mpn" rules={[{ required: true, message: "Enter part number" }]}>
                            <RoundedInput placeholder="Enter part number" />
                        </Form.Item>
                    </Col>
                    {/* <Col span={12}>
                        <Form.Item label="Manufacture" name="manufacture" rules={[{ required: true, message: "Select manufacturer" }]}>
                            <RoundedSelect placeholder="Select manufacturer">
                                <Option value="Alpha">Alpha</Option>
                                <Option value="Molex">Molex</Option>
                                <Option value="Lapp">Lapp</Option>
                            </RoundedSelect>
                        </Form.Item>
                    </Col> */}
                    <Col span={12}>
                        <Form.Item
                            label="Manufacture"
                            name="manufacture"
                            rules={[{ required: true, message: "Select or enter manufacturer" }]}
                        >
                            <RoundedSelect
                                placeholder="Select or type manufacturer"
                                mode="tags"
                                maxTagCount={1}
                                onChange={(value) => {
                                    // Always keep only last entered value
                                    if (value.length > 1) {
                                        const lastValue = value[value.length - 1];
                                        form.setFieldsValue({ manufacture: [lastValue] });
                                    }
                                }}
                            >
                                <Option value="Alpha">Alpha</Option>
                                <Option value="Molex">Molex</Option>
                                <Option value="Lapp">Lapp</Option>
                                <Option value="Turck">Turck</Option>
                                <Option value="Pan Sun">Pan Sun</Option>
                                <Option value="Altech">Altech</Option>
                                <Option value="Brady">Brady</Option>
                                <Option value="Beckhoff">Beckhoff</Option>
                                <Option value="Phoenix Contact">Phoenix Contact</Option>


                            </RoundedSelect>
                        </Form.Item>
                    </Col>



                    <Col span={24}>
                        <Form.Item label="UOM" name="uom" rules={[{ required: true, message: "Select UOM" }]}>
                            <Select placeholder="Select UOM">
                                {uoms.map(option => (
                                    <Option key={option._id} value={option._id}>
                                        {option.code}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>

                    <Col span={24}>
                        <Form.Item label="Description" name="description" rules={[{ required: true, message: "Enter description" }]}>
                            <RoundedTextArea placeholder="Enter description" rows={3} />
                        </Form.Item>
                    </Col>

                    <Col span={8}>
                        <Form.Item label="Storage Location" name="storageLocation" rules={[{ required: true, message: "Enter storage location" }]}>
                            <RoundedInput placeholder="Enter storage location" />
                        </Form.Item>
                    </Col>

                    {/* <Col span={8}>
                        <Form.Item
                            label="Currency (RFQ Unit Price)"
                            name="currency"
                            rules={[{ required: true, message: "Select currency type" }]}
                        >
                            <Select placeholder="Select currency">
                                {currencies.map((c) => (
                                    <Option key={c._id} value={c._id}>
                                        {c.symbol} {c.code} - {c.name}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col> */}

                    <Col span={8}>
                        <Form.Item
                            label="Currency (RFQ Unit Price)"
                            name="currency"
                            rules={[{ required: true, message: "Select currency type" }]}
                        >
                            <Select
                                placeholder="Select currency"
                                onChange={(value) => {
                                    const selected = currencies.find(c => c._id === value);
                                    setSelectRFQUnitPriceCurrency(
                                        selected ? `${selected.symbol}` : null
                                    );
                                }}
                            >
                                {currencies.map((c) => (
                                    <Select.Option key={c._id} value={c._id}>
                                        {c.symbol} {c.code} - {c.name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>



                    <Col span={8}>
                        <Form.Item label="RFQ Unit Price" name="rfq" rules={[{ required: true, message: "Enter RFQ" }]}>
                            <RoundedInput
                                placeholder="Enter RFQ Unit Price"
                                addonAfter={selectRFQUnitPriceCurrency}
                            />
                        </Form.Item>
                    </Col>


                    <Col span={12}>
                        <Form.Item label="MOQ" name="moq" rules={[{ required: true, message: "Enter MOQ" }]}>
                            <RoundedInputNumber placeholder="Enter MOQ" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="RFQ Date" name="rfqDate" rules={[{ required: true, message: "Select RFQ date" }]}>
                            <RoundedDatePicker />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item label="Supplier" name="supplier" rules={[{ required: true, message: "Select supplier" }]}>
                            <Select placeholder="Select Supplier">
                                {suppliers.map(option => (
                                    <Option key={option._id} value={option._id}>
                                        {option.companyName}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Lead Time (Weeks)" name="leadTime" rules={[{ required: true, message: "Enter lead time" }]}>
                            <RoundedInputNumber placeholder="Enter lead time in weeks" />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item label="Status" name="status">
                            <RoundedSelect placeholder="Select status">
                                <Option value="Active">Active</Option>
                                <Option value="Inactive">Inactive</Option>
                            </RoundedSelect>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Category" name="category" rules={[{ required: true, message: "Select category" }]}>
                            <Select placeholder="Select Category">
                                {categories.map(option => (
                                    <Option key={option._id} value={option._id}>
                                        {option.name}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>

                    <Col span={24}>
                        <Form.Item label="Note" name="note">
                            <RoundedTextArea placeholder="Enter note" rows={2} />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </GlobalModal>
    );
};

export default AddMpnModal;

import React, { useEffect, useState } from "react";
import { Form, Row, Col, Input, Select } from "antd";
import GlobalModal from "components/GlobalModal";
import { RoundedInput } from "components/FormFields";

const { TextArea } = Input;
const { Option } = Select;

const AddUOMModal = ({ visible, onCancel, onSubmit, formData, loading }) => {
  const [form] = Form.useForm();
  const [status, setStatus] = useState("active");

  // Common UOM examples for quick selection
const commonUOMs = [
  // ⚖️ Weight / Mass
  { code: 'MG', name: 'Milligram' },
  { code: 'G', name: 'Gram' },
  { code: 'KG', name: 'Kilogram' },
  { code: 'TON', name: 'Metric Ton' },
  { code: 'OZ', name: 'Ounce' },
  { code: 'LB', name: 'Pound' },
  { code: 'ST', name: 'Stone' },
  { code: 'CWT', name: 'Hundredweight' },

  // 📏 Length / Distance
  { code: 'MM', name: 'Millimeter' },
  { code: 'CM', name: 'Centimeter' },
  { code: 'M', name: 'Meter' },
  { code: 'KM', name: 'Kilometer' },
  { code: 'IN', name: 'Inch' },
  { code: 'FT', name: 'Foot' },
  { code: 'YD', name: 'Yard' },
  { code: 'MI', name: 'Mile' },
  { code: 'NM', name: 'Nautical Mile' },

  // 📐 Area
  { code: 'MM2', name: 'Square Millimeter' },
  { code: 'CM2', name: 'Square Centimeter' },
  { code: 'M2', name: 'Square Meter' },
  { code: 'KM2', name: 'Square Kilometer' },
  { code: 'IN2', name: 'Square Inch' },
  { code: 'FT2', name: 'Square Foot' },
  { code: 'YD2', name: 'Square Yard' },
  { code: 'ACRE', name: 'Acre' },
  { code: 'HA', name: 'Hectare' },

  // 🧪 Volume / Capacity
  { code: 'ML', name: 'Milliliter' },
  { code: 'L', name: 'Liter' },
  { code: 'KL', name: 'Kiloliter' },
  { code: 'GAL', name: 'Gallon (US)' },
  { code: 'QT', name: 'Quart' },
  { code: 'PT', name: 'Pint' },
  { code: 'CUP', name: 'Cup' },
  { code: 'FL_OZ', name: 'Fluid Ounce' },
  { code: 'BBL', name: 'Barrel' },

  // 🔥 Temperature
  { code: 'C', name: 'Celsius' },
  { code: 'F', name: 'Fahrenheit' },
  { code: 'K', name: 'Kelvin' },

  // ⏱ Time
  { code: 'SEC', name: 'Second' },
  { code: 'MIN', name: 'Minute' },
  { code: 'HR', name: 'Hour' },
  { code: 'DAY', name: 'Day' },
  { code: 'WK', name: 'Week' },
  { code: 'MON', name: 'Month' },
  { code: 'YR', name: 'Year' },

  // ⚡ Energy / Power
  { code: 'J', name: 'Joule' },
  { code: 'KJ', name: 'Kilojoule' },
  { code: 'CAL', name: 'Calorie' },
  { code: 'KCAL', name: 'Kilocalorie' },
  { code: 'WH', name: 'Watt-hour' },
  { code: 'KWH', name: 'Kilowatt-hour' },
  { code: 'MW', name: 'Megawatt' },

  // 💧 Pressure
  { code: 'PA', name: 'Pascal' },
  { code: 'KPA', name: 'Kilopascal' },
  { code: 'BAR', name: 'Bar' },
  { code: 'PSI', name: 'Pound per Square Inch' },
  { code: 'ATM', name: 'Atmosphere' },

  // ⚙️ Speed
  { code: 'MPS', name: 'Meters per Second' },
  { code: 'KPH', name: 'Kilometers per Hour' },
  { code: 'MPH', name: 'Miles per Hour' },
  { code: 'KNOT', name: 'Knot' },

  // ⚡ Electrical
  { code: 'V', name: 'Volt' },
  { code: 'A', name: 'Ampere' },
  { code: 'OHM', name: 'Ohm' },
  { code: 'W', name: 'Watt' },
  { code: 'KW', name: 'Kilowatt' },

  // 📦 Count / Quantity
  { code: 'PCS', name: 'Pieces' },
  { code: 'UNIT', name: 'Unit' },
  { code: 'PKT', name: 'Packet' },
  { code: 'BOX', name: 'Box' },
  { code: 'SET', name: 'Set' },
  { code: 'BAG', name: 'Bag' },
  { code: 'PAIR', name: 'Pair' },
  { code: 'ROLL', name: 'Roll' },
  { code: 'BUNDLE', name: 'Bundle' },
  { code: 'DOZ', name: 'Dozen' },
  { code: 'CARTON', name: 'Carton' },

  // 💰 Finance / Currency (optional category)
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
];


  useEffect(() => {
    if (formData) {
      form.setFieldsValue({
        name: formData.name,
        code: formData.code,
        description: formData.description,
        status: formData.status,
      });
      setStatus(formData.status || "active");
    } else {
      form.resetFields();
      setStatus("active");
    }
  }, [formData, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      const submitData = {
        name: values.name,
        code: values.code.toUpperCase(),
        description: values.description,
        status: values.status,
      };

      await onSubmit(submitData);
      form.resetFields();
      setStatus("active");
    } catch (err) {
      console.error("Form validation failed:", err);
    }
  };

  const handleUOMSelect = (value) => {
    const selectedUOM = commonUOMs.find(uom => uom.code === value);
    if (selectedUOM) {
      form.setFieldsValue({
        name: selectedUOM.name,
        code: selectedUOM.code,
      });
    }
  };

  return (
    <GlobalModal
      visible={visible}
      onCancel={() => { onCancel(); form.resetFields(); }}
      onOk={handleOk}
      header={formData ? "Edit UOM" : "Add New UOM"}
      okText={formData ? "Update" : "Submit"}
      width={500}
      confirmLoading={loading}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item 
              label="Quick Select Common UOM"
            >
              <Select 
                placeholder="Select from common UOMs"
                style={{ borderRadius: '8px' }}
                onChange={handleUOMSelect}
                allowClear
              >
                {commonUOMs.map(uom => (
                  <Option key={uom.code} value={uom.code}>
                    {uom.code} - {uom.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item 
              label="UOM Code" 
              name="code" 
              rules={[
                { required: true, message: 'Please enter UOM code' },
                { min: 1, max: 10, message: 'UOM code must be between 1-10 characters' }
              ]}
            >
              <RoundedInput 
                placeholder="e.g., KG" 
                style={{ textTransform: 'uppercase' }}
                maxLength={10}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item 
              label="UOM Name" 
              name="name" 
              rules={[
                { required: true, message: 'Please enter UOM name' },
                { min: 2, message: 'UOM name must be at least 2 characters' },
                { max: 50, message: 'UOM name cannot exceed 50 characters' }
              ]}
            >
              <RoundedInput placeholder="e.g., Kilogram" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item 
              label="Description" 
              name="description"
              rules={[
                { max: 200, message: 'Description cannot exceed 200 characters' }
              ]}
            >
              <TextArea
                placeholder="Enter UOM description (optional)"
                rows={3}
                style={{ borderRadius: '8px' }}
                showCount
                maxLength={200}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item 
              label="Status" 
              name="status" 
              initialValue="active"
            >
              <Select 
                style={{ borderRadius: '8px' }}
                value={status}
                onChange={setStatus}
              >
                <Option value="active">Active</Option>
                <Option value="deactive">Inactive</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </GlobalModal>
  );
};

export default AddUOMModal;
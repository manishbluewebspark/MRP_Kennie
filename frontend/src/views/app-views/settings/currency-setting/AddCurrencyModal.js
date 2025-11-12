import React, { useEffect, useState } from "react";
import { Form, Row, Col, Input, InputNumber, Switch, Select } from "antd";
import GlobalModal from "components/GlobalModal";
import { RoundedInput, RoundedSelect } from "components/FormFields";

const { Option } = Select;
const { TextArea } = Input;

const AddCurrencyModal = ({ visible, onCancel, onSubmit, formData, loading }) => {
  const [form] = Form.useForm();
  const [isActive, setIsActive] = useState(true);

  // 🔹 Common currency list
  const commonCurrencySymbols = [
    { code: "USD", symbol: "$", name: "US Dollar", decimalPlace: 2 },
    { code: "SGD", symbol: "S$", name: "Singapore Dollar", decimalPlace: 2 },
    { code: "EUR", symbol: "€", name: "Euro", decimalPlace: 2 },
    { code: "GBP", symbol: "£", name: "British Pound", decimalPlace: 2 },
    { code: "JPY", symbol: "¥", name: "Japanese Yen", decimalPlace: 0 },
    { code: "INR", symbol: "₹", name: "Indian Rupee", decimalPlace: 2 },
    { code: "AUD", symbol: "A$", name: "Australian Dollar", decimalPlace: 2 },
    { code: "CAD", symbol: "C$", name: "Canadian Dollar", decimalPlace: 2 },
    { code: "CHF", symbol: "CHF", name: "Swiss Franc", decimalPlace: 2 },
    { code: "CNY", symbol: "¥", name: "Chinese Yuan", decimalPlace: 2 },
  ];

  // 🔹 If editing existing data
  useEffect(() => {
    if (formData) {
      form.setFieldsValue({
        code: formData.code,
        name: formData.name,
        symbol: formData.symbol,
        exchangeRate: formData.exchangeRate,
        decimalPlaces: formData.decimalPlaces || 2,
        isActive: formData.isActive !== undefined ? formData.isActive : true,
        description: formData.description,
      });
      setIsActive(formData.isActive !== undefined ? formData.isActive : true);
    } else {
      form.resetFields();
      setIsActive(true);
    }
  }, [formData, form]);

  // 🔹 When a symbol is selected from dropdown
  const handleCurrencySelect = (value) => {
    const selected = commonCurrencySymbols.find((c) => c.symbol === value);
    if (selected) {
      form.setFieldsValue({
        code: selected.code,
        name: selected.name,
        decimalPlaces: selected.decimalPlace,
        symbol: selected.symbol,
        description: selected.name,
      });
    } else if (value === "custom") {
      // reset fields for custom symbol
      form.setFieldsValue({
        code: "",
        name: "",
        decimalPlaces: 2,
        description: "",
      });
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const submitData = {
        code: values.code?.toUpperCase(),
        name: values.name,
        symbol: values.symbol,
        exchangeRate: values.exchangeRate,
        decimalPlaces: values.decimalPlaces,
        isActive: values.isActive,
        description: values.description,
      };
      await onSubmit(submitData);
      form.resetFields();
      setIsActive(true);
    } catch (err) {
      console.error("Form validation failed:", err);
    }
  };

  return (
    <GlobalModal
      visible={visible}
      onCancel={() => {
        onCancel();
        form.resetFields();
      }}
      onOk={handleOk}
      header={formData ? "Edit Currency" : "Add New Currency"}
      okText={formData ? "Update" : "Submit"}
      width={600}
      confirmLoading={loading}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          {/* 🔹 Symbol Dropdown */}
          <Col span={12}>
            <Form.Item
              label="Symbol"
              name="symbol"
              rules={[{ required: true, message: "Please enter currency symbol" }]}
            >
              <RoundedSelect
                placeholder="Select or type symbol"
                onChange={handleCurrencySelect}
              >
                {commonCurrencySymbols.map((currency) => (
                  <Option key={currency.code} value={currency.symbol}>
                    {currency.symbol} - {currency.name}
                  </Option>
                ))}
                <Option value="custom">Custom Symbol</Option>
              </RoundedSelect>
            </Form.Item>
          </Col>

          {/* 🔹 Exchange Rate */}
          <Col span={12}>
            <Form.Item
              label="Exchange Rate (vs USD)"
              name="exchangeRate"
              rules={[{ required: true, message: "Please enter exchange rate" }]}
            >
              <InputNumber
                style={{ width: "100%", borderRadius: "8px" }}
                placeholder="e.g., 1.0"
                min={0}
                step={0.01}
                precision={4}
              />
            </Form.Item>
          </Col>

          {/* 🔹 Currency Code */}
          <Col span={12}>
            <Form.Item
              label="Currency Code"
              name="code"
              rules={[
                { required: true, message: "Please enter currency code" },
                { min: 3, max: 3, message: "Currency code must be 3 characters" },
              ]}
            >
              <RoundedInput
                placeholder="e.g., USD"
                maxLength={3}
                style={{ textTransform: "uppercase" }}
              />
            </Form.Item>
          </Col>

          {/* 🔹 Currency Name */}
          <Col span={12}>
            <Form.Item
              label="Currency Name"
              name="name"
              rules={[{ required: true, message: "Please enter currency name" }]}
            >
              <RoundedInput placeholder="e.g., US Dollar" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          {/* 🔹 Decimal Places */}
          <Col span={12}>
            <Form.Item label="Decimal Places" name="decimalPlaces" initialValue={2}>
              <InputNumber
                style={{ width: "100%", borderRadius: "8px" }}
                min={0}
                max={6}
                placeholder="e.g., 2"
              />
            </Form.Item>
          </Col>

          {/* 🔹 Status Switch */}
          <Col span={12}>
            <Form.Item
              label="Status"
              name="isActive"
              valuePropName="checked"
              initialValue={true}
            >
              <Switch
                checkedChildren="Active"
                unCheckedChildren="Inactive"
                checked={isActive}
                onChange={setIsActive}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 🔹 Description */}
        <Form.Item label="Description" name="description">
          <TextArea
            placeholder="Enter currency description (optional)"
            rows={3}
            style={{ borderRadius: "8px" }}
          />
        </Form.Item>
      </Form>
    </GlobalModal>
  );
};

export default AddCurrencyModal;

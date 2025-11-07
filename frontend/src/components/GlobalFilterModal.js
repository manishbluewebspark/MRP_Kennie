import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, DatePicker, Button, Space, Row, Col, Input, InputNumber } from 'antd';
import { FilterOutlined, ReloadOutlined } from '@ant-design/icons';

const { Option } = Select;
const { RangePicker } = DatePicker;

const GlobalFilterModal = ({
  visible,
  onClose,
  onSubmit,
  onChange, // ✅ new prop to send data live outside
  filters = [],
  initialValues = {},
  title = "Advanced Filters",
  width = 600
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // ✅ Send live updates when form changes
  const handleValuesChange = (changedValues, allValues) => {
    if (onChange) onChange(allValues);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      console.log('----values', values);
      onSubmit(values); // ✅ Final submit
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    if (onChange) onChange({}); // ✅ Notify parent after reset
  };

  // ✅ When modal opens, set initial values
  useEffect(() => {
    if (visible) form.setFieldsValue(initialValues);
  }, [visible, initialValues, form]);

  const renderFilterField = (filter) => {
    const { type, name, label, placeholder, options = [], rules = [], ...restProps } = filter;


    switch (type) {
      case 'date':
        return (
          <DatePicker
            style={{ width: '100%' }}
            placeholder={placeholder || `Select ${label}`}
            {...restProps}
          />
        );

      case 'dateRange':
        return (
          <RangePicker
            style={{ width: '100%' }}
            placeholder={[placeholder || `Start Date`, 'End Date']}
            {...restProps}
          />
        );

      case 'select':
        return (
          <Select
            placeholder={placeholder || `Select ${label}`}
            style={{ width: '100%' }}
            allowClear
            {...restProps}
          >
            {options.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        );

     case 'range':
  return (
    <div>
      <label style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      <Space.Compact style={{ width: '100%' }}>
        <Form.Item
          name={['min']}
          noStyle
          rules={[
            {
              pattern: /^[0-9]+$/,
              message: 'Only digits allowed (e.g. 0001)',
            },
          ]}
        >
          <Input
            placeholder="From (e.g. 0001)"
            className="ant-input"
            style={{ width: '50%' }}
            maxLength={10}
          />
        </Form.Item>

        <Form.Item
          name={['max']}
          noStyle
          rules={[
            {
              pattern: /^[0-9]+$/,
              message: 'Only digits allowed (e.g. 0005)',
            },
          ]}
        >
          <Input
            placeholder="To (e.g. 0010)"
            className="ant-input"
            style={{ width: '50%' }}
            maxLength={10}
          />
        </Form.Item>
      </Space.Compact>
    </div>
  );


      default:
        return null;
    }
  };

  return (
    <Modal
      title={
        <span>
          <FilterOutlined style={{ marginRight: 8 }} />
          {title}
        </span>
      }
      open={visible}
      onCancel={() => {
        if (onClose) onClose();
        if (onChange) onChange(form.getFieldsValue()); // ✅ send data on close
      }}
      footer={null}
      width={width}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onValuesChange={handleValuesChange}
      >
        <Row gutter={[0, 16]}>
          {filters.map((filter, index) => (
            <Col xs={24} key={filter.name || index}>
              <Form.Item
                name={filter.name}
                rules={filter.rules || []}
                style={{ marginBottom: 0 }}
              >
                {renderFilterField(filter)}
              </Form.Item>
            </Col>
          ))}
        </Row>

        <div style={{ textAlign: 'right', marginTop: 24 }}>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              disabled={loading}
            >
              Reset All
            </Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={loading}
            >
              Apply Filters
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
};

export default GlobalFilterModal;

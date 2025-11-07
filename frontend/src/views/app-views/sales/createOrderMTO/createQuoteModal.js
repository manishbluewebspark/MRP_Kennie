// CreateSalesQuoteModal.js
import React, { useEffect, useState } from "react";
import { Modal, Form, Input, InputNumber, Select, Button, Divider, Typography } from "antd";

const { Title, Text } = Typography;
const { Option } = Select;

const CreateSalesQuoteModal = ({ visible, onClose, selectedQuoteType, onCreateQuote, editingRecord, projectData, customerData, currencies = [] }) => {
  const [form] = Form.useForm();
  const [calculatedValues, setCalculatedValues] = useState({ totalPrice: 0.0, salesPrice: 0 });

  console.log('------projectData', projectData);
  console.log('------editingRecord', editingRecord);




  useEffect(() => {
    if (editingRecord && visible) {
      console.log('Setting form values for edit:', {
        project: editingRecord.projectId?._id,
        quantity: editingRecord.qty || 1,
        unitPrice: editingRecord.costingSummary?.grandTotalWithMarkup,
        currency: editingRecord.currency,
        leadTime: editingRecord.costingSummary?.maxLeadTimeFromItems || 0,
        drawingNumber: editingRecord.drawingNo,
        description: editingRecord.description,
      });

      form.setFieldsValue({
        project: editingRecord.projectId?._id,
        quantity: editingRecord.qty || 1,
        unitPrice: editingRecord.costingSummary?.grandTotalWithMarkup,
        freightPercent: editingRecord.freightPercent,
        currency: editingRecord?.currency?._id,
        leadTime: editingRecord.costingSummary?.maxLeadTimeFromItems || 0,
        drawingNumber: editingRecord.drawingNo,
        description: editingRecord.description,
      });

      const quantity = editingRecord.qty || 1;
      const unitPrice = editingRecord.costingSummary?.grandTotalWithMarkup || 0;
      const total = quantity * unitPrice;
      setCalculatedValues({
        totalPrice: total.toFixed(2),
        salesPrice: Math.round(total)
      });
    } else if (visible) {
      form.resetFields();
      setCalculatedValues({ totalPrice: 0.0, salesPrice: 0 });
      form.setFieldsValue({
        quantity: 1,
        unitPrice: 0,
        freightPercent: 0,
        leadTime: 0,
      });
    }
  }, [editingRecord, visible, form]);

  const calculatePrices = () => {
    const quantity = form.getFieldValue("quantity") || 0;
    const unitPrice = editingRecord.costingSummary?.grandTotalWithMarkup || 0;
    const freightPercent = form.getFieldValue("freightPercent") || 0;
    const subtotal = quantity * unitPrice;
    const freight = subtotal * (freightPercent / 100);
    const total = subtotal + freight;
    setCalculatedValues({
      totalPrice: total.toFixed(2),
      salesPrice: Math.round(total)
    });
  };

  const handleCancel = () => {
    onClose();
    form.resetFields();
    setCalculatedValues({ totalPrice: 0.0, salesPrice: 0 });
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        selectedQuoteType,
        calculatedValues,
        isEdit: !!editingRecord,
        editingRecordId: editingRecord?._id
      };
      await onCreateQuote(payload);
      handleCancel();
    } catch (err) {
      console.error('Validation failed:', err);
    }
  };

  return (
    <Modal
      title={<Title level={3} style={{ margin: 0 }}>{editingRecord ? "Edit Sales Quote" : "Create Sales Quote"}</Title>}
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>Cancel</Button>,
        <Button key="create" type="primary" onClick={handleCreate}>
          {editingRecord ? "Update Quote" : "Create Quote"}
        </Button>,
      ]}
      width={640}
      destroyOnClose
    >
      {selectedQuoteType && (
        <div style={{ marginBottom: 12, padding: 8, backgroundColor: "#f0f8ff", borderRadius: 6 }}>
          <Text strong>Selected Quote Type: </Text>
          <Text>
            {selectedQuoteType === "cable_harness" ? "Cable Harness/Assembly" :
              selectedQuoteType === "box_build" ? "Box Build" : "Other"}
          </Text>
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          quantity: 1,
          unitPrice: 0,
          freightPercent: 0,
          leadTime: 0,
          currency: ''
        }}
        onFieldsChange={calculatePrices}
        onValuesChange={(changedValues, allValues) => {
          if (changedValues.project) {
            const selectedProject = projectData.find(
              (p) => p._id === changedValues.project
            );
            if (selectedProject && selectedProject.currency?._id) {
              form.setFieldsValue({
                currency: selectedProject.currency._id,
              });
            }
          }
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <Title level={4}>Drawing Details</Title>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Form.Item
              label="Drawing Number"
              name="drawingNumber"
              rules={[{ required: true, message: "Please enter drawing number" }]}
            >
              <Input placeholder="Enter drawing number" />
            </Form.Item>
            <Form.Item
              label="Description"
              name="description"
              rules={[{ required: true, message: "Please enter description" }]}
            >
              <Input placeholder="Enter description" />
            </Form.Item>
          </div>
        </div>

        <Divider />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
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

            <Form.Item label="Quantity" name="quantity">
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              label="Unit Price"
              name="unitPrice"
              rules={[{ required: true, message: "Please enter unit price" }]}
            >
              <InputNumber
                disabled
                min={0}
                style={{ width: "100%" }}
                step={0.01}
                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
              />
            </Form.Item>
          </div>

          <div>
            <Form.Item
              label="Currency"
              name="currency"
              rules={[{ required: true, message: "Please select currency" }]}
            >
              <Select placeholder="Select currency" disabled>
                {currencies.map((c) => (
                  <Option key={c._id} value={c._id}>
                    {c.symbol} {c.code} - {c.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Lead Time (Weeks)"
              name="leadTime"
              rules={[{ required: true, message: "Please enter lead time" }]}
            >
              <InputNumber disabled min={0} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item label="Total Price">
              <Input
                disabled
                value={`${calculatedValues.totalPrice}`}
                readOnly
                prefix="$"
                style={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}
              />
            </Form.Item>
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default CreateSalesQuoteModal;
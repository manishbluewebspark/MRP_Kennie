import React, { useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Divider,
  message,
  Spin,
  Select,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import {
  addOrUpdatePurchaseSetting,
  getAllPurchaseSettings,
  clearError,
  clearSuccess,
} from 'store/slices/purchaseSettingSlice';
import PurchaseSettingService from 'services/purchaseSettingService';

const { Title, Text } = Typography;
const { TextArea } = Input;

const SettingsPage = () => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();

  const { purchaseSettings, loading, error, success } = useSelector(
    (state) => state.purchaseSettings
  );

  const defaultValues = {
    addresses: [
      {
        name: '',
        fullAddress:
          '',
      },
    ],
    defaultTerms:
      '',
    status: 'active',
    paymentTerms: [""],   // ✅ new
    incoterms: [""],
    secondLevelApprovalLimit: "",
  };

  // 🔹 Fetch existing settings
  useEffect(() => {
    dispatch(getAllPurchaseSettings());
  }, [dispatch]);

  // 🔹 Set form data when fetched
  useEffect(() => {
    if (purchaseSettings && purchaseSettings.length > 0) {
      const setting = purchaseSettings[0];
      form.setFieldsValue({
        addresses: setting.addresses.map((addr) => ({
          id: addr.id || addr._id || Date.now(),
          name: addr.name,
          fullAddress: addr.fullAddress,
        })),
        defaultTerms: setting.defaultTerms || "",
        paymentTerms: Array.isArray(setting.paymentTerms) && setting.paymentTerms.length ? setting.paymentTerms : [""], // ✅
        incoterms: Array.isArray(setting.incoterms) && setting.incoterms.length ? setting.incoterms : [""],           // ✅
        status: setting.status || "active",
        secondLevelApprovalLimit:
          setting.secondLevelApprovalLimit || "",
      });
    } else {
      form.setFieldsValue(defaultValues);
    }
  }, [purchaseSettings, form]);


  // 🔹 Handle backend success/error
  useEffect(() => {
    if (success) {
      // message.success('Settings saved successfully');
      dispatch(clearSuccess());
    }
    if (error) {
      message.error(error.message || 'Failed to save settings');
      dispatch(clearError());
    }
  }, [success, error, dispatch]);

  // 🔹 Submit handler (Save/Update)
  const onFinish = async (values) => {
    try {
      const processedValues = {
        ...values,
        addresses: values.addresses.map((addr, index) => ({
          ...addr,
          id: addr.id || Date.now() + index,
        })),
        paymentTerms: (values.paymentTerms || []).map(s => String(s || "").trim()).filter(Boolean),
        incoterms: (values.incoterms || []).map(s => String(s || "").trim()).filter(Boolean),
      };

      await dispatch(addOrUpdatePurchaseSetting(processedValues)).unwrap();
      message.success("Settings saved successfully");
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  // 🔹 Cancel / Reset handlers
  const onCancel = () => {
    if (purchaseSettings && purchaseSettings.length > 0) {
      const setting = purchaseSettings[0];
      form.setFieldsValue({
        addresses: setting.addresses.map((addr) => ({
          id: addr.id || addr._id || Date.now(),
          name: addr.name,
          fullAddress: addr.fullAddress,
        })),
        defaultTerms: setting.defaultTerms || '',
        status: setting.status || 'active',
      });
    } else {
      form.setFieldsValue(defaultValues);
    }
    message.info('Changes cancelled');
  };

  const onReset = () => {
    form.setFieldsValue(defaultValues);
    message.info('Reset to default values');
  };

  // 🔹 Delete a specific address
  const handleDeleteAddress = async (addressId, remove, fieldIndex) => {
    try {
      const setting = purchaseSettings[0];
      if (setting?._id && addressId) {
        await PurchaseSettingService.deletePurchaseSetting(purchaseSettings[0]._id, addressId);
        message.success('Address deleted successfully');
        dispatch(getAllPurchaseSettings());
      } else {
        message.info('Address removed locally');
      }
      remove(fieldIndex);
    } catch (error) {
      console.error('Delete error:', error);
      message.error('Failed to delete address');
    }
  };

  if (loading && (!purchaseSettings || purchaseSettings.length === 0)) {
    return (
      <div
        style={{
          padding: '24px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '200px',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <Title level={2} style={{ margin: 0 }}>
          Default Shipping Addresses
        </Title>
        <Text type="secondary">
          Set default shipping addresses for POs, editable when creating.
        </Text>
      </div>

      <Card
        style={{
          marginBottom: '24px',
          borderRadius: '8px',
          border: '1px solid #d9d9d9',
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.List name="addresses">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, fieldKey, ...restField }, index) => (
                  <div
                    key={key}
                    style={{
                      marginBottom: '24px',
                      padding: '16px',
                      border: '1px solid #f0f0f0',
                      borderRadius: '6px',
                      position: 'relative',
                    }}
                  >
                    {/* Address Name */}
                    <Form.Item
                      {...restField}
                      name={[name, 'name']}
                      fieldKey={[fieldKey, 'name']}
                      label={<Text strong>Address Name</Text>}
                      rules={[
                        { required: true, message: 'Please enter address name' },
                      ]}
                    >
                      <Input
                        placeholder="Enter name"
                        size="large"
                        style={{
                          borderRadius: '6px',
                          fontSize: '14px',
                          paddingRight: '40px',
                        }}
                      />
                    </Form.Item>

                    {/* Full Address */}
                    <Form.Item
                      {...restField}
                      name={[name, 'fullAddress']}
                      fieldKey={[fieldKey, 'fullAddress']}
                      label={<Text strong>Full Address</Text>}
                      rules={[
                        { required: true, message: 'Please enter full address' },
                      ]}
                    >
                      <TextArea
                        placeholder="Enter address"
                        rows={4}
                        size="large"
                        style={{
                          borderRadius: '6px',
                          fontSize: '14px',
                          resize: 'vertical',
                        }}
                      />
                    </Form.Item>

                    {/* Hidden ID */}
                    <Form.Item
                      {...restField}
                      name={[name, 'id']}
                      fieldKey={[fieldKey, 'id']}
                      hidden
                    >
                      <Input type="hidden" />
                    </Form.Item>

                    {/* Delete Icon */}
                    <DeleteOutlined
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '12px',
                        color: '#ff4d4f',
                        cursor: 'pointer',
                      }}
                      onClick={() =>
                        handleDeleteAddress(
                          form.getFieldValue(['addresses', index, 'id']),
                          remove,
                          index
                        )
                      }
                    />
                  </div>
                ))}

                {/* Add New Address */}
                <Button
                  type="dashed"
                  onClick={() =>
                    add({
                      id: Date.now(),
                      name: '',
                      fullAddress: '',
                    })
                  }
                  block
                  icon={<PlusOutlined />}
                  size="large"
                  style={{
                    borderRadius: '6px',
                    borderColor: '#d9d9d9',
                    color: '#595959',
                    marginBottom: '16px',
                  }}
                >
                  Add New Address
                </Button>
              </>
            )}
          </Form.List>

          {/* Terms & Conditions */}
          <Card
            style={{
              marginBottom: '24px',
              borderRadius: '8px',
              border: '1px solid #d9d9d9',
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <div style={{ marginBottom: '24px' }}>
              <Title level={4} style={{ margin: 0 }}>
                Default Terms & Conditions
              </Title>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                Set default terms and conditions that will appear in purchase orders.
              </Text>
            </div>

            <Form.Item
              name="defaultTerms"
              rules={[
                { required: true, message: 'Please enter terms & conditions' },
              ]}
            >
              <TextArea
                placeholder="Enter terms & conditions"
                rows={6}
                size="large"
                style={{
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical',
                  lineHeight: '1.5',
                }}
              />
            </Form.Item>


          </Card>

          <Card
            style={{ marginBottom: 24, borderRadius: 8, border: "1px solid #d9d9d9" }}
            bodyStyle={{ padding: 20 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <Title level={5} style={{ margin: 0 }}>Payment Terms</Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Type and press Enter (e.g., Net 30, Advance, COD).
                </Text>
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Max 50
              </Text>
            </div>

            <Form.Item
              name="paymentTerms"
              style={{ marginTop: 12, marginBottom: 0 }}
              rules={[
                {
                  validator: (_, v) => {
                    if (!v || v.length === 0) return Promise.reject(new Error("Add at least 1 payment term"));
                    if (v.length > 50) return Promise.reject(new Error("Max 50 terms allowed"));
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Select
                mode="tags"
                tokenSeparators={[","]}
                placeholder="Type term and press Enter"
                size="middle"
                maxTagCount="responsive"
                style={{ width: "100%" }}
                onChange={(vals) => {
                  // ✅ keep clean + unique + limit
                  const cleaned = Array.from(
                    new Set((vals || []).map(x => String(x || "").trim()).filter(Boolean))
                  ).slice(0, 50);
                  form.setFieldsValue({ paymentTerms: cleaned });
                }}
                options={[
                  { value: "Advance" },
                  { value: "Net 15" },
                  { value: "Net 30" },
                  { value: "Net 45" },
                  { value: "Net 60" },
                  { value: "COD" },
                  { value: "CAD" },
                  { value: "LC" },
                  { value: "Open Account" },
                ]}
              />
            </Form.Item>
          </Card>

          <Card
            style={{ marginBottom: 24, borderRadius: 8, border: "1px solid #d9d9d9" }}
            bodyStyle={{ padding: 20 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <Title level={5} style={{ margin: 0 }}>Incoterms</Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Type and press Enter (e.g., EXW, FOB, CIF, DDP).
                </Text>
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Max 30
              </Text>
            </div>

            <Form.Item
              name="incoterms"
              style={{ marginTop: 12, marginBottom: 0 }}
              rules={[
                {
                  validator: (_, v) => {
                    if (!v || v.length === 0) return Promise.reject(new Error("Add at least 1 incoterm"));
                    if (v.length > 30) return Promise.reject(new Error("Max 30 incoterms allowed"));
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Select
                mode="tags"
                tokenSeparators={[",", " "]}
                placeholder="Type incoterm and press Enter"
                size="middle"
                maxTagCount="responsive"
                style={{ width: "100%" }}
                onChange={(vals) => {
                  const cleaned = Array.from(
                    new Set((vals || []).map(x => String(x || "").trim().toUpperCase()).filter(Boolean))
                  ).slice(0, 30);
                  form.setFieldsValue({ incoterms: cleaned });
                }}
                options={[
                  { value: "EXW" },
                  { value: "FCA" },
                  { value: "CPT" },
                  { value: "CIP" },
                  { value: "DAP" },
                  { value: "DPU" },
                  { value: "DDP" },
                  { value: "FAS" },
                  { value: "FOB" },
                  { value: "CFR" },
                  { value: "CIF" },
                ]}
              />
            </Form.Item>
          </Card>

          <Card
            style={{
              marginBottom: 24,
              borderRadius: 8,
              border: "1px solid #d9d9d9",
            }}
            bodyStyle={{ padding: 20 }}
          >
            <div style={{ marginBottom: 16 }}>
              <Title level={5} style={{ margin: 0 }}>
                Second Level Approval Amount Limit
              </Title>

              <Text type="secondary" style={{ fontSize: 12 }}>
                Purchase orders above this amount will require second level approval.
              </Text>
            </div>

            <Form.Item
              name="secondLevelApprovalLimit"
              rules={[
                {
                  required: true,
                  message: "Please enter approval amount limit",
                },
              ]}
            >
              <Input
                type="number"
                placeholder="Enter amount limit"
                size="large"
                 prefix="$"
                min={0}
                style={{
                  borderRadius: 6,
                }}
              />
            </Form.Item>
          </Card>

          <div
            style={{
              position: "sticky",
              bottom: 0,
              background: "#fff",
              padding: "12px 0",
              borderTop: "1px solid #f0f0f0",
              marginTop: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Button onClick={onReset}>Reset to Defaults</Button>

              <Space>
                <Button onClick={onCancel}>Cancel</Button>
                <Button
                  type="primary"
                  onClick={() => form.submit()}
                  loading={loading}
                >
                  Save Settings
                </Button>
              </Space>
            </div>
          </div>




        </Form>
      </Card>
    </div>
  );
};

export default SettingsPage;

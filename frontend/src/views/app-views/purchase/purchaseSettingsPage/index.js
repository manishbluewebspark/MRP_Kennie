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
        defaultTerms: setting.defaultTerms || '',
        status: setting.status || 'active',
      });
    } else {
      form.setFieldsValue(defaultValues);
    }
  }, [purchaseSettings, form]);

  // 🔹 Handle backend success/error
  useEffect(() => {
    if (success) {
      message.success('Settings saved successfully');
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
      };
      await dispatch(addOrUpdatePurchaseSetting(processedValues)).unwrap();
    } catch (err) {
      console.error('Save failed:', err);
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

            <Divider />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Button size="small" onClick={onReset}>
                Reset to Defaults
              </Button>

              <Space>
                <Button size="small" onClick={onCancel}>
                  Cancel
                </Button>
                <Button
                  type="primary"
                  size="small"
                  onClick={() => form.submit()}
                  loading={loading}
                >
                  Save Settings
                </Button>
              </Space>
            </div>
          </Card>
        </Form>
      </Card>
    </div>
  );
};

export default SettingsPage;

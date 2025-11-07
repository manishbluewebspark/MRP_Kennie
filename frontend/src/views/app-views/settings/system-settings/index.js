import React, { useEffect, useState } from 'react';
import {
  Card,
  Form,
  InputNumber,
  Select,
  Button,
  Tag,
  Divider,
  Row,
  Col,
  Typography
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import SystemSettingsService from 'services/SystemSettingsService';
import { hasPermission } from 'utils/auth';

const { Title, Text } = Typography;
const { Option } = Select;

const SystemSettings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currencyStates, setCurrencyStates] = useState({
    SGD: 'active',
    USD: 'inactive',
    EUR: 'inactive',
    RMB: 'inactive'
  });

  // Load settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await SystemSettingsService.getSystemSettings();
      console.log('-------res', res)
      if (res.success && res.data) {
        const settings = res.data; // latest settings
        form.setFieldsValue({
          ...settings.alertSettings,
          ...settings.gstSettings,
          ...settings.workOrderSettings,
          ...settings.currencySettings,
          criticalWeeks: settings.inventoryAlerts.criticalWeeksLeft,
          urgentWeeks: settings.inventoryAlerts.urgentWeeksLeft,
          normalWeeks: settings.inventoryAlerts.normalWeeksLeft,
        });

        if (settings.currencySettings) {
          const allCurrencies = [...settings.currencySettings.activeCurrencies, ...settings.currencySettings.inactiveCurrencies];
          const states = {};
          allCurrencies.forEach(c => {
            states[c] = settings.currencySettings.activeCurrencies.includes(c) ? 'active' : 'inactive';
          });
          setCurrencyStates(states);
        }
      }
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  };

  const handleCurrencyToggle = (currency) => {
    setCurrencyStates(prev => ({
      ...prev,
      [currency]: prev[currency] === 'active' ? 'inactive' : 'active'
    }));
  };

  const getCurrencyTag = (currency) => {
    const status = currencyStates[currency];
    const color = status === 'active' ? 'green' : 'red';
    const text = status === 'active' ? 'Active' : 'Inactive';

    return (
      <Tag
        color={color}
        style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer', marginRight: '8px' }}
        onClick={() => handleCurrencyToggle(currency)}
      >
        {text} {currency}
      </Tag>
    );
  };

  const saveSection = async (values) => {
    try {
      setLoading(true);

      // Merge currency states
      const activeCurrencies = Object.keys(currencyStates).filter(c => currencyStates[c] === 'active');
      const inactiveCurrencies = Object.keys(currencyStates).filter(c => currencyStates[c] === 'inactive');

      const payload = {
        alertSettings: {
          purchaseAlertTrigger: values.purchaseAlertTrigger,
          receivingWindow: values.receivingWindow,
          workOrderAlertTrigger: values.workOrderAlertTrigger,
          noCommitDateAlertTrigger: values.noCommitDateAlertTrigger,
        },
        gstSettings: {
          gstPercentage: values.gstPercentage,
        },
        workOrderSettings: {
          needDateCalculation: values.needDateCalculation,
          workOrderAlertTrigger: values.workOrderAlertTrigger,
        },
        currencySettings: {
          activeCurrencies,
          inactiveCurrencies,
          defaultCurrency: values.defaultCurrency,
          exchangeRatesToUSD: values.exchangeToUSD,
          exchangeRatesToSGD: values.exchangeToSGD,
        },
        inventoryAlerts: {
          criticalWeeksLeft: values.criticalWeeks,
          urgentWeeksLeft: values.urgentWeeks,
          normalWeeksLeft: values.normalWeeks,
        }
      };

      const res = await SystemSettingsService.addOrUpdateSystemSettings(payload);
      if (res.success) {
        fetchSettings(); // refresh form values
      }
    } catch (err) {
      console.error('Failed to save settings', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>System Settings</Title>
      <Text type="secondary">Manage system configurations</Text>
      <Divider />

      <Form form={form} layout="vertical" onFinish={saveSection}>
        {/* Alert Settings */}
        <Card title="Alert Settings" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="purchaseAlertTrigger" label="Purchase Alert Trigger (weeks)">
                <InputNumber min={0} max={52} style={{ width: '100%' }} addonAfter="weeks" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="receivingWindow" label="Receiving Window (days)">
                <InputNumber min={0} max={30} style={{ width: '100%' }} addonAfter="days" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="workOrderAlertTrigger" label="Work Order Alert Trigger (days)">
                <InputNumber min={0} max={30} style={{ width: '100%' }} addonAfter="days" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="noCommitDateAlertTrigger" label="No Commit Date Alert Trigger (days)">
                <InputNumber min={0} max={30} style={{ width: '100%' }} addonAfter="days" />
              </Form.Item>
            </Col>
          </Row>
          {hasPermission("settings.systemSettings:update_alert_settings") && (<Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
            Save Alert Settings
          </Button>)}

        </Card>

        {/* GST Settings */}
        <Card title="GST Settings" style={{ marginBottom: 24 }}>
          <Form.Item name="gstPercentage" label="GST %">
            <InputNumber min={0} max={100} style={{ width: '100%' }} addonAfter="%" />
          </Form.Item>
          {hasPermission("settings.systemSettings:update_gst_settings") && (<Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
            Save GST Settings
          </Button>)}

        </Card>

        {/* Work Order Settings */}
        <Card title="Work Order Settings" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="needDateCalculation" label="Need Date Calculation (weeks)">
                <InputNumber min={0} max={52} style={{ width: '100%' }} addonAfter="weeks" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="workOrderAlertTrigger" label="Work Order Alert Trigger (days)">
                <InputNumber min={0} max={30} style={{ width: '100%' }} addonAfter="days" />
              </Form.Item>
            </Col>
          </Row>
          {hasPermission("settings.systemSettings:update_workorder_settings") && (<Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
            Save Work Order Settings
          </Button>)}

        </Card>

        {/* Currency Settings */}
        <Card title="Currency Settings" style={{ marginBottom: 24 }}>
          <Form.Item label="Active Currencies">
            <div style={{ marginBottom: 16 }}>
              {Object.keys(currencyStates).map(c => getCurrencyTag(c))}
            </div>
          </Form.Item>
          <Form.Item name="defaultCurrency" label="Default Currency">
            <Select style={{ width: 200 }}>
              {Object.keys(currencyStates).map(c => <Option key={c} value={c}>{c}</Option>)}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={6}><Form.Item name={['exchangeRatesToUSD', 'SGD']} label="SGD"><InputNumber style={{ width: '100%' }} step={0.01} min={0} /></Form.Item></Col>
            <Col span={6}><Form.Item name={['exchangeRatesToUSD', 'EUR']} label="EUR"><InputNumber style={{ width: '100%' }} step={0.01} min={0} /></Form.Item></Col>
            <Col span={6}><Form.Item name={['exchangeRatesToUSD', 'RMB']} label="RMB"><InputNumber style={{ width: '100%' }} step={0.01} min={0} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}><Form.Item name={['exchangeRatesToSGD', 'USD']} label="USD"><InputNumber style={{ width: '100%' }} step={0.01} min={0} /></Form.Item></Col>
            <Col span={6}><Form.Item name={['exchangeRatesToSGD', 'EUR']} label="EUR"><InputNumber style={{ width: '100%' }} step={0.01} min={0} /></Form.Item></Col>
            <Col span={6}><Form.Item name={['exchangeRatesToSGD', 'RMB']} label="RMB"><InputNumber style={{ width: '100%' }} step={0.01} min={0} /></Form.Item></Col>
          </Row>
          {hasPermission("settings.systemSettings:update_currency_settings") && (<Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
            Save Currency Settings
          </Button>)}

        </Card>

        {/* Inventory Alerts */}
        <Card title="Inventory Alerts">
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={8}><Form.Item name="criticalWeeks" label="Weeks Left"><InputNumber min={0} max={52} style={{ width: '100%' }} /></Form.Item><Tag color="red" style={{ width: '100%', textAlign: 'center' }}>Critical Alert - RED</Tag></Col>
            <Col span={8}><Form.Item name="urgentWeeks" label="Weeks Left"><InputNumber min={0} max={52} style={{ width: '100%' }} /></Form.Item><Tag color="orange" style={{ width: '100%', textAlign: 'center' }}>Urgent Alert - AMBER</Tag></Col>
            <Col span={8}><Form.Item name="normalWeeks" label="Weeks or More"><InputNumber min={0} max={52} style={{ width: '100%' }} /></Form.Item><Tag color="green" style={{ width: '100%', textAlign: 'center' }}>Normal Alert - GREEN</Tag></Col>
          </Row>
          {hasPermission("settings.systemSettings:update_inventory_settings") && (<Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
            Save Inventory Alerts
          </Button>)}

        </Card>
      </Form>
    </div>
  );
};

export default SystemSettings;

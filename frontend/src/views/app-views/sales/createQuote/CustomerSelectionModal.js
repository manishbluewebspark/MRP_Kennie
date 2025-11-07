import React, { useState } from 'react';
import {
  Card,
  Input,
  Button,
  Avatar,
  List,
  Typography,
  Space,
  Divider,
  Modal
} from 'antd';
import { SearchOutlined, UserOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Search } = Input;

const CustomerSelectionModal = ({ visible, onClose, onCustomerSelect, customers = [] }) => {
  const [searchText, setSearchText] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer =>
    customer.companyName.toLowerCase().includes(searchText.toLowerCase()) ||
    customer.contactPerson.toLowerCase().includes(searchText.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    if (onCustomerSelect) {
      onCustomerSelect(customer);
    }
    onClose(); // Close modal after selection
  };

  const handleCancel = () => {
    setSearchText('');
    setSelectedCustomer(null);
    onClose();
  };

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={800}
      style={{ top: 20 }}
      bodyStyle={{ padding: 0 }}
    >
      <div style={{ padding: '24px' }}>
        {/* Header Section */}
        <div style={{ marginBottom: 32 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            Select Customer for Quote
          </Title>
          <Text type="secondary" style={{ fontSize: '16px' }}>
            Choose a customer to create a quote for.
          </Text>
        </div>

        {/* Search and Filter Section */}
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input
            placeholder="Search customer..."
            prefix={<SearchOutlined />}
            size="large"
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </Space>

        <Divider />

        {/* Customers List */}
        <List
          dataSource={filteredCustomers}
          renderItem={(customer) => (
            <List.Item
              style={{
                padding: '16px 0',
                borderBottom: '1px solid #f0f0f0'
              }}
              actions={[
                <Button
                  type="primary"
                  onClick={() => handleSelectCustomer(customer)}
                  style={{ borderRadius: 6 }}
                >
                  Select
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    size={40}
                    icon={<UserOutlined />}
                    style={{
                      backgroundColor: '#1890ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  />
                }
                title={
                  <Text strong style={{ fontSize: '16px' }}>
                    {customer.companyName}
                  </Text>
                }
                description={
                  <Space>
                    <Text type="secondary">{customer.contactPerson}</Text>
                    <Text type="secondary">•</Text>
                    <Text type="secondary">{customer.email}</Text>
                  </Space>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: 'No customers found' }}
        />
      </div>
    </Modal>
  );
};

export default CustomerSelectionModal;
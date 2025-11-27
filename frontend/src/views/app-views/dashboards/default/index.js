import React, { useEffect, useState } from "react";
import { Row, Col, Button, Avatar, Dropdown, Table, Menu, Tag } from 'antd';
import StatisticWidget from 'components/shared-components/StatisticWidget';
import ChartWidget from 'components/shared-components/ChartWidget';
import AvatarStatus from 'components/shared-components/AvatarStatus';
import GoalWidget from 'components/shared-components/GoalWidget';
import Card from 'components/shared-components/Card';
import Flex from 'components/shared-components/Flex';
import { 
  VisitorChartData, 
  AnnualStatisticData, 
  ActiveMembersData, 
  NewMembersData, 
  RecentTransactionData 
} from './DefaultDashboardData';
import ApexChart from 'react-apexcharts';
import { apexLineChartDefaultOption, COLOR_2 } from 'constants/ChartConstant';
import { SPACER } from 'constants/ThemeConstant'
import { 
  UserAddOutlined, 
  FileExcelOutlined, 
  PrinterOutlined, 
  PlusOutlined, 
  EllipsisOutlined, 
  StopOutlined, 
  ReloadOutlined 
} from '@ant-design/icons';
import utils from 'utils';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCurrentUser } from "store/slices/authSlice";

const MembersChart = props => (
  <ApexChart {...props}/>
)

const memberChartOption = {
  ...apexLineChartDefaultOption,
  ...{
    chart: {
      sparkline: {
        enabled: true,
      }
    },
    colors: [COLOR_2],
  }
}

const latestTransactionOption = [
  {
    key: 'Refresh',
    label: (
      <Flex alignItems="center" gap={SPACER[2]}>
        <ReloadOutlined />
        <span className="ml-2">Refresh</span>
      </Flex>
    ),
  },
  {
    key: 'Print',
    label: (
      <Flex alignItems="center" gap={SPACER[2]}>
        <PrinterOutlined />
        <span className="ml-2">Print</span>
      </Flex>
    ),
  },
  {
    key: 'Export',
    label: (
      <Flex alignItems="center" gap={SPACER[2]}>
        <FileExcelOutlined />
        <span className="ml-2">Export</span>
      </Flex>
    ),
  },
]

const newJoinMemberOptions = [
  {
    key: 'Add all',
    label: (
      <Flex alignItems="center" gap={SPACER[2]}>
        <PlusOutlined />
        <span className="ml-2">Add all</span>
      </Flex>
    ),
  },
  {
    key: 'Disable all',
    label: (
      <Flex alignItems="center" gap={SPACER[2]}>
        <StopOutlined />
        <span className="ml-2">Disable all</span>
      </Flex>
    ),
  },
]

const CardDropdown = ({items}) => {

  return (
    <Dropdown menu={{items}} trigger={['click']} placement="bottomRight">
      <a href="/#" className="text-gray font-size-lg" onClick={e => e.preventDefault()}>
        <EllipsisOutlined />
      </a>
    </Dropdown>
  )
}

const tableColumns = [
  {
    title: 'Customer',
    dataIndex: 'name',
    key: 'name',
    render: (text, record) => (
      <div className="d-flex align-items-center">
        <Avatar size={30} className="font-size-sm" style={{backgroundColor: record.avatarColor}}>
          {utils.getNameInitial(text)}
        </Avatar>
        <span className="ml-2">{text}</span>
      </div>
    ),
  },
  {
    title: 'Date',
    dataIndex: 'date',
    key: 'date',
  },
  {
    title: 'Amount',
    dataIndex: 'amount',
    key: 'amount',
  },
  {
    title: () => <div className="text-right">Status</div>,
    key: 'status',
    render: (_, record) => (
      <div className="text-right">
        <Tag className="mr-0" color={record.status === 'Approved' ? 'cyan' : record.status === 'Pending' ? 'blue' : 'volcano'}>{record.status}</Tag>
      </div>
    ),
  },
];

export const DefaultDashboard = () => {
  const [visitorChartData] = useState(VisitorChartData);
  const [annualStatisticData] = useState(AnnualStatisticData);
  const [activeMembersData] = useState(ActiveMembersData);
  const [newMembersData] = useState(NewMembersData)
  const [recentTransactionData] = useState(RecentTransactionData)
  const { direction } = useSelector(state => state.theme)

   const dispatch = useDispatch();
	const { user, loading, token } = useSelector((state) => state.auth);

	useEffect(() => {
		if (token && !user) {
			dispatch(fetchCurrentUser());
		}
	}, [dispatch, token]);

  return (
    <>  
      <Row gutter={16}>
        <Col xs={24} sm={24} md={24} lg={18}>
          <Row gutter={16}>
            {
              annualStatisticData.map((elm, i) => (
                <Col xs={24} sm={24} md={24} lg={24} xl={8} key={i}>
                  <StatisticWidget 
                    title={elm.title} 
                    value={elm.value}
                    status={elm.status}
                    subtitle={elm.subtitle}
                  />
                </Col>
              ))
            }
          </Row>
          <Row gutter={16}>
            <Col span={24}>
                <ChartWidget 
                  title="Unique Visitors" 
                  series={visitorChartData.series} 
                  xAxis={visitorChartData.categories} 
                  height={'400px'}
                  direction={direction}
                />
            </Col>
          </Row>
        </Col>
        <Col xs={24} sm={24} md={24} lg={6}>
          <GoalWidget 
            title="Monthly Target" 
            value={87}
            subtitle="You need abit more effort to hit monthly target"
            extra={<Button type="primary">Learn More</Button>}
          />
          <StatisticWidget 
            title={
              <MembersChart 
                options={memberChartOption}
                series={activeMembersData}
                height={145}
              />
            }
            value='17,329'
            status={3.7}
            subtitle="Active members"
          />
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} sm={24} md={24} lg={7}>
          <Card title="New Join Member" extra={<CardDropdown items={newJoinMemberOptions} />}>
            <div className="mt-3">
              {
                newMembersData.map((elm, i) => (
                  <div key={i} className={`d-flex align-items-center justify-content-between mb-4`}>
                    <AvatarStatus id={i} src={elm.img} name={elm.name} subTitle={elm.title} />
                    <div>
                      <Button icon={<UserAddOutlined />} type="default" size="small">Add</Button>
                    </div>
                  </div>
                ))
              }
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={24} md={24} lg={17}>
          <Card title="Latest Transactions" extra={<CardDropdown items={latestTransactionOption} />}>
            <Table 
              className="no-border-last" 
              columns={tableColumns} 
              dataSource={recentTransactionData} 
              rowKey='id' 
              pagination={false}
            />
          </Card>
        </Col>
      </Row>
    </>
  )
}


export default DefaultDashboard;


// import React, { useState, useEffect } from 'react';
// import { Card, Form, Input, InputNumber, Button, message, Alert, Divider, Typography, Steps, Modal } from 'antd';
// import { PhoneOutlined, UserOutlined, DollarOutlined, IdcardOutlined, KeyOutlined, LockOutlined } from '@ant-design/icons';

// const { Title, Text } = Typography;
// const { Step } = Steps;

// export const DefaultDashboard = () => {
//   const [form] = Form.useForm();
//   const [loading, setLoading] = useState(false);
//   const [authLoading, setAuthLoading] = useState(false);
//   const [paymentUrl, setPaymentUrl] = useState('');
//   const [orderDetails, setOrderDetails] = useState(null);
//   const [accessToken, setAccessToken] = useState(null);
//   const [currentStep, setCurrentStep] = useState(0);
//   const [showAuthModal, setShowAuthModal] = useState(false);

//   // Check if token exists on component mount
//   useEffect(() => {
//     const savedToken = localStorage.getItem('phonepe_access_token');
//     if (savedToken) {
//       setAccessToken(savedToken);
//       setCurrentStep(1);
//     }
//   }, []);

//   // Step 1: Authentication
//   const handleAuth = async () => {
//     setAuthLoading(true);
//     try {
//       const authResponse = await fetch('http://localhost:5001/api/auth', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           clientId: 'SU2511251950208355481486',
//           clientSecret: 'e7553bf6-8b12-4491-a9de-58f82248284f'
//         })
//       });

//       const authResult = await authResponse.json();
     
//       if (authResult.data.access_token) {
//         const token = authResult.data.access_token;
//         setAccessToken(token);
//         localStorage.setItem('phonepe_access_token', token);
//         setCurrentStep(1);
//         message.success('Authentication successful!');
//         setShowAuthModal(false);
//       } else {
//         message.error(`Authentication failed: ${authResult.message}`);
//       }
//     } catch (error) {
//       console.error('Auth error:', error);
//       message.error('Authentication failed. Please try again.');
//     } finally {
//       setAuthLoading(false);
//     }
//   };

//   // Step 2: Create Payment
//   const onFinish = async (values) => {
//     if (!accessToken) {
//       message.error('Please authenticate first!');
//       setShowAuthModal(true);
//       return;
//     }

//     setLoading(true);
//     try {
//       // Generate unique order ID
//       const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
//       const paymentData = {
//         tokk:accessToken,
//         merchantOrderId: orderId,
//         amount: values.amount * 100, // Convert to paise
//         currency: "INR",
//         expireAfter: 1800, // 30 minutes
//         metaInfo: {
//           udf1: `Customer: ${values.customerName}`,
//           udf2: `Email: ${values.customerEmail}`,
//           udf3: `Mobile: ${values.customerPhone}`,
//           udf4: `Product: ${values.productName}`,
//           udf5: `Notes: ${values.notes || 'No notes'}`,
//           udf6: "Payment via PhonePe",
//           udf11: "WEB",
//           udf12: "ONLINE"
//         },
//         paymentFlow: {
//           type: "PG_CHECKOUT",
//           message: `Payment for ${values.productName}`,
//           merchantUrls: {
//             redirectUrl: `${window.location.origin}/payment-success`,
//             callbackUrl: `${window.location.origin}/api/webhook`
//           },
//           paymentMethods: ["UPI", "CARD", "NETBANKING", "WALLET"]
//         },
//         customer: {
//           id: `CUST_${values.customerPhone}`,
//           email: values.customerEmail,
//           phone: values.customerPhone,
//           name: values.customerName
//         }
//       };

//       console.log('Sending payment data with token:', accessToken);

//       // Call payment API with authentication token
//       const response = await fetch('http://localhost:5001/api/create-payment', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${accessToken}`
//         },
//         body: JSON.stringify(paymentData)
//       });

//       const result = await response.json();
//       console.log('------result',result)
//       if (result.success) {
//         setOrderDetails({
//           orderId: orderId,
//           amount: values.amount,
//           customerName: values.customerName,
//           productName: values.productName,
//           transactionId: result.data.transactionId
//         });
        
//         if (result.data.redirectUrl) {
//           setPaymentUrl(result.data.redirectUrl);
//           setCurrentStep(2);
//           message.success('Payment initiated successfully!');
//         } else {
//           message.warning('Payment initiated but no redirect URL received');
//         }
//       } else {
//         if (result.code === 'UNAUTHORIZED' || result.code === 'INVALID_TOKEN') {
//           message.error('Session expired. Please re-authenticate.');
//           setAccessToken(null);
//           localStorage.removeItem('phonepe_access_token');
//           setCurrentStep(0);
//           setShowAuthModal(true);
//         } else {
//           message.error(`Payment failed: ${result.message}`);
//         }
//       }
//     } catch (error) {
//       console.error('Payment error:', error);
//       message.error('Payment initiation failed. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleProceedToPay = () => {
//     if (paymentUrl) {
//       window.open(paymentUrl, '_blank');
//     }
//   };

//   const resetForm = () => {
//     form.resetFields();
//     setPaymentUrl('');
//     setOrderDetails(null);
//     setCurrentStep(1);
//   };

//   const handleLogout = () => {
//     setAccessToken(null);
//     localStorage.removeItem('phonepe_access_token');
//     setCurrentStep(0);
//     resetForm();
//     message.success('Logged out successfully');
//   };

//   return (
//     <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
//         <div>
//           <Title level={2}>📱 PhonePe Payment Gateway</Title>
//           <Text type="secondary">Secure and fast payments via PhonePe</Text>
//         </div>
        
//         {accessToken && (
//           <Button onClick={handleLogout} icon={<LockOutlined />}>
//             Logout
//           </Button>
//         )}
//       </div>

//       {/* Steps Indicator */}
//       <Card style={{ marginBottom: '24px' }}>
//         <Steps current={currentStep} size="small">
//           <Step title="Authentication" description="Get access token" />
//           <Step title="Payment Details" description="Enter order information" />
//           <Step title="Payment" description="Complete transaction" />
//         </Steps>
//       </Card>

//       {/* Authentication Modal */}
//       <Modal
//         title="🔐 PhonePe Authentication Required"
//         open={showAuthModal}
//         onOk={handleAuth}
//         onCancel={() => setShowAuthModal(false)}
//         confirmLoading={authLoading}
//         okText="Authenticate"
//         cancelText="Cancel"
//       >
//         <Alert
//           message="Authentication Required"
//           description="You need to authenticate with PhonePe before processing payments."
//           type="warning"
//           showIcon
//           style={{ marginBottom: '16px' }}
//         />
//         <Text>
//           Click "Authenticate" to get access token from PhonePe servers. 
//           This token will be used to securely process your payments.
//         </Text>
//       </Modal>

//       <Divider />
      
//       <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
//         {/* Payment Form - Only show when authenticated */}
//         {currentStep >= 1 && (
//           <Card 
//             title="Payment Details" 
//             style={{ flex: 1, minWidth: '300px' }}
//             loading={loading}
//             extra={
//               accessToken && (
//                 <Text type="success" style={{ fontSize: '12px' }}>
//                   ✅ Authenticated
//                 </Text>
//               )
//             }
//           >
//             <Form
//               form={form}
//               name="payment-form"
//               onFinish={onFinish}
//               layout="vertical"
//               autoComplete="off"
//             >
//               {/* Customer Information */}
//               <Form.Item
//                 label="Customer Name"
//                 name="customerName"
//                 rules={[{ required: true, message: 'Please enter customer name!' }]}
//               >
//                 <Input 
//                   prefix={<UserOutlined />} 
//                   placeholder="Enter customer full name" 
//                   size="large"
//                 />
//               </Form.Item>

//               <Form.Item
//                 label="Email Address"
//                 name="customerEmail"
//                 rules={[
//                   { required: true, message: 'Please enter email!' },
//                   { type: 'email', message: 'Please enter valid email!' }
//                 ]}
//               >
//                 <Input 
//                   prefix={<UserOutlined />} 
//                   placeholder="customer@example.com" 
//                   size="large"
//                 />
//               </Form.Item>

//               <Form.Item
//                 label="Phone Number"
//                 name="customerPhone"
//                 rules={[
//                   { required: true, message: 'Please enter phone number!' },
//                   { pattern: /^[6-9]\d{9}$/, message: 'Please enter valid 10-digit phone number!' }
//                 ]}
//               >
//                 <Input 
//                   prefix={<PhoneOutlined />} 
//                   placeholder="9876543210" 
//                   size="large"
//                   maxLength={10}
//                 />
//               </Form.Item>

//               {/* Product Information */}
//               <Form.Item
//                 label="Product/Service Name"
//                 name="productName"
//                 rules={[{ required: true, message: 'Please enter product name!' }]}
//               >
//                 <Input 
//                   prefix={<IdcardOutlined />} 
//                   placeholder="e.g., Premium Subscription" 
//                   size="large"
//                 />
//               </Form.Item>

//               <Form.Item
//                 label="Amount (₹)"
//                 name="amount"
//                 rules={[
//                   { required: true, message: 'Please enter amount!' },
//                   { type: 'number', min: 1, message: 'Amount must be at least ₹1!' }
//                 ]}
//               >
//                 <InputNumber
//                   prefix={<DollarOutlined />}
//                   placeholder="Enter amount"
//                   size="large"
//                   style={{ width: '100%' }}
//                   min={1}
//                   max={100000}
//                   formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
//                   parser={value => value.replace(/₹\s?|(,*)/g, '')}
//                 />
//               </Form.Item>

//               <Form.Item
//                 label="Additional Notes (Optional)"
//                 name="notes"
//               >
//                 <Input.TextArea 
//                   placeholder="Any additional information about this payment..."
//                   rows={3}
//                 />
//               </Form.Item>

//               <Form.Item>
//                 <Button 
//                   type="primary" 
//                   htmlType="submit" 
//                   size="large" 
//                   loading={loading}
//                   style={{ width: '100%', height: '45px' }}
//                   icon={!accessToken ? <KeyOutlined /> : null}
//                 >
//                   {loading ? 'Processing...' : 
//                    !accessToken ? 'Authenticate & Process Payment' : 'Generate Payment Link'}
//                 </Button>
//               </Form.Item>
//             </Form>
//           </Card>
//         )}

//         {/* Right Side Panel */}
//         <div style={{ flex: 1, minWidth: '300px' }}>
//           {/* Authentication Required Message */}
//           {!accessToken && (
//             <Card title="🔐 Authentication Required">
//               <div style={{ textAlign: 'center', padding: '20px' }}>
//                 <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔑</div>
//                 <Title level={4}>Secure Authentication</Title>
//                 <Text type="secondary">
//                   Please authenticate with PhonePe to access payment services.
//                   This ensures secure and authorized transactions.
//                 </Text>
                
//                 <Divider />
                
//                 <Button 
//                   type="primary" 
//                   size="large" 
//                   onClick={() => setShowAuthModal(true)}
//                   icon={<KeyOutlined />}
//                   style={{ width: '100%', marginBottom: '16px' }}
//                 >
//                   Start Authentication
//                 </Button>
                
//                 <div style={{ textAlign: 'left', fontSize: '12px' }}>
//                   <Text strong>Security Features:</Text><br/>
//                   • OAuth 2.0 Authentication<br/>
//                   • Token-based Security<br/>
//                   • Encrypted Communication<br/>
//                   • Session Management
//                 </div>
//               </div>
//             </Card>
//           )}

//           {/* Order Summary & Payment Actions */}
//           {orderDetails && (
//             <Card title="Order Summary" style={{ marginBottom: '16px' }}>
//               <div style={{ lineHeight: '2' }}>
//                 <Text strong>Order ID:</Text> {orderDetails.orderId}<br/>
//                 <Text strong>Customer:</Text> {orderDetails.customerName}<br/>
//                 <Text strong>Product:</Text> {orderDetails.productName}<br/>
//                 <Text strong>Amount:</Text> ₹{orderDetails.amount}<br/>
//                 <Text strong>Status:</Text> 
//                 <Text type="success" style={{ marginLeft: '8px' }}>Pending Payment</Text>
//               </div>
//             </Card>
//           )}

//           {paymentUrl && (
//             <Card title="Payment Actions">
//               <Alert
//                 message="Payment Link Generated Successfully!"
//                 description="Click the button below to proceed with PhonePe payment."
//                 type="success"
//                 showIcon
//                 style={{ marginBottom: '16px' }}
//               />
              
//               <Button 
//                 type="primary" 
//                 size="large" 
//                 onClick={handleProceedToPay}
//                 style={{ width: '100%', marginBottom: '8px', height: '45px' }}
//                 icon={<img src="https://phonepe.com/favicon.ico" width="20" height="20" style={{ marginRight: '8px' }} alt="PhonePe" />}
//               >
//                 Proceed to PhonePe Payment
//               </Button>
              
//               <Button 
//                 onClick={resetForm}
//                 style={{ width: '100%' }}
//               >
//                 Create New Payment
//               </Button>

//               <Divider />

//               <Text type="secondary" style={{ fontSize: '12px' }}>
//                 🔒 Secure payment processed by PhonePe. You will be redirected to PhonePe's secure payment page.
//               </Text>
//             </Card>
//           )}
//         </div>
//       </div>

//       {/* Test Card Information */}
//       <Card title="💳 Test Information" style={{ marginTop: '24px' }}>
//         <Alert
//           message="For Testing Purpose Only"
//           description={
//             <div>
//               <Text strong>Authentication:</Text><br/>
//               • Use test client ID and secret<br/>
//               • Token valid for 1 hour<br/><br/>
              
//               <Text strong>Test Cards:</Text><br/>
//               • Success: 4111 1111 1111 1111 (Any future date, any CVV)<br/>
//               • Failure: 5105 1051 0510 5100<br/><br/>
              
//               <Text strong>Test UPI:</Text><br/>
//               • Use any UPI ID for testing<br/>
//               • Amount: Use ₹1 for testing
//             </div>
//           }
//           type="info"
//           showIcon
//         />
//       </Card>
//     </div>
//   );
// };

// export default DefaultDashboard;



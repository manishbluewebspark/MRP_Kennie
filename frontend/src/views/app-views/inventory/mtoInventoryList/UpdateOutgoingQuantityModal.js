// import React, { useState, useEffect } from 'react';
// import { Modal, Form, Input, InputNumber, Card, Typography, Row, Col, Tag, message } from 'antd';
// import { InfoCircleOutlined } from '@ant-design/icons';

// const { Text } = Typography;
// const { TextArea } = Input;

// const UpdateOutgoingQuantityModal = ({ 
//   visible, 
//   onCancel, 
//   onUpdate,
//   inventoryItem 
// }) => {
//   const [form] = Form.useForm();
//   const [loading, setLoading] = useState(false);
//   const [adjustmentQuantity, setAdjustmentQuantity] = useState(0);

//   // Reset form when modal opens/closes or inventory item changes
//   useEffect(() => {
//     if (visible && inventoryItem) {
//       form.resetFields();
//       setAdjustmentQuantity(0);
//     }
//   }, [visible, inventoryItem, form]);

//   const handleUpdate = async () => {
//     try {
//       const values = await form.validateFields();
      
//       setLoading(true);
      
//       // Prepare update data - support both increase and decrease
//       const updateData = {
//         inventoryId: inventoryItem?._id,
//         mpn: inventoryItem?.MPN,
//         currentBalance: inventoryItem?.balanceQuantity || 0,
//         adjustmentQuantity: values.adjustmentQuantity,
//         newBalance: (inventoryItem?.balanceQuantity || 0) + values.adjustmentQuantity, // Add for both positive/negative
//         reason: values.reason,
//         adjustmentType: values.adjustmentQuantity > 0 ? 'INCREASE' : 'DECREASE',
//         updatedAt: new Date()
//       };

//       console.log('Inventory Adjustment Data:', updateData);

//       // Call the update function
//       if (onUpdate) {
//         await onUpdate(updateData);
//       }

//       message.success('Inventory adjusted successfully!');
//       handleCancel();
      
//     } catch (error) {
//       console.error('Form validation failed:', error);
//       if (error.errorFields) {
//         message.error('Please fill all required fields correctly.');
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleCancel = () => {
//     form.resetFields();
//     setAdjustmentQuantity(0);
//     onCancel();
//   };

//   const calculateNewBalance = () => {
//     const currentBalance = inventoryItem?.balanceQuantity || 0;
//     return currentBalance + adjustmentQuantity;
//   };

//   const getBalanceColor = (balance) => {
//     if (balance < 0) return 'red';
//     if (balance === 0) return 'orange';
//     return 'green';
//   };

//   const getAdjustmentColor = () => {
//     if (adjustmentQuantity > 0) return 'green';
//     if (adjustmentQuantity < 0) return 'red';
//     return 'default';
//   };

//   // Don't return null if inventoryItem is null - show a different state
//   if (!inventoryItem && visible) {
//     return (
//       <Modal
//         title="Adjust Inventory Balance"
//         open={visible}
//         onCancel={handleCancel}
//         footer={null}
//         width={600}
//       >
//         <div style={{ textAlign: 'center', padding: '40px 0' }}>
//           <Text type="secondary">No inventory item selected</Text>
//         </div>
//       </Modal>
//     );
//   }

//   return (
//     <Modal
//       title="Adjust Inventory Balance"
//       open={visible}
//       onCancel={handleCancel}
//       footer={null}
//       width={600}
//       style={{ top: 20 }}
//       destroyOnClose
//     >
//       <Form
//         form={form}
//         layout="vertical"
//         requiredMark="optional"
//       >
//         {/* Information Card */}
//         <Card
//           size="small"
//           style={{
//             marginBottom: 24,
//             border: '1px solid #d9d9d9',
//             borderRadius: 8,
//             background: '#fafafa'
//           }}
//           bodyStyle={{ padding: '16px' }}
//         >
//           <Text type="secondary">
//             Manually adjust the inventory balance for this item. This action will be logged for audit purposes.
//           </Text>
//         </Card>

//         {/* Item Details */}
//         <Card
//           size="small"
//           style={{
//             marginBottom: 24,
//             border: '1px solid #e8e8e8',
//             borderRadius: 6
//           }}
//           bodyStyle={{ padding: '16px' }}
//         >
//           <Row gutter={[16, 8]}>
//             <Col span={12}>
//               <div>
//                 <Text strong>MPN:</Text>
//                 <br />
//                 <Text style={{ fontSize: '14px' }}>
//                   {inventoryItem?.MPN || 'N/A'}
//                 </Text>
//               </div>
//             </Col>
//             <Col span={12}>
//               <div>
//                 <Text strong>Description:</Text>
//                 <br />
//                 <Text style={{ fontSize: '14px' }}>
//                   {inventoryItem?.Description || 'N/A'}
//                 </Text>
//               </div>
//             </Col>
//             <Col span={24}>
//               <div>
//                 <Text strong>Current Balance:</Text>
//                 <br />
//                 <Tag 
//                   color={getBalanceColor(inventoryItem?.balanceQuantity || 0)}
//                   style={{ 
//                     fontSize: '14px', 
//                     padding: '4px 8px',
//                     marginTop: '4px'
//                   }}
//                 >
//                   {inventoryItem?.balanceQuantity || 0} {inventoryItem?.UOM || 'PCS'}
//                 </Tag>
//               </div>
//             </Col>
//           </Row>
//         </Card>

//         {/* Adjustment Quantity */}
//         <Form.Item
//           name="adjustmentQuantity"
//           label={
//             <Text strong>
//               Adjustment Quantity 
//               <Text type="secondary" style={{ fontSize: '12px', marginLeft: 8 }}>
//                 (Use positive numbers to increase stock, negative to decrease)
//               </Text>
//             </Text>
//           }
//           rules={[
//             { 
//               required: true, 
//               message: 'Please enter adjustment quantity' 
//             },
//             {
//               validator: (_, value) => {
//                 if (value === 0 || value === null || value === undefined) {
//                   return Promise.reject(new Error('Adjustment quantity cannot be zero or empty'));
//                 }
                
//                 const currentBalance = inventoryItem?.balanceQuantity || 0;
//                 const newBalance = currentBalance + value;
                
//                 if (newBalance < 0) {
//                   return Promise.reject(new Error(`Cannot reduce below zero. Maximum decrease: ${currentBalance}`));
//                 }
                
//                 return Promise.resolve();
//               }
//             }
//           ]}
//         >
//           <InputNumber
//             style={{ width: '100%' }}
//             size="large"
//             placeholder="0"
//             min={-(inventoryItem?.balanceQuantity || 0)} // Allow decrease up to current balance
//             max={999999}
//             onChange={(value) => setAdjustmentQuantity(value || 0)}
//             addonAfter={inventoryItem?.UOM || 'PCS'}
//             formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
//             parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
//           />
//         </Form.Item>

//         {/* New Balance Preview */}
//         {adjustmentQuantity !== 0 && (
//           <div style={{ 
//             marginBottom: 16, 
//             padding: '12px 16px',
//             border: '1px solid #d9d9d9',
//             borderRadius: 6,
//             background: adjustmentQuantity > 0 ? '#f6ffed' : '#fff2e8'
//           }}>
//             <Row align="middle">
//               <Col flex="auto">
//                 <Text strong>New Balance after adjustment:</Text>
//               </Col>
//               <Col>
//                 <Tag 
//                   color={getBalanceColor(calculateNewBalance())}
//                   style={{ 
//                     fontSize: '14px', 
//                     padding: '4px 12px',
//                     fontWeight: 'bold'
//                   }}
//                 >
//                   {calculateNewBalance()} {inventoryItem?.UOM || 'PCS'}
//                 </Tag>
//               </Col>
//             </Row>
//             <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 4 }}>
//               Current {inventoryItem?.balanceQuantity || 0} {adjustmentQuantity > 0 ? '+' : ''}{adjustmentQuantity} = {calculateNewBalance()}
//             </Text>
//             <Text 
//               style={{ 
//                 fontSize: '12px', 
//                 display: 'block', 
//                 marginTop: 2,
//                 color: adjustmentQuantity > 0 ? '#52c41a' : '#fa541c',
//                 fontWeight: 500
//               }}
//             >
//               {adjustmentQuantity > 0 ? '▲ Increase' : '▼ Decrease'} by {Math.abs(adjustmentQuantity)} units
//             </Text>
//           </div>
//         )}

//         {/* Reason for Adjustment */}
//         <Form.Item
//           name="reason"
//           label={
//             <Text strong>
//               Reason for Adjustment
//               <Text type="secondary" style={{ fontSize: '12px', marginLeft: 8 }}>
//                 (This reason will be recorded for audit purposes)
//               </Text>
//             </Text>
//           }
//           rules={[
//             { 
//               required: true, 
//               message: 'Please provide a reason for adjustment' 
//             },
//             {
//               min: 10,
//               message: 'Reason should be at least 10 characters long'
//             }
//           ]}
//         >
//           <TextArea
//             rows={4}
//             placeholder="Explain why this adjustment is being made..."
//             showCount
//             maxLength={500}
//             style={{ resize: 'vertical' }}
//           />
//         </Form.Item>

//         <div style={{ 
//           marginTop: 8,
//           padding: '8px 12px',
//           background: '#f0f0f0',
//           borderRadius: 4,
//           fontSize: '12px',
//           color: '#666'
//         }}>
//           <InfoCircleOutlined style={{ marginRight: 4 }} />
//           This reason will be recorded for audit purposes
//         </div>

//         {/* Footer Buttons */}
//         <div style={{ 
//           marginTop: 24, 
//           paddingTop: 16, 
//           borderTop: '1px solid #d9d9d9',
//           textAlign: 'right' 
//         }}>
//           <button
//             onClick={handleCancel}
//             style={{
//               marginRight: 8,
//               padding: '8px 16px',
//               border: '1px solid #d9d9d9',
//               borderRadius: 6,
//               background: 'white',
//               color: '#333',
//               cursor: 'pointer',
//               fontSize: '14px'
//             }}
//           >
//             Cancel
//           </button>
//           <button
//             onClick={handleUpdate}
//             disabled={loading}
//             style={{
//               padding: '8px 24px',
//               border: 'none',
//               borderRadius: 6,
//               background: '#1890ff',
//               color: 'white',
//               cursor: 'pointer',
//               fontSize: '14px',
//               fontWeight: 500
//             }}
//           >
//             {loading ? 'Adjusting...' : 'Adjust Inventory'}
//           </button>
//         </div>
//       </Form>
//     </Modal>
//   );
// };

// export default UpdateOutgoingQuantityModal;

import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Card,
  Typography,
  Row,
  Col,
  Tag,
  message,
  Button,
} from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";

const { Text } = Typography;
const { TextArea } = Input;

const UpdateOutgoingQuantityModal = ({ visible, onCancel, onUpdate, inventoryItem }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(0);

  const currentBalance = useMemo(() => Number(inventoryItem?.balanceQuantity || 0), [inventoryItem]);

  // ✅ UOM: object {code} OR string OR fallback
  const uomCode = useMemo(() => {
    const u = inventoryItem?.UOM;
    if (!u) return "PCS";
    if (typeof u === "string") return u;
    if (typeof u === "object") return u.code || u.name || "PCS";
    return "PCS";
  }, [inventoryItem]);

  useEffect(() => {
    if (visible && inventoryItem) {
      form.resetFields();
      setAdjustmentQuantity(0);
    }
  }, [visible, inventoryItem, form]);

  const calculateNewBalance = () => currentBalance + Number(adjustmentQuantity || 0);

  const getBalanceColor = (balance) => {
    if (balance < 0) return "red";
    if (balance === 0) return "orange";
    return "green";
  };

  const handleCancel = () => {
    form.resetFields();
    setAdjustmentQuantity(0);
    onCancel?.();
  };

  const handleUpdate = async () => {
    try {
      const values = await form.validateFields();

      const adj = Number(values.adjustmentQuantity || 0);
      const newBal = currentBalance + adj;

      setLoading(true);

      const updateData = {
        inventoryId: inventoryItem?._id,
        mpnId: inventoryItem?.mpnId || inventoryItem?.mpnId?._id,
        mpn: inventoryItem?.MPN,
        currentBalance,
        adjustmentQuantity: adj,
        newBalance: newBal,
        reason: values.reason,
        adjustmentType: adj > 0 ? "INCREASE" : "DECREASE",
        updatedAt: new Date(),
      };

      if (onUpdate) await onUpdate(updateData);

      message.success("Inventory adjusted successfully!");
      handleCancel();
    } catch (error) {
      if (error?.errorFields) message.error("Please fill all required fields correctly.");
      else message.error("Failed to adjust inventory");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!inventoryItem && visible) {
    return (
      <Modal title="Adjust Inventory Balance" open={visible} onCancel={handleCancel} footer={null} width={600}>
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Text type="secondary">No inventory item selected</Text>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="Adjust Inventory Balance"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
      style={{ top: 20 }}
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark="optional">
        <Card
          size="small"
          style={{ marginBottom: 24, border: "1px solid #d9d9d9", borderRadius: 8, background: "#fafafa" }}
          bodyStyle={{ padding: 16 }}
        >
          <Text type="secondary">
            Manually adjust the inventory balance for this item. This action will be logged for audit purposes.
          </Text>
        </Card>

        <Card size="small" style={{ marginBottom: 24, border: "1px solid #e8e8e8", borderRadius: 6 }} bodyStyle={{ padding: 16 }}>
          <Row gutter={[16, 8]}>
            <Col span={12}>
              <Text strong>MPN:</Text>
              <br />
              <Text style={{ fontSize: 14 }}>{inventoryItem?.MPN || "N/A"}</Text>
            </Col>
            <Col span={12}>
              <Text strong>Description:</Text>
              <br />
              <Text style={{ fontSize: 14 }}>{inventoryItem?.Description || "N/A"}</Text>
            </Col>
            <Col span={24}>
              <Text strong>Current Balance:</Text>
              <br />
              <Tag
                color={getBalanceColor(currentBalance)}
                style={{ fontSize: 14, padding: "4px 8px", marginTop: 4 }}
              >
                {currentBalance} {uomCode}
              </Tag>
            </Col>
          </Row>
        </Card>

        <Form.Item
          name="adjustmentQuantity"
          label={
            <Text strong>
              Adjustment Quantity{" "}
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                (positive = increase, negative = decrease)
              </Text>
            </Text>
          }
          rules={[
            { required: true, message: "Please enter adjustment quantity" },
            {
              validator: (_, value) => {
                const v = Number(value);
                if (!value && value !== 0) return Promise.reject(new Error("Adjustment quantity is required"));
                if (v === 0) return Promise.reject(new Error("Adjustment quantity cannot be zero"));
                if (currentBalance + v < 0) {
                  return Promise.reject(new Error(`Cannot reduce below zero. Maximum decrease: ${currentBalance}`));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <InputNumber
            style={{ width: "100%" }}
            size="large"
            placeholder="0"
            min={-currentBalance}
            max={999999}
            onChange={(value) => setAdjustmentQuantity(Number(value || 0))}
            addonAfter={uomCode}
          />
        </Form.Item>

        {adjustmentQuantity !== 0 && (
          <div
            style={{
              marginBottom: 16,
              padding: "12px 16px",
              border: "1px solid #d9d9d9",
              borderRadius: 6,
              background: adjustmentQuantity > 0 ? "#f6ffed" : "#fff2e8",
            }}
          >
            <Row align="middle">
              <Col flex="auto">
                <Text strong>New Balance after adjustment:</Text>
              </Col>
              <Col>
                <Tag
                  color={getBalanceColor(calculateNewBalance())}
                  style={{ fontSize: 14, padding: "4px 12px", fontWeight: "bold" }}
                >
                  {calculateNewBalance()} {uomCode}
                </Tag>
              </Col>
            </Row>

            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
              Current {currentBalance} {adjustmentQuantity > 0 ? "+" : ""}{adjustmentQuantity} = {calculateNewBalance()}
            </Text>
          </div>
        )}

        <Form.Item
          name="reason"
          label={
            <Text strong>
              Reason for Adjustment{" "}
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                (saved for audit)
              </Text>
            </Text>
          }
          rules={[
            { required: true, message: "Please provide a reason for adjustment" },
            { min: 10, message: "Reason should be at least 10 characters long" },
          ]}
        >
          <TextArea rows={4} placeholder="Explain why this adjustment is being made..." showCount maxLength={500} />
        </Form.Item>

        <div style={{ marginTop: 8, padding: "8px 12px", background: "#f0f0f0", borderRadius: 4, fontSize: 12, color: "#666" }}>
          <InfoCircleOutlined style={{ marginRight: 4 }} />
          This reason will be recorded for audit purposes
        </div>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #d9d9d9", textAlign: "right" }}>
          <Button onClick={handleCancel} style={{ marginRight: 8 }}>
            Cancel
          </Button>
          <Button type="primary" loading={loading} onClick={handleUpdate}>
            Adjust Inventory
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default UpdateOutgoingQuantityModal;

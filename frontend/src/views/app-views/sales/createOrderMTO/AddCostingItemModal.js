// import React, { useEffect, useState } from 'react';
// import { Modal, Form, Input, InputNumber, Select, Button, Divider, Typography, Row, Col, DatePicker, Card, message, Spin } from 'antd';
// import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
// import LibraryService from 'services/libraryService';
// import SkillLevelCostingService from 'services/SkillLevelCostingService';
// import moment from 'moment';
// import dayjs from 'dayjs';

// const { Title, Text } = Typography;
// const { Option } = Select;
// const { TextArea } = Input;

// const AddCostingItemModal = ({ visible, onClose, onAction, selectedQuoteType, drawingName, projectName, editData, costingMaterialData, uoms = [], suppliers = [],mpnList }) => {
//   const [form] = Form.useForm();
//   const [childPartOptions, setChildPartOptions] = useState([]);
//   const [skillLevelOptions, setSkillLevelOptions] = useState([]);
//   const [childPartData, setChildPartData] = useState(null);
//   const [loading, setLoading] = useState(false);


//  console.log('-----editData',editData)


//   useEffect(() => {
//     loadAllChildParts();
//   }, []);

//   useEffect(() => {
//     const loadSkillLevels = async () => {
//       try {
//         const response = await SkillLevelCostingService.getAllSkillLevelCostings();

//         // API response ko options format mein convert karo
//         const options = response.data.map((item) => ({
//           value: item._id, // ya item.level agar alag field hai
//           label: `${item?.skillLevelName} - (${item?.currencyType?.code}${item?.rate}/${item?.type.code})`, // Adjust according to your API response
//           data: item // full data store karo
//         }));

//         setSkillLevelOptions(options);
//       } catch (error) {
//         console.error('Error loading skill levels:', error);
//         message.error('Failed to load skill levels');
//         // Fallback to default options
//         setSkillLevelOptions([
//           { value: 'level1', label: 'Level 1' },
//           { value: 'level2', label: 'Level 2' },
//           { value: 'level3', label: 'Level 3' }
//         ]);
//       } finally {

//       }
//     };

//     if (visible && selectedQuoteType === 'manhour') {
//       loadSkillLevels();
//     }


//   }, [visible, selectedQuoteType]);


//   // Auto-select UOM in EDIT mode for PACKING once options are available
// useEffect(() => {
//   if (selectedQuoteType !== 'packing') return;






//     // Set the Select's value; your <Select> uses value={_id}
//     form.setFieldsValue({ uom: editData?.uom?._id });
//   form.setFieldsValue({ mpn: editData?.mpn?._id });
// }, [visible, selectedQuoteType, editData]);

//   // Auto-select Skill Level in EDIT mode once options are available
// useEffect(() => {
//   if (!visible) return;
//   if (selectedQuoteType !== 'manhour') return;
//   if (!editData?.skillLevel) return;
//   if (!skillLevelOptions || skillLevelOptions.length === 0) return;

//   // normalize id (object or string)
//   const targetId = editData.skillLevel?._id || editData.skillLevel;
//   const sl = skillLevelOptions.find(o => o.value === targetId);

//   if (sl) {
//     // 1) set the Select's value
//     form.setFieldsValue({ skillLevel: sl.value });

//     // 2) populate dependent fields (unitPrice, uom, description, salesPrice)
//     handleSkillLevelChange(sl.value, sl);
//   }
// }, [visible, selectedQuoteType, editData, skillLevelOptions, form]);

//   const handleSkillLevelChange = (value, option) => {
//       console.log('Selected skill level:', value, option);

//       if (option && option.data) {
//         const selectedSkill = option.data;

//         // Auto-fill unit price based on selected skill level
//         const unitPrice = selectedSkill.hourlyRate || selectedSkill.rate || selectedSkill.unitPrice || 0;

//         form.setFieldsValue({
//           unitPrice: unitPrice,
//           uom: selectedSkill.type._id,
//           description:selectedSkill.description
//         });

//         // Auto-calculate sales price
//         const quantity = form.getFieldValue('quantity') || 0;
//         const salesPrice = unitPrice * quantity;

//         form.setFieldsValue({
//           salesPrice: salesPrice
//         });
//       }
//     };
//   //  const handleSkillLevelChange = (value, option) => {
//   //   console.log('Selected skill level:', value, option);

//   //   if (option && option.data) {
//   //     const selectedSkill = option.data;

//   //     // Auto-fill unit price based on selected skill level
//   //     // Adjust field names according to your API response
//   //     const unitPrice = selectedSkill.hourlyRate || selectedSkill.rate || selectedSkill.unitPrice || 0;

//   //     form.setFieldsValue({
//   //       unitPrice: unitPrice,
//   //       uom:selectedSkill.type
//   //     });

//   //     // Auto-calculate sales price
//   //     const quantity = form.getFieldValue('quantity') || 0;
//   //     const extPrice = unitPrice * quantity;
//   //     const salesPrice = extPrice; // Manhour ke liye simple calculation

//   //     form.setFieldsValue({
//   //       extPrice: extPrice,
//   //       salesPrice: salesPrice
//   //     });
//   //   }
//   // };

//   const loadAllChildParts = async () => {
//     setLoading(true);
//     try {
//       const response = await LibraryService.getAllChild();
//       const options = response.data.map((item) => ({
//         value: item._id,
//         label: `${item.ChildPartNo}`,
//         data: item
//       }));
//       setChildPartOptions(options);
//     } catch (error) {
//       console.error('Error loading child parts:', error);
//       setChildPartOptions([]);
//     } finally {
//       setLoading(false);
//     }
//   };
//   // Auto-fill form when editData changes
// // Function to get the next item number
// const getNextDrawingNumber = () => {
//   console.log('---selectedQuoteType',selectedQuoteType)
//   const items = costingMaterialData?.costingItems || [];

//   // Filter only items with the same quoteType
//   const filteredItems = items.filter(
//     (d) => d.quoteType === selectedQuoteType
//   );

//   if (!filteredItems.length) return "0001";

//   const validNumbers = filteredItems
//     .map((d) => parseInt(d.itemNumber, 10))
//     .filter((n) => !isNaN(n));

//   const maxNum = validNumbers.length ? Math.max(...validNumbers) : 0;
//   return (maxNum + 1).toString().padStart(4, "0");
// };



// // useEffect to handle modal opening
// useEffect(() => {
//   if (editData) {
//     // Edit mode
//     const dataForForm = {
//       ...editData,
//       // rfqDate: editData.rfqDate ? dayjs(editData.rfqDate) : null,
//     };
//     form.setFieldsValue(dataForForm);

//     if (editData.childPart) {
//       const selectedOption = childPartOptions.find(option => option.value === editData.childPart);
//       handleChildPartChange(editData.childPart,selectedOption)

//       // if (selectedOption) setChildPartData({
//       //   mpn:selectedOption?.data?.mpn?._id
//       // });
//     }

//     // handleSkillLevelChange()
//   } else if (visible) {
//     // New item mode - only set next number when modal opens for new item
//     form.resetFields();
//     const nextNum = getNextDrawingNumber();
//     form.setFieldsValue({ itemNumber: nextNum });
//     setChildPartData(null);
//   }
// }, [editData, costingMaterialData, childPartOptions, visible]);


//   const handleChildPartChange = (value, option) => {
//     console.log('Selected:', value, option);

//     if (option && option.data) {
//       const selectedData = option.data;
//       setChildPartData(selectedData);

//       // Auto-fill form fields with the selected child part data
//       form.setFieldsValue({
//         description: selectedData.mpn?.Description || '',
//         mpn: selectedData.mpn?._id || '',
//         manufacturer: selectedData.mpn?.Manufacturer || '',
//         uom: selectedData.mpn?.UOM || '',
//         unitPrice: selectedData.mpn?.RFQUnitPrice ? parseFloat(selectedData.mpn.RFQUnitPrice) : 0,
//         moq: selectedData.mpn?.MOQ || 0,
//         supplier: selectedData.mpn?.Supplier || '',
//         rfqDate: selectedData?.RFQDate ? moment(selectedData.RFQDate) : null
//       });
//     } else {
//       setChildPartData(null);
//       // Don't clear fields in edit mode
//       if (!editData) {
//         form.setFieldsValue({
//           description: '',
//           mpn: '',
//           manufacturer: '',
//           uom: '',
//           unitPrice: 0,
//           moq: 0,
//           supplier: '',
//         });
//       }
//     }
//   };

//   const handleCancel = () => {
//     form.resetFields();
//     setChildPartData(null);
//     onClose();
//   };

//   const handleSubmit = (type) => {
//     form.validateFields()
//       .then(values => {
//         if (onAction) {
//           onAction(type, values, selectedQuoteType);
//         }
//       })
//       .catch(errorInfo => {
//         console.log('Validation failed:', errorInfo);
//       });
//   };

//   const uomOptions = [
//     { value: 'HR', label: 'HR' },
//     { value: 'DL', label: 'DAY' },
//     { value: 'MN', label: 'MONTH' },
//     { value: 'YR', label: 'YEAR' }
//   ];

//   const uomMaterialsOptions = [
//     { value: 'PCS', label: 'PCS' },
//     { value: 'KG', label: 'KG' },
//     { value: 'MM', label: 'MM' },
//     { value: 'CM', label: 'CM' },
//     { value: 'M', label: 'M' },
//     { value: 'INCH', label: 'INCH' },
//     { value: 'FEET', label: 'FEET' },
//     { value: 'L', label: 'L' },
//     { value: 'ML', label: 'ML' },
//     { value: 'SET', label: 'SET' },
//     { value: 'PAIR', label: 'PAIR' },
//     { value: 'LOT', label: 'LOT' },
//   ]

//   const submitLevelOptions = [
//     { value: 'level1', label: 'Level 1' },
//     { value: 'level2', label: 'Level 2' },
//     { value: 'level3', label: 'Level 3' }
//   ];

//   // Function to get modal title based on quote type and edit mode
//   const getModalTitle = () => {
//     const baseTitle = (() => {
//       switch (selectedQuoteType) {
//         case 'material':
//           return 'Costing Item';
//         case 'manhour':
//           return 'Manhour Costing Item';
//         case 'packing':
//           return 'Packing/Others Costing Item';
//         default:
//           return 'Costing Item';
//       }
//     })();

//     return editData ? `Edit ${baseTitle}` : `Add New ${baseTitle}`;
//   };

//   // Render Material Costing Form
//   // const renderMaterialForm = () => (
//   //   <>
//   //     <Card
//   //       style={{
//   //         backgroundColor: '#fafafa',
//   //         border: '1px solid #e8e8e8',
//   //         borderRadius: 8
//   //       }}
//   //       bodyStyle={{ padding: '5px 5px' }}
//   //     >
//   //       <div style={{
//   //         display: 'flex',
//   //         justifyContent: 'space-between',
//   //         alignItems: 'center'
//   //       }}>
//   //         <div>
//   //           <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '12px' }}>
//   //             Selected Drawing
//   //           </Text>
//   //           <Text strong style={{ display: 'block', fontSize: '16px' }}>
//   //             {drawingName}
//   //           </Text>
//   //         </div>
//   //         <div style={{ textAlign: 'right' }}>
//   //           <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '12px' }}>
//   //             Project
//   //           </Text>
//   //           <Text strong style={{ display: 'block', fontSize: '16px' }}>
//   //             {projectName}
//   //           </Text>
//   //         </div>
//   //       </div>
//   //     </Card>

//   //     {/* Show selected child part info */}
//   //     {childPartData && (
//   //       <div style={{
//   //         marginBottom: 16,
//   //         padding: 8,
//   //         backgroundColor: '#f0f9ff',
//   //         border: '1px solid #91d5ff',
//   //         borderRadius: 4
//   //       }}>
//   //         <Text type="success" style={{ fontSize: '12px' }}>
//   //           ✓ Loaded: {childPartData.mpn?.Description} |
//   //           MPN: {childPartData.mpn?.MPN} |
//   //           Manufacturer: {childPartData.mpn?.Manufacturer} |
//   //           UOM: {childPartData.mpn?.UOM} |
//   //           Price: ${childPartData.mpn?.RFQUnitPrice}
//   //         </Text>
//   //       </div>
//   //     )}

//   //     <Row gutter={16}>
//   //       <Col span={12}>
//   //         <Form.Item
//   //           label={<Text strong>Item Number</Text>}
//   //           name="itemNumber"
//   //           rules={[{ required: true, message: 'Please enter item number' }]}
//   //         >
//   //           <Input placeholder="Enter number" />
//   //         </Form.Item>
//   //       </Col>

//   //       <Col span={12}>
//   //         <Form.Item
//   //           label={<Text strong>Child Part</Text>}
//   //           name="childPart"
//   //           rules={[{ required: true, message: 'Please select child part' }]}
//   //         >
//   //           <Select
//   //             showSearch
//   //             placeholder="Select child part"
//   //             filterOption={(input, option) =>
//   //               option?.label?.toLowerCase().includes(input.toLowerCase()) || false
//   //             }
//   //             onChange={handleChildPartChange}
//   //             loading={loading}
//   //             options={childPartOptions}
//   //           />
//   //         </Form.Item>
//   //       </Col>
//   //     </Row>

//   //     <div>
//   //       <Form.Item
//   //         label={<Text strong>Description</Text>}
//   //         name="description"
//   //         rules={[{ required: true, message: 'Please enter description' }]}
//   //       >
//   //         <TextArea
//   //           placeholder="Enter description"
//   //           rows={1}
//   //         />
//   //       </Form.Item>
//   //     </div>

//   //     <Divider />

//   //     <Row gutter={16}>
//   //       <Col span={12}>
//   //         <Form.Item
//   //           label={<Text strong>MPN Number</Text>}
//   //           name="mpnNumber"
//   //         >
//   //           <Input placeholder="Enter MPN number" />
//   //         </Form.Item>
//   //       </Col>
//   //       <Col span={12}>
//   //         <Form.Item
//   //           label={<Text strong>Manufacturer</Text>}
//   //           name="manufacturer"
//   //         >
//   //           <Input placeholder="Enter manufacturer" />
//   //         </Form.Item>
//   //       </Col>
//   //     </Row>

//   //     <Row gutter={16}>
//   //       <Col span={8}>
//   //         <Form.Item
//   //           label={<Text strong>UOM</Text>}
//   //           name="uom"
//   //         >
//   //           <Select placeholder="Select UOM">
//   //             {uomMaterialsOptions.map(option => (
//   //               <Option key={option.value} value={option.value}>
//   //                 {option.label}
//   //               </Option>
//   //             ))}
//   //           </Select>
//   //         </Form.Item>
//   //       </Col>
//   //       <Col span={8}>
//   //         <Form.Item
//   //           label={<Text strong>Quantity</Text>}
//   //           name="quantity"
//   //         >
//   //           <InputNumber
//   //             min={0}
//   //             style={{ width: '100%' }}
//   //             placeholder="Quantity"
//   //           />
//   //         </Form.Item>
//   //       </Col>
//   //       <Col span={8}>
//   //         <Form.Item
//   //           label={<Text strong>Tolerance</Text>}
//   //           name="tolerance"
//   //         >
//   //           <InputNumber
//   //             style={{ width: '100%' }}
//   //             placeholder="Tolerance"
//   //           />
//   //         </Form.Item>
//   //       </Col>
//   //     </Row>

//   //     <Row gutter={16}>
//   //       <Col span={8}>
//   //         <Form.Item
//   //           label={<Text strong>Actual Qty</Text>}
//   //           name="actualQty"
//   //         >
//   //           <InputNumber
//   //             style={{ width: '100%' }}
//   //             placeholder="Actual Qty"
//   //           />
//   //         </Form.Item>
//   //       </Col>
//   //       <Col span={8}>
//   //         <Form.Item
//   //           label={<Text strong>Unit Price</Text>}
//   //           name="unitPrice"
//   //         >
//   //           <InputNumber
//   //             min={0}
//   //             style={{ width: '100%' }}
//   //             placeholder="Unit Price"
//   //           />
//   //         </Form.Item>
//   //       </Col>
//   //       <Col span={8}>
//   //         <Form.Item
//   //           label={<Text strong>Ext Price (Auto-calculated)</Text>}
//   //           name="extPrice"
//   //         >
//   //           <InputNumber
//   //             style={{ width: '100%' }}
//   //             readOnly
//   //             placeholder="Extended Price"
//   //           />
//   //         </Form.Item>
//   //       </Col>
//   //     </Row>

//   //     <Row gutter={16}>
//   //       <Col span={8}>
//   //         <Form.Item
//   //           label={<Text strong>SGA %</Text>}
//   //           name="sgaPercent"
//   //         >
//   //           <InputNumber
//   //             min={0}
//   //             max={100}
//   //             style={{ width: '100%' }}
//   //             placeholder="0"
//   //           />
//   //         </Form.Item>
//   //       </Col>
//   //       <Col span={8}>
//   //         <Form.Item
//   //           label={<Text strong>Mat Burden %</Text>}
//   //           name="matBurden"
//   //         >
//   //           <InputNumber
//   //             min={0}
//   //             max={100}
//   //             style={{ width: '100%' }}
//   //             placeholder="0"
//   //           />
//   //         </Form.Item>
//   //       </Col>
//   //       <Col span={8}>
//   //         <Form.Item
//   //           label={<Text strong>Fixed Freight %</Text>}
//   //           name="freightCost"
//   //         >
//   //           <InputNumber
//   //             min={0}
//   //             style={{ width: '100%' }}
//   //             placeholder="0"
//   //           />
//   //         </Form.Item>
//   //       </Col>
//   //     </Row>

//   //     <Row gutter={16}>
//   //       <Col span={8}>
//   //         <Form.Item
//   //           label={<Text strong>Fixed Freight Cost</Text>}
//   //           name="fixedFreightCost"
//   //         >
//   //           <InputNumber
//   //             min={0}
//   //             style={{ width: '100%' }}
//   //             placeholder="0"
//   //           />
//   //         </Form.Item>
//   //       </Col>
//   //       <Col span={8}>
//   //         <Form.Item
//   //           label={<Text strong>Sales Price (Auto-calculated)</Text>}
//   //           name="salesPrice"
//   //         >
//   //           <InputNumber
//   //             style={{ width: '100%' }}
//   //             readOnly
//   //             placeholder="Sales Price"
//   //           />
//   //         </Form.Item>
//   //       </Col>
//   //       <Col span={8}>
//   //         <Form.Item
//   //           label={<Text strong>MOQ</Text>}
//   //           name="moq"
//   //         >
//   //           <InputNumber
//   //             min={0}
//   //             style={{ width: '100%' }}
//   //             placeholder="0"
//   //           />
//   //         </Form.Item>
//   //       </Col>
//   //     </Row>

//   //     <Row gutter={16}>
//   //       <Col span={12}>
//   //         <Form.Item
//   //           label={<Text strong>RFQ Date</Text>}
//   //           name="rfqDate"
//   //         >
//   //           <DatePicker style={{ width: '100%' }} placeholder="Select RFQ Date" />
//   //         </Form.Item>
//   //       </Col>
//   //       <Col span={12}>
//   //         <Form.Item
//   //           label={<Text strong>Supplier</Text>}
//   //           name="supplier"
//   //         >
//   //           <Input placeholder="Enter supplier" />
//   //         </Form.Item>
//   //       </Col>
//   //     </Row>

//   //     <Row gutter={16} style={{ marginBottom: 24 }}>
//   //       <Col span={12}>
//   //         <Form.Item
//   //           label={<Text strong>Lead Time (weeks)</Text>}
//   //           name="leadTime"
//   //         >
//   //           <InputNumber
//   //             min={0}
//   //             max={100}
//   //             style={{ width: '100%' }}
//   //             placeholder="0"
//   //           />
//   //         </Form.Item>
//   //       </Col>
//   //       <Col span={12}>
//   //         <Form.Item
//   //           label={<Text strong>Edited By</Text>}
//   //           name="editedBy"
//   //         >
//   //           <Input placeholder="Enter name" />
//   //         </Form.Item>
//   //       </Col>
//   //     </Row>
//   //   </>
//   // );

//   const renderMaterialForm = () => {
//     // Handle quantity and tolerance changes for actual quantity calculation
//     const handleQuantityAndToleranceChange = () => {
//       const quantity = form.getFieldValue('quantity') || 0;
//       const tolerance = form.getFieldValue('tolerance') || 0;

//       // Actual Qty = Quantity + (Quantity × Tolerance%)
//       const actualQty = quantity + (quantity * (tolerance / 100));

//       form.setFieldsValue({
//         actualQty: actualQty
//       });

//       // Also calculate extended price
//       calculateExtendedPrice(actualQty);
//     };

//     // Handle unit price change
//     const handleUnitPriceChange = (value) => {
//       const actualQty = form.getFieldValue('actualQty') || 0;
//       const unitPrice = value || 0;

//       calculateExtendedPrice(actualQty, unitPrice);
//     };

//     // Calculate extended price
//     const calculateExtendedPrice = (actualQty, unitPrice = null) => {
//       const currentUnitPrice = unitPrice !== null ? unitPrice : form.getFieldValue('unitPrice') || 0;
//       const currentActualQty = actualQty || form.getFieldValue('actualQty') || 0;

//       // Ext Price = Actual Qty × Unit Price
//       const extPrice = currentActualQty * currentUnitPrice;

//       form.setFieldsValue({
//         extPrice: extPrice
//       });

//       // Also calculate sales price
//       calculateSalesPrice(extPrice);
//     };

//     // Handle percentage and cost changes for sales price calculation
//     const handlePercentageAndCostChange = () => {
//       const extPrice = form.getFieldValue('extPrice') || 0;
//       calculateSalesPrice(extPrice);
//     };

//     // Calculate sales price
//     const calculateSalesPrice = (extPrice = null) => {
//       const currentExtPrice = extPrice !== null ? extPrice : form.getFieldValue('extPrice') || 0;
//       const sgaPercent = form.getFieldValue('sgaPercent') || 0;
//       const matBurden = form.getFieldValue('matBurden') || 0;
//       const freightCost = form.getFieldValue('freightCost') || 0;
//       const fixedFreightCost = form.getFieldValue('fixedFreightCost') || 0;

//       // Sales Price = Ext Price + (Ext Price × (SGA% + Mat Burden% + Freight Cost%)) + Fixed Freight Cost
//       const totalPercentage = (sgaPercent + matBurden + freightCost) / 100;
//       const salesPrice = currentExtPrice + (currentExtPrice * totalPercentage) + fixedFreightCost;

//       form.setFieldsValue({
//         salesPrice: salesPrice
//       });
//     };

//     // Handle child part change with auto-calculation
//     const handleChildPartChange = (value, option) => {
//       console.log('Selected:', value, option);

//       if (option && option.data) {
//         const selectedData = option.data;
//         setChildPartData(selectedData);

//         // Auto-fill form fields with the selected child part data
//         const unitPrice = selectedData.mpn?.RFQUnitPrice ? parseFloat(selectedData.mpn.RFQUnitPrice) : 0;

//         form.setFieldsValue({
//           description: selectedData.mpn?.Description || '',
//           mpn: selectedData.mpn?._id || '',
//           manufacturer: selectedData.mpn?.Manufacturer || '',
//           uom: selectedData.mpn?.UOM || '',
//           unitPrice: unitPrice,
//           moq: selectedData.mpn?.MOQ || 0,
//           supplier: selectedData.mpn?.Supplier || '',
//           rfqDate: selectedData?.mpn?.RFQDate ? moment(selectedData?.mpn?.RFQDate) : null,
//           leadTime:selectedData.mpn?.LeadTime_WK || 0
//         });

//         // Trigger calculations after auto-fill
//         setTimeout(() => {
//           handleQuantityAndToleranceChange();
//           handlePercentageAndCostChange();
//         }, 100);
//       } else {
//         setChildPartData(null);
//         if (!editData) {
//           form.setFieldsValue({
//             description: '',
//             mpn: '',
//             manufacturer: '',
//             uom: '',
//             unitPrice: 0,
//             moq: 0,
//             supplier: '',
//             rfqDate:'',
//             leadTime:0
//           });
//         }
//       }
//     };

//     return (
//       <>
//         <Card
//           style={{
//             backgroundColor: '#fafafa',
//             border: '1px solid #e8e8e8',
//             borderRadius: 8
//           }}
//           bodyStyle={{ padding: '5px 5px' }}
//         >
//           <div style={{
//             display: 'flex',
//             justifyContent: 'space-between',
//             alignItems: 'center'
//           }}>
//             <div>
//               <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '12px' }}>
//                 Selected Drawing
//               </Text>
//               <Text strong style={{ display: 'block', fontSize: '16px' }}>
//                 {drawingName}
//               </Text>
//             </div>
//             <div style={{ textAlign: 'right' }}>
//               <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '12px' }}>
//                 Project
//               </Text>
//               <Text strong style={{ display: 'block', fontSize: '16px' }}>
//                 {projectName}
//               </Text>
//             </div>
//           </div>
//         </Card>

//         {/* Show selected child part info */}
//         {childPartData && (
//           <div style={{
//             marginBottom: 16,
//             padding: 8,
//             backgroundColor: '#f0f9ff',
//             border: '1px solid #91d5ff',
//             borderRadius: 4
//           }}>
//             <Text type="success" style={{ fontSize: '12px' }}>
//               ✓ Loaded: {childPartData.mpn?.Description} |
//               MPN: {childPartData.mpn?.MPN} |
//               Manufacturer: {childPartData.mpn?.Manufacturer} |
//               UOM: {childPartData.mpn?.UOM} |
//               Price: ${childPartData.mpn?.RFQUnitPrice}
//             </Text>
//           </div>
//         )}

//         <Row gutter={16}>
//           <Col span={12}>
//             <Form.Item
//               label={<Text strong>Item Number</Text>}
//               name="itemNumber"
//               rules={[{ required: true, message: 'Please enter item number' }]}
//             >
//               <Input placeholder="Enter number" />
//             </Form.Item>
//           </Col>

//           <Col span={12}>
//             <Form.Item
//               label={<Text strong>Child Part</Text>}
//               name="childPart"
//               rules={[{ required: true, message: 'Please select child part' }]}
//             >
//               <Select
//                 showSearch
//                 placeholder="Select child part"
//                 filterOption={(input, option) =>
//                   option?.label?.toLowerCase().includes(input.toLowerCase()) || false
//                 }
//                 onChange={handleChildPartChange}
//                 loading={loading}
//                 options={childPartOptions}
//               />
//             </Form.Item>
//           </Col>
//         </Row>

//         <div>
//           <Form.Item
//             label={<Text strong>Description</Text>}
//             name="description"
//             rules={[{ required: true, message: 'Please enter description' }]}
//           >
//             <TextArea
//               placeholder="Enter description"
//               rows={1}
//             />
//           </Form.Item>
//         </div>

//         <Divider />

//         <Row gutter={16}>
//           <Col span={12}>
//             <Form.Item
//               label={<Text strong>MPN Number</Text>}
//               name="mpn"
//             >
//                <Select placeholder="Select">
//               {mpnList.map(option => (
//                 <Option key={option._id} value={option._id}>
//                   {option.MPN}
//                 </Option>
//               ))}
//             </Select>
//             </Form.Item>
//           </Col>
//           <Col span={12}>
//             <Form.Item
//               label={<Text strong>Manufacturer</Text>}
//               name="manufacturer"
//             >
//               <Input placeholder="Enter manufacturer" />
//             </Form.Item>
//           </Col>
//         </Row>

//         <Row gutter={16}>
//           <Col span={8}>
//             <Form.Item
//               label={<Text strong>UOM</Text>}
//               name="uom"
//             >
//               <Select placeholder="Select UOM">
//                 {uoms.map(option => (
//                   <Option key={option._id} value={option._id}>
//                     {option.code}
//                   </Option>
//                 ))}
//               </Select>
//             </Form.Item>
//           </Col>
//           <Col span={8}>
//             <Form.Item
//               label={<Text strong>Quantity</Text>}
//               name="quantity"
//             >
//               <InputNumber
//                 min={0}
//                 style={{ width: '100%' }}
//                 placeholder="Quantity"
//                 onChange={handleQuantityAndToleranceChange}
//               />
//             </Form.Item>
//           </Col>
//           <Col span={8}>
//             <Form.Item
//               label={<Text strong>Tolerance %</Text>}
//               name="tolerance"
//             >
//               <InputNumber
//                 min={0}
//                 max={100}
//                 style={{ width: '100%' }}
//                 placeholder="Tolerance %"
//                 onChange={handleQuantityAndToleranceChange}
//               />
//             </Form.Item>
//           </Col>
//         </Row>

//         <Row gutter={16}>
//           <Col span={8}>
//             <Form.Item
//               label={<Text strong>Actual Qty (Auto-calculated)</Text>}
//               name="actualQty"
//             >
//               <InputNumber
//                 style={{ width: '100%' }}
//                 readOnly
//                 placeholder="Actual Qty"
//               />
//             </Form.Item>
//           </Col>
//           <Col span={8}>
//             <Form.Item
//               label={<Text strong>Unit Price</Text>}
//               name="unitPrice"
//             >
//               <InputNumber
//                 min={0}
//                 style={{ width: '100%' }}
//                 placeholder="Unit Price"
//                 onChange={handleUnitPriceChange}
//               />
//             </Form.Item>
//           </Col>
//           <Col span={8}>
//             <Form.Item
//               label={<Text strong>Ext Price (Auto-calculated)</Text>}
//               name="extPrice"
//             >
//               <InputNumber
//                 style={{ width: '100%' }}
//                 readOnly
//                 placeholder="Extended Price"
//               />
//             </Form.Item>
//           </Col>
//         </Row>

//         <Row gutter={16}>
//           <Col span={8}>
//             <Form.Item
//               label={<Text strong>SGA %</Text>}
//               name="sgaPercent"
//             >
//               <InputNumber
//                 min={0}
//                 max={100}
//                 style={{ width: '100%' }}
//                 placeholder="0"
//                 onChange={handlePercentageAndCostChange}
//               />
//             </Form.Item>
//           </Col>
//           <Col span={8}>
//             <Form.Item
//               label={<Text strong>Mat Burden %</Text>}
//               name="matBurden"
//             >
//               <InputNumber
//                 min={0}
//                 max={100}
//                 style={{ width: '100%' }}
//                 placeholder="0"
//                 onChange={handlePercentageAndCostChange}
//               />
//             </Form.Item>
//           </Col>
//           <Col span={8}>
//             <Form.Item
//               label={<Text strong>Freight Cost %</Text>}
//               name="freightPercent"
//             >
//               <InputNumber
//                 min={0}
//                 max={100}
//                 style={{ width: '100%' }}
//                 placeholder="0"
//                 onChange={handlePercentageAndCostChange}
//               />
//             </Form.Item>
//           </Col>
//         </Row>

//         <Row gutter={16}>
//           <Col span={8}>
//             <Form.Item
//               label={<Text strong>Fixed Freight Cost</Text>}
//               name="freightCost"
//             >
//               <InputNumber
//                 min={0}
//                 style={{ width: '100%' }}
//                 placeholder="0"
//                 onChange={handlePercentageAndCostChange}
//               />
//             </Form.Item>
//           </Col>
//           <Col span={8}>
//             <Form.Item
//               label={<Text strong>Sales Price (Auto-calculated)</Text>}
//               name="salesPrice"
//             >
//               <InputNumber
//                 style={{ width: '100%' }}
//                 readOnly
//                 placeholder="Sales Price"
//               />
//             </Form.Item>
//           </Col>
//           <Col span={8}>
//             <Form.Item
//               label={<Text strong>MOQ</Text>}
//               name="moq"
//             >
//               <InputNumber
//                 min={0}
//                 style={{ width: '100%' }}
//                 placeholder="0"
//               />
//             </Form.Item>
//           </Col>
//         </Row>

//         <Row gutter={16}>
//           <Col span={12}>
//             <Form.Item
//               label={<Text strong>RFQ Date</Text>}
//               name="rfqDate"
//             >
//               <DatePicker style={{ width: '100%' }} placeholder="Select RFQ Date" />
//             </Form.Item>
//           </Col>
//           <Col span={12}>
//             <Form.Item
//               label={<Text strong>Supplier</Text>}
//               name="supplier"
//             >
//               <Select placeholder="Select Supplier">
//                 {suppliers.map(option => (
//                   <Option key={option._id} value={option._id}>
//                     {option.companyName}
//                   </Option>
//                 ))}
//               </Select>
//             </Form.Item>
//           </Col>
//         </Row>

//         <Row gutter={16} style={{ marginBottom: 24 }}>
//           <Col span={12}>
//             <Form.Item
//               label={<Text strong>Lead Time (weeks)</Text>}
//               name="leadTime"
//             >
//               <InputNumber
//                 min={0}
//                 max={100}
//                 style={{ width: '100%' }}
//                 placeholder="0"
//               />
//             </Form.Item>
//           </Col>
//           <Col span={12}>
//             <Form.Item
//               label={<Text strong>Edited By</Text>}
//               name="editedBy"
//             >
//               <Input disabled placeholder="Enter name" />
//             </Form.Item>
//           </Col>
//         </Row>

//       </>
//     );
//   };

//   const renderManhourForm = () => {

//     // Handle quantity change
//     const handleQuantityChange = (value) => {
//       const unitPrice = form.getFieldValue('unitPrice') || 0;
//       const quantity = value || 0;
//       const salesPrice = unitPrice * quantity;

//       form.setFieldsValue({
//         salesPrice: salesPrice
//       });
//     };

//     // Handle unit price change (agar editable hota to, but currently readOnly hai)
//     const handleUnitPriceChange = (value) => {
//       const quantity = form.getFieldValue('quantity') || 0;
//       const unitPrice = value || 0;
//       const salesPrice = unitPrice * quantity;

//       form.setFieldsValue({
//         salesPrice: salesPrice
//       });
//     };

//     // Handle skill level change - auto-fill unit price and calculate sales price


//     return (
//       <>
//         <Row gutter={16}>
//           <Col span={12}>
//             <Form.Item
//               label={<Text strong>Item Number</Text>}
//               name="itemNumber"
//               rules={[{ required: true, message: 'Please enter item number' }]}
//             >
//               <Input placeholder="Enter number" />
//             </Form.Item>
//           </Col>
//           <Col span={12}>
//             <Form.Item
//               label={<Text strong>Skill Level</Text>}
//               name="skillLevel"
//               rules={[{ required: true, message: 'Please select skill level' }]}
//             >
//               <Select
//                 placeholder="Select skill level"
//                 // loading={skillLevelLoading}
//                 onChange={handleSkillLevelChange}
//                 options={skillLevelOptions}
//               />
//             </Form.Item>
//           </Col>
//         </Row>

//         <Row gutter={16}>
//           <Col span={24}>
//             <Form.Item
//               label={<Text strong>Description</Text>}
//               name="description"
//               rules={[{ required: true, message: 'Please enter description' }]}
//             >
//               <TextArea placeholder="Enter description" rows={3} />
//             </Form.Item>
//           </Col>
//         </Row>

//         <Row gutter={16}>
//           <Col span={12}>
//             <Form.Item
//               label={<Text strong>UOM</Text>}
//               name="uom"
//             >
//               <Select placeholder="Select">
//                 {uoms.map(option => (
//                   <Option key={option._id} value={option._id}>
//                     {option.code}
//                   </Option>
//                 ))}
//               </Select>
//             </Form.Item>
//           </Col>
//           <Col span={12}>
//             <Form.Item
//               label={<Text strong>Quantity</Text>}
//               name="quantity"
//             >
//               <InputNumber
//                 min={0}
//                 style={{ width: '100%' }}
//                 placeholder="Enter quantity"
//                 onChange={handleQuantityChange}
//               />
//             </Form.Item>
//           </Col>
//         </Row>

//         <Row gutter={16}>
//           <Col span={12}>
//             <Form.Item
//               label={<Text strong>Unit Price (Auto Populated)</Text>}
//               name="unitPrice"
//             >
//               <InputNumber
//                 style={{ width: '100%' }}
//                 readOnly
//               // onChange={handleUnitPriceChange} // readOnly hai to onChange ki zaroorat nahi
//               />
//             </Form.Item>
//           </Col>
//           <Col span={12}>
//             <Form.Item
//               label={<Text strong>Sales Price (Auto-calculated)</Text>}
//               name="salesPrice"
//             >
//               <InputNumber
//                 style={{ width: '100%' }}
//                 readOnly
//               />
//             </Form.Item>
//           </Col>
//         </Row>

//         <Row gutter={16}>
//           <Col span={24}>
//             <Form.Item
//               label={<Text strong>Remarks</Text>}
//               name="remarks"
//             >
//               <TextArea placeholder="Enter remarks" rows={3} />
//             </Form.Item>
//           </Col>
//         </Row>
//       </>
//     );
//   };

//   // Render Packing/Others Costing Form
//   // Component level pe ye functions define karo
//   const handleQuantityChange = (value) => {
//     const unitPrice = form.getFieldValue('unitPrice') || 0;
//     const quantity = value || 0;
//     const extPrice = unitPrice * quantity;

//     form.setFieldsValue({
//       extPrice: extPrice
//     });

//     calculateSalesPrice(extPrice);
//   };

//   const handleUnitPriceChange = (value) => {
//     const quantity = form.getFieldValue('quantity') || 0;
//     const unitPrice = value || 0;
//     const extPrice = unitPrice * quantity;

//     form.setFieldsValue({
//       extPrice: extPrice
//     });

//     calculateSalesPrice(extPrice);
//   };

//   const handlePercentageChange = () => {
//     const extPrice = form.getFieldValue('extPrice') || 0;
//     calculateSalesPrice(extPrice);
//   };

//   const calculateSalesPrice = (extPrice) => {
//     const sgaPercent = form.getFieldValue('sgaPercent') || 0;
//     const maxBurden = form.getFieldValue('maxBurden') || 0;
//     const freightPercent = form.getFieldValue('freightPercent') || 0;

//     // Your formula: Ext Price + Ext Price × (SGA% + Mat Burden% + Freight%)
//     const totalPercentage = (sgaPercent + maxBurden + freightPercent) / 100;
//     const salesPrice = extPrice + (extPrice * totalPercentage);

//     form.setFieldsValue({
//       salesPrice: salesPrice
//     });
//   };

//   const renderPackingForm = () => (
//     <>
//       <Row gutter={16}>
//         <Col span={12}>
//           <Form.Item
//             label={<Text strong>Item Number</Text>}
//             name="itemNumber"
//             rules={[{ required: true, message: 'Please enter item number' }]}
//           >
//             <Input placeholder="Enter number" />
//           </Form.Item>
//         </Col>
//         <Col span={12}>
//           <Form.Item
//             label={<Text strong>MPN</Text>}
//             name="mpn"
//           >
//             <Select placeholder="Select">
//               {mpnList.map(option => (
//                 <Option key={option._id} value={option._id}>
//                   {option.MPN}
//                 </Option>
//               ))}
//             </Select>
//           </Form.Item>
//         </Col>
//       </Row>

//       <Row gutter={16}>
//         <Col span={24}>
//           <Form.Item
//             label={<Text strong>Description</Text>}
//             name="description"
//             rules={[{ required: true, message: 'Please enter description' }]}
//           >
//             <TextArea placeholder="Enter description" rows={1} />
//           </Form.Item>
//         </Col>
//       </Row>

//       <Row gutter={16}>
//         <Col span={12}>
//           <Form.Item
//             label={<Text strong>UOM</Text>}
//             name="uom"
//           >
//             <Select placeholder="Select">
//               {uoms.map(option => (
//                 <Option key={option._id} value={option._id}>
//                   {option.code}
//                 </Option>
//               ))}
//             </Select>
//           </Form.Item>
//         </Col>
//         <Col span={12}>
//           <Form.Item
//             label={<Text strong>Quantity</Text>}
//             name="quantity"
//           >
//             <InputNumber
//               min={0}
//               style={{ width: '100%' }}
//               placeholder="Enter quantity"
//               onChange={handleQuantityChange}
//             />
//           </Form.Item>
//         </Col>
//       </Row>

//       <Row gutter={16}>
//         <Col span={12}>
//           <Form.Item
//             label={<Text strong>Unit Price</Text>}
//             name="unitPrice"
//           >
//             <InputNumber
//               min={0}
//               style={{ width: '100%' }}
//               placeholder="0"
//               onChange={handleUnitPriceChange}
//             />
//           </Form.Item>
//         </Col>
//         <Col span={12}>
//           <Form.Item
//             label={<Text strong>Ext Price (Auto-calculated)</Text>}
//             name="extPrice"
//           >
//             <InputNumber
//               style={{ width: '100%' }}
//               readOnly
//               placeholder="0"
//             />
//           </Form.Item>
//         </Col>
//       </Row>

//       <Row gutter={16}>
//         <Col span={8}>
//           <Form.Item
//             label={<Text strong>SGA %</Text>}
//             name="sgaPercent"
//           >
//             <InputNumber
//               min={0}
//               max={100}
//               style={{ width: '100%' }}
//               placeholder="0"
//               onChange={handlePercentageChange}
//             />
//           </Form.Item>
//         </Col>
//         <Col span={8}>
//           <Form.Item
//             label={<Text strong>Max Burden %</Text>}
//             name="maxBurden"
//           >
//             <InputNumber
//               min={0}
//               max={100}
//               style={{ width: '100%' }}
//               placeholder="0"
//               onChange={handlePercentageChange}
//             />
//           </Form.Item>
//         </Col>
//         <Col span={8}>
//           <Form.Item
//             label={<Text strong>Freight %</Text>}
//             name="freightPercent"
//           >
//             <InputNumber
//               min={0}
//               max={100}
//               style={{ width: '100%' }}
//               placeholder="0"
//               onChange={handlePercentageChange}
//             />
//           </Form.Item>
//         </Col>
//       </Row>

//       <Row gutter={16}>
//         <Col span={24}>
//           <Form.Item
//             label={<Text strong>Sales Price (Auto-calculated)</Text>}
//             name="salesPrice"
//           >
//             <InputNumber
//               style={{ width: '100%' }}
//               readOnly
//               placeholder="0"
//             />
//           </Form.Item>
//         </Col>
//       </Row>
//     </>
//   );

//   const renderFormContent = () => {
//     switch (selectedQuoteType) {
//       case 'material':
//         return renderMaterialForm();
//       case 'manhour':
//         return renderManhourForm();
//       case 'packing':
//         return renderPackingForm();
//       default:
//         return renderMaterialForm();
//     }
//   };

//   const getInitialValues = () => {
//     const commonValues = {
//       quantity: 1,
//       unitPrice: 0,
//       salesPrice: 0
//     };

//     switch (selectedQuoteType) {
//       case 'material':
//         return {
//           ...commonValues,
//           sgaPercent: 0,
//           freightCost: 0,
//           leadTime: 0,
//           matBurden: 0,
//           actualQty: 1.00
//         };
//       case 'manhour':
//         return commonValues;
//       case 'packing':
//         return {
//           ...commonValues,
//           sgaPercent: 0,
//           maxBurden: 0,
//           freightPercent: 0,
//           extPrice: 0
//         };
//       default:
//         return commonValues;
//     }
//   };

//   return (
//     <Modal
//       title={
//         <Title level={4} style={{ margin: 0 }}>
//           {getModalTitle()}
//         </Title>
//       }
//       open={visible}
//       onCancel={handleCancel}
//       footer={null}
//       width={800}
//       centered
//       style={{ top: 20 }}
//     >
//       <Form
//         form={form}
//         layout="vertical"
//         initialValues={getInitialValues()}
//       >
//         {renderFormContent()}

//         <Divider />

//         <div style={{ display: 'flex', justifyContent: 'space-between' }}>
//           <Button
//             size="small"
//             onClick={handleCancel}
//             icon={<CloseOutlined />}
//           >
//             Cancel
//           </Button>

//           <div style={{ display: 'flex', gap: 12 }}>
//             {selectedQuoteType === 'material' ? (
//               <>
//                 <Button
//                   size="small"
//                   onClick={() => handleSubmit('close')}
//                   icon={<CloseOutlined />}
//                 >
//                   {editData ? 'Update & Close' : 'Close & Finish'}
//                 </Button>
//                 {!editData && (
//                   <Button
//                     type="primary"
//                     size="small"
//                     onClick={() => handleSubmit('save')}
//                     icon={<SaveOutlined />}
//                   >
//                     Save & Add Another
//                   </Button>
//                 )}
//                 {editData && (
//                   <Button
//                     type="primary"
//                     size="small"
//                     onClick={() => handleSubmit('save')}
//                     icon={<SaveOutlined />}
//                   >
//                     Update
//                   </Button>
//                 )}
//               </>
//             ) : (
//               <Button
//                 type="primary"
//                 size="small"
//                 onClick={() => handleSubmit('save')}
//                 icon={<SaveOutlined />}
//               >
//                 {editData ? 'Update' : 'Save Item'}
//               </Button>
//             )}
//           </div>
//         </div>
//       </Form>
//     </Modal>
//   );
// };

// export default AddCostingItemModal;

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Modal, Form, Input, InputNumber, Select, Button, Divider, Typography,
  Row, Col, DatePicker, Card, message
} from 'antd';
import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
import LibraryService from 'services/libraryService';
import SkillLevelCostingService from 'services/SkillLevelCostingService';
import dayjs from 'dayjs';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const AddCostingItemModal = ({
  visible,
  onClose,
  onAction,
  selectedQuoteType,           // 'material' | 'manhour' | 'packing'
  drawingName,
  projectName,
  editData,                    // existing row for edit mode (or undefined for add)
  costingMaterialData,         // has .costingItems to compute next item number
  uoms = [],                   // [{_id, code, ...}]
  suppliers = [],              // [{_id, companyName}]
  mpnList = []                 // [{_id, MPN, ...}]
}) => {
  const [form] = Form.useForm();
  const [childPartOptions, setChildPartOptions] = useState([]);
  const [childPartData, setChildPartData] = useState(null);
  const [loadingChild, setLoadingChild] = useState(false);

  const [skillLevelOptions, setSkillLevelOptions] = useState([]); // [{value, label, data}]
  const [loadingSkill, setLoadingSkill] = useState(false);

  // ---------- helpers ----------
  const S = (v) => (v === null || v === undefined ? '' : String(v));
  const N = (v) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };
  const DJ = (v) => (v ? dayjs(v) : null);

  // ---------- compute next item number per quote type ----------
  const getNextDrawingNumber = useCallback(() => {
    const items = costingMaterialData?.costingItems || [];
    const filtered = items.filter((d) => d.quoteType === selectedQuoteType);
    if (!filtered.length) return '0001';
    const nums = filtered
      .map((d) => parseInt(d.itemNumber, 10))
      .filter((n) => !isNaN(n));
    const maxNum = nums.length ? Math.max(...nums) : 0;
    return (maxNum + 1).toString().padStart(4, '0');
  }, [costingMaterialData, selectedQuoteType]);

  // ---------- load child parts (for material) ----------
  useEffect(() => {
    const loadAllChildParts = async () => {
      setLoadingChild(true);
      try {
        const response = await LibraryService.getAllChild();
        const opts = (response?.data || []).map((item) => ({
          value: item._id,
          label: item.ChildPartNo,
          data: item
        }));
        setChildPartOptions(opts);
      } catch (err) {
        console.error('Error loading child parts:', err);
        setChildPartOptions([]);
      } finally {
        setLoadingChild(false);
      }
    };
    if (visible && selectedQuoteType === 'material') {
      loadAllChildParts();
    }
  }, [visible, selectedQuoteType]);

  // ---------- load skill levels (for manhour) ----------
  useEffect(() => {
    const loadSkillLevels = async () => {
      setLoadingSkill(true);
      try {
        const response = await SkillLevelCostingService.getAllSkillLevelCostings();
        const opts = (response?.data || []).map((item) => ({
          value: item._id,
          label: `${item?.skillLevelName} - (${item?.currencyType?.symbol || ''}${item?.rate}/${item?.type?.code})`,
          data: item
        }));
        setSkillLevelOptions(opts);
      } catch (error) {
        console.error('Error loading skill levels:', error);
        message.error('Failed to load skill levels');
        setSkillLevelOptions([]);
      } finally {
        setLoadingSkill(false);
      }
    };
    if (visible && selectedQuoteType === 'manhour') {
      loadSkillLevels();
    }
  }, [visible, selectedQuoteType]);

  // ---------- auto-calc: MATERIAL ----------
  const recalcMaterial = useCallback(() => {
    const quantity = N(form.getFieldValue('quantity'));
    const tolerance = N(form.getFieldValue('tolerance'));
    const unitPrice = N(form.getFieldValue('unitPrice'));

    const sgaPercent = N(form.getFieldValue('sgaPercent'));
    const matBurden = N(form.getFieldValue('matBurden'));
    const freightPercent = N(form.getFieldValue('freightPercent')); // optional %
    const fixedFreight = N(form.getFieldValue('freightCost') || form.getFieldValue('fixedFreightCost')); // optional fixed

    const actualQty = quantity + (quantity * (tolerance / 100));
    const extPrice = actualQty * unitPrice;

    const pct = (sgaPercent + matBurden + freightPercent) / 100;
    const salesPrice = extPrice + (extPrice * pct) + fixedFreight;

    form.setFieldsValue({
      actualQty: Number.isFinite(actualQty) ? Number(actualQty.toFixed(4)) : 0,
      extPrice: Number.isFinite(extPrice) ? Number(extPrice.toFixed(4)) : 0,
      salesPrice: Number.isFinite(salesPrice) ? Number(salesPrice.toFixed(4)) : 0
    });
  }, [form]);

  // ---------- auto-calc: PACKING ----------
  const recalcPacking = useCallback(() => {
    const unitPrice = N(form.getFieldValue('unitPrice'));
    const quantity = N(form.getFieldValue('quantity'));
    const extPrice = unitPrice * quantity;

    const sgaPercent = N(form.getFieldValue('sgaPercent'));
    const maxBurden = N(form.getFieldValue('maxBurden'));
    const freightPercent = N(form.getFieldValue('freightPercent'));
    const pct = (sgaPercent + maxBurden + freightPercent) / 100;

    const salesPrice = extPrice + (extPrice * pct);

    form.setFieldsValue({
      extPrice: Number.isFinite(extPrice) ? Number(extPrice.toFixed(4)) : 0,
      salesPrice: Number.isFinite(salesPrice) ? Number(salesPrice.toFixed(4)) : 0
    });
  }, [form]);

  // ---------- handlers that trigger recalcs ----------
  const onQtyTolChange_Material = () => recalcMaterial();
  const onUnitChange_Material = () => recalcMaterial();
  const onPctChange_Material = () => recalcMaterial();
  const onFixedFreightChange_Material = () => recalcMaterial();

  const onQtyChange_Packing = () => recalcPacking();
  const onUnitChange_Packing = () => recalcPacking();
  const onPctChange_Packing = () => recalcPacking();

  // ---------- CHILD PART change (material) ----------
  const handleChildPartChange = (value, option) => {
    const selected = option?.data;
    setChildPartData(selected || null);

    if (selected) {
      const unitPrice = selected?.mpn?.RFQUnitPrice ? parseFloat(selected.mpn.RFQUnitPrice) : 0;

      form.setFieldsValue({
        description: selected?.mpn?.Description || '',
        mpn: selected?.mpn?._id || '',
        manufacturer: selected?.mpn?.Manufacturer || '',
        // uom is reference id in your Select; try to map by code if mpn.UOM is code
        uom: selected?.mpn?.UOM,
        unitPrice: unitPrice,
        moq: selected?.mpn?.MOQ || 0,
        supplier: selected?.mpn?.Supplier || '',
        rfqDate: selected?.mpn?.RFQDate ? DJ(selected?.mpn?.RFQDate) : null,
        leadTime: selected?.mpn?.LeadTime_WK || 0
      });

      setTimeout(() => recalcMaterial(), 0);
    }
  };

  // ---------- SKILL LEVEL change (manhour) ----------
  const handleSkillLevelChange = (value, option) => {
    const selectedSkill = option?.data;
    if (!selectedSkill) return;

    const unitPrice = N(selectedSkill.hourlyRate || selectedSkill.rate || selectedSkill.unitPrice);

    // UOM from skill level type (object with _id/code)
    const uomId = selectedSkill?.type?._id || form.getFieldValue('uom');

    form.setFieldsValue({
      unitPrice,
      uom: uomId,
      description: selectedSkill?.description || form.getFieldValue('description')
    });

    const qty = N(form.getFieldValue('quantity'));
    form.setFieldsValue({ salesPrice: Number((unitPrice * qty).toFixed(4)) });
  };

  // ---------- EFFECT: initialize form values on open / edit ----------
  useEffect(() => {
    if (!visible) return;

    // reset for add
    if (!editData) {
      form.resetFields();
      form.setFieldsValue({
        itemNumber: getNextDrawingNumber(),
        quantity: 1,
        unitPrice: 0,
        salesPrice: 0,
        ...(selectedQuoteType === 'material'
          ? { sgaPercent: 0, freightCost: 0, leadTime: 0, matBurden: 0, actualQty: 1.0, freightPercent: 0 }
          : selectedQuoteType === 'packing'
            ? { sgaPercent: 0, maxBurden: 0, freightPercent: 0, extPrice: 0 }
            : {})
      });
      setChildPartData(null);
      return;
    }

    // edit mode: set raw fields directly; fix DatePicker fields
    const raw = { ...editData };
    if (raw.rfqDate) raw.rfqDate = DJ(raw.rfqDate);

    // normalize reference ids for Selects (mpn, uom, supplier, childPart, skillLevel)
    if (raw.mpn && raw.mpn._id) raw.mpn = raw.mpn._id;
    if (raw.uom && raw.uom._id) raw.uom = raw.uom._id;
    if (raw.supplier && raw.supplier._id) raw.supplier = raw.supplier._id;
    if (raw.childPart && raw.childPart._id) raw.childPart = raw.childPart._id;
    if (raw.skillLevel && raw.skillLevel._id) raw.skillLevel = raw.skillLevel._id;

    form.setFieldsValue(raw);

    // If material & childPart present, populate dependent fields via handler
    if (selectedQuoteType === 'material' && raw.childPart) {
      const opt = childPartOptions.find(o => o.value === raw.childPart);
      if (opt) handleChildPartChange(raw.childPart, opt);
      else setChildPartData(null);
      setTimeout(() => recalcMaterial(), 0);
    }

    // If packing, ensure UOM & MPN are preselected even if only objects provided
    if (selectedQuoteType === 'packing') {
      if (editData?.uom?._id) form.setFieldsValue({ uom: editData.uom._id });
      if (editData?.mpn?._id) form.setFieldsValue({ mpn: editData.mpn._id });
      setTimeout(() => recalcPacking(), 0);
    }

    // For material, ensure UOM/MPN as well (if provided as objects)
    if (selectedQuoteType === 'material') {
      if (editData?.uom?._id) form.setFieldsValue({ uom: editData.uom._id });
      if (editData?.mpn?._id) form.setFieldsValue({ mpn: editData.mpn._id });
      if (editData?.lastEditedBy?.name) form.setFieldsValue({ editedBy: editData?.lastEditedBy?.name });
    }
  }, [visible, editData, selectedQuoteType, childPartOptions, form, getNextDrawingNumber, recalcMaterial, recalcPacking]);

  // ---------- EFFECT: after skill options arrive, auto-select for edit (manhour) ----------
  useEffect(() => {
    if (!visible) return;
    if (selectedQuoteType !== 'manhour') return;
    if (!editData?.skillLevel) return;
    if (!skillLevelOptions.length) return;

    const targetId = editData.skillLevel?._id || editData.skillLevel;
    const sl = skillLevelOptions.find(o => o.value === targetId);
    if (sl) {
      form.setFieldsValue({ skillLevel: sl.value });
      handleSkillLevelChange(sl.value, sl);
    }
  }, [visible, selectedQuoteType, editData, skillLevelOptions, form]);

  // ---------- EFFECT: if UOM list arrives later, try to map by code for edit (packing/material) ----------
  useEffect(() => {
    if (!visible) return;
    if (!uoms.length) return;
    if (!editData) return;

    const ensureUom = () => {
      if (editData?.uom?._id) {
        form.setFieldsValue({ uom: editData.uom._id });
        return;
      }
      // fallback if editData.uom is code string
      const target = editData?.uom;
      const match =
        uoms.find(u => String(u._id) === String(target)) ||
        uoms.find(u => (u.code || '').toLowerCase() === String(target || '').toLowerCase());
      if (match) form.setFieldsValue({ uom: match._id });
    };

    if (selectedQuoteType === 'packing' || selectedQuoteType === 'material') {
      ensureUom();
    }
  }, [visible, uoms, editData, selectedQuoteType, form]);

  // ---------- cancel ----------
  const handleCancel = () => {
    form.resetFields();
    setChildPartData(null);
    onClose && onClose();
  };

  // ---------- submit ----------
  const handleSubmit = (actionType) => {
    form.validateFields()
      .then((values) => {
        // normalize outgoing payload
        const payload = { ...values };

        // Dates -> ISO strings
        if (payload.rfqDate && dayjs.isDayjs(payload.rfqDate)) {
          payload.rfqDate = payload.rfqDate.toDate();
        }

        // keep quoteType in payload for backend clarity
        payload.quoteType = selectedQuoteType;

        onAction && onAction(actionType, payload, selectedQuoteType);
      })
      .catch((err) => {
        console.log('Validation failed:', err);
      });
  };

  // ---------- title ----------
  const getModalTitle = () => {
    const base =
      selectedQuoteType === 'manhour' ? 'Manhour Costing Item'
        : selectedQuoteType === 'packing' ? 'Packing/Others Costing Item'
          : 'Costing Item';
    return editData ? `Edit ${base}` : `Add New ${base}`;
  };

  // ---------- forms ----------
  const MaterialForm = (
    <>
      <Card
        style={{ backgroundColor: '#fafafa', border: '1px solid #e8e8e8', borderRadius: 8 }}
        bodyStyle={{ padding: '5px 5px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Selected Drawing</Text>
            <Text strong style={{ display: 'block', fontSize: 16 }}>{drawingName}</Text>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Project</Text>
            <Text strong style={{ display: 'block', fontSize: 16 }}>{projectName}</Text>
          </div>
        </div>
      </Card>

      {childPartData && (
        <div style={{ marginBottom: 16, padding: 8, backgroundColor: '#f0f9ff', border: '1px solid #91d5ff', borderRadius: 4 }}>
          <Text type="success" style={{ fontSize: 12 }}>
            ✓ Loaded: {childPartData.mpn?.Description} | MPN: {childPartData.mpn?.MPN} | Manufacturer: {childPartData.mpn?.Manufacturer} | UOM: {childPartData.mpn?.UOM} | Price: ${childPartData.mpn?.RFQUnitPrice}
          </Text>
        </div>
      )}

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label={<Text strong>Item Number</Text>}
            name="itemNumber"
            rules={[{ required: true, message: 'Please enter item number' }]}
          >
            <Input placeholder="Enter number" />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item
            label={<Text strong>Child Part</Text>}
            name="childPart"
          >
            <Select
              showSearch
              placeholder="Select child part"
              filterOption={(input, option) => (option?.label || '').toLowerCase().includes(input.toLowerCase())}
              onChange={handleChildPartChange}
              loading={loadingChild}
              options={childPartOptions}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label={<Text strong>Description</Text>}
        name="description"
        rules={[{ required: true, message: 'Please enter description' }]}
      >
        <TextArea disabled rows={1} placeholder="Enter description" />
      </Form.Item>

      <Divider />

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={<Text strong>MPN Number</Text>} name="mpn">
            <Select disabled placeholder="Select">
              {mpnList.map((option) => (
                <Option key={option._id} value={option._id}>{option.MPN}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text strong>Manufacturer</Text>} name="manufacturer">
            <Input disabled placeholder="Enter manufacturer" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={<Text strong>UOM</Text>} name="uom" rules={[{ required: true, message: 'Please select UOM' }]}>
            <Select placeholder="Select UOM" disabled>
              {uoms.map((u) => (
                <Option key={u._id} value={u._id}>{u.code}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={<Text strong>Quantity</Text>} name="quantity" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} onChange={onQtyTolChange_Material} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={<Text strong>Tolerance %</Text>} name="tolerance">
            <InputNumber min={0} max={100} style={{ width: '100%' }} onChange={onQtyTolChange_Material} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={<Text strong>Actual Qty (Auto)</Text>} name="actualQty">
            <InputNumber disabled style={{ width: '100%' }} readOnly />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={<Text strong>Unit Price</Text>} name="unitPrice" rules={[{ required: true }]}>
            <InputNumber disabled min={0} style={{ width: '100%' }} onChange={onUnitChange_Material} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={<Text strong>Ext Price (Auto)</Text>} name="extPrice">
            <InputNumber disabled style={{ width: '100%' }} readOnly />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={<Text strong>SGA %</Text>} name="sgaPercent">
            <InputNumber min={0} max={100} style={{ width: '100%' }} onChange={onPctChange_Material} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={<Text strong>Mat Burden %</Text>} name="matBurden">
            <InputNumber min={0} max={100} style={{ width: '100%' }} onChange={onPctChange_Material} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={<Text strong>Freight Cost %</Text>} name="freightPercent">
            <InputNumber min={0} max={100} style={{ width: '100%' }} onChange={onPctChange_Material} />
          </Form.Item>
        </Col>

      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={<Text strong>Fixed Freight Cost</Text>} name="freightCost">
            <InputNumber min={0} style={{ width: '100%' }} onChange={onFixedFreightChange_Material} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={<Text strong>Sales Price (Auto)</Text>} name="salesPrice">
            <InputNumber disabled style={{ width: '100%' }} readOnly />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={<Text strong>MOQ</Text>} name="moq">
            <InputNumber disabled min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Col>

      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={<Text strong>RFQ Date</Text>} name="rfqDate">
            <DatePicker disabled style={{ width: '100%' }} placeholder="Select RFQ Date" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text strong>Supplier</Text>} name="supplier">
            <Select placeholder="Select Supplier" disabled>
              {suppliers.map((s) => (
                <Option key={s._id} value={s._id}>{s.companyName}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text strong>Lead Time (weeks)</Text>} name="leadTime">
            <InputNumber disabled min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label={<Text strong>Edited By</Text>}
            name="editedBy"
          >
            <Input disabled placeholder="Enter name" />
          </Form.Item>
        </Col>
      </Row>
    </>
  );

  const ManhourForm = (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label={<Text strong>Item Number</Text>}
            name="itemNumber"
            rules={[{ required: true, message: 'Please enter item number' }]}
          >
            <Input disabled placeholder="Enter number" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label={<Text strong>Skill Level</Text>}
            name="skillLevel"
            rules={[{ required: true, message: 'Please select skill level' }]}
          >
            <Select
              placeholder="Select skill level"
              loading={loadingSkill}
              onChange={handleSkillLevelChange}
              options={skillLevelOptions}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label={<Text strong>Description</Text>}
        name="description"
        rules={[{ required: true, message: 'Please enter description' }]}
      >
        <TextArea disabled placeholder="Enter description" rows={3} />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={<Text strong>UOM</Text>} name="uom" rules={[{ required: true }]}>
            <Select disabled placeholder="Select">
              {uoms.map((u) => (
                <Option key={u._id} value={u._id}>{u.code}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text strong>Quantity</Text>} name="quantity" rules={[{ required: true }]}>
            <InputNumber
          
              min={0}
              style={{ width: '100%' }}
              placeholder="Enter quantity"
              onChange={() => {
                const unitPrice = N(form.getFieldValue('unitPrice'));
                const qty = N(form.getFieldValue('quantity'));
                form.setFieldsValue({ salesPrice: Number((unitPrice * qty).toFixed(4)) });
              }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={<Text strong>Unit Price (Auto)</Text>} name="unitPrice">
            <InputNumber disabled style={{ width: '100%' }} readOnly />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text strong>Sales Price (Auto)</Text>} name="salesPrice">
            <InputNumber disabled style={{ width: '100%' }} readOnly />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label={<Text strong>Remarks</Text>} name="remarks">
        <TextArea rows={3} placeholder="Enter remarks" />
      </Form.Item>
    </>
  );

  const PackingForm = (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label={<Text strong>Item Number</Text>}
            name="itemNumber"
            rules={[{ required: true, message: 'Please enter item number' }]}
          >
            <Input disabled placeholder="Enter number" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text strong>MPN</Text>} name="mpn">
            <Select placeholder="Select">
              {mpnList.map((m) => (
                <Option key={m._id} value={m._id}>{m.MPN}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label={<Text strong>Description</Text>}
        name="description"
        rules={[{ required: true, message: 'Please enter description' }]}
      >
        <TextArea rows={1} placeholder="Enter description" />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={<Text strong>UOM</Text>} name="uom" rules={[{ required: true }]}>
            <Select placeholder="Select">
              {uoms.map((u) => (
                <Option key={u._id} value={u._id}>{u.code}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text strong>Quantity</Text>} name="quantity" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} onChange={onQtyChange_Packing} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={<Text strong>Unit Price</Text>} name="unitPrice" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} onChange={onUnitChange_Packing} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text strong>Ext Price (Auto)</Text>} name="extPrice">
            <InputNumber disabled style={{ width: '100%' }} readOnly />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={<Text strong>SGA %</Text>} name="sgaPercent">
            <InputNumber min={0} max={100} style={{ width: '100%' }} onChange={onPctChange_Packing} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={<Text strong>Max Burden %</Text>} name="maxBurden">
            <InputNumber min={0} max={100} style={{ width: '100%' }} onChange={onPctChange_Packing} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={<Text strong>Freight %</Text>} name="freightPercent">
            <InputNumber min={0} max={100} style={{ width: '100%' }} onChange={onPctChange_Packing} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label={<Text strong>Sales Price (Auto)</Text>} name="salesPrice">
        <InputNumber disabled style={{ width: '100%' }} readOnly />
      </Form.Item>
    </>
  );

  const renderFormContent = () => {
    if (selectedQuoteType === 'manhour') return ManhourForm;
    if (selectedQuoteType === 'packing') return PackingForm;
    return MaterialForm;
  };

  return (
    <Modal
      title={<Title level={4} style={{ margin: 0 }}>{getModalTitle()}</Title>}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={800}
      centered
      style={{ top: 20 }}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{
        quantity: 1,
        unitPrice: 0,
        salesPrice: 0,
        ...(selectedQuoteType === 'material'
          ? { sgaPercent: 0, freightCost: 0, leadTime: 0, matBurden: 0, actualQty: 1.0, freightPercent: 0 }
          : selectedQuoteType === 'packing'
            ? { sgaPercent: 0, maxBurden: 0, freightPercent: 0, extPrice: 0 }
            : {})
      }}>
        {renderFormContent()}
        <Divider />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button size="small" onClick={handleCancel} icon={<CloseOutlined />}>
            Cancel
          </Button>
          <div style={{ display: 'flex', gap: 12 }}>
            {selectedQuoteType === 'material' ? (
              <>
                <Button size="small" onClick={() => handleSubmit('close')} icon={<CloseOutlined />}>
                  {editData ? 'Update & Close' : 'Close & Finish'}
                </Button>
                {!editData && (
                  <Button type="primary" size="small" onClick={() => handleSubmit('save')} icon={<SaveOutlined />}>
                    Save & Add Another
                  </Button>
                )}
                {editData && (
                  <Button type="primary" size="small" onClick={() => handleSubmit('save')} icon={<SaveOutlined />}>
                    Update
                  </Button>
                )}
              </>
            ) : (
              <Button type="primary" size="small" onClick={() => handleSubmit('save')} icon={<SaveOutlined />}>
                {editData ? 'Update' : 'Save Item'}
              </Button>
            )}
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default AddCostingItemModal;

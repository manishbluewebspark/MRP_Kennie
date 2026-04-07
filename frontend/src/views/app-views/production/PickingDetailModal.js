// import React, { useState, useMemo, useEffect } from "react";
// import {
//     Modal,
//     Table,
//     Card,
//     Typography,
//     Input,
//     Button,
//     Space,
//     Divider,
//     Form,
//     InputNumber,
//     Checkbox,
//     message,
// } from "antd";
// import {
//     ShoppingCartOutlined,
//     ToolOutlined,
//     CheckCircleOutlined,
//     TagOutlined,
//     SafetyCertificateOutlined,
// } from "@ant-design/icons";
// import WorkOrderService from "services/WorkOrderService";
// import InventoryService from "services/InventoryService";
// import { formatDate } from "utils/formatDate";

// const { Title, Text } = Typography;
// const { TextArea } = Input;

// /**
//  * stage: 'picking' | 'assembly' | 'labelling' | 'qc'
//  * selectWorkOrderData: {
//  *   workOrderNo, projectName, poNumber, posNo/posNumber, quantity, ...
//  * }
//  */
// const PickingDetailModal = ({
//     visible,
//     onCancel,
//     onSave,
//     selectWorkOrderData,
//     stage = "",
//     materials = [], // agar backend se aayega to yaha pass kar dena
// }) => {

//     // console.log('----stage',stage)

//     const normalize = (str = "") =>
//         str.toLowerCase().replace(/[\s_]+/g, "");

//     const processStageData =
//         selectWorkOrderData?.processHistory?.find(
//             (r) =>
//                 normalize(r.process) === normalize(stage)
//         ) || [];


//     // console.log('--------processStageData', processStageData)

//     const getDrawingId = (workOrder) => {
//         return (
//             workOrder?.drawingId ||
//             workOrder?.item?.drawingId ||
//             workOrder?.items?.[0]?.drawingId ||
//             null
//         );
//     };


//     const [form] = Form.useForm();
//     const [pickedQuantities, setPickedQuantities] = useState({});
//     const [stageQty, setStageQty] = useState(null); // picking / assemble / qc / labelling qty
//     const [childParts, setChildParts] = useState([])
//     const wo = selectWorkOrderData || {};
//     const workQty = Number(wo.quantity || 0);

//     const [shortageInputs, setShortageInputs] = useState({});
//     const [shortageChecked, setShortageChecked] = useState({});

//     // useEffect(() => {
//     //     if (!visible) return; // Run only when modal opened
//     //     form.resetFields();
//     //     setPickedQuantities({});
//     //     setStageQty(null);

//     //     const drawingId = getDrawingId(selectWorkOrderData);
//     //     console.log("FINAL DRAWING ID:", drawingId);

//     //     if (!drawingId) {
//     //         console.warn("⚠ No drawingId found inside work order");
//     //         return;
//     //     }

//     //     WorkOrderService.getAllChilPartByDrawingId({ drawingId })
//     //         .then((res) => {
//     //             console.log("Child Part Response:", res);
//     //             setChildParts(res?.data || []);
//     //         })
//     //         .catch((err) => {
//     //             console.error("Error loading child parts", err);
//     //         });
//     // }, [visible]);   // RUN ONLY WHEN MODAL OPENS
//     useEffect(() => {
//         if (!visible) return;

//         form.resetFields();
//         setPickedQuantities({});
//         setStageQty(null);
//         setShortageChecked({});
//         setShortageInputs({});

//         const drawingId = getDrawingId(selectWorkOrderData);
//         // console.log("FINAL DRAWING ID:", drawingId);

//         // 🔥 Restore previously saved stage data
//         if (processStageData && processStageData.details?.length > 0) {

//             const restoredPicked = {};
//             const restoredShortageChecked = {};
//             const restoredShortageInputs = {};

//             processStageData.details.forEach((item) => {
//                 restoredPicked[item.key] = item.pickedQty || 0;

//                 if (item.shortage) {
//                     restoredShortageChecked[item.key] = true;
//                     restoredShortageInputs[item.key] = item.shortageQty || 0;
//                 }
//             });

//             setPickedQuantities(restoredPicked);
//             setShortageChecked(restoredShortageChecked);
//             setShortageInputs(restoredShortageInputs);
//             setStageQty(processStageData.qty || null);
//         }

//         if (!drawingId) {
//             console.warn("⚠ No drawingId found inside work order");
//             return;
//         }

//         WorkOrderService.getAllChilPartByDrawingId({ drawingId })
//             .then((res) => {
//                 // console.log("Child Part Response:", res);
//                 setChildParts(res?.data || []);
//             })
//             .catch((err) => {
//                 console.error("Error loading child parts", err);
//             });

//     }, [visible]);

//     const handleShortageToggle = async (checked, record, workOrder) => {
//         try {

//             // If checkbox is unchecked → do nothing for now
//             if (!checked) {
//                 message.info("Shortage removed (API pending)");
//                 return;
//             }

//             const pickedQty = Number(pickedQuantities[record.key] || 0);
//             const totalQty = Number(record.quantity || 0);

//             // shortage = total - picked
//             const shortageQty = Math.max(totalQty - pickedQty, 0);


//             // When shortage is marked → call backend
//             const payload = {
//                 mpnId: record.mpnId,              // Inventory item ID
//                 workOrderId: workOrder?.workOrderId,
//                 drawingId: workOrder?.drawingId,
//                 requiredQty: shortageQty,
//                 pickedQty: pickedQty,
//                 needDate: workOrder?.needDate,
//                 workOrderNo: workOrder?.workOrderNo
//             };

//             const res = await InventoryService.addShortage(payload);

//             if (res?.success) {
//                 message.success("Shortage updated successfully");
//             } else {
//                 message.error(res?.message || "Failed to update shortage");
//             }
//         } catch (err) {
//             console.error("Shortage update error:", err);
//             message.error("Error updating shortage");
//         }
//     };

//     const handleShortageSave = async (record, workOrder) => {
//         try {
//             const shortageQty = Number(shortageInputs[record.key] || 0);

//             if (shortageQty <= 0) {
//                 message.warning("Shortage quantity must be greater than 0");
//                 return;
//             }

//             const payload = {
//                 mpnId: record.mpnId,
//                 workOrderId: workOrder?.workOrderId,
//                 drawingId: workOrder?.drawingId,
//                 requiredQty: shortageQty,
//                 pickedQty: Number(pickedQuantities[record.key] || 0),
//                 needDate: workOrder?.needDate,
//                 workOrderNo: workOrder?.workOrderNo,
//             };

//             const res = await InventoryService.addShortage(payload);

//             if (res?.success) {
//                 message.success("Shortage saved");

//                 // lock input after success (optional but recommended)
//                 setShortageInputs((prev) => ({
//                     ...prev,
//                     [record.key]: shortageQty,
//                 }));
//             } else {
//                 message.error(res?.message || "Failed to save shortage");
//             }
//         } catch (err) {
//             console.error(err);
//             message.error("Error saving shortage");
//         }
//     };



//     // ---------- CONFIG PER STAGE ----------
//     const stageConfig = useMemo(() => {
//         const base = {
//             projectNoLabel: "Project No.",
//             poNumberLabel: "PO Number",
//             posNumberLabel: "POS Number",
//         };

//         switch (stage) {
//             case "Cable Harness":
//                 return {
//                     ...base,
//                     modalTitle: `Cable Harness Process - ${wo.projectName || ""}`,
//                     mainCardTitle:
//                         "Complete the cable harness process by entering picked quantities and any remarks",
//                     rightBtnText: "Cable Harness Done",
//                     typeKey: "Cable Harness",
//                     layout: "single", // ✅ ONLY ONE QTY FIELD
//                     labels: {
//                         single: `Produce Qty * (Must equal Work Order Qty ${wo.remainingPickingQty ?? workQty - (processStageData?.qty || 0)})`,
//                     },
//                     helpers: {
//                         single: " Production quantity must exactly match work order quantity - no more, no less",
//                     },
//                     titleIcon: <ToolOutlined />,
//                 };


//             case "Quality Check":
//                 return {
//                     ...base,
//                     modalTitle: `Quality Check Detail - ${wo.workOrderNo || ""}`,
//                     mainCardTitle: "Work Order Information",
//                     rightBtnText: "Quality Check Done",
//                     typeKey: "Quality Check",
//                     layout: "triple",
//                     labels: {
//                         left: "Work Order Quantity",
//                         middle: `QC Qty * (Max: ${workQty - (processStageData?.qty || 0)} from Assembly completion)`,
//                         right: "Balance Qty",
//                     },
//                     helpers: {
//                         left: "Original work order quantity",
//                         middle:
//                             "QC limited to Assembly completion. You can QC partial quantities.",
//                         right: "Remaining QC quantity available",
//                     },
//                     infoText:
//                         "Only assembled quantity can be quality checked. QC can be done in multiple batches.",
//                     titleIcon: <SafetyCertificateOutlined />,
//                 };

//             case "Labelling":
//                 return {
//                     ...base,
//                     modalTitle: `Labelling Detail - ${wo.projectName || ""}`,
//                     mainCardTitle: "Work Order Information",
//                     rightBtnText: "Labelling Done",
//                     typeKey: "Labelling",
//                     layout: "single",
//                     labels: {
//                         single: `Produce Qty * (Must equal ${workQty || 1})`,
//                     },
//                     helpers: {
//                         single:
//                             "Production quantity must exactly match work order quantity - no more, no less",
//                     },
//                     infoText:
//                         "Verify all labels & markings before confirming labelling completion.",
//                     titleIcon: <TagOutlined />,
//                 };

//             case "Picking":
//             default:
//                 return {
//                     ...base,
//                     modalTitle: `Picking Detail - ${wo.workOrderNo || ""}`,
//                     mainCardTitle: "Work Order Information",
//                     rightBtnText: "Save Progress",
//                     typeKey: "Picking",
//                     layout: "single",
//                     labels: {
//                         single: `Produce Qty * (Max: ${wo.remainingPickingQty ?? workQty - (processStageData?.qty || 0)})`,
//                     },
//                     helpers: {
//                         single:
//                             "You can pick partial quantities. Remaining materials can be picked later.",
//                     },
//                     infoText:
//                         "Materials extracted from drawing - enter picked quantities and shortage information.",
//                     titleIcon: <ShoppingCartOutlined />,
//                 };

//             case "Assembly":
//                 return {
//                     // ...base,
//                     modalTitle: `Assembly Process - ${wo.projectName || ""}`,
//                     mainCardTitle: "Assembly Production Details",   // ✅ title change
//                     rightBtnText: "Save Assembly",
//                     typeKey: "Assembly",
//                     layout: "triple",
//                     labels: {
//                         left: "Work Order Quantity",
//                         middle: `Assembly Qty * (Max: ${wo.remainingPickingQty ?? workQty - (processStageData?.qty || 0)} remaining)`,
//                         right: "Balance Qty:",
//                     },
//                     helpers: {
//                         left: "Original work order quantity",
//                         middle: "Enter assembly quantity for this batch",
//                         right: "Remaining after this entry",
//                     },
//                     infoText: "Assembly can be done in batches. Qty must not exceed remaining.",
//                     titleIcon: <ToolOutlined />,
//                     // ✅ max limit for assembly qty
//                     maxQty: Number(wo.remainingAssemblyQty ?? workQty),
//                 };
//             case "Picking/Assembly":
//                 return {
//                     // ...base,
//                     modalTitle: `Assembly Process - ${wo.projectName || ""}`,
//                     mainCardTitle: "Assembly Production Details",   // ✅ title change
//                     rightBtnText: "Save Assembly",
//                     typeKey: "Picking/Assembly",
//                     layout: "triple",
//                     labels: {
//                         left: "Work Order Quantity",
//                         middle: `Assembly Qty * (Max: ${wo.remainingAssemblyQty ?? workQty - (processStageData?.qty || 0)} remaining)`,
//                         right: "Balance Qty:",
//                     },
//                     helpers: {
//                         left: "Original work order quantity",
//                         middle: "Enter assembly quantity for this batch",
//                         right: "Remaining after this entry",
//                     },
//                     infoText: "Assembly can be done in batches. Qty must not exceed remaining.",
//                     titleIcon: <ToolOutlined />,
//                     // ✅ max limit for assembly qty
//                     maxQty: Number(wo.remainingAssemblyQty ?? workQty),
//                 };

//         }
//     }, [stage, wo]);

//     // ---------- TABLE (Materials for Picking) ----------
//     const dummyData = [
//         {
//             key: "1",
//             item: "00001",
//             childPart: "-",
//             description: "-",
//             mpn: "-",
//             uom: "PCS",
//             qty: 1,
//             location: "-",
//             maxQty: 1,
//         },
//     ];

//     // ---------- TABLE (Materials for Picking) ----------
//     // ---------- TABLE (Materials for Picking) ----------
//     const multipliedParts = childParts.map((p, index) => {
//         const intoQty = Number(p.quantity || 0);    // child part ka "into" (per unit)
//         const totalRequired = intoQty * workQty;    // Work order quantity se multiply

//         return {
//             ...p,
//             key: p.key || index,
//             quantity: intoQty,   // Qty column me dikhane ke liye
//             maxQty: totalRequired,     // Picked Qty ka MAX bhi yehi
//         };
//     });

//     const dataSource = multipliedParts.length ? multipliedParts : dummyData;

// const baseColumns = [
//   { title: "Item", dataIndex: "itemNumber", key: "itemNumber", width: 70 },
//   { title: "Child Part", dataIndex: "ChildPartNo", key: "ChildPartNo", width: 120 },
//   { title: "Description", dataIndex: "description", key: "description", width: 150 },
//   { title: "MPN", dataIndex: "mpn", key: "mpn", width: 100 },
//   { title: "UOM", dataIndex: "uom", key: "uom", width: 80 },
//   { title: "Qty", dataIndex: "quantity", key: "quantity", width: 80 },
//   { title: "Location", dataIndex: "storageLocation", key: "storageLocation", width: 110 },
// ];

// const pickedColumn =
//   stage?.toLowerCase() === "picking"
//     ? [
//         {
//           title: "Picked Qty",
//           dataIndex: "pickedQty",
//           key: "pickedQty",
//           width: 120,
//           render: (_, record) => (
//             <InputNumber
//               min={0}
//               max={record.maxQty}
//               placeholder={`Max: ${record.maxQty}`}
//               style={{ width: "100%" }}
//               value={pickedQuantities[record.key]}
//               onChange={(value) =>
//                 setPickedQuantities((prev) => ({
//                   ...prev,
//                   [record.key]: value,
//                 }))
//               }
//             />
//           ),
//         },
//       ]
//     : [];

//     const shortageColumn = [
//         {
//           title: "Shortage",
//           key: "shortage",
//           width: 160,
//           render: (_, record) => {
//             const isChecked = shortageChecked[record.key];

//             return (
//               <Space>
//                 <Checkbox
//                   checked={isChecked}
//                   onChange={(e) => {
//                     const checked = e.target.checked;

//                     setShortageChecked((prev) => ({
//                       ...prev,
//                       [record.key]: checked,
//                     }));

//                     if (!checked) {
//                       setShortageInputs((prev) => {
//                         const copy = { ...prev };
//                         delete copy[record.key];
//                         return copy;
//                       });
//                     }
//                   }}
//                 />

//                 {isChecked && (
//                   <InputNumber
//                     min={0}
//                     placeholder="Qty"
//                     size="small"
//                     value={shortageInputs[record.key]}
//                     onChange={(val) =>
//                       setShortageInputs((prev) => ({
//                         ...prev,
//                         [record.key]: val,
//                       }))
//                     }
//                     onBlur={() => handleShortageSave(record, wo)}
//                     style={{ width: 70 }}
//                   />
//                 )}
//               </Space>
//             );
//           },
//         },
//       ]


// const columns = [...baseColumns, ...pickedColumn, ...shortageColumn];
//     // ---------- SAVE ----------
//     const handleSave = () => {


//         form.validateFields().then((values) => {
//             const formattedMaterials = dataSource.map((item) => {
//                 const pickedQty = Number(pickedQuantities[item.key] || 0);
//                 const isShortage = !!shortageChecked[item.key];
//                 const shortageQty = isShortage
//                     ? Number(shortageInputs[item.key] || 0)
//                     : 0;

//                 return {
//                     ...item,
//                     pickedQty,
//                     shortage: isShortage,
//                     shortageQty,
//                 };
//             });

//             const payload = {
//                 stage,
//                 comments: values.comments || "",
//                 stageQty: stageQty,
//                 pickedQuantities,
//                 materials: formattedMaterials
//             };

//             // console.log("MODAL FINAL OUTPUT:", payload);
//             onSave?.(payload); // send to parent
//         });
//     };


//     return (
//         <Modal
//             title={
//                 <Space>
//                     {stageConfig.titleIcon}
//                     <span>{stageConfig.modalTitle}</span>
//                 </Space>
//             }
//             destroyOnClose
//             open={visible}
//             onCancel={onCancel}
//             width={1200}
//             style={{ top: 20 }}
//             footer={[
//                 <Button key="cancel" onClick={onCancel}>
//                     Cancel
//                 </Button>,
//                 <Button key="save" type="primary" onClick={handleSave}>
//                     {stageConfig.rightBtnText}
//                 </Button>,
//             ]}
//         >
//             {/* ----------- TOP CARD (Work Order / Assembly / QC Info) ----------- */}
//             <Card
//                 title={stageConfig.mainCardTitle}
//                 size="small"
//                 style={{ marginBottom: 16 }}
//             >
//                 {/* First row: Project/PO/POS */}
//                 {stage === "Assembly" ? <></> :
//                     <div
//                         style={{
//                             display: "grid",
//                             gridTemplateColumns: "1fr 1fr 1fr",
//                             gap: 16,
//                         }}
//                     >
//                         <div>
//                             <Text strong>{stageConfig.projectNoLabel}</Text>
//                             <br />
//                             <Text>{wo.projectName || "-"}</Text>
//                         </div>
//                         <div>
//                             <Text strong>{stageConfig.poNumberLabel}</Text>
//                             <br />
//                             <Text>{wo.poNumber || "-"}</Text>
//                         </div>
//                         <div>
//                             <Text strong>{stageConfig.posNumberLabel}</Text>
//                             <br />
//                             <Text>{wo.posNo || wo.posNumber || "-"}</Text>
//                         </div>
//                     </div>}

//                 <Divider style={{ margin: "12px 0" }} />

//                 {/* Second row: quantities – depends on stage */}
//                 {stageConfig.layout === "single" ? (
//                     <div
//                         style={{
//                             display: "grid",
//                             gridTemplateColumns: "1fr 1fr 1fr",
//                             gap: 16,
//                         }}
//                     >
//                         <div>
//                             <Text strong>Work Order No.</Text>
//                             <br />
//                             <Text>{wo.workOrderNo || "-"}</Text>
//                         </div>
//                         <div>
//                             <Text strong>Quantity</Text>
//                             <br />
//                             <Text>{workQty || "-"}</Text>
//                         </div>
//                         <div>
//                             <Text strong>{stageConfig.labels.single}</Text>
//                             <InputNumber
//                                 min={0}
//                                 max={wo.remainingPickingQty ?? workQty - (processStageData?.qty || 0)}        // ⬅️ yaha workQty ka max limit set ho jayega
//                                 value={stageQty}
//                                 onChange={(val) => setStageQty(val)}
//                                 style={{ width: "100%", marginTop: 4 }}
//                                 placeholder="Enter quantity"
//                             />

//                             <div style={{ marginTop: 4 }}>
//                                 <Text type="secondary" style={{ fontSize: 11 }}>
//                                     {stageConfig.helpers.single}
//                                 </Text>
//                             </div>
//                         </div>
//                     </div>
//                 ) : (
//                     // triple layout (Assembly / QC)
//                     <div
//                         style={{
//                             display: "grid",
//                             gridTemplateColumns: "1fr 1fr 1fr",
//                             gap: 16,
//                         }}
//                     >
//                         <div>
//                             <Text strong>{stageConfig.labels.left}</Text>
//                             <InputNumber
//                                 min={0}
//                                 value={workQty}
//                                 disabled
//                                 style={{ width: "100%", marginTop: 4 }}
//                             />
//                             <div style={{ marginTop: 4 }}>
//                                 <Text type="secondary" style={{ fontSize: 11 }}>
//                                     {stageConfig.helpers.left}
//                                 </Text>
//                             </div>
//                         </div>

//                         <div>
//                             <Text strong>{stageConfig.labels.middle}</Text>
//                             <InputNumber
//                                 min={0}
//                                 max={wo.remainingPickingQty ?? workQty - (processStageData?.qty || 0)}
//                                 value={stageQty}
//                                 onChange={(val) => setStageQty(val)}
//                                 style={{ width: "100%", marginTop: 4 }}
//                             />
//                             <div style={{ marginTop: 4 }}>
//                                 <Text type="secondary" style={{ fontSize: 11 }}>
//                                     {stageConfig.helpers.middle}
//                                 </Text>
//                             </div>
//                         </div>

//                         {/* mmstageQty */}
//                         <div>
//                             <Text strong>{stageConfig.labels.right}</Text>
//                             <InputNumber
//                                 min={0}
//                                 disabled
//                                 value={Math.max(
//                                     0,
//                                     (wo.remainingQtyAfterStage ?? workQty) - (processStageData?.qty || 0)
//                                 )}
//                                 style={{ width: "100%", marginTop: 4 }}
//                             />
//                             <div style={{ marginTop: 4 }}>
//                                 <Text type="secondary" style={{ fontSize: 11 }}>
//                                     {stageConfig.helpers.right}
//                                 </Text>
//                             </div>
//                         </div>
//                     </div>
//                 )}

//                 <div
//                     style={{
//                         marginTop: 12,
//                         padding: 8,
//                         backgroundColor: "#f0f8ff",
//                         borderRadius: 4,
//                     }}
//                 >
//                     <Text type="secondary" style={{ fontSize: 12 }}>
//                         {stageConfig.infoText}
//                     </Text>
//                 </div>
//             </Card>

//             {/* ----------- Remarks & Comments ----------- */}
//             {/* <Card title="Remarks & Comments" size="small" style={{ marginBottom: 16 }}>
//                 <Form form={form} layout="vertical">
//                     <Form.Item name="comments" label="Add New Comments">
//                         <TextArea placeholder="Enter comments" rows={3} />
//                     </Form.Item>
//                 </Form>
//             </Card> */}

//             <Card title="Remarks & Comments" size="small" style={{ marginBottom: 16 }}>

//                 {/* 🔹 Previous Comments */}
//                 {processStageData?.comments?.length > 0 && (
//                     <div style={{ marginBottom: 12 }}>
//                         <b>Previous Comments</b>

//                         {processStageData?.comments?.map((item, index) => (
//                             <div key={index} style={{
//                                 display: 'flex',
//                                 textAlign: 'center',
//                                 background: "#f8f9fa",
//                                 padding: "8px 10px",
//                                 borderRadius: 6,
//                                 // marginTop: 3,s
//                                 gap: 10
//                             }} >
//                                 <div style={{
//                                     fontSize: 11,
//                                     color: "#6c757d",
//                                     // marginBottom: 2,
//                                 }}>
//                                     {formatDate(item.commentedAt)}
//                                 </div>
//                                 <div style={{
//                                     fontSize: 13,
//                                     color: "#212529",
//                                 }}>{item.comment}</div>
//                             </div>
//                         ))}
//                     </div>
//                 )}

//                 {/* 🔹 Add New Comment (Always Visible) */}
//                 <Form form={form} layout="vertical">
//                     <Form.Item name="comments" label="Add New Comment">
//                         <TextArea placeholder="Enter comments" rows={3} />
//                     </Form.Item>
//                 </Form>

//             </Card>


//             {/* ----------- Materials for Picking ----------- */}
//             <Card title={`Materials for ${stage}`} size="small">
//                 <Table
//                     columns={columns}
//                     dataSource={dataSource}
//                     pagination={false}
//                     size="small"
//                     scroll={{ x: 900 }}
//                 />
//             </Card>
//         </Modal>
//     );
// };

// export default PickingDetailModal;

import React, { useState, useMemo, useEffect } from "react";
import {
    Modal,
    Table,
    Card,
    Typography,
    Input,
    Button,
    Space,
    Divider,
    Form,
    InputNumber,
    Checkbox,
    message,
} from "antd";
import {
    ShoppingCartOutlined,
    ToolOutlined,
    SafetyCertificateOutlined,
    TagOutlined,
} from "@ant-design/icons";
import WorkOrderService from "services/WorkOrderService";
import InventoryService from "services/InventoryService";
import { formatDate } from "utils/formatDate";

const { Title, Text } = Typography;
const { TextArea } = Input;

const PickingDetailModal = ({
    visible,
    onCancel,
    onSave,
    selectWorkOrderData,
    stage = "",
    materials = [],
}) => {

    const normalize = (str = "") =>
        str.toLowerCase().replace(/[\s_]+/g, "");

    const processStageData =
        selectWorkOrderData?.processHistory?.find(
            (r) => normalize(r.process) === normalize(stage)
        ) || {};

    const getDrawingId = (workOrder) => {
        return (
            workOrder?.drawingId ||
            workOrder?.item?.drawingId ||
            workOrder?.items?.[0]?.drawingId ||
            null
        );
    };

    const [form] = Form.useForm();
    const [pickedQuantities, setPickedQuantities] = useState({});
    const [stageQty, setStageQty] = useState(null);
    const [childParts, setChildParts] = useState([]);
    const wo = selectWorkOrderData || {};
    const workQty = Number(wo.quantity || 0);
    const [shortageInputs, setShortageInputs] = useState({});
    const [shortageChecked, setShortageChecked] = useState({});

    // Calculate remaining qty for this stage
    const alreadyCompletedQty = processStageData?.qty || 0;
    const remainingQty = workQty - alreadyCompletedQty;

    useEffect(() => {
        if (!visible) return;

        form.resetFields();
        setStageQty(null);

        const drawingId = getDrawingId(selectWorkOrderData);

        // 🔥 Restore previously saved stage data (for re-opening outstanding stage)
        if (processStageData && processStageData.details?.length > 0) {
            const restoredPicked = {};
            const restoredShortageChecked = {};
            const restoredShortageInputs = {};

            processStageData.details.forEach((item) => {
                // Show previously picked qty so user knows what they've already picked
                restoredPicked[item.key] = item.pickedQty || 0;

                if (item.shortage) {
                    restoredShortageChecked[item.key] = true;
                    restoredShortageInputs[item.key] = item.shortageQty || 0;
                }
            });

            setPickedQuantities(restoredPicked);
            setShortageChecked(restoredShortageChecked);
            setShortageInputs(restoredShortageInputs);
        } else {
            setPickedQuantities({});
            setShortageChecked({});
            setShortageInputs({});
        }

        if (!drawingId) {
            console.warn("⚠ No drawingId found inside work order");
            return;
        }

        WorkOrderService.getAllChilPartByDrawingId({ drawingId })
            .then((res) => {
                setChildParts(res?.data || []);
            })
            .catch((err) => {
                console.error("Error loading child parts", err);
            });

    }, [visible, selectWorkOrderData?.workOrderId]);

    const handleShortageToggle = async (checked, record, workOrder) => {
        try {
            if (!checked) {
                message.info("Shortage removed");
                return;
            }

            const pickedQty = Number(pickedQuantities[record.key] || 0);
            const totalQty = Number(record.quantity || 0);
            const shortageQty = Math.max(totalQty - pickedQty, 0);

            const payload = {
                mpnId: record.mpnId,
                workOrderId: workOrder?.workOrderId,
                drawingId: workOrder?.drawingId,
                requiredQty: shortageQty,
                pickedQty: pickedQty,
                needDate: workOrder?.needDate,
                workOrderNo: workOrder?.workOrderNo
            };

            const res = await InventoryService.addShortage(payload);

            if (res?.success) {
                message.success("Shortage updated successfully");
            } else {
                message.error(res?.message || "Failed to update shortage");
            }
        } catch (err) {
            console.error("Shortage update error:", err);
            message.error("Error updating shortage");
        }
    };

    const handleShortageSave = async (record, workOrder) => {
        try {
            const shortageQty = Number(shortageInputs[record.key] || 0);

            if (shortageQty <= 0) {
                message.warning("Shortage quantity must be greater than 0");
                return;
            }

            const payload = {
                mpnId: record.mpnId,
                workOrderId: workOrder?.workOrderId,
                drawingId: workOrder?.drawingId,
                requiredQty: shortageQty,
                pickedQty: Number(pickedQuantities[record.key] || 0),
                needDate: workOrder?.needDate,
                workOrderNo: workOrder?.workOrderNo,
            };

            const res = await InventoryService.addShortage(payload);

            if (res?.success) {
                message.success("Shortage saved");
                setShortageInputs((prev) => ({
                    ...prev,
                    [record.key]: shortageQty,
                }));
            } else {
                message.error(res?.message || "Failed to save shortage");
            }
        } catch (err) {
            console.error(err);
            message.error("Error saving shortage");
        }
    };

    const stageConfig = useMemo(() => {
        const base = {
            projectNoLabel: "Project No.",
            poNumberLabel: "PO Number",
            posNumberLabel: "POS Number",
        };

        switch (stage) {
            case "Picking":
            default:
                return {
                    ...base,
                    modalTitle: `Picking Detail - ${wo.workOrderNo || ""}`,
                    mainCardTitle: "Work Order Information",
                    rightBtnText: "Save Progress",
                    typeKey: "Picking",
                    layout: "single",
                    labels: {
                        single: `Produce Qty (Remaining: ${remainingQty})`,
                    },
                    helpers: {
                        single: `Previously picked: ${alreadyCompletedQty}. Enter additional qty to pick now.`,
                    },
                    infoText: "Enter picked quantity for this batch. Previously picked quantities are shown in the table below.",
                    titleIcon: <ShoppingCartOutlined />,
                };
            case "Assembly":
                return {
                    ...base,
                    modalTitle: `Assembly Process - ${wo.projectName || ""}`,
                    mainCardTitle: "Assembly Production Details",
                    rightBtnText: "Save Assembly",
                    typeKey: "Assembly",
                    layout: "single",
                    labels: {
                        single: `Assembly Qty (Remaining: ${remainingQty})`,
                    },
                    helpers: {
                        single: `Previously assembled: ${alreadyCompletedQty}. Enter additional qty to assemble now.`,
                    },
                    infoText: "Assembly can be done in batches.",
                    titleIcon: <ToolOutlined />,
                };
            case "Quality Check":
                return {
                    ...base,
                    modalTitle: `Quality Check Detail - ${wo.workOrderNo || ""}`,
                    mainCardTitle: "Work Order Information",
                    rightBtnText: "Quality Check Done",
                    typeKey: "Quality Check",
                    layout: "single",
                    labels: {
                        single: `QC Qty (Remaining: ${remainingQty})`,
                    },
                    helpers: {
                        single: `Previously QC'd: ${alreadyCompletedQty}. Enter additional qty for QC now.`,
                    },
                    infoText: "Quality check can be done in multiple batches.",
                    titleIcon: <SafetyCertificateOutlined />,
                };
            case "Labelling":
                return {
                    ...base,
                    modalTitle: `Labelling Detail - ${wo.projectName || ""}`,
                    mainCardTitle: "Work Order Information",
                    rightBtnText: "Labelling Done",
                    typeKey: "Labelling",
                    layout: "single",
                    labels: {
                        single: `Labelling Qty (Remaining: ${remainingQty})`,
                    },
                    helpers: {
                        single: `Previously labelled: ${alreadyCompletedQty}. Enter additional qty to label now.`,
                    },
                    infoText: "Verify all labels & markings before confirming labelling completion.",
                    titleIcon: <TagOutlined />,
                };
        }
    }, [stage, wo, remainingQty, alreadyCompletedQty]);

    // Table data with previously picked quantities shown
    const multipliedParts = childParts.map((p, index) => {
        const intoQty = Number(p.quantity || 0);
        const totalRequired = intoQty * workQty;
        const alreadyPicked = processStageData?.details?.find(d => d.key === (p.key || index))?.pickedQty || 0;
        const remainingToPick = totalRequired - alreadyPicked;

        return {
            ...p,
            key: p.key || index,
            quantity: intoQty,
            maxQty: totalRequired,
            alreadyPicked: alreadyPicked,  // Show user what they've already picked
            remainingToPick: remainingToPick,
        };
    });

    const dummyData = [{
        key: "1",
        item: "00001",
        childPart: "-",
        description: "-",
        mpn: "-",
        uom: "PCS",
        qty: 1,
        location: "-",
        maxQty: 1,
        alreadyPicked: 0,
        remainingToPick: 1,
    }];

    const dataSource = multipliedParts.length ? multipliedParts : dummyData;

    const baseColumns = [
        { title: "Item", dataIndex: "itemNumber", key: "itemNumber", width: 70 },
        { title: "Child Part", dataIndex: "ChildPartNo", key: "ChildPartNo", width: 120 },
        { title: "Description", dataIndex: "description", key: "description", width: 150 },
        { title: "MPN", dataIndex: "mpn", key: "mpn", width: 100 },
        { title: "UOM", dataIndex: "uom", key: "uom", width: 80 },
        { title: "Total Qty", dataIndex: "quantity", key: "quantity", width: 80, render: (_, record) => (<div>{record.maxQty || (record.quantity * workQty)}</div>) },
        { title: "Already Picked", dataIndex: "alreadyPicked", key: "alreadyPicked", width: 100 },
        { title: "Location", dataIndex: "storageLocation", key: "storageLocation", width: 110 },
    ];

    // For Picking stage only - user enters additional qty to pick now
    const pickedColumn = stage?.toLowerCase() === "picking" ? [
        {
            title: "Picked Qty (Now)",
            dataIndex: "pickedQty",
            key: "pickedQty",
            width: 140,
            render: (_, record) => (
                <div>
                    <InputNumber
                        min={0}
                        max={record.remainingToPick}
                        placeholder={`Remaining: ${record.remainingToPick}`}
                        style={{ width: "100%" }}
                        value={pickedQuantities[record.key]}
                        onChange={(value) =>
                            setPickedQuantities((prev) => ({
                                ...prev,
                                [record.key]: value,
                            }))
                        }
                    />
                    <Text type="secondary" style={{ fontSize: 10 }}>
                        Already picked: {record.alreadyPicked}
                    </Text>
                </div>
            ),
        },
    ] : [];

    const shortageColumn = [
        {
            title: "Shortage",
            key: "shortage",
            width: 160,
            render: (_, record) => {
                const isChecked = shortageChecked[record.key];

                return (
                    <Space>
                        <Checkbox
                            checked={isChecked}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                setShortageChecked((prev) => ({
                                    ...prev,
                                    [record.key]: checked,
                                }));

                                if (!checked) {
                                    setShortageInputs((prev) => {
                                        const copy = { ...prev };
                                        delete copy[record.key];
                                        return copy;
                                    });
                                }
                            }}
                        />

                        {isChecked && (
                            <InputNumber
                                min={0}
                                placeholder="Qty"
                                size="small"
                                value={shortageInputs[record.key]}
                                onChange={(val) =>
                                    setShortageInputs((prev) => ({
                                        ...prev,
                                        [record.key]: val,
                                    }))
                                }
                                onBlur={() => handleShortageSave(record, wo)}
                                style={{ width: 70 }}
                            />
                        )}
                    </Space>
                );
            },
        },
    ];

    const columns = [...baseColumns, ...pickedColumn, ...shortageColumn];

    const handleSave = () => {
        form.validateFields().then((values) => {
            const additionalQty = Number(stageQty || 0);
            const newTotalQty = alreadyCompletedQty + additionalQty;

            const hasShortage = Object.values(shortageChecked).some(v => v === true);

            const remainingAllowed = workQty - alreadyCompletedQty;

            console.log("DEBUG FRONT", {
                additionalQty,
                alreadyCompletedQty,
                newTotalQty,
                remainingAllowed,
                workQty
            });

            // ❗ Shortage case
            if (hasShortage) {
                if (additionalQty > 0) {
                    message.error("Cannot enter Produce Qty while shortage exists");
                    return;
                }
            } else {
                // ❗ Required validation
                if (!additionalQty || additionalQty <= 0) {
                    message.warning("Please enter Produce Quantity");
                    return;
                }

                // ❗ Prevent over production
                if (additionalQty > remainingAllowed) {
                    message.error(`Max allowed: ${remainingAllowed}`);
                    return;
                }
            }

            // ❗ Final safety
            if (newTotalQty > workQty) {
                message.error(`Cannot exceed work order quantity of ${workQty}`);
                return;
            }

            // --------------------------------------------------
            // 📦 MATERIALS FORMAT
            // --------------------------------------------------

            const formattedMaterials = dataSource.map((item) => {
                const currentPickedQty = Number(pickedQuantities[item.key] || 0);
                const previousPickedQty = Number(item.alreadyPicked || 0);

                const isShortage = !!shortageChecked[item.key];
                const shortageQty = isShortage
                    ? Number(shortageInputs[item.key] || 0)
                    : 0;

                return {
                    ...item,

                    // 🔥 IMPORTANT FIX
                    pickedQty: currentPickedQty,          // ✅ ONLY current (delta)
                    previousPickedQty: previousPickedQty,
                    shortage: isShortage,
                    shortageQty,
                };
            });

            // --------------------------------------------------
            // 🚀 FINAL PAYLOAD
            // --------------------------------------------------

            const payload = {
                stage,
                comments: values.comments || "",

                // 🔥 CRITICAL FIX
                stageQty: additionalQty,        // ✅ send ONLY delta
                // remove newTotalQty ❌

                pickedQuantities,
                materials: formattedMaterials,
                workOrderId: wo.workOrderId,
            };

            console.log("FINAL PAYLOAD", payload);

            onSave?.(payload);
        });
    };

    // const handleSave = () => {
    //     form.validateFields().then((values) => {
    //         // The stageQty is the additional quantity user wants to process now
    //         const additionalQty = stageQty || 0;
    //         console.log('-----additionalQty',additionalQty,alreadyCompletedQty)
    //         const newTotalQty = alreadyCompletedQty + additionalQty;

    //          const hasShortage = Object.values(shortageChecked).some(v => v === true);
    //          if (hasShortage) {
    //         // No validation required
    //     }  else {
    //         if (!additionalQty || additionalQty <= 0) {
    //             message.warning("Please enter Produce Quantity");
    //             return;
    //         }

    //         // if (newTotalQty !== workQty) {
    //         //     message.error(`Produce Qty must match total quantity (${workQty})`);
    //         //     return;
    //         // }
    //     }

    //         if (newTotalQty > workQty) {
    //             message.error(`Cannot exceed work order quantity of ${workQty}`);
    //             return;
    //         }

    //         const formattedMaterials = dataSource.map((item) => {
    //             const currentPickedQty = Number(pickedQuantities[item.key] || 0);
    //             const previousPickedQty = item.alreadyPicked || 0;
    //             const totalPickedQty = previousPickedQty + currentPickedQty;

    //             const isShortage = !!shortageChecked[item.key];
    //             const shortageQty = isShortage
    //                 ? Number(shortageInputs[item.key] || 0)
    //                 : 0;

    //             return {
    //                 ...item,
    //                 pickedQty: totalPickedQty,  // Send total picked so far
    //                 additionalPickedQty: currentPickedQty,  // Send what's being deducted now
    //                 previousPickedQty: previousPickedQty,
    //                 shortage: isShortage,
    //                 shortageQty,
    //             };
    //         });

    //         const payload = {
    //             stage,
    //             comments: values.comments || "",
    //             stageQty: newTotalQty,  // New total completed qty
    //             additionalStageQty: additionalQty,  // Qty being processed now
    //             pickedQuantities,
    //             materials: formattedMaterials,
    //             workOrderId: wo.workOrderId,
    //         };

    //         onSave?.(payload);
    //     });
    // };

    return (
        <Modal
            title={
                <Space>
                    {stageConfig.titleIcon}
                    <span>{stageConfig.modalTitle}</span>
                </Space>
            }
            destroyOnClose
            open={visible}
            onCancel={onCancel}
            width={1200}
            style={{ top: 20 }}
            footer={[
                <Button key="cancel" onClick={onCancel}>
                    Cancel
                </Button>,
                <Button key="save" type="primary" onClick={handleSave}>
                    {stageConfig.rightBtnText}
                </Button>,
            ]}
        >
            <Card
                title={stageConfig.mainCardTitle}
                size="small"
                style={{ marginBottom: 16 }}
            >
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 16,
                    }}
                >
                    <div>
                        <Text strong>Work Order No.</Text>
                        <br />
                        <Text>{wo.workOrderNo || "-"}</Text>
                    </div>
                    <div>
                        <Text strong>Total Quantity</Text>
                        <br />
                        <Text>{workQty || "-"}</Text>
                    </div>
                    <div>
                        <Text strong>Already Completed</Text>
                        <br />
                        <Text>{alreadyCompletedQty || 0}</Text>
                    </div>
                </div>

                <Divider style={{ margin: "12px 0" }} />

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 16,
                    }}
                >
                    <div>
                        <Text strong>Project No.</Text>
                        <br />
                        <Text>{wo.projectName || "-"}</Text>
                    </div>
                    <div>
                        <Text strong>PO Number</Text>
                        <br />
                        <Text>{wo.poNumber || "-"}</Text>
                    </div>
                    <div>
                        <Text strong>{stageConfig.labels.single}</Text>
                        <InputNumber
                            min={0}
                            max={remainingQty}
                            value={stageQty}
                            onChange={(val) => setStageQty(val)}
                            style={{ width: "100%", marginTop: 4 }}
                            placeholder={`Max: ${remainingQty}`}
                        />
                        <div style={{ marginTop: 4 }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                {stageConfig.helpers.single}
                            </Text>
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        marginTop: 12,
                        padding: 8,
                        backgroundColor: "#f0f8ff",
                        borderRadius: 4,
                    }}
                >
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {stageConfig.infoText}
                    </Text>
                </div>
            </Card>

            <Card title="Remarks & Comments" size="small" style={{ marginBottom: 16 }}>
                {processStageData?.comments?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                        <b>Previous Comments</b>
                        {processStageData?.comments?.map((item, index) => (
                            <div key={index} style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: "#f8f9fa",
                                padding: "8px 10px",
                                borderRadius: 6,
                                marginTop: 4,
                                gap: 10
                            }}>
                                <div style={{
                                    fontSize: 11,
                                    color: "#6c757d",
                                }}>
                                    {formatDate(item.commentedAt)}
                                </div>
                                <div style={{
                                    fontSize: 13,
                                    color: "#212529",
                                }}>{item.comment}</div>
                            </div>
                        ))}
                    </div>
                )}

                <Form form={form} layout="vertical">
                    <Form.Item name="comments" label="Add New Comment">
                        <TextArea placeholder="Enter comments" rows={3} />
                    </Form.Item>
                </Form>
            </Card>

            <Card title={`Materials for ${stage}`} size="small">
                <Table
                    columns={columns}
                    dataSource={dataSource}
                    pagination={false}
                    size="small"
                    scroll={{ x: 1000 }}
                />
            </Card>
        </Modal>
    );
};

export default PickingDetailModal;

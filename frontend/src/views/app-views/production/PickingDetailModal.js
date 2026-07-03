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

const { Text } = Typography;
const { TextArea } = Input;

const PickingDetailModal = ({
    visible,
    onCancel,
    onSave,
    selectWorkOrderData,
    stage = "",
    stageStatus = "",
}) => {

    const normalize = (str = "") => str.toLowerCase().replace(/[\s_]+/g, "");

    const processStageData = selectWorkOrderData?.processHistory?.find(
        (r) => normalize(r.process) === normalize(stage)
    ) || {};

    const getDrawingId = (workOrder) => {
        return workOrder?.drawingId || workOrder?.item?.drawingId || workOrder?.items?.[0]?.drawingId || null;
    };

    const [form] = Form.useForm();
    const [pickedQuantities, setPickedQuantities] = useState({});
    const [stageQty, setStageQty] = useState(null);
    const [childParts, setChildParts] = useState([]);
    const wo = selectWorkOrderData || {};
    const workQty = Number(wo.quantity || 0);
    const [shortageInputs, setShortageInputs] = useState({});
    const [shortageChecked, setShortageChecked] = useState({});

    const alreadyCompletedQty = processStageData?.qty || 0;
    const remainingQty = workQty - alreadyCompletedQty;

    useEffect(() => {
        if (!visible) return;

        form.resetFields();
        setStageQty(null);
        setPickedQuantities({});
        setShortageChecked({});
        setShortageInputs({});

        const drawingId = getDrawingId(selectWorkOrderData);
        if (!drawingId) {
            console.warn("⚠ No drawingId found");
            return;
        }

        WorkOrderService.getAllChilPartByDrawingId({ drawingId })
            .then((res) => {
                const parts = res?.data || [];
                setChildParts(parts);

                // 🔥 Restore shortages using mpnId matching
                const savedDetails = processStageData?.details || [];
                const restoredChecked = {};
                const restoredInputs = {};

                savedDetails.forEach((savedItem) => {
                    const hasShortage = savedItem.shortage === true || Number(savedItem.shortageQty || 0) > 0;

                    if (hasShortage) {
                        // Find matching part by mpnId
                        const matchedPart = parts.find(p => String(p.mpnId) === String(savedItem.mpnId));
                        if (matchedPart) {
                            // Use mpnId as key for consistent matching
                            const key = String(matchedPart.mpnId);
                            restoredChecked[key] = true;
                            restoredInputs[key] = savedItem.shortageQty || 1;
                            console.log(`✅ Restored shortage for ${matchedPart.mpn}: Qty=${restoredInputs[key]}`);
                        }
                    }
                });

                setShortageChecked(restoredChecked);
                setShortageInputs(restoredInputs);
            })
            .catch((err) => console.error("Error loading child parts", err));

    }, [visible, selectWorkOrderData?.workOrderId]);

    const isViewOnly = stageStatus === "completed";

    const stageConfig = useMemo(() => {
        const base = {
            projectNoLabel: "Project No.",
            poNumberLabel: "PO Number",
            posNumberLabel: "POS Number",
        };

        switch (stage) {
            case "Picking":
                return {
                    ...base,
                    modalTitle: `Picking Detail - ${wo.drawingNo || ""}`,
                    mainCardTitle: "Work Order Information",
                    rightBtnText: "Save Progress",
                    labels: { single: `Produce Qty (Remaining: ${remainingQty})` },
                    helpers: { single: `Previously picked: ${alreadyCompletedQty}. Enter additional qty to pick now.` },
                    infoText: "Enter picked quantity for this batch.",
                    titleIcon: <ShoppingCartOutlined />,
                    showPickedColumn: true,
                };
            case "Cable Harness":
                return {
                    ...base,
                    modalTitle: `Cable Harness - ${wo.drawingNo || ""}`,
                    mainCardTitle: "Cable Harness Details",
                    rightBtnText: "Save Cable Harness",
                    labels: { single: `Cable Harness Qty (Remaining: ${remainingQty})` },
                    helpers: { single: `Previously completed: ${alreadyCompletedQty}. Enter additional qty now.` },
                    infoText: "Cable harness can be done in batches.",
                    titleIcon: <ToolOutlined />,
                    showPickedColumn: false,
                };
            case "Assembly":
                return {
                    ...base,
                    modalTitle: `Assembly Process - ${wo.drawingNo || ""}`,
                    mainCardTitle: "Assembly Details",
                    rightBtnText: "Save Assembly",
                    labels: { single: `Assembly Qty (Remaining: ${remainingQty})` },
                    helpers: { single: `Previously assembled: ${alreadyCompletedQty}. Enter additional qty now.` },
                    infoText: "Assembly can be done in batches.",
                    titleIcon: <ToolOutlined />,
                    showPickedColumn: false,
                };
            case "Quality Check":
                return {
                    ...base,
                    modalTitle: `Quality Check - ${wo.drawingNo || ""}`,
                    mainCardTitle: "Quality Check Details",
                    rightBtnText: "Save Quality Check",
                    labels: { single: `QC Qty (Remaining: ${remainingQty})` },
                    helpers: { single: `Previously QC'd: ${alreadyCompletedQty}. Enter additional qty now.` },
                    infoText: "Quality check can be done in batches.",
                    titleIcon: <SafetyCertificateOutlined />,
                    showPickedColumn: false,
                };
            case "Labelling":
                return {
                    ...base,
                    modalTitle: `Labelling - ${wo.drawingNo || ""}`,
                    mainCardTitle: "Labelling Details",
                    rightBtnText: "Save Labelling",
                    labels: { single: `Labelling Qty (Remaining: ${remainingQty})` },
                    helpers: { single: `Previously labelled: ${alreadyCompletedQty}. Enter additional qty now.` },
                    infoText: "Verify all labels & markings.",
                    titleIcon: <TagOutlined />,
                    showPickedColumn: false,
                };
            default:
                return {
                    ...base,
                    modalTitle: `${stage} Detail - ${wo.drawingNo || ""}`,
                    mainCardTitle: "Work Order Information",
                    rightBtnText: "Save Progress",
                    labels: { single: `Produce Qty (Remaining: ${remainingQty})` },
                    helpers: { single: `Previously completed: ${alreadyCompletedQty}. Enter additional qty now.` },
                    infoText: "Enter quantity for this batch.",
                    titleIcon: <ShoppingCartOutlined />,
                    showPickedColumn: false,
                };
        }
    }, [stage, wo, remainingQty, alreadyCompletedQty]);

    // Table data with correct "Already Picked"
    const dataSource = childParts.map((p, index) => {
        const intoQty = Number(p.quantity || 0);
        const totalRequired = intoQty * workQty;
        const totalRequiredss = intoQty;

        // Get ALL previous entries for this mpnId
        const allPreviousEntries = processStageData?.details?.filter(
            d => String(d.mpnId) === String(p.mpnId)
        ) || [];

        const alreadyPicked = allPreviousEntries.reduce(
            (sum, entry) => sum + Number(entry.pickedQty || 0), 0
        );

        const remainingToPick = totalRequired - alreadyPicked;

        // 🔥 Use mpnId as key for consistent matching with shortage state
        const uniqueKey = String(p.mpnId);

        return {
            ...p,
            key: uniqueKey,
            mpnIdKey: uniqueKey,
            maxQty: totalRequired,
            alreadyPicked: alreadyPicked,
            remainingToPick: remainingToPick > 0 ? remainingToPick : 0,
            totalQtyperD: totalRequiredss
        };
    });

    const baseColumns = [
        { title: "Item", dataIndex: "itemNumber", key: "itemNumber", width: 70 },
        { title: "Child Part", dataIndex: "ChildPartNo", key: "ChildPartNo", width: 120 },
        { title: "Description", dataIndex: "description", key: "description", width: 150 },
        { title: "MPN", dataIndex: "mpn", key: "mpn", width: 100 },
        { title: "UOM", dataIndex: "uom", key: "uom", width: 80 },
        { title: `Qty`, key: "totalQty", width: 120, render: (_, record) => record.totalQtyperD },
        { title: "Already Picked", dataIndex: "alreadyPicked", key: "alreadyPicked", width: 100 },
        { title: "Location", dataIndex: "storageLocation", key: "storageLocation", width: 110 },
    ];

    // Picked Qty column - only for picking stage
    const pickedColumn = stageConfig.showPickedColumn ? [{
        title: "Picked Qty (Now)",
        key: "pickedQtyNow",
        width: 140,
        render: (_, record) => (
            <div>
                <InputNumber
                    min={0}
                    disabled={isViewOnly}
                    max={record.remainingToPick}
                    style={{ width: "100%" }}
                    value={pickedQuantities[record.key] || 0}
                    onChange={(value) =>
                        setPickedQuantities(prev => ({ ...prev, [record.key]: value || 0 }))
                    }
                />
                <Text type="secondary" style={{ fontSize: 10 }}>
                    Remaining: {record.remainingToPick}
                </Text>
            </div>
        ),
    }] : [];

    // 🔥 Shortage column - uses mpnId as key
    const shortageColumn = [{
        title: "Shortage",
        key: "shortage",
        width: 160,
        render: (_, record) => {
            // Use mpnId as key for checking shortage
            const recordKey = String(record.mpnId);
            const isChecked = shortageChecked[recordKey] || false;
            const shortageValue = shortageInputs[recordKey] || 0;

            console.log(`Rendering shortage for ${record.mpn}: key=${recordKey}, isChecked=${isChecked}, value=${shortageValue}`);

            return (
                <Space>
                    <Checkbox
                        disabled={isViewOnly}
                        checked={isChecked}
                        onChange={(e) => {
                            const checked = e.target.checked;
                            console.log(`Checkbox changed for ${record.mpn}: ${checked}`);
                            setShortageChecked(prev => ({ ...prev, [recordKey]: checked }));
                            if (!checked) {
                                setShortageInputs(prev => {
                                    const copy = { ...prev };
                                    delete copy[recordKey];
                                    return copy;
                                });
                            } else {
                                const remainingNeeded = record.remainingToPick - (pickedQuantities[record.key] || 0);
                                setShortageInputs(prev => ({
                                    ...prev,
                                    [recordKey]: remainingNeeded > 0 ? remainingNeeded : 1,
                                }));
                            }
                        }}
                    />
                    {isChecked && (
                        <InputNumber
                            disabled={isViewOnly}
                            min={1}
                            size="small"
                            value={shortageValue}
                            onChange={(val) =>
                                setShortageInputs(prev => ({ ...prev, [recordKey]: val }))
                            }
                            style={{ width: 70 }}
                        />
                    )}
                </Space>
            );
        },
    }];

    const handleShortageSave = async (record, workOrder) => {
        try {
            const recordKey = String(record.mpnId);
            const shortageQty = Number(shortageInputs[recordKey] || 0);
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
            } else {
                message.error(res?.message || "Failed to save shortage");
            }
        } catch (err) {
            console.error(err);
            message.error("Error saving shortage");
        }
    };

    const handleSave = () => {
        form.validateFields().then((values) => {
            const additionalQty = Number(stageQty || 0);
            const hasShortage = Object.keys(shortageChecked).some(key => shortageChecked[key] === true);
            const remainingAllowed = workQty - alreadyCompletedQty;

            // Existing Picking Process


            // Calculate possible products


            // 🔥 FIX: Always send materials data, even if empty
            // But when stageQty > 0, we need to clear shortages
            const formattedMaterials = dataSource.map((item) => {
                const currentPickedQty = Number(pickedQuantities[item.key] || 0);
                const recordKey = String(item.mpnId);
                let isShortage = shortageChecked[recordKey] === true;
                let shortageQty = isShortage ? Number(shortageInputs[recordKey] || 0) : 0;

                // 🔥 CRITICAL: If stageQty > 0, automatically clear shortage for this item
                if (additionalQty > 0) {
                    isShortage = false;
                    shortageQty = 0;
                }

                return {
                    mpnId: item.mpnId,
                    mpn: item.mpn,
                    pickedQty: currentPickedQty,
                    shortage: isShortage,
                    shortageQty: shortageQty,
                    quantity: item.quantity,
                    uomId: item.uomId,
                    uom: item.uom,
                };
            });

            const materialsToSend = formattedMaterials.filter(
                m => m.pickedQty > 0 || m.shortage === true
            );

            const existingPicking =
                wo?.processHistory?.find(p => p.process === "picking");

            let possibleProducts = 0;

            // Agar current save me picking ho rahi hai
            if (formattedMaterials.length > 0) {
                possibleProducts = workQty;

                formattedMaterials.forEach(item => {
                    const requiredPerProduct = Number(item.quantity || 1);

                    // Existing picked
                    const oldItem = existingPicking?.details?.find(
                        d => String(d.mpnId) === String(item.mpnId)
                    );

                    const oldPicked = Number(oldItem?.pickedQty || 0);
                    const newPicked = Number(item.pickedQty || 0);

                    const totalPicked = oldPicked + newPicked;

                    const canMake = Math.floor(totalPicked / requiredPerProduct);

                    possibleProducts = Math.min(possibleProducts, canMake);
                });
            }
            // Agar pehle se picking saved hai
            else if (existingPicking?.details?.length) {
                possibleProducts = workQty;

                existingPicking.details.forEach(item => {
                    const requiredPerProduct = Number(item.quantity || 1);
                    const picked = Number(item.pickedQty || 0);

                    const canMake = Math.floor(picked / requiredPerProduct);

                    possibleProducts = Math.min(possibleProducts, canMake);
                });
            }

            // 🔥 Allow saving Picking/Shortage without production
            if (additionalQty <= 0 && materialsToSend.length > 0) {
                const payload = {
                    stage,
                    comments: values.comments || "",
                    stageQty: 0,
                    materials: materialsToSend,
                    workOrderId: wo.workOrderId,
                };

                console.log("Saving Picking Progress:", payload);

                onSave?.(payload);
                return;
            }

            // ❌ No picked material
            if (possibleProducts === 0 && additionalQty > 0) {
                message.error(
                    "No picked materials available. Please complete Picking first."
                );
                return;
            }

            // Validation
            const totalAfterSave = alreadyCompletedQty + additionalQty;

            if (totalAfterSave > possibleProducts) {
                message.error(
                    `Only ${possibleProducts} product(s) can be produced with available picked materials`
                );
                return;
            }

            if (!additionalQty || additionalQty <= 0) {
                message.warning("Please enter Produce Quantity");
                return;
            }

            if (additionalQty > remainingAllowed) {
                message.error(`Max allowed: ${remainingAllowed}`);
                return;
            }

            // 🔥 Filter out items with no pickedQty and no shortage
            // const materialsToSend = formattedMaterials.filter(
            //     m => m.pickedQty > 0 || m.shortage === true
            // );

            const payload = {
                stage,
                comments: values.comments || "",
                stageQty: additionalQty,
                materials: materialsToSend,
                workOrderId: wo.workOrderId,
            };

            console.log("Saving payload:", JSON.stringify(payload, null, 2));
            onSave?.(payload);
        });
    };

    // const handleSave = () => {
    //     form.validateFields().then((values) => {
    //         const additionalQty = Number(stageQty || 0);
    //         const hasShortage = Object.keys(shortageChecked).some(key => shortageChecked[key] === true);
    //         const remainingAllowed = workQty - alreadyCompletedQty;

    //         if (hasShortage) {
    //             if (additionalQty > 0) {
    //                 message.error("Cannot enter Produce Qty while shortage exists");
    //                 return;
    //             }
    //         } else {
    //             if (!additionalQty || additionalQty <= 0) {
    //                 message.warning("Please enter Produce Quantity");
    //                 return;
    //             }
    //             if (additionalQty > remainingAllowed) {
    //                 message.error(`Max allowed: ${remainingAllowed}`);
    //                 return;
    //             }
    //         }

    //         // 🔥 FIX: Always send materials data, even if empty
    //         // But when stageQty > 0, we need to clear shortages
    //         const formattedMaterials = dataSource.map((item) => {
    //             const currentPickedQty = Number(pickedQuantities[item.key] || 0);
    //             const recordKey = String(item.mpnId);
    //             let isShortage = shortageChecked[recordKey] === true;
    //             let shortageQty = isShortage ? Number(shortageInputs[recordKey] || 0) : 0;

    //             // 🔥 CRITICAL: If stageQty > 0, automatically clear shortage for this item
    //             if (additionalQty > 0) {
    //                 isShortage = false;
    //                 shortageQty = 0;
    //             }

    //             return {
    //                 mpnId: item.mpnId,
    //                 mpn: item.mpn,
    //                 pickedQty: currentPickedQty,
    //                 shortage: isShortage,
    //                 shortageQty: shortageQty,
    //                 quantity: item.quantity,
    //                 uomId: item.uomId,
    //                 uom: item.uom,
    //             };
    //         });

    //         // 🔥 Filter out items with no pickedQty and no shortage
    //         const materialsToSend = formattedMaterials.filter(
    //             m => m.pickedQty > 0 || m.shortage === true
    //         );

    //         const payload = {
    //             stage,
    //             comments: values.comments || "",
    //             stageQty: additionalQty,
    //             materials: materialsToSend,
    //             workOrderId: wo.workOrderId,
    //         };

    //         console.log("Saving payload:", JSON.stringify(payload, null, 2));
    //         onSave?.(payload);
    //     });
    // };

    return (
        <Modal
            title={<Space>{stageConfig.titleIcon}<span>{stageConfig.modalTitle}</span></Space>}
            destroyOnClose
            open={visible}
            onCancel={onCancel}
            width={1200}
            footer={[
                <Button key="cancel" onClick={onCancel}>
                    {isViewOnly ? "Close" : "Cancel"}
                </Button>,

                !isViewOnly && (
                    <Button
                        key="save"
                        type="primary"
                        onClick={handleSave}
                    >
                        {stageConfig.rightBtnText}
                    </Button>
                ),
            ]}
        >
            <Card title={stageConfig.mainCardTitle} size="small" style={{ marginBottom: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                    <div><Text strong>Work Order No.</Text><br /><Text>{wo.workOrderNo || "-"}</Text></div>
                    <div><Text strong>Total Quantity</Text><br /><Text>{workQty || "-"}</Text></div>
                    <div><Text strong>Already Completed</Text><br /><Text>{alreadyCompletedQty || 0}</Text></div>
                </div>
                <Divider style={{ margin: "12px 0" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                    <div><Text strong>Project No.</Text><br /><Text>{wo.projectName || "-"}</Text></div>
                    <div><Text strong>PO Number</Text><br /><Text>{wo.poNumber || "-"}</Text></div>
                    <div>
                        <Text strong>{stageConfig.labels.single}</Text>
                        <InputNumber
                            disabled={isViewOnly}
                            min={0}
                            max={remainingQty}
                            value={stageQty}
                            onChange={setStageQty}
                            style={{ width: "100%", marginTop: 4 }}
                            placeholder={`Max: ${remainingQty}`}
                        />
                        <div style={{ marginTop: 4 }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>{stageConfig.helpers.single}</Text>
                        </div>
                    </div>
                </div>
                <div style={{ marginTop: 12, padding: 8, backgroundColor: "#f0f8ff", borderRadius: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{stageConfig.infoText}</Text>
                </div>
            </Card>

            <Card title="Remarks & Comments" size="small" style={{ marginBottom: 16 }}>
                {processStageData?.comments?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                        <b>Previous Comments</b>
                        {processStageData.comments.map((item, index) => (
                            <div key={index} style={{ background: "#f8f9fa", padding: "8px 10px", borderRadius: 6, marginTop: 4 }}>
                                <div style={{ fontSize: 11, color: "#6c757d" }}>{formatDate(item.commentedAt)}</div>
                                <div style={{ fontSize: 13 }}>{item.comment}</div>
                            </div>
                        ))}
                    </div>
                )}
                <Form form={form} layout="vertical">
                    <Form.Item name="comments" label="Add New Comment">
                        <TextArea rows={3} disabled={isViewOnly} />
                    </Form.Item>
                </Form>
            </Card>

            <Card title={`Materials for ${stage}`} size="small">
                <Table
                    columns={[...baseColumns, ...pickedColumn, ...shortageColumn]}
                    dataSource={dataSource}
                    pagination={false}
                    size="small"
                    scroll={{ x: 1000 }}
                    rowKey="key"
                />
            </Card>
        </Modal>
    );
};

export default PickingDetailModal;
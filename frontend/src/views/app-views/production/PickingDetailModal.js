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
} from "antd";
import {
    ShoppingCartOutlined,
    ToolOutlined,
    CheckCircleOutlined,
    TagOutlined,
    SafetyCertificateOutlined,
} from "@ant-design/icons";
import WorkOrderService from "services/WorkOrderService";

const { Title, Text } = Typography;
const { TextArea } = Input;

/**
 * stage: 'picking' | 'assembly' | 'labelling' | 'qc'
 * selectWorkOrderData: {
 *   workOrderNo, projectName, poNumber, posNo/posNumber, quantity, ...
 * }
 */
const PickingDetailModal = ({
    visible,
    onCancel,
    onSave,
    selectWorkOrderData,
    stage = "",
    materials = [], // agar backend se aayega to yaha pass kar dena
}) => {

    console.log('-----stage', selectWorkOrderData?.drawingId)

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
    const [stageQty, setStageQty] = useState(null); // picking / assemble / qc / labelling qty
   const [childParts, setChildParts] = useState([])
    const wo = selectWorkOrderData || {};
    const workQty = Number(wo.quantity || 0);
    useEffect(() => {
        if (!visible) return; // Run only when modal opened

        const drawingId = getDrawingId(selectWorkOrderData);
        console.log("FINAL DRAWING ID:", drawingId);

        if (!drawingId) {
            console.warn("⚠ No drawingId found inside work order");
            return;
        }

        WorkOrderService.getAllChilPartByDrawingId({ drawingId })
            .then((res) => {
                console.log("Child Part Response:", res);
                setChildParts(res?.data || []);
            })
            .catch((err) => {
                console.error("Error loading child parts", err);
            });
    }, [visible]);   // RUN ONLY WHEN MODAL OPENS



    // ---------- CONFIG PER STAGE ----------
    const stageConfig = useMemo(() => {
        const base = {
            projectNoLabel: "Project No.",
            poNumberLabel: "PO Number",
            posNumberLabel: "POS Number",
        };

        switch (stage) {
            case "Cable Harness":
                return {
                    ...base,
                    modalTitle: `Assembly Process - ${wo.projectName || ""}`,
                    mainCardTitle: "Assembly Production Details",
                    rightBtnText: "Save Assembly",
                    typeKey: "Cable Harness",
                    layout: "triple", // 3 numeric fields
                    labels: {
                        left: "Work Order Quantity",
                        middle: `Assembly Qty * (Max: ${wo.remainingAssemblyQty ?? workQty} remaining)`,
                        right: "Balance Qty:",
                    },
                    helpers: {
                        left: "Original work order quantity",
                        middle: `${wo.completedAssemblyQty || 0} already completed. You can assemble the remaining units.`,
                        right: "Remaining quantity after this assembly batch",
                    },
                    infoText:
                        "Assembly can be done in batches. Quantities must not exceed the remaining work order quantity.",
                    titleIcon: <ToolOutlined />,
                };

            case "Quality Check":
                return {
                    ...base,
                    modalTitle: `Quality Check Detail - ${wo.workOrderNo || ""}`,
                    mainCardTitle: "Work Order Information",
                    rightBtnText: "Quality Check Done",
                    typeKey: "Quality Check",
                    layout: "triple",
                    labels: {
                        left: "Work Order Quantity",
                        middle: `QC Qty * (Max: ${wo.remainingQcQty ?? workQty} from Assembly completion)`,
                        right: "Balance Qty",
                    },
                    helpers: {
                        left: "Original work order quantity",
                        middle:
                            "QC limited to Assembly completion. You can QC partial quantities.",
                        right: "Remaining QC quantity available",
                    },
                    infoText:
                        "Only assembled quantity can be quality checked. QC can be done in multiple batches.",
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
                        single: `Produce Qty * (Must equal ${workQty || 1})`,
                    },
                    helpers: {
                        single:
                            "Production quantity must exactly match work order quantity - no more, no less",
                    },
                    infoText:
                        "Verify all labels & markings before confirming labelling completion.",
                    titleIcon: <TagOutlined />,
                };

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
                        single: `Picking Qty * (Max: ${wo.remainingPickingQty ?? workQty})`,
                    },
                    helpers: {
                        single:
                            "You can pick partial quantities. Remaining materials can be picked later.",
                    },
                    infoText:
                        "Materials extracted from drawing - enter picked quantities and shortage information.",
                    titleIcon: <ShoppingCartOutlined />,
                };
        }
    }, [stage, wo]);

    // ---------- TABLE (Materials for Picking) ----------
    const dummyData = [
        {
            key: "1",
            item: "00001",
            childPart: "-",
            description: "-",
            mpn: "-",
            uom: "PCS",
            qty: 1,
            location: "-",
            maxQty: 1,
        },
    ];

    const dataSource = childParts.length ? childParts : dummyData;

    const columns = [
        { title: "Item", dataIndex: "itemNumber", key: "itemNumber", width: 70 },
        { title: "Child Part", dataIndex: "ChildPartNo", key: "ChildPartNo", width: 120 },
        { title: "Description", dataIndex: "description", key: "description", width: 150 },
        { title: "MPN", dataIndex: "mpn", key: "mpn", width: 100 },
        { title: "UOM", dataIndex: "uom", key: "uom", width: 80 },
        { title: "Qty", dataIndex: "quantity", key: "quantity", width: 80 },
        { title: "Location", dataIndex: "storageLocation", key: "storageLocation", width: 110 },
        {
            title: "Picked Qty",
            dataIndex: "pickedQty",
            key: "pickedQty",
            width: 120,
            render: (_, record) => (
                <InputNumber
                    min={0}
                    max={record.maxQty}
                    placeholder={`Max: ${record.maxQty}`}
                    style={{ width: "100%" }}
                    value={pickedQuantities[record.key]}
                    onChange={(value) =>
                        setPickedQuantities((prev) => ({
                            ...prev,
                            [record.key]: value,
                        }))
                    }
                />
            ),
        },
        {
            title: "Shortage",
            dataIndex: "shortage",
            key: "shortage",
            width: 90,
            render: (_, record) => (
                <Checkbox
                    checked={!!record.shortage}
                // onChange={...} // backend logic baad me add kar sakte ho
                />
            ),
        },
    ];

    // ---------- SAVE ----------
    const handleSave = () => {
        form.validateFields().then((values) => {
            const payload = {
                stage,
                comments: values.comments || "",
                stageQty: stageQty,
                pickedQuantities,
                materials: childParts
            };

            console.log("MODAL FINAL OUTPUT:", payload);
            onSave?.(payload); // send to parent
        });
    };


    return (
        <Modal
            title={
                <Space>
                    {stageConfig.titleIcon}
                    <span>{stageConfig.modalTitle}</span>
                </Space>
            }
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
            {/* ----------- TOP CARD (Work Order / Assembly / QC Info) ----------- */}
            <Card
                title={stageConfig.mainCardTitle}
                size="small"
                style={{ marginBottom: 16 }}
            >
                {/* First row: Project/PO/POS */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 16,
                    }}
                >
                    <div>
                        <Text strong>{stageConfig.projectNoLabel}</Text>
                        <br />
                        <Text>{wo.projectName || "-"}</Text>
                    </div>
                    <div>
                        <Text strong>{stageConfig.poNumberLabel}</Text>
                        <br />
                        <Text>{wo.poNumber || "-"}</Text>
                    </div>
                    <div>
                        <Text strong>{stageConfig.posNumberLabel}</Text>
                        <br />
                        <Text>{wo.posNo || wo.posNumber || "-"}</Text>
                    </div>
                </div>

                <Divider style={{ margin: "12px 0" }} />

                {/* Second row: quantities – depends on stage */}
                {stageConfig.layout === "single" ? (
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
                            <Text strong>Quantity</Text>
                            <br />
                            <Text>{workQty || "-"}</Text>
                        </div>
                        <div>
                            <Text strong>{stageConfig.labels.single}</Text>
                            <InputNumber
                                min={0}
                                value={stageQty}
                                onChange={(val) => setStageQty(val)}
                                style={{ width: "100%", marginTop: 4 }}
                                placeholder="Enter quantity"
                            />
                            <div style={{ marginTop: 4 }}>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    {stageConfig.helpers.single}
                                </Text>
                            </div>
                        </div>
                    </div>
                ) : (
                    // triple layout (Assembly / QC)
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr",
                            gap: 16,
                        }}
                    >
                        <div>
                            <Text strong>{stageConfig.labels.left}</Text>
                            <InputNumber
                                min={0}
                                value={workQty}
                                disabled
                                style={{ width: "100%", marginTop: 4 }}
                            />
                            <div style={{ marginTop: 4 }}>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    {stageConfig.helpers.left}
                                </Text>
                            </div>
                        </div>

                        <div>
                            <Text strong>{stageConfig.labels.middle}</Text>
                            <InputNumber
                                min={0}
                                value={stageQty}
                                onChange={(val) => setStageQty(val)}
                                style={{ width: "100%", marginTop: 4 }}
                            />
                            <div style={{ marginTop: 4 }}>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    {stageConfig.helpers.middle}
                                </Text>
                            </div>
                        </div>

                        <div>
                            <Text strong>{stageConfig.labels.right}</Text>
                            <InputNumber
                                min={0}
                                disabled
                                value={Math.max(
                                    0,
                                    (wo.remainingQtyAfterStage ?? workQty) - (stageQty || 0)
                                )}
                                style={{ width: "100%", marginTop: 4 }}
                            />
                            <div style={{ marginTop: 4 }}>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    {stageConfig.helpers.right}
                                </Text>
                            </div>
                        </div>
                    </div>
                )}

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

            {/* ----------- Remarks & Comments ----------- */}
            <Card title="Remarks & Comments" size="small" style={{ marginBottom: 16 }}>
                <Form form={form} layout="vertical">
                    <Form.Item name="comments" label="Add New Comments">
                        <TextArea placeholder="Enter comments" rows={3} />
                    </Form.Item>
                </Form>
            </Card>

            {/* ----------- Materials for Picking ----------- */}
            <Card title="Materials for Picking" size="small">
                <Table
                    columns={columns}
                    dataSource={dataSource}
                    pagination={false}
                    size="small"
                    scroll={{ x: 900 }}
                />
            </Card>
        </Modal>
    );
};

export default PickingDetailModal;

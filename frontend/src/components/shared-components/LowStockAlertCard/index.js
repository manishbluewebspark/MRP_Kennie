import React from "react";
import { Card, Tag } from "antd";
import { WarningOutlined } from "@ant-design/icons";

const LowStockAlertCard = ({ item }) => {
    const title = item.mpnNumber || item.sku || item.itemCode || "ITEM";
    const desc = item.description || item.size || "";
    const shortage = Number(item.shortfall ?? item.shortageQty ?? 0);
    const current = Number(item.currentStock ?? item.currentStock ?? 0);
    const need = Number(item.totalRequired ?? item.minStock ?? 0);
    const location = item.storageLocation || item.storageLocation || "Not Set";

    const isCritical = String(item.urgency || "critical").toLowerCase() === "critical";
    const isOverdue = !!item.isOverdue;

    return (
        <Card
            bordered={false}
            style={{
                background: "#fff1f0",
                border: "1px solid #ffa39e",
                borderRadius: 10,
                boxShadow: "none",
            }}
            bodyStyle={{ padding: 7 }}
        >
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {/* Left icon */}
                <div style={{ color: "#ff4d4f", fontSize: 20, lineHeight: 0 }}>
                    <WarningOutlined />
                </div>

                {/* Middle content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "#111" }}>
                        {title}
                    </div>

                    <div style={{ color: "#595959", fontSize: 13, marginTop: 0 }}>
                        {desc}
                    </div>

                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 14,
                            marginTop: 6,
                            fontSize: 12,
                            color: "#595959",
                        }}
                    >
                        <span>
                            Short: <b style={{ color: "#ff4d4f" }}>{shortage} PCS</b>
                        </span>
                        <span>
                            Current: <b>{current} PCS</b>
                        </span>
                        <span>
                            Location: <b>{location}</b>
                        </span>
                    </div>

                    <div style={{ marginTop: 6 }}>
                        {item?.workOrders?.length > 0 ? (
                            item.workOrders.map((wo, index) => (
                                <Tag
                                    key={wo._id || `${wo.workOrderNo}-${index}`}
                                    color="blue"
                                    style={{ marginBottom: 4 }}
                                >
                                    {wo.workOrderNo} - {wo.requiredQty} PCS
                                </Tag>
                            ))
                        ) : (
                            <span style={{ fontSize: 12, color: "#999" }}>
                                No linked work orders
                            </span>
                        )}
                    </div>


                    {isOverdue && (
                        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: "#ff4d4f" }}>
                            OVERDUE
                        </div>
                    )}
                </div>

                {/* Right side */}
                <div style={{ textAlign: "right" }}>
                    <Tag
                        color={isCritical ? "red" : "orange"}
                        style={{
                            borderRadius: 999,
                            padding: "2px 10px",
                            fontWeight: 700,
                            fontSize: 12,
                            marginBottom: 8,
                        }}
                    >
                        {isCritical ? "CRITICAL" : "WARNING"}
                    </Tag>

                    <div style={{ fontSize: 12, color: "#595959" }}>
                        Need: <b>{need} PCS</b>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default LowStockAlertCard;

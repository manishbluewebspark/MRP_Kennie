import React from "react";
import { Card, List } from "antd";


const getPriorityDotColor = (priority) => {
  switch (priority) {
    case "critical":
      return "#ff4d4f"; // red
    case "warning":
      return "#fa8c16"; // orange
    case "success":
      return "#52c41a"; // green
    default:
      return "#1890ff"; // info / default blue
  }
};


const LatestAlertsCard = ({ latestAlerts = [], loading = false }) => {
    return (
        <Card title="Latest Alerts">
            <List
                loading={loading}
                dataSource={latestAlerts}
                renderItem={(a) => (
                    <List.Item style={{
                        padding: "10px 0", background: a.isRead ? "transparent" : "#f6ffed",
                        borderRadius: 6,
                    }}>
                        <div style={{ display: "flex", gap: 10, width: "100%" }}>
                            {/* blue bullet */}
                            <span
                                style={{
                                    width: 6,
                                    height: 6,
                                        background: getPriorityDotColor(a.priority),
                                    borderRadius: "50%",
                                    marginTop: 6,
                                    flexShrink: 0,
                                }}
                            />

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>
                                    System{" "}
                                    <span style={{ fontWeight: 600 }}>
                                        {a.title}
                                    </span>
                                </div>

                                <div style={{ fontSize: 12, color: "#595959" }}>
                                    {a.message}
                                </div>

                                <div style={{ fontSize: 11, color: "#8c8c8c", marginTop: 2 }}>
                                    {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                                </div>
                            </div>
                        </div>
                    </List.Item>
                )}
            />

            {!loading && latestAlerts?.length === 0 && (
                <div style={{ textAlign: "center", color: "#999", padding: "12px 0" }}>
                    No alerts found
                </div>
            )}
        </Card>
    );
};

export default LatestAlertsCard;

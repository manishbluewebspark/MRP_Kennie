import React, { useEffect, useState } from "react";
import { CheckCircleOutlined, CloseCircleOutlined, CloudServerOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import axios from "axios";
import SystemSettingsService from "services/SystemSettingsService";

const NavSystemStatus = ({ mode }) => {
    const [online, setOnline] = useState(false);

    const checkSystem = async () => {
        try {
            const res = await SystemSettingsService.systemCheck();
            setOnline(res?.status === "online");
        } catch (err) {
            setOnline(false);
        }
    };

    useEffect(() => {
        checkSystem();
        // auto-refresh status every 20 sec
        const interval = setInterval(checkSystem, 6000000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            style={{
                display: "flex",
                alignItems: "left",
                gap: 0,
                padding: "0 10px",
                cursor: "default",
            }}
        >
            <Tooltip title={online ? "System Online" : "System Offline"}>
                {online ? (
                    <CloudServerOutlined style={{ color: "#52c41a", fontSize: 25  }} />
                ) : (
                    <CloudServerOutlined style={{ color: "#ff4d4f", fontSize: 25 }} />
                )}
            </Tooltip>
        </div>
    );
};

export default NavSystemStatus;

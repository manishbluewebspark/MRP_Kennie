import React, { useEffect, useState } from 'react';
import { Badge, Avatar, List, Button, Popover, Tag, Spin } from 'antd';
import {
    MailOutlined,
    BellOutlined,
    WarningOutlined,
    CheckCircleOutlined,
    InfoCircleOutlined,
    ClockCircleOutlined
} from '@ant-design/icons';

import NavItem from './NavItem';
import Flex from 'components/shared-components/Flex';
import AlertService from 'services/AlertService';

// Priority → Icon mapping
const getPriorityIcon = (priority, module) => {

     if (module === "purchase_order" || module === "receiving") {
    return <ClockCircleOutlined />;
  }

    switch ((priority || '').toLowerCase()) {
        case 'warning':
            return <WarningOutlined style={{ color: '#faad14' }} />;
        case 'critical':
            return <WarningOutlined style={{ color: '#ff4d4f' }} />;
        case 'success':
            return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
        case 'info':
        default:
            return <InfoCircleOutlined style={{ color: '#1677ff' }} />;
    }
};

const PRIORITY_CONFIG = {
    info: {
        color: "#1890ff",
        tagColor: "blue",
    },
    medium: {
        color: "#faad14",
        tagColor: "orange",
    },
    warning: {
        color: "#faad14",
        tagColor: "orange",
    },
    critical: {
        color: "#ff4d4f",
        tagColor: "red",
    },
    success: {
        color: "#52c41a",
        tagColor: "green",
    },
};


const getPriorityConfig = (priority = "info") =>
    PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.info;


export const NavNotification = ({ mode }) => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(false);

    const unreadCount = alerts.filter(a => !a.isRead).length;

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const res = await AlertService.getAllAlerts({
                limit: 10,
                sort: '-createdAt',
                // isRead: false   // agar sirf unread chahiye, ye uncomment karo
            });

            setAlerts(res?.data);
        } catch (err) {
            console.error('Error fetching alerts:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    const handleMarkRead = async (alertId) => {
        try {
            await AlertService.markAlertRead(alertId);
            fetchAlerts();
        } catch (err) {
            console.error('Error marking read:', err);
        }
    };

    const handleClearAll = async () => {
        try {
            // agar backend me "markAllRead" ka endpoint hai to woh use kar sakte ho
            // फिलहाल: sab alert pe sequential markRead
            await Promise.all(
                alerts
                    .filter(a => !a.isRead)
                    .map(a => AlertService.deleteAlert(a._id))
            );
            fetchAlerts();
        } catch (err) {
            console.error('Error clearing alerts:', err);
        }
    };

    const getNotificationBody = () => {
        if (loading) {
            return (
                <div className="d-flex justify-content-center align-items-center" style={{ padding: 20 }}>
                    <Spin />
                </div>
            );
        }

        return alerts.length > 0 ? (
            <List
                size="small"
                itemLayout="horizontal"
                dataSource={alerts}
                renderItem={(item) => {
                    const { color, tagColor } = getPriorityConfig(item.priority);

                    return (
                        <List.Item
                            className="list-clickable"
                            style={{
                                backgroundColor: item.isRead ? "#fff" : "#fffbe6", // unread highlight (yellowish)
                                borderLeft: `4px solid ${color}`,
                            }}
                            onClick={() => handleMarkRead(item._id)}
                        >
                            <Flex alignItems="center" className="w-100">
                                {/* Icon */}
                                <div className="pr-3">
                                    <Avatar
                                        style={{
                                            backgroundColor: "#fff",
                                            border: `1px solid ${color}`,
                                            color,
                                        }}
                                        icon={getPriorityIcon(item.priority, item.module)}
                                    />
                                </div>

                                {/* Content */}
                                <div className="mr-3" style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 600,
                                            whiteSpace: "wrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                        }}
                                    >
                                        {item.title}
                                    </div>

                                    <div
                                        style={{
                                            fontSize: 12,
                                            color: "#595959",
                                            whiteSpace: "wrap",
                                            // overflow: "hidden",
                                            // textOverflow: "ellipsis",
                                        }}
                                    >
                                        {item.message}
                                    </div>

                                    <div style={{ marginTop: 6 }}>
                                        {/* {item.priority && (
                  <Tag
                    color={tagColor}
                    style={{ fontSize: 10, padding: "0 8px" }}
                  >
                    {item.priority.toUpperCase()} PRIORITY
                  </Tag>
                )} */}

                                        {/* {item.module && (
                  <Tag style={{ fontSize: 10, padding: "0 8px" }}>
                    {item.module}
                  </Tag>
                )} */}

                                        <small style={{ fontSize: 11, color: "#999" }}>
                                            {item.createdAt
                                                ? new Date(item.createdAt).toLocaleString()
                                                : ""}
                                        </small>

                                       
                                    </div>
                                </div>
                                 {!item.isRead && (
                                            <Tag color="gold" style={{ fontSize: 10 }}>
                                                Unread
                                            </Tag>
                                        )}

                                {/* Time */}

                            </Flex>
                        </List.Item>
                    );
                }}
            />
        ) : (
            <div className="empty-notification">
                <img
                    src="https://gw.alipayobjects.com/zos/rmsportal/sAuJeJzSKbUmHfBQRzmZ.svg"
                    alt="empty"
                />
                <p className="mt-3">You have viewed all notifications</p>
            </div>
        );

    };

    const notificationList = (
        <div style={{ width: 500 }}>
            <div className="border-bottom d-flex justify-content-between align-items-center px-3 py-2">
                <h4 className="mb-0">Alerts</h4>
                {alerts.length > 0 && (
                    <Button
                        className="text-primary"
                        type="text"
                        onClick={handleClearAll}
                        size="small"
                    >
                        Clear
                    </Button>
                )}
            </div>
            <div className="nav-notification-body">
                {getNotificationBody()}
            </div>
            {alerts.length > 0 && (
                <div className="px-3 py-2 border-top text-center">
                    <a className="d-block" href="#/">
                        View all
                    </a>
                </div>
            )}
        </div>
    );

    return (
        <Popover
            placement="bottomRight"
            title={null}
            content={notificationList}
            trigger="click"
            overlayClassName="nav-notification"
            overlayInnerStyle={{ padding: 0 }}
        >
            <NavItem mode={mode}>
                <Badge count={unreadCount}>
                    <WarningOutlined className="nav-icon mx-auto" style={{ color: '#ff4d4f' }} />
                </Badge>
            </NavItem>
        </Popover>
    );
};

export default NavNotification;

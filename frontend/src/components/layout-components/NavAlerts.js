import React, { useEffect, useState } from 'react';
import { Badge, Avatar, List, Button, Popover, Tag, Spin } from 'antd';
import {
    MailOutlined,
    BellOutlined,
    WarningOutlined,
    CheckCircleOutlined,
    InfoCircleOutlined
} from '@ant-design/icons';

import NavItem from './NavItem';
import Flex from 'components/shared-components/Flex';
import AlertService from 'services/AlertService';

// Priority → Icon mapping
const getPriorityIcon = (priority) => {
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

            setAlerts([
                {
                    "_id": "alert001",
                    "title": "Work Order W000123 - Approaching Commit Date",
                    "message": "Work Order W000123 is 3 days away from commit date. Production is still not completed.",
                    "priority": "critical",
                    "module": "work_order",
                    "isRead": false,
                    "isResolved": false,
                    "createdAt": "2025-12-11T10:20:00.000Z"
                },
                {
                    "_id": "alert002",
                    "title": "New Purchase Order Received",
                    "message": "PO-45321 has been added. Please review and assign vendor.",
                    "priority": "info",
                    "module": "purchase",
                    "isRead": false,
                    "isResolved": false,
                    "createdAt": "2025-12-11T09:50:00.000Z"
                },
                {
                    "_id": "alert003",
                    "title": "Low Inventory Warning - MPN 5566-A",
                    "message": "Inventory for MPN 5566-A dropped below safety threshold.",
                    "priority": "warning",
                    "module": "inventory",
                    "isRead": false,
                    "isResolved": false,
                    "createdAt": "2025-12-11T08:30:00.000Z"
                },
                {
                    "_id": "alert004",
                    "title": "User Profile Updated Successfully",
                    "message": "Your profile changes have been saved.",
                    "priority": "success",
                    "module": "user",
                    "isRead": true,
                    "isResolved": true,
                    "createdAt": "2025-12-10T15:10:00.000Z"
                },
                {
                    "_id": "alert005",
                    "title": "Quality Check Delay",
                    "message": "QC pending for WO-77789. Expected completion time was exceeded.",
                    "priority": "warning",
                    "module": "quality",
                    "isRead": false,
                    "isResolved": false,
                    "createdAt": "2025-12-11T07:45:00.000Z"
                }
            ]
            );
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
                    .map(a => AlertService.markAlertRead(a._id))
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
                renderItem={item => (
                    <List.Item
                        className="list-clickable"
                        style={{
                            backgroundColor: item.isRead ? '#fff' : '#e6f7ff',
                        }}
                        onClick={() => handleMarkRead(item._id)}
                    >
                        <Flex alignItems="center" className="w-100">
                            <div className="pr-3">
                                <Avatar
                                    style={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #f0f0f0',
                                        color: '#1890ff'
                                    }}
                                    icon={getPriorityIcon(item.priority)}
                                />
                            </div>
                            <div className="mr-3" style={{ flex: 1, minWidth: 0 }}>
                                <div
                                    className="font-weight-bold text-dark"
                                    style={{
                                        fontSize: 13,
                                        whiteSpace: 'nowrap',
                                        textOverflow: 'ellipsis',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {item.title}
                                </div>
                                <div
                                    className="text-gray-light"
                                    style={{
                                        fontSize: 12,
                                        whiteSpace: 'nowrap',
                                        textOverflow: 'ellipsis',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {item.message}
                                </div>
                                <div style={{ marginTop: 4 }}>
                                    {item.module && (
                                        <Tag color="blue" style={{ fontSize: 10, padding: '0 6px' }}>
                                            {item.module}
                                        </Tag>
                                    )}
                                    {item.priority && (
                                        <Tag
                                            color={
                                                item.priority === 'critical'
                                                    ? 'red'
                                                    : item.priority === 'warning'
                                                        ? 'orange'
                                                        : item.priority === 'success'
                                                            ? 'green'
                                                            : 'default'
                                            }
                                            style={{ fontSize: 10, padding: '0 6px' }}
                                        >
                                            {item.priority}
                                        </Tag>
                                    )}
                                </div>
                            </div>
                            <small className="ml-auto" style={{ fontSize: 11, color: '#999' }}>
                                {item.createdAt
                                    ? new Date(item.createdAt).toLocaleString()
                                    : ''}
                            </small>
                        </Flex>
                    </List.Item>
                )}
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
        <div style={{ width: 380 }}>
            <div className="border-bottom d-flex justify-content-between align-items-center px-3 py-2">
                <h4 className="mb-0">Notifications</h4>
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

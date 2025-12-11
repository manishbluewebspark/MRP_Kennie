// src/pages/PurchaseOrdersReceivePage.jsx
import React, { useEffect, useState } from 'react';
import {
    Card,
    Typography,
    Button,
    Divider,
    Spin,
    Empty,
    message,
} from 'antd';
import {
    CalendarOutlined,
    ClockCircleOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';

import { formatDate } from 'utils/formatDate';
import { fetchPurchaseOrders } from 'store/slices/purchaseOrderSlice';
import ReceiveMaterialService from 'services/ReceiveMaterial';
import ReceiveMaterialsModal from '../inventoryListPage/ReceiveMaterialsModal';


const { Title, Text } = Typography;

const PurchaseOrdersReceivePage = () => {
    const dispatch = useDispatch();

    const [isReceiveMaterialModalOpen, setIsReceiveMaterialModalOpen] =
        useState(false);
    const [selectedPO, setSelectedPO] = useState(null);

    // 🔹 Redux se PO state
    const {
        purchaseOrders = [],
        loadingSummary,
        loading,
        error,
    } = useSelector((state) => state.purchaseOrders || {});

    const isLoading = loadingSummary || loading;

    // ✅ Page load pe Pending POs fetch
    useEffect(() => {
        dispatch(fetchPurchaseOrders({ status: ["Pending", "Partially Received"] }));
    }, [dispatch]);

    // 🔹 Card pe "Click to receive"
    const handlePurchaseOrderClick = (po) => {
        setSelectedPO(po);
        setIsReceiveMaterialModalOpen(true);
    };

    // 🔹 Modal ka submit (tumhara purana handleReceiveSubmit)
    const handleReceiveSubmit = async (formData) => {
        console.log('Received Materials Data:', formData);

        try {
            const response = await ReceiveMaterialService.takeReceiveMaterial(
                formData
            );

            // Kabhi-kabhi axios response.data me hota hai, kabhi direct:
            const body = response?.data ?? response;

            if (response.success) {
                message.success(
                    body.message || 'Materials received successfully!'
                );
                setIsReceiveMaterialModalOpen(false);
                setSelectedPO(null);

                // PO list ko refresh karo (sirf Pending hi chahiye toh)
                dispatch(
                    fetchPurchaseOrders({
                        status: ["Pending", "Partially Received"],
                    })
                );

            } else {
                message.error(body.message || 'Failed to receive materials');
            }
        } catch (error) {
            console.error('Error receiving materials:', error);
            const backendMsg =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error.message;
            message.error(backendMsg || 'Error receiving materials');
        }
    };

    const handleModalCancel = () => {
        setIsReceiveMaterialModalOpen(false);
        setSelectedPO(null);
    };

    // 🔄 Loading state
    if (isLoading && !purchaseOrders.length) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <Spin />
            </div>
        );
    }

    // ❌ No pending POs
    if (!isLoading && (!purchaseOrders || purchaseOrders.length === 0)) {
        return (
            <div style={{ padding: 24 }}>
                <Title level={3} style={{ marginBottom: 8 }}>
                    Select Purchase Order
                </Title>
                <Empty description="No pending Purchase Orders found" />
            </div>
        );
    }

    return (
        <div style={{ padding: 24 }}>
            {/* Header */}
            <div style={{ marginBottom: 16 }}>
                <Title level={3} style={{ margin: 0 }}>
                    Select Purchase Order to Receive
                </Title>
                <Text type="secondary">
                    Outstanding Purchase Orders ({purchaseOrders.length})
                </Text>
            </div>

            {/* PO Cards List */}
            <div style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
                {purchaseOrders.map((po) => (
                    <Card
                        key={po._id}
                        size="small"
                        style={{
                            marginBottom: 12,
                            border: '1px solid #d9d9d9',
                            borderRadius: 6,
                            cursor: 'pointer',
                        }}
                        bodyStyle={{ padding: '12px 16px' }}
                        onClick={() => handlePurchaseOrderClick(po)} // poore card pe click
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                            }}
                        >
                            {/* Left side – main PO info */}
                            <div style={{ flex: 1 }}>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        marginBottom: 4,
                                    }}
                                >
                                    <Text strong style={{ fontSize: '14px' }}>
                                        {po?.poNumber}
                                    </Text>
                                </div>

                                <Text
                                    type="secondary"
                                    style={{
                                        fontSize: '12px',
                                        display: 'block',
                                        marginBottom: 4,
                                    }}
                                >
                                    {po?.supplier?.companyName}
                                </Text>

                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        marginBottom: 4,
                                    }}
                                >
                                    <CalendarOutlined
                                        style={{
                                            fontSize: '12px',
                                            color: '#8c8c8c',
                                            marginRight: 4,
                                        }}
                                    />
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        PO Date: {formatDate(po?.poDate)}
                                    </Text>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <ClockCircleOutlined
                                        style={{
                                            fontSize: '12px',
                                            color: '#8c8c8c',
                                            marginRight: 4,
                                        }}
                                    />
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        Need Date: {formatDate(po?.needDate)}
                                    </Text>
                                </div>
                            </div>

                            {/* Right side – button */}
                            {/* Right side – summary + button */}
                            <div
                                style={{
                                    minWidth: 160,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {/* 🔹 Item-Pending Summary */}
                                {po.items && (
                                    <Text
                                        type="secondary"
                                        style={{
                                            fontSize: '12px',
                                            marginBottom: 8,
                                            textAlign: 'center'
                                        }}
                                    >
                                        {po.items.filter(i => i.pendingQty > 0).length} / {po.items.length} items pending
                                    </Text>
                                )}

                                {/* 🔹 Centered button */}
                                <Button
                                    type="primary"
                                    size="small"
                                    style={{ fontSize: '12px' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePurchaseOrderClick(po);
                                    }}
                                >
                                    Click to Receive
                                </Button>
                            </div>

                        </div>
                    </Card>
                ))}
            </div>

            <Divider style={{ margin: '16px 0' }} />

            {/* Footer – optional */}
            <div style={{ textAlign: 'right' }}>
                {/* Agar kisi parent page pe back jaana ho toh yahan button laga sakte ho */}
                {/* <Button onClick={() => navigate(-1)}>Back</Button> */}
            </div>

            {/* 🔵 Sirf ek hi modal ab – ReceiveMaterialsModal */}
            <ReceiveMaterialsModal
                visible={isReceiveMaterialModalOpen}
                onCancel={handleModalCancel}
                onSubmit={handleReceiveSubmit}
                purchaseOrderData={selectedPO}
            />
        </div>
    );
};

export default PurchaseOrdersReceivePage;

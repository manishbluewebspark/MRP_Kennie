import React, { useState, useEffect } from 'react';
import { Modal, Card, Typography, Button, Table, Input, Select, Divider, Row, Col, Form, message, Tooltip } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { formatDate } from 'utils/formatDate';

const { Title, Text } = Typography;
const { Option } = Select;

const ReceiveMaterialsModal = ({ visible, onCancel, onSubmit, purchaseOrderData, closePO }) => {
  // console.log("closePO", closePO);
  // console.log("type", typeof closePO);
  const [form] = Form.useForm();
  const [receivedQuantities, setReceivedQuantities] = useState({});
  const [rejectedQuantities, setRejectedQuantities] = useState({});
  const [remarks, setRemarks] = useState({});


  // console.log('----purchaseOrderData', purchaseOrderData)
  // Initialize quantities when modal opens or purchaseOrderData changes
  useEffect(() => {
    if (visible && purchaseOrderData?.items) {
      const initialReceived = {};
      const initialRejected = {};
      const initialRemarks = {};

      purchaseOrderData.items.forEach(item => {
        const key = item._id || item.key;

        initialReceived[key] = '';
        initialRejected[key] = '';
        initialRemarks[key] = item.remarks || '';
      });

      setReceivedQuantities(initialReceived);
      setRejectedQuantities(initialRejected);
      setRemarks(initialRemarks);
    }
  }, [visible, purchaseOrderData]);

  // Table columns definition
  const columns = [
    {
      title: 'MPN',
      dataIndex: 'mpnData',
      key: 'mpn',
      width: 120,
      render: (mpnData, record) => (

        <div style={{ fontWeight: 500 }}>
          {mpnData?.MPN || record?.mpnData?.partNumber || 'N/A'}
        </div>

      )
    },
    {
      title: 'Manufacturer',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      width: 120,
      render: (text, record) => (
        <Text>{text || record?.mpnData?.manufacturer || 'N/A'}</Text>
      )
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
      render: (text, record) => (
        <Tooltip title={text}>
          <Text>{text}</Text>
        </Tooltip>
      )
    },
    {
      title: 'UOM',
      dataIndex: 'uomData',
      key: 'uom',
      width: 80,
      render: (uomData, record) => {
        const uomInfo = uomData || record?.uomDetails || {};
        const displayText = uomInfo.symbol || uomInfo.name || 'N/A';

        return (
          <div style={{
            padding: '4px 8px',
            backgroundColor: '#f0f7ff',
            border: '1px solid #d0e3ff',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#1890ff',
            textAlign: 'center',
            minWidth: '40px'
          }}>
            {displayText}
          </div>
        );
      }
    },
    {
      title: 'Ordered',
      dataIndex: 'qty',
      key: 'orderedQty',
      width: 100,
      align: 'center',
      render: (qty) => <Text strong>{qty}</Text>
    },
    {
  title: 'Last Received Qty',
  dataIndex: 'receivedQtyTotal',
  key: 'receivedQtyTotal',
  width: 120,
  align: 'center',
  render: (_, record) => (
    <Text strong>
      {Number(record?.lastReceivedQty || 0)}
    </Text>
  )
},
{
  title: 'Remaining Qty',
  key: 'remainingQty',
  width: 110,
  align: 'center',
  render: (_, record) => {
    const orderedQty = Number(record?.qty || 0);
    const receivedQty = Number(record?.receivedQtyTotal || 0);
    const rejectedQty = Number(record?.rejectedQtyTotal || 0);

    return (
      <Text strong>
        {Math.max(
          orderedQty - receivedQty - rejectedQty,
          0
        )}
      </Text>
    );
  }
},
    {
      title: 'Rejected Qty',
      dataIndex: 'rejectedQtyTotal',
      key: 'rejectedQtyTotal',
      width: 100,
      align: 'center',
      render: (rejectedQtyTotal) => <Text strong>{rejectedQtyTotal}</Text>
    },
    {
      title: 'Need Date',
      dataIndex: 'needDate',
      key: 'needDate',
      width: 110,
      render: (_, record) => formatDate(record?.needDate || purchaseOrderData?.needDate)
    },
    {
      title: 'Received Qty',
      dataIndex: 'receivedQty',
      key: 'receivedQty',
      width: 120,
      render: (_, record) => {
        const key = record._id || record.key;
        return (
          <Input
            type="number"
            // disabled={
            //   (
            //     Number(record?.receivedQtyTotal || 0) +
            //     Number(record?.rejectedQtyTotal || 0)
            //   ) >= Number(record?.qty || 0)
            // }
            placeholder="0"
            size="small"
            style={{ width: '100%' }}
            value={receivedQuantities[key] || ''}
            onChange={(e) => handleQuantityChange(key, 'received', e.target.value)}
            min={0}
            max={record.qty}
          />
        );
      },
    },
    {
      title: 'Rejected Qty',
      dataIndex: 'rejectedQty',
      key: 'rejectedQty',
      width: 120,
      render: (_, record) => {
        const key = record._id || record.key;
        return (
          <Input
            type="number"
            // disabled={
            //   (Number(record?.receivedQtyTotal || 0) +
            //     Number(record?.rejectedQtyTotal || 0)) >=
            //   Number(record?.qty || 0)
            // }
            placeholder="0"
            size="small"
            style={{ width: '100%' }}
            value={rejectedQuantities[key] || ''}
            onChange={(e) => handleQuantityChange(key, 'rejected', e.target.value)}
            min={0}
            max={record.qty}
          />
        );
      },
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
      key: 'remarks',
      width: 150,
      render: (_, record) => {
        const key = record._id || record.key;
        return (
          <Input
            // disabled={
            //   (Number(record?.receivedQtyTotal || 0) +
            //     Number(record?.rejectedQtyTotal || 0)) >=
            //   Number(record?.qty || 0)
            // }
            placeholder="Enter remarks"
            size="small"
            style={{ width: '100%' }}
            value={remarks[key] || ''}
            onChange={(e) => handleQuantityChange(key, 'remarks', e.target.value)}
          />
        );
      },
    },
  ];

  const handleQuantityChange = (key, type, value) => {
    if (type === 'received') {
      setReceivedQuantities(prev => ({
        ...prev,
        [key]: value
      }));
    } else if (type === 'rejected') {
      setRejectedQuantities(prev => ({
        ...prev,
        [key]: value
      }));
    } else if (type === 'remarks') {
      setRemarks(prev => ({
        ...prev,
        [key]: value
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      // Validate received quantities
      const itemsWithQuantities = purchaseOrderData?.items.filter(item => {
        const key = item._id || item.key;

        const currentReceivedQty =
          Number(receivedQuantities[key] || 0);

        const rejectedQty =
          Number(rejectedQuantities[key] || 0);

        return currentReceivedQty > 0 || rejectedQty > 0;
      });

      if (!itemsWithQuantities || itemsWithQuantities.length === 0) {
        message.error('Please enter received quantity for at least one item');
        return;
      }

      // Prepare items array
      const items = itemsWithQuantities.map(item => {
        const key = item._id || item.key;

        const lastReceivedQty = Number(item.receivedQtyTotal || 0);

        // User jo textbox me enter kar raha hai
        const currentReceivedQty = Number(receivedQuantities[key] || 0);

        const rejectedQty = Number(rejectedQuantities[key] || 0);

        const remark = remarks[key]?.trim() || '';

        // Remarks mandatory
        if (rejectedQty > 0 && !remark) {
          throw new Error(
            `Remarks is required for ${item.description}`
          );
        }

        // Received Qty Last Received se kam nahi ho sakti
        // if (currentReceivedQty < lastReceivedQty) {
        //   throw new Error(
        //     `${item.description}: Received Qty cannot be less than Last Received Qty (${lastReceivedQty})`
        //   );
        // }

        // Ordered Qty se jyada nahi ho sakti
        if (currentReceivedQty > Number(item.qty || 0)) {
          throw new Error(
            `${item.description}: Received Qty cannot exceed Ordered Qty (${item.qty})`
          );
        }

        // Actual qty received in this transaction
        const receivedQty = Math.max(
          currentReceivedQty - lastReceivedQty,
          0
        );

        if (receivedQty === 0 && rejectedQty === 0) {
          throw new Error(
            `${item.description}: Please enter Received Qty or Rejected Qty`
          );
        }

        return {
          mpnId: item.mpn,
          itemId: item._id,
          receivedQty,
          rejectedQty,
          description: item.description,
          orderedQty: item.qty,
          unitPrice: item.unitPrice,
          remarks: remark
        };
      });

      // Final submission data
      const submissionData = {
        purchaseOrderId: purchaseOrderData?._id,
        supplierId: purchaseOrderData?.supplier?._id,
        receivedBy: "user_id_here", // ✅ Actual user ID dalo
        items: items, // ✅ Yeh main field hai
        notes: `Materials received for PO: ${purchaseOrderData?.poNumber}`,
        receiveDate: new Date()
      };

      // console.log('Final Submission Data:', JSON.stringify(submissionData, null, 2));

      if (onSubmit) {
        await onSubmit(submissionData);
      }

    } catch (error) {
      console.error('Validation failed:', error);
      message.error(error.message || 'Failed to receive materials');
    }
  };

  const handleCancel = () => {
    // Reset form when canceling
    form.resetFields();
    setReceivedQuantities({});
    setRejectedQuantities({});
    setRemarks({});
    onCancel();
  };

  const handleClosePO = (id) => {
    if (typeof closePO === "function") {
      closePO(id);
    } else {
      console.error("closePO is not a function", closePO);
    }
  };

  // Prepare table data with proper keys
  const tableData = purchaseOrderData?.items?.map(item => ({
    ...item,
    key: item._id || item.key
  })) || [];


  const allItemsProcessed =
    purchaseOrderData?.items?.length > 0 &&
    purchaseOrderData.items.every((item) => {
      const processed =
        Number(item?.receivedQtyTotal || 0) +
        Number(item?.rejectedQtyTotal || 0);

      return processed >= Number(item?.qty || 0);
    });

  const hasPendingItems =
    purchaseOrderData?.items?.some((item) => {
      const processed =
        Number(item?.receivedQtyTotal || 0) +
        Number(item?.rejectedQtyTotal || 0);

      return processed < Number(item?.qty || 0);
    }) || false;

  const hasAnyActivity =
    purchaseOrderData?.items?.some((item) => {
      return (
        Number(item?.receivedQtyTotal || 0) > 0 ||
        Number(item?.rejectedQtyTotal || 0) > 0
      );
    }) || false;



  const isPOCompleted =
    purchaseOrderData?.items?.length > 0 &&
    purchaseOrderData.items.every((item) => {
      const ordered = Number(item?.qty || 0);

      const received = Number(item?.receivedQtyTotal || 0);

      const rejected = Number(item?.rejectedQtyTotal || 0);

      return (
        received >= ordered ||
        (received + rejected) >= ordered
      );
    });

// Determine if the current PO is a revision (ends with R + digits)
const isRevisedPO = /R\d+$/.test(String(purchaseOrderData?.poNumber || "").trim());

// Check if every line item has been fully accepted (accepted = ordered)
const isFullyAccepted =
  purchaseOrderData?.items?.length > 0 &&
  purchaseOrderData.items.every((item) => {
    const ordered = Number(item.qty || 0);
    const received = Number(item.receivedQtyTotal || 0);
    const rejected = Number(item.rejectedQtyTotal || 0);
    const accepted = received - rejected;
    return accepted === ordered;
  }) || false;

// Decide whether to allow manual closure
const canClosePO =
  purchaseOrderData?.status !== "Closed" &&
  (
    (isRevisedPO && isFullyAccepted) ||   // revision: must be fully accepted
    (!isRevisedPO && purchaseOrderData?.isRevision)         // original: allowed only if a revision exists
  );

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span>Receive Materials</span>
          <Text type="secondary" style={{ marginLeft: 8, fontSize: '14px' }}>
            - {purchaseOrderData?.poNumber}
          </Text>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={1300}
      style={{ top: 20 }}
    >
      <Form form={form} layout="vertical">
        {/* Purchase Order Header */}
        <Card
          size="small"
          style={{
            marginBottom: 16,
            border: '1px solid #d9d9d9',
            borderRadius: 6,
          }}
          bodyStyle={{ padding: '12px 16px' }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <div style={{ marginBottom: 8 }}>
                <Text strong style={{ fontSize: '14px' }}>
                  PO Number: {purchaseOrderData?.poNumber}
                </Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <CalendarOutlined style={{ fontSize: '12px', color: '#8c8c8c', marginRight: 4 }} />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  PO Date: {formatDate(purchaseOrderData?.poDate)}
                </Text>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 8 }}>
                <Text strong style={{ fontSize: '14px' }}>
                  Supplier: {purchaseOrderData?.supplier?.companyName}
                </Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <CalendarOutlined style={{ fontSize: '12px', color: '#8c8c8c', marginRight: 4 }} />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Need Date: {formatDate(purchaseOrderData?.needDate)}
                </Text>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 8 }}>
                <Text strong>Status: </Text>
                <Text type="secondary">{purchaseOrderData?.status}</Text>
              </div>
              <div>
                <Text strong>Reference: </Text>
                <Text type="secondary">{purchaseOrderData?.referenceNo || 'N/A'}</Text>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Materials Table */}
        <div style={{ marginBottom: 24 }}>
          <Table
            columns={columns}
            dataSource={tableData}
            pagination={false}
            size="small"
            scroll={{ x: 1000 }}
            style={{
              border: '1px solid #d9d9d9',
              borderRadius: 6,
            }}
          />
        </div>

        <Divider style={{ margin: '16px 0' }} />

        {/* Footer Buttons */}
        <div style={{ textAlign: "right" }}>
          <Button
            onClick={handleCancel}
            style={{ marginRight: 8 }}
          >
            Cancel
          </Button>

          {canClosePO && (
            <Button
              danger
              onClick={() => handleClosePO(purchaseOrderData?._id)}
              style={{ marginRight: 8 }}
            >
              Close PO
            </Button>
          )}

          <Button
            type="primary"
            onClick={handleSubmit}
            // disabled={
            //   isPOCompleted ||
            //   purchaseOrderData?.status === "Closed"
            // }
          >
            Receive Materials
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default ReceiveMaterialsModal;
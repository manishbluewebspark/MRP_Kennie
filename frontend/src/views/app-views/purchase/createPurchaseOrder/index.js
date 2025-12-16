// src/pages/purchase/PurchaseOrderForm.jsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Row,
  Col,
  Divider,
  Typography,
  InputNumber,
  Table,
  message,
} from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';

import { fetchAllMpn } from 'store/slices/librarySlice';
import { fetchSuppliers } from 'store/slices/supplierSlice';
import PurchaseOrderService from 'services/PurchaseOrderService';
import { fetchWorkOrders } from 'store/slices/workOrderSlice';
import { getAllPurchaseSettings } from 'store/slices/purchaseSettingSlice';
import { getAllUOMs } from 'store/slices/uomSlice';
import { fetchSystemSettings } from 'store/slices/systemSettingsSlice';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

/** ---------- helpers (numeric safe) ---------- */
const n = (v, d = 0) => {
  const num = Number(v);
  return Number.isFinite(num) ? num : d;
};
const itemExt = (qty, unit, disc) => {
  const q = n(qty),
    u = n(unit),
    d = n(disc);
  return q * u * (1 - d / 100);
};

// simple blank row (idNumber set later)
const blankItem = () => ({
  key: Date.now().toString(),
  idNumber: '',
  description: '',
  mpn: '',
  manufacturer: '',
  uom: '',
  qty: 1,
  unitPrice: 0,
  discPercentage: 0,
});

// 🔹 PO Item Number generator: 0001, 0002, 0003 ...
const generatePOItemNumber = (existingNumbers = []) => {
  const set = new Set((existingNumbers || []).filter(Boolean));
  let num = 1;
  let nextNo = '';

  do {
    nextNo = String(num).padStart(4, '0'); // "0001", "0002", ...
    num++;
  } while (set.has(nextNo));

  return nextNo;
};

const PurchaseOrderForm = () => {
  const location = useLocation();

  // 🔹 Shortage → PO flags & data
  const fromShortage = location.state?.fromShortage || false;
  const shortageItems = location.state?.shortageItems || [];
  const shortageSupplierId = location.state?.supplier || null;

  console.log('-------location.state', location?.state);

  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams(); // edit id

  const [loading, setLoading] = useState(false);
  const isEditMode = !!id;

  // 🔹 start with empty; we’ll fill later
  const [orderItems, setOrderItems] = useState([]);
  const [prefilledFromShortage, setPrefilledFromShortage] = useState(false);

  // redux state
  const { librarys } = useSelector((state) => state);
  const { suppliers } = useSelector((state) => state.suppliers);
  const { data: workOrders } = useSelector((state) => state.workOrders);
  const { purchaseSettings } = useSelector((state) => state.purchaseSettings);
  const { uoms } = useSelector((state) => state.uoms);
  const [lastPOOrderNumber, setLastPOOrderNumber] = useState([]);
  const { workOrderSettings } = useSelector(
    (state) => state.systemSettings
  );

  console.log('---workOrderSettings', workOrderSettings)
  /** ---------- totals as numbers ---------- */
  const calcTotals = () => {
    const sub = orderItems.reduce((sum, it) => {
      return sum + itemExt(it.qty, it.unitPrice, it.discPercentage);
    }, 0);
    const freight = n(form.getFieldValue('freightAmount'));
    const gstPercent = Number(workOrderSettings?.gstSettings?.gstPercentage || 0);
    const ostTax = sub * (gstPercent / 100);

    const finalAmount = sub + freight + ostTax;
    return {
      subTotalAmount: sub,
      freightAmount: freight,
      ostTax,
      finalAmount,
    };
  };
  const totals = calcTotals();

  /** ---------- columns ---------- */
  const orderItemsColumns = [
    {
      title: 'Item No',
      dataIndex: 'idNumber',
      key: 'idNumber',
      width: 100,
      render: (text) => (
        <Input
          size="small"
          value={text}
          disabled
          style={{ textAlign: 'center', background: '#fafafa' }}
        />
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 220,
      render: (text, record) => (
        <Input
          size="small"
          value={record.description}
          onChange={(e) => handleItemChange(record.key, 'description', e.target.value)}
        />
      ),
    },
    {
      title: 'MPN',
      dataIndex: 'mpn',
      key: 'mpn',
      width: 220,
      render: (text, record) => (
        <Select
          placeholder="Select"
          value={record.mpn} // store _id
          onChange={(value) => handleItemChange(record.key, 'mpn', value)}
          style={{ width: '100%' }}
          showSearch
          optionFilterProp="children"
          size="small"
        >
          {librarys?.mpnList?.map((opt) => (
            <Option key={opt._id} value={opt._id}>
              {opt.MPN}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Manufacturer',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      width: 160,
      render: (text, record) => (
        <Input
          size="small"
          value={record.manufacturer}
          onChange={(e) => handleItemChange(record.key, 'manufacturer', e.target.value)}
        />
      ),
    },
    {
      title: 'UOM',
      dataIndex: 'uom',
      key: 'uom',
      width: 140,
      render: (text, record) => (
        <Select
          placeholder="Select"
          size="small"
          style={{ width: '100%' }}
          value={record.uom} // store _id
          onChange={(value) => handleItemChange(record.key, 'uom', value)}
        >
          {uoms?.map((u) => (
            <Option key={u._id} value={u._id}>
              {u.code}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'qty',
      key: 'qty',
      width: 90,
      render: (text, record) => (
        <InputNumber
          size="small"
          min={0}
          value={record.qty}
          onChange={(v) => handleItemChange(record.key, 'qty', n(v))}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 120,
      render: (text, record) => (
        <InputNumber
          size="small"
          min={0}
          step={0.01}
          value={record.unitPrice}
          onChange={(v) => handleItemChange(record.key, 'unitPrice', n(v))}
          style={{ width: '100%' }}
          formatter={(v) => (v === undefined || v === null ? '' : `$ ${v}`)}
          parser={(v) => (v ? String(v).replace('$', '').trim() : 0)}
        />
      ),
    },
    {
      title: 'Disc %',
      dataIndex: 'discPercentage',
      key: 'discPercentage',
      width: 100,
      render: (text, record) => (
        <InputNumber
          size="small"
          min={0}
          max={100}
          value={record.discPercentage}
          onChange={(v) => handleItemChange(record.key, 'discPercentage', n(v))}
          style={{ width: '100%' }}
          formatter={(v) => (v === undefined || v === null ? '' : `${v}%`)}
          parser={(v) => (v ? String(v).replace('%', '').trim() : 0)}
        />
      ),
    },
    {
      title: 'Ext. Price',
      key: 'extPrice',
      width: 120,
      render: (_, record) => {
        const ext = itemExt(record.qty, record.unitPrice, record.discPercentage);
        return `$${ext.toFixed(2)}`;
      },
    },
    {
      title: '',
      key: 'actions',
      width: 40,
      render: (_, record) => (
        <MinusCircleOutlined
          onClick={() => handleRemoveItem(record.key)}
          style={{ color: '#ff4d4f', cursor: 'pointer' }}
        />
      ),
    },
  ];

  /** ---------- Last PO number from backend ---------- */
  const getLastPurachseOrderNumber = async () => {
    try {
      const res = await PurchaseOrderService.getLastPurachseOrderNumber();
      if (res?.data) {
        console.log('Last PO Number:', res.data);
        setLastPOOrderNumber([res.data]); // store as array
      }
    } catch (e) {
      console.error('Error fetching last PO number:', e);
    }
  };

  useEffect(() => {
    getLastPurachseOrderNumber();
  }, []);

  /** ---------- effects: load redux data ---------- */
  useEffect(() => {
    dispatch(fetchAllMpn());
    dispatch(fetchSuppliers());
    dispatch(fetchWorkOrders());
    dispatch(getAllPurchaseSettings());
    dispatch(getAllUOMs());
    dispatch(fetchSystemSettings())
  }, [dispatch]);

  /** ---------- prefill settings safely ---------- */
  useEffect(() => {
    const ps = Array.isArray(purchaseSettings) ? purchaseSettings[0] : null;
    form.setFieldsValue({
      shipToAddress: ps?.addresses?.[0]?.fullAddress || '',
      termsConditions: ps?.defaultTerms || '',
    });
  }, [purchaseSettings, form]);

  /** ---------- init / edit ---------- */
  useEffect(() => {
    if (isEditMode) {
      loadForEdit(id);
    } else {
      // new PO → generate number from lastPOOrderNumber
      form.setFieldsValue({
        poNumber: generatePONumber(lastPOOrderNumber),
        freightAmount: 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, id, lastPOOrderNumber]);

  const loadForEdit = async (poId) => {
    setLoading(true);
    try {
      const res = await PurchaseOrderService.getPurchaseOrderById(poId);
      const po = res?.data || res;

      form.setFieldsValue({
        poNumber: po.poNumber,
        poDate: po.poDate ? dayjs(po.poDate) : null,
        referenceNo: po.referenceNo,
        workOrderNo: po.workOrderNo?._id || po.workOrderNo || undefined,
        needDate: po.needDate ? dayjs(po.needDate) : null,
        supplier: po.supplier?._id || po.supplier,
        shipToAddress: po.shipToAddress,
        termsConditions: po.termsConditions,
        freightAmount: n(po?.totals?.freightAmount),
      });

      const items = (po.items || []).map((it, idx) => ({
        key: String(it._id || `${it.mpn}-${Math.random()}`),
        idNumber: it.idNumber || String(idx + 1).padStart(4, '0'),
        description: it.description || '',
        mpn: it.mpn?._id || it.mpn || '', // id
        manufacturer: it.manufacturer || '',
        uom: it.uom?._id || it.uom || '', // id
        qty: n(it.qty, 1),
        unitPrice: n(it.unitPrice, 0),
        discPercentage: n(it.discount, 0),
      }));
      setOrderItems(items.length ? items : []);
    } catch (e) {
      message.error('Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  };

  /** ---------- prefill supplier when fromShortage ---------- */
  useEffect(() => {
    if (!isEditMode && fromShortage && shortageSupplierId && suppliers?.length) {
      const exists = suppliers.some((s) => String(s._id) === String(shortageSupplierId));
      if (exists) {
        form.setFieldsValue({ supplier: shortageSupplierId });
      }
    }
  }, [isEditMode, fromShortage, shortageSupplierId, suppliers, form]);

  /** ---------- prefill items when fromShortage ---------- */
  useEffect(() => {
    if (
      !isEditMode &&
      fromShortage &&
      !prefilledFromShortage &&
      Array.isArray(shortageItems) &&
      shortageItems.length &&
      librarys?.mpnList?.length
    ) {
      const existingNos = [];
      const mapped = shortageItems.map((item, idx) => {
        const lib =
          librarys.mpnList.find((m) => String(m._id) === String(item.mpnId)) || null;

        // resolve UOM id
        let uomId = '';
        if (lib?.UOM?._id) {
          uomId = lib.UOM._id;
        } else if (item.uom && Array.isArray(uoms) && uoms.length) {
          const matchUom = uoms.find(
            (u) => u.code === item.uom || u.name === item.uom
          );
          if (matchUom) uomId = matchUom._id;
        }

        const idNumber = generatePOItemNumber(existingNos);
        existingNos.push(idNumber);

        return {
          key: `${item.mpnId}-${idx}`,
          idNumber,
          description: (lib && lib.Description) || item.description || '',
          mpn: item.mpnId,
          manufacturer: (lib && lib.Manufacturer) || item.manufacturer || '',
          uom: uomId || '',
          qty: n(item.shortage ?? item.required ?? 1, 1),
          unitPrice: n(lib?.RFQUnitPrice, 0),
          discPercentage: 0,
        };
      });

      setOrderItems(mapped.length ? mapped : []);
      setPrefilledFromShortage(true);
    }
  }, [isEditMode, fromShortage, prefilledFromShortage, shortageItems, librarys, uoms]);

  /** ---------- default first blank row (non-shortage new PO) ---------- */
  useEffect(() => {
    if (!isEditMode && !fromShortage && orderItems.length === 0) {
      const idNumber = generatePOItemNumber([]);
      setOrderItems([
        {
          ...blankItem(),
          idNumber,
        },
      ]);
    }
  }, [isEditMode, fromShortage, orderItems.length]);

  /** ---------- item ops ---------- */
  const handleAddItem = () => {
    setOrderItems((prev) => {
      const existingNos = prev.map((i) => i.idNumber).filter(Boolean);
      const newNo = generatePOItemNumber(existingNos);
      const newKey = Date.now().toString();

      return [
        ...prev,
        {
          key: newKey,
          idNumber: newNo,
          description: '',
          mpn: '',
          manufacturer: '',
          uom: '',
          qty: 1,
          unitPrice: 0,
          discPercentage: 0,
        },
      ];
    });
  };

  const handleRemoveItem = (key) => {
    setOrderItems((prev) => {
      if (prev.length <= 1) {
        message.warning('At least one item is required');
        return prev;
      }
      return prev.filter((i) => i.key !== key);
    });
  };

  const handleItemChange = (key, field, value) => {
    setOrderItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        let updated = { ...item, [field]: value };

        // when MPN changes, auto-fill from library
        if (field === 'mpn') {
          const match = librarys?.mpnList?.find((m) => m._id === value);
          if (match) {
            const uomId =
              match?.UOM?._id || match?.UOM?.name || updated.uom || '';
            updated = {
              ...updated,
              description: match.Description || '',
              manufacturer: match.Manufacturer || '',
              uom: uomId,
              qty: 1,
              unitPrice: n(match.RFQUnitPrice, 0),
              discPercentage: 0,
            };
          }
        }
        return updated;
      })
    );
  };

  /** ---------- PO number ---------- */
  const generatePONumber = (existing = []) => {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');

    const monthPOs = existing
      .filter((po) => po.startsWith(`P${yy}-${mm}`))
      .map((po) => parseInt(po.slice(-5), 10))
      .filter((n2) => !isNaN(n2));

    const next = monthPOs.length ? Math.max(...monthPOs) + 1 : 1;

    return `P${yy}-${mm}-${String(next).padStart(5, '0')}`;
  };

  /** ---------- submit ---------- */
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const items = orderItems.map((i) => {
        const qty = n(i.qty);
        const unit = n(i.unitPrice);
        const disc = n(i.discPercentage);
        return {
          idNumber: i.idNumber || '',
          description: i.description || '',
          mpn: i.mpn || null, // id
          manufacturer: i.manufacturer || '',
          uom: i.uom || null, // id
          qty,
          unitPrice: unit,
          discPercentage: disc,
          extPrice: itemExt(qty, unit, disc),
        };
      });

      const totalsNum = calcTotals();

      const payload = {
        ...values,
        poDate: values.poDate ? values.poDate.format('YYYY-MM-DD') : null,
        needDate: values.needDate ? values.needDate.format('YYYY-MM-DD') : null,
        supplier: values.supplier || null,
        workOrderNo: values.workOrderNo || null,
        freightAmount: n(values.freightAmount),
        items,
        totals: {
          subTotalAmount: totalsNum.subTotalAmount,
          freightAmount: totalsNum.freightAmount,
          ostTax: totalsNum.ostTax,
          finalAmount: totalsNum.finalAmount,
        },
      };

      if (isEditMode) {
        await PurchaseOrderService.updatePurchaseOrder(id, payload);
        message.success('Purchase order updated successfully');
      } else {
        await PurchaseOrderService.addPurchaseOrder(payload);
        message.success('Purchase order created successfully');
      }
      navigate('/app/purchase/purchase-order');
    } catch (e) {
      message.error(e?.message || 'Failed to save purchase order');
    } finally {
      setLoading(false);
    }
  };

  /** ---------- UI ---------- */
  return (
    <div style={{ padding: 24 }}>
      <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={loading}>
        <Card style={{ marginBottom: 24 }} loading={loading}>
          <div style={{ marginBottom: 16 }}>
            <Title level={2} style={{ margin: 0, fontSize: 24 }}>
              {isEditMode ? 'Edit Purchase Order' : 'Create Purchase Order'}
            </Title>
            <Text type="secondary">
              Purchase order details and supplier information
            </Text>
          </div>

          <Row gutter={16}>
            <Col span={8}>
              <Title level={4} style={{ fontSize: 16 }}>
                PO Number
              </Title>
              <Form.Item name="poNumber" rules={[{ required: true }]}>
                <Input placeholder="Enter number" size="large" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Title level={4} style={{ fontSize: 16 }}>
                PO Date
              </Title>
              <Form.Item name="poDate" rules={[{ required: true }]}>
                <DatePicker size="large" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Title level={4} style={{ fontSize: 16 }}>
                Supplier
              </Title>
              <Form.Item name="supplier" rules={[{ required: true }]}>
                <Select
                  placeholder="Select Supplier"
                  size="large"
                  showSearch
                  optionFilterProp="children"
                  disabled={fromShortage && !isEditMode} // lock when from shortage
                >
                  {suppliers?.map((s) => (
                    <Option key={s._id} value={s._id}>
                      {s.companyName}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Text type="secondary">Reference No</Text>
              <Form.Item name="referenceNo">
                <Input placeholder="Enter number" size="large" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Text type="secondary">Need Date</Text>
              <Form.Item name="needDate">
                <DatePicker size="large" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Title level={4} style={{ fontSize: 16 }}>
                Work Order No
              </Title>
              <Form.Item name="workOrderNo" rules={[{ required: true }]}>
                <Select
                  placeholder="Select Work Order"
                  size="large"
                  showSearch
                  optionFilterProp="children"
                >
                  {workOrders?.map((w) => (
                    <Option key={w._id} value={w._id}>
                      {w.workOrderNo}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Title level={4} style={{ fontSize: 16 }}>
            Ship To Address
          </Title>
          <Form.Item name="shipToAddress">
            <TextArea rows={3} style={{ resize: 'none' }} />
          </Form.Item>

          <Title level={4} style={{ fontSize: 16 }}>
            Terms & Conditions
          </Title>
          <Form.Item name="termsConditions">
            <TextArea rows={3} style={{ resize: 'none' }} />
          </Form.Item>
        </Card>

        <Divider />

        <Card>
          <div style={{ marginBottom: 16 }}>
            <Title level={2} style={{ margin: 0, fontSize: 24 }}>
              PO Items
            </Title>
            <Text type="secondary">Purchase order items and pricing</Text>
          </div>

          <Table
            columns={orderItemsColumns}
            dataSource={orderItems}
            pagination={false}
            size="small"
            scroll={{ x: 1000 }}
            rowKey="key"
            footer={() => (
              <Button
                type="dashed"
                onClick={handleAddItem}
                icon={<PlusOutlined />}
                style={{ width: '100%' }}
              >
                Add Item
              </Button>
            )}
          />

          <div
            style={{
              background: '#fafafa',
              padding: 16,
              borderRadius: 6,
              marginTop: 24,
            }}
          >
            <Title level={4} style={{ fontSize: 16 }}>
              Order Totals
            </Title>

            <Row gutter={24} style={{ marginBottom: 12 }}>
              <Col span={24}>
                <Text strong>Freight Amount:</Text>
                <Form.Item name="freightAmount" style={{ marginBottom: 0 }}>
                  <InputNumber
                    min={0}
                    size="small"
                    style={{ width: '100%', marginTop: 4 }}
                    formatter={(v) =>
                      v === undefined || v === null ? '' : `$ ${v}`
                    }
                    parser={(v) =>
                      v ? String(v).replace('$', '').trim() : 0
                    }
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '16px 0' }} />

            <Row gutter={16} style={{ marginBottom: 8 }}>
              <Col span={12}>
                <Text strong>Sub-Total Amount:</Text>
              </Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                ${totals.subTotalAmount.toFixed(2)}
              </Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 8 }}>
              <Col span={12}>
                <Text>Freight Amount:</Text>
              </Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                ${totals.freightAmount.toFixed(2)}
              </Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 8 }}>
              <Col span={12}>
                <Text>GST Tax ({workOrderSettings?.gstSettings?.gstPercentage}%):</Text>
              </Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                ${totals.ostTax.toFixed(2)}
              </Col>
            </Row>

            <Divider style={{ margin: '16px 0' }} />

            <Row gutter={16}>
              <Col span={12}>
                <Text strong style={{ fontSize: 16 }}>
                  Final Amount:
                </Text>
              </Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                <Text strong style={{ fontSize: 16, color: '#1890ff' }}>
                  ${totals.finalAmount.toFixed(2)}
                </Text>
              </Col>
            </Row>
          </div>
        </Card>

        <div
          style={{
            display: 'flex',
            justifyContent: 'end',
            gap: 10,
            padding: '16px 0',
          }}
        >
          <Button
            size="large"
            onClick={() => navigate('/app/purchase/purchase-order')}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            loading={loading}
          >
            {isEditMode ? 'Update Purchase Order' : 'Create Purchase Order'}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default PurchaseOrderForm;

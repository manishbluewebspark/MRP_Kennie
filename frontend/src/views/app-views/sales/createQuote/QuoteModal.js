// QuoteModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, Card, Checkbox, Input, Button, List, Typography, Space, Table, Col, Row,
  message
} from 'antd';
import { SearchOutlined, EditOutlined, FilterOutlined } from '@ant-design/icons';
import GlobalFilterModal from 'components/GlobalFilterModal';
import ProjectService from 'services/ProjectService';
import DrawingService from 'services/DrawingService';

const { Title, Text } = Typography;

function safeNumber(n, def = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : def;
}
const unitFromDrawing = (d) =>
  safeNumber(d?.costingSummary?.grandTotalWithMarkup ?? d?.unitPrice ?? d?.price ?? 0);

const QuoteModal = ({
  open,
  onClose,
  onQuoteCreated,
  customer,
  drawings = [],
  customers = [],
  editingQuote = null,
}) => {
  const isEditMode = !!editingQuote;

  const [searchText, setSearchText] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [projectData, setProjectData] = useState([]);
  const [drawingList, setDrawingList] = useState(drawings); // local mutable copy

  // Selected state
  const [selectedIds, setSelectedIds] = useState([]);          // array<string>
  const [qtyMap, setQtyMap] = useState({});                    // { [id]: number }
  const [priceMap, setPriceMap] = useState({});                // { [id]: number }

  // Normalize drawings to a uniform shape for rendering
  const normalizedDrawings = useMemo(() => {
    return (drawingList || []).map((d) => ({
      id: d._id || d.id,
      drawingNumber: d.drawingNo || d.drawingNumber || '—',
      tool: d.description || d.tool || '—',
      baseQty: safeNumber(d.qty, 1),
      unitPriceDefault: unitFromDrawing(d), // default price shown/used
      raw: d,
    })).filter(d => !!d.id);
  }, [drawingList]);

  // Fetch customer drawings on customer change (add mode)
  useEffect(() => {
    if (!open) return;
    if (isEditMode) return; // in edit, we already fetched by parent

    const fetchByCustomer = async () => {
      const id = customer?._id;
      if (!id) { setDrawingList(drawings || []); return; }
      try {
        const res = await DrawingService.getAllDrawings({ customerId: id });
        setDrawingList(res?.data || []);
      } catch (e) {
        console.error('Failed to fetch drawings:', e);
        setDrawingList([]);
      }
    };
    fetchByCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customer?._id]);

  // If parent prop 'drawings' changes (edit or add), sync local list
  useEffect(() => {
    setDrawingList(drawings || []);
  }, [drawings]);

  // Prefill edit mode selections (items from editingQuote)
  useEffect(() => {
    if (!open) return;
    if (!isEditMode || !editingQuote) {
      // reset in add mode
      setSelectedIds([]);
      setQtyMap({});
      setPriceMap({});
      return;
    }

    const items = Array.isArray(editingQuote.items) ? editingQuote.items : [];
    const ids = [];
    const q = {};
    const p = {};
    items.forEach((it) => {
      const id = it?.drawingId?._id || it?.drawingId; // support both populated and plain id
      if (!id) return;
      ids.push(id);
      q[id] = safeNumber(it?.quantity, 1);
      // unitPrice: prefer saved item.unitPrice; else fallback from costingSummary if present
      const savedUnit = safeNumber(
        it?.unitPrice ?? it?.costingSummary?.grandTotalWithMarkup,
        0
      );
      p[id] = savedUnit;
    });
    setSelectedIds(ids);
    setQtyMap(q);
    setPriceMap(p);
  }, [open, isEditMode, editingQuote]);

  // Search + filtering
  const filtered = useMemo(() => {
    const s = (searchText || '').toLowerCase();
    if (!s) return normalizedDrawings;
    return normalizedDrawings.filter(
      (d) =>
        d.drawingNumber.toLowerCase().includes(s) ||
        d.tool.toLowerCase().includes(s)
    );
  }, [normalizedDrawings, searchText]);

  // Select single
  const toggleSelect = (id, checked) => {
    if (checked) {
      setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      // set defaults if not present
      setQtyMap((prev) => ({ ...prev, [id]: prev[id] ?? (normalizedDrawings.find(x => x.id === id)?.baseQty || 1) }));
      setPriceMap((prev) => ({ ...prev, [id]: prev[id] ?? (normalizedDrawings.find(x => x.id === id)?.unitPriceDefault || 0) }));
    } else {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      // keep qty/price (so re-check keeps last edits). If you want to clear, uncomment:
      // setQtyMap(prev => { const x = {...prev}; delete x[id]; return x; });
      // setPriceMap(prev => { const x = {...prev}; delete x[id]; return x; });
    }
  };

  // Select all on filtered view
  const toggleSelectAll = (checked) => {
    if (checked) {
      const allIds = filtered.map((d) => d.id);
      setSelectedIds(allIds);
      setQtyMap((prev) => {
        const next = { ...prev };
        filtered.forEach((d) => {
          if (next[d.id] == null) next[d.id] = d.baseQty || 1;
        });
        return next;
      });
      setPriceMap((prev) => {
        const next = { ...prev };
        filtered.forEach((d) => {
          if (next[d.id] == null) next[d.id] = d.unitPriceDefault || 0;
        });
        return next;
      });
    } else {
      setSelectedIds([]);
    }
  };

  const totals = useMemo(() => {
    const totalDrawings = selectedIds.length;
    const totalQuantity = selectedIds.reduce((s, id) => s + safeNumber(qtyMap[id], 0), 0);
    const totalQuoteValue = selectedIds.reduce((s, id) => {
      const qty = safeNumber(qtyMap[id], 0);
      const price = safeNumber(priceMap[id], 0);
      return s + qty * price;
    }, 0);
    return { totalDrawings, totalQuantity, totalQuoteValue };
  }, [selectedIds, qtyMap, priceMap]);

  const handleSubmit = () => {
    // Build items from selected rows
    const items = selectedIds.map((id) => {
      const d = normalizedDrawings.find((x) => x.id === id);
      const quantity = safeNumber(qtyMap[id], d?.baseQty || 1);
      const unitPrice = safeNumber(priceMap[id], d?.unitPriceDefault || 0);
      return {
        drawingId: id,
        drawingNumber: d?.drawingNumber,
        tool: d?.tool,
        unitPrice,
        quantity,
        totalPrice: quantity * unitPrice,
      };
    });

    if (isEditMode) {
      // Return a complete quote ready for update
      const updated = {
        ...editingQuote,
        customerId: editingQuote.customerId?._id || editingQuote.customerId,
        items,
        totalDrawings: totals.totalDrawings,
        totalQuantity: totals.totalQuantity,
        totalQuoteValue: totals.totalQuoteValue,
      };
      onQuoteCreated?.(updated);
    } else {
      // Return items only (CreateQuote will wrap them)
      onQuoteCreated?.(items);
    }
  };

  // const handleFilterSubmit = async (data) => {
  //   console.log('--------Quote Management',data)
  //   try {
  //     const res = await DrawingService.getAllDrawings({ projectId: data?.project });
  //     setDrawingList(res?.data || []);
  //   } catch (e) {
  //     console.error(e);
  //   } finally {
  //     setFilterVisible(false);
  //   }
  // };

    const handleFilterSubmit = async (filterData) => {
   
    try {
      setFilterVisible(false);
      console.log("-------filter", filterData);

      // prepare params
      const queryParams = {};

      if (filterData.drawingName) queryParams.drawingName = filterData.drawingName;
      if (filterData.project) queryParams.projectId = filterData.project;
      if (filterData.customer) queryParams.customerId = filterData.customer;
      if (filterData.quoteStatus) queryParams.quoteStatus = filterData.quoteStatus;
      if (filterData.lastEditedBy) queryParams.lastEditedBy = filterData.lastEditedBy;

      if (filterData.drawingDateRange && Array.isArray(filterData.drawingDateRange)) {
        const [start, end] = filterData.drawingDateRange;

        if (start && end) {
          queryParams.drawingDate = {
            $gte: new Date(start),
            $lte: new Date(end),
          };
        } else if (start) {
          queryParams.drawingDate = { $gte: new Date(start) };
        } else if (end) {
          queryParams.drawingDate = { $lte: new Date(end) };
        }
      }

      if (filterData?.min != null && filterData?.max != null) {
        const from = filterData?.min?.toString().trim() || "";
        const to = filterData?.max?.toString().trim() || "";
        queryParams.drawingRange = `${from}-${to}`;
      }

      //     if (filterData?.min != null) {
      //   queryParams.drawingRange = filterData?.min;
      // }
      // if (filterData?.max != null) {
      //   queryParams.drawingNoSuffixMax = filterData?.max;
      // }




      // ✅ Fetch directly via service
      const response = await DrawingService.getAllDrawings(queryParams);

    setDrawingList(response?.data || []);

      message.success(`Found ${response?.data?.length} drawings matching filters`);
    } catch (error) {
      console.error("Error applying filters:", error);
      message.error("Error applying filters");
    } finally {
      setFilterVisible(false);
    }
  };

  // fetch projects for filter
  useEffect(() => {
    const run = async () => {
      try {
        const r = await ProjectService.getAllProjects();
        const body = r?.data ?? r;
        const list = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
        setProjectData(list);
      } catch (e) {
        console.error(e);
      }
    };
    run();
  }, []);

  const filterConfig = [
    {
      type: 'dateRange',
      name: 'drawingDateRange',
      label: 'Drawing Date Range',
      placeholder: ['Start Date']
    },
    {
      type: 'select',
      name: 'project',
      label: 'Project',
      placeholder: 'Select Project',
      options: projectData.map((p) => ({ value: p._id, label: p.projectName })),
    },
    {
      type: 'range',
      name: 'drawingRange',
      label: 'Drawing Range',
      placeholder: 'Enter Range'
    }
  ];

  const summaryData = [
    { key: '1', metric: 'Total Drawings', value: totals.totalDrawings },
    { key: '2', metric: 'Total Quantity', value: totals.totalQuantity },
    { key: '3', metric: 'Total Quote Value', value: `$${totals.totalQuoteValue.toFixed(2)}` },
  ];
  const summaryCols = [
    { title: '', dataIndex: 'metric', key: 'metric', render: (t) => <Text strong>{t}</Text> },
    { title: '', dataIndex: 'value', key: 'value', render: (v) => <Text strong>{v}</Text> },
  ];

  const isAllChecked = filtered.length > 0 && selectedIds.length === filtered.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < filtered.length;

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={900} style={{ top: 20 }} bodyStyle={{ padding: 0 }} destroyOnClose>
      <div style={{ padding: '24px 24px 0 24px' }}>
        <Title level={3} style={{ marginBottom: 8, fontSize: 20 }}>
          Cable Harness/Assembly Quote {isEditMode ? '— Edit' : ''}
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          Quote for <Text strong>{customer?.companyName || '—'}</Text>
        </Text>
      </div>

      <div style={{ padding: 24 }}>
        <Card
          title={`Drawings (${filtered.length} available)`}
          style={{ marginBottom: 24 }}
          extra={
            <Checkbox checked={isAllChecked} indeterminate={isIndeterminate} onChange={(e) => toggleSelectAll(e.target.checked)}>
              Select All
            </Checkbox>
          }
        >
          <Row gutter={[12, 12]} style={{ marginBottom: 16, width: '100%' }} align="middle">
            <Col xs={24} sm={18}>
              <Input
                placeholder="Search drawings by number or description..."
                prefix={<SearchOutlined />}
                size="small"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={24} sm={6}>
              <Button type="primary" icon={<FilterOutlined />} size="small" block onClick={() => setFilterVisible(true)}>
                Filter
              </Button>
            </Col>
          </Row>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>No drawings found</div>
          ) : (
            <List
              dataSource={filtered}
              renderItem={(d) => {
                const checked = selectedIds.includes(d.id);
                const qty = safeNumber(qtyMap[d.id], d.baseQty || 1);
                const price = safeNumber(priceMap[d.id], d.unitPriceDefault || 0);
                const total = qty * price;

                return (
                  <List.Item style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <List.Item.Meta
                      avatar={
                        <Checkbox checked={checked} onChange={(e) => toggleSelect(d.id, e.target.checked)} />
                      }
                      title={<Text strong style={{ fontSize: 14 }}>{d.drawingNumber}</Text>}
                      description={<Text type="secondary" style={{ fontSize: 12 }}>{d.tool}</Text>}
                    />
                    <Space direction="vertical" style={{ textAlign: 'right' }}>
                      <Text strong style={{ fontSize: 16 }}>${price.toFixed(2)}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Qty: {qty} × ${price.toFixed(2)} = <b>${total.toFixed(2)}</b>
                      </Text>
                    </Space>
                  </List.Item>
                );
              }}
            />
          )}
        </Card>

        <Card title={<Text strong>Quote Summary</Text>} style={{ marginBottom: 24 }}>
          <Table dataSource={summaryData} columns={summaryCols} pagination={false} showHeader={false} size="small" />
        </Card>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button size="small" onClick={onClose}>Cancel</Button>
          <Button type="primary" size="small" onClick={handleSubmit} disabled={selectedIds.length === 0} icon={isEditMode ? <EditOutlined /> : null}>
            {isEditMode ? 'Update Quote' : 'Create Quote'}
          </Button>
        </div>
      </div>

      <GlobalFilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onSubmit={handleFilterSubmit}
        filters={filterConfig}
        title="Filters"
      />
    </Modal>
  );
};

export default QuoteModal;

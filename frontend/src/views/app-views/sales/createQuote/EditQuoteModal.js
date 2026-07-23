// QuoteModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, Card, Checkbox, Input, Button, List, Typography, Space, Table, Col, Row,
  message, Spin, Empty
} from 'antd';
import { SearchOutlined, EditOutlined, FilterOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import GlobalFilterModal from 'components/GlobalFilterModal';
import ProjectService from 'services/ProjectService';
import DrawingService from 'services/DrawingService';

const { Title, Text } = Typography;

const safeNumber = (n, def = 0) => {
  const v = Number(n);
  return Number.isFinite(v) ? v : def;
};

const unitFromDrawing = (d) =>
  safeNumber(d?.costingSummary?.grandTotalWithMarkup ?? d?.unitPrice ?? d?.price ?? 0);

const QuoteModal = ({
  open,
  onClose,
  onQuoteUpdated,
  customer,
  drawings = [],
  customers = [],
  editingQuote = null,
}) => {
  const isEditMode = !!editingQuote;

  // State
  const [searchText, setSearchText] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [projectData, setProjectData] = useState([]);
  const [drawingList, setDrawingList] = useState([]);
  const [allDrawings, setAllDrawings] = useState([]); // 🔥 Store all drawings for filter
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [qtyMap, setQtyMap] = useState({});
  const [priceMap, setPriceMap] = useState({});

  // Normalize drawings
  const normalizedDrawings = useMemo(() => {
    return (drawingList || [])
      .map((d) => {
        const id = d._id || d.id;
        const drawingNumber = d.drawingNo || d.drawingNumber || '—';
        const tool = d.description || d.tool || '—';
        const unitPriceDefault = unitFromDrawing(d);
        const currency = d?.currency?.code || 'USD';
        const currencySymbol = d?.currency?.symbol || '$';
        
        return {
          id,
          drawingNumber,
          tool,
          baseQty: safeNumber(d.qty, 1),
          unitPriceDefault,
          raw: d,
          currency,
          currencySymbol
        };
      })
      .filter((d) => !!d.id);
  }, [drawingList]);

  // ✅ CREATE MODE: Fetch all customer drawings
  useEffect(() => {
    if (!open) return;
    if (isEditMode) return;

    const fetchByCustomer = async () => {
      const id = customer?._id;
      if (!id) {
        setDrawingList(drawings || []);
        setAllDrawings(drawings || []);
        return;
      }
      setLoading(true);
      try {
        const res = await DrawingService.getAllDrawings({ customerId: id });
        const data = res?.data || [];
        setDrawingList(data);
        setAllDrawings(data); // 🔥 Store all drawings
      } catch (e) {
        console.error('Failed to fetch drawings:', e);
        setDrawingList([]);
        setAllDrawings([]);
        message.error('Failed to load drawings');
      } finally {
        setLoading(false);
      }
    };
    fetchByCustomer();
  }, [open, customer?._id, isEditMode, drawings]);

  // ✅ EDIT MODE: Load drawings from the quote + all drawings for filter
  useEffect(() => {
    if (!open) return;
    if (!isEditMode || !editingQuote) return;

    const items = Array.isArray(editingQuote.items) ? editingQuote.items : [];
    
    // Get drawing IDs from items
    const drawingIds = items
      .map((it) => it.drawingId?._id || it.drawingId)
      .filter(Boolean);

    if (drawingIds.length === 0) {
      setDrawingList([]);
      setAllDrawings([]);
      setSelectedIds([]);
      setQtyMap({});
      setPriceMap({});
      return;
    }

    const fetchDrawings = async () => {
      setLoading(true);
      try {
        // 🔥 Fetch ALL drawings for customer (for filtering)
        const allRes = await DrawingService.getAllDrawings({ 
          customerId: customer?._id || editingQuote?.customerId?._id || editingQuote?.customerId
        });
        const allData = allRes?.data || [];
        setAllDrawings(allData);

        // 🔥 Fetch only the drawings that are in the quote
        const res = await DrawingService.getAllDrawings({ 
          ids: drawingIds.join(',') 
        });
        
        const fetchedDrawings = res?.data || [];
        setDrawingList(fetchedDrawings);
        
        // Pre-select these drawings
        const ids = [];
        const q = {};
        const p = {};
        
        items.forEach((it) => {
          const id = it.drawingId?._id || it.drawingId;
          if (!id) return;
          ids.push(id);
          q[id] = safeNumber(it?.quantity, 1);
          p[id] = safeNumber(
            it?.unitPrice ?? it?.costingSummary?.grandTotalWithMarkup,
            0
          );
        });
        
        setSelectedIds(ids);
        setQtyMap(q);
        setPriceMap(p);
        
      } catch (err) {
        console.error('Failed to fetch drawings for edit:', err);
        setDrawingList([]);
        setAllDrawings([]);
        message.error('Failed to load quote drawings');
      } finally {
        setLoading(false);
      }
    };
    fetchDrawings();
  }, [open, isEditMode, editingQuote, customer?._id]);

  // 🔥 Filter drawings based on search + filter
  const filtered = useMemo(() => {
    const s = (searchText || '').toLowerCase();
    let base = normalizedDrawings;

    if (!s) return base;

    return base.filter(
      (d) =>
        d.drawingNumber.toLowerCase().includes(s) ||
        d.tool.toLowerCase().includes(s)
    );
  }, [normalizedDrawings, searchText]);

  // Select single drawing
  const toggleSelect = (id, checked) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
      setQtyMap((prev) => ({
        ...prev,
        [id]: prev[id] ?? (normalizedDrawings.find((x) => x.id === id)?.baseQty || 1),
      }));
      setPriceMap((prev) => ({
        ...prev,
        [id]: prev[id] ?? (normalizedDrawings.find((x) => x.id === id)?.unitPriceDefault || 0),
      }));
    } else {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      setQtyMap(prev => {
        const newMap = { ...prev };
        delete newMap[id];
        return newMap;
      });
      setPriceMap(prev => {
        const newMap = { ...prev };
        delete newMap[id];
        return newMap;
      });
    }
  };

  // Select all filtered
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
      setQtyMap({});
      setPriceMap({});
    }
  };

  // Remove a drawing from selection (edit mode)
  const removeDrawing = (id) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    setQtyMap(prev => {
      const newMap = { ...prev };
      delete newMap[id];
      return newMap;
    });
    setPriceMap(prev => {
      const newMap = { ...prev };
      delete newMap[id];
      return newMap;
    });
    
    // Remove from drawingList as well
    setDrawingList(prev => prev.filter(d => (d._id || d.id) !== id));
  };

  // 🔥 Handle filter - Apply filter and show results in drawing list
  const handleFilterSubmit = async (filterData) => {
    try {
      setFilterVisible(false);
      setLoading(true);

      const queryParams = {};
      
      // Always filter by customer
      const customerId = customer?._id || editingQuote?.customerId?._id || editingQuote?.customerId;
      if (customerId) {
        queryParams.customerId = customerId;
      }
      
      if (filterData.drawingName) queryParams.drawingName = filterData.drawingName;
      if (filterData.project) queryParams.projectId = filterData.project;
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
        queryParams.drawingRange = `${filterData.min}-${filterData.max}`;
      }

      const response = await DrawingService.getAllDrawings(queryParams);
      const filteredData = response?.data || [];
      
      // 🔥 Update drawing list with filtered results
      setDrawingList(filteredData);
      
      // 🔥 In edit mode, preserve existing selections
      if (isEditMode) {
        // Keep selected IDs that are still in the filtered list
        const existingSelected = selectedIds.filter(id => 
          filteredData.some(d => (d._id || d.id) === id)
        );
        setSelectedIds(existingSelected);
      } else {
        // In create mode, clear selection
        setSelectedIds([]);
        setQtyMap({});
        setPriceMap({});
      }
      
      message.success(`Found ${filteredData.length || 0} drawings`);
    } catch (error) {
      console.error("Error applying filters:", error);
      message.error("Error applying filters");
    } finally {
      setLoading(false);
    }
  };

  // Fetch projects for filter
  useEffect(() => {
    const run = async () => {
      try {
        const customerId = customer?._id || editingQuote?.customerId?._id || editingQuote?.customerId;
        const r = await ProjectService.getAllProjects({ customerId });
        const body = r?.data ?? r;
        const list = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
        setProjectData(list);
      } catch (e) {
        console.error(e);
      }
    };
    if (open) run();
  }, [open, customer?._id, editingQuote?.customerId]);

  // Filter config
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

  // Calculate totals
  const totals = useMemo(() => {
    const totalDrawings = selectedIds.length;
    const totalQuantity = selectedIds.reduce(
      (s, id) => s + safeNumber(qtyMap[id], 0),
      0
    );
    const totalQuoteValue = selectedIds.reduce((s, id) => {
      const qty = safeNumber(qtyMap[id], 0);
      const price = safeNumber(priceMap[id], 0);
      return s + qty * price;
    }, 0);
    return { totalDrawings, totalQuantity, totalQuoteValue };
  }, [selectedIds, qtyMap, priceMap]);

  // Handle submit
  const handleSubmit = () => {
    const items = selectedIds.map((id) => {
      const d = normalizedDrawings.find((x) => x.id === id);
      const quantity = safeNumber(qtyMap[id], d?.baseQty || 1);
      const unitPrice = safeNumber(priceMap[id], d?.unitPriceDefault || 0);
      return {
        drawingId: id,
        drawingNumber: d?.drawingNumber || '',
        tool: d?.tool || '',
        unitPrice,
        quantity,
        totalPrice: quantity * unitPrice,
        currency: d?.currency || 'USD'
      };
    });

    if (isEditMode) {
      const updated = {
        ...editingQuote,
        customerId: editingQuote.customerId?._id || editingQuote.customerId,
        items,
        totalDrawings: totals.totalDrawings,
        totalQuantity: totals.totalQuantity,
        totalQuoteValue: totals.totalQuoteValue,
      };
      onQuoteUpdated?.(updated);
    } else {
      onQuoteUpdated?.(items);
    }
  };

  // Summary columns
  const summaryData = [
    { key: '1', metric: 'Total Drawings', value: totals.totalDrawings },
    { key: '2', metric: 'Total Quantity', value: totals.totalQuantity },
    { key: '3', metric: 'Total Quote Value', value: `${editingQuote?.currency?.symbol || '$'}${totals.totalQuoteValue.toFixed(2)}` },
  ];
  
  const summaryCols = [
    { title: '', dataIndex: 'metric', key: 'metric', render: (t) => <Text strong>{t}</Text> },
    { title: '', dataIndex: 'value', key: 'value', render: (v) => <Text strong>{v}</Text> },
  ];

  const isAllChecked = filtered.length > 0 && selectedIds.length === filtered.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < filtered.length;

  const currencySymbol = editingQuote?.currency?.symbol || customer?.currency?.symbol || '$';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={950}
      style={{ top: 20 }}
      bodyStyle={{ padding: 0 }}
      destroyOnClose
    >
      <div style={{ padding: '24px 24px 0 24px' }}>
        <Title level={3} style={{ marginBottom: 8, fontSize: 20 }}>
          Cable Harness/Assembly Quote {isEditMode ? '— Edit' : ''}
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          Quote for <Text strong>{customer?.companyName || editingQuote?.customerCompany || '—'}</Text>
          {isEditMode && (
            <Text type="secondary" style={{ marginLeft: 16 }}>
              Quote #{editingQuote?.quoteNumber || 'N/A'}
            </Text>
          )}
        </Text>
      </div>

      <div style={{ padding: 24 }}>
        <Spin spinning={loading}>
          <Card
            title={`Drawings (${filtered.length} ${isEditMode ? 'selected/available' : 'available'})`}
            style={{ marginBottom: 24 }}
            extra={
              filtered.length > 0 && (
                <Checkbox
                  checked={isAllChecked}
                  indeterminate={isIndeterminate}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                >
                  Select All
                </Checkbox>
              )
            }
          >
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }} align="middle">
              <Col xs={24} sm={18}>
                <Input
                  placeholder="Search drawings..."
                  prefix={<SearchOutlined />}
                  size="small"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear
                />
              </Col>
              <Col xs={24} sm={6}>
                <Button
                  type="primary"
                  icon={<FilterOutlined />}
                  size="small"
                  block
                  onClick={() => setFilterVisible(true)}
                  // ✅ Filter enabled in both modes
                >
                  Filter
                </Button>
              </Col>
            </Row>

            {filtered.length === 0 ? (
              <Empty 
                description={
                  loading 
                    ? "Loading drawings..." 
                    : isEditMode && selectedIds.length === 0
                      ? "No drawings in this quote. Use filter to add new drawings."
                      : "No drawings found"
                } 
              />
            ) : (
              <List
                dataSource={filtered}
                renderItem={(d) => {
                  const checked = selectedIds.includes(d.id);
                  const qty = safeNumber(qtyMap[d.id], d.baseQty || 1);
                  const price = safeNumber(priceMap[d.id], d.unitPriceDefault || 0);
                  const total = qty * price;
                  const isInQuote = selectedIds.includes(d.id);

                  return (
                    <List.Item
                      style={{ 
                        padding: '10px 0', 
                        borderBottom: '1px solid #f0f0f0',
                        backgroundColor: isInQuote ? '#f6ffed' : 'transparent'
                      }}
                    //   actions={
                    //     isEditMode && isInQuote ? [
                    //       <Button
                    //         type="text"
                    //         danger
                    //         icon={<DeleteOutlined />}
                    //         onClick={() => removeDrawing(d.id)}
                    //         size="small"
                    //       >
                    //         Remove
                    //       </Button>
                    //     ] : isEditMode && !isInQuote ? [
                    //       <Button
                    //         type="primary"
                    //         icon={<PlusOutlined />}
                    //         onClick={() => toggleSelect(d.id, true)}
                    //         size="small"
                    //       >
                    //         Add
                    //       </Button>
                    //     ] : []
                    //   }
                    >
                      <List.Item.Meta
                        avatar={
                          <Checkbox
                            checked={checked}
                            onChange={(e) => toggleSelect(d.id, e.target.checked)}
                          />
                        }
                        title={
                          <div>
                            <Text strong style={{ fontSize: 14 }}>{d.drawingNumber}</Text>
                            {/* {isInQuote && (
                              <Text type="success" style={{ fontSize: 12, marginLeft: 8 }}>
                                ✓ In Quote
                              </Text>
                            )} */}
                          </div>
                        }
                        description={<Text type="secondary" style={{ fontSize: 12 }}>{d.tool}</Text>}
                      />
                      <Space direction="vertical" style={{ textAlign: 'right' }}>
                        <Text strong style={{ fontSize: 16 }}>
                          {d.currencySymbol || currencySymbol} {price.toFixed(2)}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Qty: {qty} × {price.toFixed(2)} = <b>{d.currencySymbol || currencySymbol}{total.toFixed(2)}</b>
                        </Text>
                      </Space>
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>

          <Card title={<Text strong>Quote Summary</Text>} style={{ marginBottom: 24 }}>
            <Table
              dataSource={summaryData}
              columns={summaryCols}
              pagination={false}
              showHeader={false}
              size="small"
            />
          </Card>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button size="small" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="primary"
              size="small"
              onClick={handleSubmit}
              disabled={selectedIds.length === 0}
              icon={isEditMode ? <EditOutlined /> : null}
            >
              {isEditMode ? 'Update Quote' : 'Create Quote'}
            </Button>
          </div>
        </Spin>
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
import React, { useEffect, useMemo, useState } from 'react';
import { Table, Typography, Tag, InputNumber, Spin, message } from 'antd';
import ActionButtons from 'components/ActionButtons';
import { hasPermission } from 'utils/auth';

const { Text } = Typography;

const tabKey = (t) => (t === 'materials' ? 'material' : t === 'manhour' ? 'manhour' : 'packing');

const CostingTable = ({
  costingItems = [],
  activeTab,
  onEdit,
  onDelete,
  loading = false,
  currentMarkups,   // { material, manhour, packing }
  baseMarkups,      // { material, manhour, packing } baseline
  onMarkupChange,
  handleUpdateLatestPrice   // (tab, value) => persist to DB
}) => {
  const [localMarkup, setLocalMarkup] = useState(0);

  // sync local with parent whenever tab or markups change
  useEffect(() => {
    const k = tabKey(activeTab);
    setLocalMarkup(Number(currentMarkups?.[k] ?? 0));
  }, [activeTab, currentMarkups?.material, currentMarkups?.manhour, currentMarkups?.packing]);

  const baseline = Number(baseMarkups?.[tabKey(activeTab)] ?? 0);

  const handleLocalChange = (val) => {
    const n = typeof val === 'string' ? Number(val) : (val ?? 0);
    const num = Number.isFinite(n) ? Number(n) : 0;
    const clamped = Math.max(baseline, Math.min(100, num));
    setLocalMarkup(clamped);
    onMarkupChange?.(activeTab, clamped);
  };



  const actionColumn = {
    title: 'Actions',
    key: 'actions',
    width: 160,
    fixed: 'right',
    render: (_, record) => (
      <ActionButtons
        showEdit={hasPermission('sales.mto:create_edit_delete_costingmaterial')}
        showDelete={hasPermission('sales.mto:create_edit_delete_costingmaterial')}
        showDeleteConfirm
        onEdit={() => onEdit && onEdit(record)}
        onDelete={() => onDelete && onDelete(record)}
        showUpdate={hasPermission('sales.mto:create_edit_delete_costingmaterial')}
        onUpdate={() => {handleUpdateLatestPrice(record?._id)}}
      />
    ),
  };

  const commonColumns = [
    {
      title: 'Item',
      dataIndex: 'itemNumber',
      key: 'itemNumber',
      width: 150,
      fixed: 'left',
      render: (text) => <Text strong>{text || '-'}</Text>,
    },
    { title: 'Child Part', dataIndex: 'childPart', key: 'childPart', width: 220,render: (_,record) => <Text strong>{record?.childPart?.ChildPartNo || '-'}</Text> },
    { title: 'Description', dataIndex: 'description', key: 'description', width: 220 },
    { title: 'MPN', dataIndex: 'mpn', key: 'mpn', width: 220,render: (_,record) => <Text strong>{record?.mpn?.MPN || '-'}</Text> },
    {
      title: 'UOM',
      dataIndex: 'uom',
      key: 'uom',
      width: 80,
      render: (uom) => (uom?.code || uom?.name || '-'),
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'right',
      render: (v) => (Number(v || 0)).toFixed(2),
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 110,
      align: 'right',
      render: (v,record) => `${record?.mpn?.currency?.symbol} ${(Number(v || 0)).toFixed(2)}`,
    },
    {
      title: 'Latest P. Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 150,
      align: 'right',
      sorter: (a, b) => a.unitPrice - b.unitPrice, // enable sorting arrow
      render: (value,record) => (
        <div
          style={{
            // backgroundColor: '#ffeaea', // light red background
            color: '#d32f2f', // darker red text
            padding: '4px 8px',
            borderRadius: '6px',
            fontWeight: 600,
          }}
        >
          {Number(record?.mpn?.RFQUnitPrice || 0).toFixed(2)}
        </div>
      ),
    }
    ,
    {
      title: 'Ex. Price',
      dataIndex: 'extPrice',
      key: 'extPrice',
      width: 110,
      align: 'right',
      render: (v) => `${(Number(v || 0)).toFixed(2)}`,
    },
    {
      title: 'Sales Price',
      dataIndex: 'salesPrice',
      key: 'salesPrice',
      width: 120,
      align: 'right',
      render: (v) => `${(Number(v || 0)).toFixed(2)}`,
    },
  ];

  const materialColumns = [
    {
      title: 'MPN',
      dataIndex: 'mpn',
      key: 'mpn',
      width: 140,
      render: (mpn) => (typeof mpn === 'string' ? mpn : (mpn?.MPN || '-')),
    },
    {
      title: 'Manufacturer',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      width: 140,
      render: (t) => t || '-',
    },
    {
      title: 'SGA %',
      dataIndex: 'sgaPercent',
      key: 'sgaPercent',
      width: 90,
      align: 'right',
      render: (v) => `${Number(v || 0)}%`,
    },
    {
      title: 'Mat Burden %',
      dataIndex: 'matBurden',
      key: 'matBurden',
      width: 130,
      align: 'right',
      render: (v) => `${Number(v || 0)}%`,
    },
    {
      title: 'Lead Time',
      dataIndex: 'leadTime',
      key: 'leadTime',
      width: 110,
      align: 'right',
      render: (v) => v ? `${v} weeks` : '-',
    },
  ];

  const manhourColumns = [
     {
      title: 'Item',
      dataIndex: 'itemNumber',
      key: 'itemNumber',
      width: 150,
      fixed: 'left',
      render: (text) => <Text strong>{text || '-'}</Text>,
    },
    { title: 'Description', dataIndex: 'description', key: 'description', width: 220 },
       {
      title: 'Skill Level',
      dataIndex: 'skillLevel',
      key: 'skillLevel',
      width: 180,
      render: (sl) => {
        if (!sl) return <Tag>-</Tag>;
        const lvl = (sl?.skillLevelName || '').toLowerCase();
        let color = 'blue';
        if (lvl === 'beginner') color = 'green';
        else if (lvl === 'intermediate') color = 'orange';
        else if (lvl === 'expert') color = 'red';
        return (
          <Tag color={color}>
            {sl?.skillLevelName ?? 'NA'} — {sl?.currencyType?.symbol}{sl?.rate}/{sl?.type?.code}
          </Tag>
        );
      },
    },
     {
      title: 'UOM',
      dataIndex: 'uom',
      key: 'uom',
      width: 80,
      render: (uom) => (uom?.code || uom?.name || '-'),
    },
      {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'right',
      render: (v) => (Number(v || 0)).toFixed(2),
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 110,
      align: 'right',
      render: (v) => `${(Number(v || 0)).toFixed(2)}`,
    },
    {
      title: 'Sales Price',
      dataIndex: 'salesPrice',
      key: 'salesPrice',
      width: 120,
      align: 'right',
      render: (v) => `${(Number(v || 0)).toFixed(2)}`,
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
      key: 'remarks',
      width: 160,
      render: (t) => t || '-',
    },
 
  ];

  const packingColumns = [
    {
      title: 'Item',
      dataIndex: 'itemNumber',
      key: 'itemNumber',
      width: 150,
      fixed: 'left',
      render: (text) => <Text strong>{text || '-'}</Text>,
    },
      { title: 'Description', dataIndex: 'description', key: 'description', width: 220 },
    {
      title: 'MPN',
      dataIndex: 'mpn',
      key: 'mpn',
      width: 140,
      render: (mpn) => (typeof mpn === 'string' ? mpn : (mpn?.MPN || '-')),
    },
    {
      title: 'UOM',
      dataIndex: 'uom',
      key: 'uom',
      width: 80,
      render: (uom) => (uom?.code || uom?.name || '-'),
    },
      {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'right',
      render: (v) => (Number(v || 0)).toFixed(2),
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 110,
      align: 'right',
      render: (v) => `${(Number(v || 0)).toFixed(2)}`,
    },
     {
      title: 'Ex. Price',
      dataIndex: 'extPrice',
      key: 'extPrice',
      width: 110,
      align: 'right',
      render: (v) => `${(Number(v || 0)).toFixed(2)}`,
    },
    {
      title: 'SGA%',
      dataIndex: 'sgaPercent',
      key: 'sgaPercent',
      width: 120,
      align: 'right',
      render: (v) => `${Number(v || 0)}%`,
    },
    {
      title: 'Max Burden %',
      dataIndex: 'maxBurden',
      key: 'maxBurden',
      width: 120,
      align: 'right',
      render: (v) => `${Number(v || 0)}%`,
    },
    {
      title: 'Freight %',
      dataIndex: 'freightPercent',
      key: 'freightPercent',
      width: 110,
      align: 'right',
      render: (v) => `${Number(v || 0)}%`,
    },
  ];

  const getColumns = () => {
    const base = [...commonColumns];
    if (activeTab === 'materials') return [...base, actionColumn];
    if (activeTab === 'manhour') return [...manhourColumns, actionColumn];
    if (activeTab === 'packing') return [...packingColumns, actionColumn];
    return [...base, ...packingColumns, actionColumn];
  };

  const filteredItems = useMemo(() => {
    const qt = activeTab === 'materials' ? 'material' : activeTab === 'manhour' ? 'manhour' : 'packing';
    return (costingItems || [])
      .filter((item) => (item?.quoteType || '').toLowerCase() === qt)
      .map((item, index) => ({ ...item, key: item.id || item._id || index }));
  }, [costingItems, activeTab]);

  const totals = useMemo(() => {
    const init = { quantity: 0, unitPrice: 0, extPrice: 0, salesPrice: 0 };
    return filteredItems.reduce((acc, it) => {
      acc.quantity += Number(it?.quantity || 0);
      acc.unitPrice += Number(it?.unitPrice || 0);
      acc.extPrice += Number(it?.extPrice || 0);
      acc.salesPrice += Number(it?.salesPrice || 0);
      return acc;
    }, init);
  }, [filteredItems]);

  const totalWithMarkup = useMemo(() => {
    const perc = Number(localMarkup || 0);
    return totals.salesPrice + (totals.salesPrice * perc) / 100;
  }, [totals.salesPrice, localMarkup]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  const columns = getColumns();

  return (
    <div>
      <Table
        columns={columns}
        dataSource={filteredItems}
        pagination={false}
        summary={() => (
          <Table.Summary>
            <Table.Summary.Row >
              <Table.Summary.Cell index={0} colSpan={4}>
                <Text strong>Sub-Total</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} />
              <Table.Summary.Cell index={2} />
              <Table.Summary.Cell index={3} align="right">
                <Text strong>{totals.extPrice.toFixed(2)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} colSpan={columns.length - 4} align="right">
                <Text strong>{totals.salesPrice.toFixed(2)}</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>

            <Table.Summary.Row >
              <Table.Summary.Cell index={0} colSpan={columns.length - 1}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text strong>SubTotal + Markup (%)</Text>
                  <InputNumber
                    min={baseline}
                    max={100}
                    value={localMarkup}
                    onChange={handleLocalChange}
                  />
                  <Text type="secondary">Min (base): {baseline}%</Text>
                </div>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <Text strong>{totalWithMarkup.toFixed(2)}</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </div>
  );
};

export default CostingTable;

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Descriptions,
  Table,
  Typography,
  Divider,
  Tag,
  Row,
  Col,
  Spin,
  message,
  Button,
  Space,
} from "antd";
import { useParams, useNavigate } from "react-router-dom";
import PurchaseOrderService from "services/PurchaseOrderService";
import ActionButtons from "components/ActionButtons";

const { Title, Text } = Typography;

const fmtMoney = (amount = 0, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount || 0));

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "-");

const getSupplierName = (supplier) =>
  typeof supplier === "object" ? (supplier?.companyName || "-") : (supplier || "-");

const getCurrencyCode = (supplier) => {
  const c = typeof supplier === "object" ? supplier?.currency?.code : undefined;
  return typeof c === "string" && c.length <= 4 ? c : "-";
};


const PurchaseReviseOrderDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [downloadPdf, setDownloadPdf] = useState(false)
  const [po, setPo] = useState(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await PurchaseOrderService.getRevisedPurchaseOrderById(id);
        const data = res?.data || res;
        setPo(data?.data || data);
      } catch (e) {
        console.error(e);
        message.error(e?.message || "Failed to load purchase order");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);




  const poInfoData = useMemo(() => {
    if (!po) return null;
    return {
      poNumber: po.poNumber,
      poDate: fmtDate(po.poDate),
      referenceNo: po.referenceNo || "-",
      workOrderNo:
        typeof po.workOrderNo === "object"
          ? (po.workOrderNo?.workOrderNo || po.workOrderNo?._id)
          : po.workOrderNo,
      needDate: fmtDate(po.needDate),
      etaDate: fmtDate(po.etaDate),
      expectedDate: fmtDate(po.expectedDate),
      shipToAddress: po.shipToAddress || "-",
      termsConditions: po.termsConditions || "",
      status: po.status || "Pending",
    };
  }, [po]);


  const downloadPDF = async () => {
    setDownloadPdf(true)
    const res = await PurchaseOrderService.exportPurchaseOrderPDF(id);

    const blob = new Blob([res.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `PO_${poInfoData?.poNumber}.pdf`;
    link.click();
    setDownloadPdf(false)
    window.URL.revokeObjectURL(url);
  };

  const supplierInfoData = useMemo(() => {
    if (!po) return null;
    const s = po.supplier;
    return {
      company: getSupplierName(s),
      contactPerson: typeof s === "object" ? (s?.contactPerson || "-") : "-",
      currency: getCurrencyCode(s),
      incoterms: typeof s === "object" ? (s?.incoTerms || "-") : "-",
    };
  }, [po]);

  const itemsData = useMemo(() => {
    if (!po?.items) return [];
    return po.items.map((it, idx) => ({
      idNumber: it?.idNumber,
      key: it._id || String(idx),
      description: it.description || "-",
      manufacturer: it?.manufacturer,
      mpn: typeof it.mpn === "object" ? (it.mpn?.MPN || it.mpn?._id) : (it.mpn || "-"),
      uom: typeof it.uom === "object" ? (it.uom?.code || it.uom?.name || it.uom?._id) : (it.uom || "-"),
      quantity: it.qty ?? 0,
      unitPrice: Number(it.unitPrice || 0),
      discount: Number(it.discount || 0),
      extendedPrice: Number(it.extPrice || 0),
    }));
  }, [po]);

  // const totals = useMemo(() => {
  //   const t = po?.totals || {};
  //   const freight = Number(t?.freightAmount || 0);
  //   const sub = Number(t?.subTotalAmount || 0);
  //   const tax = Number(t?.ostTax || 0);
  //   const finalAmount = Number(t?.finalAmount || 0);
  //   return { freight, sub, tax, finalAmount };
  // }, [po]);

const totals = useMemo(() => {
  const t = po?.totals || {};

  const grossAmount = (po?.items || []).reduce(
    (sum, item) =>
      sum +
      (Number(item.qty || 0) * Number(item.unitPrice || 0)),
    0
  );

  const freight = Number(t.freightAmount || 0);
  const discountAmount = Number(t.totalDiscount || 0);

  // ✅ Gross + Freight - Discount
  const subTotal = grossAmount + freight - discountAmount;

  return {
    grossAmount,
    freight,
    discountAmount,
    subTotal,

    // GST
    tax: Number(t.ostTax || 0),

    // Final Amount
    finalAmount: Number(t.finalAmount || 0),

    taxPercentage: Number(po?.taxPercentage || 0),
  };
}, [po]);




  const poItemsColumns = [
    {
      title: 'Item No',
      dataIndex: 'idNumber',
      key: 'idNumber',
      width: 100
    },
    {
      title: "Description ↓",
      dataIndex: "description",
      key: "description",
      width: 220,
      render: (text) => <Text strong>{text}</Text>,
    },
    { title: "MPN ↓", dataIndex: "mpn", key: "mpn", width: 150 },
    { title: "Manufacturer", dataIndex: "manufacturer", key: "manufacturer", width: 150 },
    { title: "UOM ↓", dataIndex: "uom", key: "uom", width: 90, align: "center" },
    { title: "Qty ↓", dataIndex: "quantity", key: "quantity", width: 90, align: "center" },
    {
      title: "Unit Price ↓",
      dataIndex: "unitPrice",
      key: "unitPrice",
      width: 120,
      align: "right",
      render: (v) => fmtMoney(v),
    },
    // {
    //   title: "Disc % ↓",
    //   dataIndex: "discount",
    //   key: "discount",
    //   width: 100,
    //   align: "center",
    //   render: (v) => `${v}%`,
    // },
    {
      title: "Ext. Price ↓",
      dataIndex: "extendedPrice",
      key: "extendedPrice",
      width: 140,
      align: "right",
      render: (v) => <Text strong>{fmtMoney(v)}</Text>,
    },
  ];

  if (loading || !poInfoData || !supplierInfoData) {
    return (
      <div style={{ padding: 24, display: "grid", placeItems: "center" }}>
        <Spin />
      </div>
    );
  }

const revisionColumns = [
  {
    title: "Revision",
    dataIndex: "revisionNo",
    key: "revisionNo",
    render: (text, record) => (
      <div>
        <Text strong>R{text}</Text>
        <div style={{ fontSize: '12px', color: '#666' }}>
          {record.poNumber}
        </div>
      </div>
    ),
  },
  {
    title: "PO Number",
    dataIndex: "poNumber",
    key: "poNumber",
    render: (text) => <Text copyable>{text}</Text>,
  },
  {
    title: "Status",
    key: "status",
    render: (_, record) => {
      const status = record.snapshot?.status || "Pending";
      const colors = {
        Acknowledged: "green",
        Pending: "orange",
        Emailed: "blue",
        Cancelled: "red",
        Closed: "purple",
        Draft: "default"
      };
      return <Tag color={colors[status] || "default"}>{status}</Tag>;
    },
  },
  {
    title: "Items",
    key: "items",
    render: (_, record) => {
      const items = record.snapshot?.items || [];
      return (
        <div>
          {items.map((item, idx) => (
            <div key={idx} style={{ fontSize: '12px' }}>
              {item.description} × {item.qty} {item.uom}
            </div>
          ))}
        </div>
      );
    },
  },
  {
    title: "Qty",
    key: "qty",
    render: (_, record) => {
      const items = record.snapshot?.items || [];
      const totalQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
      return <Text strong>{totalQty}</Text>;
    },
  },
  {
    title: "Total Amount",
    key: "amount",
    render: (_, record) => {
      const finalAmount = record.snapshot?.totals?.finalAmount || 0;
      return <Text strong>${finalAmount.toFixed(2)}</Text>;
    },
  },
  {
    title: "Revised On",
    dataIndex: "revisedAt",
    key: "revisedAt",
    render: (date) => fmtDate(date),
  },
  {
    title: "Action",
    key: "action",
    render: (_, record) => (
           <ActionButtons showInfo  onInfo={() =>
                                navigate(`/app/purchase/view-purchase-order/revised${record?._id}`)
                            }/>
    ),
  }
];





  return (
    <div style={{ padding: 24, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <Title level={1} style={{ margin: 0, fontSize: 28, fontWeight: "bold" }}>
            Purchase Order Details
          </Title>
          <Text style={{ fontSize: 16, color: "#1890ff", fontWeight: 500 }}>
            PO Number: {poInfoData.poNumber}
          </Text>
        </div>
        <Tag color={poInfoData.status === "Closed" ? "green" : poInfoData.status === "Approved" ? "blue" : "orange"}>
          {poInfoData.status}
        </Tag>
      </div>

      {/* PO Info */}
      <Card style={{ marginBottom: 24 }} bodyStyle={{ padding: 24 }}>
        <Title level={2} style={{ marginBottom: 20, fontSize: 20 }}>
          Purchase Order Information
        </Title>

        <Descriptions
          bordered
          column={2}
          size="middle"
          labelStyle={{ fontWeight: 600, backgroundColor: "#fafafa", width: 180 }}
          contentStyle={{ backgroundColor: "#fff" }}
        >
          <Descriptions.Item label="PO Number">
            <Text strong>{poInfoData.poNumber}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="PO Date">{poInfoData.poDate}</Descriptions.Item>
          <Descriptions.Item label="Reference No">{poInfoData.referenceNo}</Descriptions.Item>
          <Descriptions.Item label="Work Order No">{poInfoData.workOrderNo || "-"}</Descriptions.Item>
          <Descriptions.Item label="Need Date">{poInfoData.needDate}</Descriptions.Item>
          <Descriptions.Item label="Expected Date">{poInfoData.etaDate || "-"}</Descriptions.Item>
          <Descriptions.Item label="Ship To Address" span={2}>
            <Text>{poInfoData.shipToAddress}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Divider />

      {/* Supplier */}
      <Card style={{ marginBottom: 24 }} bodyStyle={{ padding: 24 }}>
        <Title level={2} style={{ marginBottom: 20, fontSize: 20 }}>
          Supplier Information
        </Title>

        <Descriptions
          bordered
          column={2}
          size="middle"
          labelStyle={{ fontWeight: 600, backgroundColor: "#fafafa", width: 180 }}
          contentStyle={{ backgroundColor: "#fff" }}
        >
          <Descriptions.Item label="Company">
            <Text strong>{supplierInfoData.company}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Contact Person">{supplierInfoData.contactPerson}</Descriptions.Item>
          <Descriptions.Item label="Currency">
            <Tag color="blue">{supplierInfoData.currency}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Incoterms">{supplierInfoData.incoterms}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Divider />

    <Divider />
      {/* Items */}
      <Card style={{ marginBottom: 24 }} bodyStyle={{ padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <Title level={2} style={{ margin: 0, fontSize: 20, display: "inline" }}>
            Purchase Order Details
          </Title>
          <Text style={{ marginLeft: 12, fontSize: 16, color: "#1890ff", fontWeight: 500 }}>
            PO Number: {poInfoData.poNumber}
          </Text>
        </div>

        <Table
          columns={poItemsColumns}
          dataSource={itemsData}
          pagination={false}
          size="middle"
          scroll={{ x: 800 }}
          style={{ marginBottom: 24 }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 20,
          }}
        >
          <div
            style={{
              minWidth: 350,
              textAlign: "right",
              background: "#fafafa",
              padding: 16,
              borderRadius: 8,
            }}
          >
            <div style={{ marginBottom: 8 }}>
  <Text strong>Gross Amount: </Text>
  <Text>{fmtMoney(totals.grossAmount)}</Text>
</div>

<div style={{ marginBottom: 8 }}>
  <Text strong>Freight: </Text>
  <Text>+ {fmtMoney(totals.freight)}</Text>
</div>

<div style={{ marginBottom: 8 }}>
  <Text strong>Discount: </Text>
  <Text type="danger">
    - {fmtMoney(totals.discountAmount)}
  </Text>
</div>

<div style={{ marginBottom: 8 }}>
  <Text strong>Sub Total: </Text>
  <Text>{fmtMoney(totals.subTotal)}</Text>
</div>



<div style={{ marginBottom: 8 }}>
  <Text strong>
    GST ({totals.taxPercentage}%):
  </Text>
  <Text>{fmtMoney(totals.tax)}</Text>
</div>

<Divider style={{ margin: "12px 0" }} />

<div>
  <Text strong style={{ fontSize: 16 }}>
    Total Amount:
  </Text>

  <Text
    strong
    style={{
      fontSize: 16,
      color: "#1890ff",
      marginLeft: 10,
    }}
  >
    {fmtMoney(totals.finalAmount)}
  </Text>
</div>
          </div>
        </div>
      </Card>

      {/* Terms & Conditions */}
      {poInfoData.termsConditions && (
        <>
          <Divider />
          <Card style={{ marginBottom: 24 }} bodyStyle={{ padding: 24 }}>
            <Title level={2} style={{ marginBottom: 20, fontSize: 20 }}>
              Terms & Conditions
            </Title>
            <div style={{ whiteSpace: "pre-wrap", color: "#666", lineHeight: 1.6 }}>
              {poInfoData.termsConditions}
            </div>
          </Card>
        </>
      )}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
          padding: "16px 0",
          borderTop: "1px solid #d9d9d9",
        }}
      >
        {/* <button
          onClick={() => window.print()}
          style={{
            padding: "8px 24px",
            border: "1px solid #d9d9d9",
            borderRadius: 6,
            backgroundColor: "#fff",
            cursor: "pointer",
          }}
        >
          Print
        </button> */}
        <button
          onClick={downloadPDF}
          style={{
            padding: "8px 24px",
            border: "1px solid #1890ff",
            borderRadius: 6,
            backgroundColor: "#1890ff",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {downloadPdf ? "Downloading..." : "Export PDF"}
        </button>
      </div>
    </div>
  );
};

export default PurchaseReviseOrderDetailsPage;

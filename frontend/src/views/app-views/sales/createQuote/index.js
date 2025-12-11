import React, { useEffect, useState } from "react";
import { Button, Col, Input, Radio, Row, Space, Table, Tag, Card, Typography, message } from "antd";
import { BankOutlined, CalendarOutlined, CloudDownloadOutlined, DollarOutlined, FileDoneOutlined, FileExcelOutlined, FileWordOutlined, NumberOutlined, PlusOutlined, SearchOutlined, UserOutlined, UserSwitchOutlined } from "@ant-design/icons";
import { hasPermission } from "utils/auth";
import ActionButtons from "components/ActionButtons";
import CustomerSelectionModal from "./CustomerSelectionModal";
import QuoteModal from './QuoteModal';
import QuoteSuccessModal from './QuoteSuccessModal';
import ExportExcelModal from './ExportExcelModal';
import CustomerService from "services/CustomerService";
import DrawingService from "services/DrawingService";
import { createQuote, updateQuote } from "store/slices/quoteSlice";
import { useDispatch } from "react-redux";
import QuoteService from "services/QuoteService";
import GlobalFilterModal from "components/GlobalFilterModal";
import useDebounce from "utils/debouce";
import EditQuoteModal from "./EditQuoteModal";
import ProjectService from "services/ProjectService";
import GlobalTableActions from "components/GlobalTableActions";

const { Title, Text } = Typography;
const { Search } = Input;


const filterConfig = [
  {
    type: 'date',
    name: 'drawingDate',
    label: 'Drawing Date',
    placeholder: 'Select Drawing Date'
  },
  {
    type: 'dateRange',
    name: 'projectRange',
    label: 'Project Date Range',
    placeholder: 'Select Date Range'
  },
  {
    type: 'select',
    name: 'project',
    label: 'Project',
    placeholder: 'Select Project',
    options: [
      { value: 'project1', label: 'Project Alpha' },
      { value: 'project2', label: 'Project Beta' },
      { value: 'project3', label: 'Project Gamma' }
    ]
  },
  {
    type: 'select',
    name: 'customer',
    label: 'Customer',
    placeholder: 'Select Customer',
    options: [
      { value: 'customer1', label: 'Customer A' },
      { value: 'customer2', label: 'Customer B' },
      { value: 'customer3', label: 'Customer C' }
    ]
  },
  {
    type: 'select',
    name: 'drawingRange',
    label: 'Drawing Range',
    placeholder: 'Select Drawing Range',
    options: [
      { value: 'range1', label: 'Range 1-100' },
      { value: 'range2', label: 'Range 101-200' },
      { value: 'range3', label: 'Range 201-300' }
    ]
  }
];


const CreateQuote = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDrawings, setCustomerDrawings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [quotesData, setQuotesData] = useState([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState();
  const [filterVisible, setFilterVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [editingQuote, setEditingQuote] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [projectData, setProjectData] = useState([])
  const [exportMode, setExportMode] = React.useState("excel");
  const dispatch = useDispatch();
  const [selectedQuoteNumber, setSelectedQuoteNumber] = useState(null);


  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState(null)
  // component
  // React component
  const onExportExcel = async (quoteId) => {
    try {
      const res = await QuoteService.exportQuoteToExcel(quoteId);

      if (res.status !== 200) {
        console.error('Export failed, HTTP', res.status);
        // Optionally try to decode server message:
        try {
          const text = new TextDecoder().decode(res.data);
          console.error('Server says:', text);
        } catch { }
        return;
      }

      const mime =
        res.headers?.['content-type'] ||
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      const blob = new Blob([res.data], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedQuoteNumber}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      fetchQuotes();
    } catch (err) {
      console.error('Excel export failed:', err);
    }
  };









  const onExportWord = async (quoteId) => {
    try {
      const response = await QuoteService.exportQuoteToWord(quoteId);
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${selectedQuoteNumber}.docx`;
      link.click();
      fetchQuotes();
    } catch (error) {
      console.error('Word export failed:', error);
    }
  };

  const normalizeProjectsResponse = (res) => {
    if (!res) return [];
    // axios response usually in res.data
    const body = res.data ?? res;
    // if API returns { success:true, data: [...] }
    if (body?.success !== undefined) return body.data ?? [];
    // if API returns { data: [...], pagination: {...} }
    if (Array.isArray(body?.data)) return body.data;
    // if API returns array directly
    if (Array.isArray(body)) return body;
    // fallback
    return [];
  };

  const handleExportExcel = (quoteId, quoteNumber) => {
    setSelectedQuoteId(quoteId || null);
    setSelectedQuoteNumber(quoteNumber || null); // <-- NEW
    setExportMode("excel");
    setExportModalVisible(true);
  };

  const handleExportWord = (quoteId, quoteNumber) => {
    setSelectedQuoteId(quoteId || null);
    setSelectedQuoteNumber(quoteNumber || null); // <-- NEW
    setExportMode("word");
    setExportModalVisible(true);
  };


  // Dummy data for quotes table
  const columns = [
{
  title: "Select All",
  key: "projectDetails",
  render: (_, record) => {
    const totalQty = record.totalQuantity ?? 0;
    const totalDrawings = record.totalDrawings ?? 0;

    return (
      <div style={{ display: "flex", alignItems: "flex-start", padding: "4px 0" }}>
        <Space direction="vertical" style={{ width: "100%" }} size={2}>

          {/* Quote Number + Date Row */}
          <Space size={12} align="center">
            <Text strong style={{ fontSize: 13 }}>
              <NumberOutlined style={{ marginRight: 6, color: "#0369A1" }} />
              {record.quoteNumber || "Q--"}
            </Text>

            <Text type="secondary" style={{ fontSize: 12 }}>
              <CalendarOutlined style={{ marginRight: 6, color: "#16A34A" }} />
              {record?.quoteDate
                ? new Date(record.quoteDate).toLocaleDateString("en-GB")
                : "No date"}
            </Text>
          </Space>

          {/* Customer Name */}
          <Title
            level={4}
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: 600,
              lineHeight: "20px",
            }}
          >
            <UserSwitchOutlined style={{ marginRight: 6, color: "#0F172A" }} />
            {record.customerId?.name || record.customerName || "Customer Name"}
          </Title>

          {/* Company Name */}
          <Text type="secondary" style={{ fontSize: 14 }}>
            <FileDoneOutlined style={{ marginRight: 6, color: "#475569" }} />
            {record.customerCompany || record.customerId?.companyName || "Company"}
          </Text>

          {/* Totals Row */}
          <Space size="large" style={{ marginTop: 4 }} align="center">
            <Text strong style={{ fontSize: 14 }}>
              <DollarOutlined style={{ marginRight: 6, color: "#16A34A" }} />
              Total: ${record.totalQuoteValue.toFixed(2)}
            </Text>

            <Text type="secondary" style={{ fontSize: 13 }}>
              <FileDoneOutlined
               style={{ marginRight: 6, color: "#2563EB" }} />
              Drawings: <Text strong>{totalDrawings}</Text>
            </Text>

            <Text type="secondary" style={{ fontSize: 13 }}>
              <NumberOutlined style={{ marginRight: 6, color: "#7C3AED" }} />
              Total Qty: <Text strong>{totalQty}</Text>
            </Text>
          </Space>

        </Space>
      </div>
    );
  },
},
    {
      title: "",
      key: "status",
      render: (_, record) => {
        const map = { quoted: 'green', pending: 'orange', completed: 'blue' };
        return <Tag color={map[record.status] || 'default'}>{record.status}</Tag>;
      }
    },
    // { title: "", key: "created", render: (_, record) => <Text>{record.created}</Text> },
    // {},
    {
      title: "",
      key: "actions",
      width: 160,
      render: (_, record) => (
        <Space>

          {/* {record?.status === "pending" && hasPermission('sales.quote:export') && ( */}
          <Space>
            <Button
              type="text"
              icon={<FileExcelOutlined style={{ color: "#217346", fontSize: 18 }} />}
              onClick={() => handleExportExcel && handleExportExcel(record?._id, record?.quoteNumber)}
              style={{
                background: "#E6F4EA",
                borderRadius: 6,
                padding: "4px 10px",
                color: "#217346",
                fontWeight: 500,
              }}
            >
              Excel
            </Button>
            <Button
              type="text"
              icon={<FileWordOutlined style={{ color: "#2B579A", fontSize: 18 }} />}
              onClick={() => handleExportWord && handleExportWord(record?._id, record?.quoteNumber)}
              style={{
                background: "#EBF3FB",
                borderRadius: 6,
                padding: "4px 10px",
                color: "#2B579A",
                fontWeight: 500,
              }}
            >
              Word
            </Button>
          </Space>
          {/* )} */}
          <Space
            direction="vertical"
            size={8}
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
            }}
          >


            {/* Date Tag on Left in Green */}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-start",
              }}
            >
              <Tag
                style={{
                  margin: 0,
                  borderRadius: "20px",
                  background: "#16A34A",
                  color: "white",
                  border: "none",
                  padding: "0px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <CalendarOutlined />
                Quoted:{" "}
                {record?.created
                  ? new Date(record.created).toLocaleDateString("en-GB")
                  : "N/A"}
              </Tag>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 10,
              }}
            >
              {/* Action Buttons on Right */}
              <ActionButtons
                showEdit={hasPermission('sales.quote:edit')}
                showDelete={hasPermission('sales.quote:delete')}
                showDeleteConfirm
                onEdit={() => handleEdit(record)}
                onDelete={async () => {
                  try {
                    await QuoteService.deleteQuote(record._id);
                    fetchQuotes();
                  } catch (err) {
                    console.error("Failed to delete quote:", err);
                  }
                }}
              />
            </div>
          </Space>

        </Space>

      )
    }
  ];

  const fetchCustomers = async () => {
    try {
      const res = await CustomerService.getAllCustomers();
      if (res.success) setCustomers(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchQuotes = async (params = {}) => {
    const { page = 1, limit = 10, ...filters } = params;
    try {
      const res = await QuoteService.getAllQuotes({ page, limit, ...filters });
      console.log('=====', res)
      if (res.success) {
        setQuotesData(res.data)
        setPagination(res?.pagination)

      }
    } catch (err) { console.error(err); }
  };

  const fetchProjects = async (params = {}) => {
    try {
      const res = await ProjectService.getAllProjects(params);
      const projects = normalizeProjectsResponse(res);
      setProjectData(projects);
    } catch (err) {
      console.error("Error fetching projects:", err);
    } finally {
    }
  };


  useEffect(() => {
    fetchCustomers();
    fetchQuotes();
    fetchProjects();
  }, []);

  // const handleSubmitQuote = async (selectedDrawings) => {
  //   if (!selectedCustomer) return;

  //   // Construct payload for backend
  //   const payload = {
  //     customerId: selectedCustomer._id,
  //     items: selectedDrawings.map(d => ({
  //       drawingId: d.id,          // id from drawing object
  //       quantity: d.quantity || 1 // quantity selected
  //     })),
  //     validUntil: new Date(new Date().setDate(new Date().getDate() + 30)), // 30 days from now
  //     status: 'pending',
  //   };

  //   try {
  //     const result = await dispatch(createQuote(payload)).unwrap();
  //     console.log('Quote created:', result);
  //     setIsQuoteModalOpen(false);       // close quote modal
  //     setSuccessModalVisible(true);
  //     fetchQuotes();    // show success modal
  //   } catch (err) {
  //     console.error('Failed to create quote:', err);
  //   }
  // };
  const handleSubmitQuote = async (data) => {
    if (!selectedCustomer && !editingQuote) return;

    try {
      // DETERMINE IF IT'S ADD OR UPDATE
      const isEditMode = !!editingQuote;

      let payload;
      let result;
      console.log('Updating quote with editingQuote:', editingQuote);
      if (isEditMode) {
        // UPDATE MODE - data is the full updated quote object
        payload = {
          ...data, // data already contains the full updated quote structure
          customerId: editingQuote.customerId?._id || editingQuote.customerId,
          validUntil: data.validUntil || new Date(new Date().setDate(new Date().getDate() + 30)),
          status: data.status || 'pending',
        };

        console.log('Updating quote with payload:', payload);
        result = await dispatch(updateQuote({ quoteId: payload._id, data: payload })).unwrap();
        console.log('Quote updated:', result);

      } else {
        // ADD MODE - data is array of selected drawings
        payload = {
          customerId: selectedCustomer._id,
          items: data.map(d => ({
            drawingId: d.id || d.drawingId, // Handle both formats
            drawingNumber: d.drawingNumber,
            tool: d.tool,
            unitPrice: d.unitPrice || d.price || 0,
            quantity: d.quantity || 1,
            totalPrice: (d.quantity || 1) * (d.unitPrice || d.price || 0)
          })),
          totalDrawings: data.length,
          totalQuantity: data.reduce((sum, item) => sum + (item.quantity || 1), 0),
          totalQuoteValue: data.reduce((sum, item) => sum + ((item.quantity || 1) * (item.unitPrice || item.price || 0)), 0),
          validUntil: new Date(new Date().setDate(new Date().getDate() + 30)),
          status: 'pending',
        };

        console.log('Creating quote with payload:', payload);
        result = await dispatch(createQuote(payload)).unwrap();
        console.log('Quote created:', result);
      }

      // Common success handling
      setIsQuoteModalOpen(false);
      setSuccessModalVisible(true);
      fetchQuotes(); // Refresh the quotes list

      // Reset edit state if it was an update
      if (isEditMode) {
        setEditingQuote(null);
      }

    } catch (err) {
      console.error(`Failed to ${editingQuote ? 'update' : 'create'} quote:`, err);
    }
  };

  const resetExportModal = () => {
    setExportModalVisible(false);
    setSelectedQuoteId(null);
    setSelectedQuoteNumber(null);
    setExportMode(null);
  };



  const handleUpdateQuote = (updatedQuoteData) => {
    // Your update logic here
    console.log('Updating quote:', updatedQuoteData);
    // Call your update API
    setIsEditModalOpen(false);
    setEditingQuote(null);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedKeys) => {
      setSelectedRowKeys(newSelectedKeys);
    },
  };



  const handleFilterSubmit = async (data) => {
    console.log('-------filter', data)
  }

  const doSearch = useDebounce(async (val) => {
    setSearchText(val);

    try {
      const response = await QuoteService.getAllQuotes({ search: val });

      const fetchedData = response.data || [];
      setQuotesData(fetchedData);

    } catch (err) {
      console.error("Error fetching drawings:", err);
      setQuotesData([]);
    }
  }, 400);

  const handleEdit = async (record) => {
    console.log('--------sss', record)
    setEditingQuote(record);

    try {
      const res = await DrawingService.getAllDrawings({ customerId: record?.customerId?._id });
      setCustomerDrawings(res.data);
    } catch (err) { console.error(err); }
    setIsQuoteModalOpen(true);
  };


  const handleCustomerSelect = async (customer) => {
    setShowAddModal(false);
    setSelectedCustomer(customer);
    setIsQuoteModalOpen(true);

    try {
      const res = await DrawingService.getAllDrawings({ customerId: customer._id });
      setCustomerDrawings(res.data);
    } catch (err) { console.error(err); }
  };

  const filteredData = activeTab === "all" ? quotesData : quotesData.filter(d => d.status === activeTab);


  const exportAllQuotes = async () => {
    if (!selectedRowKeys || selectedRowKeys.length === 0) {
      message.warning("Please select at least one quote to export.");
      return;
    }

    try {
      // 👇 Call your service
      const res = await QuoteService.exportSelectedQuotesToExcel(selectedRowKeys);

      // ✅ Extract filename from Content-Disposition (if available)
      const contentDisposition = res.headers?.["content-disposition"];
      const match = contentDisposition?.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : "selected-quotes.xlsx";

      // ✅ Create and trigger file download
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success("Quotes exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      message.error("Failed to export quotes. Please try again.");
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={2}>Quote Management</Title>
          <Text type="secondary">All Quote List</Text>
        </Col>
        <Col>
          <Space>
            {hasPermission('sales.quote:create') &&
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddModal(true)}>Create Quote</Button>
            }
            <Button
              icon={<CloudDownloadOutlined />}
              type="default"
              onClick={exportAllQuotes}
            >
              Export
            </Button>
          </Space>
        </Col>

      </Row>


      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Input
            placeholder="Search quotes..."
            prefix={<SearchOutlined />}
            style={{ width: 260 }}
            onChange={(e) => doSearch(e.target.value)}
            allowClear
          />
        </Col>
        <Col>
          <Radio.Group
            value={activeTab}
            onChange={e => setActiveTab(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="quoted">Quoted ({quotesData.filter(d => d.status === 'quoted').length})</Radio.Button>
            <Radio.Button value="pending">Pending ({quotesData.filter(d => d.status === 'pending').length})</Radio.Button>
          </Radio.Group>
        </Col>
      </Row>


      <Card>
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey={(record) => record._id || record.id} // 👈 IMPORTANT
          rowSelection={rowSelection}
          pagination={{
            current: page,
            pageSize: limit,
            total: pagination?.totalItems || 0,
            onChange: (p, l) => {
              setPage(p);
              setLimit(l);
              fetchQuotes({ page: p, limit: l });
            }
          }}
          size="small"
          onRow={(record) => ({
            style: {
              backgroundColor: record.status === 'quoted' ? '#16A34A1A' : 'transparent'
            }
          })}
        />
      </Card>

      {/* Modals */}
      <CustomerSelectionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCustomerSelect={handleCustomerSelect}
        customers={customers}
      />

      <QuoteModal
        open={isQuoteModalOpen}
        onClose={() => { setIsQuoteModalOpen(false); setEditingQuote(null) }}
        customer={selectedCustomer}
        drawings={customerDrawings}
        customers={customers}
        onQuoteCreated={(data) => handleSubmitQuote(data)}
        editingQuote={editingQuote}
      />


      {/* <QuoteModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        customer={editingQuote?.customerId} // Try both
        drawings={customerDrawings}
        editingQuote={editingQuote}
        onQuoteUpdated={(data) => handleUpdateQuote(data)}
      />


      <QuoteModal
        open={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        customer={selectedCustomer}
        drawings={customerDrawings}
        onQuoteCreated={(data) => handleSubmitQuote(data)}
      /> */}

      <QuoteSuccessModal
        visible={successModalVisible}
        onOk={() => setSuccessModalVisible(false)}
        onExport={() => { setSuccessModalVisible(false); setExportMode("excel"); setExportModalVisible(true); }}
      />

      <ExportExcelModal
        visible={exportModalVisible}
        mode={exportMode} // optional prop if the modal shows which mode is selected
        onCancel={resetExportModal}
        onConfirm={() => {
          if (!selectedQuoteId) {
            message.error("Quote ID missing for export");
            return;
          }
          if (exportMode === "excel") {
            onExportExcel(selectedQuoteId);
          } else {
            onExportWord(selectedQuoteId);
          }
          setExportModalVisible(false);
        }}
      />


      <GlobalFilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onSubmit={handleFilterSubmit}
        filters={filterConfig}
        title="Filters"
      />

      {/* <QuoteModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        customer={selectedCustomer}
        drawings={customerDrawings}
        editingQuote={editingQuote} // Pass the quote to edit
        onQuoteUpdated={(data) => handleUpdateQuote(data)} // Different callback for update
      /> */}


      {/* <EditQuoteModal
        visible={isEditQuoteModalOpen}
        onCancel={() => {
          setIsEditQuoteModalOpen(false);
          setEditingQuote(null);
        }}
        onUpdate={handleUpdateQuote}
        initialData={editingQuote}
        projectData={projectData || []}
      /> */}
    </div>
  );
};

export default CreateQuote;

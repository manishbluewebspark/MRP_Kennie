// MTOList.js
import React, { useEffect, useState } from "react";
import { Table, Button, Input, message, Col, Row, Tag } from "antd";
import { PlusOutlined, FilterOutlined, SearchOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import ActionButtons from "components/ActionButtons";
import useDebounce from "utils/debouce";
import QuoteTypeModal from "./QuoteTypeModal";
import CreateSalesQuoteModal from "./createQuoteModal";
import { createDrawing, deleteDrawing, fetchDrawings, updateDrawing } from "store/slices/drawingSlice";
import ProjectService from "services/ProjectService";
import CustomerService from "services/CustomerService";
import GlobalFilterModal from "components/GlobalFilterModal";
import { useNavigate } from "react-router-dom";
import DrawingService from "services/DrawingService";
import { getAllCurrencies } from "store/slices/currencySlice";
import { hasPermission } from "utils/auth";

// Dummy fallback if redux not loaded — keep your existing dummy data as initial fallback


const renderStatusBadge = (status) => {
  const statusConfig = {
    Draft: { color: "blue", text: "Draft" },
    Quoted: { color: "orange", text: "Quoted" },
    Approved: { color: "green", text: "Approved" },
    Rejected: { color: "red", text: "Rejected" },
    Completed: { color: "purple", text: "Completed" },
    active: { color: "green", text: "active" },
  };
  const cfg = statusConfig[status] || { color: "default", text: status };
  return <Tag color={cfg.color}>{cfg.text}</Tag>;
};

const formatCurrency = (amount, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);

const MTOList = () => {
  const dispatch = useDispatch();
  const { currencies } = useSelector((state) => state.currency);
  const navigate = useNavigate();
  const drawingState = useSelector((s) => s.drawings) || {};
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [quoteModalVisible, setQuoteModalVisible] = useState(false);
  const [createQuoteModalVisible, setCreateQuoteModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [selectedQuoteType, setSelectedQuoteType] = useState(null);
  const [projectData, setProjectData] = useState([])
  const [customerData, setCustomerData] = useState([])
  const [filterVisible, setFilterVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState(null)


  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (params = {}) => {
    try {
      const { page = 1, limit = 10, search = "", ...filters } = params;
      setLoading(true);
      const response = await DrawingService.getAllDrawings({ page, limit, search, ...filters });
      // assume response.data is an array
      setData(response.data || []);
      setFilteredData(response.data || []);
      setPagination(response?.pagination)
    } catch (err) {
      console.error("Error fetching drawings:", err);
      setData([]);
      setFilteredData([]);
      message.error("Failed to load drawings");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = async (filterData) => {
    setLoading(true);
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

      const fetchedData = response.data || [];
      setFilteredData(fetchedData);

      message.success(`Found ${fetchedData.length} drawings matching filters`);
    } catch (error) {
      console.error("Error applying filters:", error);
      message.error("Error applying filters");
    } finally {
      setLoading(false);
    }
  };
  // columns
  const columns = [
    {
      title: "#",
      key: "index",
      width: 60,
      render: (_, __, index) => index + 1
    },
    {
      title: "Drawing No",
      dataIndex: "drawingNo",
      key: "drawingNo",
      width: 200
    },
    {
      title: "Qty",
      dataIndex: "qty",
      key: "qty"
    },
    {
      title: "Project",
      dataIndex: "projectName",
      key: "projectName",
      render: (_, record) => record.projectId?.projectName
    },
    {
      title: "Customer",
      dataIndex: "customer",
      key: "customer",
      render: (_, record) => record.customerId?.contactPerson
    },
    {
      title: "Currency",
      dataIndex: "currency",
      key: "currency",
      render: (_, record) => <Tag color="blue">{record?.currency?.code}</Tag>
    },
    {
      title: "Unit Price",
      dataIndex: "costingSummary",
      key: "costingSummary",
      render: (costingSummary, record) => formatCurrency(costingSummary?.grandTotalWithMarkup, record.currency?.code)
    },
    {
      title: "Total Price",
      dataIndex: "costingSummary",
      key: "costingSummary",
      render: (costingSummary, record) => formatCurrency(costingSummary?.grandTotalWithMarkup * record.qty, record.currency?.code)
    },
    {
      title: "Lead Time",
      dataIndex: "costingSummary",
      key: "costingSummary",
      render: (costingSummary) => <Tag color="cyan">{costingSummary?.maxLeadTimeFromItems} week{costingSummary?.maxLeadTimeFromItems !== 1 ? 's' : ''}</Tag>
    },
    {
      title: "Quoted Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt) => createdAt ? new Date(createdAt).toLocaleDateString() : 'Not set'
    },
    {
      title: "Status",
      dataIndex: "quoteStatus",
      key: "quoteStatus",
      render: renderStatusBadge
    },
    {
      title: "Last Edited By",
      dataIndex: "lastEditedBy",
      key: "lastEditedBy",
      render: (user) => user?.name || 'N/A'
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <ActionButtons
          onInfo={() => handleInfo(record)}
          onEdit={() => handleEdit(record)}
          onDelete={() => handleDelete(record._id)}
          showInfo
          showEdit={hasPermission('sales.mto:edit')}
          showDelete={hasPermission('sales.mto:delete')}
          showDeleteConfirm
        />
      ),
    },
  ];

  // search (debounced)
  const doSearch = useDebounce(async (val) => {
    setSearchText(val);

    try {
      const response = await DrawingService.getAllDrawings({ search: val });

      const fetchedData = response.data || [];
      setFilteredData(fetchedData);
      if (response.payload) {
        const filtered = response.payload.data.map(d => ({ ...d, key: d._id || d.key }));
        setFilteredData(filtered);
      }
    } catch (err) {
      console.error("Error fetching drawings:", err);
      setFilteredData([]);
    }
  }, 400);

  // Modal flows
  const handleCloseQuoteModal = () => {
    setQuoteModalVisible(false);
    setSelectedQuoteType(null)
  };

  const handleQuoteTypeSelect = (type) => {
    setSelectedQuoteType(type);
    setQuoteModalVisible(false);
    setCreateQuoteModalVisible(true);
  };

  const handleCloseCreateQuoteModal = () => {
    setCreateQuoteModalVisible(false);
    setEditingRecord(null);
    setSelectedQuoteType(null);
  };

  const handleCreateOrUpdate = async (formData) => {
    try {
      if (formData.isEdit && editingRecord) {
        // Map form to API shape as needed. Using drawingId = editingRecord._id || key.
        const drawingId = editingRecord._id || editingRecord.key;
        const payload = {
          drawingNumber: formData.drawingNumber,
          description: formData.description,
          projectId: formData.project,
          customerId: formData.customer,
          qty: formData.quantity,
          unitPrice: formData.unitPrice,
          currency: formData.currency,
          freightPercent: formData.freightPercent,
          leadTimeWeeks: formData.leadTime,
        };
        await dispatch(updateDrawing({ drawingId, data: payload })).unwrap();
        message.success("Quote updated");
        fetchData()
        // update local list
        const updated = data.map((d) => (d.key === editingRecord.key ? { ...d, ...payload, lastEditedUser: "you" } : d));
        setData(updated);
        setFilteredData(updated);
      } else {
        // Create
        const payload = {
          drawingNo: formData.drawingNumber,
          description: formData.description,
          projectId: formData.project,
          customerId: formData.customer,
          qty: formData.quantity,
          unitPrice: formData.unitPrice,
          currency: formData.currency,
          leadTimeWeeks: formData.leadTime,
          freightPercent: formData.freightPercent,
          quoteType: formData.selectedQuoteType,
          totalPrice: Number(formData.calculatedValues?.totalPrice || (formData.quantity * formData.unitPrice || formData.unitPrice || 0)),
        };
        const res = await dispatch(createDrawing(payload)).unwrap();
        message.success("Quote created");
        fetchData()
        // If API returned created object, use it; else push a local representation
        const newItem = res && (res._id || res.id) ? { ...res, key: res._id || res.id } : { ...payload, key: `local-${Date.now()}`, quoteNo: `QT-${Date.now()}`, lastEditedUser: "you", status: "Draft" };
        setData((prev) => [newItem, ...prev]);
        setFilteredData((prev) => [newItem, ...prev]);
      }
    } catch (err) {
      message.error(err || "Operation failed");
    } finally {
      handleCloseCreateQuoteModal();
    }
  };

  // actions
  const handleInfo = (rec) => {
    // console.log('--------reccc',rec)
    navigate(`/app/sales/create-order-mto/view/${rec._id}`);
  };

  const handleEdit = (rec) => {
    setEditingRecord(rec);
    setSelectedQuoteType(rec.drawingType === "Cable Harness" ? "cable_harness" : rec.drawingType === "Box Build" ? "box_build" : "other");
    setCreateQuoteModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await dispatch(deleteDrawing(id)).unwrap();
      setData((prev) => prev.filter((d) => d.key !== id && d._id !== id));
      setFilteredData((prev) => prev.filter((d) => d.key !== id && d._id !== id));
      message.success("Deleted");
    } catch (err) {
      message.error(err || "Delete failed");
    }
  };

  // keep filteredData in sync if data changes externally
  // useEffect(() => {
  //   setData((prev) => {
  //     // only replace if store had items
  //     if (list && list.length > 0) return list.map((d) => ({ ...d, key: d._id || d.key }));
  //     return prev;
  //   });
  //   // eslint-disable-next-line
  // }, [list]);

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

  useEffect(() => {
    setFilteredData(data);
  }, [data]);

  const fetchProjects = async (params = {}) => {
    try {
      const res = await ProjectService.getAllProjects(params);
      const projects = normalizeProjectsResponse(res);
      setProjectData(projects);
    } catch (err) {
      console.error("Error fetching projects:", err);
      message.error("Failed to fetch projects");
    } finally {
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await CustomerService.getAllCustomers();
      if (res.success) setCustomerData(res.data);
    } catch (err) {
      console.error("Error fetching customers:", err);
      message.error("Failed to fetch customers");
    } finally {
    }
  };

  useEffect(() => {
    dispatch(getAllCurrencies())
    fetchProjects()
    fetchCustomers()
  }, [])

  const filterConfig = [
    {
      type: 'dateRange',
      name: 'drawingDateRange',
      label: 'Drawing Date Range',
      placeholder: ['Start Date']
    },
    {
      type: 'select',
      name: 'customer',
      label: 'Customer',
      placeholder: 'Select Customer',
      options: customerData.map(customer => ({
        label: customer.companyName,
        value: customer._id
      }))
    },
    {
      type: 'select',
      name: 'project',
      label: 'Project',
      placeholder: 'Select Project',
      options: projectData.map(project => ({
        label: project.projectName,
        value: project._id
      }))
    },
    {
      type: 'range',
      name: 'drawingRange',
      label: 'Drawing Range',
      placeholder: 'Enter Range'
    }
  ];


  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <h2 style={{ margin: 0 }}>Make to Order - MTO</h2>
        </Col>

        <Col>
          <Row gutter={8} align="middle">
            <Col>
              <Input
                placeholder="Search drawings..."
                prefix={<SearchOutlined />}
                style={{ width: 260 }}
                onChange={(e) => doSearch(e.target.value)}
                allowClear
              />
            </Col>
            <Col>
              <Button icon={<FilterOutlined />} onClick={() => setFilterVisible(true)}>Filter</Button>
            </Col>
            <Col>
              {hasPermission('sales.mto:create') && (<Button type="primary" icon={<PlusOutlined />} onClick={() => setQuoteModalVisible(true)}>
                Create Drawing
              </Button>)}

            </Col>
          </Row>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey={(record) => record.key || record._id}
        loading={loading}
         pagination={{
                    current: page,
                    pageSize: limit,
                    total: pagination?.totalItems || 0,
                    onChange: (p, l) => {
                        setPage(p);
                        setLimit(l);
                        fetchData({ page: p, limit: l });
                    }
                }}
        scroll={{ x: 1100 }}
      />

      <QuoteTypeModal
        visible={quoteModalVisible}
        onClose={handleCloseQuoteModal}
        onQuoteTypeSelect={handleQuoteTypeSelect}
        onUploadSuccess={fetchData}
        projectData={projectData || []}
      />

      <CreateSalesQuoteModal
        visible={createQuoteModalVisible}
        onClose={handleCloseCreateQuoteModal}
        selectedQuoteType={selectedQuoteType}
        onCreateQuote={handleCreateOrUpdate}
        editingRecord={editingRecord}
        projectData={projectData || []}
        customerData={customerData || []}
        currencies={currencies}
      />

      <GlobalFilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onSubmit={handleFilterSubmit}
        filters={filterConfig}
        title="Filters"
      />
    </div>
  );
};

export default MTOList;

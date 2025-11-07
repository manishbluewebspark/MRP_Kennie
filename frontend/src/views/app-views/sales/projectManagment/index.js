import React, { useEffect, useState } from "react";
import { Table, Button, message, Col, Row, Input, Tag } from "antd";
import ProjectService from "services/ProjectService";
import CustomerService from "services/CustomerService";
import ActionButtons from "components/ActionButtons";
import AddProjectModal from "./AddProjectModal";
import useDebounce from "utils/debouce";
import { CheckSquareOutlined, FolderOpenOutlined, FolderOutlined, SearchOutlined, UserOutlined } from "@ant-design/icons";
import { render } from "@testing-library/react";
import { useDispatch, useSelector } from "react-redux";
import { getAllCurrencies } from "store/slices/currencySlice";
import { hasPermission } from "utils/auth";

const { Search } = Input;

const ProjectCard = ({ record }) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#fff",
        // border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "5px 5px",
        // boxShadow:
        //   "0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.1)",
      }}
    >
      {/* LEFT SECTION */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: "#eef2ff",
            display: "grid",
            placeItems: "center",
            color: "#3b82f6",
          }}
        >
          <CheckSquareOutlined style={{ fontSize: 22 }} />
        </div>

        <div>
          <div
            style={{
              fontWeight: 600,
              fontSize: 15,
              marginBottom: 4,
              color: "#111827",
            }}
          >
            {record.projectName}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "#4b5563",
            }}
          >
            <UserOutlined style={{ fontSize: 12 }} />
            {record.customerId?.companyName ?? record.customer?.companyName ?? ""}
          </div>

          <div
            style={{
              fontSize: 12,
              color: "#6b7280",
              marginTop: 2,
            }}
          >
            Created: {record?.createdAt ? new Date(record.createdAt).toLocaleDateString() : "-"}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProjectList = () => {
  const dispatch = useDispatch()
  const { currencies } = useSelector((state) => state.currency);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [customerData, setCustomerData] = useState([]);
  const [searchText, setSearchText] = useState("");
 const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState(null)
  // Normalize different possible API shapes
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

  const fetchProjects = async (params = {}) => {
    setLoading(true);
    try {
      const res = await ProjectService.getAllProjects(params);
      const projects = normalizeProjectsResponse(res);
      setData(projects);
      setPagination(res?.pagination)
    } catch (err) {
      console.error("Error fetching projects:", err);
      message.error("Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await CustomerService.getAllCustomers();
      // normalize customers: same approach
      const body = res?.data ?? res;
      const customers = body?.success ? body.data : body?.data ?? (Array.isArray(body) ? body : []);
      setCustomerData(customers || []);
    } catch (err) {
      console.error("Error fetching customers:", err);
      message.error("Failed to fetch customers");
    }
  };

  useEffect(() => {
    dispatch(getAllCurrencies())
    fetchProjects();
    fetchCustomers();
  }, [dispatch]);

  // Add or Edit project
  const handleAddEdit = async (values) => {
    try {
      if (editingRecord) {
        const res = await ProjectService.updateProject(editingRecord._id, values);
        const updated = res?.data?.data ?? res?.data ?? {};
        // update local list
        setData((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
        message.success("Project updated successfully");
      } else {
        const res = await ProjectService.createProject(values);
        const created = res?.data?.data ?? res?.data ?? {};
        setData((prev) => [created, ...prev]);
        message.success("Project added successfully");
      }
      fetchProjects();
    } catch (err) {
      console.error("Add/Edit Project Error:", err);
      message.error(err?.response?.data?.message || "Operation failed");
    } finally {
      setShowModal(false);
      setEditingRecord(null);
    }
  };

  // Delete project (soft delete)
  const handleDelete = async (id) => {
    try {
      const res = await ProjectService.deleteProject(id);
      // if API returns { success: true }
      const body = res?.data ?? res;
      if (body?.success === false) {
        message.error(body.message || "Delete failed");
        return;
      }
      fetchProjects();
      setData((prev) => prev.filter((item) => item._id !== id));
      message.success("Project deleted successfully");
    } catch (err) {
      console.error("Delete Project Error:", err);
      message.error("Delete failed");
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setShowModal(true);
  };

  const doSearch = useDebounce(async (val) => {
    setSearchText(val);

    try {
      const response = await ProjectService.getAllProjects({ search: val });

      const fetchedData = response.data || [];
      setData(fetchedData);

    } catch (err) {
      console.error("Error fetching drawings:", err);
      setData([]);
    }
  }, 400);

  const columns = [
    {
      title: "",
      key: "project",
      render: (_, record) => (
        <ProjectCard
          record={record}
        />

      ),
    },
    {
      title: "",
      key: "currency",
      render: (_, record) => (<Tag
        color={'green'}
        style={{
          margin: 0,
          fontSize: '12px',
          padding: '2px 8px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
          minWidth: '50px',
          textAlign: 'center'
        }}
      >
        {record?.currency?.symbol} {record?.currency?.code || 'N/A'} - {record?.currency?.name}
      </Tag>)
    },
    {
      title: "",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <ActionButtons
          onEdit={() => handleEdit(record)}
          onDelete={() => handleDelete(record._id)}
          showInfo={false}
          showEdit={hasPermission('sales.project:edit')}
          showDelete={hasPermission('sales.project:delete')}
          showDeleteConfirm={true}
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h2>Project Management</h2>
        <Row justify="end" gutter={16}>
          <Col>
            <Input
              placeholder="Search Projects..."
              prefix={<SearchOutlined />}
              style={{ width: 260 }}
              onChange={(e) => doSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col>
          {hasPermission('sales.project:create') && (<Button type="primary" onClick={() => setShowModal(true)}>
              Add Project
            </Button>)}
            
          </Col>
        </Row>
      </div>

      <Table columns={columns} dataSource={data} rowKey={(r) => r._id} loading={loading} pagination={{
                    current: page,
                    pageSize: limit,
                    total: pagination?.total || 0,
                    onChange: (p, l) => {
                        setPage(p);
                        setLimit(l);
                        fetchProjects({ page: p, limit: l });
                    }
                }} />

      <AddProjectModal
        visible={showModal}
        onCancel={() => {
          setShowModal(false);
          setEditingRecord(null);
        }}
        formData={editingRecord}
        onSubmit={handleAddEdit}
        customers={customerData}
        currencies={currencies}
      />
    </div>
  );
};

export default ProjectList;

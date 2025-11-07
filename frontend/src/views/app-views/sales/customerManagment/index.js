import React, { useEffect, useState } from "react";
import { Table, Button, message, Col, Row, Input, Tag } from "antd";
import { EnvironmentOutlined, MailOutlined, PhoneOutlined, SearchOutlined, UserOutlined } from "@ant-design/icons";
import AddCustomerModal from "./AddCustomerModal";
import CustomerService from "services/CustomerService";
import ActionButtons from "components/ActionButtons";
import useDebounce from "utils/debouce";
import { useDispatch, useSelector } from "react-redux";
import { getAllCurrencies } from "store/slices/currencySlice";
import { hasPermission } from "utils/auth";

const { Search } = Input;


const ContactCard = ({ record }) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        // background: "#fff",
        // borderRadius: 12,
        // boxShadow:
        //   "0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.1)",
        padding: 5,
        // border: "1px solid #e5e7eb",
      }}
    >
      {/* LEFT: Avatar and Info */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: "#f3f4f6",
            display: "grid",
            placeItems: "center",
            color: "#3b82f6",
          }}
        >
          <UserOutlined style={{ fontSize: 22 }} />
        </div>

        <div
          style={{
            // border: "1px dashed #d1d5db",
            borderRadius: 8,
            padding: "10px 12px",
            minWidth: 400,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              lineHeight: 1.3,
              marginBottom: 6,
            }}
          >
            {record.companyName} – {record.contactPerson}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              fontSize: 13,
              color: "#555",
              marginBottom: 4,
            }}
          >
            <span>
              <MailOutlined style={{ marginRight: 4 }} />
              {record.email}
            </span>
            <span>
              <PhoneOutlined style={{ marginRight: 4 }} />
              {record.phone}
            </span>
          </div>

          <div
            style={{
              fontSize: 13,
              color: "#555",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <EnvironmentOutlined />
            {record.address}
          </div>
        </div>
      </div>


    </div>
  );
};
const renderBadge = (text, type) => {
  let color;
  switch (type) {
    case "USD":
      color = text === "Active" ? "green" : text === "Completed" ? "blue" : "red";
      break;
    case "SGD":
      color = text === "High" ? "red" : text === "Medium" ? "orange" : "green";
      break;
    default:
      color = "gray";
  }
  return <Tag color={color}>{text}</Tag>;
};

const CustomerList = () => {
  const dispatch = useDispatch()
  const { currencies } = useSelector((state) => state.currency);

  console.log('Full Redux Statecurrencies:', currencies);


  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [searchText, setSearchText] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState(null)

  // Fetch all customers
  const fetchCustomers = async (params = {}) => {
    const { page = 1, limit = 10, ...filters } = params;
    setLoading(true);
    try {
      const res = await CustomerService.getAllCustomers({ page, limit, ...filters });
      if (res.success) {
        setData(res.data)
        setPagination(res?.pagination)
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
      message.error("Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    dispatch(getAllCurrencies())
    fetchCustomers();
  }, [dispatch]);

  // Add or Edit customer
  const handleAddEdit = async (values) => {
    try {
      if (editingRecord) {
        // Update
        const res = await CustomerService.updateCustomer(editingRecord._id, values);
        if (res.success) {
          setData((prev) =>
            prev.map((item) => (item._id === editingRecord._id ? res.data : item))
          );
          message.success("Customer updated successfully");
        }
      } else {
        // Add
        const res = await CustomerService.createCustomer(values);
        if (res.success) {
          setData((prev) => [res.data, ...prev]);
          message.success("Customer added successfully");
        }
      }
      dispatch(getAllCurrencies())
      fetchCustomers();
    } catch (err) {
      console.error("Add/Edit Customer Error:", err);
      message.error("Operation failed");
    } finally {
      setShowModal(false);
      setEditingRecord(null);
    }
  };

  // Delete customer
  const handleDelete = async (id) => {
    try {
      const res = await CustomerService.deleteCustomer(id);
      if (res.success) {
        setData((prev) => prev.filter((item) => item._id !== id));
        message.success("Customer deleted successfully");
      }
      fetchCustomers();
    } catch (err) {
      console.error("Delete Customer Error:", err);
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
      const response = await CustomerService.getAllCustomers({ search: val });

      const fetchedData = response.data || [];
      setData(fetchedData);

    } catch (err) {
      console.error("Error fetching drawings:", err);
      setData([]);
    }
  }, 400);

  const handleCancel = () => {
    setShowModal(false);
    setEditingRecord(null);
  };

  const columns = [
    {
      title: "",
      key: "user",
      render: (_, record) => (
        <ContactCard
          record={record}
        />

      ),
    },
    // {
    //   title: "",
    //   key: "currency",
    //   render: (_, record) => (renderBadge(record?.currency?.code, record?.currency?.code))
    // },
    {
      title: "",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <ActionButtons
          onEdit={() => handleEdit(record)}
          onDelete={() => handleDelete(record._id)}
          showEdit={hasPermission('sales.customer:edit')}
          showDelete={hasPermission('sales.customer:delete')}
          showDeleteConfirm={true}
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h2>Customer Management</h2>
        <Row justify="end" gutter={16}>
          <Col>
            <Input
              placeholder="Search customer..."
              prefix={<SearchOutlined />}
              style={{ width: 260 }}
              onChange={(e) => doSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col>
            {hasPermission('sales.customer:create') && (<Button type="primary" onClick={() => setShowModal(true)}>
              Add Customer
            </Button>)}

          </Col>
        </Row>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="_id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: limit,
          total: pagination?.total || 0,
          onChange: (p, l) => {
            setPage(p);
            setLimit(l);
            fetchCustomers({ page: p, limit: l });
          }
        }}
      />

      <AddCustomerModal
        visible={showModal}
        onCancel={handleCancel}
        formData={editingRecord}
        onSubmit={handleAddEdit}
        currencies={currencies}
      />
    </div>
  );
};

export default CustomerList;
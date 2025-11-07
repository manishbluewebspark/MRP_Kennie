import React, { useEffect, useState } from "react";
import { Table, Button, Space, Tag, Card, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import AddSupplierModal from "./AddSupplierModal";
import { fetchSuppliers, addSupplier, updateSupplier, deleteSupplier } from "store/slices/supplierSlice";
import { getAllCurrencies } from "store/slices/currencySlice";
import ActionButtons from "components/ActionButtons";

const PurchaseSupplierManagementPage = () => {
  const dispatch = useDispatch();
  const { suppliers, loading } = useSelector(state => state.suppliers);
  const { currencies } = useSelector((state) => state.currency);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [gstApplicable, setGstApplicable] = useState(false);
  useEffect(() => {
    dispatch(fetchSuppliers());
    dispatch(getAllCurrencies());
  }, [dispatch]);

  const handleCreate = async (data) => {

    await dispatch(addSupplier({ ...data, gst: gstApplicable }));
    message.success("Supplier added successfully");
    setIsModalVisible(false);
    dispatch(fetchSuppliers());
  };

  const handleEdit = async (id, data) => {
    await dispatch(updateSupplier({ id, data }));
    message.success("Supplier updated successfully");
    setIsModalVisible(false);
    setEditingSupplier(null);
  };

  const handleDelete = async (id) => {
    await dispatch(deleteSupplier(id));
    message.success("Supplier deleted successfully");
    dispatch(fetchSuppliers());
  };

  const handleEditClick = (supplier) => {
    setEditingSupplier(supplier);
    dispatch(fetchSuppliers());
    setIsModalVisible(true);
  };

  const columns = [
    {
      title: "Company Name",
      dataIndex: "companyName",
      key: "companyName",
      width: 200,
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: "Contact Person",
      dataIndex: "contactPerson",
      key: "contactPerson",
      width: 150,
      render: (contactPerson) => {
        // If contactPerson is an object with name/email
        if (typeof contactPerson === "object" && contactPerson?.name) {
          return <div>{contactPerson.name}</div>;
        }
        return <div>{contactPerson || "-"}</div>;
      },
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 180,
      render: (email) => email || "-",
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      width: 150,
      render: (phone) => phone || "-",
    },
    {
      title: "Currency",
      dataIndex: "currency",
      key: "currency",
      width: 120,
      render: (currency) => {
        // If currency is an object { code, symbol, name }
        if (currency && typeof currency === "object") {
          return <Tag color="blue">{currency.symbol} - {currency.code}</Tag>;
        }
        return <Tag color="blue">{currency || "-"}</Tag>;
      },
    },
    {
      title: "GST",
      dataIndex: "gst",
      key: "gst",
      width: 100,
      render: (gst) => {
        // If gst is boolean false, show "No GST"
        const label = gst ? 'GST' : "No GST"; // gst can also be a string like "18%" etc.
        const color = gst ? "green" : "default";
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: "Payment Terms",
      dataIndex: "paymentTerms",
      key: "paymentTerms",
      width: 140,
      render: (terms) => <Tag color="orange">{terms || "-"}</Tag>,
    },
    {
      title: "Incoterms",
      dataIndex: "incoTerms",
      key: "incoTerms",
      width: 160,
      render: (incoTerms) => <Tag color="purple">{incoTerms || "-"}</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space>
          <ActionButtons
            onEdit={() => handleEditClick(record)}
            onDelete={() => handleDelete(record?._id)}
            showEdit
            showDelete
            showDeleteConfirm
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>Supplier Management</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>Add Supplier</Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={suppliers}
          loading={loading}
          rowKey="_id"
        />
      </Card>

      <AddSupplierModal
        visible={isModalVisible}
        onCancel={() => { setIsModalVisible(false); setEditingSupplier(null); }}
        onCreate={handleCreate}
        onEdit={handleEdit}
        editData={editingSupplier}
        currencies={currencies}
        setGstApplicable={setGstApplicable}
        gstApplicable={gstApplicable}
      />
    </div>
  );
};

export default PurchaseSupplierManagementPage;

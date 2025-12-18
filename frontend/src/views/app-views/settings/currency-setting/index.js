import React, { useEffect, useState } from "react";
import { Table, Button, message, Tag, Tooltip } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import ActionButtons from "components/ActionButtons";
import AddCurrencyModal from "./AddCurrencyModal";
import CurrencyService from "services/CurrencyService";

import { useDispatch, useSelector } from "react-redux";
import {
  addCurrency,
  updateCurrency,
  deleteCurrency
} from "store/slices/currencySlice";
import { hasPermission } from "utils/auth";

const CurrencyList = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currencies, setCurrencies] = useState([]);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState(null)

  const dispatch = useDispatch();

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async (params = {}) => {
    const { page = 1, limit = 10, search = "", ...filters } = params;
    setLoading(true);
    try {
      const response = await CurrencyService.getAllCurrencies({ page, limit, search, ...filters });
      setCurrencies(response.data || []);
      setPagination(response?.pagination)
    } catch (err) {
      message.error("Failed to fetch currencies");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingRecord) {
        await dispatch(updateCurrency({
          id: editingRecord._id,
          data: values
        })).unwrap();
        message.success("Currency updated successfully");
      } else {
        await dispatch(addCurrency(values)).unwrap();
        message.success("Currency created successfully");
      }
      setShowAddModal(false);
      setEditingRecord(null);
      fetchCurrencies(); // Refresh the list
    } catch (err) {
      message.error(err?.message || "Operation failed");
    }
  };

  const handleDelete = async (id) => {
    try {
      await dispatch(deleteCurrency(id)).unwrap();
      message.success("Currency deleted successfully");
      fetchCurrencies(); // Refresh the list
    } catch (err) {
      message.error("Failed to delete currency");
    }
  };

  const columns = [
    {
      title: "Currency Code",
      dataIndex: "code",
      key: "code",
      render: (code) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: "Currency Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Symbol",
      dataIndex: "symbol",
      key: "symbol",
      render: (symbol) => <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{symbol}</span>,
    },
    {
      title: "Exchange Rate",
      dataIndex: "exchangeRate",
      key: "exchangeRate",
      render: (rate) => rate ? `1 USD = ${rate}` : 'N/A',
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status ? "green" : "red"}>
          {status === "active" ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Created Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => date ? new Date(date).toLocaleDateString() : 'N/A',
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      render: (_, record) => (
        <ActionButtons
          onEdit={() => {
            setEditingRecord(record);
            setShowAddModal(true);
          }}
          onDelete={() => handleDelete(record._id)}
          showEdit={hasPermission('settings.currencyManagment:create_edit_delete')}
          showDelete={hasPermission('settings.currencyManagment:create_edit_delete')}
          showDeleteConfirm
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h2>Currency Management</h2>
        {hasPermission('settings.currencyManagment:create_edit_delete') && (<Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setShowAddModal(true)}
        >
          Add Currency
        </Button>)}


      </div>

      <Table
        columns={columns}
        dataSource={currencies}
        rowKey="_id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: limit,
          total: pagination?.total || 0,
          onChange: (p, l) => {
            setPage(p);
            setLimit(l);
            fetchCurrencies({ page: p, limit: l });
          }
        }}
        scroll={{ x: 800 }}
      />

      <AddCurrencyModal
        visible={showAddModal}
        onCancel={() => {
          setShowAddModal(false);
          setEditingRecord(null);
        }}
        onSubmit={handleSubmit}
        formData={editingRecord}
      />
    </div>
  );
};

export default CurrencyList;
import React, { useEffect, useState } from "react";
import { Table, Button, message, Tag, Tooltip, Space } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import ActionButtons from "components/ActionButtons";
import AddCategoryModal from "./AddCategoryModal";
import CategoryService from "services/CategoryService";

import { useDispatch, useSelector } from "react-redux";
import { 
  addCategory, 
  updateCategory, 
  deleteCategory 
} from "store/slices/categorySlice";
import { hasPermission } from "utils/auth";

const CategoryList = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [pagination, setPagination] = useState(null)
  const dispatch = useDispatch();


  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async (params = {}) => {
     const { page = 1, limit = 10, search = "", ...filters } = params;
    setLoading(true);
    try {
      const response = await CategoryService.getAllCategories({ page, limit, search, ...filters });
      setCategories(response.data || []);
      setPagination(response?.pagination)
    } catch (err) {
      message.error("Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingRecord) {
        await dispatch(updateCategory({ 
          id: editingRecord._id, 
          data: values 
        })).unwrap();
        message.success("Category updated successfully");
      } else {
        await dispatch(addCategory(values)).unwrap();
        message.success("Category created successfully");
      }
      setShowAddModal(false);
      setEditingRecord(null);
      fetchCategories(); // Refresh the list
    } catch (err) {
      message.error(err?.message || "Operation failed");
    }
  };

  const handleDelete = async (id) => {
    try {
      await dispatch(deleteCategory(id)).unwrap();
      message.success("Category deleted successfully");
      fetchCategories(); // Refresh the list
    } catch (err) {
      message.error("Failed to delete category");
    }
  };

  const handleStatusToggle = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === "active" ? "deactive" : "active";
      await dispatch(updateCategory({ 
        id: id, 
        data: { status: newStatus } 
      })).unwrap();
      message.success(`Category ${newStatus === "active" ? "activated" : "deactivated"} successfully`);
      fetchCategories(); // Refresh the list
    } catch (err) {
      message.error("Failed to update category status");
    }
  };

  const columns = [
    {
      title: "Category Name",
      dataIndex: "name",
      key: "name",
      render: (name, record) => (
        <div>
          <strong>{name}</strong>
          {record.description && (
            <div style={{ color: '#666', fontSize: '12px' }}>
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status, record) => (
        <Tag 
          color={status === "active" ? "green" : "red"}
          style={{ cursor: hasPermission("settings.categoryManagment:create_edit_delete") ? 'pointer' : 'default' }}
          onClick={() => hasPermission("settings.categoryManagment:create_edit_delete") && handleStatusToggle(record._id, status)}
        >
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
      width: 120,
      render: (_, record) => (
        <ActionButtons
          onEdit={() => {
            setEditingRecord(record);
            setShowAddModal(true);
          }}
          onDelete={() => handleDelete(record._id)}
          showEdit={hasPermission("settings.categoryManagment:create_edit_delete")}
          showDelete={hasPermission("settings.categoryManagment:create_edit_delete")}
          showDeleteConfirm
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h2>Category Management</h2>
        {hasPermission("settings.categoryManagment:create_edit_delete") && (
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => setShowAddModal(true)}
          >
            Add Category
          </Button>
        )} 
      </div>

      <Table 
        columns={columns} 
        dataSource={categories} 
        rowKey="_id" 
        loading={loading}
        scroll={{ x: 800 }}
         pagination={{
                    current: page,
                    pageSize: limit,
                    total: pagination?.total || 0,
                    onChange: (p, l) => {
                        setPage(p);
                        setLimit(l);
                        fetchCategories({ page: p, limit: l });
                    }
                }}
      />

      <AddCategoryModal
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

export default CategoryList;
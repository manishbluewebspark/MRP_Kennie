import React, { useEffect, useState } from "react";
import { Table, Button, message, Tag, Tooltip, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import ActionButtons from "components/ActionButtons";
import AddUOMModal from "./AddUOMModal";
import UOMService from "services/UOMService";

import { useDispatch, useSelector } from "react-redux";
import { 
  addUOM, 
  updateUOM, 
  deleteUOM 
} from "store/slices/uomSlice";
import { hasPermission } from "utils/auth";

const UOMList = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uoms, setUoms] = useState([]);
  
  const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [pagination, setPagination] = useState(null)

  const dispatch = useDispatch();
  // const { loading: reduxLoading } = useSelector(state => state.uom);

  useEffect(() => {
    fetchUOMs();
  }, []);

  const fetchUOMs = async (params = {}) => {
      const { page = 1, limit = 10, search = "", ...filters } = params;
    setLoading(true);
    try {
      const response = await UOMService.getAllUOMs({ page, limit, search, ...filters });
      setUoms(response.data || []);
      setPagination(response?.pagination)
    } catch (err) {
      message.error("Failed to fetch UOMs");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingRecord) {
        await dispatch(updateUOM({ 
          id: editingRecord._id, 
          data: values 
        })).unwrap();
        message.success("UOM updated successfully");
      } else {
        await dispatch(addUOM(values)).unwrap();
        message.success("UOM created successfully");
      }
      setShowAddModal(false);
      setEditingRecord(null);
      fetchUOMs(); // Refresh the list
    } catch (err) {
      message.error(err?.message || "Operation failed");
    }
  };

  const handleDelete = async (id) => {
    try {
      await dispatch(deleteUOM(id)).unwrap();
      message.success("UOM deleted successfully");
      fetchUOMs(); // Refresh the list
    } catch (err) {
      message.error("Failed to delete UOM");
    }
  };

  const handleStatusToggle = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === "active" ? "deactive" : "active";
      await dispatch(updateUOM({ 
        id: id, 
        data: { status: newStatus } 
      })).unwrap();
      message.success(`UOM ${newStatus === "active" ? "activated" : "deactivated"} successfully`);
      fetchUOMs(); // Refresh the list
    } catch (err) {
      message.error("Failed to update UOM status");
    }
  };

  const columns = [
    {
      title: "UOM Code",
      dataIndex: "code",
      key: "code",
      render: (code) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: "UOM Name",
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
          style={{ cursor: hasPermission("settings.uomManagment:create_edit_delete") ? 'pointer' : 'default' }}
          onClick={() => hasPermission("settings.uomManagment:create_edit_delete") && handleStatusToggle(record._id, status)}
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
          showEdit={hasPermission("settings.uomManagment:create_edit_delete")}
          showDelete={hasPermission("settings.uomManagment:create_edit_delete")}
          showDeleteConfirm
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h2>UOM Management</h2>
        {hasPermission("settings.uomManagment:create_edit_delete") && (
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => setShowAddModal(true)}
          >
            Add UOM
          </Button>
        )}
      </div>

      <Table 
        columns={columns} 
        dataSource={uoms} 
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
                        fetchUOMs({ page: p, limit: l });
                    }
                }}
      />

      <AddUOMModal
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

export default UOMList;
import React, { useEffect, useState } from "react";
import { Table, Button, message, Tag, Tooltip } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import ActionButtons from "components/ActionButtons";
import AddUserModal from "./AddUserModal";
import RoleService from "services/RoleService";
import UserService from "services/UserService";

import { useDispatch } from "react-redux";
import { createUser, updateUser, deleteUser } from "store/slices/userSlice";
import { hasPermission } from "utils/auth";

// modules structure (your deep hierarchy)
import modules from "./modulesConfig"; // optional externalize it

const UserList = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);

   const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [pagination, setPagination] = useState(null)

  const dispatch = useDispatch();

  useEffect(() => {
    getUsers();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await RoleService.getAllRoles();
      setRoles(res.data.roles || []);
    } catch (err) {
      message.error("Failed to load roles");
    }
  };

  const getUsers = async (params = {}) => {
     const { page = 1, limit = 10, search = "", ...filters } = params;
    setLoading(true);
    try {
      const res = await UserService.getAllUsers({ page, limit, search, ...filters });
      setUsers(res.data || []);
      setPagination(res?.pagination)
    } catch (err) {
      message.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingRecord) {
        await dispatch(updateUser({ userId: editingRecord._id, data: values })).unwrap();
        message.success("User updated successfully");
      } else {
        await dispatch(createUser(values)).unwrap();
        message.success("User created successfully");
      }
      setShowAddModal(false);
      setEditingRecord(null);
      getUsers();
    } catch (err) {
      message.error(err?.message || "Operation failed");
    }
  };

  const handleDelete = async (id) => {
    try {
      await dispatch(deleteUser(id)).unwrap();
      message.success("User deleted successfully");
      getUsers();
    } catch (err) {
      message.error("Failed to delete user");
    }
  };

  const columns = [
    {
      title: "Username / Email",
      render: (_, r) => (
        <div>
          <b>{r.name || r.userName}</b>
          <div style={{ color: "#888" }}>{r.email}</div>
        </div>
      ),
    },
    {
      title: "Status",
      render: (r) => (
        <Tag color={r.isActive ? "green" : "red"}>{r.isActive ? "Active" : "Inactive"}</Tag>
      ),
    },
    {
      title: "Role",
      render: (r) => <Tag color="blue">{r.role?.name || "N/A"}</Tag>,
    },
    {
      title: "Permissions",
      width: 200,
      render: (r) => {
        // Merge role + user permissions, remove duplicates
        const mergedPermissions = Array.from(
          new Set([...(r.role?.permissions || []), ...(r.permissions || [])])
        );

        return (
          <Tooltip
            title={
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 400 }}>
                {mergedPermissions.map((permission, index) => (
                  <Tag key={index} color="blue" style={{ margin: 0 }}>
                    {permission}
                  </Tag>
                ))}
              </div>
            }
            overlayStyle={{ maxWidth: 500 }}
          >
            <div
              style={{
                display: 'flex',
                gap: 4,
                flexWrap: 'nowrap',
                overflow: 'hidden',
                alignItems: 'center'
              }}
            >
              {mergedPermissions.length > 0 ? (
                <>
                  {mergedPermissions.slice(0, 3).map((permission, index) => (
                    <Tag
                      key={index}
                      color="blue"
                      style={{
                        margin: 0,
                        fontSize: '10px',
                        padding: '1px 6px',
                        lineHeight: '1.3',
                        flexShrink: 0,
                        maxWidth: 80,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {permission}
                    </Tag>
                  ))}
                  {mergedPermissions.length > 3 && (
                    <Tag
                      color="default"
                      style={{
                        margin: 0,
                        fontSize: '10px',
                        padding: '1px 6px',
                        flexShrink: 0
                      }}
                    >
                      +{mergedPermissions.length - 3}
                    </Tag>
                  )}
                </>
              ) : (
                <Tag color="default" style={{ margin: 0, fontSize: '10px', padding: '1px 6px' }}>
                  None
                </Tag>
              )}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      render: (date) => new Date(date).toLocaleString(),
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
          showEdit={hasPermission("settings.userManagement:edit")}
          showDelete={hasPermission("settings.userManagement:delete")}
          showDeleteConfirm
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h2>User Management</h2>
        {hasPermission("settings.userManagement:add") && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddModal(true)}>
            Add User
          </Button>
         )}
      </div>

      <Table columns={columns} dataSource={users} rowKey="_id" loading={loading}  pagination={{
                    current: page,
                    pageSize: limit,
                    total: pagination?.total || 0,
                    onChange: (p, l) => {
                        setPage(p);
                        setLimit(l);
                        getUsers({ page: p, limit: l });
                    }
                }} />

      <AddUserModal
        visible={showAddModal}
        onCancel={() => {
          setShowAddModal(false);
          setEditingRecord(null);
        }}
        onSubmit={handleSubmit}
        formData={editingRecord}
        roles={roles}
        modules={modules}
      />
    </div>
  );
};

export default UserList;

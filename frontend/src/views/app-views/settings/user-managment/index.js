import React, { useEffect, useMemo, useState } from "react";
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



// permission key -> nice label map
const buildPermissionLabelMap = (mods, parentKey = "", parentLabels = []) => {
  const map = {};

  mods.forEach((mod) => {
    const moduleKey = parentKey ? `${parentKey}.${mod.key}` : mod.key;
    const labelsPath = [...parentLabels, mod.label];

    if (mod.actions && mod.actions.length) {
      mod.actions.forEach((action) => {
        const permKey = `${moduleKey}:${action.key}`;
        // Label example: "Production / Cable Harness / Picking Process - Process"
        const niceLabel =
          labelsPath.length > 1
            ? `${labelsPath.join(" / ")} - ${action.label}`
            : `${labelsPath[0]} - ${action.label}`;
        map[permKey] = niceLabel;
      });
    }

    if (mod.children && mod.children.length) {
      Object.assign(
        map,
        buildPermissionLabelMap(mod.children, moduleKey, labelsPath)
      );
    }
  });

  return map;
};



const UserList = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState(null)


    const permissionLabelMap = useMemo(
    () => buildPermissionLabelMap(modules),
    []
  );


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
      width: 160,
      render: (_, r) => (
        <div>
          <b>{r.name || r.userName}</b>
          <div style={{ color: "#888" }}>{r.email}</div>
        </div>
      ),
    },
    {
      title: "Status",
      width: 100,
      render: (r) => (
        <Tag color={r.isActive ? "green" : "red"}>{r.isActive ? "Active" : "Inactive"}</Tag>
      ),
    },
    {
      title: "Role",
      width: 100,
      render: (r) => <Tag color="blue">{r.role?.name || "N/A"}</Tag>,
    },
    {
      title: "Permissions",
      width: 1000,
      render: (r) => {
        // Admin role → Full Access pill
        if (r.role?.name?.toLowerCase() === "admin") {
          return (
            <Tag
              style={{
                margin: 0,
                fontSize: "10px",
                padding: "2px 10px",
                borderRadius: "20px",
                background: "#e6ffed",
                fontWeight: 600,
                fontFamily: "serif",
              }}
            >
              Full Access
            </Tag>
          );
        }

        // Merge role + user permissions, remove duplicates
        const mergedPermissions = Array.from(
          new Set([...(r.role?.permissions || []), ...(r.permissions || [])])
        );

        return (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              maxWidth: "100%",
            }}
          >
            {mergedPermissions?.length > 0 ? (
              mergedPermissions.map((p, i) => {
                                const displayLabel = permissionLabelMap[p] || p;

                return (
                <Tag
                  key={i}
                  style={{
                    margin: 0,
                    fontSize: "11px",
                    padding: "2px 8px",
                    borderRadius: "20px",
                    border: "1px solid #d9d9d9",
                    background: "#fff",
                    color: "#555",
                    lineHeight: "2",
                    cursor: "default",
                  }}
                >
                  {displayLabel}
                </Tag>
              )})
            ) : (
              <Tag
                style={{
                  margin: 0,
                  fontSize: "10px",
                  padding: "2px 8px",
                  borderRadius: "20px",
                  border: "1px solid #d9d9d9",
                  background: "#fafafa",
                  color: "#999",
                }}
              >
                None
              </Tag>
            )}
          </div>
        );
      },
    },


    {
      title: "Created",
      width: 170,
      dataIndex: "createdAt",
      render: (date) => new Date(date).toLocaleString(),
    },
    {
      title: "Actions",
      width: 100,
      key: "actions",
      fixed: "right",
      render: (_, record) => (
        <ActionButtons
          onEdit={() => {
            setEditingRecord(record);
            setShowAddModal(true);
          }}
          onDelete={() => handleDelete(record._id)}
          showEdit={hasPermission("settings.userManagement:create_edit_delete")}
          showDelete={hasPermission("settings.userManagement:create_edit_delete")}
          showDeleteConfirm
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h2>User Management</h2>
        {hasPermission("settings.userManagement:create_edit_delete") && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowAddModal(true)}>
            Add User
          </Button>
        )}
      </div>

      <Table columns={columns} dataSource={users} rowKey="_id" loading={loading} pagination={{
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

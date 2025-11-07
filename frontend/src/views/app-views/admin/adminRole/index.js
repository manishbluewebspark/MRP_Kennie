import React, { useCallback, useEffect, useState } from "react";
import { Table, Button, Modal, Form, Input, Space, Popconfirm, message, Checkbox, Tag, Avatar, Tooltip } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import modulePermissions from "../../../../assets/data/permissions.json";
import RoleService from "services/RoleService";
import { hasPermission } from "utils/auth";
import GlobalModal from "components/GlobalModal";
import ActionButtons from "components/ActionButtons";
import Fixed from "views/app-views/components/layout/layout/Fixed";

const AdminRole = () => {
  const [roles, setRoles] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [form] = Form.useForm();


  const fetchRoles = useCallback(async () => {
    try {
      const res = await RoleService.getAllRoles();
      if (res?.success) {
        setRoles(res?.data?.roles || []);
      }

    } catch (err) {
      console.error(err);
      message.error("Failed to fetch roles");
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);


  const showModal = (role = null) => {
    setEditingRole(role);

    if (role) {
      // Convert array of permissions to object {Module: [actions]}
      const permObj = {};
      Object.keys(modulePermissions).forEach(mod => permObj[mod] = []);
      role.permissions.forEach(p => {
        if (p === "*") {
          Object.keys(modulePermissions).forEach(mod => permObj[mod] = ["*"]);
        } else if (p.startsWith("*:")) {
          const mod = p.split(":")[1];
          permObj[mod] = ["*"];
        } else {
          const [action, mod] = p.split(":");
          permObj[mod] = permObj[mod] || [];
          permObj[mod].push(action);
        }
      });
      form.setFieldsValue({ name: role.name, permissions: permObj });
    } else {
      // New role
      const emptyPerm = {};
      Object.keys(modulePermissions).forEach(mod => emptyPerm[mod] = []);
      form.setFieldsValue({ name: "", permissions: emptyPerm });
    }

    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingRole(null);
  };

  const handleSubmit = () => {
    form.validateFields().then(async (values) => {
      try {
        // Convert form object to array of strings
        const permsArray = [];
        Object.entries(values.permissions).forEach(([mod, actions]) => {
          if (actions.includes("*")) {
            permsArray.push(`*:${mod}`);
          } else {
            actions.forEach(a => permsArray.push(`${a}:${mod}`));
          }
        });

        // If all modules have "*" then simplify to ["*"]
        const allModules = Object.keys(modulePermissions);
        const isAll = allModules.every(mod => permsArray.includes(`*:${mod}`));
        const finalPerms = isAll ? ["*"] : permsArray;

        const rolePayload = {
          name: values.name,
          permissions: finalPerms,
        };

        let response;
        if (editingRole) {
          // Update existing role via API
          response = await RoleService.updateRole(editingRole._id, rolePayload);
          setRoles(prev => prev.map(r => r._id === editingRole._id ? response?.data?.role || { ...r, ...rolePayload } : r));
          message.success("Role updated successfully");
        } else {
          // Create new role via API
          response = await RoleService.createRole(rolePayload);
          setRoles(prev => [...prev, response?.data?.role || { _id: Date.now(), ...rolePayload }]);
          message.success("Role added successfully");
        }

        fetchRoles();
        handleCancel();
      } catch (error) {
        console.error(error);
        handleCancel();
        // Handle duplicate role or validation errors
        // if (error.response) {
        //   // Axios style
        //   if (error.response.status === 400) {
        //     message.error(error.response.data?.message || "Role already exists or invalid data");
        //   } else if (error.response.status === 401) {
        //     message.error("Unauthorized. Please login again.");
        //   } else {
        //     message.error(error.response.data?.message || "Something went wrong");
        //   }
        // } else {
        //   // Other errors
        //   message.error(error.message || "Something went wrong");
        // }
      }
    });
  };

  const renderUserBadges = (users = [], onAddUser) => {
    return (
      <Space size={[4, 8]} wrap>
        {users.map((user) => (
          <Tag
            key={user.id}
            color="blue"
            style={{ display: "flex", alignItems: "center" }}
          >
            <Avatar size="small" src={user.avatar} style={{ marginRight: 4 }} />
            {user.name}
          </Tag>
        ))}
        <Tooltip title="Assign User">
          <Tag
            onClick={onAddUser}
            color="green"
            style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            <PlusOutlined />
          </Tag>
        </Tooltip>
      </Space>
    );
  };

  const handleDelete = async (id) => {
    try {
      await RoleService.deleteRole(id);
      setRoles(prev => prev.filter(r => r.id !== id));
      message.success("Role deleted successfully");
      fetchRoles()
    } catch (error) {
      console.error(error);
      message.error(error.message || "Failed to delete role");
    }
  };


  const renderPermissions = perms => {
    return perms.map(p => {
      if (p === "*") return <Tag color="green">All Modules Access</Tag>;
      if (p.startsWith("*:")) return <Tag color="blue">{p.replace("*:", "")}: All Access</Tag>;
      const [action, mod] = p.split(":");
      return <Tag key={p}>{mod}: {action}</Tag>;
    });
  };

  const renderPermissionForm = () => {
    return Object.entries(modulePermissions).map(([module, actions]) => (
      <div key={module} style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: "bold", marginBottom: 8 }}>{module}</div>
        <Form.Item name={['permissions', module]} style={{ marginBottom: 0 }}>
          <Checkbox.Group>
            <Space direction="horizontal">
              <Checkbox value="*">All Access</Checkbox>
              {actions.map(action => <Checkbox value={action} key={action}>{action}</Checkbox>)}
            </Space>
          </Checkbox.Group>
        </Form.Item>
      </div>
    ));
  };

  const columns = [
    // { title: "ID", dataIndex: "id", key: "id" },
    { title: "Role Name", dataIndex: "name", key: "name" },
    { title: "Permissions", key: "permissions", render: (_, record) => renderPermissions(record.permissions) },
    {
      title: "Users",
      key: "users",
      render: (_, record) =>
        renderUserBadges(record.users, () => console.log('--------ssing')),
    },
    {
      title: "Actions",
      key: "actions",
      Fixed: 'right',
      width: 150,
      render: (_, record) => (
        <ActionButtons
          onInfo={() => console.log("Info")}
          onEdit={() => showModal(record)}
          onDelete={() => handleDelete(record?._id)}
          showInfo={false}
          showEdit={true}
          showDelete={true}
          showDeleteConfirm={true}
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Admin Roles</h2>
        {hasPermission('create:role') && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => showModal()}
          >
            Add Role
          </Button>
        )}
      </div>

      <Table dataSource={roles} columns={columns} rowKey="id" />

      <GlobalModal
        visible={isModalVisible}
        onCancel={handleCancel}
        onOk={handleSubmit}
        header={editingRole ? "Edit Role" : "Add Role"}
        okText={editingRole ? "Update" : "Add"}
        width={700}
        height={500} // optional
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Role Name"
            name="name"
            rules={[{ required: true, message: "Please enter role name" }]}
          >
            <Input />
          </Form.Item>

          {/* Render permissions form or any other content */}
          {renderPermissionForm()}
        </Form>
      </GlobalModal>
    </div>
  );
};

export default AdminRole;

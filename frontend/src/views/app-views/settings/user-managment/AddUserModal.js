import React, { useEffect, useState } from "react";
import { Form, Row, Col, Typography, Checkbox, Divider, message } from "antd";
import GlobalModal from "components/GlobalModal";
import { RoundedInput, RoundedSelect } from "components/FormFields";

const { Title } = Typography;

const AddUserModal = ({
  visible,
  onCancel,
  onSubmit,
  formData,
  roles = [],
  modules = [],
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  useEffect(() => {
    if (formData) {
      const allPermissions = formData.permissions || [];

      form.setFieldsValue({
        username: formData.userName,
        email: formData.email,
        name: formData.name,
        primaryRole: formData.role?._id,
        permissions: allPermissions,
      });
      setSelectedPermissions(allPermissions);
    } else {
      form.resetFields();
      setSelectedPermissions([]);
    }
  }, [formData, form]);

  const handleOk = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      const submitData = {
        userName: values.username,
        name: values.name,
        email: values.email,
        role: values.primaryRole, // just store role id
        permissions: selectedPermissions,
      };

      if (!formData && values.tempPassword) {
        submitData.tempPassword = values.tempPassword;
      }

      await onSubmit(submitData);
      form.resetFields();
      setSelectedPermissions([]);
    } catch (err) {
      message.error("Please check the form for errors");
    } finally {
      setLoading(false);
    }
  };

  // ---- Permission helpers (for new modulesConfig with { key, label }) ----
  const togglePermission = (perm, checked) => {
    let updated;
    if (checked) {
      updated = [...new Set([...selectedPermissions, perm])];
    } else {
      updated = selectedPermissions.filter((p) => p !== perm);
    }
    setSelectedPermissions(updated);
    form.setFieldValue("permissions", updated);
  };

  const toggleModuleAll = (moduleKey, actions, checked) => {
    // actions: [{ key, label }]
    const perms = actions.map((a) => `${moduleKey}:${a.key}`);
    let updated;
    if (checked) {
      updated = [...new Set([...selectedPermissions, ...perms])];
    } else {
      updated = selectedPermissions.filter((p) => !perms.includes(p));
    }
    setSelectedPermissions(updated);
    form.setFieldValue("permissions", updated);
  };

  const getModuleState = (moduleKey, actions = []) => {
    const perms = actions.map((a) => `${moduleKey}:${a.key}`);
    const selectedCount = perms.filter((p) =>
      selectedPermissions.includes(p)
    ).length;
    return {
      all: selectedCount === perms.length && perms.length > 0,
      some: selectedCount > 0 && selectedCount < perms.length,
    };
  };

  const renderModules = (mods, parentKey = "") => {
    return mods.map((mod) => {
      const moduleKey = parentKey ? `${parentKey}.${mod.key}` : mod.key;
      const { all, some } = mod.actions
        ? getModuleState(moduleKey, mod.actions)
        : { all: false, some: false };

      return (
        <div
          key={moduleKey}
          style={{
            marginBottom: 16,
            paddingLeft: parentKey ? 12 : 0,
          }}
        >
          <div
            style={{
              border: "1px solid #f0f0f0",
              borderRadius: 8,
              padding: 12,
              background: "#fff",
            }}
          >
            {/* Header: Module name + Select All */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <Title
                level={mod.children ? 4 : 5}
                style={{ margin: 0, fontSize: mod.children ? 14 : 13 }}
              >
                {mod.label}
              </Title>

              {mod.actions && mod.actions.length > 0 && (
                <Checkbox
                  indeterminate={some}
                  checked={all}
                  onChange={(e) =>
                    toggleModuleAll(moduleKey, mod.actions, e.target.checked)
                  }
                >
                  Select All
                </Checkbox>
              )}
            </div>

            {/* Actions */}
            {mod.actions && mod.actions.length > 0 && (
              <div style={{ marginTop: 4 }}>
                {mod.actions.map((action) => {
                  const perm = `${moduleKey}:${action.key}`;
                  return (
                    <div key={perm} style={{ marginBottom: 4 }}>
                      <Checkbox
                        checked={selectedPermissions.includes(perm)}
                        onChange={(e) =>
                          togglePermission(perm, e.target.checked)
                        }
                      >
                        {action.label}
                      </Checkbox>
                    </div>
                  );
                })}
            </div>
            )}

            {/* Children (nested modules) */}
            {mod.children && mod.children.length > 0 && (
              <div
                style={{
                  borderTop: "1px solid #f5f5f5",
                  marginTop: 8,
                  paddingTop: 8,
                  paddingLeft: 8,
                }}
              >
                {renderModules(mod.children, moduleKey)}
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <GlobalModal
      visible={visible}
      onCancel={() => {
        onCancel();
        form.resetFields();
        setSelectedPermissions([]);
      }}
      onOk={handleOk}
      header={formData ? "Edit User" : "Add New User"}
      okText={formData ? "Update" : "Submit"}
      width={900}
      height={700}
      confirmLoading={loading}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Username"
              name="username"
              rules={[{ required: true, message: "Please enter username" }]}
            >
              <RoundedInput
                placeholder="Enter username"
                disabled={!!formData}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Name"
              name="name"
              rules={[{ required: true, message: "Please enter name" }]}
            >
              <RoundedInput placeholder="Enter name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: "Please enter email" },
                { type: "email", message: "Enter valid email" },
              ]}
            >
              <RoundedInput
                placeholder="Enter email"
                disabled={!!formData}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            {!formData && (
              <Form.Item
                label="Temporary Password"
                name="tempPassword"
                rules={[{ required: true, message: "Enter temp password" }]}
              >
                <RoundedInput
                  type="password"
                  placeholder="Enter temp password"
                />
              </Form.Item>
            )}
          </Col>
        </Row>

        <Title level={5}>Primary Role</Title>
        <Form.Item
          label="Primary Role"
          name="primaryRole"
          rules={[{ required: true, message: "Please select role" }]}
        >
          <RoundedSelect
            placeholder="Select role"
            options={roles.map((r) => ({ label: r.name, value: r._id }))}
          />
        </Form.Item>

        <Title level={4}>Module Access Rights</Title>
        <div
          style={{
            maxHeight: 400,
            overflowY: "auto",
            padding: 10,
            border: "1px solid #f0f0f0",
            borderRadius: 8,
            background: "#fafafa",
          }}
        >
          {renderModules(modules)}
        </div>

        <div
          style={{
            marginTop: 16,
            padding: 12,
            backgroundColor: "#f5f5f5",
            borderRadius: 6,
          }}
        >
          <Title level={5} style={{ margin: 0 }}>
            Selected Permissions: {selectedPermissions.length}
          </Title>
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
            {selectedPermissions.slice(0, 5).join(", ")}
            {selectedPermissions.length > 5 &&
              ` ... and ${selectedPermissions.length - 5} more`}
          </div>
        </div>
      </Form>
    </GlobalModal>
  );
};

export default AddUserModal;

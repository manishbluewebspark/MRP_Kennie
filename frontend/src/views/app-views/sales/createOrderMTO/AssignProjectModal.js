import React from 'react';
import { Modal, Form, Select, Button, Typography } from 'antd';

const { Title, Text } = Typography;
const { Option } = Select;

const AssignProjectModal = ({ visible, onClose, onAssign, projects }) => {
  const [form] = Form.useForm();

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  const handleAssign = () => {
    form.validateFields()
      .then(values => {
        console.log('Assigned project:', values.project);
        onAssign(values.project);
        handleCancel();
      })
      .catch(errorInfo => {
        console.log('Validation failed:', errorInfo);
      });
  };

  return (
    <Modal
      title={
        <Title level={3} style={{ margin: 0, textAlign: 'center' }}>
          Assign Project to Drawing
        </Title>
      }
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel} size="large">
          Cancel
        </Button>,
        <Button
          key="assign"
          type="primary"
          onClick={handleAssign}
          size="large"
        >
          Assign Project
        </Button>,
      ]}
      width={500}
      centered
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Text type="secondary" style={{ fontSize: '14px', lineHeight: '1.5' }}>
          Select a project to assign to this drawing for proper costing context
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 24 }}
      >
        <Form.Item
          name="project"
          label={<Text strong style={{ fontSize: '14px' }}>Project</Text>}
          rules={[{ required: true, message: 'Please select a project' }]}
        >
          <Select
            placeholder="Select project"
            size="large"
            style={{ width: '100%' }}
          >
            {projects.map(project => (
              <Option key={project._id} value={project._id}>
                {project.projectName}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AssignProjectModal;
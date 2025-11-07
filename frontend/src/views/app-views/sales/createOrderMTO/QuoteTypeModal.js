// QuoteTypeModal.js
import React, { useState } from "react";
import { Modal, Space, Button, Upload, Typography, message, Spin, Select } from "antd";
import { InboxOutlined, UploadOutlined } from "@ant-design/icons";
import DrawingService from "services/DrawingService";
import { hasPermission } from "utils/auth";
import { Form } from "react-router-dom";

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { Option } = Select;
const QuoteTypeModal = ({ visible, onClose, onQuoteTypeSelect, onUploadSuccess, projectData }) => {
  const [selected, setSelected] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [selectedProject,setSelectedProject] = useState()
  const quoteTypes = [
    { value: "cable_harness", title: "Cable Harness/Assembly Quote", description: "Generate quote with all drawing costing data" },
    { value: "box_build", title: "Box Build Assembly Quote", description: "Drawing & BOM list will import in under Work Order" },
    { value: "other", title: "Other Quote", description: "Generate customer.quote_for_other.services" },
  ];

  const uploadProps = {
    name: "file",
    multiple: false,
    showUploadList: false,
    disabled: uploading || !selected,
    async beforeUpload(file) {
      setUploading(true);
      const hide = message.loading("Importing drawings…", 0); // persistent until hide()
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("quoteType", selected);
        formData.append("project",selectedProject)
        const res = await DrawingService.importDrawings(formData);

        if (res?.success) {
          message.success(res?.message || "Drawings imported successfully!");
          if (onUploadSuccess) onUploadSuccess();
          onClose();
        } else {
          message.error(res?.message || "Import failed");
        }
      } catch (err) {
        message.error(err?.message || "Import failed");
      } finally {
        hide();
        setUploading(false);
      }
      // Prevent Upload from auto posting since we handled it
      return false;
    },
  };

  const handleContinue = () => {
    onQuoteTypeSelect(selected);
  };

  return (
    <Modal
      title="Select Quote Type"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>Cancel</Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleContinue}
          disabled={uploading}
        >
          {uploading ? "Please wait…" : "Continue"}
        </Button>
      ]}
      width={720}
      centered
      maskClosable={!uploading}
      keyboard={!uploading}
      closable={!uploading}

    >
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <div>
          {quoteTypes.map((q) => (
            <div
              key={q.value}
              onClick={() => setSelected(q.value)}
              style={{
                border: selected === q.value ? "2px solid #1890ff" : "1px solid #e8e8e8",
                padding: 12,
                borderRadius: 6,
                marginBottom: 8,
                cursor: "pointer",
                background: selected === q.value ? "#f0f8ff" : "#fafafa",
              }}
            >
              <Text strong style={{ display: "block" }}>{q.title}</Text>
              <Text type="secondary">{q.description}</Text>
            </div>
          ))}
        </div>



        {(selected === "cable_harness" || selected === "other") && hasPermission('sales.mto:import') && (
          <>
            <div>
              <Select
                placeholder="Select Project"
                showSearch
                optionFilterProp="children"
                style={{ width: "100%" }}
                onChange={(value) => {
                  setSelectedProject(value)
                }} // optional
              >
                {projectData?.map((project) => (
                  <Option key={project._id} value={project._id}>
                    {project.projectName}
                  </Option>
                ))}
              </Select>
            </div>
            <Spin spinning={uploading} tip="Importing…">
              {selectedProject && ( <div>
                <Dragger {...uploadProps} style={{ borderRadius: 8 }}>
                  <p style={{ fontSize: 28, color: "#1890ff" }}><InboxOutlined /></p>
                  <Title level={5}>Import drawings (optional)</Title>
                  <Text type="secondary">Drag & drop a file here, or click to select (simulated)</Text>
                  <div style={{ marginTop: 12 }}>
                    <Button icon={<UploadOutlined />}>Browse files</Button>
                  </div>
                </Dragger>
              </div>)}
             
            </Spin>
          </>
        )}
      </Space>
    </Modal>
  );
};

export default QuoteTypeModal;

// QuoteTypeModal.js
import React, { useState } from "react";
import { Modal, Space, Button, Upload, Typography, message, Spin, Select } from "antd";
import { InboxOutlined, UploadOutlined } from "@ant-design/icons";
import DrawingService from "services/DrawingService";
import { hasPermission } from "utils/auth";

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { Option } = Select;

const QuoteTypeModal = ({
  visible,
  onClose,
  onQuoteTypeSelect,
  onUploadSuccess,
  projectData
}) => {
  const [selected, setSelected] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedProject, setSelectedProject] = useState();
  const [isImportExcel, setIsImportExcel] = useState(false);

  const quoteTypes = [
    {
      value: "cable_harness",
      title: "Cable Harness/Assembly Quote",
      description: "Generate quote with all drawing costing data",
    },
    {
      value: "box_build",
      title: "Box Build Assembly Quote",
      description: "Drawing & BOM list will import in under Work Order",
    },
    {
      value: "other",
      title: "Other Quote",
      description: "Generate customer.quote_for_other.services",
    },
  ];

  // Reset import panel whenever user switches quote type
  const handleSelectType = (val) => {
    setSelected(val);
    setIsImportExcel(false);
    setSelectedProject(undefined);
  };

  // Ensure clean state on close
  const handleClose = () => {
    if (uploading) return;
    setSelected("");
    setIsImportExcel(false);
    setSelectedProject(undefined);
    onClose?.();
  };

  const uploadProps = {
    name: "file",
    multiple: false,
    showUploadList: false,
    // disable until user picked a project and import panel opened
    disabled: uploading || !isImportExcel || !selectedProject || !selected,
    async beforeUpload(file) {
      setUploading(true);
      const hide = message.loading("Importing drawings…", 0);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("quoteType", selected);
        formData.append("project", selectedProject);

        const res = await DrawingService.importDrawings(formData);

        if (res?.success) {
          message.success(res?.message || "Drawings imported successfully!");
          onUploadSuccess?.();
          handleClose();
        } else {
          message.error(res?.message || "Import failed");
        }
      } catch (err) {
        message.error(err?.message || "Import failed");
      } finally {
        hide();
        setUploading(false);
      }
      // Prevent auto upload; we handled it
      return false;
    },
  };

  const handleContinue = () => {
    if (!selected) {
      message.warning("Please select a quote type");
      return;
    }
    onQuoteTypeSelect?.(selected);
  };

  // Show Import button only for Cable/Other + permission
  const canShowImportBtn =
    (selected === "cable_harness" || selected === "other") &&
    hasPermission("sales.mto:import");

  // Show Project dropdown + Dragger ONLY when Import was clicked
  const showImportPanel = canShowImportBtn && isImportExcel;

  return (
    <Modal
      title="Select Quote Type"
      open={visible}
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>,
        canShowImportBtn && (
          <Button
            key="excel"
            type="primary"
            style={{ background: "#909846ff" }}
            onClick={() => setIsImportExcel(true)}
            disabled={uploading}
          >
            Import
          </Button>
        ),
        <Button
          key="submit"
          type="primary"
          onClick={handleContinue}
          disabled={uploading}
        >
          {uploading ? "Please wait…" : "Create Quote"}
        </Button>,
      ].filter(Boolean)}
      width={720}
      centered
      maskClosable={!uploading}
      keyboard={!uploading}
      closable={!uploading}
    >
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        {/* Quote type selection */}
        <div>
          {quoteTypes.map((q) => (
            <div
              key={q.value}
              onClick={() => handleSelectType(q.value)}
              style={{
                border:
                  selected === q.value ? "2px solid #1890ff" : "1px solid #e8e8e8",
                padding: 12,
                borderRadius: 6,
                marginBottom: 8,
                cursor: "pointer",
                background: selected === q.value ? "#f0f8ff" : "#fafafa",
              }}
            >
              <Text strong style={{ display: "block" }}>
                {q.title}
              </Text>
              <Text type="secondary">{q.description}</Text>
            </div>
          ))}
        </div>

        {/* Import Excel Panel — appears only after clicking Import */}
        {showImportPanel && (
          <>
            <div>
              <span style={{color:'red', padding:'5px'}}>
                 Please Select Project First
              </span>
              <Select
                placeholder={
                  <span style={{ color: '#181515ff' }}>
                    Select Project
                  </span>
                }
                showSearch
                optionFilterProp="children"
                style={{ width: "100%",borderColor:'b22b2bff' }}
                value={selectedProject}
                onChange={(value) => setSelectedProject(value)}
                disabled={uploading}
              >
                {projectData?.map((project) => (
                  <Option key={project._id} value={project._id}>
                    {project.projectName}
                  </Option>
                ))}
              </Select>
            </div>

            <Spin spinning={uploading} tip="Importing…">
              {selectedProject && (
                <div>
                  <Dragger {...uploadProps} style={{ borderRadius: 8 }}>
                    <p style={{ fontSize: 28, color: "#1890ff" }}>
                      <InboxOutlined />
                    </p>
                    <Title level={5}>Import drawings</Title>
                    <Text type="secondary">
                      Drag & drop an Excel file here, or click to select
                    </Text>
                    <div style={{ marginTop: 12 }}>
                      <Button icon={<UploadOutlined />}>Browse files</Button>
                    </div>
                  </Dragger>
                </div>
              )}
            </Spin>
          </>
        )}
      </Space>
    </Modal>
  );
};

export default QuoteTypeModal;

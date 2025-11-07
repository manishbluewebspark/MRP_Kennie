import React, { useState } from "react";
import { Form, Input, Button, message, Upload, Card, List, Typography, Divider, Space, Tag } from "antd";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { updatePassword } from "store/slices/authSlice"; // your thunk

const { Title, Text } = Typography;

// 👉 configure your sample files here (name + direct URL on your server/public)
const SAMPLE_FILES = [
  { name: "Box Build Assembly", url: "/samples/Box Build Assembly import.xlsx" },
  { name: "Cable Harness",  url: "/samples/Cable Harness Import.xlsx" },
  { name: "Child Part Library", url: "/samples/Child_Part_Library_Import.xlsx" },
  { name: "MPN Library", url: "/samples/MPN Library_Import.xlsx" },
  { name: "Other Drawing", url: "/samples/Others Drawing  import final .xlsx" },
  { name: "Work Order", url: "/samples/Work Order-Import_format.xlsx" },
];

// accepted types for upload
const ACCEPTED_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel",                                          // .xls
  "text/csv",                                                          // .csv
];

const MAX_SIZE_MB = 5; // change if you want

const SettingsSecurityPage = () => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);

  // ========= Change Password =========
  const onFinish = async (values) => {
    const key = "pwdUpdate";
    message.loading({ content: "Updating password...", key });

    try {
      await dispatch(updatePassword(values)).unwrap();
      message.success({ content: "Password updated successfully!", key, duration: 2 });
      form.resetFields();
    } catch (err) {
      const msg = typeof err === "string" ? err : err?.message || "Failed to update password!";
      message.error({ content: msg, key, duration: 2 });
    }
  };

  // ========= Upload handlers =========
  const beforeUpload = (file) => {
    // type check
    if (!ACCEPTED_TYPES.includes(file.type)) {
      message.error("Please upload an Excel (.xlsx/.xls) or CSV (.csv) file.");
      return Upload.LIST_IGNORE;
    }
    // size check
    const isLt = file.size / 1024 / 1024 < MAX_SIZE_MB;
    if (!isLt) {
      message.error(`File must be smaller than ${MAX_SIZE_MB} MB.`);
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const handleCustomUpload = async ({ file, onSuccess, onError }) => {
    setUploading(true);
    try {
      // build form data for API
      const fd = new FormData();
      fd.append("file", file);

      // call your backend upload/import endpoint
      // example: POST /api/import/excel
      const res = await fetch("/api/import/excel", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Upload failed");
      }

      message.success(`Uploaded: ${file.name}`);
      onSuccess?.("ok");
    } catch (e) {
      message.error(e?.message || "Upload failed");
      onError?.(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4">
      {/* <Title level={4} style={{ marginBottom: 16 }}>Settings / Security</Title> */}

      <div className="grid md:grid-cols-2 gap-4">

        {/* Sample Files + Upload Card */}
        <Card title="Sample Files" bordered>
          <Text type="secondary">
            Download a sample template, fill your data, then upload the completed file here.
          </Text>

          <Divider />

          {/* Sample file list */}
          <Title level={5} style={{ marginBottom: 8 }}>Download Sample Templates</Title>
          <List
            size="small"
            dataSource={SAMPLE_FILES}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <a href={item.url} key="dl" download>
                    <Button icon={<DownloadOutlined />}>Download</Button>
                  </a>,
                ]}
              >
                <List.Item.Meta
                  title={item.name}
                //   description={<Tag color="geekblue">.xlsx</Tag>}
                />
              </List.Item>
            )}
          />

       

          
        </Card>
      </div>
    </div>
  );
};

export default SettingsSecurityPage;

import React, { useEffect, useState } from "react";
import {
  Table,
  Tag,
  Card,
  Input,
  Button,
  Tooltip,
  message,
  Modal,
  Col,
} from "antd";
import {
  EyeOutlined,
  DownloadOutlined,
  ReloadOutlined,
  DeleteOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import DemandListService from "services/DemandListService";
import useDebounce from "utils/debouce";
import { formatDate } from "utils/formatDate";
import GlobalTableActions from "components/GlobalTableActions";
import { useNavigate } from "react-router-dom";

/* =======================
   Helpers
======================= */

const statusTag = (status) => {
  let color = "default";
  if (status === "Processing") color = "processing";
  if (status === "Completed") color = "green";
  if (status === "Failed") color = "red";
  return <Tag color={color}>{status || "-"}</Tag>;
};

/* =======================
   Component
======================= */

const DemandListPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const navigate = useNavigate()
  const [uploadOpen, setUploadOpen] = useState(false);

  /* =======================
     Fetch
  ======================= */

  const fetchDemandLists = async (params = {}) => {
    setLoading(true);
    try {
      const res = await DemandListService.getAllDemandLists({
        page: params.page || page,
        limit,
        search: params.search ?? search,
      });

      if (res?.success) {
        setData(res.data || []);
        setTotal(res.totalCount || 0);
      } else {
        message.error(res?.message || "Failed to load demand lists");
      }
    } catch (err) {
      console.error(err);
      message.error("Failed to load demand lists");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemandLists();
    // eslint-disable-next-line
  }, []);

  /* =======================
     Debounced Search
  ======================= */

  const handleSearch = useDebounce((val) => {
    setPage(1);
    fetchDemandLists({ page: 1, search: val });
  }, 500);

  /* =======================
     Actions
  ======================= */

  const handleDelete = async (id) => {
    Modal.confirm({
      title: "Delete Demand List?",
      content: "This action cannot be undone.",
      okType: "danger",
      onOk: async () => {
        try {
          await DemandListService.deleteDemandList(id);
          message.success("Demand list deleted");
          fetchDemandLists({ page: 1 });
        } catch (e) {
          message.error("Failed to delete");
        }
      },
    });
  };

  const handleReprocess = async (id) => {
    try {
      await DemandListService.getDemandListById(id);
      message.success("Reprocessing started");
      fetchDemandLists();
    } catch (e) {
      message.error("Failed to reprocess");
    }
  };

  const onSearchChange = useDebounce((val) => {
  setSearch(val);
  setPage(1);
  fetchDemandLists({ page: 1, search: val });
}, 500);


const handleImport = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", file.name);

  try {
    setLoading(true);
    const res = await DemandListService.uploadDemandExcel(formData);

    if (res?.success) {
      message.success("Demand list imported successfully");
      setPage(1);
      fetchDemandLists({ page: 1 });
    } else {
      message.error(res?.message || "Import failed");
    }
  } catch (err) {
    console.error(err);
    message.error("Failed to import demand list");
  } finally {
    setLoading(false);
  }

  // IMPORTANT: prevent auto upload
  return false;
};


  /* =======================
     Table Columns
  ======================= */

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      render: (v) => <strong>{v}</strong>,
    },
    {
      title: "File Name",
      dataIndex: "fileName",
      render: (v) => <span style={{ color: "#1677ff" }}>{v}</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: statusTag,
    },
    {
      title: "Total Items",
      dataIndex: "totalItems",
      align: "center",
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      render: formatDate,
    },
    {
      title: "Processed",
      dataIndex: "processedAt",
      render: formatDate,
    },
    {
      title: "Actions",
      align: "center",
      width: 180,
      render: (_, record) => (
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Tooltip title="View Items">
            <EyeOutlined
              style={{ color: "#1677ff", cursor: "pointer" }}
              onClick={() => {
                navigate(`/app/work-order/demand-item-list/${record._id}`)
                console.log("VIEW", record._id);
              }}
            />
          </Tooltip>

          <Tooltip title="Download Excel">
            <DownloadOutlined
              style={{ color: "#22c55e", cursor: "pointer" }}
              onClick={() => DemandListService.download(record._id)}
            />
          </Tooltip>

          <Tooltip title="Reprocess">
            <ReloadOutlined
              style={{ color: "#f59e0b", cursor: "pointer" }}
              onClick={() => handleReprocess(record._id)}
            />
          </Tooltip>

          <Tooltip title="Delete">
            <DeleteOutlined
              style={{ color: "#ef4444", cursor: "pointer" }}
              onClick={() => handleDelete(record._id)}
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  /* =======================
     Render
  ======================= */

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        width: '100%'
      }}>


        <div>
          <h2 style={{ margin: 0 }}>Demand List</h2>
          <p style={{ margin: 0, fontSize: 14, color: '#888' }}>
            Import and manage material demand list
          </p>
        </div>

        <div>

          <Col>
            <GlobalTableActions
  showSearch
  onSearch={(val) => onSearchChange(val)}
  showImport
  importText="Import Demand List"
  onImport={handleImport}
/>

          </Col>



        </div>


      </div>

      {/* Table */}
      <Card>
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            onChange: (p) => {
              setPage(p);
              fetchDemandLists({ page: p });
            },
          }}
        />
      </Card>
    </div>
  );
};

export default DemandListPage;

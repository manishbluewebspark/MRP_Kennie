import React, { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { DatePicker, Spin } from "antd";
import Card from "components/shared-components/Card";
import axios from "axios";
import dayjs from "dayjs";
import DashboardService from "services/DashboardService";

const { RangePicker } = DatePicker;

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const formatLabel = (val = "") =>
  val
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");

const ProjectTypeProductionChart = () => {
  const [data, setData] = useState([]);
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async (from, to) => {
    setLoading(true);
    try {
      const res = await DashboardService.getProjectTypeChartData({params: { from, to }});
      setData(res.data || []);
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // initial load (last 30 days)
  useEffect(() => {
    const from = dayjs().subtract(30, "day").format("YYYY-MM-DD");
    const to = dayjs().format("YYYY-MM-DD");
    fetchData(from, to);
  }, []);

  const labels = data.map((d) => formatLabel(d.type));

  const chartData = {
    labels,
    datasets: [
      {
        label: "In Production",
        data: data.map((d) => d.inProduction ?? 0),
        backgroundColor: "#1890ff",
      },
      {
        label: "Completed",
        data: data.map((d) => d.completed ?? 0),
        backgroundColor: "#52c41a",
      },
      {
        label: "Not Started",
        data: data.map((d) => d.notStarted ?? 0),
        backgroundColor: "#faad14",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
      },
    },
  };

  return (
    <Card
      title="Production by Project Type"
      extra={
        <RangePicker
          allowClear
          onChange={(vals) => {
            if (!vals) return;
            const from = vals[0].format("YYYY-MM-DD");
            const to = vals[1].format("YYYY-MM-DD");
            setDates(vals);
            fetchData(from, to);
          }}
        />
      }
    >
      <div style={{ height: 400 }}>
        {loading ? <Spin /> : <Bar data={chartData} options={options} />}
      </div>
    </Card>
  );
};

export default ProjectTypeProductionChart;

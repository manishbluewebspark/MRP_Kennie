import React from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import Card from "components/shared-components/Card";

ChartJS.register(ArcElement, Tooltip, Legend);

const OutgoingMTOChartCard = ({ data = {} }) => {
  const chartData = {
    // labels: [
    //   "Ready for Delivery",
    //   "In Packing",
    //   "Pending Production",
    // ],
    datasets: [
      {
        data: [
          data.ready || 0,
          data.packing || 0,
          data.pending || 0,
        ],
        backgroundColor: ["#52c41a", "#1890ff", "#faad14"],
        borderWidth: 0,
      },
    ],
  };

  const total =
    (data.ready || 0) +
    (data.packing || 0) +
    (data.pending || 0);

  return (
    <Card title="Outgoing Inventory (MTO)">
      <div style={{ height: 255, position: "relative",marginLeft:40 }}>
        <Doughnut
          data={chartData}
          options={{
            cutout: "60%",
            plugins: {
              legend: { position: "center" },
            },
          }}
        />

        {/* Center Text */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "40%",
            transform: "translate(-50%,-50%)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 600 }}>
            {data.ready || 0}
          </div>
          <div style={{ fontSize: 12, color: "#888" }}>
            Ready MTO
          </div>
        </div>
      </div>

      {/* <div style={{ textAlign: "center", marginTop: 8, fontSize: 12 }}>
        Total MTO Orders: <b>{total}</b>
      </div> */}
    </Card>
  );
};

export default OutgoingMTOChartCard;

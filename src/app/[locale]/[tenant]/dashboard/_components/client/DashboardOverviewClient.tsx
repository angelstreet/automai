'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import dynamic from 'next/dynamic';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Import chart utility

// Use dynamic import with ssr: false to prevent hydration issues
const LineChart = dynamic(() => import('react-chartjs-2').then((mod) => mod.Line), {
  ssr: false,
  loading: () => <div className="h-[350px] bg-muted/5 animate-pulse rounded-lg" />,
});

// Define chart options outside component to prevent recreation on each render
const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
    },
    y: {
      type: 'linear' as const,
      beginAtZero: true,
      max: 100,
      ticks: {
        callback: function (value: number | string) {
          return `${value}%`;
        },
      },
    },
  },
};

// Define chart data
const chartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      data: [85, 88, 92, 87, 94, 96],
      borderColor: 'rgb(99, 102, 241)',
      backgroundColor: 'rgba(99, 102, 241, 0.5)',
      tension: 0.3,
      fill: false,
      pointRadius: 5,
      pointHoverRadius: 7,
    },
  ],
};

export function DashboardOverviewClient() {
  return (
    <div className="h-[350px]">
      <LineChart options={options} data={chartData} />
    </div>
  );
}

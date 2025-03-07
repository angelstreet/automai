'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Import chart config
import '@/lib/chart';

const LineChart = dynamic(() => import('react-chartjs-2').then((mod) => mod.Line), { ssr: false });

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

const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const data = {
  labels,
  datasets: [
    {
      data: [85, 88, 92, 87, 94, 96],
      borderColor: 'rgb(99, 102, 241)',
      backgroundColor: 'rgba(99, 102, 241, 0.5)',
      tension: 0.3,
    },
  ],
};

export function Overview() {
  const [isClient, setIsClient] = useState(false);
  const [chartData, setChartData] = useState(data);

  useEffect(() => {
    setIsClient(true);
    
    // Ensure chart data is valid to prevent undefined point errors
    setChartData({
      ...data,
      datasets: data.datasets.map(dataset => ({
        ...dataset,
        // Ensure data is not undefined and has valid length
        data: dataset.data || [0, 0, 0, 0, 0, 0],
        // Add missing required properties
        fill: false,
        pointRadius: 5,
        pointHoverRadius: 7
      }))
    });
  }, []);

  if (!isClient) {
    return <div className="h-[350px] bg-muted/5 animate-pulse rounded-lg" />;
  }

  return (
    <div className="h-[350px]">
      <LineChart options={options} data={chartData} />
    </div>
  );
}

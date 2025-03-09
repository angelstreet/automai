'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useMemo } from 'react';

// Import chart config
import '@/lib/chart';

// Use dynamic import with ssr: false to prevent hydration issues
const LineChart = dynamic(() => import('react-chartjs-2').then((mod) => mod.Line), { 
  ssr: false,
  loading: () => <div className="h-[350px] bg-muted/5 animate-pulse rounded-lg" />
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

// Define initial data outside component to prevent recreation on each render
const initialData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      data: [85, 88, 92, 87, 94, 96],
      borderColor: 'rgb(99, 102, 241)',
      backgroundColor: 'rgba(99, 102, 241, 0.5)',
      tension: 0.3,
      fill: false,
      pointRadius: 5,
      pointHoverRadius: 7
    },
  ],
};

export function Overview() {
  // Use a single state variable for client-side rendering check
  const [mounted, setMounted] = useState(false);
  
  // Use useMemo to create chart data only once
  const chartData = useMemo(() => initialData, []);

  // Run effect only once on mount
  useEffect(() => {
    setMounted(true);
    // No cleanup needed, so return nothing
  }, []);

  // If not mounted yet, show loading state
  if (!mounted) {
    return <div className="h-[350px] bg-muted/5 animate-pulse rounded-lg" />;
  }

  return (
    <div className="h-[350px]">
      <LineChart options={options} data={chartData} />
    </div>
  );
}

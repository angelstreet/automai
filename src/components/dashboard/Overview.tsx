'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

// Sample data for the chart
const data = [
  {
    name: 'Jan',
    total: 95,
  },
  {
    name: 'Feb',
    total: 92,
  },
  {
    name: 'Mar',
    total: 98,
  },
  {
    name: 'Apr',
    total: 90,
  },
  {
    name: 'May',
    total: 94,
  },
  {
    name: 'Jun',
    total: 97,
  },
  {
    name: 'Jul',
    total: 93,
  },
  {
    name: 'Aug',
    total: 96,
  },
  {
    name: 'Sep',
    total: 99,
  },
  {
    name: 'Oct',
    total: 95,
  },
  {
    name: 'Nov',
    total: 91,
  },
  {
    name: 'Dec',
    total: 97,
  },
];

export function Overview() {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis
            dataKey="name"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          Month
                        </span>
                        <span className="font-bold text-muted-foreground">
                          {payload[0].payload.name}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                          Success Rate
                        </span>
                        <span className="font-bold">{payload[0].value}%</span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar
            dataKey="total"
            fill="currentColor"
            radius={[4, 4, 0, 0]}
            className="fill-primary"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 
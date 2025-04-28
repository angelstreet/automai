'use client';

import { Bar, Line } from 'react-chartjs-2';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table';
import { getUpdatedBarChartConfig } from '@/lib/utils/grafanaChartUtils';
import {
  processTimeSeriesData,
  processBargaugeData,
  processTableData,
  getStatusColorClass,
} from '@/lib/utils/grafanaDataUtils';

interface ChartProps {
  panel: any;
  data: any;
}

interface ChartDataOnlyProps {
  data: any;
}

// For components that need panel data
export function BarChartPanelClient({ panel, data }: ChartProps) {
  if (!data) return <div className="text-muted-foreground">No data available</div>;

  return (
    <div style={{ height: '200px' }}>
      <Bar {...getUpdatedBarChartConfig(panel, data)} />
    </div>
  );
}

// For components that only need data
export function TimeSeriesPanelClient({ data }: ChartDataOnlyProps) {
  if (!data) return <div className="text-muted-foreground">No data available</div>;

  return (
    <div style={{ height: '200px' }}>
      <Line
        data={processTimeSeriesData(data)}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        }}
      />
    </div>
  );
}

export function StatPanelClient({ panel, data }: ChartProps) {
  if (!data || !data.results || !data.results.A || !data.results.A.frames) {
    return <div className="text-2xl font-medium mt-2">No data</div>;
  }

  try {
    const frames = data.results.A.frames;
    if (!frames.length) return <div className="text-2xl font-medium mt-2">No data</div>;

    const frame = frames[0];
    const values = frame.data?.values || [];

    // Check special panel types by title
    const panelTitle = panel.title?.toLowerCase() || '';
    const isDurationPanel = panelTitle.includes('duration');
    const isRatePanel =
      panelTitle.includes('rate') ||
      panelTitle.includes('percentage') ||
      panelTitle.includes('ratio');
    const isCountPanel = panelTitle.includes('count') || panelTitle.includes('number');

    // For all known numerical panels, find numeric value across all columns
    if ((isDurationPanel || isRatePanel || isCountPanel) && values.length > 0) {
      // Look for numeric values in all columns
      for (let i = 0; i < values.length; i++) {
        if (values[i] && values[i].length > 0 && typeof values[i][0] === 'number') {
          // Found a numeric value
          const numericValue = values[i][0];

          // Format based on panel type
          if (isDurationPanel) {
            // Format durations as time
            if (numericValue < 60) {
              return <div className="text-2xl font-medium mt-2">{numericValue.toFixed(2)}s</div>;
            } else {
              const minutes = Math.floor(numericValue / 60);
              const seconds = Math.round(numericValue % 60);
              return (
                <div className="text-2xl font-medium mt-2">
                  {minutes}m {seconds}s
                </div>
              );
            }
          } else if (isRatePanel) {
            // For rate panels, display as a simple rounded number without percentage symbol
            // Check if the value is very small (likely in decimal form)
            const displayValue = numericValue < 0.1 ? numericValue * 100 : numericValue;

            // Round to nearest integer if close to whole number, otherwise show one decimal place
            const formattedValue =
              Math.abs(displayValue - Math.round(displayValue)) < 0.1
                ? Math.round(displayValue)
                : Number(displayValue.toFixed(1));

            return <div className="text-2xl font-medium mt-2">{formattedValue}</div>;
          } else {
            // Format general numbers
            return <div className="text-2xl font-medium mt-2">{numericValue.toLocaleString()}</div>;
          }
        }
      }
    }

    // Default behavior - try to get the first value
    if (values.length > 0 && values[0].length > 0) {
      // If it's a number, format it nicely
      if (typeof values[0][0] === 'number') {
        return <div className="text-2xl font-medium mt-2">{values[0][0].toLocaleString()}</div>;
      }
      return <div className="text-2xl font-medium mt-2">{values[0][0]}</div>;
    }

    // If we have a second column with values (common in Grafana stats)
    if (values.length > 1 && values[1] && values[1].length > 0) {
      // If it's a number, format it nicely
      if (typeof values[1][0] === 'number') {
        return <div className="text-2xl font-medium mt-2">{values[1][0].toLocaleString()}</div>;
      }
      return <div className="text-2xl font-medium mt-2">{values[1][0]}</div>;
    }

    return <div className="text-2xl font-medium mt-2">No data</div>;
  } catch (error) {
    console.error('Error in StatPanelClient:', error);
    return <div className="text-2xl font-medium mt-2">Error</div>;
  }
}

export function BargaugePanelClient({ data }: ChartDataOnlyProps) {
  return <div className="text-2xl font-medium mt-2">{processBargaugeData(data)}</div>;
}

interface TablePanelProps {
  panel: any;
  data: any;
  onCellClick: (title: string, content: string, isJson: boolean) => void;
}

export function TablePanelClient({ panel, data, onCellClick }: TablePanelProps) {
  const tableData = processTableData(data);

  if (tableData.headers.length === 0 || tableData.rows.length === 0) {
    return <div className="text-muted-foreground">No data available</div>;
  }

  return (
    <div className="w-full overflow-auto max-h-[350px] mt-2">
      <Table>
        <TableHeader>
          <TableRow>
            {tableData.headers.map((header: any, i: number) => (
              <TableHead key={i} className="whitespace-nowrap">
                {header.name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableData.rows.map((row: any[], rowIndex: number) => (
            <TableRow key={rowIndex}>
              {row.map((cell, cellIndex: number) => {
                // Format different cell contents based on type
                const content = cell !== null && cell !== undefined ? String(cell) : '';
                const isJSON = content.startsWith('{') && content.endsWith('}');
                const isLongText = content.length > 60;

                // Check if this cell is a status cell
                const headerName = tableData.headers[cellIndex]?.name.toLowerCase() || '';
                const isStatusCell = headerName === 'status' || headerName.includes('status');

                // For status cells, apply appropriate color coding
                if (isStatusCell) {
                  const statusColorClass = getStatusColorClass(content);
                  return (
                    <TableCell key={cellIndex} className="whitespace-nowrap text-center">
                      <span className={`font-medium rounded-md px-2 py-1 ${statusColorClass}`}>
                        {content}
                      </span>
                    </TableCell>
                  );
                }

                // For JSON content
                if (isJSON) {
                  try {
                    // Try to parse and format JSON
                    const jsonObj = JSON.parse(content);
                    const formattedContent = Object.entries(jsonObj)
                      .map(
                        ([key, value]) =>
                          `${key}: ${String(value).substring(0, 20)}${String(value).length > 20 ? '...' : ''}`,
                      )
                      .join(', ');

                    return (
                      <TableCell
                        key={cellIndex}
                        className="max-w-[300px] truncate cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Click to view full content"
                        onClick={() => {
                          onCellClick(
                            `${panel.title} - ${tableData.headers[cellIndex]?.name || 'Output'}`,
                            content,
                            true,
                          );
                        }}
                      >
                        {`{${formattedContent.substring(0, 30)}${formattedContent.length > 30 ? '...' : ''}}`}
                      </TableCell>
                    );
                  } catch {
                    // Fallback if JSON parsing fails
                    return (
                      <TableCell
                        key={cellIndex}
                        className="max-w-[300px] truncate cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Click to view full content"
                        onClick={() => {
                          onCellClick(
                            `${panel.title} - ${tableData.headers[cellIndex]?.name || 'Output'}`,
                            content,
                            false,
                          );
                        }}
                      >
                        {content.substring(0, 30)}...
                      </TableCell>
                    );
                  }
                }

                // For long text content
                if (isLongText) {
                  return (
                    <TableCell
                      key={cellIndex}
                      className="max-w-[300px] truncate cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      title="Click to view full content"
                      onClick={() => {
                        onCellClick(
                          `${panel.title} - ${tableData.headers[cellIndex]?.name || 'Content'}`,
                          content,
                          false,
                        );
                      }}
                    >
                      {content.substring(0, 30)}...
                    </TableCell>
                  );
                }

                // For normal content
                return (
                  <TableCell key={cellIndex} className="whitespace-nowrap">
                    {content}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

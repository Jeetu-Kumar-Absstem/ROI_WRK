// src/components/StaticChartComponents.tsx
import React from 'react';
import { formatIndianCurrency } from '../utils/formatting';

// Helper function to format numbers in Lakhs for PDF - FIXED for negative values
const formatInLakhsForPdf = (value: number): string => {
  // Handle negative values
  const isNegative = value < 0;
  const absoluteValue = Math.abs(value);
  const lakhs = absoluteValue / 100000;
  
  let formattedValue = '';
  if (lakhs >= 100) {
    formattedValue = `₹${(lakhs / 100).toFixed(1)}Cr`;
  } else if (lakhs >= 1) {
    formattedValue = `₹${lakhs.toFixed(1)}L`;
  } else {
    formattedValue = `₹${absoluteValue.toFixed(0)}`;
  }
  
  return isNegative ? `-${formattedValue}` : formattedValue;
};

interface BarChartData {
  name: string;
  'Monthly Cost': number;
  'Annual Cost': number;
}

interface StaticMonthlyAnnualCostChartProps {
  data: BarChartData[];
  width?: number | string;
  height?: number;
  chartType?: 'monthly' | 'annual';
}

export const StaticMonthlyAnnualCostChart: React.FC<StaticMonthlyAnnualCostChartProps> = ({
  data,
  width = '100%',
  height = 350,
  chartType = 'monthly',
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [svgWidth, setSvgWidth] = React.useState(700);

  React.useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        setSvgWidth(Math.max(containerWidth - 20, 650));
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    setTimeout(updateWidth, 100);
    
    return () => window.removeEventListener('resize', updateWidth);
  }, [data]);

  // Use appropriate values based on chart type
  const chartValues = chartType === 'monthly' 
    ? data.map(d => d['Monthly Cost'])
    : data.map(d => d['Annual Cost']);
  
  const maxValue = Math.max(...chartValues) || 1000000;
  
  const padding = { top: 60, right: 30, bottom: 70, left: 70 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const barGroupWidth = chartWidth / data.length;
  const barWidth = Math.min(barGroupWidth * 0.5, 120);
  
  const yScale = (value: number) => {
    if (maxValue === 0) return chartHeight;
    return chartHeight - (value / maxValue) * chartHeight;
  };

  // Generate Y-axis ticks in Lakhs
  const yTicks = [];
  const tickCount = 5;
  for (let i = 0; i <= tickCount; i++) {
    const value = (maxValue / tickCount) * i;
    yTicks.push(value);
  }

  const chartTitle = chartType === 'monthly' 
    ? 'Monthly Cost Comparison: Liquid Supply vs PSA System'
    : 'Annual Cost Comparison: Liquid Supply vs PSA System';

  return (
    <div ref={containerRef} style={{ width: '100%', height: `${height}px`, minHeight: '350px', textAlign: 'left' }}>
      <svg width={svgWidth} height={height} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', margin: '0' }}>
        <rect width={svgWidth} height={height} fill="white" />
        
        <text
          x={svgWidth / 2}
          y={25}
          textAnchor="middle"
          fontSize="13"
          fontFamily="Arial, sans-serif"
          fontWeight="bold"
          fill="#333"
        >
          {chartTitle}
        </text>
        
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartHeight} stroke="#333" strokeWidth={1.5} />
        <line x1={padding.left} y1={padding.top + chartHeight} x2={padding.left + chartWidth} y2={padding.top + chartHeight} stroke="#333" strokeWidth={1.5} />
        
        {yTicks.map((tick, idx) => {
          const y = padding.top + yScale(tick);
          return (
            <g key={`y-tick-${idx}`}>
              <line x1={padding.left - 5} y1={y} x2={padding.left} y2={y} stroke="#333" strokeWidth={1} />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fontFamily="Arial, sans-serif" fill="#666">
                {formatInLakhsForPdf(tick)}
              </text>
              <line x1={padding.left} y1={y} x2={padding.left + chartWidth} y2={y} stroke="#e0e0e0" strokeWidth={0.5} strokeDasharray="4,4" />
            </g>
          );
        })}
        
        {data.map((item, idx) => {
          const value = chartType === 'monthly' ? item['Monthly Cost'] : item['Annual Cost'];
          const x = padding.left + idx * barGroupWidth + (barGroupWidth / 2) - barWidth / 2;
          const barHeight = (value / maxValue) * chartHeight;
          const barY = padding.top + chartHeight - barHeight;
          const barColor = idx === 0 ? '#ef4444' : '#10b981';
          
          return (
            <g key={`bar-group-${idx}`}>
              <rect x={x} y={barY} width={barWidth} height={barHeight} fill={barColor} rx={2}>
                <title>{`${item.name}: ${formatInLakhsForPdf(value)}`}</title>
              </rect>
              <text x={x + barWidth/2} y={padding.top + chartHeight + 20} textAnchor="middle" fontSize="10" fontFamily="Arial, sans-serif" fill="#555">
                {item.name === 'Current Liquid Supply' ? 'Liquid Supply' : 'PSA System'}
              </text>
              <text x={x + barWidth/2} y={barY - 5} textAnchor="middle" fontSize="9" fontFamily="Arial, sans-serif" fill={barColor} fontWeight="bold">
                {formatInLakhsForPdf(value)}
              </text>
            </g>
          );
        })}
        
        <text x={padding.left - 40} y={padding.top + chartHeight / 2} textAnchor="middle" fontSize="11" fontFamily="Arial, sans-serif" fill="#666" transform={`rotate(-90, ${padding.left - 40}, ${padding.top + chartHeight / 2})`}>
          Cost
        </text>
      </svg>
    </div>
  );
};

interface ROIData {
  year: string;
  cumulativeCashFlow: number;
}

interface StaticROILineChartProps {
  data: ROIData[];
  breakEvenYearLabel?: string;
  width?: number | string;
  height?: number;
}

export const StaticROILineChart: React.FC<StaticROILineChartProps> = ({
  data,
  breakEvenYearLabel,
  width = '100%',
  height = 400,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [svgWidth, setSvgWidth] = React.useState(750);

  React.useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        setSvgWidth(Math.max(containerWidth - 20, 700));
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    setTimeout(updateWidth, 100);
    
    return () => window.removeEventListener('resize', updateWidth);
  }, [data]);

  const roiMin = Math.min(...data.map(d => d.cumulativeCashFlow), 0);
  const roiMax = Math.max(...data.map(d => d.cumulativeCashFlow), 1);
  const roiRange = Math.max(roiMax - roiMin, 1);
  const roiBuffer = roiRange * 0.05;
  
  const yMin = roiMin - roiBuffer;
  const yMax = roiMax + roiBuffer;
  
  const padding = { top: 55, right: 30, bottom: 70, left: 70 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const xScale = (index: number) => {
    if (data.length === 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (data.length - 1)) * chartWidth;
  };
  
  const yScale = (value: number) => {
    if (yMax === yMin) return padding.top + chartHeight / 2;
    return padding.top + chartHeight - ((value - yMin) / (yMax - yMin)) * chartHeight;
  };
  
  const yTicks = [];
  const tickCount = 6;
  for (let i = 0; i <= tickCount; i++) {
    const value = yMin + (yMax - yMin) * (i / tickCount);
    yTicks.push(value);
  }
  
  const points = data.map((item, idx) => ({
    x: xScale(idx),
    y: yScale(item.cumulativeCashFlow),
  }));
  
  const linePath = points.map((point, idx) => 
    idx === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
  ).join(' ');
  
  let breakEvenIndex = -1;
  if (breakEvenYearLabel && breakEvenYearLabel !== 'Year 0') {
    breakEvenIndex = data.findIndex(d => d.year === breakEvenYearLabel);
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: `${height}px`, minHeight: '400px', textAlign: 'left' }}>
      <svg width={svgWidth} height={height} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', margin: '0' }}>
        <rect width={svgWidth} height={height} fill="white" />
        
        <text x={svgWidth / 2} y={22} textAnchor="middle" fontSize="13" fontFamily="Arial, sans-serif" fontWeight="bold" fill="#333">
          Return on Investment (ROI) - Cumulative Cash Flow
        </text>
        
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartHeight} stroke="#333" strokeWidth={1.5} />
        <line x1={padding.left} y1={padding.top + chartHeight} x2={padding.left + chartWidth} y2={padding.top + chartHeight} stroke="#333" strokeWidth={1.5} />
        
        {/* Zero line */}
        <line x1={padding.left} y1={yScale(0)} x2={padding.left + chartWidth} y2={yScale(0)} stroke="#000" strokeWidth={1.5} strokeDasharray="6,3" />
        
        {yTicks.map((tick, idx) => {
          const y = yScale(tick);
          if (y < padding.top || y > padding.top + chartHeight) return null;
          return (
            <g key={`y-tick-${idx}`}>
              <line x1={padding.left - 5} y1={y} x2={padding.left} y2={y} stroke="#333" strokeWidth={1} />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="9" fontFamily="Arial, sans-serif" fill="#666">
                {formatInLakhsForPdf(tick)}
              </text>
              <line x1={padding.left} y1={y} x2={padding.left + chartWidth} y2={y} stroke="#e0e0e0" strokeWidth={0.5} strokeDasharray="4,4" />
            </g>
          );
        })}
        
        {/* X-axis labels */}
        {data.map((item, idx) => {
          const x = xScale(idx);
          if (idx % 2 !== 0 && idx !== data.length - 1 && data.length > 8) return null;
          return (
            <g key={`x-tick-${idx}`}>
              <line x1={x} y1={padding.top + chartHeight} x2={x} y2={padding.top + chartHeight + 5} stroke="#333" strokeWidth={1} />
              <text x={x} y={padding.top + chartHeight + 18} textAnchor="middle" fontSize="9" fontFamily="Arial, sans-serif" fill="#666">
                {item.year}
              </text>
            </g>
          );
        })}
        
        {/* Break-even line */}
        {breakEvenIndex !== -1 && breakEvenIndex < data.length && (
          <g>
            <line x1={xScale(breakEvenIndex)} y1={padding.top} x2={xScale(breakEvenIndex)} y2={padding.top + chartHeight} stroke="#ef4444" strokeWidth={2} strokeDasharray="6,3" />
            <text x={xScale(breakEvenIndex)} y={padding.top - 5} textAnchor="middle" fontSize="10" fontFamily="Arial, sans-serif" fill="#ef4444" fontWeight="bold">
              Break-even
            </text>
          </g>
        )}
        
        <path d={linePath} fill="none" stroke="#8884d8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        
        {points.map((point, idx) => (
          <circle key={`point-${idx}`} cx={point.x} cy={point.y} r={3.5} fill="#8884d8" stroke="white" strokeWidth={1.5} />
        ))}
        
        <text x={padding.left - 40} y={padding.top + chartHeight / 2} textAnchor="middle" fontSize="11" fontFamily="Arial, sans-serif" fill="#666" transform={`rotate(-90, ${padding.left - 40}, ${padding.top + chartHeight / 2})`}>
          Cumulative Cash Flow
        </text>
      </svg>
    </div>
  );
};

interface CumulativeSavingsTableProps {
  data: Array<{
    year: string;
    'Current System Cost': number;
    'PSA System Cost': number;
    'Cumulative Savings': number;
  }>;
}

export const CumulativeSavingsTable: React.FC<CumulativeSavingsTableProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div>No data available</div>;
  }

  return (
    <div style={{ width: '100%', overflowX: 'auto', padding: '16px' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        minWidth: '500px',
      }}>
        <thead>
          <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Year</th>
            <th style={{ padding: '10px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Current System Cost</th>
            <th style={{ padding: '10px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>PSA System Cost</th>
            <th style={{ padding: '10px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Cumulative Savings</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              style={{
                borderBottom: '1px solid #e5e7eb',
                backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
              }}
            >
              <td style={{ padding: '10px', fontWeight: '400', color: '#111827' }}>{row.year}</td>
              <td style={{ padding: '10px', textAlign: 'right', fontWeight: '400', color: '#111827' }}>
                {formatInLakhsForPdf(row['Current System Cost'])}
              </td>
              <td style={{ padding: '10px', textAlign: 'right', fontWeight: '400', color: '#111827' }}>
                {formatInLakhsForPdf(row['PSA System Cost'])}
              </td>
              <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600', color: '#059669' }}>
                {formatInLakhsForPdf(row['Cumulative Savings'])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
'use client';

import { useMemo } from 'react';

interface PriceSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showChange?: boolean;
  className?: string;
}

export function PriceSparkline({ 
  data, 
  width = 80, 
  height = 32,
  color,
  showChange = false,
  className = '' 
}: PriceSparklineProps) {
  const chartData = useMemo(() => {
    if (!data || data.length < 2) return null;
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    // Padding for stroke
    const padding = 2;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // Generate path points
    const points = data.map((value, i) => {
      const x = padding + (i / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((value - min) / range) * chartHeight;
      return { x, y };
    });
    
    // Create SVG path
    const pathD = points.reduce((acc, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      return `${acc} L ${point.x} ${point.y}`;
    }, '');
    
    // Area path for gradient
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
    
    // Calculate change
    const firstValue = data[0];
    const lastValue = data[data.length - 1];
    const change = ((lastValue - firstValue) / firstValue) * 100;
    const trend = lastValue > firstValue ? 'up' : lastValue < firstValue ? 'down' : 'flat';
    
    return { pathD, areaD, change, trend, lastPoint: points[points.length - 1] };
  }, [data, width, height]);

  if (!chartData) {
    return <div className={`${className}`} style={{ width, height }} />;
  }

  const { pathD, areaD, change, trend, lastPoint } = chartData;
  const autoColor = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6b7280';
  const strokeColor = color || autoColor;
  const gradientId = `sparkline-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="overflow-visible" style={{ width, height }}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Area fill */}
        <path d={areaD} fill={`url(#${gradientId})`} />
        
        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Current point indicator */}
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="2.5"
          fill={strokeColor}
        />
      </svg>
      
      {showChange && (
        <span className={`text-[10px] font-medium ${
          trend === 'up' ? 'text-emerald-400' : 
          trend === 'down' ? 'text-red-400' : 
          'text-gray-400'
        }`}>
          {change >= 0 ? '+' : ''}{change.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

// Mock data generator for testing
export function generateMockPriceData(basePrice: number, points: number = 24, volatility: number = 0.02): number[] {
  const data: number[] = [basePrice];
  
  for (let i = 1; i < points; i++) {
    const change = (Math.random() - 0.5) * 2 * volatility * basePrice;
    data.push(data[i - 1] + change);
  }
  
  return data;
}

'use client';

import { useMemo } from 'react';
import { useTheme } from './ThemeProvider';

interface DailyPnL {
  date: string;
  weatherPnlCents: number;
  cryptoPnlCents: number;
  combinedPnlCents: number;
}

interface WeatherCryptoPnLChartProps {
  data: DailyPnL[];
  height?: number;
  className?: string;
}

export function WeatherCryptoPnLChart({ 
  data, 
  height = 180, 
  className = '' 
}: WeatherCryptoPnLChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;
    
    const padding = { top: 25, right: 15, bottom: 35, left: 50 };
    const width = 340;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Calculate cumulative PnL
    let weatherCum = 0;
    let cryptoCum = 0;
    let combinedCum = 0;
    
    const cumulative = data.map(d => {
      weatherCum += d.weatherPnlCents;
      cryptoCum += d.cryptoPnlCents;
      combinedCum += d.combinedPnlCents;
      return {
        date: d.date,
        weather: weatherCum / 100, // Convert to dollars
        crypto: cryptoCum / 100,
        combined: combinedCum / 100
      };
    });
    
    // Find min/max for scaling
    const allValues = cumulative.flatMap(d => [d.weather, d.crypto, d.combined]);
    const minPnl = Math.min(0, ...allValues);
    const maxPnl = Math.max(0, ...allValues);
    const range = maxPnl - minPnl || 1;
    
    // Add some padding to the range
    const paddedMin = minPnl - range * 0.1;
    const paddedMax = maxPnl + range * 0.1;
    const paddedRange = paddedMax - paddedMin;
    
    // Generate path points for each series
    const getY = (value: number) => 
      padding.top + chartHeight - ((value - paddedMin) / paddedRange) * chartHeight;
    
    const getX = (i: number) => 
      padding.left + (i / (cumulative.length - 1 || 1)) * chartWidth;
    
    const weatherPoints = cumulative.map((d, i) => ({ x: getX(i), y: getY(d.weather), value: d.weather }));
    const cryptoPoints = cumulative.map((d, i) => ({ x: getX(i), y: getY(d.crypto), value: d.crypto }));
    const combinedPoints = cumulative.map((d, i) => ({ x: getX(i), y: getY(d.combined), value: d.combined }));
    
    // Create SVG paths
    const createPath = (points: { x: number; y: number }[]) =>
      points.reduce((acc, point, i) => {
        if (i === 0) return `M ${point.x} ${point.y}`;
        return `${acc} L ${point.x} ${point.y}`;
      }, '');
    
    const weatherPath = createPath(weatherPoints);
    const cryptoPath = createPath(cryptoPoints);
    const combinedPath = createPath(combinedPoints);
    
    // Zero line y position
    const zeroY = getY(0);
    
    // Final values for legend
    const finalWeather = cumulative[cumulative.length - 1]?.weather || 0;
    const finalCrypto = cumulative[cumulative.length - 1]?.crypto || 0;
    const finalCombined = cumulative[cumulative.length - 1]?.combined || 0;
    
    return {
      weatherPath,
      cryptoPath,
      combinedPath,
      weatherPoints,
      cryptoPoints,
      combinedPoints,
      zeroY,
      width,
      height,
      padding,
      chartHeight,
      chartWidth,
      paddedMin,
      paddedMax,
      finalWeather,
      finalCrypto,
      finalCombined,
      cumulative
    };
  }, [data, height]);

  if (!chartData || data.length < 2) {
    return (
      <div className={`bg-white/5 dark:bg-white/5 bg-black/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 dark:border-white/10 border-black/10 ${className}`}>
        <h3 className="text-sm font-medium text-white/60 dark:text-white/60 text-black/60 flex items-center gap-2 mb-4">
          <span className="text-lg">📈</span>
          Cumulative PnL Comparison
        </h3>
        <div className="flex items-center justify-center text-gray-500 text-sm py-8">
          Not enough data for PnL chart
        </div>
      </div>
    );
  }

  const { 
    weatherPath, cryptoPath, combinedPath,
    weatherPoints, cryptoPoints, combinedPoints,
    zeroY, width, padding, chartHeight, chartWidth,
    paddedMin, paddedMax,
    finalWeather, finalCrypto, finalCombined
  } = chartData;
  
  // Theme-aware colors
  const weatherColor = isDark ? '#fbbf24' : '#d97706'; // amber/yellow for weather
  const cryptoColor = isDark ? '#60a5fa' : '#2563eb'; // blue for crypto
  const combinedColor = isDark ? '#a78bfa' : '#7c3aed'; // purple for combined
  const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const labelColor = isDark ? '#6b7280' : '#9ca3af';

  // Y-axis labels
  const yLabels = [paddedMin, (paddedMin + paddedMax) / 2, paddedMax];

  return (
    <div className={`bg-white/5 dark:bg-white/5 bg-black/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 dark:border-white/10 border-black/10 ${className}`}>
      <h3 className="text-sm font-medium text-white/60 dark:text-white/60 text-black/60 flex items-center gap-2 mb-3">
        <span className="text-lg">📈</span>
        Cumulative PnL Comparison
      </h3>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded" style={{ backgroundColor: weatherColor }}></div>
          <span className="text-white/60 dark:text-white/60 text-black/60">Weather</span>
          <span className={finalWeather >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            ${finalWeather.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded" style={{ backgroundColor: cryptoColor }}></div>
          <span className="text-white/60 dark:text-white/60 text-black/60">Crypto</span>
          <span className={finalCrypto >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            ${finalCrypto.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded" style={{ backgroundColor: combinedColor }}></div>
          <span className="text-white/60 dark:text-white/60 text-black/60">Combined</span>
          <span className={finalCombined >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            ${finalCombined.toFixed(2)}
          </span>
        </div>
      </div>
      
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="weather-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={weatherColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor={weatherColor} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="crypto-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={cryptoColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor={cryptoColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        {yLabels.map((val, i) => {
          const y = padding.top + chartHeight - ((val - paddedMin) / (paddedMax - paddedMin)) * chartHeight;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartWidth}
                y2={y}
                stroke={gridColor}
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 5}
                y={y + 4}
                textAnchor="end"
                fill={labelColor}
                fontSize="10"
              >
                ${val.toFixed(0)}
              </text>
            </g>
          );
        })}
        
        {/* Zero line (thicker) */}
        <line
          x1={padding.left}
          y1={zeroY}
          x2={padding.left + chartWidth}
          y2={zeroY}
          stroke={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
          strokeWidth="1.5"
        />
        
        {/* Chart lines */}
        <path
          d={weatherPath}
          fill="none"
          stroke={weatherColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={cryptoPath}
          fill="none"
          stroke={cryptoColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={combinedPath}
          fill="none"
          stroke={combinedColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="6 3"
        />
        
        {/* End point dots */}
        {weatherPoints.length > 0 && (
          <circle
            cx={weatherPoints[weatherPoints.length - 1].x}
            cy={weatherPoints[weatherPoints.length - 1].y}
            r="4"
            fill={weatherColor}
          />
        )}
        {cryptoPoints.length > 0 && (
          <circle
            cx={cryptoPoints[cryptoPoints.length - 1].x}
            cy={cryptoPoints[cryptoPoints.length - 1].y}
            r="4"
            fill={cryptoColor}
          />
        )}
        {combinedPoints.length > 0 && (
          <circle
            cx={combinedPoints[combinedPoints.length - 1].x}
            cy={combinedPoints[combinedPoints.length - 1].y}
            r="5"
            fill={combinedColor}
            stroke={isDark ? '#1f2937' : '#f3f4f6'}
            strokeWidth="2"
          />
        )}
        
        {/* X-axis labels (first and last date) */}
        <text
          x={padding.left}
          y={height - 5}
          textAnchor="start"
          fill={labelColor}
          fontSize="10"
        >
          {data[0]?.date}
        </text>
        <text
          x={padding.left + chartWidth}
          y={height - 5}
          textAnchor="end"
          fill={labelColor}
          fontSize="10"
        >
          {data[data.length - 1]?.date}
        </text>
      </svg>
      
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
        <div className="bg-white/5 dark:bg-white/5 bg-black/5 rounded-lg p-2">
          <div className="text-white/40 dark:text-white/40 text-black/40 mb-1">🌤️ Weather</div>
          <div className={`font-mono font-bold ${finalWeather >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {finalWeather >= 0 ? '+' : ''}{finalWeather.toFixed(2)}
          </div>
        </div>
        <div className="bg-white/5 dark:bg-white/5 bg-black/5 rounded-lg p-2">
          <div className="text-white/40 dark:text-white/40 text-black/40 mb-1">₿ Crypto</div>
          <div className={`font-mono font-bold ${finalCrypto >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {finalCrypto >= 0 ? '+' : ''}{finalCrypto.toFixed(2)}
          </div>
        </div>
        <div className="bg-white/5 dark:bg-white/5 bg-black/5 rounded-lg p-2">
          <div className="text-white/40 dark:text-white/40 text-black/40 mb-1">📊 Total</div>
          <div className={`font-mono font-bold ${finalCombined >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {finalCombined >= 0 ? '+' : ''}{finalCombined.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to parse PnL data from trade stats
export function parsePnLByMarketType(trades: Array<{
  ticker?: string;
  timestamp?: string;
  trade_date?: string;
  pnl_cents?: number;
  result_status?: string;
}>): DailyPnL[] {
  // Group trades by date
  const dailyMap = new Map<string, { weather: number; crypto: number }>();
  
  for (const trade of trades) {
    if (trade.result_status !== 'won' && trade.result_status !== 'lost') continue;
    
    const dateStr = trade.trade_date || trade.timestamp?.split('T')[0];
    if (!dateStr) continue;
    
    const pnl = trade.pnl_cents || 0;
    const isWeather = trade.ticker?.includes('KXHIGH') || trade.ticker?.includes('KXLOW') || 
                     trade.ticker?.startsWith('KX') && !trade.ticker?.includes('BTC') && !trade.ticker?.includes('ETH');
    
    const existing = dailyMap.get(dateStr) || { weather: 0, crypto: 0 };
    if (isWeather) {
      existing.weather += pnl;
    } else {
      existing.crypto += pnl;
    }
    dailyMap.set(dateStr, existing);
  }
  
  // Convert to array and sort by date
  const result: DailyPnL[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { weather, crypto }]) => ({
      date: date.slice(5), // MM-DD format
      weatherPnlCents: weather,
      cryptoPnlCents: crypto,
      combinedPnlCents: weather + crypto
    }));
  
  return result;
}

// Generate mock data for testing
export function generateMockPnLData(days: number = 14): DailyPnL[] {
  const result: DailyPnL[] = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    // Weather tends to be more consistent, crypto more volatile
    const weatherPnl = Math.floor((Math.random() - 0.4) * 200); // Slight positive bias
    const cryptoPnl = Math.floor((Math.random() - 0.5) * 400); // More volatile
    
    result.push({
      date: dateStr,
      weatherPnlCents: weatherPnl,
      cryptoPnlCents: cryptoPnl,
      combinedPnlCents: weatherPnl + cryptoPnl
    });
  }
  
  return result;
}

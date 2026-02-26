"use client"

import { useMemo } from 'react'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  fillColor?: string
  strokeWidth?: number
  showDots?: boolean
  showArea?: boolean
  className?: string
}

export function Sparkline({
  data,
  width = 100,
  height = 30,
  color = '#06b6d4',
  fillColor,
  strokeWidth = 1.5,
  showDots = false,
  showArea = true,
  className = ''
}: SparklineProps) {
  const { path, areaPath, points } = useMemo(() => {
    if (data.length === 0) return { path: '', areaPath: '', points: [] }

    const minVal = Math.min(...data)
    const maxVal = Math.max(...data)
    const range = maxVal - minVal || 1

    const padding = 2
    const effectiveWidth = width - padding * 2
    const effectiveHeight = height - padding * 2

    const pts = data.map((value, index) => ({
      x: padding + (index / (data.length - 1)) * effectiveWidth,
      y: padding + effectiveHeight - ((value - minVal) / range) * effectiveHeight
    }))

    // Create smooth curve using bezier
    let pathD = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1]
      const curr = pts[i]
      const cpx = (prev.x + curr.x) / 2
      pathD += ` Q ${prev.x + (cpx - prev.x) * 0.5} ${prev.y}, ${cpx} ${(prev.y + curr.y) / 2}`
      pathD += ` Q ${cpx + (curr.x - cpx) * 0.5} ${curr.y}, ${curr.x} ${curr.y}`
    }

    // Area path (for fill)
    const areaD = `${pathD} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z`

    return { path: pathD, areaPath: areaD, points: pts }
  }, [data, width, height])

  if (data.length === 0) {
    return (
      <svg width={width} height={height} className={className}>
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke={color} strokeOpacity="0.3" strokeWidth="1" strokeDasharray="4 2" />
      </svg>
    )
  }

  const gradientId = `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`

  return (
    <svg width={width} height={height} className={className}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      {showArea && (
        <path
          d={areaPath}
          fill={fillColor || `url(#${gradientId})`}
        />
      )}

      {/* Line */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dots */}
      {showDots && points.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={2}
          fill={color}
        />
      ))}

      {/* End dot (always visible) */}
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={3}
          fill={color}
          className="animate-pulse"
        />
      )}
    </svg>
  )
}

// Mini bar chart variant
interface MiniBarChartProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  gap?: number
  className?: string
}

export function MiniBarChart({
  data,
  width = 100,
  height = 30,
  color = '#06b6d4',
  gap = 2,
  className = ''
}: MiniBarChartProps) {
  const bars = useMemo(() => {
    if (data.length === 0) return []

    const maxVal = Math.max(...data) || 1
    const barWidth = (width - (data.length - 1) * gap) / data.length

    return data.map((value, index) => ({
      x: index * (barWidth + gap),
      height: (value / maxVal) * height,
      value
    }))
  }, [data, width, height, gap])

  return (
    <svg width={width} height={height} className={className}>
      {bars.map((bar, index) => {
        const barWidth = (width - (data.length - 1) * gap) / data.length
        return (
          <rect
            key={index}
            x={bar.x}
            y={height - bar.height}
            width={barWidth}
            height={bar.height}
            fill={color}
            fillOpacity={0.6 + (index / data.length) * 0.4}
            rx={1}
          />
        )
      })}
    </svg>
  )
}

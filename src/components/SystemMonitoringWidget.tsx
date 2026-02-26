"use client"

import { useEffect, useState } from 'react'
import { 
  Server, 
  AlertTriangle, 
  Activity,
  Thermometer,
  Zap,
  TrendingUp
} from 'lucide-react'

interface SystemMetrics {
  cpu_percent: number
  memory_percent: number
  gpu_temp?: number | null
  disk_percent?: number
}

interface SystemMonitoringWidgetProps {
  systemHealth?: SystemMetrics
  autotrader?: {
    running: boolean
    pid: string | null
    circuit_breaker: boolean
    consecutive_losses: number
    uptime_hours?: number | null
  }
  ollama?: {
    running: boolean
    location: string
    models: string[]
  }
  gpu?: {
    radeon_connected: boolean
    type: string | null
    vram_gb: number | null
  }
  alerts_pending?: number
  loading?: boolean
}

// Circular gauge component
function CircularGauge({ 
  value, 
  max = 100, 
  label, 
  color = 'blue',
  size = 80
}: { 
  value: number
  max?: number
  label: string
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  size?: number
}) {
  const percentage = Math.min(100, (value / max) * 100)
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  
  const colorClasses = {
    blue: { stroke: 'stroke-blue-500', text: 'text-blue-600 dark:text-blue-400' },
    green: { stroke: 'stroke-green-500', text: 'text-green-600 dark:text-green-400' },
    yellow: { stroke: 'stroke-yellow-500', text: 'text-yellow-600 dark:text-yellow-400' },
    red: { stroke: 'stroke-red-500', text: 'text-red-600 dark:text-red-400' },
    purple: { stroke: 'stroke-purple-500', text: 'text-purple-600 dark:text-purple-400' },
  }
  
  // Dynamic color based on value
  const getAutoColor = () => {
    if (value >= 90) return 'red'
    if (value >= 70) return 'yellow'
    return color
  }
  
  const activeColor = colorClasses[getAutoColor()]
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            className={`transition-all duration-500 ${activeColor.stroke}`}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
            }}
          />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${activeColor.text}`}>
            {Math.round(value)}%
          </span>
        </div>
      </div>
      <span className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {label}
      </span>
    </div>
  )
}

// Service status indicator
function ServiceIndicator({ 
  name, 
  status, 
  icon: Icon,
  detail
}: { 
  name: string
  status: 'healthy' | 'degraded' | 'down' | boolean
  icon: React.ComponentType<{ className?: string }>
  detail?: string
}) {
  const isHealthy = status === 'healthy' || status === true
  const isDegraded = status === 'degraded'
  
  return (
    <div className={`
      flex items-center gap-3 p-3 rounded-lg border transition-colors
      ${isHealthy 
        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' 
        : isDegraded
          ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
          : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
      }
    `}>
      <div className={`
        h-8 w-8 rounded-lg flex items-center justify-center
        ${isHealthy 
          ? 'bg-green-100 dark:bg-green-800/50' 
          : isDegraded 
            ? 'bg-yellow-100 dark:bg-yellow-800/50'
            : 'bg-red-100 dark:bg-red-800/50'
        }
      `}>
        <Icon className={`h-4 w-4 ${
          isHealthy 
            ? 'text-green-600 dark:text-green-400' 
            : isDegraded
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-red-600 dark:text-red-400'
        }`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          {name}
        </div>
        {detail && (
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {detail}
          </div>
        )}
      </div>
      <div className={`
        h-2 w-2 rounded-full
        ${isHealthy ? 'bg-green-500' : isDegraded ? 'bg-yellow-500' : 'bg-red-500'}
      `} />
    </div>
  )
}

export function SystemMonitoringWidget({
  systemHealth,
  autotrader,
  ollama,
  gpu,
  alerts_pending = 0,
  loading
}: SystemMonitoringWidgetProps) {
  const [uptime, setUptime] = useState<string>('')
  
  // Calculate uptime string from autotrader.uptime_hours
  useEffect(() => {
    if (autotrader?.uptime_hours) {
      const hours = autotrader.uptime_hours
      if (hours < 1) {
        setUptime(`${Math.round(hours * 60)}m`)
      } else if (hours < 24) {
        setUptime(`${Math.round(hours)}h`)
      } else {
        const days = Math.floor(hours / 24)
        const remainingHours = Math.round(hours % 24)
        setUptime(`${days}d ${remainingHours}h`)
      }
    } else {
      setUptime('N/A')
    }
  }, [autotrader?.uptime_hours])
  
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    )
  }
  
  const cpuPercent = systemHealth?.cpu_percent ?? 0
  const memoryPercent = systemHealth?.memory_percent ?? 0
  
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Server className="h-5 w-5 text-indigo-500" />
          System Monitoring
        </h3>
        {alerts_pending > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400" />
            <span className="text-xs font-medium text-red-700 dark:text-red-300">
              {alerts_pending} alert{alerts_pending > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
      
      {/* Metrics Gauges */}
      <div className="flex justify-around mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <CircularGauge value={cpuPercent} label="CPU" color="blue" />
        <CircularGauge value={memoryPercent} label="Memory" color="green" />
        {gpu?.radeon_connected && systemHealth?.gpu_temp && (
          <div className="flex flex-col items-center">
            <div className="relative h-20 w-20 flex items-center justify-center">
              <Thermometer className={`h-8 w-8 ${
                systemHealth.gpu_temp >= 85 ? 'text-red-500' :
                systemHealth.gpu_temp >= 70 ? 'text-yellow-500' : 'text-green-500'
              }`} />
            </div>
            <span className="font-bold text-lg">{systemHealth.gpu_temp}°C</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">GPU Temp</span>
          </div>
        )}
      </div>
      
      {/* Services Status */}
      <div className="space-y-2 mb-4">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Services
        </div>
        
        <ServiceIndicator 
          name="Autotrader" 
          status={autotrader?.running ? (autotrader.circuit_breaker ? 'degraded' : 'healthy') : 'down'}
          icon={TrendingUp}
          detail={autotrader?.running 
            ? `PID ${autotrader.pid}${autotrader.circuit_breaker ? ' • Circuit Breaker ON' : ''}`
            : 'Not running'
          }
        />
        
        <ServiceIndicator 
          name="Ollama LLM" 
          status={ollama?.running ?? false}
          icon={Activity}
          detail={ollama?.running 
            ? `${ollama.location} • ${ollama.models.length} models`
            : 'Offline'
          }
        />
        
        <ServiceIndicator 
          name="Radeon eGPU" 
          status={gpu?.radeon_connected ?? false}
          icon={Zap}
          detail={gpu?.radeon_connected 
            ? `${gpu.type} • ${gpu.vram_gb}GB VRAM`
            : 'Disconnected'
          }
        />
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">Uptime</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {uptime}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">Losses</div>
          <div className={`text-sm font-semibold ${
            (autotrader?.consecutive_losses ?? 0) > 10 
              ? 'text-red-600 dark:text-red-400' 
              : 'text-gray-900 dark:text-white'
          }`}>
            {autotrader?.consecutive_losses ?? 0}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">LLM Models</div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {ollama?.models?.length ?? 0}
          </div>
        </div>
      </div>
    </div>
  )
}

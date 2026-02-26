"use client"

import { Cpu, HardDrive, Thermometer, Server, Zap, Circle, Activity } from 'lucide-react'

interface GpuData {
  radeon_connected: boolean
  type: string | null
  vram_gb: number | null
}

interface OllamaData {
  running: boolean
  location: string
  models: string[]
}

interface AgentInfo {
  host: string
  model: string
  status: string
}

interface SystemHealth {
  cpu_percent?: number
  memory_percent?: number
  gpu_temp?: number | null
  health_status?: string
}

interface GpuStatusWidgetProps {
  gpu?: GpuData
  ollama?: OllamaData
  agents?: {
    clawdinho?: AgentInfo
    ondinho?: AgentInfo
  }
  systemHealth?: SystemHealth
  loading?: boolean
}

// Progress bar component
function ProgressBar({ 
  value, 
  label, 
  icon: Icon, 
  color = 'blue' 
}: { 
  value: number
  label: string
  icon: React.ComponentType<{ className?: string }>
  color?: 'blue' | 'green' | 'yellow' | 'red'
}) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  }
  
  const getBarColor = (val: number) => {
    if (val >= 90) return 'bg-red-500'
    if (val >= 70) return 'bg-yellow-500'
    return colorClasses[color]
  }
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
          <Icon className="h-4 w-4" />
          {label}
        </span>
        <span className="font-mono text-gray-900 dark:text-white">
          {value.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${getBarColor(value)}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  )
}

// Temperature gauge component
function TempGauge({ temp }: { temp: number }) {
  const getColor = (t: number) => {
    if (t >= 85) return 'text-red-500'
    if (t >= 70) return 'text-yellow-500'
    return 'text-green-500'
  }
  
  const getStatus = (t: number) => {
    if (t >= 85) return 'HOT'
    if (t >= 70) return 'WARM'
    return 'COOL'
  }
  
  return (
    <div className="flex items-center gap-2">
      <Thermometer className={`h-5 w-5 ${getColor(temp)}`} />
      <div>
        <span className={`font-mono font-bold ${getColor(temp)}`}>{temp}°C</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
          {getStatus(temp)}
        </span>
      </div>
    </div>
  )
}

// Status indicator dot
function StatusDot({ active, pulse = false }: { active: boolean; pulse?: boolean }) {
  if (active) {
    return (
      <span className="relative flex h-3 w-3">
        {pulse && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        )}
        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
      </span>
    )
  }
  return <span className="inline-flex rounded-full h-3 w-3 bg-gray-400"></span>
}

// Model chip component
function ModelChip({ name }: { name: string }) {
  // Extract short name from model (e.g., "deepseek-coder:6.7b" -> "deepseek 6.7b")
  const shortName = name
    .replace('-coder', '')
    .replace(':latest', '')
    .replace(/([a-z])(\d)/i, '$1 $2')
  
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
      {shortName}
    </span>
  )
}

export function GpuStatusWidget({ 
  gpu, 
  ollama, 
  agents,
  systemHealth,
  loading 
}: GpuStatusWidgetProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    )
  }
  
  const radeonConnected = gpu?.radeon_connected ?? false
  const ollamaRunning = ollama?.running ?? false
  const cpuPercent = systemHealth?.cpu_percent ?? 0
  const memoryPercent = systemHealth?.memory_percent ?? 0
  const gpuTemp = systemHealth?.gpu_temp
  
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Cpu className="h-5 w-5 text-purple-500" />
          System Status
        </h3>
        <div className="flex items-center gap-2">
          {radeonConnected ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <Zap className="h-3 w-3" />
              Radeon 7900 XTX
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
              <Circle className="h-3 w-3" />
              eGPU Offline
            </span>
          )}
        </div>
      </div>
      
      {/* GPU Info Card (when connected) */}
      {radeonConnected && gpu?.vram_gb && (
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">AMD</span>
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {gpu.type || 'Radeon 7900 XTX'}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {gpu.vram_gb}GB VRAM • TinyGrad Ready
                </div>
              </div>
            </div>
            {gpuTemp && <TempGauge temp={gpuTemp} />}
          </div>
        </div>
      )}
      
      {/* System Metrics */}
      <div className="space-y-3 mb-4">
        <ProgressBar 
          value={cpuPercent} 
          label="CPU" 
          icon={Activity} 
          color="blue" 
        />
        <ProgressBar 
          value={memoryPercent} 
          label="Memory" 
          icon={HardDrive} 
          color="green" 
        />
      </div>
      
      {/* Ollama Status */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Ollama {ollama?.location === 'remote' ? '(Remote)' : '(Local)'}
            </span>
          </div>
          <StatusDot active={ollamaRunning} pulse={ollamaRunning} />
        </div>
        
        {ollamaRunning && ollama?.models && ollama.models.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {ollama.models.map((model) => (
              <ModelChip key={model} name={model} />
            ))}
          </div>
        )}
      </div>
      
      {/* Agents Status */}
      {agents && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Active Agents
          </div>
          <div className="grid grid-cols-2 gap-2">
            {agents.clawdinho && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <StatusDot active={agents.clawdinho.status === 'active'} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    Clawdinho
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {agents.clawdinho.host}
                  </div>
                </div>
              </div>
            )}
            {agents.ondinho && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <StatusDot active={agents.ondinho.status === 'active'} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    Ondinho
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {agents.ondinho.host}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

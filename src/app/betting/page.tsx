'use client'

export const runtime = 'edge';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  BarChart3, 
  Send, 
  RefreshCw,
  ExternalLink,
  Trash2,
  MessageSquare,
  Link as LinkIcon,
  Terminal,
  Activity,
  Zap,
  Target,
  Cpu,
  HelpCircle,
  Keyboard,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  Sun,
  Moon,
  Monitor,
  Clock,
  Download
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { WinRateTrendChart, generateMockWinRateTrend } from '@/components/WinRateTrendChart';
import { WinRateSparkline, parseWinRateTrendFromStats, generateMockSparklineData } from '@/components/WinRateSparkline';
import { ReturnDistributionChart, generateMockTrades } from '@/components/ReturnDistributionChart';
import { EdgeDistributionChart, EdgeDistributionData } from '@/components/EdgeDistributionChart';
import { StreakIndicator } from '@/components/StreakIndicator';
import { ApiLatencyChart, ApiLatencyData } from '@/components/ApiLatencyChart';
import { LatencyTrendChart, generateMockLatencyTrend } from '@/components/LatencyTrendChart';
import { LatencySparkline, generateMockLatencyHistory } from '@/components/LatencySparkline';
import { LatencyAdjustmentIndicator } from '@/components/LatencyAdjustmentIndicator';
import { VolatilityCard } from '@/components/VolatilityCard';
import { TradeTicker } from '@/components/TradeTicker';
import { ModelComparisonChart } from '@/components/ModelComparisonChart';
import { WeatherPerformanceWidget, parseWeatherPerformance } from '@/components/WeatherPerformanceWidget';
import { WeatherCryptoPnLChart, parsePnLByMarketType, generateMockPnLData } from '@/components/WeatherCryptoPnLChart';
import { ConcentrationHistoryChart } from '@/components/ConcentrationHistoryChart';
import { HealthHistoryWidget } from '@/components/HealthHistoryWidget';
import { CorrelationHeatmapWidget } from '@/components/CorrelationHeatmapWidget';
import { GpuStatusWidget } from '@/components/GpuStatusWidget';
import { MomentumRegimeWidget } from '@/components/MomentumRegimeWidget';
import { StopLossEffectivenessWidget } from '@/components/StopLossEffectivenessWidget';
import { TimeOfDayHeatmap } from '@/components/TimeOfDayHeatmap';
import { PositionExpiryHeatmap } from '@/components/PositionExpiryHeatmap';
import { StreakPositionWidget } from '@/components/StreakPositionWidget';
import { useTouchGestures, PullToRefreshIndicator } from '@/hooks/useTouchGestures';
import { LastUpdatedIndicator } from '@/components/LastUpdatedIndicator';
import { DailyGoalTracker } from '@/components/DailyGoalTracker';
import { ComparisonIndicator } from '@/components/ComparisonIndicator';
import { DailyVolumeWidget } from '@/components/DailyVolumeWidget';
import { StatsComparisonTooltip, useComparisonTooltip, ComparisonTooltipToggle } from '@/components/StatsComparisonTooltip';

// ============== CONSTANTS ==============
// External gist URL for trading stats (works on static Cloudflare Pages deploy)
const TRADING_STATS_GIST_URL = 'https://gist.githubusercontent.com/FreeRiverHouse/43b0815cc640bba8ac799ecb27434579/raw/onde-trading-stats.json';
// Agent status API endpoint
const AGENT_STATUS_API = '/api/agents/status';

// ============== AGENT STATUS TYPES (T966) ==============
interface AgentStatus {
  timestamp: string;
  gpu: {
    radeon_connected: boolean;
    type: string | null;
    vram_gb: number | null;
  };
  ollama: {
    running: boolean;
    location: string;
    models: string[];
  };
  agents: {
    clawdinho?: { host: string; model: string; status: string };
    ondinho?: { host: string; model: string; status: string };
  };
  systemHealth?: {
    cpu_percent: number;
    memory_percent: number;
    gpu_temp: number | null;
    health_status: string;
  };
}

// ============== TYPES ==============
interface KalshiPosition {
  ticker: string;
  position: number;
  exposure: number;
  pnl?: number;
  openedAt?: string; // ISO timestamp when position was opened
}

// ============== POSITION AGE HELPERS (T743) ==============
/**
 * Format duration in human-readable format
 * @param hours - Duration in hours
 * @returns Formatted string like "2h 15m" or "3d 12h"
 */
function formatDuration(hours: number): string {
  if (hours < 0) return 'expired';
  if (hours < 1) {
    const minutes = Math.floor(hours * 60);
    return `${minutes}m`;
  }
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = Math.floor(hours % 24);
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

/**
 * Parse expiration time from Kalshi ticker
 * Format: KXBTCD-26JAN2917-T89249.99
 *         PREFIX-DDMMMYYHH-TARGET
 * @param ticker - Kalshi ticker string
 * @returns Date object or null if parsing fails
 */
function parseTickerExpiration(ticker: string): Date | null {
  try {
    // Extract date part: KXBTCD-26JAN2917-T89249.99 -> 26JAN2917
    const match = ticker.match(/(?:KXBTCD|KXETHD)-(\d{2})([A-Z]{3})(\d{2})(\d{2})-/);
    if (!match) return null;
    
    const [, day, monthStr, year, hour] = match;
    const months: Record<string, number> = {
      JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
      JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
    };
    
    const monthNum = months[monthStr];
    if (monthNum === undefined) return null;
    
    // Parse year - assume 2020s for now
    const fullYear = 2000 + parseInt(year, 10);
    const dayNum = parseInt(day, 10);
    const hourNum = parseInt(hour, 10);
    
    return new Date(Date.UTC(fullYear, monthNum, dayNum, hourNum, 0, 0));
  } catch {
    return null;
  }
}

/**
 * Get time until expiration and color coding
 * @param ticker - Kalshi ticker string
 * @returns Object with formatted time, hours remaining, and color
 */
function getPositionExpiryInfo(ticker: string): { 
  timeStr: string; 
  hoursLeft: number; 
  color: 'emerald' | 'yellow' | 'red' | 'gray';
  label: string;
} {
  const expiry = parseTickerExpiration(ticker);
  if (!expiry) {
    return { timeStr: '—', hoursLeft: -1, color: 'gray', label: 'Unknown' };
  }
  
  const now = new Date();
  const hoursLeft = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursLeft < 0) {
    return { timeStr: 'Expired', hoursLeft: 0, color: 'red', label: 'Expired' };
  }
  
  // Color coding: green >24h, yellow 4-24h, red <4h
  let color: 'emerald' | 'yellow' | 'red' = 'emerald';
  let label = 'Safe';
  if (hoursLeft <= 4) {
    color = 'red';
    label = 'Soon';
  } else if (hoursLeft <= 24) {
    color = 'yellow';
    label = 'Today';
  }
  
  return { 
    timeStr: formatDuration(hoursLeft), 
    hoursLeft, 
    color,
    label 
  };
}

interface KalshiStatus {
  cash: number;
  portfolioValue: number;
  positions: KalshiPosition[];
  btcPrice: number;
  ethPrice: number;
  lastUpdated: string;
  error?: string;
}

interface CryptoPrices {
  btc: number;
  eth: number;
  btc24hChange?: number;
  eth24hChange?: number;
  lastUpdated: string;
}

interface InboxMessage {
  id: string;
  content: string;
  type: 'message' | 'link' | 'command';
  timestamp: string;
  processed: boolean;
}

interface InboxData {
  messages: InboxMessage[];
  lastUpdated: string;
}

interface TradingStats {
  totalTrades: number;
  wonTrades: number;
  lostTrades: number;
  pendingTrades: number;
  winRate: number;
  totalPnlCents: number;
  grossProfitCents?: number;
  grossLossCents?: number;
  profitFactor?: number;  // gross profit / gross loss (>1 = profitable)
  sharpeRatio?: number;   // risk-adjusted return metric
  maxDrawdownCents?: number;  // largest peak-to-trough decline
  maxDrawdownPercent?: number;  // max drawdown as % of peak
  calmarRatio?: number;  // annualized return / max drawdown %
  sortinoRatio?: number;  // return / downside deviation
  avgTradeDurationHours?: number;  // average time to settlement
  avgReturnCents?: number;  // average profit/loss per trade
  longestWinStreak?: number;  // longest consecutive wins
  longestLossStreak?: number;  // longest consecutive losses
  currentStreak?: number;  // current streak (positive for wins, negative for losses)
  currentStreakType?: 'win' | 'loss' | 'none';  // type of current streak
  // Latency stats (order placement to fill)
  avgLatencyMs?: number | null;   // average order latency
  p95LatencyMs?: number | null;   // 95th percentile latency
  minLatencyMs?: number | null;   // fastest order
  maxLatencyMs?: number | null;   // slowest order
  latencyTradeCount?: number;     // trades with latency data
  todayTrades: number;
  todayWinRate: number;
  todayPnlCents: number;
  // Yesterday comparison (T364)
  yesterdayTrades?: number;
  yesterdayWinRate?: number;
  yesterdayPnlCents?: number;
  // Week comparison (T364)
  thisWeek?: { trades: number; winRate: number; pnlCents: number };
  prevWeek?: { trades: number; winRate: number; pnlCents: number };
  recentTrades: Array<{
    timestamp: string;
    ticker: string;
    side: string;
    contracts: number;
    price_cents: number;
    result_status?: string;
  }>;
  lastUpdated: string;
  // Model comparison (v1 vs v2) - T350
  bySource?: {
    v1?: { trades: number; winRate: number; pnlCents: number; pnlDollars: number };
    v2?: { trades: number; winRate: number; pnlCents: number; pnlDollars: number };
  };
  // Volatility analysis
  volatility?: {
    generated_at: string;
    assets: {
      [key: string]: {
        modelAssumption: number;
        periods: {
          [key: string]: {
            realized: number;
            deviation: number;
            priceRangePct: number;
          };
        };
      };
    };
  };
  // Edge distribution (T368)
  edgeDistribution?: EdgeDistributionData | null;
  // API latency breakdown (T445)
  apiLatency?: ApiLatencyData | null;
  // Latency history for sparkline (T800)
  latencyHistory?: {
    generated_at: string;
    dataPoints: Array<{
      timestamp: string;
      avgMs: number;
      p95Ms: number;
      count: number;
    }>;
    summary: {
      avgLatencyMs: number;
      minLatencyMs: number;
      maxLatencyMs: number;
      avgP95Ms: number;
      maxP95Ms: number;
      dataPointCount: number;
    };
  } | null;
  // Autotrader health status (T623)
  healthStatus?: AutotraderHealth | null;
  // Concentration history (T482)
  concentrationHistory?: {
    snapshots: Array<{
      timestamp: string;
      portfolio_value_cents: number;
      by_asset_class: Record<string, number>;
      by_correlation_group: Record<string, number>;
      total_exposure_cents: number;
      position_count: Record<string, number>;
      largest_asset_class: string | null;
      largest_asset_class_pct: number;
      largest_correlated_group: string | null;
      largest_correlated_group_pct: number;
      exposure_pct: number;
    }>;
    dataPoints: number;
    assetClasses: string[];
    maxConcentration: number;
    warningPct: number;
    latestConcentrations: Record<string, number>;
    lastUpdated: string | null;
  } | null;
  // Health history (T829)
  healthHistory?: {
    snapshots: Array<{
      timestamp: string;
      is_running: boolean;
      cycle_count: number;
      dry_run: boolean;
      trades_today: number;
      win_rate_today: number;
      pnl_today_cents: number;
      positions_count: number;
      cash_cents: number;
      circuit_breaker_active: boolean;
      consecutive_losses: number;
      status: string;
    }>;
    dataPoints: number;
    uptimePct: number;
    runningCount: number;
    circuitBreakerCount: number;
    downtimePeriods: Array<{
      start: string;
      end: string | null;
      ongoing?: boolean;
    }>;
    latestStatus: string | null;
    lastUpdated: string | null;
  } | null;
  // Asset correlation (T721)
  assetCorrelation?: {
    generated_at: string;
    status: string;
    correlation: {
      value: number;
      period_days: number;
      interpretation: string;
      data_points: number;
    };
    adjustment: {
      crypto_group_limit: number;
      adjustment_reason: string;
      risk_level: string;
    };
    current_prices: {
      btc: number;
      eth: number;
      btc_7d_change_pct: number;
      eth_7d_change_pct: number;
    };
    data_source: string;
  } | null;
  // Momentum regime (T853)
  momentumRegime?: {
    timestamp: string;
    regime: 'TRENDING' | 'RANGING' | 'VOLATILE';
    aggregate_score: number;
    direction: 'bullish' | 'bearish' | 'mixed';
    btc: {
      price: number;
      momentum_score: number;
      direction: string;
      adx: number;
      roc_24h: number;
      roc_7d: number;
    };
    eth: {
      price: number;
      momentum_score: number;
      direction: string;
      adx: number;
      roc_24h: number;
      roc_7d: number;
    };
    recommendation: {
      strategy: string;
      description: string;
      sizing: string;
      hold_time: string;
    };
    thresholds: {
      trending: number;
      ranging: number;
    };
    source: string;
  } | null;
  // Hour/day trading heatmap (T411)
  hourDayHeatmap?: {
    generated_at: string;
    total_trades: number;
    heatmap: Array<{
      day: number;
      day_name: string;
      hour: number;
      trades: number;
      won: number;
      lost: number;
      win_rate: number | null;
      pnl: number;
    }>;
    summary: {
      max_trades_in_cell: number;
      best_win_rate: number | null;
      worst_win_rate: number | null;
      best_cells: Array<{ day: string; hour: number; win_rate: number }>;
      worst_cells: Array<{ day: string; hour: number; win_rate: number }>;
    };
    days: string[];
    hours: number[];
  } | null;
  // Streak position analysis (T387)
  streakPosition?: {
    generated_at: string;
    trades_analyzed: number;
    min_trades_threshold: number;
    position_analysis: Array<{
      context: string;
      total: number;
      wins: number;
      losses: number;
      win_rate: number;
    }>;
    continuation_analysis: Array<{
      streak_type: 'win' | 'loss';
      streak_length: number;
      total: number;
      continues: number;
      breaks: number;
      continuation_rate: number;
    }>;
    insights: Array<{
      type: 'positive' | 'warning' | 'neutral';
      context?: string;
      message: string;
    }>;
  } | null;
  // Stop-loss effectiveness stats (T366)
  stopLossStats?: {
    totalTriggered: number;
    wouldHaveLost: number;
    wouldHaveWon: number;
    unknownOutcome: number;
    effectivenessPct: number;
    actualLossCents: number;
    potentialLossCents: number;
    savedCents: number;
    savedDollars: number;
    events: Array<{
      timestamp: string;
      ticker: string;
      entryPrice: number;
      exitPrice: number;
      contracts: number;
      lossPct: number;
      actualLossCents: number;
      outcome: 'saved' | 'premature' | 'unknown';
      potentialLossCents?: number;
      savedCents?: number;
      potentialProfitCents?: number;
    }>;
    generatedAt: string;
  } | null;
}

interface AutotraderHealth {
  is_running: boolean;
  last_cycle_time?: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  issues?: string[];
  trades_24h?: number;
  cycle_count?: number;
  trades_today?: number;
  win_rate_today?: number;
  pnl_today_cents?: number;
  circuit_breaker_active?: boolean;
  consecutive_losses?: number;
  dry_run?: boolean;
}

interface MomentumAsset {
  asset: string;
  symbol: string;
  currentPrice: number;
  momentum: {
    h1: number;
    h4: number;
    h24: number;
    composite: number;
  };
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: 'strong' | 'moderate' | 'weak';
  priceHistory?: number[];  // Last 24 hourly close prices
}

interface MomentumData {
  data: MomentumAsset[];
  lastUpdated: string;
}

interface WinRateTrendPoint {
  date: string;
  winRate: number;
  trades: number;
  won?: number;
  lost?: number;
  pnlCents?: number;
}

interface WinRateTrendData {
  data: WinRateTrendPoint[];
  summary: {
    days: number;
    source: string;
    totalTrades: number;
    overallWinRate: number;
    trend: 'improving' | 'declining' | 'stable';
    recentAvgWinRate: number;
    previousAvgWinRate: number;
  };
  lastUpdated: string;
}

// ============== ANIMATED NUMBER COMPONENT ==============
function AnimatedNumber({ 
  value, 
  prefix = '', 
  suffix = '',
  decimals = 2,
  className = '',
  glowColor = 'cyan'
}: { 
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  glowColor?: 'cyan' | 'green' | 'red' | 'purple' | 'orange';
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setIsAnimating(true);
      const startValue = prevValue.current;
      const endValue = value;
      const duration = 1000;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = startValue + (endValue - startValue) * easeOut;
        setDisplayValue(current);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          prevValue.current = value;
        }
      };

      requestAnimationFrame(animate);
    }
  }, [value]);

  const glowClasses = {
    cyan: 'text-cyan-400 drop-shadow-[0_0_20px_rgba(0,212,255,0.8)]',
    green: 'text-emerald-400 drop-shadow-[0_0_20px_rgba(0,255,136,0.8)]',
    red: 'text-red-400 drop-shadow-[0_0_20px_rgba(255,68,68,0.8)]',
    purple: 'text-purple-400 drop-shadow-[0_0_20px_rgba(168,85,247,0.8)]',
    orange: 'text-orange-400 drop-shadow-[0_0_20px_rgba(251,146,60,0.8)]'
  };

  return (
    <span className={`font-mono font-bold transition-all duration-300 ${glowClasses[glowColor]} ${isAnimating ? 'scale-105' : ''} ${className}`}>
      {prefix}{(displayValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  );
}

// ============== GLASS CARD COMPONENT ==============
function GlassCard({ 
  children, 
  className = '',
  glowColor = 'cyan',
  pulse = false
}: { 
  children: React.ReactNode; 
  className?: string;
  glowColor?: 'cyan' | 'green' | 'purple' | 'orange' | 'red';
  pulse?: boolean;
}) {
  const glowStyles = {
    cyan: 'before:bg-gradient-to-r before:from-cyan-500/20 before:to-blue-500/20 hover:shadow-[0_0_40px_rgba(0,212,255,0.15)]',
    green: 'before:bg-gradient-to-r before:from-emerald-500/20 before:to-green-500/20 hover:shadow-[0_0_40px_rgba(0,255,136,0.15)]',
    purple: 'before:bg-gradient-to-r before:from-purple-500/20 before:to-pink-500/20 hover:shadow-[0_0_40px_rgba(168,85,247,0.15)]',
    orange: 'before:bg-gradient-to-r before:from-orange-500/20 before:to-amber-500/20 hover:shadow-[0_0_40px_rgba(251,146,60,0.15)]',
    red: 'before:bg-gradient-to-r before:from-red-500/20 before:to-rose-500/20 hover:shadow-[0_0_40px_rgba(255,68,68,0.15)]'
  };

  return (
    <div className={`
      relative overflow-hidden rounded-2xl
      bg-gradient-to-br from-white/[0.08] to-white/[0.02]
      backdrop-blur-xl
      border border-white/[0.08]
      transition-all duration-500 ease-out
      hover:border-white/[0.15]
      hover:from-white/[0.12] hover:to-white/[0.04]
      before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-500
      hover:before:opacity-100
      ${glowStyles[glowColor]}
      ${pulse ? 'animate-pulse-glow' : ''}
      ${className}
    `}>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ============== STAT CARD COMPONENT ==============
function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  trendValue,
  glowColor = 'cyan',
  prefix = '',
  suffix = '',
  decimals = 2
}: { 
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  glowColor?: 'cyan' | 'green' | 'purple' | 'orange' | 'red';
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const iconColors = {
    cyan: 'text-cyan-400',
    green: 'text-emerald-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
    red: 'text-red-400'
  };

  return (
    <GlassCard glowColor={glowColor} className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{title}</p>
          <div className="mt-2">
            <AnimatedNumber 
              value={value} 
              prefix={prefix}
              suffix={suffix}
              decimals={decimals}
              glowColor={glowColor}
              className="text-2xl md:text-3xl"
            />
          </div>
          {subtitle && (
            <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
          )}
          {trendValue && (
            <div className={`flex items-center mt-2 text-sm font-medium ${
              trend === 'up' ? 'text-emerald-400' : 
              trend === 'down' ? 'text-red-400' : 'text-gray-400'
            }`}>
              {trend === 'up' ? <TrendingUp className="w-4 h-4 mr-1" /> : 
               trend === 'down' ? <TrendingDown className="w-4 h-4 mr-1" /> : null}
              {trendValue}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br from-white/10 to-white/5 ${iconColors[glowColor]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </GlassCard>
  );
}

// ============== MINI CHART COMPONENT ==============
function MiniChart({ data, color = 'cyan' }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const colors = {
    cyan: 'stroke-cyan-400',
    green: 'stroke-emerald-400',
    orange: 'stroke-orange-400',
    purple: 'stroke-purple-400'
  };

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 100" className="w-full h-12 opacity-60">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        className={colors[color as keyof typeof colors]}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ============== KEYBOARD SHORTCUTS MODAL ==============
function KeyboardShortcutsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'R', description: 'Refresh all data' },
    { key: '/', description: 'Focus message input' },
    { key: '?', description: 'Show keyboard shortcuts' },
    { key: 'Esc', description: 'Close this modal' },
    { key: 'K', description: 'Open Kalshi portfolio (new tab)' },
    { key: 'E', description: 'Expand/collapse stat cards' },
    { key: 'H', description: 'Toggle help overlay' },
    { key: 'T', description: 'Toggle light/dark mode' },
    { key: 'C', description: 'Toggle comparison tooltips' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-950/95 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-purple-500/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/30 to-cyan-500/30 flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map((shortcut) => (
            <div 
              key={shortcut.key}
              className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]"
            >
              <span className="text-gray-300 text-sm">{shortcut.description}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 text-cyan-400 font-mono text-sm shadow-lg">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <p className="text-gray-500 text-xs text-center mt-6">
          Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-400">?</kbd> anytime to show this
        </p>
      </div>
    </div>
  );
}

// ============== PULSING DOT COMPONENT ==============
function PulsingDot({ color = 'green', label }: { color?: 'green' | 'red' | 'yellow'; label?: string }) {
  const colors = {
    green: 'bg-emerald-400 shadow-emerald-400/50',
    red: 'bg-red-400 shadow-red-400/50',
    yellow: 'bg-yellow-400 shadow-yellow-400/50'
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className={`w-2 h-2 rounded-full ${colors[color]} shadow-[0_0_10px_currentColor] animate-pulse`} />
        <div className={`absolute inset-0 w-2 h-2 rounded-full ${colors[color]} animate-ping opacity-75`} />
      </div>
      {label && <span className="text-xs text-gray-400">{label}</span>}
    </div>
  );
}

// ============== DATE PERIOD TYPE ==============
type DatePeriod = 'all' | 'today' | 'week' | 'month' | 'custom';

// ============== CSV EXPORT UTILITY (T822) ==============
interface TradeForExport {
  timestamp: string;
  ticker: string;
  side: string;
  contracts: number;
  price_cents: number;
  result_status?: string;
}

function exportTradesToCSV(trades: TradeForExport[], filename?: string) {
  if (!trades || trades.length === 0) {
    alert('No trades to export');
    return;
  }

  // CSV header
  const headers = ['Timestamp', 'Ticker', 'Side', 'Contracts', 'Price (cents)', 'PnL (cents)', 'Result'];
  
  // Calculate PnL for each trade
  const rows = trades.map(trade => {
    let pnlCents = 0;
    if (trade.result_status === 'won') {
      pnlCents = trade.side === 'no' 
        ? (100 - trade.price_cents) * trade.contracts 
        : (100 - trade.price_cents) * trade.contracts;
    } else if (trade.result_status === 'lost') {
      pnlCents = -trade.price_cents * trade.contracts;
    }
    
    return [
      trade.timestamp,
      trade.ticker,
      trade.side.toUpperCase(),
      trade.contracts.toString(),
      trade.price_cents.toString(),
      pnlCents.toString(),
      trade.result_status || 'pending'
    ];
  });

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const date = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', filename || `kalshi-trades-${date}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ============== MAIN COMPONENT ==============
export default function BettingDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Initialize from URL params
  const urlSource = searchParams.get('source') as 'v1' | 'v2' | null;
  const urlPeriod = searchParams.get('period') as DatePeriod | null;
  
  const [kalshiStatus, setKalshiStatus] = useState<KalshiStatus | null>(null);
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrices | null>(null);
  const [inbox, setInbox] = useState<InboxData | null>(null);
  const [tradingStats, setTradingStats] = useState<TradingStats | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [statsSource, setStatsSource] = useState<'v1' | 'v2'>(urlSource || 'v2');
  const [statsPeriod, setStatsPeriod] = useState<DatePeriod>(urlPeriod || 'all');
  const [customDateFrom, setCustomDateFrom] = useState<string>(searchParams.get('from') || '');
  const [customDateTo, setCustomDateTo] = useState<string>(searchParams.get('to') || '');
  const [momentum, setMomentum] = useState<MomentumData | null>(null);
  const [winRateTrend, setWinRateTrend] = useState<WinRateTrendData | null>(null);
  const [autotraderHealth, setAutotraderHealth] = useState<AutotraderHealth | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [dataFromCache, setDataFromCache] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  // Collapsible chart sections for mobile (T756)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    charts: true, // Start collapsed on initial load
    analytics: true,
  });
  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  // Countdown timer state (T740)
  const REFRESH_INTERVAL = 30; // seconds
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [isPaused, setIsPaused] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Load auto-refresh preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('betting-auto-refresh');
      if (saved !== null) {
        setAutoRefresh(saved === 'true');
      }
    }
  }, []);
  
  // Toggle auto-refresh and save to localStorage
  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh(prev => {
      const newValue = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('betting-auto-refresh', String(newValue));
      }
      return newValue;
    });
  }, []);
  const [showAllStats, setShowAllStats] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fetchDataRef = useRef<(() => Promise<void>) | null>(null);
  const { toggleTheme, theme, resolvedTheme } = useTheme();
  
  // Comparison tooltip state (T744)
  const { enabled: compareEnabled, toggle: toggleCompare, isLoaded: compareLoaded } = useComparisonTooltip();
  
  // Touch gestures for mobile (pull-to-refresh, swipe gestures)
  const { handlers: touchHandlers, state: touchState } = useTouchGestures({
    onRefresh: async () => {
      if (fetchDataRef.current) {
        await fetchDataRef.current();
      }
    },
    pullThreshold: 80,
    enabled: true,
  });
  
  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (statsSource !== 'v2') params.set('source', statsSource);
    if (statsPeriod !== 'all') params.set('period', statsPeriod);
    if (statsPeriod === 'custom') {
      if (customDateFrom) params.set('from', customDateFrom);
      if (customDateTo) params.set('to', customDateTo);
    }
    const queryString = params.toString();
    const newUrl = queryString ? `/betting?${queryString}` : '/betting';
    // Only update if URL actually changed
    if (window.location.pathname + window.location.search !== newUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [statsSource, statsPeriod, customDateFrom, customDateTo, router]);

  // Format date range for display
  const getDateRangeText = useCallback(() => {
    if (statsPeriod === 'all') return 'All time';
    if (statsPeriod === 'today') return 'Today';
    if (statsPeriod === 'week') return 'Last 7 days';
    if (statsPeriod === 'month') return 'Last 30 days';
    if (statsPeriod === 'custom') {
      if (customDateFrom && customDateTo) {
        const from = new Date(customDateFrom);
        const to = new Date(customDateTo);
        const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${formatDate(from)} → ${formatDate(to)}`;
      }
      if (customDateFrom) return `From ${new Date(customDateFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      if (customDateTo) return `Until ${new Date(customDateTo).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    return 'All time';
  }, [statsPeriod, customDateFrom, customDateTo]);

  // Build stats URL with period/date filters
  const buildStatsUrl = useCallback(() => {
    const params = new URLSearchParams({ source: statsSource });
    if (statsPeriod === 'custom') {
      if (customDateFrom) params.set('from', customDateFrom);
      if (customDateTo) params.set('to', customDateTo);
    } else if (statsPeriod !== 'all') {
      params.set('period', statsPeriod);
    }
    return `/api/trading/stats?${params.toString()}`;
  }, [statsSource, statsPeriod, customDateFrom, customDateTo]);

  // Helper: Fetch trading stats with gist fallback for static deployments
  const fetchTradingStatsWithFallback = useCallback(async (): Promise<TradingStats | null> => {
    // Try local API first (works in development)
    try {
      const statsRes = await fetch(buildStatsUrl());
      if (statsRes.ok) {
        const data = await statsRes.json();
        // If we got real data, return it
        if (data && typeof data.totalTrades === 'number') {
          return data;
        }
      }
    } catch (e) {
      console.log('Local stats API unavailable, trying gist fallback...');
    }

    // Fallback to external gist (works on static Cloudflare Pages deploy)
    try {
      const gistRes = await fetch(TRADING_STATS_GIST_URL, { cache: 'no-store' });
      if (gistRes.ok) {
        const gistData = await gistRes.json();
        // Map gist format to TradingStats interface (comprehensive mapping)
        const totalTrades = gistData.totalTrades ?? 0;
        const winRate = gistData.winRate ?? 0;
        const wonTrades = Math.round((winRate * totalTrades) / 100);
        const lostTrades = totalTrades - wonTrades;
        
        return {
          // Core stats
          totalTrades,
          wonTrades,
          lostTrades,
          pendingTrades: gistData.pendingTrades ?? 0,
          winRate,
          totalPnlCents: gistData.pnlCents ?? 0,
          
          // Profit metrics
          grossProfitCents: gistData.grossProfitCents,
          grossLossCents: gistData.grossLossCents,
          profitFactor: gistData.profitFactor === "∞" ? Infinity : gistData.profitFactor,
          
          // Risk metrics
          maxDrawdownCents: gistData.maxDrawdownCents,
          maxDrawdownPercent: gistData.maxDrawdownPercent,
          
          // Calculate avg return from PnL/trades
          avgReturnCents: totalTrades > 0 ? Math.round((gistData.pnlCents ?? 0) / totalTrades) : 0,
          
          // Today stats
          todayTrades: gistData.todayTrades ?? 0,
          todayWinRate: gistData.todayWinRate ?? 0,
          todayPnlCents: gistData.todayPnlCents ?? 0,
          
          // Yesterday comparison (T364)
          yesterdayTrades: gistData.yesterdayTrades ?? 0,
          yesterdayWinRate: gistData.yesterdayWinRate ?? 0,
          yesterdayPnlCents: gistData.yesterdayPnlCents ?? 0,
          
          // Week comparison (T364)
          thisWeek: gistData.thisWeek ?? { trades: 0, winRate: 0, pnlCents: 0 },
          prevWeek: gistData.prevWeek ?? { trades: 0, winRate: 0, pnlCents: 0 },
          
          // Latency stats
          avgLatencyMs: gistData.avgLatencyMs ?? null,
          p95LatencyMs: gistData.p95LatencyMs ?? null,
          minLatencyMs: gistData.minLatencyMs ?? null,
          maxLatencyMs: gistData.maxLatencyMs ?? null,
          latencyTradeCount: gistData.latencyTradeCount ?? 0,
          
          // Volatility analysis
          volatility: gistData.volatility,
          
          // Edge distribution (T368)
          edgeDistribution: gistData.edgeDistribution ?? null,
          
          // API latency breakdown (T445)
          apiLatency: gistData.apiLatency ?? null,
          
          // Latency history for sparkline (T800)
          latencyHistory: gistData.latencyHistory ?? null,
          
          // Autotrader health status (T623)
          healthStatus: gistData.healthStatus ?? null,
          
          // Autotrader health history (T829)
          healthHistory: gistData.healthHistory ?? null,
          
          // Empty fields (not in gist but needed for interface)
          recentTrades: [],
          lastUpdated: gistData.lastUpdated ?? new Date().toISOString(),
        };
      }
    } catch (e) {
      console.error('Gist fallback also failed:', e);
    }

    return null;
  }, [buildStatsUrl]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    let fromCache = false;
    
    try {
      const [kalshiRes, cryptoRes, inboxRes, momentumRes, trendRes, agentRes] = await Promise.all([
        fetch('/api/kalshi/status'),
        fetch('/api/crypto/prices'),
        fetch('/api/inbox'),
        fetch('/api/momentum'),
        fetch(`/api/trading/trend?days=30&source=${statsSource}`),
        fetch(AGENT_STATUS_API)
      ]);

      // Check if any response came from service worker cache
      // SW adds 'sw-cache-time' header to cached responses
      const responses = [kalshiRes, cryptoRes, inboxRes, momentumRes, trendRes, agentRes];
      const anyCached = responses.some(res => res.headers.get('sw-cache-time'));
      const anyFailed = responses.some(res => !res.ok);
      fromCache = anyCached || anyFailed || !navigator.onLine;

      // Fetch trading stats with gist fallback
      const statsData = await fetchTradingStatsWithFallback();
      if (statsData) {
        setTradingStats(statsData);
        // Extract autotrader health status (T623)
        if (statsData.healthStatus) {
          setAutotraderHealth(statsData.healthStatus);
        }
      }

      if (kalshiRes.ok) setKalshiStatus(await kalshiRes.json());
      if (cryptoRes.ok) setCryptoPrices(await cryptoRes.json());
      if (inboxRes.ok) setInbox(await inboxRes.json());
      if (momentumRes.ok) setMomentum(await momentumRes.json());
      if (trendRes.ok) setWinRateTrend(await trendRes.json());
      if (agentRes.ok) setAgentStatus(await agentRes.json());

      setLastRefresh(new Date());
      setDataFromCache(fromCache);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Network error likely means we're showing cached data
      setDataFromCache(true);
    } finally {
      setIsLoading(false);
    }
  }, [fetchTradingStatsWithFallback, statsSource]);

  // Update fetchData ref for touch gesture hook
  fetchDataRef.current = fetchData;

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Countdown timer logic (T740)
  useEffect(() => {
    if (!autoRefresh || isPaused || isLoading) return;
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Trigger refresh when countdown reaches 0
          fetchData();
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefresh, isPaused, isLoading, fetchData]);
  
  // Reset countdown when refresh completes
  useEffect(() => {
    if (!isLoading) {
      setCountdown(REFRESH_INTERVAL);
    }
  }, [isLoading]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Only handle Escape in input fields
        if (e.key === 'Escape') {
          target.blur();
          setShowShortcuts(false);
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'r':
          e.preventDefault();
          fetchData();
          break;
        case '/':
          e.preventDefault();
          inputRef.current?.focus();
          break;
        case '?':
          e.preventDefault();
          setShowShortcuts(prev => !prev);
          break;
        case 'escape':
          setShowShortcuts(false);
          break;
        case 'k':
          e.preventDefault();
          window.open('https://kalshi.com/portfolio', '_blank');
          break;
        case 'h':
          e.preventDefault();
          setShowShortcuts(prev => !prev);
          break;
        case 'e':
          e.preventDefault();
          setShowAllStats(prev => !prev);
          break;
        case 't':
          e.preventDefault();
          toggleTheme();
          break;
        case 'c':
          e.preventDefault();
          toggleCompare();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fetchData, toggleTheme, toggleCompare]);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    setIsSending(true);
    try {
      const res = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: inputMessage })
      });
      if (res.ok) {
        setInputMessage('');
        const inboxRes = await fetch('/api/inbox');
        if (inboxRes.ok) setInbox(await inboxRes.json());
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      const res = await fetch(`/api/inbox?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setInbox(prev => prev ? {
          ...prev,
          messages: prev.messages.filter(m => m.id !== id)
        } : null);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const getMessageIcon = (type: InboxMessage['type']) => {
    switch (type) {
      case 'link': return <LinkIcon className="w-4 h-4 text-cyan-400" />;
      case 'command': return <Terminal className="w-4 h-4 text-emerald-400" />;
      default: return <MessageSquare className="w-4 h-4 text-purple-400" />;
    }
  };

  const totalValue = (kalshiStatus?.cash || 0) + (kalshiStatus?.portfolioValue || 0);
  const positionsCount = kalshiStatus?.positions?.length || 0;

  // Chart data - use real priceHistory from momentum API if available, otherwise fallback to mock
  const btcMomentumAsset = momentum?.data?.find(a => a.symbol === 'BTC');
  const ethMomentumAsset = momentum?.data?.find(a => a.symbol === 'ETH');
  const btcChartData = btcMomentumAsset?.priceHistory?.length ? btcMomentumAsset.priceHistory : [88000, 88200, 87800, 88500, 88300, 88900, 89100, 88700, 88911];
  const ethChartData = ethMomentumAsset?.priceHistory?.length ? ethMomentumAsset.priceHistory : [2950, 2980, 2960, 3010, 2990, 3020, 3000, 2995, 2999];

  return (
    <div 
      className={`min-h-screen overflow-hidden transition-colors duration-300 ${
        resolvedTheme === 'light' 
          ? 'bg-slate-50 text-gray-900' 
          : 'bg-[#0a0a0f] text-white'
      }`}
      {...touchHandlers}
    >
      {/* Pull-to-refresh indicator for mobile */}
      <PullToRefreshIndicator 
        pullDistance={touchState.pullDistance} 
        threshold={80} 
        isRefreshing={touchState.isRefreshing} 
      />
      
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-[150px] animate-blob ${
          resolvedTheme === 'light' ? 'bg-purple-300/20' : 'bg-purple-500/10'
        }`} />
        <div className={`absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[150px] animate-blob animation-delay-2000 ${
          resolvedTheme === 'light' ? 'bg-cyan-300/20' : 'bg-cyan-500/10'
        }`} />
        <div className={`absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full blur-[150px] animate-blob animation-delay-4000 ${
          resolvedTheme === 'light' ? 'bg-blue-300/20' : 'bg-blue-500/10'
        }`} />
        {/* Grid overlay */}
        <div className={`absolute inset-0 bg-[size:50px_50px] ${
          resolvedTheme === 'light' 
            ? 'bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)]'
            : 'bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)]'
        }`} />
      </div>

      <div className="relative z-10 p-4 md:p-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 md:mb-8 gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-purple-500 via-cyan-500 to-emerald-500 p-[2px]">
                <div className="w-full h-full rounded-xl md:rounded-2xl bg-[#0a0a0f] flex items-center justify-center">
                  <Target className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1">
                <PulsingDot color="green" />
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-cyan-200 to-purple-200 bg-clip-text text-transparent truncate">
                Trading Terminal
              </h1>
              <p className="text-gray-500 text-xs sm:text-sm">Kalshi • Polymarket • Live</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap">
            {/* Autotrader Status Indicator (T623) */}
            {autotraderHealth && (
              <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                autotraderHealth.is_running && autotraderHealth.status === 'healthy' 
                  ? 'bg-green-500/10 border-green-500/30' :
                autotraderHealth.is_running && autotraderHealth.status === 'warning'
                  ? 'bg-yellow-500/10 border-yellow-500/30' :
                autotraderHealth.circuit_breaker_active
                  ? 'bg-red-500/10 border-red-500/30' :
                !autotraderHealth.is_running
                  ? 'bg-red-500/10 border-red-500/30' :
                'bg-white/5 border-white/10'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  autotraderHealth.is_running 
                    ? autotraderHealth.circuit_breaker_active 
                      ? 'bg-red-500' 
                      : autotraderHealth.status === 'healthy' 
                        ? 'bg-green-500 animate-pulse' 
                        : 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500'
                }`} />
                <span className={`text-xs font-medium ${
                  autotraderHealth.is_running 
                    ? autotraderHealth.circuit_breaker_active 
                      ? 'text-red-400'
                      : autotraderHealth.status === 'healthy' 
                        ? 'text-green-400' 
                        : 'text-yellow-400'
                    : 'text-red-400'
                }`}>
                  {autotraderHealth.circuit_breaker_active 
                    ? '🛑 Circuit Breaker' 
                    : autotraderHealth.is_running 
                      ? `🤖 ${autotraderHealth.dry_run ? 'Dry Run' : 'Trading'}` 
                      : '🤖 Offline'}
                </span>
              </div>
            )}
            {/* Streak Indicator (T444) */}
            {tradingStats && (tradingStats.currentStreak ?? 0) > 0 && (
              <StreakIndicator
                currentStreak={tradingStats.currentStreak ?? 0}
                currentStreakType={tradingStats.currentStreakType ?? 'none'}
                compact={true}
                className="hidden sm:inline-flex"
              />
            )}
            {/* Latency Sparkline + Adjustment Indicator (T800, T803) */}
            {tradingStats && (
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10" title="API Latency (24h)">
                <Zap className="w-3 h-3 text-gray-400" />
                <LatencySparkline
                  data={tradingStats.latencyHistory || generateMockLatencyHistory()}
                  width={60}
                  height={18}
                  showLabel={true}
                />
                <LatencyAdjustmentIndicator
                  avgLatencyMs={tradingStats.latencyHistory?.summary?.avgLatencyMs ?? tradingStats.avgLatencyMs}
                  compact={true}
                />
              </div>
            )}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <PulsingDot color="green" label="Systems Online" />
            </div>
            <LastUpdatedIndicator
              lastUpdated={lastRefresh}
              fromCache={dataFromCache}
              thresholdSeconds={300}
              compact={true}
              onRequestRefresh={fetchData}
            />
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/50 transition-all duration-300 group"
              title={`Theme: ${theme} (T)`}
            >
              {theme === 'system' ? (
                <Monitor className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" />
              ) : resolvedTheme === 'dark' ? (
                <Moon className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" />
              ) : (
                <Sun className="w-4 h-4 text-gray-400 group-hover:text-amber-400 transition-colors" />
              )}
            </button>
            <button
              onClick={() => setShowShortcuts(true)}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all duration-300"
              title="Keyboard shortcuts (?)"
            >
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </button>
            {/* Comparison tooltip toggle (T744) */}
            {compareLoaded && (
              <ComparisonTooltipToggle 
                enabled={compareEnabled} 
                onToggle={toggleCompare}
                className="hidden sm:flex"
              />
            )}
            {/* Auto-refresh toggle (T740) */}
            <button
              onClick={toggleAutoRefresh}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                autoRefresh ? 'bg-emerald-500' : 'bg-gray-600'
              }`}
              aria-label="Toggle auto-refresh"
              title={`Auto-refresh ${autoRefresh ? 'on' : 'off'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                autoRefresh ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
            
            {/* Countdown timer (T740) */}
            {autoRefresh && !isLoading && (
              <div 
                className="flex items-center gap-1.5"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                title={isPaused ? 'Paused - move mouse away to resume' : 'Hover to pause countdown'}
              >
                {/* Circular progress indicator */}
                <div className="relative w-5 h-5">
                  <svg className="w-5 h-5 -rotate-90" viewBox="0 0 24 24">
                    {/* Background circle */}
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-gray-700"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      className={isPaused ? 'text-yellow-500' : 'text-emerald-500'}
                      strokeDasharray={2 * Math.PI * 10}
                      strokeDashoffset={2 * Math.PI * 10 * (1 - countdown / REFRESH_INTERVAL)}
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                </div>
                <span className={`text-xs font-mono ${isPaused ? 'text-yellow-500' : 'text-gray-400'}`}>
                  {isPaused ? '⏸' : `${countdown}s`}
                </span>
              </div>
            )}
            {isLoading && (
              <span className="text-xs text-cyan-400 animate-pulse">Refreshing...</span>
            )}
            
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="group flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-white/10 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,212,255,0.2)]"
              title="Refresh (R)"
            >
              <RefreshCw className={`w-4 h-4 text-cyan-400 transition-transform duration-500 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
              <span className="text-xs sm:text-sm font-medium">Refresh</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white/10 text-gray-400 rounded border border-white/20 ml-1">R</kbd>
            </button>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          {/* BTC Card */}
          <GlassCard glowColor="orange" className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/30 to-amber-500/30 flex items-center justify-center">
                  <span className="text-orange-400 font-bold text-sm">₿</span>
                </div>
                <span className="text-gray-400 text-sm font-medium">Bitcoin</span>
              </div>
              {cryptoPrices?.btc24hChange && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  cryptoPrices.btc24hChange >= 0 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {cryptoPrices.btc24hChange >= 0 ? '+' : ''}{cryptoPrices.btc24hChange.toFixed(2)}%
                </span>
              )}
            </div>
            <AnimatedNumber 
              value={cryptoPrices?.btc || 0} 
              prefix="$"
              decimals={0}
              glowColor="orange"
              className="text-2xl md:text-3xl"
            />
            <MiniChart data={btcChartData} color="orange" />
          </GlassCard>

          {/* ETH Card */}
          <GlassCard glowColor="purple" className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center">
                  <span className="text-purple-400 font-bold text-sm">◆</span>
                </div>
                <span className="text-gray-400 text-sm font-medium">Ethereum</span>
              </div>
              {cryptoPrices?.eth24hChange && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  cryptoPrices.eth24hChange >= 0 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {cryptoPrices.eth24hChange >= 0 ? '+' : ''}{cryptoPrices.eth24hChange.toFixed(2)}%
                </span>
              )}
            </div>
            <AnimatedNumber 
              value={cryptoPrices?.eth || 0} 
              prefix="$"
              decimals={0}
              glowColor="purple"
              className="text-2xl md:text-3xl"
            />
            <MiniChart data={ethChartData} color="purple" />
          </GlassCard>

          {/* Cash Card */}
          <StatCard
            title="Available Cash"
            value={kalshiStatus?.cash || 0}
            icon={DollarSign}
            glowColor="green"
            prefix="$"
            decimals={2}
          />

          {/* Portfolio Card */}
          <StatCard
            title="Portfolio Value"
            value={totalValue}
            subtitle={`${positionsCount} active positions`}
            icon={Wallet}
            glowColor="cyan"
            prefix="$"
            decimals={2}
          />
        </div>

        {/* Momentum Indicator Section */}
        {momentum && momentum.data && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/30 to-indigo-500/30 flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Market Momentum</h2>
                <p className="text-xs text-gray-500">1h / 4h / 24h price change</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {momentum.data.map((asset) => (
                <GlassCard 
                  key={asset.symbol} 
                  glowColor={asset.signal === 'bullish' ? 'green' : asset.signal === 'bearish' ? 'red' : 'cyan'} 
                  className="p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        asset.symbol === 'BTC' 
                          ? 'bg-gradient-to-br from-orange-500/30 to-amber-500/30' 
                          : 'bg-gradient-to-br from-purple-500/30 to-blue-500/30'
                      }`}>
                        <span className={`font-bold text-sm ${asset.symbol === 'BTC' ? 'text-orange-400' : 'text-purple-400'}`}>
                          {asset.symbol === 'BTC' ? '₿' : '◆'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-300 font-medium">{asset.asset}</span>
                        <p className="text-xs text-gray-600">${asset?.currentPrice?.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Signal Strength Bars */}
                      <div className="flex items-end gap-0.5 h-4" title={`Strength: ${asset.strength}`}>
                        <div className={`w-1 rounded-full transition-all ${
                          asset.strength !== 'weak' && asset.strength !== 'moderate' && asset.strength !== 'strong' ? 'h-1.5 bg-gray-600' :
                          asset.signal === 'bullish' ? 'h-1.5 bg-emerald-400' :
                          asset.signal === 'bearish' ? 'h-1.5 bg-red-400' :
                          'h-1.5 bg-gray-500'
                        }`} />
                        <div className={`w-1 rounded-full transition-all ${
                          asset.strength === 'moderate' || asset.strength === 'strong'
                            ? asset.signal === 'bullish' ? 'h-2.5 bg-emerald-400' :
                              asset.signal === 'bearish' ? 'h-2.5 bg-red-400' :
                              'h-2.5 bg-gray-500'
                            : 'h-2.5 bg-gray-700'
                        }`} />
                        <div className={`w-1 rounded-full transition-all ${
                          asset.strength === 'strong'
                            ? asset.signal === 'bullish' ? 'h-3.5 bg-emerald-400' :
                              asset.signal === 'bearish' ? 'h-3.5 bg-red-400' :
                              'h-3.5 bg-gray-500'
                            : 'h-3.5 bg-gray-700'
                        }`} />
                      </div>
                      {/* Signal Badge */}
                      <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${
                        asset.signal === 'bullish' 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : asset.signal === 'bearish'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        {asset.signal === 'bullish' ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : asset.signal === 'bearish' ? (
                          <TrendingDown className="w-4 h-4" />
                        ) : (
                          <span>→</span>
                        )}
                        <span className="capitalize">{asset.signal}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                      <div className="text-xs text-gray-500 mb-1">1H</div>
                      <div className={`text-sm font-mono font-bold ${
                        asset.momentum.h1 >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {asset.momentum.h1 >= 0 ? '+' : ''}{asset.momentum.h1.toFixed(2)}%
                      </div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                      <div className="text-xs text-gray-500 mb-1">4H</div>
                      <div className={`text-sm font-mono font-bold ${
                        asset.momentum.h4 >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {asset.momentum.h4 >= 0 ? '+' : ''}{asset.momentum.h4.toFixed(2)}%
                      </div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                      <div className="text-xs text-gray-500 mb-1">24H</div>
                      <div className={`text-sm font-mono font-bold ${
                        asset.momentum.h24 >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {asset.momentum.h24 >= 0 ? '+' : ''}{asset.momentum.h24.toFixed(2)}%
                      </div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/[0.05] border border-white/[0.08]">
                      <div className="text-xs text-gray-500 mb-1">Score</div>
                      <div className={`text-sm font-mono font-bold ${
                        asset.momentum.composite >= 0.3 ? 'text-emerald-400' : 
                        asset.momentum.composite <= -0.3 ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {asset.momentum.composite >= 0 ? '+' : ''}{asset.momentum.composite.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  {/* 24h Price Trend Sparkline */}
                  {asset.priceHistory && asset.priceHistory.length > 1 && (
                    <div className="mt-3 pt-3 border-t border-white/[0.05]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-gray-500">24h Price Trend</span>
                        <span className={`text-[10px] font-medium ${
                          asset.priceHistory[asset.priceHistory.length - 1] > asset.priceHistory[0]
                            ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {((asset.priceHistory[asset.priceHistory.length - 1] - asset.priceHistory[0]) / asset.priceHistory[0] * 100).toFixed(2)}%
                        </span>
                      </div>
                      <MiniChart 
                        data={asset.priceHistory} 
                        color={asset.signal === 'bullish' ? 'green' : asset.signal === 'bearish' ? 'orange' : 'cyan'} 
                      />
                    </div>
                  )}
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* Trading Stats Section */}
        {tradingStats && (
          <div className="mb-8">
            {/* Mobile-optimized header with scrollable filters (T756) */}
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-yellow-500/30 to-orange-500/30 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold truncate">Trading Performance</h2>
                    <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                      {statsPeriod !== 'all' && (
                        <span className="text-cyan-400/80 mr-1">{getDateRangeText()} •</span>
                      )}
                      Win rate & PnL analysis
                    </p>
                  </div>
                </div>
                {/* Mobile expand/collapse button - larger touch target */}
                <button
                  onClick={() => setShowAllStats(!showAllStats)}
                  className="md:hidden flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm hover:bg-white/10 active:bg-white/15 transition-all min-w-[80px] justify-center"
                >
                  {showAllStats ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      <span>Less</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      <span>More</span>
                    </>
                  )}
                </button>
              </div>
              
              {/* Horizontally scrollable filter controls on mobile (T756) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible scrollbar-none">
                {/* Date Period Filter - larger touch targets on mobile */}
                <div className="flex items-center rounded-xl bg-white/5 border border-white/10 p-0.5 sm:p-0.5 flex-shrink-0">
                  {(['all', 'today', 'week', 'month'] as DatePeriod[]).map((period) => (
                    <button
                      key={period}
                      onClick={() => setStatsPeriod(period)}
                      className={`px-3 py-2 sm:px-2 sm:py-1 rounded-lg sm:rounded-md text-sm sm:text-xs font-medium transition-all capitalize min-w-[48px] ${
                        statsPeriod === period 
                          ? 'bg-white/10 text-gray-200' 
                          : 'text-gray-500 hover:text-gray-400 active:bg-white/5'
                      }`}
                    >
                      {period === 'all' ? 'All' : period === 'today' ? 'Today' : period === 'week' ? '7D' : '30D'}
                    </button>
                  ))}
                  <button
                    onClick={() => setStatsPeriod('custom')}
                    className={`px-3 py-2 sm:px-2 sm:py-1 rounded-lg sm:rounded-md text-sm sm:text-xs font-medium transition-all flex items-center gap-1 ${
                      statsPeriod === 'custom' 
                        ? 'bg-white/10 text-gray-200' 
                        : 'text-gray-500 hover:text-gray-400 active:bg-white/5'
                    }`}
                    title="Custom date range"
                  >
                    <Calendar className="w-4 h-4 sm:w-3 sm:h-3" />
                  </button>
                </div>
                {/* Custom date range inputs */}
                {statsPeriod === 'custom' && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <input
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      className="px-3 py-2 sm:px-2 sm:py-1 rounded-xl sm:rounded-lg bg-white/5 border border-white/10 text-sm sm:text-xs text-gray-300 focus:border-cyan-500/50 focus:outline-none min-w-[130px]"
                    />
                    <span className="text-gray-600 text-sm sm:text-xs">→</span>
                    <input
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      className="px-3 py-2 sm:px-2 sm:py-1 rounded-xl sm:rounded-lg bg-white/5 border border-white/10 text-sm sm:text-xs text-gray-300 focus:border-cyan-500/50 focus:outline-none min-w-[130px]"
                    />
                  </div>
                )}
                {/* v1/v2 Source Toggle - larger on mobile */}
                <div className="flex items-center rounded-xl bg-white/5 border border-white/10 p-0.5 flex-shrink-0">
                  <button
                    onClick={() => setStatsSource('v1')}
                    className={`px-3 py-2 sm:px-2 sm:py-1 rounded-lg sm:rounded-md text-sm sm:text-xs font-medium transition-all min-w-[40px] ${
                      statsSource === 'v1' 
                        ? 'bg-white/10 text-gray-200' 
                        : 'text-gray-500 hover:text-gray-400 active:bg-white/5'
                    }`}
                  >
                    v1
                  </button>
                  <button
                    onClick={() => setStatsSource('v2')}
                    className={`px-3 py-2 sm:px-2 sm:py-1 rounded-lg sm:rounded-md text-sm sm:text-xs font-medium transition-all min-w-[40px] ${
                      statsSource === 'v2' 
                        ? 'bg-white/10 text-gray-200' 
                        : 'text-gray-500 hover:text-gray-400 active:bg-white/5'
                    }`}
                  >
                    v2
                  </button>
                </div>
              </div>
            </div>
            
            {/* Trade Ticker (T333) */}
            {tradingStats.recentTrades && tradingStats.recentTrades.length > 0 && (
              <div className="mb-4">
                <TradeTicker 
                  trades={tradingStats.recentTrades.slice(0, 20)}
                  speed="normal"
                  showTimestamp={false}
                />
              </div>
            )}
            
            <div className={`grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 md:gap-4 ${!showAllStats ? 'max-md:[&>*:nth-child(n+7)]:hidden' : ''}`}>
              {/* Win Rate */}
              <StatsComparisonTooltip
                enabled={compareEnabled}
                type="rate"
                data={tradingStats.prevWeek ? {
                  current: tradingStats.winRate,
                  previous: tradingStats.prevWeek.winRate,
                  previousPeriod: 'last week'
                } : undefined}
                position="bottom"
              >
                <GlassCard glowColor={tradingStats.winRate >= 50 ? 'green' : 'red'} className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-400 text-[10px] sm:text-xs font-medium truncate">Win Rate</span>
                    </div>
                    {/* 7-day trend sparkline */}
                    <WinRateSparkline 
                      data={parseWinRateTrendFromStats(winRateTrend) || generateMockSparklineData(7)}
                      width={50}
                      height={20}
                      showTrendIcon={false}
                    />
                  </div>
                  <AnimatedNumber 
                    value={tradingStats.winRate} 
                    suffix="%"
                    decimals={1}
                    glowColor={tradingStats.winRate >= 50 ? 'green' : 'red'}
                    className="text-xl sm:text-2xl"
                  />
                  <p className="text-[10px] sm:text-xs text-gray-600 mt-1">
                    {tradingStats.wonTrades}W / {tradingStats.lostTrades}L
                  </p>
                </GlassCard>
              </StatsComparisonTooltip>

              {/* Total PnL */}
              <StatsComparisonTooltip
                enabled={compareEnabled}
                type="pnl"
                data={tradingStats.prevWeek ? {
                  current: tradingStats.thisWeek?.pnlCents ?? tradingStats.totalPnlCents,
                  previous: tradingStats.prevWeek.pnlCents,
                  previousPeriod: 'last week'
                } : undefined}
                position="bottom"
              >
                <GlassCard glowColor={tradingStats.totalPnlCents >= 0 ? 'green' : 'red'} className="p-3 sm:p-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-400 text-[10px] sm:text-xs font-medium truncate">Total PnL</span>
                  </div>
                  <AnimatedNumber 
                    value={tradingStats.totalPnlCents / 100} 
                    prefix={tradingStats.totalPnlCents >= 0 ? '+$' : '-$'}
                    decimals={2}
                    glowColor={tradingStats.totalPnlCents >= 0 ? 'green' : 'red'}
                    className="text-lg sm:text-xl md:text-2xl"
                  />
                  <StatsComparisonTooltip
                    enabled={compareEnabled}
                    type="count"
                    data={tradingStats.prevWeek ? {
                      current: tradingStats.thisWeek?.trades ?? tradingStats.totalTrades,
                      previous: tradingStats.prevWeek.trades,
                      previousPeriod: 'last week'
                    } : undefined}
                    position="bottom"
                  >
                    <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1 cursor-help hover:text-gray-400 transition-colors">
                      {tradingStats.totalTrades} trades
                    </p>
                  </StatsComparisonTooltip>
                </GlassCard>
              </StatsComparisonTooltip>

              {/* Today PnL */}
              <StatsComparisonTooltip
                enabled={compareEnabled}
                type="pnl"
                data={tradingStats.yesterdayPnlCents !== undefined ? {
                  current: tradingStats.todayPnlCents,
                  previous: tradingStats.yesterdayPnlCents,
                  previousPeriod: 'yesterday'
                } : undefined}
                position="bottom"
              >
                <GlassCard glowColor={tradingStats.todayPnlCents >= 0 ? 'green' : 'red'} className="p-3 sm:p-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-400 text-[10px] sm:text-xs font-medium truncate">Today</span>
                    {(tradingStats.yesterdayPnlCents ?? 0) !== 0 && (
                      <ComparisonIndicator 
                        current={tradingStats.todayPnlCents} 
                        previous={tradingStats.yesterdayPnlCents ?? 0}
                        type="pnl"
                      />
                    )}
                  </div>
                  <AnimatedNumber 
                    value={Math.abs(tradingStats.todayPnlCents / 100)} 
                    prefix={tradingStats.todayPnlCents >= 0 ? '+$' : '-$'}
                    decimals={2}
                    glowColor={tradingStats.todayPnlCents >= 0 ? 'green' : 'red'}
                    className="text-lg sm:text-xl md:text-2xl"
                  />
                  <StatsComparisonTooltip
                    enabled={compareEnabled}
                    type="count"
                    data={tradingStats.yesterdayTrades !== undefined ? {
                      current: tradingStats.todayTrades,
                      previous: tradingStats.yesterdayTrades,
                      previousPeriod: 'yesterday'
                    } : undefined}
                    position="bottom"
                  >
                    <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1 cursor-help hover:text-gray-400 transition-colors">
                      {tradingStats.todayTrades} trades
                    </p>
                  </StatsComparisonTooltip>
                </GlassCard>
              </StatsComparisonTooltip>

              {/* Today Win Rate */}
              <StatsComparisonTooltip
                enabled={compareEnabled}
                type="rate"
                data={tradingStats.yesterdayWinRate !== undefined ? {
                  current: tradingStats.todayWinRate,
                  previous: tradingStats.yesterdayWinRate,
                  previousPeriod: 'yesterday'
                } : undefined}
                position="bottom"
              >
                <GlassCard glowColor={tradingStats.todayWinRate >= 50 ? 'green' : 'orange'} className="p-3 sm:p-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-400 text-[10px] sm:text-xs font-medium truncate">Today WR</span>
                    {(tradingStats.yesterdayWinRate ?? 0) !== 0 && (
                      <ComparisonIndicator 
                        current={tradingStats.todayWinRate} 
                        previous={tradingStats.yesterdayWinRate ?? 0}
                        type="rate"
                      />
                    )}
                  </div>
                  <AnimatedNumber 
                    value={tradingStats.todayWinRate || 0} 
                    suffix="%"
                    decimals={1}
                    glowColor={tradingStats.todayWinRate >= 50 ? 'green' : 'orange'}
                    className="text-lg sm:text-xl md:text-2xl"
                  />
                </GlassCard>
              </StatsComparisonTooltip>

              {/* Avg Return Per Trade */}
              <GlassCard glowColor={(tradingStats.avgReturnCents ?? 0) >= 0 ? 'green' : 'red'} className="p-3 sm:p-4">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-400 text-[10px] sm:text-xs font-medium truncate">Avg Return</span>
                </div>
                <AnimatedNumber 
                  value={Math.abs((tradingStats.avgReturnCents ?? 0) / 100)} 
                  prefix={(tradingStats.avgReturnCents ?? 0) >= 0 ? '+$' : '-$'}
                  decimals={2}
                  glowColor={(tradingStats.avgReturnCents ?? 0) >= 0 ? 'green' : 'red'}
                  className="text-lg sm:text-xl md:text-2xl"
                />
                <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">per trade avg</p>
              </GlassCard>

              {/* Profit Factor */}
              <GlassCard glowColor={(tradingStats.profitFactor ?? 0) >= 1 ? 'green' : 'red'} className="p-3 sm:p-4">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-400 text-[10px] sm:text-xs font-medium truncate">Profit Factor</span>
                </div>
                <AnimatedNumber 
                  value={tradingStats.profitFactor ?? 0} 
                  decimals={2}
                  glowColor={(tradingStats.profitFactor ?? 0) >= 1 ? 'green' : 'red'}
                  className="text-lg sm:text-xl md:text-2xl"
                />
                <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">
                  {(tradingStats.profitFactor ?? 0) >= 1.5 ? 'strong' : (tradingStats.profitFactor ?? 0) >= 1 ? 'profitable' : 'needs work'}
                </p>
              </GlassCard>

              {/* Sharpe Ratio */}
              <GlassCard glowColor={(tradingStats.sharpeRatio ?? 0) >= 0 ? 'purple' : 'red'} className="p-3 sm:p-4">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-400 text-[10px] sm:text-xs font-medium truncate">Sharpe Ratio</span>
                </div>
                <AnimatedNumber 
                  value={tradingStats.sharpeRatio ?? 0} 
                  decimals={2}
                  glowColor={(tradingStats.sharpeRatio ?? 0) >= 1 ? 'green' : (tradingStats.sharpeRatio ?? 0) >= 0 ? 'purple' : 'red'}
                  className="text-lg sm:text-xl md:text-2xl"
                />
                <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">
                  {(tradingStats.sharpeRatio ?? 0) >= 2 ? 'excellent' : (tradingStats.sharpeRatio ?? 0) >= 1 ? 'good' : (tradingStats.sharpeRatio ?? 0) >= 0 ? 'fair' : 'poor'}
                </p>
              </GlassCard>

              {/* Sortino Ratio */}
              <GlassCard glowColor={(tradingStats.sortinoRatio ?? 0) >= 1 ? 'green' : 'purple'} className="p-3 sm:p-4">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-400 text-[10px] sm:text-xs font-medium truncate">Sortino Ratio</span>
                </div>
                <AnimatedNumber 
                  value={tradingStats.sortinoRatio ?? 0} 
                  decimals={2}
                  glowColor={(tradingStats.sortinoRatio ?? 0) >= 2 ? 'green' : (tradingStats.sortinoRatio ?? 0) >= 1 ? 'purple' : 'orange'}
                  className="text-lg sm:text-xl md:text-2xl"
                />
                <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">
                  {(tradingStats.sortinoRatio ?? 0) >= 2 ? 'excellent' : (tradingStats.sortinoRatio ?? 0) >= 1 ? 'good' : (tradingStats.sortinoRatio ?? 0) > 0 ? 'fair' : 'n/a'}
                </p>
              </GlassCard>

              {/* Max Drawdown */}
              <GlassCard glowColor={(tradingStats.maxDrawdownPercent ?? 0) <= 20 ? 'orange' : 'red'} className="p-3 sm:p-4">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-400 text-[10px] sm:text-xs font-medium truncate">Max Drawdown</span>
                </div>
                <AnimatedNumber 
                  value={tradingStats.maxDrawdownPercent ?? 0} 
                  suffix="%"
                  decimals={1}
                  glowColor={(tradingStats.maxDrawdownPercent ?? 0) <= 10 ? 'green' : (tradingStats.maxDrawdownPercent ?? 0) <= 20 ? 'orange' : 'red'}
                  className="text-lg sm:text-xl md:text-2xl"
                />
                <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">
                  ${((tradingStats.maxDrawdownCents ?? 0) / 100).toFixed(2)} from peak
                </p>
              </GlassCard>

              {/* Calmar Ratio */}
              <GlassCard glowColor={(tradingStats.calmarRatio ?? 0) >= 1 ? 'green' : 'orange'} className="p-3 sm:p-4">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-400 text-[10px] sm:text-xs font-medium truncate">Calmar Ratio</span>
                </div>
                <AnimatedNumber 
                  value={tradingStats.calmarRatio ?? 0} 
                  decimals={2}
                  glowColor={(tradingStats.calmarRatio ?? 0) >= 3 ? 'green' : (tradingStats.calmarRatio ?? 0) >= 1 ? 'purple' : 'orange'}
                  className="text-lg sm:text-xl md:text-2xl"
                />
                <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">
                  {(tradingStats.calmarRatio ?? 0) >= 3 ? 'excellent' : (tradingStats.calmarRatio ?? 0) >= 1 ? 'good' : (tradingStats.calmarRatio ?? 0) > 0 ? 'needs work' : 'n/a'}
                </p>
              </GlassCard>

              {/* Pending */}
              <GlassCard glowColor="cyan" className="p-3 sm:p-4">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-400 text-[10px] sm:text-xs font-medium truncate">Pending</span>
                </div>
                <AnimatedNumber 
                  value={tradingStats.pendingTrades} 
                  decimals={0}
                  glowColor="cyan"
                  className="text-lg sm:text-xl md:text-2xl"
                />
                <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">awaiting settlement</p>
              </GlassCard>

              {/* Avg Trade Duration */}
              <GlassCard glowColor="purple" className="p-3 sm:p-4">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-400 text-[10px] sm:text-xs font-medium truncate">Avg Duration</span>
                </div>
                <AnimatedNumber 
                  value={tradingStats.avgTradeDurationHours ?? 0} 
                  suffix="h"
                  decimals={1}
                  glowColor="purple"
                  className="text-lg sm:text-xl md:text-2xl"
                />
                <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">
                  {(tradingStats.avgTradeDurationHours ?? 0) < 1 ? 'short-term' : (tradingStats.avgTradeDurationHours ?? 0) < 4 ? 'medium-term' : 'longer holds'}
                </p>
              </GlassCard>

              {/* Current Streak */}
              <GlassCard glowColor={tradingStats.currentStreakType === 'win' ? 'green' : tradingStats.currentStreakType === 'loss' ? 'red' : 'cyan'} className="p-3 sm:p-4">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-400 text-[10px] sm:text-xs font-medium truncate">Current Streak</span>
                </div>
                <AnimatedNumber 
                  value={Math.abs(tradingStats.currentStreak ?? 0)} 
                  prefix={tradingStats.currentStreakType === 'win' ? '🔥 ' : tradingStats.currentStreakType === 'loss' ? '❄️ ' : ''}
                  decimals={0}
                  glowColor={tradingStats.currentStreakType === 'win' ? 'green' : tradingStats.currentStreakType === 'loss' ? 'red' : 'cyan'}
                  className="text-lg sm:text-xl md:text-2xl"
                />
                <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">
                  {tradingStats.currentStreakType === 'win' ? 'consecutive wins' : tradingStats.currentStreakType === 'loss' ? 'consecutive losses' : 'no streak'}
                </p>
              </GlassCard>

              {/* Best Streak */}
              <GlassCard glowColor="green" className="p-3 sm:p-4">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-400 text-[10px] sm:text-xs font-medium truncate">Best Streak</span>
                </div>
                <AnimatedNumber 
                  value={tradingStats.longestWinStreak ?? 0} 
                  prefix="🏆 "
                  decimals={0}
                  glowColor="green"
                  className="text-lg sm:text-xl md:text-2xl"
                />
                <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">longest win streak</p>
              </GlassCard>

              {/* Worst Streak */}
              <GlassCard glowColor="red" className="p-3 sm:p-4">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-400 text-[10px] sm:text-xs font-medium truncate">Worst Streak</span>
                </div>
                <AnimatedNumber 
                  value={tradingStats.longestLossStreak ?? 0} 
                  prefix="💀 "
                  decimals={0}
                  glowColor="red"
                  className="text-lg sm:text-xl md:text-2xl"
                />
                <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">longest loss streak</p>
              </GlassCard>

              {/* Order Latency */}
              <GlassCard glowColor={
                (tradingStats.avgLatencyMs ?? 0) === 0 ? 'cyan' :
                (tradingStats.avgLatencyMs ?? 0) < 500 ? 'green' :
                (tradingStats.avgLatencyMs ?? 0) < 1000 ? 'orange' : 'red'
              } className="p-3 sm:p-4">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-400 text-[10px] sm:text-xs font-medium truncate">Avg Latency</span>
                </div>
                {tradingStats.latencyTradeCount && tradingStats.latencyTradeCount > 0 ? (
                  <>
                    <AnimatedNumber 
                      value={tradingStats.avgLatencyMs ?? 0} 
                      suffix="ms"
                      decimals={0}
                      glowColor={
                        (tradingStats.avgLatencyMs ?? 0) < 500 ? 'green' :
                        (tradingStats.avgLatencyMs ?? 0) < 1000 ? 'orange' : 'red'
                      }
                      className="text-lg sm:text-xl md:text-2xl"
                    />
                    <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">
                      p95: {tradingStats.p95LatencyMs ?? 0}ms · {tradingStats.latencyTradeCount} trades
                    </p>
                  </>
                ) : (
                  <>
                    <span className="text-lg sm:text-xl md:text-2xl font-bold text-gray-500">N/A</span>
                    <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">no latency data yet</p>
                  </>
                )}
              </GlassCard>
            </div>

            {/* Daily Goal Tracker + Volume */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DailyGoalTracker todayPnlCents={tradingStats.todayPnlCents} />
              <DailyVolumeWidget recentTrades={tradingStats.recentTrades || []} />
            </div>

            {/* Streak Pattern Visualization */}
            {tradingStats.recentTrades && tradingStats.recentTrades.length > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-xs font-medium">Trade History Pattern</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-[10px]">← newest</span>
                    <button
                      onClick={() => exportTradesToCSV(tradingStats.recentTrades)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] transition-all"
                      title="Export trades to CSV"
                    >
                      <Download className="w-3 h-3" />
                      <span className="hidden sm:inline">CSV</span>
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {tradingStats.recentTrades.slice(0, 10).map((trade, i) => (
                    <div 
                      key={i}
                      className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full transition-all ${
                        trade.result_status === 'won' 
                          ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                          : trade.result_status === 'lost'
                          ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                          : 'bg-gray-600 animate-pulse'
                      }`}
                      title={`${trade.side.toUpperCase()} ${trade.contracts}x @ ${trade.price_cents}¢ - ${trade.result_status || 'pending'}`}
                    />
                  ))}
                  {tradingStats.recentTrades.length < 10 && (
                    <span className="text-gray-600 text-xs ml-2">({tradingStats.recentTrades.length} trades)</span>
                  )}
                </div>
              </div>
            )}

            {/* Collapsible Charts Section Header (T756) */}
            <button
              onClick={() => toggleSection('charts')}
              className="mt-4 w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] active:bg-white/[0.06] transition-all md:hidden"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span className="text-gray-300 text-sm font-medium">Charts & Analysis</span>
                <span className="text-gray-600 text-xs">({collapsedSections.charts ? 'tap to expand' : '5 charts'})</span>
              </div>
              {collapsedSections.charts ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {/* Win Rate Trend Chart */}
            <div className={`mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] ${collapsedSections.charts ? 'hidden md:block' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span className="text-gray-400 text-xs font-medium">Win Rate Trend (30 days)</span>
                  {winRateTrend?.summary?.trend && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      winRateTrend.summary.trend === 'improving' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : winRateTrend.summary.trend === 'declining'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {winRateTrend.summary.trend === 'improving' ? '↑' : winRateTrend.summary.trend === 'declining' ? '↓' : '→'} {winRateTrend.summary.trend}
                    </span>
                  )}
                </div>
                <span className="text-gray-600 text-[10px]">
                  {winRateTrend?.summary?.overallWinRate !== undefined 
                    ? `${winRateTrend.summary.overallWinRate}% avg (${winRateTrend.summary.totalTrades} trades)`
                    : 'Rolling daily average'}
                </span>
              </div>
              <WinRateTrendChart 
                data={winRateTrend?.data || generateMockWinRateTrend(30)}
                height={140}
                showLabels={true}
              />
              <p className="text-[10px] text-gray-600 mt-2 text-center">
                Hover over points to see daily details
              </p>
            </div>

            {/* Return Distribution Histogram */}
            <div className={`mt-4 ${collapsedSections.charts ? 'hidden md:block' : ''}`}>
              <ReturnDistributionChart 
                trades={tradingStats.recentTrades && tradingStats.recentTrades.length > 5 
                  ? tradingStats.recentTrades.map(t => ({
                      result_status: t.result_status as 'won' | 'lost' | 'pending',
                      price_cents: t.price_cents,
                      contracts: t.contracts,
                      side: t.side as 'yes' | 'no'
                    }))
                  : generateMockTrades(50)
                }
                width={400}
                height={240}
                showLabels={true}
              />
              {(!tradingStats.recentTrades || tradingStats.recentTrades.length < 5) && (
                <p className="text-[10px] text-gray-600 mt-1 text-center">
                  Showing simulated data — will update with real trades
                </p>
              )}
            </div>

            {/* Latency Trend Chart */}
            {tradingStats.avgLatencyMs !== null && tradingStats.avgLatencyMs !== undefined && (
              <div className={`mt-4 ${collapsedSections.charts ? 'hidden md:block' : ''}`}>
                <LatencyTrendChart 
                  data={generateMockLatencyTrend(14)}
                  height={160}
                  showP95={true}
                />
                <p className="text-[10px] text-gray-600 mt-1 text-center">
                  Order execution latency trend (mock data shown until API available)
                </p>
              </div>
            )}

            {/* Collapsible Analytics Section Header (T756) */}
            <button
              onClick={() => toggleSection('analytics')}
              className="mt-4 w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] active:bg-white/[0.06] transition-all md:hidden"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <span className="text-gray-300 text-sm font-medium">Advanced Analytics</span>
                <span className="text-gray-600 text-xs">({collapsedSections.analytics ? 'tap to expand' : '8 widgets'})</span>
              </div>
              {collapsedSections.analytics ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {/* Volatility Analysis */}
            <div className={`mt-4 ${collapsedSections.analytics ? 'hidden md:block' : ''}`}>
              <VolatilityCard 
                volatility={tradingStats.volatility}
                loading={isLoading}
              />
            </div>

            {/* Edge Distribution (T368) */}
            <div className={`mt-4 ${collapsedSections.analytics ? 'hidden md:block' : ''}`}>
              <EdgeDistributionChart 
                data={tradingStats.edgeDistribution ?? null}
              />
            </div>

            {/* Streak Analysis Card (T444) */}
            <div className={`mt-4 ${collapsedSections.analytics ? 'hidden md:block' : ''}`}>
              <StreakIndicator
                currentStreak={tradingStats.currentStreak ?? 0}
                currentStreakType={tradingStats.currentStreakType ?? 'none'}
                longestWinStreak={tradingStats.longestWinStreak}
                longestLossStreak={tradingStats.longestLossStreak}
              />
            </div>

            {/* API Latency Chart (T445) */}
            {tradingStats.apiLatency && (
              <div className={`mt-4 ${collapsedSections.analytics ? 'hidden md:block' : ''}`}>
                <ApiLatencyChart data={tradingStats.apiLatency} />
              </div>
            )}

            {/* Model Comparison (T350) */}
            <div className={`mt-4 ${collapsedSections.analytics ? 'hidden md:block' : ''}`}>
              <ModelComparisonChart 
                v1Stats={tradingStats.bySource?.v1 || null}
                v2Stats={tradingStats.bySource?.v2 || null}
              />
            </div>

            {/* Weather Market Performance (T443) */}
            <div className={`mt-4 ${collapsedSections.analytics ? 'hidden md:block' : ''}`}>
              <WeatherPerformanceWidget 
                data={parseWeatherPerformance(tradingStats.recentTrades || [])}
                loading={isLoading}
              />
            </div>

            {/* Weather vs Crypto PnL Comparison (T448) */}
            <div className={`mt-4 ${collapsedSections.analytics ? 'hidden md:block' : ''}`}>
              <WeatherCryptoPnLChart 
                data={
                  tradingStats.recentTrades && tradingStats.recentTrades.length >= 5
                    ? parsePnLByMarketType(tradingStats.recentTrades)
                    : generateMockPnLData(14) // Fallback to mock data
                }
              />
            </div>

            {/* Portfolio Concentration History (T482) */}
            <div className={`mt-4 ${collapsedSections.analytics ? 'hidden md:block' : ''}`}>
              <ConcentrationHistoryChart 
                data={tradingStats.concentrationHistory?.snapshots}
                loading={isLoading}
              />
            </div>

            {/* Autotrader Health History (T829) */}
            <div className={`mt-4 ${collapsedSections.analytics ? 'hidden md:block' : ''}`}>
              <HealthHistoryWidget 
                data={tradingStats.healthHistory || undefined}
                loading={isLoading}
              />
            </div>

            {/* Asset Correlation Heatmap (T721) */}
            <div className={`mt-4 ${collapsedSections.analytics ? 'hidden md:block' : ''}`}>
              <CorrelationHeatmapWidget 
                correlationData={tradingStats.assetCorrelation || undefined}
                loading={isLoading}
              />
            </div>

            {/* GPU & Agent Status Widget (T966) */}
            <div className={`mt-4 ${collapsedSections.analytics ? 'hidden md:block' : ''}`}>
              <GpuStatusWidget 
                gpu={agentStatus?.gpu}
                ollama={agentStatus?.ollama}
                agents={agentStatus?.agents}
                systemHealth={agentStatus?.systemHealth}
                loading={isLoading}
              />
            </div>

            {/* Momentum Regime Widget (T853/T859) */}
            <div className={`mt-4 ${collapsedSections.analytics ? 'hidden md:block' : ''}`}>
              <MomentumRegimeWidget 
                regimeData={tradingStats.momentumRegime || undefined}
                loading={isLoading}
              />
            </div>

            {/* Stop-Loss Effectiveness (T366) */}
            <div className={`mt-4 ${collapsedSections.analytics ? 'hidden md:block' : ''}`}>
              <StopLossEffectivenessWidget 
                data={tradingStats.stopLossStats || undefined}
                loading={isLoading}
              />
            </div>

            {/* Time-of-Day Trading Heatmap (T411) */}
            <div className={`mt-4 ${collapsedSections.analytics ? 'hidden md:block' : ''}`}>
              <TimeOfDayHeatmap 
                heatmapData={tradingStats.hourDayHeatmap || undefined}
                loading={isLoading}
              />
            </div>

            {/* Position Expiry Heatmap (T830) */}
            <div className={`mt-4 ${collapsedSections.analytics ? 'hidden md:block' : ''}`}>
              <PositionExpiryHeatmap 
                positions={kalshiStatus?.positions}
                loading={isLoading}
              />
            </div>

            {/* Streak Position Analysis (T387) */}
            <div className={`mt-4 ${collapsedSections.analytics ? 'hidden md:block' : ''}`}>
              <StreakPositionWidget 
                data={tradingStats.streakPosition || undefined}
                loading={isLoading}
              />
            </div>

            {/* Recent Trades */}
            {tradingStats.recentTrades && tradingStats.recentTrades.length > 0 && (
              <div className="mt-4">
                <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
                  Recent Trades
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {tradingStats.recentTrades.slice(0, 6).map((trade, i) => (
                    <div 
                      key={i}
                      className={`flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] ${
                        trade.result_status === 'won' ? 'border-l-2 border-l-emerald-500' :
                        trade.result_status === 'lost' ? 'border-l-2 border-l-red-500' :
                        'border-l-2 border-l-gray-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          trade.result_status === 'won' ? 'bg-emerald-400' :
                          trade.result_status === 'lost' ? 'bg-red-400' :
                          'bg-gray-400 animate-pulse'
                        }`} />
                        <div>
                          <p className="text-sm font-mono text-gray-300">
                            {trade.side.toUpperCase()} {trade.contracts}x @ {trade.price_cents}¢
                          </p>
                          <p className="text-xs text-gray-600">
                            {trade.ticker.replace('KXBTCD-', '').slice(0, 15)}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        trade.result_status === 'won' ? 'bg-emerald-500/20 text-emerald-400' :
                        trade.result_status === 'lost' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {trade.result_status || 'pending'}
                      </span>
                    </div>
                  ))}
                </div>
                <a 
                  href="/trading/history"
                  className="mt-3 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors text-gray-400 hover:text-gray-300 text-sm"
                >
                  <span>View All Trades</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Positions */}
          <div className="space-y-6">
            {/* Kalshi Section */}
            <GlassCard glowColor="cyan" className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Kalshi Positions</h2>
                    <p className="text-xs text-gray-500">{positionsCount} active</p>
                  </div>
                </div>
                <a 
                  href="https://kalshi.com/portfolio" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                </a>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {kalshiStatus?.positions && kalshiStatus.positions.length > 0 ? (
                  kalshiStatus.positions.map((pos, i) => {
                    const contracts = Math.abs(pos.position);
                    const perContractCost = contracts > 0 ? Math.abs(pos.exposure) / contracts : 0;
                    const isYes = pos.position > 0;
                    const assetType = pos.ticker.includes('KXETHD') ? 'ETH' : 'BTC';
                    
                    // Calculate risk % of portfolio
                    const portfolioTotal = (kalshiStatus?.portfolioValue || 0) + (kalshiStatus?.cash || 0);
                    const riskPercent = portfolioTotal > 0 ? (Math.abs(pos.exposure) / portfolioTotal) * 100 : 0;
                    const riskColor = riskPercent < 10 ? 'emerald' : riskPercent < 25 ? 'yellow' : 'red';
                    
                    // Calculate time to expiry (T743)
                    const expiryInfo = getPositionExpiryInfo(pos.ticker);
                    
                    return (
                      <div 
                        key={i}
                        className="group flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] hover:border-cyan-500/30 transition-all duration-300"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex flex-col items-center gap-0.5">
                            <div className={`w-2 h-2 rounded-full ${isYes ? 'bg-emerald-400' : 'bg-red-400'} shadow-lg`} />
                            <span className="text-[9px] font-bold text-gray-600">{assetType}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-mono text-gray-300 truncate group-hover:text-white transition-colors">
                                {pos.ticker.replace('KXBTCD-', '').replace('KXETHD-', '')}
                              </p>
                              {/* Expiry indicator (T743) */}
                              {expiryInfo.color !== 'gray' && (
                                <span 
                                  className={`flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap
                                    ${expiryInfo.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : ''}
                                    ${expiryInfo.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : ''}
                                    ${expiryInfo.color === 'red' ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' : ''}
                                  `}
                                  title={`Expires in ${expiryInfo.timeStr} (${expiryInfo.label})`}
                                >
                                  <Clock className="w-2.5 h-2.5" />
                                  {expiryInfo.timeStr}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <span className={`font-semibold ${isYes ? 'text-emerald-500/70' : 'text-red-500/70'}`}>
                                {isYes ? 'YES' : 'NO'}
                              </span>
                              <span>×{contracts}</span>
                              <span className="text-gray-700">@</span>
                              <span className="text-gray-500">{perContractCost.toFixed(0)}¢</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4 flex flex-col items-end gap-0.5">
                          <div className="flex items-center gap-2">
                            <p className={`font-mono font-bold ${pos.exposure >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              ${Math.abs(pos.exposure).toFixed(2)}
                            </p>
                            {/* Risk indicator */}
                            <span 
                              className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold
                                ${riskColor === 'emerald' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : ''}
                                ${riskColor === 'yellow' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : ''}
                                ${riskColor === 'red' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : ''}
                              `}
                              title={`${riskPercent.toFixed(1)}% of portfolio`}
                            >
                              {riskPercent.toFixed(0)}%
                            </span>
                          </div>
                          {pos.pnl !== undefined && pos.pnl !== 0 && (
                            <p className={`text-xs font-mono ${pos.pnl >= 0 ? 'text-emerald-500/80' : 'text-red-500/80'}`}>
                              {pos.pnl >= 0 ? '+' : ''}${Math.abs(pos.pnl).toFixed(2)}
                              {pos.exposure > 0 && (
                                <span className="ml-1 opacity-70">
                                  ({pos.pnl >= 0 ? '+' : ''}{((pos.pnl / pos.exposure) * 100).toFixed(1)}%)
                                </span>
                              )}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-700">
                            max win: ${((100 - perContractCost) * contracts / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Activity className="w-8 h-8 mb-3 opacity-50" />
                    <p>{isLoading ? 'Loading positions...' : 'No open positions'}</p>
                  </div>
                )}
              </div>

              {kalshiStatus?.error && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                  <p className="text-red-400 text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    {kalshiStatus.error}
                  </p>
                </div>
              )}
            </GlassCard>

            {/* Polymarket Section */}
            <GlassCard glowColor="purple" className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
                  <div className="w-5 h-5 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Polymarket</h2>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                      iPhone Mirror
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Cpu className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Stats via iPhone mirroring only</p>
                <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1">(No browser access per TOOLS.md rules)</p>
              </div>
            </GlassCard>
          </div>

          {/* Right Column - Inbox */}
          <div className="space-y-6">
            <GlassCard glowColor="green" className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-green-500/30 flex items-center justify-center">
                  <Send className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Clawdinho Inbox</h2>
                  <p className="text-xs text-gray-500">Drop messages, links, commands</p>
                </div>
              </div>

              {/* Input Box */}
              <div className="relative mb-6">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type a message or paste a link... (press / to focus)"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:shadow-[0_0_30px_rgba(0,255,136,0.1)] transition-all duration-300"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 pointer-events-none opacity-0 focus-within:opacity-100 transition-opacity" />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={isSending || !inputMessage.trim()}
                    className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 font-medium transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,255,136,0.3)] hover:scale-105 disabled:opacity-30 disabled:hover:scale-100 disabled:hover:shadow-none"
                  >
                    {isSending ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-gray-600 text-xs mt-2 font-mono">
                  → agents/betting/inbox.json
                </p>
              </div>

              {/* Messages List */}
              <div>
                <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
                  Recent Messages
                </h3>
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {inbox?.messages && inbox.messages.length > 0 ? (
                    inbox.messages.map((msg) => (
                      <div 
                        key={msg.id}
                        className={`group flex items-start gap-3 p-3 rounded-xl transition-all duration-300 ${
                          msg.processed 
                            ? 'bg-white/[0.02] opacity-50' 
                            : 'bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] hover:border-emerald-500/30'
                        }`}
                      >
                        <div className="mt-0.5">{getMessageIcon(msg.type)}</div>
                        <div className="flex-1 min-w-0">
                          {msg.type === 'link' ? (
                            <a 
                              href={msg.content}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-cyan-400 hover:text-cyan-300 break-all transition-colors"
                            >
                              {msg.content}
                            </a>
                          ) : (
                            <p className="text-sm text-gray-300 break-words">{msg.content}</p>
                          )}
                          <p className="text-xs text-gray-600 mt-1 font-mono">
                            {new Date(msg?.timestamp || 0).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteMessage(msg.id)}
                          className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                      <MessageSquare className="w-8 h-8 mb-3 opacity-30" />
                      <p className="text-sm">No messages yet</p>
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 text-xs font-mono">
            AUTO-REFRESH 30s • BUILT FOR ONDE.SURF • v2.0 • Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-500">?</kbd> for shortcuts
          </p>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal 
        isOpen={showShortcuts} 
        onClose={() => setShowShortcuts(false)} 
      />
    </div>
  );
}

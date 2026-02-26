'use client';

import { useState, useEffect, useRef } from 'react';
import {
    TrendingUp, TrendingDown, DollarSign, Activity, AlertTriangle,
    CheckCircle, Clock, Zap, Target, Cpu, Server, XCircle, ChevronRight
} from 'lucide-react';

export default function AutoTraderDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/trading/status');
            if (!res.ok) throw new Error('Failed to fetch trading status');
            const json = await res.json();
            setData(json);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // 5 seconds polling
        return () => clearInterval(interval);
    }, []);

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-400">
                <Activity className="w-6 h-6 animate-pulse mr-3" />
                <span>Initializing Kalshi Neural Link...</span>
            </div>
        );
    }

    const { metrics = {}, trades = [], cycleSeries = [], paperState = {}, watchdogStatus = {} } = data || {};

    // Safe extraction of nested structures
    const paperStateData = paperState?.paperState || paperState;
    const wd = watchdogStatus?.watchdogStatus || watchdogStatus;

    const startingBalance = paperState?.starting_balance_cents ? paperState.starting_balance_cents / 100 : 100;
    const currentBalance = metrics?.current_balance_usd ?? (paperState?.current_balance_cents ? paperState.current_balance_cents / 100 : 0);
    const roiPct = metrics?.roi_pct ?? 0;
    const isUp = roiPct >= 0;

    const positions = paperState?.positions || [];

    // Create a minimal SVG line chart for Bankroll
    let bankrollPoints = "";
    if (cycleSeries && cycleSeries.length) {
        // Reverse because cycleSeries came newest-first, we want oldest-to-newest for LTR
        const sorted = [...cycleSeries].reverse();
        const minB = Math.min(...sorted.map(c => c.b));
        const maxB = Math.max(...sorted.map(c => c.b));
        const range = (maxB - minB) || 1;
        bankrollPoints = sorted.map((c, i) => {
            const x = (i / (sorted.length - 1)) * 300;
            const y = 100 - ((c.b - minB) / range) * 100;
            return `${x},${y}`;
        }).join(" ");
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-mono relative overflow-hidden">
            {/* Background ambient glow */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10 space-y-6">

                {/* HEADER */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                            <Zap className="w-6 h-6 text-white absolute animate-pulse opacity-50" />
                            <Zap className="w-6 h-6 text-white relative z-10" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                                KALSHI NEURAL TRADER
                                {wd?.trader?.running ? (
                                    <span className="flex items-center text-xs font-semibold px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-1.5" />
                                        LIVE
                                    </span>
                                ) : (
                                    <span className="flex items-center text-xs font-semibold px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full">
                                        <XCircle className="w-3 h-3 mr-1" />
                                        OFFLINE
                                    </span>
                                )}
                            </h1>
                            <p className="text-slate-400 text-sm mt-1">Autonomous predictive trading subsystem</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                        <div className="flex flex-col items-end">
                            <span className="text-slate-500">Status</span>
                            <span className={wd?.status === 'DEGRADED' ? 'text-amber-400 font-bold flex items-center gap-1' : 'text-emerald-400 font-bold flex items-center gap-1'}>
                                {wd?.status === 'DEGRADED' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                {wd?.status || 'SYSTEM NOMINAL'}
                            </span>
                        </div>
                        <div className="flex flex-col items-end hidden sm:flex">
                            <span className="text-slate-500">Last Pulse</span>
                            <span className="text-slate-300 tabular-nums">
                                {new Date().toLocaleTimeString('en-US', { hour12: false })}
                            </span>
                        </div>
                    </div>
                </header>

                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold">Telemetry Interruption</p>
                            <p className="text-sm opacity-80">{error}</p>
                        </div>
                    </div>
                )}

                {/* ALERTS SECTION */}
                {wd?.status === 'DEGRADED' && wd?.claude_analysis && (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 p-5 rounded-xl text-sm">
                        <h3 className="font-bold flex items-center gap-2 mb-2 text-amber-400">
                            <AlertTriangle className="w-5 h-5" /> Subsystem Warning
                        </h3>
                        <div className="whitespace-pre-wrap opacity-90 leading-relaxed max-h-48 overflow-y-auto pr-4 custom-scrollbar">
                            {wd.claude_analysis}
                        </div>
                    </div>
                )}

                {/* TOP METRICS GRID */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl relative group overflow-hidden hover:border-cyan-500/30 transition-colors">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <DollarSign className="w-24 h-24" />
                        </div>
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Bankroll</p>
                        <div className={`text-3xl font-bold tracking-tight ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ${currentBalance.toFixed(2)}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-sm">
                            <span className={isUp ? 'text-emerald-500' : 'text-rose-500'}>
                                {isUp ? '+' : ''}{roiPct.toFixed(1)}%
                            </span>
                            <span className="text-slate-600">|</span>
                            <span className="text-slate-400">Start ${startingBalance.toFixed(0)}</span>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl relative group hover:border-blue-500/30 transition-colors">
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Global Win Rate</p>
                        <div className="text-3xl font-bold tracking-tight text-white">
                            {metrics?.win_rate || 0}%
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-sm text-slate-400">
                            <Target className="w-4 h-4 text-slate-500" />
                            <span>{metrics?.won || 0}W - {metrics?.lost || 0}L</span>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl relative group hover:border-emerald-500/30 transition-colors">
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">BUY_NO Edge</p>
                        <div className="text-3xl font-bold tracking-tight text-emerald-400">
                            {metrics?.no_win_rate || 0}%
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-sm text-slate-400">
                            <span>{metrics?.no_trades || 0} Trades Executed</span>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl relative group hover:border-rose-500/30 transition-colors">
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">BUY_YES Edge</p>
                        <div className="text-3xl font-bold tracking-tight text-amber-500">
                            {metrics?.yes_win_rate || 0}%
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-sm text-slate-400">
                            <span>{metrics?.yes_trades || 0} Trades Executed</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* EQUITY CURVE & CORE STATS */}
                    <div className="col-span-1 lg:col-span-2 space-y-6">

                        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-cyan-400" />
                                    Equity Curve
                                </h2>
                                <div className="text-xs text-slate-500 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-cyan-500/20 border border-cyan-500/50 block" /> Bankroll
                                </div>
                            </div>

                            <div className="h-48 w-full relative group">
                                {/* SVG Graph rendering from cycle limits */}
                                {bankrollPoints ? (
                                    <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                                        <defs>
                                            <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="rgb(6,182,212)" stopOpacity="0.4" />
                                                <stop offset="100%" stopColor="rgb(6,182,212)" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        <path
                                            d={`M 0,100 L ${bankrollPoints} L 300,100 Z`}
                                            fill="url(#eqGrad)"
                                        />
                                        <polyline
                                            points={bankrollPoints}
                                            fill="none"
                                            stroke="rgb(6,182,212)"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="group-hover:stroke-cyan-400 transition-colors"
                                        />
                                    </svg>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-slate-600 border border-dashed border-slate-700/50 rounded-lg">
                                        Insufficient Cycle Data
                                    </div>
                                )}
                                {/* Graph overlay lines */}
                                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
                                    {[0, 1, 2, 3].map(i => (
                                        <div key={i} className="w-full h-px bg-slate-800/50" />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* OPEN POSITIONS */}
                        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                                <Server className="w-5 h-5 text-purple-400" />
                                Active Directives ({positions.length})
                            </h2>
                            <div className="overflow-x-auto">
                                {positions.length === 0 ? (
                                    <div className="py-8 text-center text-slate-500 text-sm italic">
                                        No active positions in the market. Computing next move...
                                    </div>
                                ) : (
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 uppercase bg-slate-900/80 border-b border-slate-800">
                                            <tr>
                                                <th className="px-4 py-3 font-medium">Market Ticker</th>
                                                <th className="px-4 py-3 font-medium">Direction</th>
                                                <th className="px-4 py-3 font-medium text-right">Cost</th>
                                                <th className="px-4 py-3 font-medium text-right">Edge Est.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50">
                                            {positions.map((p: any, i: number) => (
                                                <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                                                    <td className="px-4 py-3 text-slate-300 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]" title={p.ticker}>
                                                        {p.ticker.split('-').slice(0, 2).join('-')}..
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${p.action === 'BUY_YES' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                                            {p.action}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                                                        ${(p.cost_cents / 100).toFixed(2)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums">
                                                        {p.edge ? (
                                                            <span className={p.edge > 0.02 ? 'text-emerald-400' : 'text-amber-400'}>
                                                                {(p.edge * 100).toFixed(1)}%
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* RIGHT SIDEBAR (TRADE FEED) */}
                    <div className="col-span-1 space-y-6">
                        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl h-full flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-indigo-400" />
                                    Chronicle Log
                                </h2>
                                <span className="text-xs text-slate-500">{trades.length} cached</span>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                                {trades.map((t: any, i: number) => {
                                    const isWin = t.status === 'won';
                                    const isLost = t.status === 'lost';

                                    return (
                                        <div key={i} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors group">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                                                    {t.action === 'BUY_YES' ?
                                                        <span className="text-emerald-500">YES</span> :
                                                        <span className="text-rose-500">NO</span>
                                                    }
                                                    <ChevronRight className="w-3 h-3 text-slate-600" />
                                                    <span className="truncate max-w-[120px]">{t.ticker.split('-')[0]}</span>
                                                </div>

                                                {isWin && <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">WON</span>}
                                                {isLost && <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400">LOST</span>}
                                                {!isWin && !isLost && <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">PENDING</span>}
                                            </div>

                                            <div className="flex justify-between items-end mt-3">
                                                <div className="text-xs text-slate-500">
                                                    {new Date(t.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                    <span className="mx-1">•</span>
                                                    {t.contracts} ct
                                                </div>
                                                <div className="text-right">
                                                    <div className={`font-mono text-sm font-bold ${isWin ? 'text-emerald-400' : isLost ? 'text-rose-400' : 'text-slate-300'}`}>
                                                        {t.pnl_usd !== null ? `${t.pnl_usd >= 0 ? '+' : '-'}$${Math.abs(t.pnl_usd).toFixed(2)}` : `$${t.cost_usd.toFixed(2)}`}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(51, 65, 85, 0.8);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(71, 85, 105, 1);
        }
      `}</style>
        </div>
    );
}

import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { spawnSync } from 'child_process';

const SSD_PATH = '/Volumes/DATI-SSD/kalshi-logs';
const PYTHON = '/opt/homebrew/bin/python3.11';

export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET() {
    try {
        // ── 1. Read paper-trade-state.json (updated every 5 min by trader) ────
        let paperState: any = null;
        try {
            const raw = await fs.readFile(`${SSD_PATH}/paper-trade-state.json`, 'utf-8');
            paperState = JSON.parse(raw);
        } catch (e) {
            console.warn('[trading/status] Could not read paper-trade-state.json:', e);
        }

        // ── 2. Read watchdog-last.json (updated every 30 min by watchdog) ─────
        let watchdogStatus: any = null;
        try {
            const raw = await fs.readFile(`${SSD_PATH}/watchdog-last.json`, 'utf-8');
            watchdogStatus = JSON.parse(raw);
        } catch (e) {
            console.warn('[trading/status] Could not read watchdog-last.json:', e);
        }

        // ── 3. Build normalized metrics ───────────────────────────────────────
        const ps = paperState || {};
        const stats = ps.stats || {};
        const dbInfo = watchdogStatus?.db || {};

        const currentCents = ps.current_balance_cents || 0;
        const startingCents = ps.starting_balance_cents || 10000;

        const settledCount = dbInfo.settled || ((stats.wins || 0) + (stats.losses || 0));
        const wonCount = dbInfo.won ?? stats.wins ?? Math.round(((dbInfo.win_rate || 0) / 100) * settledCount);

        const metrics = {
            // Balance
            current_balance_usd: currentCents / 100,
            starting_balance_usd: startingCents / 100,
            paper_roi_pct: startingCents
                ? ((currentCents - startingCents) / startingCents * 100)
                : 0,

            // Trade stats from watchdog DB (settled trades, most accurate)
            total_trades: dbInfo.total_trades || stats.total_trades || 0,
            settled: settledCount,
            won: wonCount,
            lost: dbInfo.lost ?? stats.losses ?? (settledCount - wonCount),
            pending: dbInfo.pending || stats.pending || 0,
            win_rate: dbInfo.win_rate || (stats.win_rate ? stats.win_rate * 100 : 0),
            roi_pct: dbInfo.roi_pct || 0,
            net_pnl_cents: dbInfo.net_pnl_cents || stats.pnl_cents || 0,
            net_pnl_usd: (dbInfo.net_pnl_cents || stats.pnl_cents || 0) / 100,

            // Paper-specific risk metrics
            max_drawdown_pct: stats.max_drawdown_pct || 0,
            peak_balance_cents: stats.peak_balance_cents || startingCents,
            peak_balance_usd: (stats.peak_balance_cents || startingCents) / 100,

            // Trader process status
            trader_running: watchdogStatus?.trader?.running || false,
            trader_pid: watchdogStatus?.trader?.pid || null,
            last_cycle: dbInfo.last_cycle || null,
            last_trade: dbInfo.last_trade || null,
            recent_cycles_2h: dbInfo.recent_cycles_2h || 0,
        };

        // ── 4. Trades from paper trade_history (last 200, updated every cycle) ─
        const trades = (ps.trade_history || []).slice(0, 50);

        // ── 5. CycleSeries from SQLite via Python (no extra npm deps) ──────────
        let cycleSeries: any[] = [];
        try {
            const pyScript = [
                'import sqlite3, json',
                `conn = sqlite3.connect("${SSD_PATH}/trades.db")`,
                'conn.row_factory = sqlite3.Row',
                'rows = conn.execute(',
                '  "SELECT timestamp, balance_cents, trades_placed, markets_scanned, duration_ms"',
                '  " FROM cycles WHERE balance_cents IS NOT NULL"',
                '  " ORDER BY timestamp DESC LIMIT 500"',
                ').fetchall()',
                'data = [',
                '  {"t": r["timestamp"][:19].replace("T"," "),',
                '   "b": round(r["balance_cents"]/100, 2),',
                '   "tp": r["trades_placed"] or 0,',
                '   "ms": r["markets_scanned"] or 0,',
                '   "dur": r["duration_ms"] or 0}',
                '  for r in reversed(rows)',
                ']',
                'print(json.dumps(data))',
            ].join('\n');

            const result = spawnSync(PYTHON, ['-'], {
                input: pyScript,
                timeout: 8000,
                encoding: 'utf-8',
            });

            if (result.status === 0 && result.stdout?.trim()) {
                cycleSeries = JSON.parse(result.stdout.trim());
            } else if (result.stderr) {
                console.warn('[trading/status] cycleSeries python error:', result.stderr.slice(0, 200));
            }
        } catch (e) {
            console.warn('[trading/status] Could not get cycleSeries from SQLite:', e);
        }

        return NextResponse.json({
            metrics,
            trades,
            cycleSeries,
            paperState: ps,
            watchdogStatus,
            timestamp: new Date().toISOString(),
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

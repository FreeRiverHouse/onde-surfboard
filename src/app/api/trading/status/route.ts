import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { spawnSync } from 'child_process';

const SSD_PATH = '/Volumes/DATI-SSD/kalshi-logs';
const PYTHON = '/opt/homebrew/bin/python3.11';

export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET() {
    try {
        // ── 1. Read paper-trade-state.json (balance, positions, trade_history) ──
        let paperState: any = null;
        try {
            const raw = await fs.readFile(`${SSD_PATH}/paper-trade-state.json`, 'utf-8');
            paperState = JSON.parse(raw);
        } catch (e) {
            console.warn('[trading/status] Could not read paper-trade-state.json:', e);
        }

        // ── 2. Read watchdog-last.json (process status + AI analysis only) ─────
        let watchdogStatus: any = null;
        try {
            const raw = await fs.readFile(`${SSD_PATH}/watchdog-last.json`, 'utf-8');
            watchdogStatus = JSON.parse(raw);
        } catch (e) {
            console.warn('[trading/status] Could not read watchdog-last.json:', e);
        }

        const ps = paperState || {};
        const stats = ps.stats || {};

        const currentCents = ps.current_balance_cents || 0;
        const startingCents = ps.starting_balance_cents || 10000;

        // ── 3. ALL trade+cycle metrics directly from SQLite (authoritative) ─────
        let dbLive: any = {};
        let cycleSeries: any[] = [];
        try {
            const pyScript = `
import sqlite3, json, subprocess, datetime
from pathlib import Path

DB = "${SSD_PATH}/trades.db"
now_utc = datetime.datetime.now(datetime.timezone.utc)
cutoff_2h = (now_utc - datetime.timedelta(hours=2)).isoformat()

conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row

# ── Trade stats ──────────────────────────────────────────────────────────
row = conn.execute("""
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN result_status='won'  THEN 1 ELSE 0 END) as won,
    SUM(CASE WHEN result_status='lost' THEN 1 ELSE 0 END) as lost,
    SUM(CASE WHEN result_status='pending' THEN 1 ELSE 0 END) as pending,
    SUM(CASE WHEN result_status IN ('won','lost') THEN 1 ELSE 0 END) as settled,
    ROUND(
      SUM(CASE WHEN result_status='won' THEN 1.0 ELSE 0 END) /
      NULLIF(SUM(CASE WHEN result_status IN ('won','lost') THEN 1 ELSE 0 END),0) * 100, 1
    ) as win_rate,
    COALESCE(SUM(CASE WHEN result_status IN ('won','lost') THEN pnl_cents ELSE 0 END),0) as net_pnl,
    COALESCE(SUM(CASE WHEN result_status IN ('won','lost') THEN cost_cents ELSE 0 END),0) as total_cost
  FROM trades
""").fetchone()

total_trades = row['total'] or 0
won          = row['won']  or 0
lost         = row['lost'] or 0
pending      = row['pending'] or 0
settled      = row['settled'] or 0
win_rate     = row['win_rate'] or 0.0
net_pnl      = row['net_pnl'] or 0
total_cost   = row['total_cost'] or 0
roi_pct      = round(net_pnl / total_cost * 100, 2) if total_cost else 0.0

# ── Last trade ───────────────────────────────────────────────────────────
lr = conn.execute("SELECT timestamp FROM trades ORDER BY id DESC LIMIT 1").fetchone()
last_trade = lr['timestamp'] if lr else None

# ── Cycle stats ──────────────────────────────────────────────────────────
cr = conn.execute("SELECT timestamp FROM cycles ORDER BY id DESC LIMIT 1").fetchone()
last_cycle = cr['timestamp'] if cr else None

recent_2h = conn.execute(
  "SELECT COUNT(*) FROM cycles WHERE timestamp > ?", (cutoff_2h,)
).fetchone()[0]

# ── Cycle series (last 500, reversed chronological → ascending) ──────────
rows = conn.execute("""
  SELECT timestamp, balance_cents, trades_placed, markets_scanned, duration_ms
  FROM cycles
  WHERE balance_cents IS NOT NULL
  ORDER BY timestamp DESC LIMIT 500
""").fetchall()
cycle_data = [
  {"t": r["timestamp"][:19].replace("T"," "),
   "b": round(r["balance_cents"]/100, 2),
   "tp": r["trades_placed"] or 0,
   "ms": r["markets_scanned"] or 0,
   "dur": r["duration_ms"] or 0}
  for r in reversed(rows)
]

# ── Trader process via pgrep ─────────────────────────────────────────────
pg = subprocess.run(["pgrep", "-f", "kalshi-autotrader.py"],
                    capture_output=True, text=True)
pids = [p for p in pg.stdout.strip().split() if p.isdigit()]
trader_running = bool(pids)
trader_pid = int(pids[0]) if pids else None

conn.close()

out = {
  "total_trades": total_trades,
  "won": won, "lost": lost, "pending": pending, "settled": settled,
  "win_rate": win_rate,
  "net_pnl_cents": net_pnl,
  "roi_pct": roi_pct,
  "last_trade": last_trade,
  "last_cycle": last_cycle,
  "recent_cycles_2h": recent_2h,
  "trader_running": trader_running,
  "trader_pid": trader_pid,
  "cycle_series": cycle_data,
}
print(json.dumps(out))
`;

            const result = spawnSync(PYTHON, ['-c', pyScript], {
                timeout: 10000,
                encoding: 'utf-8',
            });

            if (result.status === 0 && result.stdout?.trim()) {
                const parsed = JSON.parse(result.stdout.trim());
                cycleSeries = parsed.cycle_series || [];
                delete parsed.cycle_series;
                dbLive = parsed;
            } else if (result.stderr) {
                console.warn('[trading/status] SQLite python error:', result.stderr.slice(0, 400));
            }
        } catch (e) {
            console.warn('[trading/status] Could not query SQLite:', e);
        }

        // ── 4. Build metrics (SQLite is source of truth for trades/cycles) ──────
        const metrics = {
            // Balance — from paper-trade-state.json (updated every cycle)
            current_balance_usd: currentCents / 100,
            starting_balance_usd: startingCents / 100,
            paper_roi_pct: startingCents
                ? ((currentCents - startingCents) / startingCents * 100)
                : 0,

            // Trade stats — LIVE from SQLite
            total_trades:   dbLive.total_trades ?? (stats.total_trades || 0),
            settled:        dbLive.settled       ?? 0,
            won:            dbLive.won           ?? 0,
            lost:           dbLive.lost          ?? 0,
            pending:        dbLive.pending       ?? (stats.pending || 0),
            win_rate:       dbLive.win_rate      ?? 0,
            roi_pct:        dbLive.roi_pct       ?? 0,
            net_pnl_cents:  dbLive.net_pnl_cents ?? 0,
            net_pnl_usd:    (dbLive.net_pnl_cents ?? 0) / 100,

            // Risk metrics — from paper-trade-state.json stats
            max_drawdown_pct:   stats.max_drawdown_pct  || 0,
            peak_balance_cents: stats.peak_balance_cents || startingCents,
            peak_balance_usd:   (stats.peak_balance_cents || startingCents) / 100,

            // Cycle/process status — LIVE from SQLite + pgrep
            trader_running:    dbLive.trader_running ?? (watchdogStatus?.trader?.running || false),
            trader_pid:        dbLive.trader_pid     ?? (watchdogStatus?.trader?.pid || null),
            last_cycle:        dbLive.last_cycle     ?? null,
            last_trade:        dbLive.last_trade     ?? null,
            recent_cycles_2h:  dbLive.recent_cycles_2h ?? 0,
        };

        // ── 5. Trades from paper trade_history (last 50) ─────────────────────
        const trades = (ps.trade_history || []).slice(0, 50);

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

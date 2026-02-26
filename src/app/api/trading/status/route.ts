import { NextResponse } from 'next/server';
import fs from 'fs/promises';

const SSD_PATH = '/Volumes/DATI-SSD/kalshi-logs';
const PYTHON_DASHBOARD_API = 'http://127.0.0.1:8887';

export async function GET() {
    try {
        // 1. Fetch Python Dashboard metrics
        let metrics: any = {};
        let trades: any = [];
        let cycleSeries: any = [];

        try {
            const [mRes, tRes, cRes] = await Promise.all([
                fetch(`${PYTHON_DASHBOARD_API}/api/metrics`, { next: { revalidate: 0 } }),
                fetch(`${PYTHON_DASHBOARD_API}/api/trades`, { next: { revalidate: 0 } }),
                fetch(`${PYTHON_DASHBOARD_API}/api/cycle_series`, { next: { revalidate: 0 } })
            ]);
            if (mRes.ok) metrics = await mRes.json();
            if (tRes.ok) trades = await tRes.json();
            if (cRes.ok) cycleSeries = await cRes.json();
        } catch (e) {
            console.error('Failed to fetch from python dashboard api', e);
        }

        // 2. Read local SSD JSON files
        let paperState: any = null;
        let watchdogStatus: any = null;

        try {
            const paperRaw = await fs.readFile(`${SSD_PATH}/paper-trade-state.json`, 'utf-8');
            if (paperRaw) paperState = JSON.parse(paperRaw);
        } catch (e) {
            console.warn('Could not read paper-trade-state.json');
        }

        try {
            const watchdogRaw = await fs.readFile(`${SSD_PATH}/watchdog-last.json`, 'utf-8');
            if (watchdogRaw) watchdogStatus = JSON.parse(watchdogRaw);
        } catch (e) {
            console.warn('Could not read watchdog-last.json');
        }

        return NextResponse.json({
            metrics,
            trades: trades.slice(0, 50), // Last 50 trades
            cycleSeries,
            paperState,
            watchdogStatus,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';

export const runtime = 'edge'

// Agent status gist - same pattern as trading stats
const AGENT_GIST_ID = "12a07b9ed63e19f01d2693b69f8a0e3b";
const GIST_FILENAME = "onde-agent-status.json";
const GIST_URL = `https://gist.githubusercontent.com/raw/${AGENT_GIST_ID}/${GIST_FILENAME}`;

// Fallback gist URL pattern (with username)
const GIST_URL_ALT = `https://gist.githubusercontent.com/ondeclawd/${AGENT_GIST_ID}/raw/${GIST_FILENAME}`;

interface TaskStats {
  total: number;
  done: number;
  in_progress: number;
  todo: number;
  completion_rate: number;
}

interface MemoryStats {
  entries_today: number;
  file_exists: boolean;
  size_bytes: number;
  file_path?: string;
}

interface GitCommit {
  hash: string;
  message: string;
  date: string;
  ago: string;
}

interface GitActivity {
  clawdinho: GitCommit | null;
  ondinho: GitCommit | null;
  total_commits_today: number;
}

interface AutotraderStatus {
  running: boolean;
  pid: string | null;
  circuit_breaker: boolean;
  consecutive_losses: number;
  last_trade: string | null;
  uptime_hours: number | null;
}

interface GpuStatus {
  radeon_connected: boolean;
  type: string | null;
  vram_gb: number | null;
}

interface OllamaStatus {
  running: boolean;
  location: 'local' | 'remote' | null;
  models: string[];
}

interface CurrentTask {
  id: string;
  title: string;
  started?: string;
}

interface AgentInfo {
  host: string;
  model: string;
  status: 'active' | 'idle' | 'offline';
  current_task?: CurrentTask | null;
}

interface AgentStatusResponse {
  timestamp: string;
  tasks: TaskStats;
  memory: MemoryStats;
  git: GitActivity;
  autotrader: AutotraderStatus;
  gpu: GpuStatus;
  ollama: OllamaStatus;
  alerts_pending: number;
  agents: {
    clawdinho: AgentInfo;
    ondinho: AgentInfo;
  };
}

async function fetchAgentStatus(): Promise<AgentStatusResponse | null> {
  const urls = [GIST_URL, GIST_URL_ALT];
  
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        next: { revalidate: 60 } // Cache for 60 seconds
      });
      
      if (response.ok) {
        const data = await response.json();
        return data as AgentStatusResponse;
      }
    } catch (e) {
      console.error(`Failed to fetch from ${url}:`, e);
      continue;
    }
  }
  
  return null;
}

export async function GET() {
  const data = await fetchAgentStatus();
  
  if (!data) {
    // Return demo/fallback data
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      tasks: { total: 0, done: 0, in_progress: 0, todo: 0, completion_rate: 0 },
      memory: { entries_today: 0, file_exists: false, size_bytes: 0 },
      git: { clawdinho: null, ondinho: null, total_commits_today: 0 },
      autotrader: { running: false, pid: null, circuit_breaker: false, consecutive_losses: 0, last_trade: null, uptime_hours: null },
      gpu: { radeon_connected: false, type: null, vram_gb: null },
      ollama: { running: false, location: null, models: [] },
      alerts_pending: 0,
      agents: {
        clawdinho: { host: 'FRH-M1-PRO', model: 'claude-opus-4-5', status: 'offline' as const },
        ondinho: { host: 'M4-Pro', model: 'claude-sonnet-4', status: 'offline' as const }
      },
      _note: 'Gist data unavailable - showing fallback'
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache',
        'X-Data-Source': 'fallback'
      }
    });
  }
  
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
      'X-Data-Source': 'gist',
      'X-Last-Update': data.timestamp
    }
  });
}

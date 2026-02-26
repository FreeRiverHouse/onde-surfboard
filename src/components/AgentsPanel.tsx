'use client';

import { useEffect, useState } from 'react';

interface AgentInfo {
  id: string;
  status: 'running' | 'completed' | 'error';
  description: string;
  startTime: string;
  lastActivity: string;
  tokensUsed: number;
  toolsUsed: number;
}

interface AgentsResponse {
  agents: AgentInfo[];
  timestamp: string;
  activeCount: number;
  error?: string;
}

export function AgentsPanel() {
  const [data, setData] = useState<AgentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const formatTime = (iso: string) => {
    if (!iso) return '-';
    const date = new Date(iso);
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (start: string, end: string) => {
    if (!start || !end) return '-';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return '🔄';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '⏸️';
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-700 rounded w-1/3"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  const runningAgents = data?.agents.filter(a => a.status === 'running') || [];
  const recentAgents = data?.agents.filter(a => a.status !== 'running').slice(0, 5) || [];

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🤖</span>
          <h2 className="text-lg font-semibold text-white">Claude Agents</h2>
          {runningAgents.length > 0 && (
            <span className="px-2 py-0.5 bg-green-600 text-green-100 text-xs rounded-full animate-pulse">
              {runningAgents.length} active
            </span>
          )}
        </div>
        <span className="text-gray-400">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Running Agents */}
          {runningAgents.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-green-400 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Running Now
              </h3>
              {runningAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-gray-800 rounded-lg p-3 border border-green-900"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span>{getStatusIcon(agent.status)}</span>
                        <span className="text-white font-medium text-sm capitalize">
                          {agent.description.slice(0, 50)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1 flex gap-4">
                        <span>Started: {formatTime(agent.startTime)}</span>
                        <span>Duration: {formatDuration(agent.startTime, agent.lastActivity)}</span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <div>{agent.tokensUsed.toLocaleString()} tokens</div>
                      <div>{agent.toolsUsed} tools</div>
                    </div>
                  </div>
                  {/* Progress bar simulation */}
                  <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full animate-pulse"
                      style={{ width: '60%' }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Completed */}
          {recentAgents.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400">Recent</h3>
              {recentAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-gray-800/50 rounded-lg p-2 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{getStatusIcon(agent.status)}</span>
                      <span className="text-gray-300 capitalize">
                        {agent.description.slice(0, 40)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTime(agent.lastActivity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {runningAgents.length === 0 && recentAgents.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No agents running
            </div>
          )}

          {/* Footer */}
          <div className="text-xs text-gray-600 text-right pt-2 border-t border-gray-800">
            Last update: {data?.timestamp ? formatTime(data.timestamp) : '-'}
          </div>
        </div>
      )}
    </div>
  );
}

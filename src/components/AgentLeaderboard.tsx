'use client';

import Image from 'next/image';
import { useState } from 'react';
import { formatXP, getLevelColor, getLevelTitle } from '../lib/gamification';

interface AgentForLeaderboard {
  id: string;
  name: string;
  xp: number;
  level: number;
  totalTasksDone: number;
  currentStreak: number;
  badges: string[];
  image: string;
  status: 'working' | 'idle' | 'sleeping';
}

interface AgentLeaderboardProps {
  agents: AgentForLeaderboard[];
  onSelectAgent?: (agentId: string) => void;
  compact?: boolean;
}

// CSV export function
function exportAgentsToCSV(agents: AgentForLeaderboard[]) {
  const sortedAgents = [...agents].sort((a, b) => b.xp - a.xp);
  
  // CSV headers
  const headers = ['Rank', 'Agent Name', 'Level', 'Level Title', 'XP', 'Tasks Done', 'Current Streak', 'Status', 'Badges'];
  
  // CSV rows
  const rows = sortedAgents.map((agent, index) => [
    index + 1,
    agent.name,
    agent.level,
    getLevelTitle(agent.level),
    agent.xp,
    agent.totalTasksDone,
    agent.currentStreak,
    agent.status,
    agent.badges.join('; ') || 'None',
  ]);
  
  // Build CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => 
      typeof cell === 'string' && (cell.includes(',') || cell.includes('"')) 
        ? `"${cell.replace(/"/g, '""')}"` 
        : cell
    ).join(','))
  ].join('\n');
  
  // Add summary footer
  const totalXP = sortedAgents.reduce((sum, a) => sum + a.xp, 0);
  const totalTasks = sortedAgents.reduce((sum, a) => sum + a.totalTasksDone, 0);
  const summary = `\n\nSummary,,,,,,,\nTotal Agents,${sortedAgents.length},,,,,,\nTotal XP,${totalXP},,,,,,\nTotal Tasks,${totalTasks},,,,,,\nExported,${new Date().toISOString()},,,,,,`;
  
  return csvContent + summary;
}

function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Rank medals for top 3
const RANK_MEDALS: Record<number, { emoji: string; color: string; bg: string }> = {
  1: { emoji: '🥇', color: '#FFD700', bg: 'bg-yellow-500/20' },
  2: { emoji: '🥈', color: '#C0C0C0', bg: 'bg-gray-400/20' },
  3: { emoji: '🥉', color: '#CD7F32', bg: 'bg-orange-500/20' },
};

export function AgentLeaderboard({ agents, onSelectAgent, compact = false }: AgentLeaderboardProps) {
  const [isExporting, setIsExporting] = useState(false);
  
  // Sort agents by XP (highest first)
  const sortedAgents = [...agents].sort((a, b) => b.xp - a.xp);

  const handleExport = () => {
    setIsExporting(true);
    try {
      const csvContent = exportAgentsToCSV(agents);
      const date = new Date().toISOString().split('T')[0];
      downloadCSV(csvContent, `agent-stats-${date}.csv`);
    } finally {
      setTimeout(() => setIsExporting(false), 500);
    }
  };

  if (sortedAgents.length === 0) {
    return (
      <div className="text-center py-8 text-white/40 text-sm">
        Nessun agente trovato
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header with export button */}
      {!compact && (
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex-1 flex items-center gap-4 text-[10px] text-white/40 uppercase tracking-wider">
            <span>Rank</span>
            <span className="flex-1">Agent</span>
            <span className="w-12 text-right">Level</span>
            <span className="w-14 text-right">XP</span>
          </div>
          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="ml-2 p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export to CSV"
          >
            {isExporting ? (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Leaderboard rows */}
      {sortedAgents.map((agent, index) => {
        const rank = index + 1;
        const medal = RANK_MEDALS[rank];
        const levelColor = getLevelColor(agent.level);

        return (
          <div
            key={agent.id}
            onClick={() => onSelectAgent?.(agent.id)}
            className={`
              flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer
              ${medal ? medal.bg : 'bg-white/5'}
              ${onSelectAgent ? 'hover:bg-white/10 hover:scale-[1.02]' : ''}
              ${agent.status === 'working' ? 'ring-1 ring-emerald-400/30' : ''}
            `}
          >
            {/* Rank */}
            <div className="w-6 flex items-center justify-center">
              {medal ? (
                <span className="text-lg">{medal.emoji}</span>
              ) : (
                <span className="text-white/40 text-sm font-mono">#{rank}</span>
              )}
            </div>

            {/* Avatar */}
            <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-white/10">
              <Image
                src={agent.image}
                alt={agent.name}
                fill
                className="object-cover"
                sizes="32px"
              />
              {/* Status indicator */}
              <div
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-black/50 ${
                  agent.status === 'working'
                    ? 'bg-emerald-400 animate-pulse'
                    : agent.status === 'idle'
                    ? 'bg-amber-400'
                    : 'bg-gray-500'
                }`}
              />
            </div>

            {/* Name & streak */}
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">{agent.name}</div>
              <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                <span>{agent.totalTasksDone} tasks</span>
                {agent.currentStreak > 0 && (
                  <span className="text-orange-400">🔥{agent.currentStreak}</span>
                )}
              </div>
            </div>

            {/* Level */}
            <div
              className="w-8 h-6 rounded flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: `${levelColor}30`, color: levelColor }}
              title={getLevelTitle(agent.level)}
            >
              {agent.level}
            </div>

            {/* XP */}
            <div className="w-14 text-right">
              <div className="text-cyan-400 text-xs font-medium">{formatXP(agent.xp)}</div>
              {!compact && (
                <div className="text-[9px] text-white/30">XP</div>
              )}
            </div>
          </div>
        );
      })}

      {/* Total stats footer */}
      {!compact && sortedAgents.length > 1 && (
        <div className="mt-3 pt-2 border-t border-white/10 px-2">
          <div className="flex items-center justify-between text-[10px] text-white/40">
            <span>
              {sortedAgents.length} agents • {sortedAgents.reduce((sum, a) => sum + a.totalTasksDone, 0)} total tasks
            </span>
            <span>
              {formatXP(sortedAgents.reduce((sum, a) => sum + a.xp, 0))} combined XP
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

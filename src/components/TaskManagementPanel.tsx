'use client';

import { useState, useEffect, useMemo } from 'react';
import TaskPriorityBadge, { PriorityHeatmapSummary } from './TaskPriorityBadge';

interface Task {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
  owner?: string;
  priority?: string;
  depends?: string[];
  blocks?: string[];
  created?: string;
  completed?: string;
  started?: string;
  created_by?: string;
}

interface TasksData {
  timestamp: string;
  stats: {
    total: number;
    done: number;
    in_progress: number;
    blocked: number;
    todo: number;
    completion_rate: number;
    by_priority: Record<string, number>;
    by_owner: Record<string, number>;
  };
  tasks: Task[];
  recent_done: Task[];
}

type StatusFilter = 'all' | 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
type OwnerFilter = 'all' | string;
type PriorityFilter = 'all' | 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  TODO: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  IN_PROGRESS: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  DONE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  BLOCKED: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
};

// Priority colors now handled by TaskPriorityBadge component

const ownerEmoji: Record<string, string> = {
  '@clawdinho': '🐾',
  '@clawd': '🐾',
  '@onde-bot-1': '🤖',
  '@ondinho': '🤖',
};

function formatTimeAgo(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function TaskCard({ task }: { task: Task }) {
  const status = statusColors[task.status] || statusColors.TODO;
  const ownerIcon = ownerEmoji[task.owner || ''] || '👤';

  return (
    <div
      className={`p-3 rounded-lg border ${status.border} ${status.bg} transition-all hover:scale-[1.01]`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-white/40">{task.id}</span>
            {task.priority && (
              <TaskPriorityBadge 
                priority={task.priority} 
                size="sm"
                animate={task.status === 'IN_PROGRESS'}
              />
            )}
          </div>
          <h3 className="text-sm font-medium text-white/90 truncate" title={task.title}>
            {task.title}
          </h3>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${status.bg} ${status.text} whitespace-nowrap`}>
          {task.status.replace('_', ' ')}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs text-white/50">
        {task.owner && (
          <span className="flex items-center gap-1">
            <span>{ownerIcon}</span>
            <span>{task.owner.replace('@', '')}</span>
          </span>
        )}
        {task.depends && task.depends.length > 0 && (
          <span className="flex items-center gap-1">
            <span>⬅️</span>
            <span>{task.depends.join(', ')}</span>
          </span>
        )}
        {task.started && (
          <span className="flex items-center gap-1">
            <span>🚀</span>
            <span>{formatTimeAgo(task.started)}</span>
          </span>
        )}
        {task.completed && task.status === 'DONE' && (
          <span className="flex items-center gap-1">
            <span>✅</span>
            <span>{formatTimeAgo(task.completed)}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function StatsCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className={`p-3 rounded-lg ${color} text-center`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-white/60 mt-1">{label}</div>
    </div>
  );
}

export default function TaskManagementPanel() {
  const [data, setData] = useState<TasksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchTasks() {
      try {
        const resp = await fetch('/api/tasks');
        if (!resp.ok) throw new Error('Failed to fetch');
        const tasksData = await resp.json();
        setData(tasksData);
        setError(null);
      } catch (err) {
        setError('Failed to load tasks');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchTasks();
    const interval = setInterval(fetchTasks, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const owners = useMemo(() => {
    if (!data) return [];
    const ownerSet = new Set<string>();
    data.tasks.forEach((t) => t.owner && ownerSet.add(t.owner));
    return Array.from(ownerSet).sort();
  }, [data]);

  const filteredTasks = useMemo(() => {
    if (!data) return [];
    
    return data.tasks.filter((task) => {
      // Status filter
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      
      // Owner filter
      if (ownerFilter !== 'all' && task.owner !== ownerFilter) return false;
      
      // Priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesId = task.id.toLowerCase().includes(query);
        const matchesTitle = task.title.toLowerCase().includes(query);
        if (!matchesId && !matchesTitle) return false;
      }
      
      return true;
    });
  }, [data, statusFilter, ownerFilter, priorityFilter, searchQuery]);

  if (loading) {
    return (
      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <div className="text-center text-red-400 py-8">
          <span className="text-2xl">⚠️</span>
          <p className="mt-2">{error || 'No data available'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <h2 className="text-lg font-semibold text-white">Task Management</h2>
          </div>
          <div className="text-xs text-white/40">
            Updated {formatTimeAgo(data.timestamp)}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
          <StatsCard label="Total" value={data.stats.total} color="bg-white/5" />
          <StatsCard label="Done" value={data.stats.done} color="bg-emerald-500/10" />
          <StatsCard label="In Progress" value={data.stats.in_progress} color="bg-blue-500/10" />
          <StatsCard label="TODO" value={data.stats.todo} color="bg-yellow-500/10" />
          <StatsCard label="Blocked" value={data.stats.blocked} color="bg-red-500/10" />
          <StatsCard label="Completion" value={`${data.stats.completion_rate}%`} color="bg-purple-500/10" />
        </div>

        {/* Priority Heat Distribution */}
        {data.stats.by_priority && Object.keys(data.stats.by_priority).length > 0 && (
          <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-white/5">
            <span className="text-xs text-white/50">Priority Heat:</span>
            <PriorityHeatmapSummary distribution={data.stats.by_priority} />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50"
          />

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500/50"
          >
            <option value="all">All Status</option>
            <option value="TODO">TODO</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="BLOCKED">Blocked</option>
            <option value="DONE">Done</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500/50"
          >
            <option value="all">All Priority</option>
            <option value="P0">P0 🔥</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
            <option value="P4">P4</option>
          </select>

          {/* Owner Filter */}
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500/50"
          >
            <option value="all">All Owners</option>
            {owners.map((owner) => (
              <option key={owner} value={owner}>
                {ownerEmoji[owner] || '👤'} {owner.replace('@', '')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="text-center text-white/40 py-8">
            No tasks match your filters
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 text-center text-xs text-white/40">
        Showing {filteredTasks.length} of {data.tasks.length} tasks
        {data.stats.by_owner && Object.keys(data.stats.by_owner).length > 0 && (
          <span className="ml-2">
            • Active: {Object.entries(data.stats.by_owner).map(([o, c]) => `${o.replace('@', '')}(${c})`).join(', ')}
          </span>
        )}
      </div>
    </div>
  );
}

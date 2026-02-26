import { NextResponse } from 'next/server';

export const runtime = 'edge'

interface AgentInfo {
  id: string;
  status: 'running' | 'completed' | 'error';
  description: string;
  startTime: string;
  lastActivity: string;
  tokensUsed: number;
  toolsUsed: number;
}

// In edge runtime (Cloudflare), we can't access the filesystem
// Return static mock data for demo purposes
// TODO: Connect to a database or external API for real agent data
export async function GET() {
  const mockAgents: AgentInfo[] = [
    {
      id: 'demo-agent-1',
      status: 'completed',
      description: 'Content generation task',
      startTime: new Date(Date.now() - 3600000).toISOString(),
      lastActivity: new Date(Date.now() - 1800000).toISOString(),
      tokensUsed: 15234,
      toolsUsed: 8,
    },
    {
      id: 'demo-agent-2',
      status: 'running',
      description: 'Monitoring task',
      startTime: new Date(Date.now() - 7200000).toISOString(),
      lastActivity: new Date().toISOString(),
      tokensUsed: 8421,
      toolsUsed: 3,
    },
  ];

  return NextResponse.json({
    agents: mockAgents,
    timestamp: new Date().toISOString(),
    activeCount: mockAgents.filter(a => a.status === 'running').length,
    note: 'Running in edge mode - showing demo data'
  });
}

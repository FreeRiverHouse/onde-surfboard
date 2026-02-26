import { NextResponse } from 'next/server';

export const runtime = 'edge';

const GIST_ID = '12a07b9ed63e19f01d2693b69f8a0e3b';
const GIST_FILENAME = 'onde-tasks-data.json';

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

export async function GET() {
  try {
    const gistUrl = `https://gist.githubusercontent.com/raw/${GIST_ID}/${GIST_FILENAME}?t=${Date.now()}`;
    const resp = await fetch(gistUrl, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (!resp.ok) {
      throw new Error(`Failed to fetch gist: ${resp.status}`);
    }

    const data: TasksData = await resp.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    
    // Return fallback/mock data
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      stats: {
        total: 0,
        done: 0,
        in_progress: 0,
        blocked: 0,
        todo: 0,
        completion_rate: 0,
        by_priority: {},
        by_owner: {},
      },
      tasks: [],
      recent_done: [],
      error: 'Failed to fetch tasks data',
    }, {
      status: 500,
    });
  }
}

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// GitHub API to read inbox.json from the repo
const GITHUB_API = 'https://api.github.com/repos/FreeRiverHouse/Onde/contents/agents/betting/inbox.json';

interface InboxMessage {
  id: string;
  content: string;
  type: 'message' | 'link' | 'command';
  timestamp: string;
  processed: boolean;
}

interface InboxData {
  messages: InboxMessage[];
  lastUpdated: string;
}

async function getInboxFromGitHub(): Promise<InboxData> {
  try {
    const response = await fetch(GITHUB_API, {
      headers: {
        'Accept': 'application/vnd.github.v3.raw',
        'User-Agent': 'Onde-Surfboard',
      },
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error fetching inbox from GitHub:', error);
  }
  return { messages: [], lastUpdated: new Date().toISOString() };
}

// GET - Retrieve inbox messages (read-only from GitHub)
export async function GET() {
  try {
    const inbox = await getInboxFromGitHub();
    return NextResponse.json(inbox);
  } catch (error) {
    console.error('GET inbox error:', error);
    return NextResponse.json(
      { messages: [], lastUpdated: new Date().toISOString(), error: 'Failed to read inbox' },
      { status: 500 }
    );
  }
}

// POST - Add new message (returns info - actual write must be done locally)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Detect message type
    let type: InboxMessage['type'] = 'message';
    if (content.includes('twitter.com') || content.includes('x.com')) {
      type = 'link';
    } else if (content.startsWith('/') || content.startsWith('!')) {
      type = 'command';
    }

    const newMessage: InboxMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: content.trim(),
      type,
      timestamp: new Date().toISOString(),
      processed: false
    };

    // Note: On Edge runtime, we can't write to the local filesystem.
    // The message is returned but needs to be synced via a local agent.
    return NextResponse.json({
      success: true,
      message: newMessage,
      note: 'Message created. Local sync required to persist to agents/betting/inbox.json'
    });
  } catch (error) {
    console.error('POST inbox error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}

// DELETE - Not available on edge runtime
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Message ID required' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: false,
    error: 'Delete not available on edge runtime. Use local agent to delete messages.',
    messageId: id
  }, { status: 501 });
}

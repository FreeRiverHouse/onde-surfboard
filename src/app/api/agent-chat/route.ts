/**
 * Agent Chat API
 * 
 * POST /api/agent-chat - Send a message to an agent
 * GET /api/agent-chat - Get chat history
 * 
 * This enables onde.surf dashboard to chat with real Clawdbot sessions.
 * Messages are queued in D1 and picked up by Clawdbot via heartbeat/cron.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { nanoid } from 'nanoid'

export const runtime = 'edge'

interface ChatMessage {
  id: string
  session_key: string
  agent_id: string
  sender: string
  sender_name: string | null
  content: string
  status: string
  created_at: string
  delivered_at: string | null
  read_at: string | null
  metadata: string | null
}

// POST - Send a message to an agent
export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext()
    const db = env.DB
    
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }
    
    const body = await request.json()
    const { agentId, content, senderName, sessionKey, metadata } = body
    
    if (!agentId || !content) {
      return NextResponse.json(
        { error: 'agentId and content are required' },
        { status: 400 }
      )
    }
    
    const messageId = nanoid()
    const effectiveSessionKey = sessionKey || `dashboard:${agentId}:${Date.now()}`
    
    // Insert message into queue
    await db.prepare(`
      INSERT INTO agent_chat_messages (
        id, session_key, agent_id, sender, sender_name, content, status, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      messageId,
      effectiveSessionKey,
      agentId,
      'dashboard',
      senderName || 'Dashboard User',
      content,
      'pending',
      metadata ? JSON.stringify(metadata) : null
    ).run()
    
    // Update or create chat session
    const existingSession = await db.prepare(
      `SELECT id FROM agent_chat_sessions WHERE id = ?`
    ).bind(effectiveSessionKey).first()
    
    if (existingSession) {
      await db.prepare(`
        UPDATE agent_chat_sessions 
        SET last_message_at = CURRENT_TIMESTAMP, message_count = message_count + 1
        WHERE id = ?
      `).bind(effectiveSessionKey).run()
    } else {
      await db.prepare(`
        INSERT INTO agent_chat_sessions (id, agent_id, session_name, last_message_at, message_count)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, 1)
      `).bind(effectiveSessionKey, agentId, `Chat with ${agentId}`).run()
    }
    
    return NextResponse.json({
      success: true,
      messageId,
      sessionKey: effectiveSessionKey,
      status: 'pending'
    })
    
  } catch (error) {
    console.error('Agent chat send error:', error)
    return NextResponse.json(
      { error: 'Failed to send message', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

// GET - Get chat history
export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext()
    const db = env.DB
    
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }
    
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const sessionKey = searchParams.get('sessionKey')
    const limit = parseInt(searchParams.get('limit') || '50')
    const after = searchParams.get('after') // For pagination
    
    if (!agentId && !sessionKey) {
      return NextResponse.json(
        { error: 'agentId or sessionKey required' },
        { status: 400 }
      )
    }
    
    let query = `
      SELECT * FROM agent_chat_messages 
      WHERE 1=1
    `
    const params: (string | number)[] = []
    
    if (sessionKey) {
      query += ` AND session_key = ?`
      params.push(sessionKey)
    } else if (agentId) {
      query += ` AND agent_id = ?`
      params.push(agentId)
    }
    
    if (after) {
      query += ` AND created_at > ?`
      params.push(after)
    }
    
    query += ` ORDER BY created_at DESC LIMIT ?`
    params.push(limit)
    
    const stmt = db.prepare(query)
    const result = await stmt.bind(...params).all<ChatMessage>()
    
    // Reverse to get chronological order
    const messages = (result.results || []).reverse()
    
    return NextResponse.json({
      messages,
      count: messages.length
    })
    
  } catch (error) {
    console.error('Agent chat history error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch history', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

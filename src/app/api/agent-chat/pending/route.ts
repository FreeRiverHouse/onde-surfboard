/**
 * Agent Chat Pending Messages API
 * 
 * GET /api/agent-chat/pending - Get pending messages for an agent (Clawdbot pickup)
 * POST /api/agent-chat/pending - Mark messages as delivered and optionally add response
 * 
 * This endpoint is called by Clawdbot during heartbeat to:
 * 1. Pick up any pending messages from the dashboard
 * 2. Mark them as delivered
 * 3. Store agent responses
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

// GET - Get pending messages for Clawdbot pickup
export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext()
    const db = env.DB
    
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }
    
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    // Optional auth header for Clawdbot
    const authHeader = request.headers.get('Authorization')
    const expectedSecret = process.env.AGENT_CHAT_SECRET || 'onde-agent-chat'
    
    // Allow unauthenticated for now, but log
    if (authHeader && authHeader !== `Bearer ${expectedSecret}`) {
      console.warn('Agent chat pending: invalid auth')
    }
    
    let query = `
      SELECT * FROM agent_chat_messages 
      WHERE sender = 'dashboard' AND status = 'pending'
    `
    const params: (string | number)[] = []
    
    if (agentId) {
      query += ` AND agent_id = ?`
      params.push(agentId)
    }
    
    query += ` ORDER BY created_at ASC LIMIT ?`
    params.push(limit)
    
    const stmt = db.prepare(query)
    const result = await stmt.bind(...params).all<ChatMessage>()
    
    const messages = result.results || []
    
    return NextResponse.json({
      messages,
      count: messages.length,
      hasMore: messages.length >= limit
    })
    
  } catch (error) {
    console.error('Agent chat pending error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending messages', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

// POST - Mark message as delivered and/or add agent response
export async function POST(request: NextRequest) {
  try {
    const { env } = getRequestContext()
    const db = env.DB
    
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }
    
    const body = await request.json()
    const { messageId, action, response, agentId, sessionKey } = body
    
    // Action: 'delivered' | 'respond' | 'both'
    if (action === 'delivered' || action === 'both') {
      if (!messageId) {
        return NextResponse.json({ error: 'messageId required for delivery' }, { status: 400 })
      }
      
      await db.prepare(`
        UPDATE agent_chat_messages 
        SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(messageId).run()
    }
    
    // If there's a response, add it as a new message from the agent
    if ((action === 'respond' || action === 'both') && response) {
      const responseId = nanoid()
      
      // Get session_key from original message if not provided
      let effectiveSessionKey = sessionKey
      if (!effectiveSessionKey && messageId) {
        const original = await db.prepare(
          `SELECT session_key, agent_id FROM agent_chat_messages WHERE id = ?`
        ).bind(messageId).first<{ session_key: string; agent_id: string }>()
        
        if (original) {
          effectiveSessionKey = original.session_key
        }
      }
      
      if (!effectiveSessionKey) {
        effectiveSessionKey = `dashboard:${agentId || 'unknown'}:${Date.now()}`
      }
      
      await db.prepare(`
        INSERT INTO agent_chat_messages (
          id, session_key, agent_id, sender, sender_name, content, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        responseId,
        effectiveSessionKey,
        agentId || 'unknown',
        'agent',
        agentId || 'Agent',
        response,
        'delivered'
      ).run()
      
      // Update session
      await db.prepare(`
        UPDATE agent_chat_sessions 
        SET last_message_at = CURRENT_TIMESTAMP, message_count = message_count + 1
        WHERE id = ?
      `).bind(effectiveSessionKey).run()
      
      return NextResponse.json({
        success: true,
        responseId,
        sessionKey: effectiveSessionKey
      })
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Agent chat respond error:', error)
    return NextResponse.json(
      { error: 'Failed to process', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

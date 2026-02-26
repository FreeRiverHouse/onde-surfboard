import { NextResponse, NextRequest } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

// POST /api/house/chat/webhook — register webhook for a bot
export async function POST(req: NextRequest) {
  try {
    const { env } = getRequestContext()
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const token = authHeader.slice(7)
    const VALID_NAMES = ['Mattia', 'Clawdinho', 'Ondinho', 'Bubble']
    const botName = token.split('-')[0]
    
    if (!VALID_NAMES.find(n => n.toLowerCase() === botName?.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const body = await req.json()
    const { webhookUrl } = body
    
    if (!webhookUrl || !webhookUrl.startsWith('https://')) {
      return NextResponse.json({ error: 'Invalid webhook URL (must be https)' }, { status: 400 })
    }
    
    // Store webhook URL in KV
    const name = VALID_NAMES.find(n => n.toLowerCase() === botName.toLowerCase()) || botName
    await env.WEBHOOKS_KV?.put(`webhook:${name}`, webhookUrl)
    
    return NextResponse.json({ ok: true, bot: name, webhookUrl })
  } catch (error) {
    console.error('Webhook registration error:', error)
    return NextResponse.json({ error: 'Failed to register webhook' }, { status: 500 })
  }
}

// DELETE /api/house/chat/webhook — unregister webhook
export async function DELETE(req: NextRequest) {
  try {
    const { env } = getRequestContext()
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const token = authHeader.slice(7)
    const VALID_NAMES = ['Mattia', 'Clawdinho', 'Ondinho', 'Bubble']
    const botName = token.split('-')[0]
    const name = VALID_NAMES.find(n => n.toLowerCase() === botName?.toLowerCase()) || botName
    
    await env.WEBHOOKS_KV?.delete(`webhook:${name}`)
    
    return NextResponse.json({ ok: true, bot: name })
  } catch (error) {
    console.error('Webhook deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 })
  }
}
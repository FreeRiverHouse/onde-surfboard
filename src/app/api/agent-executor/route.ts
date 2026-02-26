/**
 * Agent Executor API
 * 
 * POST /api/agent-executor - Execute pending tasks
 * 
 * This endpoint:
 * 1. Fetches pending tasks from D1
 * 2. Claims and executes them
 * 3. Uses Claude API for task execution
 * 4. Marks tasks as completed/failed
 * 
 * Can be called by:
 * - Cloudflare Cron
 * - External scheduler (Clawdbot cron)
 * - Manual trigger from dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'
import {
  getNextAvailableTaskFromD1,
  claimAgentTaskInD1,
  startAgentTaskInD1,
  completeAgentTaskInD1,
  failAgentTaskInD1,
  AgentTask
} from '@/lib/agent-tasks'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'edge'

// Agent personas for different task types
const AGENT_PERSONAS: Record<string, string> = {
  'OndePR': `You are OndePR, Onde's social media and PR agent. You create engaging posts, review content, and manage social presence. Write in a warm, cultured, slightly mysterious tone. You love classic literature and beautiful illustrations.`,
  'Gianni': `You are Gianni, Onde's editorial director. You review book content, suggest improvements, and ensure quality. You have deep knowledge of classic literature and publishing standards.`,
  'Pina': `You are Pina Pennello, Onde's creative director and illustrator. You create beautiful illustrations, review artwork, and maintain visual consistency. You have a keen eye for aesthetics.`,
  'Engineer': `You are an Onde engineer. You review code, fix bugs, deploy changes, and maintain technical quality. Be precise and thorough.`,
  'default': `You are an Onde AI agent. Complete the assigned task professionally and thoroughly.`
}

// Map task types to agent personas
function getAgentForTask(task: AgentTask): string {
  const taskType = task.type
  
  if (taskType.startsWith('post_')) return 'OndePR'
  if (taskType.startsWith('book_')) return 'Gianni'
  if (taskType.startsWith('image_')) return 'Pina'
  if (taskType.startsWith('code_')) return 'Engineer'
  
  return task.assigned_to || 'default'
}

// Execute a task using Claude
async function executeTask(task: AgentTask, anthropicKey: string): Promise<string> {
  const client = new Anthropic({ apiKey: anthropicKey })
  
  const agentName = getAgentForTask(task)
  const persona = AGENT_PERSONAS[agentName] || AGENT_PERSONAS['default']
  
  // Build the prompt
  let prompt = `Task Type: ${task.type}\n`
  prompt += `Description: ${task.description}\n`
  
  if (task.payload) {
    try {
      const payload = JSON.parse(task.payload)
      prompt += `\nContext/Data:\n${JSON.stringify(payload, null, 2)}\n`
    } catch {
      prompt += `\nAdditional Info: ${task.payload}\n`
    }
  }
  
  prompt += `\nPlease complete this task and provide the result.`
  
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: persona,
    messages: [
      { role: 'user', content: prompt }
    ]
  })
  
  // Extract text from response
  const textContent = message.content.find(c => c.type === 'text')
  return textContent?.text || 'Task completed but no text response generated.'
}

export async function POST(request: NextRequest) {
  try {
    // Auth check - require secret or valid session
    const authHeader = request.headers.get('Authorization')
    const expectedSecret = process.env.AGENT_EXECUTOR_SECRET || 'onde-agent-secret'
    
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get D1 database
    const { env } = getRequestContext()
    const db = env.DB
    
    if (!db) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 500 }
      )
    }
    
    // Get Anthropic API key
    const anthropicKey = process.env.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY
    if (!anthropicKey) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      )
    }
    
    // Parse request body
    const body = await request.json().catch(() => ({}))
    const maxTasks = body.maxTasks || 5
    const taskType = body.taskType // Optional filter
    
    const results: Array<{
      taskId: string
      status: 'completed' | 'failed'
      result?: string
      error?: string
    }> = []
    
    // Process up to maxTasks
    for (let i = 0; i < maxTasks; i++) {
      // Get next available task
      const task = await getNextAvailableTaskFromD1(db, undefined, taskType)
      
      if (!task) {
        // No more pending tasks
        break
      }
      
      // Claim the task
      const claimed = await claimAgentTaskInD1(db, task.id, 'agent-executor')
      if (!claimed) {
        // Someone else claimed it, try next
        continue
      }
      
      // Start the task
      await startAgentTaskInD1(db, task.id)
      
      try {
        // Execute the task
        const result = await executeTask(task, anthropicKey)
        
        // Mark as completed
        await completeAgentTaskInD1(db, task.id, result)
        
        results.push({
          taskId: task.id,
          status: 'completed',
          result: result.substring(0, 500) + (result.length > 500 ? '...' : '')
        })
      } catch (execError) {
        // Mark as failed
        const errorMessage = execError instanceof Error ? execError.message : 'Unknown error'
        await failAgentTaskInD1(db, task.id, errorMessage)
        
        results.push({
          taskId: task.id,
          status: 'failed',
          error: errorMessage
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      processed: results.length,
      results
    })
    
  } catch (error) {
    console.error('Agent executor error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET - Status check
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    endpoint: '/api/agent-executor',
    method: 'POST',
    description: 'Execute pending agent tasks',
    auth: 'Bearer token required'
  })
}

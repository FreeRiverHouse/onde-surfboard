/**
 * Agent Memory System
 * 
 * Provides persistent memory for Onde.surf AI agents across task executions.
 * Uses D1 database for storage.
 */

import { D1Database } from '@cloudflare/workers-types'

export interface AgentMemory {
  id: string
  agent_name: string
  memory_type: 'conversation' | 'decision' | 'lesson' | 'context' | 'task_result'
  content: string
  task_id?: string
  created_at: string
  expires_at?: string
  importance: number
}

/**
 * Load recent context for an agent
 */
export async function loadAgentContext(
  db: D1Database, 
  agentName: string,
  limit = 10
): Promise<string> {
  try {
    const memories = await db.prepare(`
      SELECT content, memory_type, created_at 
      FROM agent_memory 
      WHERE agent_name = ? 
      ORDER BY importance DESC, created_at DESC 
      LIMIT ?
    `).bind(agentName, limit).all<AgentMemory>()
    
    if (!memories.results?.length) return ''
    
    const contextLines = memories.results.map(m => {
      const date = new Date(m.created_at).toLocaleDateString()
      return `- [${m.memory_type}/${date}] ${m.content}`
    })
    
    return `## Previous Context\n${contextLines.join('\n')}`
  } catch (error) {
    console.error('Error loading agent context:', error)
    return ''
  }
}

/**
 * Save a memory entry for an agent
 */
export async function saveAgentMemory(
  db: D1Database,
  agentName: string,
  memoryType: AgentMemory['memory_type'],
  content: string,
  options: {
    taskId?: string
    importance?: number
    expiresInDays?: number
  } = {}
): Promise<boolean> {
  try {
    const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const expiresAt = options.expiresInDays 
      ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null
    
    await db.prepare(`
      INSERT INTO agent_memory (id, agent_name, memory_type, content, task_id, importance, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      agentName,
      memoryType,
      content.substring(0, 2000), // Truncate to save space
      options.taskId || null,
      options.importance ?? 3,
      expiresAt
    ).run()
    
    return true
  } catch (error) {
    console.error('Error saving agent memory:', error)
    return false
  }
}

/**
 * Save task result to memory
 */
export async function saveTaskMemory(
  db: D1Database, 
  agentName: string, 
  taskId: string, 
  result: string
): Promise<void> {
  // Extract a summary (first 500 chars or first paragraph)
  const summary = result.split('\n\n')[0].substring(0, 500)
  
  await saveAgentMemory(db, agentName, 'task_result', summary, {
    taskId,
    importance: 3,
    expiresInDays: 30 // Keep task results for 30 days
  })
}

/**
 * Save a lesson learned
 */
export async function saveLesson(
  db: D1Database,
  agentName: string,
  lesson: string,
  importance = 7
): Promise<void> {
  await saveAgentMemory(db, agentName, 'lesson', lesson, {
    importance,
    // Lessons don't expire
  })
}

/**
 * Cleanup old/expired memories
 */
export async function cleanupMemories(db: D1Database): Promise<number> {
  try {
    // Delete expired memories
    await db.prepare(`
      DELETE FROM agent_memory 
      WHERE expires_at IS NOT NULL 
      AND expires_at < datetime('now')
    `).run()
    
    // Delete low-importance memories older than 7 days
    const result = await db.prepare(`
      DELETE FROM agent_memory 
      WHERE importance < 5 
      AND created_at < datetime('now', '-7 days')
    `).run()
    
    return result.meta.changes || 0
  } catch (error) {
    console.error('Error cleaning up memories:', error)
    return 0
  }
}

/**
 * Search memories by content
 */
export async function searchMemories(
  db: D1Database,
  agentName: string,
  query: string,
  limit = 5
): Promise<AgentMemory[]> {
  try {
    const result = await db.prepare(`
      SELECT * FROM agent_memory 
      WHERE agent_name = ? 
      AND content LIKE ?
      ORDER BY importance DESC, created_at DESC 
      LIMIT ?
    `).bind(agentName, `%${query}%`, limit).all<AgentMemory>()
    
    return result.results || []
  } catch (error) {
    console.error('Error searching memories:', error)
    return []
  }
}

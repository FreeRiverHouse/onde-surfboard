-- Agent Chat: D1 tables for bot-to-bot and dashboard-to-agent messaging
-- Run with: wrangler d1 execute onde-surf-db --file=migrations/001-agent-chat.sql

-- Chat sessions (one per agent or group)
CREATE TABLE IF NOT EXISTS agent_chat_sessions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  session_name TEXT,
  last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  message_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Individual chat messages
CREATE TABLE IF NOT EXISTS agent_chat_messages (
  id TEXT PRIMARY KEY,
  session_key TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  sender TEXT NOT NULL,          -- 'dashboard' | 'agent' | agent_id (for bot-to-bot)
  sender_name TEXT,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending' | 'delivered' | 'read'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  delivered_at DATETIME,
  read_at DATETIME,
  metadata TEXT                  -- JSON blob for extras
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_chat_msg_agent ON agent_chat_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_msg_session ON agent_chat_messages(session_key);
CREATE INDEX IF NOT EXISTS idx_chat_msg_status ON agent_chat_messages(status);
CREATE INDEX IF NOT EXISTS idx_chat_msg_created ON agent_chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_agent ON agent_chat_sessions(agent_id);

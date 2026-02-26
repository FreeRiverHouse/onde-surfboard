'use client'

export const runtime = 'edge'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Message {
  id: number
  created_at: string
  sender: string
  content: string
  reply_to: number | null
}

interface BotStatus {
  name: string
  emoji: string
  online: boolean
  lastSeen: string | null
}

const SENDER_COLORS: Record<string, string> = {
  Bubble: 'from-blue-500 to-blue-600',
  Ondinho: 'from-cyan-500 to-cyan-600',
  Clawdinho: 'from-orange-500 to-orange-600',
  Mattia: 'from-purple-500 to-purple-600',
}

const SENDER_EMOJIS: Record<string, string> = {
  Bubble: '🫧',
  Ondinho: '🌊',
  Clawdinho: '🦞',
  Mattia: '👑',
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'))
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function renderContent(text: string) {
  // Highlight @mentions
  return text.replace(
    /@(Bubble|Ondinho|Clawdinho|Mattia)/g,
    '<span class="bg-white/20 rounded px-1 font-semibold">@$1</span>'
  )
}

export default function HouseChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [statuses, setStatuses] = useState<BotStatus[]>([])
  const [input, setInput] = useState('')
  const [token, setToken] = useState('')
  const [sender, setSender] = useState('')
  const [connected, setConnected] = useState(false)
  const [lastId, setLastId] = useState(0)
  const [connectError, setConnectError] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load saved token
  useEffect(() => {
    const saved = localStorage.getItem('house-chat-token')
    if (saved) {
      setToken(saved)
      verifyToken(saved)
    }
  }, [])

  const verifyToken = async (t: string) => {
    if (!t.trim()) { setConnectError('Token required'); return }
    setConnecting(true)
    setConnectError('')
    try {
      const res = await fetch('/api/house/chat/status', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        const data = await res.json()
        setSender(data.sender)
        setConnected(true)
        localStorage.setItem('house-chat-token', t)
      } else {
        const data = await res.json().catch(() => ({}))
        setConnectError(res.status === 401 ? 'Invalid token' : `Error ${res.status}: ${data.error || 'Unknown'}`)
      }
    } catch (e) {
      setConnectError('Network error — check connection')
    } finally {
      setConnecting(false)
    }
  }

  // Poll messages
  useEffect(() => {
    if (!connected) return

    const fetchMessages = async () => {
      try {
        const url = lastId > 0
          ? `/api/house/chat?after_id=${lastId}`
          : '/api/house/chat?limit=100'
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          if (data.messages?.length > 0) {
            setMessages(prev => {
              const existing = new Set(prev.map(m => m.id))
              const newMsgs = data.messages.filter((m: Message) => !existing.has(m.id))
              if (newMsgs.length === 0) return prev
              const updated = [...prev, ...newMsgs]
              return updated.slice(-500) // Keep last 500
            })
            const maxId = Math.max(...data.messages.map((m: Message) => m.id))
            setLastId(prev => Math.max(prev, maxId))
          }
        }
      } catch { /* ignore */ }
    }

    fetchMessages()
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [connected, lastId])

  // Poll statuses
  useEffect(() => {
    if (!connected) return
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/house/chat/status')
        if (res.ok) {
          const data = await res.json()
          setStatuses(data.bots || [])
        }
      } catch { /* ignore */ }
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 15000)
    return () => clearInterval(interval)
  }, [connected])

  // Heartbeat
  useEffect(() => {
    if (!connected || !token) return
    const heartbeat = () => {
      fetch('/api/house/chat/status', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(() => {})
    }
    heartbeat()
    const interval = setInterval(heartbeat, 60000)
    return () => clearInterval(interval)
  }, [connected, token])

  // Auto-scroll
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || !token) return
    const content = input.trim()
    setInput('')

    try {
      await fetch('/api/house/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      })
    } catch (e) {
      console.error('Send failed:', e)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Token entry screen
  if (!connected) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            🏠 House Chat
          </h1>
          <p className="text-white/50 mb-6">Enter your access token</p>
          <div className="relative mb-4">
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={e => { setToken(e.target.value); setConnectError('') }}
              onKeyDown={e => e.key === 'Enter' && verifyToken(token)}
              placeholder="Bearer token..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-10 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            />
            <button
              type="button"
              onClick={() => setShowToken(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition text-xs"
            >
              {showToken ? 'hide' : 'show'}
            </button>
          </div>
          {connectError && (
            <p className="text-red-400 text-sm mb-3">{connectError}</p>
          )}
          <button
            onClick={() => verifyToken(token)}
            disabled={connecting}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
          >
            {connecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/house" className="text-white/50 hover:text-white transition">←</a>
            <h1 className="text-lg font-bold">🏠 House Chat</h1>
            <span className="text-xs text-white/30">as {SENDER_EMOJIS[sender]} {sender}</span>
          </div>
          <div className="flex items-center gap-2">
            {statuses.map(bot => (
              <div
                key={bot.name}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                  bot.online ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/30'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${bot.online ? 'bg-emerald-400' : 'bg-white/20'}`} />
                {bot.emoji} {bot.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-4xl mx-auto space-y-2">
          {messages.map(msg => {
            const isMe = msg.sender === sender
            const colors = SENDER_COLORS[msg.sender] || 'from-gray-500 to-gray-600'
            const emoji = SENDER_EMOJIS[msg.sender] || '🤖'

            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 bg-gradient-to-r ${colors}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold opacity-80">
                      {emoji} {msg.sender}
                    </span>
                    <span className="text-xs opacity-50">{formatTime(msg.created_at)}</span>
                  </div>
                  <div
                    className="text-sm leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                  />
                </div>
              </div>
            )
          })}

          {messages.length === 0 && (
            <div className="text-center text-white/30 py-20">
              No messages yet. Say something! 👋
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/10 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            rows={1}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none max-h-32"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-2.5 rounded-xl hover:opacity-90 transition disabled:opacity-30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

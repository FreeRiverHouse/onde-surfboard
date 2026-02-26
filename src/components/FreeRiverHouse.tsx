'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useToast } from './Toast';
import { AgentLeaderboard } from './AgentLeaderboard';
import { calculateAgentMood } from '../lib/gamification';
import { useTTS, cleanTextForTTS } from '../lib/useTTS';
import { NotificationBell } from './NotificationCenter';

// Monument Valley color palette
const MV_COLORS = {
  cream: '#F5E6D3',
  terracotta: '#D4A574',
  sage: '#8B9A7B',
  sky: '#87CEEB',
  coral: '#E07A5F',
  stone: '#6B5B4F',
  shadow: 'rgba(0,0,0,0.1)',
};

// Agent configuration
interface AgentConfig {
  id: string;
  name: string;
  role: string;
  room: 'office' | 'studio' | 'lab' | 'library' | 'lounge' | 'garden';
  color: string;
  skills: string[];
  image: string;
}

interface AgentState extends AgentConfig {
  position: { x: number; y: number };
  targetPosition: { x: number; y: number };
  status: 'working' | 'idle' | 'sleeping';
  currentTask?: string;
  taskCount: number;
  lastSeen?: string | null;
  // Gamification
  xp: number;
  level: number;
  totalTasksDone: number;
  currentStreak: number;
  longestStreak: number;
  badges: string[];
}

interface AgentTask {
  id: string;
  type: string;
  description: string;
  status: string;
  assigned_to?: string;
  priority: string;
  created_at: string;
}

interface DBAgent {
  id: string;
  name: string;
  type: string;
  description: string;
  capabilities: string;
  status: string;
  last_seen: string | null;
  // Gamification
  xp: number | null;
  level: number | null;
  total_tasks_done: number | null;
  current_streak: number | null;
  longest_streak: number | null;
  badges: string | null;
}

// Visual config for agents (room assignments, images, colors)
const AGENT_VISUALS: Record<string, { room: AgentConfig['room']; color: string; image: string }> = {
  // 🤖 Core AI Agents (Real Clawdbot sessions)
  'clawdinho': { room: 'office', color: '#00D4FF', image: '/house/agents/clawdinho.svg' },
  'onde-bot': { room: 'lounge', color: '#FF6B35', image: '/house/agents/onde-bot.svg' },
  // ✍️ Creative Team
  'editore-capo': { room: 'office', color: MV_COLORS.coral, image: '/house/agents/editore-capo.png' },
  'video-factory': { room: 'studio', color: MV_COLORS.terracotta, image: '/house/agents/video-factory.png' },
  'pina-pennello': { room: 'studio', color: MV_COLORS.coral, image: '/house/agents/pina-pennello.png' },
  'gianni-parola': { room: 'library', color: MV_COLORS.sage, image: '/house/agents/gianni-parola.png' },
  // ⚙️ Tech Team
  'engineering-dept': { room: 'lab', color: MV_COLORS.sky, image: '/house/agents/automation.png' },
  'automation-architect': { room: 'lab', color: MV_COLORS.stone, image: '/house/agents/automation.png' },
  'qa-test-engineer': { room: 'lab', color: MV_COLORS.sky, image: '/house/agents/automation.png' },
  // 📱 Media & PR
  'onde-pr': { room: 'lounge', color: MV_COLORS.terracotta, image: '/house/agents/ondepr.png' },
  'sally': { room: 'office', color: MV_COLORS.sage, image: '/house/agents/sally.png' },
  'ceo-orchestrator': { room: 'office', color: MV_COLORS.coral, image: '/house/agents/editore-capo.png' },
};

// Default visual for unknown agents
const DEFAULT_VISUAL = { room: 'garden' as const, color: MV_COLORS.stone, image: '/house/agents/automation.png' };

// Check if agent was seen in last N minutes
function isAgentActive(lastSeen: string | null, minutesThreshold: number = 5): boolean {
  if (!lastSeen) return false;
  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - lastSeenDate.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  return diffMinutes <= minutesThreshold;
}

const ROOMS: Record<string, { x: number; y: number; width: number; height: number; label: string; image: string }> = {
  office: { x: 40, y: 60, width: 180, height: 130, label: 'Ufficio', image: '/house/rooms/office.png' },
  studio: { x: 250, y: 60, width: 180, height: 130, label: 'Studio', image: '/house/rooms/studio.png' },
  lab: { x: 460, y: 60, width: 180, height: 130, label: 'Lab', image: '/house/rooms/lab.png' },
  library: { x: 40, y: 220, width: 180, height: 130, label: 'Biblioteca', image: '/house/rooms/library.png' },
  lounge: { x: 250, y: 220, width: 180, height: 130, label: 'Salotto', image: '/house/rooms/lounge.png' },
  garden: { x: 460, y: 220, width: 180, height: 130, label: 'Giardino', image: '/house/rooms/garden.png' },
};

export function FreeRiverHouse() {
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentState | null>(null);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [message, setMessage] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [expanded, setExpanded] = useState(true);
  // panelMode now handles all 3 modes: tasks, chat, activity
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'agent', content: string, timestamp: string, agentId?: string}[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [activities, setActivities] = useState<{id: number, type: string, title: string, description: string, actor: string, created_at: string}[]>([]);
  const [panelMode, setPanelMode] = useState<'tasks' | 'chat' | 'activity' | 'leaderboard'>('tasks'); // Extended with leaderboard
  const animationRef = useRef<number>();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const previousTasksRef = useRef<AgentTask[]>([]);
  const previousLevelsRef = useRef<Record<string, number>>({});
  const [notificationEnabled, setNotificationEnabled] = useState<boolean>(false);
  const [levelUpCelebration, setLevelUpCelebration] = useState<{agentName: string; newLevel: number} | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const { showToast } = useToast();
  
  // TTS hook for agent responses
  const tts = useTTS({ lang: 'it-IT', rate: 1.0 });

  // Load TTS preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTtsPref = localStorage.getItem('agentTTSEnabled');
      setTtsEnabled(savedTtsPref === 'true');
    }
  }, []);

  // Toggle TTS and persist preference
  const toggleTTS = (value: boolean) => {
    setTtsEnabled(value);
    localStorage.setItem('agentTTSEnabled', value ? 'true' : 'false');
    if (!value && tts.isSpeaking) {
      tts.stop();
      setSpeakingMessageId(null);
    }
  };

  // Speak a chat message
  const speakMessage = useCallback((text: string, messageIndex: number) => {
    if (tts.isSpeaking && speakingMessageId === messageIndex) {
      // Stop if clicking the same message
      tts.stop();
      setSpeakingMessageId(null);
    } else {
      // Stop any current speech and start new
      tts.stop();
      const cleanText = cleanTextForTTS(text);
      tts.speak(cleanText);
      setSpeakingMessageId(messageIndex);
    }
  }, [tts, speakingMessageId]);

  // Reset speaking state when TTS finishes
  useEffect(() => {
    if (!tts.isSpeaking) {
      setSpeakingMessageId(null);
    }
  }, [tts.isSpeaking]);

  // Load sound preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPref = localStorage.getItem('levelUpSoundEnabled');
      setSoundEnabled(savedPref !== 'false'); // Default to true
    }
  }, []);

  // Toggle sound and persist preference
  const toggleSound = (value: boolean) => {
    setSoundEnabled(value);
    localStorage.setItem('levelUpSoundEnabled', value ? 'true' : 'false');
  };

  // Play celebratory level-up sound using Web Audio API
  const playLevelUpSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      // Create audio context on demand (browser requires user interaction first)
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }
      const ctx = audioContextRef.current;
      
      // Resume context if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      // Create a pleasant "level up" fanfare chime
      // Notes: C5 → E5 → G5 → C6 (major chord arpeggio)
      const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const baseTime = ctx.currentTime;
      
      frequencies.forEach((freq, i) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.type = 'sine'; // Softer, more pleasant tone
        oscillator.frequency.setValueAtTime(freq, baseTime + i * 0.1);
        
        // Gentle attack and decay
        const startTime = baseTime + i * 0.1;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02); // Quick attack
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3); // Smooth decay
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.35);
      });
      
      // Final sparkle note (high octave)
      const sparkle = ctx.createOscillator();
      const sparkleGain = ctx.createGain();
      sparkle.connect(sparkleGain);
      sparkleGain.connect(ctx.destination);
      sparkle.type = 'sine';
      sparkle.frequency.setValueAtTime(2093, baseTime + 0.4); // C7 - sparkle!
      sparkleGain.gain.setValueAtTime(0, baseTime + 0.4);
      sparkleGain.gain.linearRampToValueAtTime(0.15, baseTime + 0.42);
      sparkleGain.gain.exponentialRampToValueAtTime(0.01, baseTime + 0.8);
      sparkle.start(baseTime + 0.4);
      sparkle.stop(baseTime + 0.85);
      
    } catch (e) {
      console.error('Level-up sound error:', e);
    }
  }, [soundEnabled]);

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationEnabled(Notification.permission === 'granted');
    }
  }, []);

  // Show browser notification for completed tasks
  const showTaskNotification = (task: AgentTask, agentName: string) => {
    if (!notificationEnabled || !('Notification' in window)) return;
    
    try {
      const notification = new Notification(`✅ Task completato!`, {
        body: `${agentName}: ${task.description.slice(0, 100)}`,
        icon: '/icon.svg',
        tag: `task-${task.id}`,
        requireInteraction: false,
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      
      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    } catch (e) {
      console.error('Notification error:', e);
    }
  };

  // Trigger level-up celebration with confetti, toast, notification, and sound
  const triggerLevelUpCelebration = (agentName: string, newLevel: number) => {
    // Show celebration state for confetti
    setLevelUpCelebration({ agentName, newLevel });
    
    // Play celebratory sound
    playLevelUpSound();
    
    // Show toast
    showToast(`🎉 ${agentName} ha raggiunto il livello ${newLevel}!`, 'success');
    
    // Show browser notification if enabled
    if (notificationEnabled && 'Notification' in window) {
      try {
        const notification = new Notification(`🎉 Level Up!`, {
          body: `${agentName} ha raggiunto il livello ${newLevel}!`,
          icon: '/icon.svg',
          tag: `level-up-${agentName}`,
          requireInteraction: false,
        });
        setTimeout(() => notification.close(), 5000);
      } catch (e) {
        console.error('Level-up notification error:', e);
      }
    }
    
    // Clear celebration after animation (3 seconds)
    setTimeout(() => setLevelUpCelebration(null), 3000);
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      showToast('Browser non supporta notifiche', 'error');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      setNotificationEnabled(true);
      return true;
    }
    
    if (Notification.permission === 'denied') {
      showToast('Notifiche bloccate. Abilita nelle impostazioni browser', 'error');
      return false;
    }
    
    // Permission is 'default' - request it
    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    setNotificationEnabled(granted);
    
    if (granted) {
      showToast('🔔 Notifiche abilitate!', 'success');
      // Show test notification
      new Notification('Free River House', {
        body: 'Riceverai notifiche quando un task viene completato!',
        icon: '/icon.svg',
      });
    } else {
      showToast('Notifiche non abilitate', 'error');
    }
    
    return granted;
  };

  // Fetch agents and tasks from API - REAL DATA
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch from /api/house which has agents, tasks, and stats
        const res = await fetch('/api/house');
        if (res.ok) {
          const data = await res.json();
          const dbAgents: DBAgent[] = data.agents || [];
          const taskList: AgentTask[] = data.tasks || [];
          
          // Check for newly completed tasks and notify
          if (previousTasksRef.current.length > 0) {
            const prevTasks = previousTasksRef.current;
            taskList.forEach(task => {
              if (task.status === 'done') {
                const prevTask = prevTasks.find(t => t.id === task.id);
                if (prevTask && prevTask.status !== 'done') {
                  // Task just completed!
                  const agent = dbAgents.find(a => a.id === task.assigned_to);
                  showTaskNotification(task, agent?.name || task.assigned_to || 'Unknown');
                }
              }
            });
          }
          previousTasksRef.current = taskList;
          
          setTasks(taskList);

          // Convert DB agents to visual agents with REAL status
          const visualAgents: AgentState[] = dbAgents.map(dbAgent => {
            const visual = AGENT_VISUALS[dbAgent.id] || DEFAULT_VISUAL;
            const room = ROOMS[visual.room];

            // Parse capabilities
            let skills: string[] = [];
            try {
              skills = JSON.parse(dbAgent.capabilities || '[]');
            } catch { skills = []; }

            // Parse badges
            let badges: string[] = [];
            try {
              badges = dbAgent.badges ? JSON.parse(dbAgent.badges) : [];
            } catch { badges = []; }

            // Count tasks for this agent
            const agentTasks = taskList.filter(t => t.assigned_to === dbAgent.id);
            const activeTasks = agentTasks.filter(t =>
              t.status === 'in_progress' || t.status === 'claimed'
            );

            // REAL STATUS: based on last_seen (active in last 5 min) OR has active tasks
            const isActive = isAgentActive(dbAgent.last_seen, 5);
            const hasActiveTasks = activeTasks.length > 0;
            const realStatus = (isActive || hasActiveTasks) ? 'working' : 'idle';

            return {
              id: dbAgent.id,
              name: dbAgent.name,
              role: dbAgent.description || dbAgent.type,
              room: visual.room,
              color: visual.color,
              skills,
              image: visual.image,
              position: {
                x: room.x + 30 + Math.random() * (room.width - 60),
                y: room.y + 35 + Math.random() * (room.height - 70)
              },
              targetPosition: {
                x: room.x + 30 + Math.random() * (room.width - 60),
                y: room.y + 35 + Math.random() * (room.height - 70)
              },
              status: realStatus,
              currentTask: activeTasks[0]?.description,
              taskCount: agentTasks.length,
              lastSeen: dbAgent.last_seen,
              // Gamification data
              xp: dbAgent.xp || 0,
              level: dbAgent.level || 1,
              totalTasksDone: dbAgent.total_tasks_done || 0,
              currentStreak: dbAgent.current_streak || 0,
              longestStreak: dbAgent.longest_streak || 0,
              badges,
            };
          });

          // Check for level-ups
          visualAgents.forEach(agent => {
            const prevLevel = previousLevelsRef.current[agent.id];
            if (prevLevel !== undefined && agent.level > prevLevel) {
              // Level up detected!
              triggerLevelUpCelebration(agent.name, agent.level);
            }
            previousLevelsRef.current[agent.id] = agent.level;
          });

          setAgents(visualAgents);
        }
      } catch (e) {
        console.error('Failed to fetch house data:', e);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15000); // Refresh every 15 sec

    // Also fetch activity log
    const fetchActivities = async () => {
      try {
        const res = await fetch('/api/activity?limit=20');
        if (res.ok) {
          const data = await res.json();
          setActivities(data.activities || []);
        }
      } catch (e) {
        console.error('Failed to fetch activities:', e);
      }
    };
    fetchActivities();
    const activityInterval = setInterval(fetchActivities, 30000); // Refresh every 30 sec

    return () => {
      clearInterval(interval);
      clearInterval(activityInterval);
    };
  }, []);

  // Animate agents
  useEffect(() => {
    const animate = () => {
      setAgents(prev => prev.map(agent => {
        // Random movement
        if (Math.random() < 0.015) {
          const room = ROOMS[agent.room];
          return {
            ...agent,
            targetPosition: {
              x: room.x + 30 + Math.random() * (room.width - 60),
              y: room.y + 35 + Math.random() * (room.height - 70),
            }
          };
        }

        const dx = agent.targetPosition.x - agent.position.x;
        const dy = agent.targetPosition.y - agent.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 1) {
          const speed = agent.status === 'working' ? 1.2 : 0.4;
          return {
            ...agent,
            position: {
              x: agent.position.x + (dx / dist) * speed,
              y: agent.position.y + (dy / dist) * speed,
            }
          };
        }
        return agent;
      }));
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const handleCreateTask = async () => {
    if (!selectedAgent || !message.trim()) return;

    setIsCreatingTask(true);
    try {
      const res = await fetch('/api/agent-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedAgent.skills[0] || 'content_create',
          description: message,
          priority: 'normal',
          assigned_to: selectedAgent.id,
          created_by: 'free-river-house'
        })
      });

      if (res.ok) {
        showToast(`Task assegnato a ${selectedAgent.name}`, 'success');
        setMessage('');
        // Refresh tasks
        const tasksRes = await fetch('/api/agent-tasks?status=pending,claimed,in_progress&limit=50');
        if (tasksRes.ok) {
          const data = await tasksRes.json();
          setTasks(data.tasks || []);
        }
      } else {
        showToast('Errore nella creazione del task', 'error');
      }
    } catch {
      showToast('Errore di connessione', 'error');
    } finally {
      setIsCreatingTask(false);
    }
  };

  // Chat session key for persistent conversations
  const [chatSessionKey, setChatSessionKey] = useState<string | null>(null);
  const lastPollTimeRef = useRef<string | null>(null);

  // Ask a question to an agent - NOW USES REAL CLAWDBOT VIA AGENT-CHAT API
  const handleAskQuestion = async () => {
    if (!selectedAgent || !message.trim()) return;

    const question = message.trim();
    setIsAsking(true);

    // Add user message to chat immediately for responsiveness
    setChatHistory(prev => [...prev, {
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
      agentId: selectedAgent.id
    }]);
    setMessage('');

    try {
      // Send message to agent-chat API (queued for Clawdbot pickup)
      const res = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          content: question,
          senderName: 'Dashboard',
          sessionKey: chatSessionKey,
          metadata: { source: 'free-river-house' }
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Store session key for this conversation
        if (data.sessionKey && !chatSessionKey) {
          setChatSessionKey(data.sessionKey);
        }

        // Poll for response (check every 5 seconds for up to 3 minutes)
        // Clawdbot will pick up the message via heartbeat and respond
        let attempts = 0;
        const maxAttempts = 36; // 3 minutes
        const startTime = new Date().toISOString();
        
        const pollInterval = setInterval(async () => {
          attempts++;
          try {
            // Fetch messages from agent-chat API, looking for agent responses after our message
            const historyRes = await fetch(
              `/api/agent-chat?sessionKey=${encodeURIComponent(data.sessionKey)}&after=${encodeURIComponent(lastPollTimeRef.current || startTime)}`
            );
            
            if (historyRes.ok) {
              const historyData = await historyRes.json();
              const newMessages = (historyData.messages || []).filter(
                (m: { sender: string; created_at: string }) => 
                  m.sender === 'agent' && new Date(m.created_at) > new Date(startTime)
              );
              
              if (newMessages.length > 0) {
                clearInterval(pollInterval);
                // Add all new agent messages to chat
                newMessages.forEach((msg: { content: string; created_at: string }) => {
                  setChatHistory(prev => [...prev, {
                    role: 'agent',
                    content: msg.content,
                    timestamp: msg.created_at,
                    agentId: selectedAgent.id
                  }]);
                });
                lastPollTimeRef.current = newMessages[newMessages.length - 1].created_at;
                setIsAsking(false);
              }
            }
          } catch (e) {
            console.error('Poll error:', e);
          }

          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setChatHistory(prev => [...prev, {
              role: 'agent',
              content: '⏳ L\'agente non ha ancora risposto. Il messaggio è in coda e riceverai una risposta quando l\'agente sarà disponibile. Riprova tra qualche minuto o controlla più tardi.',
              timestamp: new Date().toISOString(),
              agentId: selectedAgent.id
            }]);
            setIsAsking(false);
          }
        }, 5000);
      } else {
        showToast('Errore nell\'invio del messaggio', 'error');
        setIsAsking(false);
      }
    } catch {
      showToast('Errore di connessione', 'error');
      setIsAsking(false);
    }
  };

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const workingCount = agents.filter(a => a.status === 'working').length;
  const selectedAgentTasks = tasks.filter(t =>
    t.assigned_to === selectedAgent?.id ||
    t.description?.toLowerCase().includes(selectedAgent?.name.toLowerCase() || '')
  );

  return (
    <section
      aria-label="Free River House"
      className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden relative"
    >
      {/* Level-up Celebration Confetti */}
      {levelUpCelebration && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {/* Confetti particles */}
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: `${6 + Math.random() * 8}px`,
                  height: `${6 + Math.random() * 8}px`,
                  backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'][Math.floor(Math.random() * 8)],
                  transform: `rotate(${Math.random() * 360}deg)`,
                  borderRadius: Math.random() > 0.5 ? '50%' : '0',
                }}
              />
            </div>
          ))}
          {/* Celebration text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/80 backdrop-blur-sm px-6 py-4 rounded-2xl border border-yellow-400/50 animate-bounce-once">
              <div className="text-4xl mb-2 text-center">🎉</div>
              <div className="text-yellow-400 font-bold text-lg text-center">Level Up!</div>
              <div className="text-white text-sm text-center mt-1">
                {levelUpCelebration.agentName} → Lv.{levelUpCelebration.newLevel}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <span className="text-2xl">🏠</span>
          <h2 className="text-sm font-medium text-white">Free River House</h2>
          {workingCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-emerald-400/20 text-emerald-400 rounded-full animate-pulse">
              {workingCount} al lavoro
            </span>
          )}
          <span className="text-white/40 text-xs">{expanded ? '▼' : '▶'}</span>
        </button>
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => toggleSound(!soundEnabled)}
            title={soundEnabled ? 'Suoni abilitati - Clicca per disattivare' : 'Suoni disattivati - Clicca per attivare'}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              soundEnabled
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {soundEnabled ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zm9.414-3l4-4m0 0l-4 4m4-4l-4 4" />
              )}
            </svg>
          </button>
          {/* Notification Toggle */}
          <button
            onClick={requestNotificationPermission}
            title={notificationEnabled ? 'Notifiche abilitate' : 'Abilita notifiche'}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              notificationEnabled
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {notificationEnabled ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9M15.536 8.464a5 5 0 010 7.072" />
              )}
            </svg>
          </button>
          {/* Notification Center */}
          <NotificationBell />
          {/* All Tasks Button */}
          <button
            onClick={() => setShowAllTasks(!showAllTasks)}
            className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-colors ${
              showAllTasks
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            All Tasks ({tasks.length})
          </button>
        </div>
      </div>

      {/* All Tasks Panel */}
      {showAllTasks && (
        <div className="border-b border-white/10 bg-white/[0.02] max-h-64 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white">All Active Tasks</h3>
              <div className="flex gap-2 text-[10px]">
                <span className="px-2 py-0.5 bg-amber-400/20 text-amber-400 rounded">
                  {tasks.filter(t => t.status === 'pending').length} pending
                </span>
                <span className="px-2 py-0.5 bg-blue-400/20 text-blue-400 rounded">
                  {tasks.filter(t => t.status === 'in_progress' || t.status === 'claimed').length} in progress
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {tasks.length > 0 ? (
                tasks.map(task => {
                  const agent = agents.find(a => a.id === task.assigned_to);
                  return (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                      onClick={() => {
                        if (agent) {
                          setSelectedAgent(agent);
                          setShowAllTasks(false);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-white/70 truncate">{task.description}</div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                              task.status === 'in_progress' ? 'bg-blue-400/20 text-blue-400' :
                              task.status === 'claimed' ? 'bg-purple-400/20 text-purple-400' :
                              task.status === 'pending' ? 'bg-amber-400/20 text-amber-400' :
                              task.status === 'done' ? 'bg-emerald-400/20 text-emerald-400' :
                              'bg-white/10 text-white/50'
                            }`}>
                              {task.status}
                            </span>
                            <span className="text-[10px] text-white/30">{task.type}</span>
                            {task.priority !== 'normal' && (
                              <span className={`text-[10px] ${
                                task.priority === 'urgent' ? 'text-red-400' :
                                task.priority === 'high' ? 'text-orange-400' :
                                'text-white/30'
                              }`}>
                                {task.priority}
                              </span>
                            )}
                          </div>
                        </div>
                        {agent && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="relative w-6 h-6 rounded-full overflow-hidden">
                              <Image
                                src={agent.image}
                                alt={agent.name}
                                fill
                                className="object-cover"
                                sizes="24px"
                              />
                            </div>
                            <span className="text-[10px] text-white/50">{agent.name.split(' ')[0]}</span>
                          </div>
                        )}
                        {!agent && task.assigned_to && (
                          <span className="text-[10px] text-white/30">{task.assigned_to}</span>
                        )}
                        {!task.assigned_to && (
                          <span className="text-[10px] text-white/20 italic">unassigned</span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-white/30 text-xs text-center py-4">No active tasks</p>
              )}
            </div>
          </div>
        </div>
      )}

      {expanded && (
        <div className="flex flex-col lg:flex-row">
          {/* Map - Monument Valley Style */}
          <div className="flex-1 p-4">
            <div className="relative w-full" style={{ aspectRatio: '680/390' }}>
              {/* Background */}
              <div
                className="absolute inset-0 rounded-xl overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${MV_COLORS.cream} 0%, ${MV_COLORS.sky}40 100%)` }}
              >
                {/* Rooms Grid */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-2 p-3">
                  {Object.entries(ROOMS).map(([id, room]) => (
                    <div
                      key={id}
                      className="relative rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-[1.02]"
                      style={{
                        boxShadow: `0 4px 12px ${MV_COLORS.shadow}`,
                      }}
                    >
                      {/* Room Background Image */}
                      <Image
                        src={room.image}
                        alt={room.label}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 33vw, 200px"
                      />
                      {/* Room Label Overlay */}
                      <div
                        className="absolute bottom-0 left-0 right-0 py-1.5 px-2 text-center"
                        style={{
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.5))',
                        }}
                      >
                        <span className="text-white text-xs font-medium drop-shadow-md">
                          {room.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Agents Layer */}
                <div className="absolute inset-0 pointer-events-none">
                  {agents.map((agent) => {
                    const roomIndex = Object.keys(ROOMS).indexOf(agent.room);
                    const col = roomIndex % 3;
                    const row = Math.floor(roomIndex / 3);
                    // Position within grid cell
                    const baseX = (col * 33.33) + 16.66;
                    const baseY = (row * 50) + 25;
                    // Add some offset based on agent position for movement
                    const offsetX = ((agent.position.x % 40) - 20) * 0.3;
                    const offsetY = ((agent.position.y % 40) - 20) * 0.3;

                    return (
                      <div
                        key={agent.id}
                        className="absolute pointer-events-auto cursor-pointer transition-all duration-300 hover:scale-110"
                        style={{
                          left: `calc(${baseX}% + ${offsetX}px)`,
                          top: `calc(${baseY}% + ${offsetY}px)`,
                          transform: 'translate(-50%, -50%)',
                          zIndex: selectedAgent?.id === agent.id ? 20 : 10,
                        }}
                        onClick={() => setSelectedAgent(agent)}
                      >
                        {/* Working glow */}
                        {agent.status === 'working' && (
                          <div
                            className="absolute inset-0 rounded-full animate-pulse"
                            style={{
                              background: `radial-gradient(circle, ${agent.color}60 0%, transparent 70%)`,
                              transform: 'scale(2)',
                            }}
                          />
                        )}

                        {/* Agent Avatar */}
                        <div
                          className="relative w-12 h-12 rounded-full overflow-hidden border-2 shadow-lg"
                          style={{
                            borderColor: selectedAgent?.id === agent.id ? '#fff' : agent.color,
                            boxShadow: selectedAgent?.id === agent.id
                              ? '0 0 0 2px #fff, 0 4px 12px rgba(0,0,0,0.3)'
                              : `0 4px 12px ${MV_COLORS.shadow}`,
                          }}
                        >
                          <Image
                            src={agent.image}
                            alt={agent.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>

                        {/* Status dot */}
                        <div
                          className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow ${
                            agent.status === 'working' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                          }`}
                        />

                        {/* Task count badge */}
                        {agent.taskCount > 0 && (
                          <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold shadow">
                            {agent.taskCount}
                          </div>
                        )}

                        {/* Name */}
                        <div
                          className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
                          style={{ color: MV_COLORS.stone }}
                        >
                          <span className="text-[10px] font-medium bg-white/80 px-1.5 py-0.5 rounded shadow-sm">
                            {agent.name.split(' ')[0]}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px]" style={{ color: MV_COLORS.stone }}>
                <div className="flex items-center gap-3 bg-white/80 px-2 py-1 rounded">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                    Working
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-amber-400 rounded-full" />
                    Idle
                  </span>
                </div>
                <span className="bg-white/80 px-2 py-1 rounded opacity-60">Click agent to assign task</span>
              </div>
            </div>
          </div>

          {/* Agent Panel */}
          <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col bg-white/[0.02]">
            {selectedAgent ? (
              <>
                {/* Agent info */}
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="relative w-12 h-12 rounded-xl overflow-hidden"
                      style={{ backgroundColor: `${selectedAgent.color}20` }}
                    >
                      <Image
                        src={selectedAgent.image}
                        alt={selectedAgent.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                      {/* Level badge */}
                      <div 
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg border border-white/20"
                        style={{ 
                          backgroundColor: selectedAgent.level >= 25 ? '#E040FB' : 
                                         selectedAgent.level >= 10 ? '#00BCD4' : 
                                         selectedAgent.level >= 5 ? '#4CAF50' : '#2196F3'
                        }}
                      >
                        {selectedAgent.level}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-medium text-sm">{selectedAgent.name}</h3>
                      <p className="text-white/40 text-xs">{selectedAgent.role}</p>
                    </div>
                    <button
                      onClick={() => setSelectedAgent(null)}
                      className="text-white/30 hover:text-white/60 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* XP Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-white/50">Level {selectedAgent.level}</span>
                      <span className="text-cyan-400">{selectedAgent.xp} XP</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${(selectedAgent.xp % 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] mt-1">
                      <span className="text-white/30">{100 - (selectedAgent.xp % 100)} XP to level {selectedAgent.level + 1}</span>
                      <span className="text-white/30">{selectedAgent.totalTasksDone} tasks</span>
                    </div>
                  </div>

                  {/* Badges */}
                  {selectedAgent.badges.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {selectedAgent.badges.slice(0, 6).map((badge) => {
                        const badgeInfo: Record<string, { icon: string; name: string }> = {
                          'first-task': { icon: '🎯', name: 'First Steps' },
                          'task-10': { icon: '🔥', name: 'Warming Up' },
                          'task-50': { icon: '⭐', name: 'Seasoned' },
                          'task-100': { icon: '💯', name: 'Centurion' },
                          'task-500': { icon: '🏆', name: 'Legend' },
                          'level-5': { icon: '🌟', name: 'Rising Star' },
                          'level-10': { icon: '💎', name: 'Expert' },
                          'level-25': { icon: '👑', name: 'Master' },
                          'streak-7': { icon: '🔗', name: 'Week Warrior' },
                          'streak-30': { icon: '⛓️', name: 'Monthly' },
                          'night-owl': { icon: '🦉', name: 'Night Owl' },
                          'early-bird': { icon: '🐦', name: 'Early Bird' },
                          'speed-demon': { icon: '⚡', name: 'Speed Demon' },
                        };
                        const info = badgeInfo[badge] || { icon: '🏅', name: badge };
                        return (
                          <span
                            key={badge}
                            title={info.name}
                            className="text-sm cursor-default hover:scale-125 transition-transform"
                          >
                            {info.icon}
                          </span>
                        );
                      })}
                      {selectedAgent.badges.length > 6 && (
                        <span className="text-[10px] text-white/30">+{selectedAgent.badges.length - 6}</span>
                      )}
                    </div>
                  )}

                  {/* Streak indicator */}
                  {selectedAgent.currentStreak > 0 && (
                    <div className="flex items-center gap-1.5 mb-2 text-[10px]">
                      <span className="text-orange-400">🔥</span>
                      <span className="text-orange-400 font-medium">{selectedAgent.currentStreak} day streak</span>
                      {selectedAgent.longestStreak > selectedAgent.currentStreak && (
                        <span className="text-white/30">(best: {selectedAgent.longestStreak})</span>
                      )}
                    </div>
                  )}

                  {/* Status + Mood */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${
                      selectedAgent.status === 'working'
                        ? 'bg-emerald-400/10 text-emerald-400'
                        : 'bg-amber-400/10 text-amber-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        selectedAgent.status === 'working' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                      }`} />
                      {selectedAgent.status === 'working' ? 'Al lavoro' : 'Disponibile'}
                    </div>
                    {/* Mood indicator */}
                    {(() => {
                      const pendingCount = tasks.filter(t => 
                        t.assigned_to === selectedAgent.id && 
                        (t.status === 'pending' || t.status === 'in_progress')
                      ).length;
                      const lastSeenMs = selectedAgent.lastSeen 
                        ? Date.now() - new Date(selectedAgent.lastSeen).getTime() 
                        : null;
                      const mood = calculateAgentMood({
                        pendingTaskCount: pendingCount,
                        totalTasksDone: selectedAgent.totalTasksDone,
                        currentStreak: selectedAgent.currentStreak,
                        lastSeenMs,
                        isWorking: selectedAgent.status === 'working',
                      });
                      return (
                        <div 
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                          style={{ backgroundColor: `${mood.color}20`, color: mood.color }}
                          title={mood.label}
                        >
                          <span>{mood.emoji}</span>
                          <span className="hidden sm:inline">{mood.label}</span>
                        </div>
                      );
                    })()}
                    {selectedAgent.lastSeen && (
                      <span className="text-[10px] text-white/30">
                        Last: {new Date(selectedAgent.lastSeen).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {selectedAgent.currentTask && (
                    <p className="mt-2 text-xs text-white/50 truncate">
                      Task: {selectedAgent.currentTask.slice(0, 40)}...
                    </p>
                  )}

                  {/* Mode toggle: Tasks / Chat / Activity / Leaderboard */}
                  <div className="mt-3 flex gap-1 bg-white/5 rounded-lg p-0.5">
                    <button
                      onClick={() => setPanelMode('tasks')}
                      className={`flex-1 py-1.5 px-2 rounded text-xs transition-colors ${
                        panelMode === 'tasks' ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/40 hover:text-white/60'
                      }`}
                    >
                      Tasks
                    </button>
                    <button
                      onClick={() => setPanelMode('chat')}
                      className={`flex-1 py-1.5 px-2 rounded text-xs transition-colors ${
                        panelMode === 'chat' ? 'bg-purple-500/20 text-purple-400' : 'text-white/40 hover:text-white/60'
                      }`}
                    >
                      Chat
                    </button>
                    <button
                      onClick={() => setPanelMode('activity')}
                      className={`flex-1 py-1.5 px-2 rounded text-xs transition-colors ${
                        panelMode === 'activity' ? 'bg-amber-500/20 text-amber-400' : 'text-white/40 hover:text-white/60'
                      }`}
                    >
                      Activity
                    </button>
                    <button
                      onClick={() => setPanelMode('leaderboard')}
                      className={`flex-1 py-1.5 px-2 rounded text-xs transition-colors ${
                        panelMode === 'leaderboard' ? 'bg-yellow-500/20 text-yellow-400' : 'text-white/40 hover:text-white/60'
                      }`}
                      title="Agent Leaderboard"
                    >
                      🏆
                    </button>
                  </div>
                </div>

                {panelMode === 'chat' && (
                  <>
                    {/* TTS toggle header */}
                    {tts.isSupported && (
                      <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
                        <span className="text-[10px] text-white/40">Read aloud</span>
                        <button
                          onClick={() => toggleTTS(!ttsEnabled)}
                          className={`p-1.5 rounded transition-colors ${
                            ttsEnabled 
                              ? 'bg-purple-500/20 text-purple-400' 
                              : 'bg-white/5 text-white/30 hover:text-white/50'
                          }`}
                          title={ttsEnabled ? 'TTS enabled - click messages to hear' : 'Enable TTS'}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                        </button>
                      </div>
                    )}
                    {/* Chat history */}
                    <div className="flex-1 overflow-y-auto max-h-48 p-2 space-y-2">
                      {chatHistory.filter(m => m.agentId === selectedAgent.id).length > 0 ? (
                        chatHistory.filter(m => m.agentId === selectedAgent.id).map((msg, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded-lg text-xs ${
                              msg.role === 'user'
                                ? 'bg-cyan-500/10 text-cyan-200 ml-4'
                                : 'bg-purple-500/10 text-purple-200 mr-4'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] text-white/30 mb-1">
                              <span>
                                {msg.role === 'user' ? 'You' : selectedAgent.name} • {new Date(msg.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {/* TTS button for agent messages */}
                              {msg.role === 'agent' && ttsEnabled && tts.isSupported && (
                                <button
                                  onClick={() => speakMessage(msg.content, idx)}
                                  className={`p-1 rounded transition-colors ${
                                    speakingMessageId === idx
                                      ? 'bg-purple-500/30 text-purple-300 animate-pulse'
                                      : 'hover:bg-white/10 text-white/40 hover:text-white/60'
                                  }`}
                                  title={speakingMessageId === idx ? 'Stop' : 'Read aloud'}
                                >
                                  {speakingMessageId === idx ? (
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                      <rect x="6" y="6" width="4" height="12" />
                                      <rect x="14" y="6" width="4" height="12" />
                                    </svg>
                                  ) : (
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                    </svg>
                                  )}
                                </button>
                              )}
                            </div>
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                          </div>
                        ))
                      ) : (
                        <p className="text-white/30 text-xs text-center py-4">
                          Ask {selectedAgent.name.split(' ')[0]} a question
                        </p>
                      )}
                      {isAsking && (
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-200 mr-4 text-xs">
                          <div className="flex items-center gap-2">
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span>{selectedAgent.name} is thinking...</span>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Question input */}
                    <div className="p-3 border-t border-white/10">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !isAsking && handleAskQuestion()}
                          placeholder={`Ask ${selectedAgent.name.split(' ')[0]}...`}
                          className="flex-1 bg-white/5 border border-white/10 text-white px-3 py-2 rounded-lg text-xs placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                          disabled={isAsking}
                        />
                        <button
                          onClick={handleAskQuestion}
                          disabled={!message.trim() || isAsking}
                          className="px-3 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isAsking ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {panelMode === 'tasks' && (
                  <>
                    {/* Agent tasks */}
                    <div className="flex-1 overflow-y-auto max-h-40 p-2">
                      {selectedAgentTasks.length > 0 ? (
                        <div className="space-y-1">
                          {selectedAgentTasks.slice(0, 5).map(task => (
                            <div key={task.id} className="p-2 rounded-lg bg-white/5 text-xs">
                              <div className="text-white/70 truncate">{task.description}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-1.5 py-0.5 rounded ${
                                  task.status === 'in_progress' ? 'bg-blue-400/20 text-blue-400' :
                                  task.status === 'pending' ? 'bg-amber-400/20 text-amber-400' :
                                  task.status === 'done' ? 'bg-emerald-400/20 text-emerald-400' :
                                  'bg-white/10 text-white/50'
                                }`}>
                                  {task.status}
                                </span>
                                <span className="text-white/30">{task.priority}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-white/30 text-xs text-center py-4">
                          Nessun task assegnato
                        </p>
                      )}
                    </div>

                    {/* New task form */}
                    <div className="p-3 border-t border-white/10">
                      <label className="block text-xs text-white/40 mb-1">
                        Nuovo task per {selectedAgent.name.split(' ')[0]}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
                          placeholder="Descrivi il task..."
                          className="flex-1 bg-white/5 border border-white/10 text-white px-3 py-2 rounded-lg text-xs placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
                        />
                        <button
                          onClick={handleCreateTask}
                          disabled={!message.trim() || isCreatingTask}
                          className="px-3 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isCreatingTask ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {panelMode === 'activity' && (
                  <>
                    {/* Activity log */}
                    <div className="flex-1 overflow-y-auto max-h-48 p-2 space-y-2">
                      {activities.filter(a => 
                        // Filter by selected agent (if actor matches)
                        a.actor.toLowerCase().includes(selectedAgent.name.split(' ')[0].toLowerCase()) ||
                        a.actor.toLowerCase().includes(selectedAgent.id)
                      ).length > 0 ? (
                        activities.filter(a => 
                          a.actor.toLowerCase().includes(selectedAgent.name.split(' ')[0].toLowerCase()) ||
                          a.actor.toLowerCase().includes(selectedAgent.id)
                        ).slice(0, 10).map((activity) => (
                          <div
                            key={activity.id}
                            className="p-2 rounded-lg bg-white/5 text-xs"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                activity.type === 'deploy' ? 'bg-emerald-400' :
                                activity.type.includes('approved') ? 'bg-green-400' :
                                activity.type.includes('rejected') ? 'bg-red-400' :
                                activity.type.includes('image') ? 'bg-purple-400' :
                                activity.type.includes('book') ? 'bg-amber-400' :
                                'bg-cyan-400'
                              }`} />
                              <span className="text-white/70 truncate">{activity.title}</span>
                            </div>
                            <div className="text-white/40 text-[10px] truncate">{activity.description}</div>
                            <div className="text-white/20 text-[10px] mt-1">
                              {new Date(activity.created_at).toLocaleString('it-IT', { 
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                              })}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-white/30 text-xs">
                            No recent activity for {selectedAgent.name.split(' ')[0]}
                          </p>
                          <p className="text-white/20 text-[10px] mt-1">
                            Showing all activity:
                          </p>
                          {activities.slice(0, 5).map((activity) => (
                            <div
                              key={activity.id}
                              className="p-2 mt-2 rounded-lg bg-white/5 text-xs text-left"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                <span className="text-white/70 truncate">{activity.title}</span>
                              </div>
                              <div className="text-white/40 text-[10px]">{activity.actor}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {panelMode === 'leaderboard' && (
                  <>
                    {/* Agent Leaderboard */}
                    <div className="flex-1 overflow-y-auto max-h-56 p-2">
                      <div className="text-xs text-white/50 mb-2 text-center">🏆 Agent Leaderboard</div>
                      <AgentLeaderboard
                        agents={agents.map(a => ({
                          id: a.id,
                          name: a.name,
                          xp: a.xp,
                          level: a.level,
                          totalTasksDone: a.totalTasksDone,
                          currentStreak: a.currentStreak,
                          badges: a.badges,
                          image: a.image || '/house/agents/automation.png',
                          status: a.status,
                        }))}
                        onSelectAgent={(agentId) => {
                          const agent = agents.find(a => a.id === agentId);
                          if (agent) {
                            setSelectedAgent(agent);
                            setPanelMode('tasks');
                          }
                        }}
                        compact
                      />
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6 text-white/30 text-center text-sm">
                <div>
                  <span className="text-3xl mb-3 block">👆</span>
                  <p>Clicca un agente<br />per assegnare task o fare domande</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Agent quick buttons */}
      {expanded && (
        <div className="px-4 py-3 border-t border-white/10 bg-white/[0.01]">
          <div className="flex flex-wrap gap-2">
            {agents.map(agent => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={`px-2 py-1 rounded-lg text-xs flex items-center gap-2 transition-all border ${
                  selectedAgent?.id === agent.id
                    ? 'bg-white/10 text-white border-white/20'
                    : 'bg-white/5 text-white/50 border-transparent hover:bg-white/10 hover:text-white/70'
                }`}
              >
                <div className="relative w-5 h-5 rounded-full overflow-hidden">
                  <Image
                    src={agent.image}
                    alt={agent.name}
                    fill
                    className="object-cover"
                    sizes="20px"
                  />
                </div>
                <span>{agent.name.split(' ')[0]}</span>
                {agent.status === 'working' && (
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

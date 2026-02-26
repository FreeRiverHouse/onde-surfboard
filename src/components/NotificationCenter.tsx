'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

// Sound preference types
type SoundType = 'none' | 'subtle' | 'chime' | 'alert'

interface SoundPreferences {
  enabled: boolean
  type: SoundType
  volume: number // 0-1
}

const DEFAULT_SOUND_PREFS: SoundPreferences = {
  enabled: true,
  type: 'subtle',
  volume: 0.5,
}

// Desktop notification preference types
type DesktopNotificationPermission = 'default' | 'granted' | 'denied'

interface DesktopNotificationPrefs {
  enabled: boolean
  showPreview: boolean // Show notification content or just "New notification"
}

const DEFAULT_DESKTOP_PREFS: DesktopNotificationPrefs = {
  enabled: false,
  showPreview: true,
}

// DND (Do Not Disturb) preference types
interface DndPreferences {
  enabled: boolean
  scheduleEnabled: boolean
  startHour: number // 0-23
  startMinute: number // 0-59
  endHour: number // 0-23
  endMinute: number // 0-59
  allowUrgent: boolean // Allow critical/urgent notifications even in DND
}

const DEFAULT_DND_PREFS: DndPreferences = {
  enabled: false,
  scheduleEnabled: false,
  startHour: 22,
  startMinute: 0,
  endHour: 8,
  endMinute: 0,
  allowUrgent: true,
}

// Hook for managing desktop notification permission and preferences
function useDesktopNotifications() {
  const [permission, setPermission] = useState<DesktopNotificationPermission>('default')
  const [prefs, setPrefs] = useState<DesktopNotificationPrefs>(DEFAULT_DESKTOP_PREFS)

  // Check initial permission and load prefs
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return

    setPermission(Notification.permission as DesktopNotificationPermission)

    try {
      const stored = localStorage.getItem('desktop-notification-prefs')
      if (stored) {
        setPrefs({ ...DEFAULT_DESKTOP_PREFS, ...JSON.parse(stored) })
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result as DesktopNotificationPermission)

      if (result === 'granted') {
        // Auto-enable on grant
        setPrefs(prev => {
          const next = { ...prev, enabled: true }
          try {
            localStorage.setItem('desktop-notification-prefs', JSON.stringify(next))
          } catch { /* ignore */ }
          return next
        })
        return true
      }
      return false
    } catch (err) {
      console.error('Failed to request notification permission:', err)
      return false
    }
  }, [])

  // Update preferences
  const updatePrefs = useCallback((updates: Partial<DesktopNotificationPrefs>) => {
    setPrefs(prev => {
      const next = { ...prev, ...updates }
      try {
        localStorage.setItem('desktop-notification-prefs', JSON.stringify(next))
      } catch { /* ignore */ }
      return next
    })
  }, [])

  // Show a desktop notification
  const showNotification = useCallback((
    title: string,
    options?: {
      body?: string
      icon?: string
      tag?: string
      onClick?: () => void
    }
  ) => {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      permission !== 'granted' ||
      !prefs.enabled
    ) {
      return null
    }

    try {
      const notification = new Notification(
        prefs.showPreview ? title : '🔔 New notification',
        {
          body: prefs.showPreview ? options?.body : 'Click to view',
          icon: options?.icon || '/favicon.ico',
          tag: options?.tag,
          badge: '/favicon.ico',
          silent: true, // We handle our own sounds
        }
      )

      if (options?.onClick) {
        notification.onclick = () => {
          options.onClick?.()
          notification.close()
          window.focus()
        }
      }

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000)

      return notification
    } catch (err) {
      console.warn('Failed to show desktop notification:', err)
      return null
    }
  }, [permission, prefs])

  const isSupported = typeof window !== 'undefined' && 'Notification' in window

  return {
    permission,
    prefs,
    isSupported,
    requestPermission,
    updatePrefs,
    showNotification,
  }
}

const SOUND_LABELS: Record<SoundType, string> = {
  none: '🔇 None',
  subtle: '🔔 Subtle',
  chime: '🎵 Chime',
  alert: '🚨 Alert',
}

// Sound generation using Web Audio API
function playNotificationSound(type: SoundType, volume: number): void {
  if (type === 'none' || typeof window === 'undefined') return

  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    gainNode.gain.value = volume * 0.3 // Scale down for comfort

    const now = audioContext.currentTime

    switch (type) {
      case 'subtle':
        // Soft ping - single high note fading out
        oscillator.frequency.setValueAtTime(880, now)
        oscillator.frequency.exponentialRampToValueAtTime(660, now + 0.1)
        gainNode.gain.setValueAtTime(volume * 0.2, now)
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
        oscillator.start(now)
        oscillator.stop(now + 0.15)
        break

      case 'chime':
        // Pleasant two-tone chime
        oscillator.frequency.setValueAtTime(523.25, now) // C5
        oscillator.frequency.setValueAtTime(659.25, now + 0.1) // E5
        gainNode.gain.setValueAtTime(volume * 0.25, now)
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25)
        oscillator.start(now)
        oscillator.stop(now + 0.25)
        break

      case 'alert':
        // Attention-grabbing double beep
        oscillator.frequency.setValueAtTime(1046.5, now) // C6
        gainNode.gain.setValueAtTime(volume * 0.3, now)
        gainNode.gain.setValueAtTime(0.01, now + 0.08)
        gainNode.gain.setValueAtTime(volume * 0.3, now + 0.12)
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
        oscillator.start(now)
        oscillator.stop(now + 0.2)
        break
    }

    // Cleanup
    setTimeout(() => {
      audioContext.close()
    }, 500)
  } catch (err) {
    console.warn('Failed to play notification sound:', err)
  }
}

// Notification persistence storage keys
const STORAGE_KEYS = {
  dismissed: 'notification-dismissed-ids',
  read: 'notification-read-ids',
  lastCleanup: 'notification-last-cleanup',
}

// Max age for persisted data (7 days)
const MAX_PERSIST_AGE_MS = 7 * 24 * 60 * 60 * 1000

// Hook for notification persistence (dismissed + read status)
function useNotificationPersistence() {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      // Check if cleanup is needed (once per day)
      const lastCleanup = localStorage.getItem(STORAGE_KEYS.lastCleanup)
      const needsCleanup = !lastCleanup || Date.now() - parseInt(lastCleanup) > 24 * 60 * 60 * 1000

      const dismissedRaw = localStorage.getItem(STORAGE_KEYS.dismissed)
      const readRaw = localStorage.getItem(STORAGE_KEYS.read)

      if (dismissedRaw) {
        const parsed: { ids: string[], timestamp: number } = JSON.parse(dismissedRaw)
        // Only use if not too old
        if (Date.now() - parsed.timestamp < MAX_PERSIST_AGE_MS) {
          setDismissedIds(new Set(parsed.ids))
        } else if (needsCleanup) {
          localStorage.removeItem(STORAGE_KEYS.dismissed)
        }
      }

      if (readRaw) {
        const parsed: { ids: string[], timestamp: number } = JSON.parse(readRaw)
        if (Date.now() - parsed.timestamp < MAX_PERSIST_AGE_MS) {
          setReadIds(new Set(parsed.ids))
        } else if (needsCleanup) {
          localStorage.removeItem(STORAGE_KEYS.read)
        }
      }

      if (needsCleanup) {
        localStorage.setItem(STORAGE_KEYS.lastCleanup, String(Date.now()))
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  // Save dismissed IDs
  const saveDismissed = useCallback((ids: Set<string>) => {
    try {
      // Limit to most recent 100 entries to prevent unbounded growth
      const idsArray = [...ids].slice(-100)
      localStorage.setItem(STORAGE_KEYS.dismissed, JSON.stringify({
        ids: idsArray,
        timestamp: Date.now(),
      }))
    } catch {
      // Ignore storage errors
    }
  }, [])

  // Save read IDs
  const saveRead = useCallback((ids: Set<string>) => {
    try {
      const idsArray = [...ids].slice(-200)
      localStorage.setItem(STORAGE_KEYS.read, JSON.stringify({
        ids: idsArray,
        timestamp: Date.now(),
      }))
    } catch {
      // Ignore storage errors
    }
  }, [])

  const markDismissed = useCallback((id: string) => {
    setDismissedIds(prev => {
      const next = new Set(prev).add(id)
      saveDismissed(next)
      return next
    })
  }, [saveDismissed])

  const markRead = useCallback((id: string) => {
    setReadIds(prev => {
      const next = new Set(prev).add(id)
      saveRead(next)
      return next
    })
  }, [saveRead])

  const markAllRead = useCallback((ids: string[]) => {
    setReadIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.add(id))
      saveRead(next)
      return next
    })
  }, [saveRead])

  const isDismissed = useCallback((id: string) => dismissedIds.has(id), [dismissedIds])
  const isRead = useCallback((id: string) => readIds.has(id), [readIds])

  const clearAll = useCallback(() => {
    setDismissedIds(new Set())
    setReadIds(new Set())
    try {
      localStorage.removeItem(STORAGE_KEYS.dismissed)
      localStorage.removeItem(STORAGE_KEYS.read)
    } catch {
      // Ignore
    }
  }, [])

  return {
    isDismissed,
    isRead,
    markDismissed,
    markRead,
    markAllRead,
    clearAll,
    dismissedCount: dismissedIds.size,
    readCount: readIds.size,
  }
}

// Hook for managing sound preferences
function useSoundPreferences() {
  const [prefs, setPrefs] = useState<SoundPreferences>(DEFAULT_SOUND_PREFS)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem('notification-sound-prefs')
      if (stored) {
        setPrefs({ ...DEFAULT_SOUND_PREFS, ...JSON.parse(stored) })
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  const updatePrefs = useCallback((updates: Partial<SoundPreferences>) => {
    setPrefs(prev => {
      const next = { ...prev, ...updates }
      try {
        localStorage.setItem('notification-sound-prefs', JSON.stringify(next))
      } catch {
        // Ignore storage errors
      }
      return next
    })
  }, [])

  const playSound = useCallback(() => {
    if (prefs.enabled && prefs.type !== 'none') {
      playNotificationSound(prefs.type, prefs.volume)
    }
  }, [prefs])

  const testSound = useCallback(() => {
    playNotificationSound(prefs.type, prefs.volume)
  }, [prefs])

  return { prefs, updatePrefs, playSound, testSound }
}

// Hook for DND (Do Not Disturb) mode with quiet hours
function useDndMode() {
  const [prefs, setPrefs] = useState<DndPreferences>(DEFAULT_DND_PREFS)

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem('notification-dnd-prefs')
      if (stored) {
        setPrefs({ ...DEFAULT_DND_PREFS, ...JSON.parse(stored) })
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  const updatePrefs = useCallback((updates: Partial<DndPreferences>) => {
    setPrefs(prev => {
      const next = { ...prev, ...updates }
      try {
        localStorage.setItem('notification-dnd-prefs', JSON.stringify(next))
      } catch {
        // Ignore storage errors
      }
      return next
    })
  }, [])

  // Check if currently in quiet hours
  const isInQuietHours = useCallback((): boolean => {
    if (!prefs.scheduleEnabled) return false

    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const startMinutes = prefs.startHour * 60 + prefs.startMinute
    const endMinutes = prefs.endHour * 60 + prefs.endMinute

    // Handle overnight schedules (e.g., 22:00 - 08:00)
    if (startMinutes > endMinutes) {
      // Overnight: quiet if after start OR before end
      return currentMinutes >= startMinutes || currentMinutes < endMinutes
    } else {
      // Same day: quiet if between start and end
      return currentMinutes >= startMinutes && currentMinutes < endMinutes
    }
  }, [prefs.scheduleEnabled, prefs.startHour, prefs.startMinute, prefs.endHour, prefs.endMinute])

  // Check if notifications should be muted (DND active)
  const isMuted = useCallback((isUrgent = false): boolean => {
    // If DND is disabled, never muted
    if (!prefs.enabled) return false

    // If allow urgent and notification is urgent, not muted
    if (prefs.allowUrgent && isUrgent) return false

    // If schedule is enabled, check quiet hours
    if (prefs.scheduleEnabled) {
      return isInQuietHours()
    }

    // DND enabled without schedule = always muted
    return true
  }, [prefs.enabled, prefs.allowUrgent, prefs.scheduleEnabled, isInQuietHours])

  // Format time for display
  const formatTime = useCallback((hour: number, minute: number): string => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }, [])

  return {
    prefs,
    updatePrefs,
    isInQuietHours,
    isMuted,
    formatTime,
  }
}

// Export notifications as JSON
function exportNotificationsAsJson(notifications: Notification[]): void {
  const data = {
    exportedAt: new Date().toISOString(),
    count: notifications.length,
    notifications: notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      timestamp: n.timestamp,
      read: n.read,
      source: n.source,
      actionUrl: n.actionUrl,
      metadata: n.metadata,
    })),
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `notifications-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Export notifications as CSV
function exportNotificationsAsCsv(notifications: Notification[]): void {
  const headers = ['ID', 'Type', 'Title', 'Message', 'Timestamp', 'Read', 'Source']
  const escapeCSV = (str: string) => {
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const rows = notifications.map(n => [
    n.id,
    n.type,
    escapeCSV(n.title),
    escapeCSV(n.message),
    n.timestamp,
    n.read ? 'Yes' : 'No',
    n.source || '',
  ].join(','))

  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `notifications-${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Hook for pull-to-refresh gesture on mobile
function usePullToRefresh(
  onRefresh: () => Promise<void> | void,
  { threshold = 80, maxPull = 120 } = {}
) {
  const [pullState, setPullState] = useState<{
    startY: number
    currentY: number
    pulling: boolean
  } | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only start pull if we're at the top of the scroll container
    const container = containerRef.current
    if (!container || container.scrollTop > 0) return

    setPullState({
      startY: e.touches[0].clientY,
      currentY: e.touches[0].clientY,
      pulling: true,
    })
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pullState?.pulling || isRefreshing) return

    const deltaY = e.touches[0].clientY - pullState.startY

    // Only allow pulling down, not up
    if (deltaY < 0) {
      setPullState(null)
      return
    }

    // Apply resistance to make it feel natural
    const resistedDelta = Math.min(deltaY * 0.5, maxPull)

    setPullState(prev => prev ? {
      ...prev,
      currentY: e.touches[0].clientY,
    } : null)

    // Trigger haptic at threshold
    if (resistedDelta >= threshold && deltaY * 0.5 < threshold + 5) {
      triggerHapticFeedback('light')
    }
  }, [pullState?.pulling, pullState?.startY, isRefreshing, maxPull, threshold])

  const handleTouchEnd = useCallback(async () => {
    if (!pullState?.pulling) return

    const deltaY = pullState.currentY - pullState.startY
    const resistedDelta = Math.min(deltaY * 0.5, maxPull)

    if (resistedDelta >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      triggerHapticFeedback('success')

      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }

    setPullState(null)
  }, [pullState, threshold, maxPull, isRefreshing, onRefresh])

  const pullDistance = pullState?.pulling
    ? Math.min((pullState.currentY - pullState.startY) * 0.5, maxPull)
    : 0

  const pullProgress = Math.min(pullDistance / threshold, 1)

  return {
    containerRef,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
    },
    pullDistance,
    pullProgress,
    isPulling: pullState?.pulling || false,
    isRefreshing,
    canRefresh: pullProgress >= 1,
  }
}

interface NotificationAction {
  label: string
  url?: string
  action?: string // For custom actions like 'dismiss', 'snooze', etc.
  style?: 'primary' | 'secondary' | 'danger'
}

// Snooze duration options
const SNOOZE_OPTIONS = [
  { label: '5 min', minutes: 5 },
  { label: '15 min', minutes: 15 },
  { label: '1 hour', minutes: 60 },
  { label: '4 hours', minutes: 240 },
  { label: 'Tomorrow 9am', minutes: -1 }, // Special case
] as const

type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

interface Notification {
  id: string
  type: 'alert' | 'event' | 'info' | 'success' | 'warning' | 'agent' | 'activity'
  title: string
  message: string
  timestamp: string
  read: boolean
  source?: string
  actionUrl?: string
  actions?: NotificationAction[]
  priority?: NotificationPriority
  snoozedUntil?: string // ISO timestamp when snooze expires
  metadata?: Record<string, unknown>
}

interface NotificationsData {
  notifications: Notification[]
  unreadCount: number
}

const TYPE_CONFIG = {
  alert: {
    icon: '🚨',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
  },
  warning: {
    icon: '⚠️',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  event: {
    icon: '📅',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  info: {
    icon: '💡',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
  },
  success: {
    icon: '✅',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  agent: {
    icon: '🤖',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
  },
  activity: {
    icon: '⚡',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/30',
  },
}

function formatTimeAgo(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then

  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

// Haptic feedback helper using Vibration API
function triggerHapticFeedback(pattern: 'light' | 'medium' | 'success' | 'warning' = 'light') {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return

  try {
    switch (pattern) {
      case 'light':
        navigator.vibrate(10) // Quick tap
        break
      case 'medium':
        navigator.vibrate(25) // Slightly longer
        break
      case 'success':
        navigator.vibrate([10, 50, 20]) // Double tap pattern
        break
      case 'warning':
        navigator.vibrate([30, 30, 30]) // Warning pattern
        break
    }
  } catch {
    // Vibration API might fail silently on some devices
  }
}

// Hook for swipe-to-dismiss on touch devices
function useSwipeToDismiss(onDismiss: () => void, threshold = 100) {
  const [touchState, setTouchState] = useState<{
    startX: number
    currentX: number
    swiping: boolean
    passedThreshold: boolean // Track if we've already vibrated at threshold
  } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchState({
      startX: e.touches[0].clientX,
      currentX: e.touches[0].clientX,
      swiping: true,
      passedThreshold: false,
    })
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchState?.swiping) return

    const newX = e.touches[0].clientX
    const deltaX = newX - touchState.startX

    // Trigger haptic feedback when crossing threshold
    if (!touchState.passedThreshold && deltaX < -threshold) {
      triggerHapticFeedback('medium')
      setTouchState(prev => prev ? {
        ...prev,
        currentX: newX,
        passedThreshold: true,
      } : null)
    } else {
      setTouchState(prev => prev ? {
        ...prev,
        currentX: newX,
      } : null)
    }
  }, [touchState?.swiping, touchState?.startX, touchState?.passedThreshold, threshold])

  const handleTouchEnd = useCallback(() => {
    if (!touchState?.swiping) return

    const deltaX = touchState.currentX - touchState.startX

    // If swiped left past threshold, dismiss with success haptic
    if (deltaX < -threshold) {
      triggerHapticFeedback('success')
      onDismiss()
    }

    setTouchState(null)
  }, [touchState, threshold, onDismiss])

  const swipeOffset = touchState?.swiping
    ? Math.min(0, touchState.currentX - touchState.startX)
    : 0

  const swipeProgress = Math.abs(swipeOffset) / threshold

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
    },
    swipeOffset,
    swipeProgress,
    isSwiping: touchState?.swiping || false,
  }
}

function NotificationItem({
  notification,
  onMarkRead,
  onDismiss,
  onSnooze,
  isSelected = false,
  registerRef,
}: {
  notification: Notification
  onMarkRead: (id: string) => void
  onDismiss: (id: string) => void
  onSnooze?: (id: string, minutes: number) => void
  isSelected?: boolean
  registerRef?: (id: string, el: HTMLDivElement | null) => void
}) {
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false)
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.info
  const { handlers, swipeOffset, swipeProgress, isSwiping } = useSwipeToDismiss(
    () => onDismiss(notification.id),
    100
  )

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      ref={(el) => registerRef?.(notification.id, el)}
    >
      {/* Swipe background indicator (visible when swiping) */}
      {isSwiping && (
        <div
          className="absolute inset-0 flex items-center justify-end pr-4 rounded-xl bg-red-500/30"
          style={{ opacity: Math.min(swipeProgress, 1) }}
        >
          <span className="text-red-400 text-sm font-medium flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Dismiss
          </span>
        </div>
      )}

      {/* Main notification content */}
      <div
        {...handlers}
        className={`
          relative flex items-start gap-3 p-3 rounded-xl
          ${config.bg} ${config.border} border
          ${!notification.read ? 'ring-1 ring-white/20' : 'opacity-80'}
          hover:opacity-100 group
          ${isSwiping ? '' : 'transition-all duration-200'}
          touch-pan-y
          ${isSelected ? 'ring-2 ring-cyan-400/50 bg-cyan-500/10' : ''}
        `}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          opacity: isSwiping ? 1 - (swipeProgress * 0.3) : undefined,
        }}
        onClick={() => !notification.read && onMarkRead(notification.id)}
      >
        {/* Unread indicator */}
        {!notification.read && (
          <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        )}

        {/* Priority indicator */}
        {notification.priority && notification.priority !== 'normal' && (
          <div className={`absolute top-3 left-3 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded ${notification.priority === 'urgent' ? 'bg-red-500 text-white animate-pulse' :
            notification.priority === 'high' ? 'bg-orange-500/80 text-white' :
              'bg-gray-500/50 text-white/60'
            }`}>
            {notification.priority === 'urgent' ? '🔥 URGENT' :
              notification.priority === 'high' ? '⚡ HIGH' :
                '↓ LOW'}
          </div>
        )}

        {/* Icon */}
        <div className="text-lg flex-shrink-0 mt-0.5">
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-6">
          <div className={`text-sm font-medium ${config.color} truncate`}>
            {notification.title}
          </div>
          <div className="text-xs text-white/60 mt-0.5 line-clamp-2">
            {notification.message}
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-white/40">
            <span>{formatTimeAgo(notification.timestamp)}</span>
            {notification.source && (
              <>
                <span>•</span>
                <span className="text-white/30">{notification.source}</span>
              </>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {notification.actions && notification.actions.length > 0 && (
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            {notification.actions.map((action, idx) => {
              const buttonStyles = {
                primary: 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border-cyan-500/30',
                secondary: 'bg-white/5 text-white/60 hover:bg-white/10 border-white/10',
                danger: 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border-red-500/30',
              }
              const style = action.style || 'secondary'

              return (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (action.url) {
                      window.open(action.url, '_blank')
                    }
                    // Custom actions can be handled here
                    if (action.action === 'dismiss') {
                      onDismiss(notification.id)
                    }
                  }}
                  className={`px-2 py-1 text-xs font-medium rounded-lg border transition-all ${buttonStyles[style]}`}
                >
                  {action.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Snooze button (desktop) */}
        {onSnooze && (
          <div className="absolute top-2 right-8 hidden sm:block">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowSnoozeMenu(!showSnoozeMenu)
              }}
              className="p-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all"
              title="Snooze"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Snooze dropdown */}
            {showSnoozeMenu && (
              <div className="absolute right-0 top-full mt-1 py-1 bg-gray-800 rounded-lg shadow-xl border border-white/10 z-50 min-w-[120px]">
                <div className="px-2 py-1 text-[10px] text-white/40 uppercase tracking-wider">Remind me</div>
                {SNOOZE_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSnooze(notification.id, option.minutes)
                      setShowSnoozeMenu(false)
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Dismiss button (desktop) */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDismiss(notification.id)
          }}
          className="absolute top-2 right-2 p-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all hidden sm:block"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Swipe hint for mobile (only show when not read and on first few items) */}
        <div className="absolute bottom-1 right-2 text-[10px] text-white/20 sm:hidden">
          ← swipe
        </div>
      </div>
    </div>
  )
}

function NotificationSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="p-3 rounded-xl bg-white/5 border border-white/10 animate-pulse"
        >
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-white/10 rounded w-3/4" />
              <div className="h-3 bg-white/10 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-8">
      <div className="text-4xl mb-3">🔔</div>
      <div className="text-white/60 text-sm">All caught up!</div>
      <div className="text-white/40 text-xs mt-1">No new notifications</div>
    </div>
  )
}

// Grouping modes
type GroupMode = 'none' | 'type' | 'source'

interface NotificationGroup {
  key: string
  label: string
  icon: string
  color: string
  notifications: Notification[]
  unreadCount: number
}

// Group notifications by type or source
function groupNotifications(
  notifications: Notification[],
  mode: GroupMode
): NotificationGroup[] {
  if (mode === 'none') {
    return [{
      key: 'all',
      label: 'All Notifications',
      icon: '🔔',
      color: 'text-white/70',
      notifications,
      unreadCount: notifications.filter(n => !n.read).length,
    }]
  }

  const groups = new Map<string, Notification[]>()

  notifications.forEach(n => {
    const key = mode === 'type' ? n.type : (n.source || 'Unknown')
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(n)
  })

  // Sort groups by unread count then by most recent
  const sortedGroups = Array.from(groups.entries())
    .map(([key, notifs]) => {
      const unreadCount = notifs.filter(n => !n.read).length
      const config = mode === 'type' ? TYPE_CONFIG[key as keyof typeof TYPE_CONFIG] : null

      return {
        key,
        label: mode === 'type' ? key.charAt(0).toUpperCase() + key.slice(1) : key,
        icon: config?.icon || '📁',
        color: config?.color || 'text-white/70',
        notifications: notifs,
        unreadCount,
      }
    })
    .sort((a, b) => {
      // Unread first, then by count
      if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount
      return b.notifications.length - a.notifications.length
    })

  return sortedGroups
}

// Collapsible group component
function NotificationGroupSection({
  group,
  expanded,
  isSelected,
  onToggleExpand,
  onMarkRead,
  onDismiss,
  groupRef,
}: {
  group: NotificationGroup
  expanded: boolean
  isSelected?: boolean
  onToggleExpand: () => void
  onMarkRead: (id: string) => void
  onDismiss: (id: string) => void
  groupRef?: (el: HTMLButtonElement | null) => void
}) {
  return (
    <div className="mb-3 last:mb-0">
      {/* Group header */}
      <button
        ref={groupRef}
        onClick={onToggleExpand}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors group ${isSelected ? 'ring-1 ring-cyan-500/50 bg-white/5' : ''
          }`}
      >
        <span className={`text-sm transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>
          ▶
        </span>
        <span className="text-base">{group.icon}</span>
        <span className={`text-xs font-medium ${group.color}`}>
          {group.label}
        </span>
        <span className="text-[10px] text-white/40">
          ({group.notifications.length})
        </span>
        {group.unreadCount > 0 && (
          <span className="ml-auto px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-cyan-500/20 text-cyan-400">
            {group.unreadCount} new
          </span>
        )}
        {isSelected && (
          <span className="ml-1 text-[9px] text-white/30">Enter: expand/collapse</span>
        )}
      </button>

      {/* Group content */}
      {expanded && (
        <div className="mt-1.5 space-y-2 pl-2 border-l-2 border-white/10 ml-3 animate-in fade-in slide-in-from-top-1 duration-150">
          {group.notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={onMarkRead}
              onDismiss={onDismiss}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface NotificationCenterProps {
  className?: string
}

export function NotificationCenter({ className = '' }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<NotificationsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'agents'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('notification-filter')
      if (stored && ['all', 'unread', 'agents'].includes(stored)) {
        return stored as 'all' | 'unread' | 'agents'
      }
    }
    return 'all'
  })

  // Wrapper to persist filter to localStorage
  const updateFilter = (newFilter: 'all' | 'unread' | 'agents') => {
    setFilter(newFilter)
    if (typeof window !== 'undefined') {
      localStorage.setItem('notification-filter', newFilter)
    }
  }

  const [selectedIndex, setSelectedIndex] = useState<number>(-1) // Keyboard navigation for flat list
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number>(-1) // Keyboard navigation for groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set()) // Track expanded group labels
  const notificationRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const groupRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [groupMode, setGroupMode] = useState<GroupMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('notification-group-mode')
      if (stored && ['none', 'type', 'source'].includes(stored)) {
        return stored as GroupMode
      }
    }
    return 'none'
  })
  const [showSoundSettings, setShowSoundSettings] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const prevUnreadCountRef = useRef<number>(0)
  const { prefs: soundPrefs, updatePrefs: updateSoundPrefs, playSound, testSound } = useSoundPreferences()
  const persistence = useNotificationPersistence()
  const desktop = useDesktopNotifications()
  const dnd = useDndMode()

  // Fetch notifications (combine alerts + events + agents + activity)
  const fetchNotifications = useCallback(async () => {
    try {
      // Fetch from multiple sources
      const [alertsRes, eventsRes, agentsRes, activityRes] = await Promise.allSettled([
        fetch('/api/health/alerts-history?limit=10&days=7'),
        fetch('/api/events?limit=10'),
        fetch('/api/agents'),
        fetch('/api/activity?limit=10'),
      ])

      const notifications: Notification[] = []

      // Parse alerts
      if (alertsRes.status === 'fulfilled' && alertsRes.value.ok) {
        const alertsData = await alertsRes.value.json()
        if (alertsData.alerts) {
          alertsData.alerts.forEach((alert: {
            id: string
            timestamp: string
            status: 'critical' | 'degraded' | 'healthy'
            message: string
            affectedServices?: string[]
            resolvedAt?: string
          }) => {
            notifications.push({
              id: `alert-${alert.id}`,
              type: alert.status === 'critical' ? 'alert' : alert.status === 'degraded' ? 'warning' : 'success',
              title: alert.status === 'critical' ? 'Critical Alert' : alert.status === 'degraded' ? 'Warning' : 'Resolved',
              message: alert.message,
              timestamp: alert.timestamp,
              read: !!alert.resolvedAt,
              source: alert.affectedServices?.join(', ') || 'System',
            })
          })
        }
      }

      // Parse events if available
      if (eventsRes.status === 'fulfilled' && eventsRes.value.ok) {
        const eventsData = await eventsRes.value.json()
        if (eventsData.events) {
          eventsData.events.forEach((event: {
            id: string
            timestamp: string
            type: string
            title: string
            description?: string
          }) => {
            notifications.push({
              id: `event-${event.id}`,
              type: 'event',
              title: event.title || event.type,
              message: event.description || '',
              timestamp: event.timestamp,
              read: true,
              source: 'Events',
            })
          })
        }
      }

      // Parse agent status
      if (agentsRes.status === 'fulfilled' && agentsRes.value.ok) {
        const agentsData = await agentsRes.value.json()
        if (agentsData.agents) {
          agentsData.agents.forEach((agent: {
            id: string
            status: 'running' | 'completed' | 'error'
            description: string
            startTime: string
            lastActivity: string
            tokensUsed?: number
            toolsUsed?: number
          }) => {
            const statusEmoji = agent.status === 'running' ? '🟢' : agent.status === 'completed' ? '✅' : '❌'
            const isRecent = Date.now() - new Date(agent.lastActivity).getTime() < 3600000 // 1 hour
            notifications.push({
              id: `agent-${agent.id}`,
              type: 'agent',
              title: `${statusEmoji} Agent ${agent.status}`,
              message: `${agent.description}${agent.tokensUsed ? ` • ${agent.tokensUsed.toLocaleString()} tokens` : ''}`,
              timestamp: agent.lastActivity,
              read: agent.status === 'completed' && !isRecent,
              source: agent.id,
              metadata: { tokensUsed: agent.tokensUsed, toolsUsed: agent.toolsUsed },
            })
          })
        }
      }

      // Parse activity feed
      if (activityRes.status === 'fulfilled' && activityRes.value.ok) {
        const activityData = await activityRes.value.json()
        if (activityData.activities) {
          activityData.activities.forEach((activity: {
            id: number | string
            type: string
            title: string
            description?: string
            actor?: string
            created_at: string
          }) => {
            // Map activity types to notification types
            const activityTypeMap: Record<string, 'activity' | 'agent' | 'success'> = {
              'deploy': 'success',
              'agent_action': 'agent',
              'post_approved': 'activity',
              'image_generated': 'activity',
              'book_updated': 'activity',
            }
            notifications.push({
              id: `activity-${activity.id}`,
              type: activityTypeMap[activity.type] || 'activity',
              title: activity.title,
              message: activity.description || '',
              timestamp: activity.created_at,
              read: true,
              source: activity.actor || 'System',
            })
          })
        }
      }

      // Sort by timestamp (newest first)
      notifications.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      // Apply persistence: filter dismissed and apply read status
      const persistedNotifications = notifications
        .filter(n => !persistence.isDismissed(n.id))
        .map(n => ({
          ...n,
          read: n.read || persistence.isRead(n.id),
        }))

      const unreadCount = persistedNotifications.filter(n => !n.read).length

      // Check if new notifications arrived and play sound + desktop notification
      const prevUnread = prevUnreadCountRef.current
      if (unreadCount > prevUnread && prevUnread !== 0) {
        // Find the newest unread notification to check urgency
        const newestUnread = persistedNotifications.find(n => !n.read)
        const isUrgent = newestUnread?.type === 'alert' || newestUnread?.type === 'error'

        // Check DND mode before notifying
        if (!dnd.isMuted(isUrgent)) {
          playSound()

          // Show desktop notification
          if (newestUnread) {
            const typeConfig = TYPE_CONFIG[newestUnread.type] || TYPE_CONFIG.info
            desktop.showNotification(
              `${typeConfig.icon} ${newestUnread.title}`,
              {
                body: newestUnread.message,
                tag: 'onde-notification',
                onClick: () => setIsOpen(true),
              }
            )
          }
        }
      }
      prevUnreadCountRef.current = unreadCount

      setData({ notifications: persistedNotifications, unreadCount })
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [playSound, persistence, dnd, desktop])

  const pullToRefresh = usePullToRefresh(fetchNotifications)

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Auto-refresh every 30 seconds when open
  useEffect(() => {
    if (!isOpen) return
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [isOpen, fetchNotifications])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        buttonRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setShowSoundSettings(false)
        setShowExportMenu(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close sound settings and export menu when panel closes
  useEffect(() => {
    if (!isOpen) {
      setShowSoundSettings(false)
      setShowExportMenu(false)
    }
  }, [isOpen])

  // Initialize expanded groups when data loads or groupMode changes
  useEffect(() => {
    if (data?.notifications && groupMode !== 'none') {
      const groups = groupNotifications(data.notifications, groupMode)
      // Start with all groups expanded
      setExpandedGroups(new Set(groups.map(g => g.label)))
    }
  }, [data?.notifications, groupMode])

  // Toggle group expansion
  const toggleGroupExpansion = useCallback((label: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(label)) {
        next.delete(label)
      } else {
        next.add(label)
      }
      return next
    })
  }, [])

  // Reset selection when filter changes or panel opens/closes
  useEffect(() => {
    setSelectedIndex(-1)
    setSelectedGroupIndex(-1)
  }, [filter, isOpen, groupMode])


  const handleMarkRead = useCallback((id: string) => {
    // Persist to localStorage
    persistence.markRead(id)

    setData(prev => {
      if (!prev) return prev
      const updated = prev.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      )
      return {
        notifications: updated,
        unreadCount: updated.filter(n => !n.read).length,
      }
    })
  }, [persistence])

  const handleDismiss = useCallback((id: string) => {
    // Persist dismissal to localStorage
    persistence.markDismissed(id)

    setData(prev => {
      if (!prev) return prev
      const updated = prev.notifications.filter(n => n.id !== id)
      return {
        notifications: updated,
        unreadCount: updated.filter(n => !n.read).length,
      }
    })
  }, [persistence])

  const handleMarkAllRead = useCallback(() => {
    // Persist all as read to localStorage
    if (data?.notifications) {
      persistence.markAllRead(data.notifications.map(n => n.id))
    }

    setData(prev => {
      if (!prev) return prev
      return {
        notifications: prev.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      }
    })
  }, [persistence, data?.notifications])

  const [showDismissAllConfirm, setShowDismissAllConfirm] = useState(false)

  const handleDismissAll = useCallback(() => {
    // Mark all current notifications as dismissed
    if (data?.notifications) {
      data.notifications.forEach(n => persistence.markDismissed(n.id))
    }

    setData(prev => {
      if (!prev) return prev
      return {
        notifications: [],
        unreadCount: 0,
      }
    })
    setShowDismissAllConfirm(false)
  }, [persistence, data?.notifications])

  const filteredNotifications = data?.notifications.filter(n => {
    if (filter === 'all') return true
    if (filter === 'unread') return !n.read
    if (filter === 'agents') return n.type === 'agent' || n.type === 'activity'
    return true
  }) || []

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName)

      // N to toggle notification center (when not in input)
      if (
        event.key === 'n' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !isInput
      ) {
        setIsOpen(prev => !prev)
        event.preventDefault()
        return
      }

      // Escape to close
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
        event.preventDefault()
        return
      }

      // Keyboard navigation within notification list (only when panel is open and not in input)
      if (isOpen && !isInput && filteredNotifications.length > 0) {
        // Different navigation for grouped vs flat view
        if (groupMode !== 'none') {
          // Grouped view navigation
          const groups = groupNotifications(filteredNotifications, groupMode)
          const maxGroupIndex = groups.length - 1

          // j or ArrowDown to move down through groups
          if (event.key === 'j' || event.key === 'ArrowDown') {
            event.preventDefault()
            setSelectedGroupIndex(prev => {
              const next = prev < maxGroupIndex ? prev + 1 : 0
              const group = groups[next]
              if (group) {
                const el = groupRefs.current.get(group.label)
                el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
              }
              return next
            })
            return
          }

          // k or ArrowUp to move up through groups
          if (event.key === 'k' || event.key === 'ArrowUp') {
            event.preventDefault()
            setSelectedGroupIndex(prev => {
              const next = prev > 0 ? prev - 1 : maxGroupIndex
              const group = groups[next]
              if (group) {
                const el = groupRefs.current.get(group.label)
                el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
              }
              return next
            })
            return
          }

          // Enter to toggle expand/collapse group
          if (event.key === 'Enter' && selectedGroupIndex >= 0) {
            event.preventDefault()
            const group = groups[selectedGroupIndex]
            if (group) {
              toggleGroupExpansion(group.label)
            }
            return
          }

          // Home to go to first group
          if (event.key === 'Home') {
            event.preventDefault()
            setSelectedGroupIndex(0)
            const group = groups[0]
            if (group) {
              const el = groupRefs.current.get(group.label)
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
            return
          }

          // End to go to last group
          if (event.key === 'End') {
            event.preventDefault()
            setSelectedGroupIndex(maxGroupIndex)
            const group = groups[maxGroupIndex]
            if (group) {
              const el = groupRefs.current.get(group.label)
              el?.scrollIntoView({ behavior: 'smooth', block: 'end' })
            }
            return
          }

          // Space to expand all / collapse all
          if (event.key === ' ') {
            event.preventDefault()
            const allExpanded = groups.every(g => expandedGroups.has(g.label))
            if (allExpanded) {
              setExpandedGroups(new Set())
            } else {
              setExpandedGroups(new Set(groups.map(g => g.label)))
            }
            return
          }
        } else {
          // Flat view navigation (original behavior)
          const maxIndex = filteredNotifications.length - 1

          // j or ArrowDown to move down
          if (event.key === 'j' || event.key === 'ArrowDown') {
            event.preventDefault()
            setSelectedIndex(prev => {
              const next = prev < maxIndex ? prev + 1 : 0
              const notif = filteredNotifications[next]
              if (notif) {
                const el = notificationRefs.current.get(notif.id)
                el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
              }
              return next
            })
            return
          }

          // k or ArrowUp to move up
          if (event.key === 'k' || event.key === 'ArrowUp') {
            event.preventDefault()
            setSelectedIndex(prev => {
              const next = prev > 0 ? prev - 1 : maxIndex
              const notif = filteredNotifications[next]
              if (notif) {
                const el = notificationRefs.current.get(notif.id)
                el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
              }
              return next
            })
            return
          }

          // Enter to mark as read
          if (event.key === 'Enter' && selectedIndex >= 0) {
            event.preventDefault()
            const notif = filteredNotifications[selectedIndex]
            if (notif && !notif.read) {
              handleMarkRead(notif.id)
            }
            return
          }

          // x or Delete/Backspace to dismiss
          if ((event.key === 'x' || event.key === 'Delete' || event.key === 'Backspace') && selectedIndex >= 0) {
            event.preventDefault()
            const notif = filteredNotifications[selectedIndex]
            if (notif) {
              handleDismiss(notif.id)
              setSelectedIndex(prev => Math.min(prev, filteredNotifications.length - 2))
            }
            return
          }

          // Home to go to first
          if (event.key === 'Home') {
            event.preventDefault()
            setSelectedIndex(0)
            const notif = filteredNotifications[0]
            if (notif) {
              const el = notificationRefs.current.get(notif.id)
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
            return
          }

          // End to go to last
          if (event.key === 'End') {
            event.preventDefault()
            setSelectedIndex(maxIndex)
            const notif = filteredNotifications[maxIndex]
            if (notif) {
              const el = notificationRefs.current.get(notif.id)
              el?.scrollIntoView({ behavior: 'smooth', block: 'end' })
            }
            return
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredNotifications, selectedIndex, selectedGroupIndex, groupMode, expandedGroups, toggleGroupExpansion, handleMarkRead, handleDismiss])

  const agentCount = data?.notifications.filter(n =>
    n.type === 'agent' || n.type === 'activity'
  ).length || 0

  const unreadCount = data?.unreadCount || 0

  // Update browser tab title with notification count
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Store original title on first run
    const baseTitle = document.title.replace(/^\(\d+\)\s*/, '') // Remove any existing badge

    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${baseTitle}`
    } else {
      document.title = baseTitle
    }

    // Cleanup: restore base title when component unmounts
    return () => {
      document.title = baseTitle
    }
  }, [unreadCount])

  return (
    <div className={`relative ${className}`}>
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative p-1.5 rounded-lg text-xs transition-colors
          ${isOpen
            ? 'bg-cyan-500/20 text-cyan-400'
            : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
          }
        `}
        title="Notifications (N)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 text-[10px] font-bold rounded-full bg-red-500 text-white flex items-center justify-center animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[70vh] rounded-2xl border border-white/10 bg-black/90 backdrop-blur-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>🔔</span> Notifications
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-cyan-500/20 text-cyan-400">
                  {unreadCount} new
                </span>
              )}
            </h3>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-white/50 hover:text-white/80 transition-colors"
                >
                  Mark all read
                </button>
              )}

              {/* Dismiss all with confirmation */}
              {data?.notifications && data.notifications.length > 0 && (
                showDismissAllConfirm ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-red-400">Dismiss all?</span>
                    <button
                      onClick={handleDismissAll}
                      className="text-xs text-red-400 hover:text-red-300 font-medium"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setShowDismissAllConfirm(false)}
                      className="text-xs text-white/50 hover:text-white/80"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDismissAllConfirm(true)}
                    className="text-xs text-white/50 hover:text-red-400 transition-colors"
                  >
                    Dismiss all
                  </button>
                )
              )}

              {/* Export dropdown */}
              {data?.notifications && data.notifications.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className={`p-1 rounded-lg transition-colors ${showExportMenu
                      ? 'bg-white/10 text-white/80'
                      : 'text-white/40 hover:text-white/60 hover:bg-white/10'
                      }`}
                    title="Export notifications"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>

                  {showExportMenu && (
                    <div className="absolute right-0 top-full mt-1 w-36 rounded-xl border border-white/10 bg-black/95 backdrop-blur-xl shadow-xl p-2 z-10 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="text-[10px] text-white/40 uppercase tracking-wider px-2 mb-1">Export as</div>
                      <button
                        onClick={() => {
                          exportNotificationsAsJson(data.notifications)
                          setShowExportMenu(false)
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-white/70 hover:bg-white/10 hover:text-white/90 transition-colors flex items-center gap-2"
                      >
                        <span className="text-amber-400">{ }</span> JSON
                      </button>
                      <button
                        onClick={() => {
                          exportNotificationsAsCsv(data.notifications)
                          setShowExportMenu(false)
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-white/70 hover:bg-white/10 hover:text-white/90 transition-colors flex items-center gap-2"
                      >
                        <span className="text-green-400">📊</span> CSV
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Sound settings toggle */}
              <div className="relative">
                <button
                  onClick={() => setShowSoundSettings(!showSoundSettings)}
                  className={`p-1 rounded-lg transition-colors ${showSoundSettings
                    ? 'bg-white/10 text-white/80'
                    : 'text-white/40 hover:text-white/60 hover:bg-white/10'
                    }`}
                  title="Sound settings"
                >
                  {soundPrefs.enabled && soundPrefs.type !== 'none' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  )}
                </button>

                {/* Sound settings dropdown */}
                {showSoundSettings && (
                  <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-white/10 bg-black/95 backdrop-blur-xl shadow-xl p-3 z-10 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="text-xs font-medium text-white/70 mb-2">Sound Preferences</div>

                    {/* Enable/disable toggle */}
                    <label className="flex items-center justify-between py-1.5 cursor-pointer group">
                      <span className="text-xs text-white/60 group-hover:text-white/80">Enable sounds</span>
                      <button
                        onClick={() => updateSoundPrefs({ enabled: !soundPrefs.enabled })}
                        className={`w-8 h-4 rounded-full transition-colors ${soundPrefs.enabled ? 'bg-cyan-500' : 'bg-white/20'
                          }`}
                      >
                        <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${soundPrefs.enabled ? 'translate-x-4' : 'translate-x-0.5'
                          }`} />
                      </button>
                    </label>

                    {/* Sound type selector */}
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Sound Type</div>
                      <div className="space-y-0.5">
                        {(Object.keys(SOUND_LABELS) as SoundType[]).map((type) => (
                          <button
                            key={type}
                            onClick={() => updateSoundPrefs({ type })}
                            className={`w-full text-left px-2 py-1 rounded-lg text-xs transition-colors ${soundPrefs.type === type
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : 'text-white/60 hover:bg-white/10 hover:text-white/80'
                              }`}
                          >
                            {SOUND_LABELS[type]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Volume slider */}
                    {soundPrefs.type !== 'none' && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-white/40 uppercase tracking-wider">Volume</span>
                          <span className="text-[10px] text-white/50">{Math.round(soundPrefs.volume * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={soundPrefs.volume}
                          onChange={(e) => updateSoundPrefs({ volume: parseFloat(e.target.value) })}
                          className="w-full h-1.5 rounded-full appearance-none bg-white/20 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400"
                        />
                      </div>
                    )}

                    {/* Test sound button */}
                    {soundPrefs.type !== 'none' && (
                      <button
                        onClick={testSound}
                        className="w-full mt-2 px-2 py-1.5 rounded-lg text-xs text-white/60 hover:text-white/80 hover:bg-white/10 transition-colors flex items-center justify-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                        </svg>
                        Test sound
                      </button>
                    )}

                    {/* Desktop notifications section */}
                    {desktop.isSupported && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="text-xs font-medium text-white/70 mb-2 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Desktop Notifications
                        </div>

                        {desktop.permission === 'denied' ? (
                          <div className="text-[10px] text-red-400/80 bg-red-500/10 rounded-lg p-2">
                            ⛔ Notifications blocked. Enable in browser settings.
                          </div>
                        ) : desktop.permission === 'default' ? (
                          <button
                            onClick={desktop.requestPermission}
                            className="w-full px-3 py-2 rounded-lg text-xs font-medium bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors flex items-center justify-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            Enable Desktop Notifications
                          </button>
                        ) : (
                          <>
                            {/* Enable/disable toggle */}
                            <label className="flex items-center justify-between py-1.5 cursor-pointer group">
                              <span className="text-xs text-white/60 group-hover:text-white/80">Show notifications</span>
                              <button
                                onClick={() => desktop.updatePrefs({ enabled: !desktop.prefs.enabled })}
                                className={`w-8 h-4 rounded-full transition-colors ${desktop.prefs.enabled ? 'bg-cyan-500' : 'bg-white/20'
                                  }`}
                              >
                                <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${desktop.prefs.enabled ? 'translate-x-4' : 'translate-x-0.5'
                                  }`} />
                              </button>
                            </label>

                            {/* Show preview toggle */}
                            <label className="flex items-center justify-between py-1.5 cursor-pointer group">
                              <span className="text-xs text-white/60 group-hover:text-white/80">Show content preview</span>
                              <button
                                onClick={() => desktop.updatePrefs({ showPreview: !desktop.prefs.showPreview })}
                                className={`w-8 h-4 rounded-full transition-colors ${desktop.prefs.showPreview ? 'bg-cyan-500' : 'bg-white/20'
                                  }`}
                              >
                                <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${desktop.prefs.showPreview ? 'translate-x-4' : 'translate-x-0.5'
                                  }`} />
                              </button>
                            </label>

                            {/* Test notification button */}
                            {desktop.prefs.enabled && (
                              <button
                                onClick={() => desktop.showNotification(
                                  '🔔 Test Notification',
                                  {
                                    body: 'Desktop notifications are working!',
                                    tag: 'onde-test',
                                  }
                                )}
                                className="w-full mt-1.5 px-2 py-1.5 rounded-lg text-xs text-white/60 hover:text-white/80 hover:bg-white/10 transition-colors flex items-center justify-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                                </svg>
                                Test notification
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* DND (Do Not Disturb) Section */}
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="text-xs font-medium text-white/70 mb-2 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                        Do Not Disturb
                        {dnd.prefs.enabled && (
                          <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-full bg-amber-500/20 text-amber-400">
                            {dnd.isInQuietHours() ? 'ACTIVE' : 'ON'}
                          </span>
                        )}
                      </div>

                      {/* Enable DND toggle */}
                      <label className="flex items-center justify-between py-1.5 cursor-pointer group">
                        <span className="text-xs text-white/60 group-hover:text-white/80">Enable DND mode</span>
                        <button
                          onClick={() => dnd.updatePrefs({ enabled: !dnd.prefs.enabled })}
                          className={`w-8 h-4 rounded-full transition-colors ${dnd.prefs.enabled ? 'bg-amber-500' : 'bg-white/20'
                            }`}
                        >
                          <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${dnd.prefs.enabled ? 'translate-x-4' : 'translate-x-0.5'
                            }`} />
                        </button>
                      </label>

                      {dnd.prefs.enabled && (
                        <>
                          {/* Schedule toggle */}
                          <label className="flex items-center justify-between py-1.5 cursor-pointer group">
                            <span className="text-xs text-white/60 group-hover:text-white/80">Use quiet hours</span>
                            <button
                              onClick={() => dnd.updatePrefs({ scheduleEnabled: !dnd.prefs.scheduleEnabled })}
                              className={`w-8 h-4 rounded-full transition-colors ${dnd.prefs.scheduleEnabled ? 'bg-amber-500' : 'bg-white/20'
                                }`}
                            >
                              <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${dnd.prefs.scheduleEnabled ? 'translate-x-4' : 'translate-x-0.5'
                                }`} />
                            </button>
                          </label>

                          {/* Quiet hours schedule */}
                          {dnd.prefs.scheduleEnabled && (
                            <div className="mt-2 pt-2 border-t border-white/5">
                              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Quiet Hours</div>
                              <div className="flex items-center gap-2 text-xs">
                                <div className="flex-1">
                                  <label className="text-[10px] text-white/40 mb-1 block">From</label>
                                  <input
                                    type="time"
                                    value={dnd.formatTime(dnd.prefs.startHour, dnd.prefs.startMinute)}
                                    onChange={(e) => {
                                      const [h, m] = e.target.value.split(':').map(Number)
                                      dnd.updatePrefs({ startHour: h, startMinute: m })
                                    }}
                                    className="w-full px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/80 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-[10px] text-white/40 mb-1 block">To</label>
                                  <input
                                    type="time"
                                    value={dnd.formatTime(dnd.prefs.endHour, dnd.prefs.endMinute)}
                                    onChange={(e) => {
                                      const [h, m] = e.target.value.split(':').map(Number)
                                      dnd.updatePrefs({ endHour: h, endMinute: m })
                                    }}
                                    className="w-full px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/80 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                                  />
                                </div>
                              </div>
                              <div className="mt-1.5 text-[10px] text-white/40">
                                🌙 {dnd.formatTime(dnd.prefs.startHour, dnd.prefs.startMinute)} → {dnd.formatTime(dnd.prefs.endHour, dnd.prefs.endMinute)}
                              </div>
                            </div>
                          )}

                          {/* Allow urgent toggle */}
                          <label className="flex items-center justify-between py-1.5 cursor-pointer group mt-1">
                            <span className="text-xs text-white/60 group-hover:text-white/80">Allow urgent alerts</span>
                            <button
                              onClick={() => dnd.updatePrefs({ allowUrgent: !dnd.prefs.allowUrgent })}
                              className={`w-8 h-4 rounded-full transition-colors ${dnd.prefs.allowUrgent ? 'bg-cyan-500' : 'bg-white/20'
                                }`}
                            >
                              <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${dnd.prefs.allowUrgent ? 'translate-x-4' : 'translate-x-0.5'
                                }`} />
                            </button>
                          </label>
                          <div className="text-[10px] text-white/30 mt-0.5">
                            Critical alerts will still notify you
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-white/40 hover:text-white/60 hover:bg-white/10 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
            <button
              onClick={() => updateFilter('all')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${filter === 'all'
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white/70'
                }`}
            >
              All
            </button>
            <button
              onClick={() => updateFilter('unread')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${filter === 'unread'
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white/70'
                }`}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
            <button
              onClick={() => updateFilter('agents')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors flex items-center gap-1 ${filter === 'agents'
                ? 'bg-violet-500/20 text-violet-400'
                : 'text-white/50 hover:text-white/70'
                }`}
            >
              <span>🤖</span> Agents {agentCount > 0 && `(${agentCount})`}
            </button>

            {/* Grouping toggle */}
            <div className="ml-auto flex items-center gap-1">
              <span className="text-[10px] text-white/30">Group:</span>
              <select
                value={groupMode}
                onChange={(e) => {
                  const mode = e.target.value as GroupMode
                  setGroupMode(mode)
                  try { localStorage.setItem('notification-group-mode', mode) } catch { /* ignore */ }
                }}
                className="px-2 py-0.5 text-[10px] rounded-md bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              >
                <option value="none">None</option>
                <option value="type">By Type</option>
                <option value="source">By Source</option>
              </select>
            </div>
          </div>

          {/* Content with pull-to-refresh */}
          <div
            ref={pullToRefresh.containerRef}
            {...pullToRefresh.handlers}
            className="p-3 overflow-y-auto max-h-[50vh] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent relative"
          >
            {/* Pull-to-refresh indicator (mobile only) */}
            {(pullToRefresh.isPulling || pullToRefresh.isRefreshing) && (
              <div
                className="absolute left-0 right-0 flex items-center justify-center transition-all duration-150 sm:hidden"
                style={{
                  top: -40 + pullToRefresh.pullDistance,
                  opacity: Math.min(pullToRefresh.pullProgress, 1),
                }}
              >
                <div className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-full 
                  ${pullToRefresh.canRefresh || pullToRefresh.isRefreshing
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'bg-white/10 text-white/50'
                  }
                `}>
                  <svg
                    className={`w-4 h-4 transition-transform ${pullToRefresh.isRefreshing ? 'animate-spin' : ''
                      }`}
                    style={{
                      transform: pullToRefresh.isRefreshing
                        ? undefined
                        : `rotate(${Math.min(pullToRefresh.pullProgress * 180, 180)}deg)`
                    }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-xs font-medium">
                    {pullToRefresh.isRefreshing
                      ? 'Refreshing...'
                      : pullToRefresh.canRefresh
                        ? 'Release to refresh'
                        : 'Pull to refresh'
                    }
                  </span>
                </div>
              </div>
            )}

            {/* Content with pull offset */}
            <div
              className="transition-transform duration-150 sm:transform-none"
              style={{
                transform: pullToRefresh.isPulling || pullToRefresh.isRefreshing
                  ? `translateY(${pullToRefresh.pullDistance}px)`
                  : undefined
              }}
            >
              {loading ? (
                <NotificationSkeleton />
              ) : filteredNotifications.length === 0 ? (
                <EmptyState />
              ) : groupMode === 'none' ? (
                <div className="space-y-2">
                  {filteredNotifications.map((notification, idx) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkRead={handleMarkRead}
                      onDismiss={handleDismiss}
                      isSelected={selectedIndex === idx}
                      registerRef={(id, el) => {
                        if (el) notificationRefs.current.set(id, el)
                        else notificationRefs.current.delete(id)
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div>
                  {groupNotifications(filteredNotifications, groupMode).map((group, idx) => (
                    <NotificationGroupSection
                      key={group.key}
                      group={group}
                      expanded={expandedGroups.has(group.label)}
                      isSelected={selectedGroupIndex === idx}
                      onToggleExpand={() => toggleGroupExpansion(group.label)}
                      onMarkRead={handleMarkRead}
                      onDismiss={handleDismiss}
                      groupRef={(el) => {
                        if (el) groupRefs.current.set(group.label, el)
                        else groupRefs.current.delete(group.label)
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between text-xs text-white/30">
            <span className="hidden sm:inline">
              {groupMode !== 'none'
                ? 'j/k navigate groups • Enter expand/collapse • Space toggle all'
                : 'j/k navigate • Enter read • x dismiss'
              }
            </span>
            <span className="sm:hidden">N to toggle</span>
            <button
              onClick={fetchNotifications}
              className="text-white/50 hover:text-white/80 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Standalone bell icon for use in headers
export function NotificationBell({ className = '' }: { className?: string }) {
  return <NotificationCenter className={className} />
}

export default NotificationCenter

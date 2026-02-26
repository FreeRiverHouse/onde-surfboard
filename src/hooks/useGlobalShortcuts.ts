"use client"

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface ShortcutConfig {
  key: string
  action: () => void
  description: string
}

/**
 * Global keyboard shortcuts for vim-style navigation
 * G-key combos: press G, then a second key within 500ms
 * 
 * Available shortcuts:
 * - G D → Go to Dashboard
 * - G S → Go to Social  
 * - G C → Go to CORDE
 * - G A → Go to Analytics
 * - G H → Go to House
 * - G P → Go to PR
 * - G B → Go to Betting
 * - ? → Show shortcuts help (opens command palette)
 */
export function useGlobalShortcuts() {
  const router = useRouter()
  const gKeyPressed = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const shortcuts: Record<string, ShortcutConfig> = {
    'd': { key: 'D', action: () => router.push('/'), description: 'Dashboard' },
    's': { key: 'S', action: () => router.push('/social'), description: 'Social' },
    'c': { key: 'C', action: () => router.push('/corde'), description: 'CORDE' },
    'a': { key: 'A', action: () => router.push('/analytics'), description: 'Analytics' },
    'h': { key: 'H', action: () => router.push('/house'), description: 'House' },
    'p': { key: 'P', action: () => router.push('/pr'), description: 'PR' },
    'b': { key: 'B', action: () => router.push('/betting'), description: 'Betting' },
  }

  const resetGKey = useCallback(() => {
    gKeyPressed.current = false
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      ) {
        return
      }

      const key = e.key.toLowerCase()

      // Handle G-key prefix
      if (key === 'g' && !gKeyPressed.current) {
        gKeyPressed.current = true
        // Reset after 500ms if no second key pressed
        timeoutRef.current = setTimeout(resetGKey, 500)
        return
      }

      // Handle second key of G-combo
      if (gKeyPressed.current && shortcuts[key]) {
        e.preventDefault()
        resetGKey()
        shortcuts[key].action()
        
        // Optional: Show toast feedback
        showNavigationToast(shortcuts[key].description)
        return
      }

      // Reset G-key if any other key pressed
      if (gKeyPressed.current) {
        resetGKey()
      }

      // Direct shortcuts (no prefix needed)
      if (key === '?') {
        // Trigger command palette
        const cmdKEvent = new KeyboardEvent('keydown', {
          key: 'k',
          metaKey: true,
          bubbles: true
        })
        document.dispatchEvent(cmdKEvent)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      resetGKey()
    }
  }, [router, shortcuts, resetGKey])
}

// Minimal toast notification for navigation feedback
function showNavigationToast(destination: string) {
  // Check if toast container exists
  let container = document.getElementById('shortcut-toast-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'shortcut-toast-container'
    container.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] pointer-events-none'
    document.body.appendChild(container)
  }

  const toast = document.createElement('div')
  toast.className = 'px-4 py-2 bg-slate-800/90 backdrop-blur-xl rounded-lg border border-white/10 text-white text-sm shadow-lg animate-fade-in'
  toast.innerHTML = `
    <span class="text-white/50">→</span>
    <span class="ml-2">${destination}</span>
  `
  
  container.appendChild(toast)

  // Remove after animation
  setTimeout(() => {
    toast.classList.add('animate-fade-out')
    setTimeout(() => toast.remove(), 200)
  }, 800)
}

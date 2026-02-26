"use client"

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

type ThemeSetting = 'dark' | 'light' | 'system'
type ResolvedTheme = 'dark' | 'light'

interface ThemeContextType {
  theme: ThemeSetting           // User's preference (dark/light/system)
  resolvedTheme: ResolvedTheme  // Actual applied theme
  toggleTheme: () => void
  setTheme: (theme: ThemeSetting) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Get system preference
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: ThemeSetting
}

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeSetting>(defaultTheme)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>('dark')
  const [mounted, setMounted] = useState(false)

  // Resolve actual theme to apply
  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemTheme : theme

  // Load theme from localStorage on mount + detect system preference
  useEffect(() => {
    setMounted(true)
    setSystemTheme(getSystemTheme())
    
    const savedTheme = localStorage.getItem('onde-theme') as ThemeSetting | null
    if (savedTheme && ['dark', 'light', 'system'].includes(savedTheme)) {
      setThemeState(savedTheme)
    } else {
      // First visit: use system preference
      setThemeState('system')
    }
  }, [])

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [mounted])

  // Apply theme class to document
  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(resolvedTheme)
    localStorage.setItem('onde-theme', theme)
  }, [resolvedTheme, theme, mounted])

  const toggleTheme = useCallback(() => {
    // Cycle: dark → light → system → dark
    setThemeState(prev => {
      if (prev === 'dark') return 'light'
      if (prev === 'light') return 'system'
      return 'dark'
    })
  }, [])

  const setTheme = useCallback((newTheme: ThemeSetting) => {
    setThemeState(newTheme)
  }, [])

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme: defaultTheme, resolvedTheme: 'dark', toggleTheme, setTheme }}>
        {children}
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

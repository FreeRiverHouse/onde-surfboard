"use client"

import { useTheme } from './ThemeProvider'
import { Sun, Moon, Monitor } from 'lucide-react'

export function ThemeToggle() {
  const { theme, resolvedTheme, toggleTheme } = useTheme()

  // Get display info based on setting
  const getLabel = () => {
    switch (theme) {
      case 'dark': return 'Dark mode (click for Light)'
      case 'light': return 'Light mode (click for System)'
      case 'system': return `System mode (${resolvedTheme}) - click for Dark`
    }
  }

  // Glow color based on resolved theme
  const glowColor = resolvedTheme === 'dark' ? 'bg-cyan-500/10' : 'bg-amber-400/10'

  return (
    <button
      onClick={toggleTheme}
      className="relative w-10 h-10 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] 
                 flex items-center justify-center transition-all duration-300 group
                 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10"
      aria-label={getLabel()}
      title={getLabel()}
    >
      <div className="relative w-5 h-5">
        {/* Sun icon - Light mode */}
        <Sun 
          className={`absolute inset-0 w-5 h-5 text-amber-400 transition-all duration-300
                     ${theme === 'light' 
                       ? 'opacity-100 rotate-0 scale-100' 
                       : 'opacity-0 rotate-90 scale-50'}`}
        />
        {/* Moon icon - Dark mode */}
        <Moon 
          className={`absolute inset-0 w-5 h-5 text-cyan-400 transition-all duration-300
                     ${theme === 'dark' 
                       ? 'opacity-100 rotate-0 scale-100' 
                       : 'opacity-0 -rotate-90 scale-50'}`}
        />
        {/* Monitor icon - System mode */}
        <Monitor 
          className={`absolute inset-0 w-5 h-5 text-purple-400 transition-all duration-300
                     ${theme === 'system' 
                       ? 'opacity-100 rotate-0 scale-100' 
                       : 'opacity-0 rotate-180 scale-50'}`}
        />
      </div>
      
      {/* Hover glow effect */}
      <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${glowColor}`} />
    </button>
  )
}

// Alias for minimal version (same component)
export { ThemeToggle as ThemeToggleMinimal }

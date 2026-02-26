"use client"

import { ThemeToggleMinimal } from './ThemeToggle'
import { CommandPalette } from './CommandPalette'
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts'

export function HeaderClient() {
  // Enable global keyboard shortcuts (G D, G S, etc.)
  useGlobalShortcuts()
  
  return (
    <>
      <ThemeToggleMinimal />
      <CommandPalette />
    </>
  )
}

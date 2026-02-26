"use client"

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useCallback } from 'react'

interface BreadcrumbItem {
  label: string
  href: string
  current: boolean
}

const routeLabels: Record<string, string> = {
  '': 'Dashboard',
  'analytics': 'Analytics',
  'house': 'House',
  'pr': 'PR',
  'betting': 'Betting',
  'corde': 'CORDE',
  'social': 'Social',
  'health': 'Health',
  'trading': 'Trading',
  'history': 'History',
  'frh': 'FRH',
  'games': 'Games',
  'login': 'Login',
}

/**
 * Breadcrumb navigation with keyboard support
 * 
 * Keyboard shortcuts (when focused):
 * - ArrowLeft: Go to parent route
 * - Home: Go to Dashboard
 */
export function Breadcrumb() {
  const pathname = usePathname()
  
  // Build breadcrumb items from pathname
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean)
    const items: BreadcrumbItem[] = [
      { label: 'Dashboard', href: '/', current: segments.length === 0 }
    ]
    
    let path = ''
    segments.forEach((segment, index) => {
      path += `/${segment}`
      items.push({
        label: routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
        href: path,
        current: index === segments.length - 1
      })
    })
    
    return items
  }

  const breadcrumbs = getBreadcrumbs()
  
  // Keyboard navigation for breadcrumbs
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only when not in input
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
    
    // Alt + Left = Go up one level
    if (e.altKey && e.key === 'ArrowLeft' && breadcrumbs.length > 1) {
      const parent = breadcrumbs[breadcrumbs.length - 2]
      window.location.href = parent.href
    }
    
    // Alt + Home = Go to dashboard
    if (e.altKey && e.key === 'Home') {
      window.location.href = '/'
    }
  }, [breadcrumbs])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Don't show breadcrumb on dashboard (root)
  if (breadcrumbs.length <= 1) return null

  return (
    <nav 
      aria-label="Breadcrumb"
      className="flex items-center gap-2 text-sm px-4 py-2 text-white/40"
    >
      <ol className="flex items-center gap-1">
        {breadcrumbs.map((item, index) => (
          <li key={item.href} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="mx-1.5 text-white/20" />
            )}
            {item.current ? (
              <span 
                className="text-white/80 font-medium"
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-white transition-colors hover:underline underline-offset-4"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
      
      {/* Keyboard hint */}
      <span className="hidden md:flex items-center gap-1 ml-4 text-xs text-white/20">
        <kbd className="px-1 py-0.5 bg-white/5 rounded text-[10px]">Alt</kbd>
        <span>+</span>
        <kbd className="px-1 py-0.5 bg-white/5 rounded text-[10px]">←</kbd>
        <span className="ml-1">back</span>
      </span>
    </nav>
  )
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg 
      className={`w-3.5 h-3.5 ${className || ''}`}
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M9 5l7 7-7 7" 
      />
    </svg>
  )
}

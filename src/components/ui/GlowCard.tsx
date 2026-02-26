'use client'

import { type ReactNode, useRef, useState } from 'react'
import { TiltCard } from './TiltCard'

interface GlowCardProps {
  children: ReactNode
  className?: string
  variant?: 'cyan' | 'gold' | 'purple' | 'emerald' | 'pink'
  noPadding?: boolean
  noTilt?: boolean
  glassIntensity?: 'low' | 'medium' | 'high'
  hoverScale?: boolean
}

const variantColors = {
  cyan: {
    glow: 'rgba(6, 182, 212, 0.4)',
    border: 'border-cyan-500/20 hover:border-cyan-400/50',
    bg: 'from-cyan-500/10 via-cyan-500/5 to-transparent',
    shadow: 'hover:shadow-cyan-500/30',
    accent: '#06b6d4',
  },
  gold: {
    glow: 'rgba(251, 191, 36, 0.4)',
    border: 'border-amber-500/20 hover:border-amber-400/50',
    bg: 'from-amber-500/10 via-amber-500/5 to-transparent',
    shadow: 'hover:shadow-amber-500/30',
    accent: '#fbbf24',
  },
  purple: {
    glow: 'rgba(139, 92, 246, 0.4)',
    border: 'border-purple-500/20 hover:border-purple-400/50',
    bg: 'from-purple-500/10 via-purple-500/5 to-transparent',
    shadow: 'hover:shadow-purple-500/30',
    accent: '#8b5cf6',
  },
  emerald: {
    glow: 'rgba(16, 185, 129, 0.4)',
    border: 'border-emerald-500/20 hover:border-emerald-400/50',
    bg: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
    shadow: 'hover:shadow-emerald-500/30',
    accent: '#10b981',
  },
  pink: {
    glow: 'rgba(236, 72, 153, 0.4)',
    border: 'border-pink-500/20 hover:border-pink-400/50',
    bg: 'from-pink-500/10 via-pink-500/5 to-transparent',
    shadow: 'hover:shadow-pink-500/30',
    accent: '#ec4899',
  },
}

const glassStyles = {
  low: 'backdrop-blur-md bg-white/[0.02]',
  medium: 'backdrop-blur-xl bg-white/[0.04]',
  high: 'backdrop-blur-2xl bg-white/[0.06]',
}

export function GlowCard({ 
  children, 
  className = '', 
  variant = 'cyan',
  noPadding = false,
  noTilt = false,
  glassIntensity = 'medium',
  hoverScale = false,
}: GlowCardProps) {
  const colors = variantColors[variant]
  const cardRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }
  
  const cardContent = (
    <div
      ref={cardRef}
      className={`
        relative overflow-hidden rounded-3xl
        bg-gradient-to-br ${colors.bg}
        ${glassStyles[glassIntensity]}
        border ${colors.border}
        transition-all duration-500 ease-out
        hover:shadow-2xl ${colors.shadow}
        ${hoverScale ? 'hover:scale-[1.02]' : ''}
        ${noPadding ? '' : 'p-6'}
        ${className}
      `}
      style={{
        boxShadow: `
          0 4px 30px rgba(0, 0, 0, 0.3),
          0 1px 0 rgba(255, 255, 255, 0.05) inset,
          0 -1px 0 rgba(0, 0, 0, 0.2) inset
        `,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Dynamic radial glow following cursor */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(
            500px circle at ${mousePos.x}% ${mousePos.y}%,
            ${colors.accent}15 0%,
            transparent 50%
          )`,
        }}
      />

      {/* Top edge highlight */}
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background: `linear-gradient(90deg, 
            transparent 0%,
            ${colors.accent}40 20%,
            ${colors.accent}60 50%,
            ${colors.accent}40 80%,
            transparent 100%
          )`,
        }}
      />

      {/* Animated gradient border glow */}
      <div
        className="absolute -inset-px rounded-3xl pointer-events-none transition-opacity duration-500"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `linear-gradient(
            ${45 + (mousePos.x - 50) * 0.5}deg,
            transparent 20%,
            ${colors.accent}30 50%,
            transparent 80%
          )`,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: '1px',
        }}
      />

      {/* Noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Sweeping shimmer effect */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `linear-gradient(
            105deg,
            transparent 0%,
            transparent 40%,
            rgba(255, 255, 255, 0.08) 45%,
            rgba(255, 255, 255, 0.12) 50%,
            rgba(255, 255, 255, 0.08) 55%,
            transparent 60%,
            transparent 100%
          )`,
          backgroundSize: '250% 100%',
          animation: isHovered ? 'cardShimmer 2s ease-in-out infinite' : 'none',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      <style jsx>{`
        @keyframes cardShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
  
  if (noTilt) {
    return cardContent
  }
  
  return (
    <TiltCard glowColor={colors.glow} tiltAmount={5}>
      {cardContent}
    </TiltCard>
  )
}

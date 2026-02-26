'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedTextProps {
  children: string
  className?: string
  delay?: number
  stagger?: number
  once?: boolean
  animation?: 'fade-up' | 'reveal' | 'blur-in' | 'wave' | 'typewriter' | 'glitch'
}

export function AnimatedText({
  children,
  className = '',
  delay = 0,
  stagger = 30,
  once = true,
  animation = 'fade-up'
}: AnimatedTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && (!hasAnimated || !once)) {
          setTimeout(() => setIsVisible(true), delay)
          if (once) setHasAnimated(true)
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold: 0.1 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [delay, hasAnimated, once])

  const words = children.split(' ')

  const getWordStyle = (index: number) => {
    const wordDelay = index * stagger

    switch (animation) {
      case 'fade-up':
        return {
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${wordDelay}ms`,
        }
      case 'reveal':
        return {
          clipPath: isVisible ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
          transition: `clip-path 0.8s cubic-bezier(0.77, 0, 0.175, 1) ${wordDelay}ms`,
        }
      case 'blur-in':
        return {
          opacity: isVisible ? 1 : 0,
          filter: isVisible ? 'blur(0)' : 'blur(10px)',
          transform: isVisible ? 'scale(1)' : 'scale(0.95)',
          transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${wordDelay}ms`,
        }
      case 'wave':
        return {
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0) rotate(0deg)' : 'translateY(30px) rotate(-5deg)',
          transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${wordDelay}ms`,
        }
      case 'glitch':
        return {
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateX(0)' : `translateX(${Math.random() > 0.5 ? '20px' : '-20px'})`,
          textShadow: isVisible ? 'none' : '2px 0 cyan, -2px 0 magenta',
          transition: `all 0.3s cubic-bezier(0.16, 1, 0.3, 1) ${wordDelay}ms`,
        }
      default:
        return {}
    }
  }

  if (animation === 'typewriter') {
    return (
      <span ref={containerRef} className={`${className} inline-block`}>
        <TypewriterText text={children} isVisible={isVisible} />
      </span>
    )
  }

  return (
    <span ref={containerRef} className={`${className} inline-block`}>
      {words.map((word, i) => (
        <span
          key={i}
          className="inline-block mr-[0.3em] will-change-transform"
          style={getWordStyle(i)}
        >
          {word}
        </span>
      ))}
    </span>
  )
}

function TypewriterText({ text, isVisible }: { text: string; isVisible: boolean }) {
  const [displayText, setDisplayText] = useState('')
  const [cursor, setCursor] = useState(true)

  useEffect(() => {
    if (!isVisible) {
      setDisplayText('')
      return
    }

    let index = 0
    const interval = setInterval(() => {
      if (index <= text.length) {
        setDisplayText(text.slice(0, index))
        index++
      } else {
        clearInterval(interval)
      }
    }, 50)

    return () => clearInterval(interval)
  }, [isVisible, text])

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setCursor(c => !c)
    }, 530)
    return () => clearInterval(blinkInterval)
  }, [])

  return (
    <span>
      {displayText}
      <span
        className="inline-block w-[2px] h-[1em] bg-current ml-[2px] align-middle"
        style={{ opacity: cursor ? 1 : 0, transition: 'opacity 0.1s' }}
      />
    </span>
  )
}

// Animated gradient text for headlines
export function GradientText({
  children,
  className = '',
  colors = ['#06b6d4', '#8b5cf6', '#fbbf24', '#06b6d4'],
  speed = 3,
}: {
  children: React.ReactNode
  className?: string
  colors?: string[]
  speed?: number
}) {
  return (
    <span
      className={`inline-block bg-clip-text text-transparent ${className}`}
      style={{
        backgroundImage: `linear-gradient(90deg, ${colors.join(', ')})`,
        backgroundSize: '300% 100%',
        animation: `gradientMove ${speed}s ease infinite`,
      }}
    >
      {children}
      <style jsx>{`
        @keyframes gradientMove {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </span>
  )
}

// Glowing text effect
export function GlowText({
  children,
  className = '',
  color = 'cyan',
  intensity = 'medium',
}: {
  children: React.ReactNode
  className?: string
  color?: 'cyan' | 'purple' | 'gold' | 'emerald'
  intensity?: 'low' | 'medium' | 'high'
}) {
  const colorMap = {
    cyan: { base: '#06b6d4', glow: 'rgba(6, 182, 212, ' },
    purple: { base: '#8b5cf6', glow: 'rgba(139, 92, 246, ' },
    gold: { base: '#fbbf24', glow: 'rgba(251, 191, 36, ' },
    emerald: { base: '#10b981', glow: 'rgba(16, 185, 129, ' },
  }

  const intensityMap = {
    low: { spread: 10, opacity: 0.4 },
    medium: { spread: 20, opacity: 0.6 },
    high: { spread: 30, opacity: 0.8 },
  }

  const { base, glow } = colorMap[color]
  const { spread, opacity } = intensityMap[intensity]

  return (
    <span
      className={`relative inline-block ${className}`}
      style={{
        color: base,
        textShadow: `
          0 0 ${spread}px ${glow}${opacity}),
          0 0 ${spread * 2}px ${glow}${opacity * 0.5}),
          0 0 ${spread * 3}px ${glow}${opacity * 0.3})
        `,
        animation: 'glowPulse 2s ease-in-out infinite',
      }}
    >
      {children}
      <style jsx>{`
        @keyframes glowPulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.2); }
        }
      `}</style>
    </span>
  )
}

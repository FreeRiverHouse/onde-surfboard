"use client"

import { useState, useEffect, useRef } from 'react'

interface AnimatedNumberProps {
  value: number
  duration?: number
  delay?: number
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
  trend?: 'up' | 'down' | 'neutral'
  showTrend?: boolean
  trendValue?: string
}

export function AnimatedNumber({
  value,
  duration = 1000,
  delay = 0,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
  trend,
  showTrend = false,
  trendValue
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    // Intersection Observer for animate-on-scroll
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true)
            animateValue()
          }
        })
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [hasAnimated, value])

  const animateValue = () => {
    const startTime = performance.now() + delay
    const startValue = 0

    const animate = (currentTime: number) => {
      if (currentTime < startTime) {
        requestAnimationFrame(animate)
        return
      }

      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function (ease-out-expo)
      const easeOutExpo = 1 - Math.pow(2, -10 * progress)

      const currentValue = startValue + (value - startValue) * easeOutExpo
      setDisplayValue(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }

  const formattedValue = displayValue.toFixed(decimals)

  const trendColors = {
    up: 'text-emerald-400',
    down: 'text-red-400',
    neutral: 'text-white/40'
  }

  const trendIcons = {
    up: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    ),
    down: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
    neutral: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    )
  }

  return (
    <span ref={ref} className={`inline-flex items-center gap-2 ${className}`}>
      <span className="tabular-nums">
        {prefix}{formattedValue}{suffix}
      </span>
      {showTrend && trend && (
        <span className={`flex items-center gap-0.5 text-xs ${trendColors[trend]}`}>
          {trendIcons[trend]}
          {trendValue && <span>{trendValue}</span>}
        </span>
      )}
    </span>
  )
}

// Percentage variant with circular progress
interface AnimatedPercentageProps {
  value: number
  size?: number
  strokeWidth?: number
  color?: string
  bgColor?: string
  className?: string
  showLabel?: boolean
}

export function AnimatedPercentage({
  value,
  size = 60,
  strokeWidth = 4,
  color = '#06b6d4',
  bgColor = 'rgba(255,255,255,0.1)',
  className = '',
  showLabel = true
}: AnimatedPercentageProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const ref = useRef<SVGSVGElement>(null)

  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (displayValue / 100) * circumference

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const startTime = performance.now()
            const duration = 1500

            const animate = (currentTime: number) => {
              const elapsed = currentTime - startTime
              const progress = Math.min(elapsed / duration, 1)
              const easeOutExpo = 1 - Math.pow(2, -10 * progress)

              setDisplayValue(value * easeOutExpo)

              if (progress < 1) {
                requestAnimationFrame(animate)
              }
            }

            requestAnimationFrame(animate)
          }
        })
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [value])

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        ref={ref}
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.1s ease-out' }}
        />
      </svg>
      {showLabel && (
        <span className="absolute text-sm font-semibold text-white">
          {Math.round(displayValue)}%
        </span>
      )}
    </div>
  )
}

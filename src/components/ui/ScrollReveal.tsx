'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  animation?: 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'zoom-in' | 'flip' | 'rotate'
  delay?: number
  duration?: number
  distance?: number
  once?: boolean
  threshold?: number
}

export function ScrollReveal({
  children,
  className = '',
  animation = 'fade-up',
  delay = 0,
  duration = 700,
  distance = 50,
  once = true,
  threshold = 0.1,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once && ref.current) {
            observer.unobserve(ref.current)
          }
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [once, threshold])

  const getInitialTransform = () => {
    switch (animation) {
      case 'fade-up': return `translateY(${distance}px)`
      case 'fade-down': return `translateY(-${distance}px)`
      case 'fade-left': return `translateX(${distance}px)`
      case 'fade-right': return `translateX(-${distance}px)`
      case 'zoom-in': return 'scale(0.8)'
      case 'flip': return 'perspective(1000px) rotateX(90deg)'
      case 'rotate': return 'rotate(-10deg) scale(0.9)'
      default: return 'none'
    }
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'none' : getInitialTransform(),
        transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, 
                     transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}

// Parallax container that moves based on scroll position
export function Parallax({
  children,
  className = '',
  speed = 0.5,
  direction = 'up',
}: {
  children: ReactNode
  className?: string
  speed?: number
  direction?: 'up' | 'down' | 'left' | 'right'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const elementCenter = rect.top + rect.height / 2
      const viewportCenter = viewportHeight / 2
      const distanceFromCenter = elementCenter - viewportCenter
      setOffset(distanceFromCenter * speed * -1)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [speed])

  const getTransform = () => {
    switch (direction) {
      case 'up': return `translateY(${offset}px)`
      case 'down': return `translateY(${-offset}px)`
      case 'left': return `translateX(${offset}px)`
      case 'right': return `translateX(${-offset}px)`
      default: return 'none'
    }
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transform: getTransform(),
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  )
}

// Stagger children animations
export function StaggerChildren({
  children,
  className = '',
  stagger = 100,
  animation = 'fade-up',
  initialDelay = 0,
}: {
  children: ReactNode[]
  className?: string
  stagger?: number
  animation?: 'fade-up' | 'fade-left' | 'zoom-in' | 'scale'
  initialDelay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const getChildStyle = (index: number) => {
    const delay = initialDelay + index * stagger

    const baseStyle = {
      opacity: isVisible ? 1 : 0,
      transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
    }

    switch (animation) {
      case 'fade-up':
        return { ...baseStyle, transform: isVisible ? 'translateY(0)' : 'translateY(30px)' }
      case 'fade-left':
        return { ...baseStyle, transform: isVisible ? 'translateX(0)' : 'translateX(30px)' }
      case 'zoom-in':
        return { ...baseStyle, transform: isVisible ? 'scale(1)' : 'scale(0.8)' }
      case 'scale':
        return { ...baseStyle, transform: isVisible ? 'scale(1)' : 'scale(0)' }
      default:
        return baseStyle
    }
  }

  return (
    <div ref={ref} className={className}>
      {children.map((child, i) => (
        <div key={i} style={getChildStyle(i)}>
          {child}
        </div>
      ))}
    </div>
  )
}

// Number counter animation
export function CountUp({
  end,
  duration = 2000,
  prefix = '',
  suffix = '',
  className = '',
  decimals = 0,
}: {
  end: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
  decimals?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [count, setCount] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true)
        }
      },
      { threshold: 0.5 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [hasStarted])

  useEffect(() => {
    if (!hasStarted) return

    const startTime = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(end * eased)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [hasStarted, end, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}{count.toFixed(decimals)}{suffix}
    </span>
  )
}

// Magnetic hover effect for buttons/cards
export function Magnetic({
  children,
  className = '',
  strength = 0.3,
}: {
  children: ReactNode
  className?: string
  strength?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const x = (e.clientX - centerX) * strength
    const y = (e.clientY - centerY) * strength
    setPosition({ x, y })
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: position.x === 0 ? 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
      }}
    >
      {children}
    </div>
  )
}

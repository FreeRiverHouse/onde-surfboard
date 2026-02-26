'use client'

import { useEffect, useRef, useState } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  color: string
  pulse: number
  pulseSpeed: number
}

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    const particles: Particle[] = []
    const connectionDistance = 150
    const mouseRadius = 200

    const colors = [
      'rgba(6, 182, 212, ',      // Cyan
      'rgba(139, 92, 246, ',     // Purple
      'rgba(251, 191, 36, ',     // Gold
      'rgba(16, 185, 129, ',     // Emerald
      'rgba(236, 72, 153, ',     // Pink
    ]

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
      ctx.scale(dpr, dpr)
    }

    const createParticles = () => {
      particles.length = 0
      const w = window.innerWidth
      const h = window.innerHeight
      const count = Math.floor((w * h) / 12000) // Density based on screen size

      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.5 + 0.2,
          color: colors[Math.floor(Math.random() * colors.length)],
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: 0.02 + Math.random() * 0.02,
        })
      }
    }

    resize()
    createParticles()
    window.addEventListener('resize', () => {
      resize()
      createParticles()
    })

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMouseMove)

    const draw = () => {
      const w = window.innerWidth
      const h = window.innerHeight

      // Clear with trail effect
      ctx.fillStyle = 'rgba(10, 15, 26, 0.08)'
      ctx.fillRect(0, 0, w, h)

      const mouse = mouseRef.current

      particles.forEach((p, i) => {
        // Update pulse
        p.pulse += p.pulseSpeed
        const pulseFactor = 0.5 + Math.sin(p.pulse) * 0.5

        // Mouse repulsion
        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < mouseRadius && dist > 0) {
          const force = (mouseRadius - dist) / mouseRadius
          const angle = Math.atan2(dy, dx)
          p.vx += Math.cos(angle) * force * 0.3
          p.vy += Math.sin(angle) * force * 0.3
        }

        // Friction
        p.vx *= 0.99
        p.vy *= 0.99

        // Update position
        p.x += p.vx
        p.y += p.vy

        // Wrap around edges
        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h
        if (p.y > h) p.y = 0

        // Draw particle with glow
        const glowSize = p.size * 3 * pulseFactor
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize)
        gradient.addColorStop(0, p.color + (p.opacity * pulseFactor) + ')')
        gradient.addColorStop(0.4, p.color + (p.opacity * 0.5 * pulseFactor) + ')')
        gradient.addColorStop(1, p.color + '0)')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2)
        ctx.fill()

        // Draw connections (only check ahead to avoid duplicates)
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const cdx = p.x - p2.x
          const cdy = p.y - p2.y
          const cdist = Math.sqrt(cdx * cdx + cdy * cdy)

          if (cdist < connectionDistance) {
            const opacity = (1 - cdist / connectionDistance) * 0.15
            ctx.strokeStyle = p.color + opacity + ')'
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
          }
        }
      })

      animationId = requestAnimationFrame(draw)
    }

    // Start after small delay for smooth init
    setTimeout(() => {
      setIsVisible(true)
      draw()
    }, 100)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-15 pointer-events-none transition-opacity duration-1000"
      style={{ opacity: isVisible ? 0.7 : 0 }}
    />
  )
}

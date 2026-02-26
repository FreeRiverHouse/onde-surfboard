'use client'

import { useEffect, useRef, useCallback } from 'react'

interface Dot {
  x: number
  y: number
  baseX: number
  baseY: number
  vx: number
  vy: number
}

export function InteractiveDotGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const dotsRef = useRef<Dot[]>([])
  
  const initDots = useCallback((width: number, height: number) => {
    const spacing = 50
    const dots: Dot[] = []
    
    for (let x = spacing / 2; x < width; x += spacing) {
      for (let y = spacing / 2; y < height; y += spacing) {
        dots.push({
          x, y,
          baseX: x,
          baseY: y,
          vx: 0,
          vy: 0,
        })
      }
    }
    
    dotsRef.current = dots
  }, [])
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    let animationId: number
    
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initDots(canvas.width, canvas.height)
    }
    
    resize()
    window.addEventListener('resize', resize)
    
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMouseMove)
    
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      const mouse = mouseRef.current
      const maxDist = 200
      
      dotsRef.current.forEach(dot => {
        // Calculate distance from mouse
        const dx = mouse.x - dot.x
        const dy = mouse.y - dot.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist < maxDist) {
          // Push dots away from mouse
          const force = (1 - dist / maxDist) * 30
          const angle = Math.atan2(dy, dx)
          dot.vx -= Math.cos(angle) * force * 0.1
          dot.vy -= Math.sin(angle) * force * 0.1
        }
        
        // Spring back to original position
        const springX = (dot.baseX - dot.x) * 0.05
        const springY = (dot.baseY - dot.y) * 0.05
        
        dot.vx += springX
        dot.vy += springY
        
        // Damping
        dot.vx *= 0.9
        dot.vy *= 0.9
        
        // Update position
        dot.x += dot.vx
        dot.y += dot.vy
        
        // Calculate brightness based on displacement and mouse proximity
        const displacement = Math.sqrt(
          Math.pow(dot.x - dot.baseX, 2) + 
          Math.pow(dot.y - dot.baseY, 2)
        )
        const brightness = Math.min(1, displacement / 20 + (dist < maxDist ? (1 - dist / maxDist) * 0.5 : 0))
        
        // Draw dot
        const radius = 1.5 + brightness * 2
        const alpha = 0.15 + brightness * 0.6
        
        // Glow effect
        if (brightness > 0.1) {
          const glowGradient = ctx.createRadialGradient(
            dot.x, dot.y, 0,
            dot.x, dot.y, radius * 4
          )
          glowGradient.addColorStop(0, `rgba(6, 182, 212, ${alpha * 0.5})`)
          glowGradient.addColorStop(1, 'rgba(6, 182, 212, 0)')
          ctx.fillStyle = glowGradient
          ctx.beginPath()
          ctx.arc(dot.x, dot.y, radius * 4, 0, Math.PI * 2)
          ctx.fill()
        }
        
        // Core dot
        ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2)
        ctx.fill()
        
        // Draw connections to nearby dots
        dotsRef.current.forEach(other => {
          if (other === dot) return
          const cx = other.x - dot.x
          const cy = other.y - dot.y
          const cdist = Math.sqrt(cx * cx + cy * cy)
          
          if (cdist < 80) {
            const lineAlpha = (1 - cdist / 80) * 0.15 * (brightness + 0.2)
            ctx.strokeStyle = `rgba(6, 182, 212, ${lineAlpha})`
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(dot.x, dot.y)
            ctx.lineTo(other.x, other.y)
            ctx.stroke()
          }
        })
      })
      
      animationId = requestAnimationFrame(draw)
    }
    
    draw()
    
    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [initDots])
  
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-5 pointer-events-none"
      style={{ opacity: 0.8 }}
    />
  )
}

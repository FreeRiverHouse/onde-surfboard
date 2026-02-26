'use client'

import { useEffect, useRef } from 'react'

export function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    let animationId: number
    let time = 0
    
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    
    resize()
    window.addEventListener('resize', resize)
    
    // Aurora color stops
    const colors = [
      { r: 6, g: 182, b: 212 },   // Cyan
      { r: 13, g: 148, b: 136 },  // Teal  
      { r: 139, g: 92, b: 246 },  // Purple
      { r: 251, g: 191, b: 36 },  // Gold
      { r: 6, g: 182, b: 212 },   // Cyan (loop)
    ]
    
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    
    const getColor = (t: number) => {
      const segment = t * (colors.length - 1)
      const i = Math.floor(segment)
      const f = segment - i
      const c1 = colors[Math.min(i, colors.length - 1)]
      const c2 = colors[Math.min(i + 1, colors.length - 1)]
      return {
        r: lerp(c1.r, c2.r, f),
        g: lerp(c1.g, c2.g, f),
        b: lerp(c1.b, c2.b, f),
      }
    }
    
    const draw = () => {
      time += 0.002
      
      // Clear with fade
      ctx.fillStyle = 'rgba(10, 22, 40, 0.03)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Draw multiple aurora bands
      for (let band = 0; band < 4; band++) {
        const bandOffset = band * 0.25
        const y = canvas.height * (0.2 + band * 0.2)
        
        ctx.beginPath()
        ctx.moveTo(0, y)
        
        // Create wavy path
        for (let x = 0; x <= canvas.width; x += 10) {
          const wave1 = Math.sin(x * 0.003 + time + bandOffset) * 80
          const wave2 = Math.sin(x * 0.007 - time * 0.5 + bandOffset * 2) * 40
          const wave3 = Math.sin(x * 0.002 + time * 1.5 + bandOffset * 3) * 60
          ctx.lineTo(x, y + wave1 + wave2 + wave3)
        }
        
        ctx.lineTo(canvas.width, canvas.height)
        ctx.lineTo(0, canvas.height)
        ctx.closePath()
        
        // Animated gradient
        const gradient = ctx.createLinearGradient(0, y - 100, canvas.width, y + 200)
        const t1 = (Math.sin(time + bandOffset) + 1) / 2
        const t2 = (Math.sin(time * 0.7 + bandOffset + 1) + 1) / 2
        const c1 = getColor(t1)
        const c2 = getColor(t2)
        
        gradient.addColorStop(0, `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0)`)
        gradient.addColorStop(0.3, `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.08)`)
        gradient.addColorStop(0.5, `rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.12)`)
        gradient.addColorStop(0.7, `rgba(${c2.r}, ${c2.g}, ${c2.b}, 0.08)`)
        gradient.addColorStop(1, `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0)`)
        
        ctx.fillStyle = gradient
        ctx.fill()
      }
      
      // Draw glowing orbs
      for (let i = 0; i < 5; i++) {
        const orbX = canvas.width * (0.2 + i * 0.15) + Math.sin(time + i) * 100
        const orbY = canvas.height * 0.5 + Math.cos(time * 0.8 + i * 2) * 150
        const radius = 150 + Math.sin(time * 2 + i) * 50
        
        const orbGradient = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, radius)
        const c = getColor((i / 5 + time * 0.1) % 1)
        
        orbGradient.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, 0.15)`)
        orbGradient.addColorStop(0.5, `rgba(${c.r}, ${c.g}, ${c.b}, 0.05)`)
        orbGradient.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`)
        
        ctx.fillStyle = orbGradient
        ctx.beginPath()
        ctx.arc(orbX, orbY, radius, 0, Math.PI * 2)
        ctx.fill()
      }
      
      animationId = requestAnimationFrame(draw)
    }
    
    draw()
    
    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [])
  
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  )
}

'use client'

import { useEffect, useRef } from 'react'

// Ultra-smooth mesh gradient with morphing blobs
export function MeshGradient() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let time = 0

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
      ctx.scale(dpr, dpr)
    }

    resize()
    window.addEventListener('resize', resize)

    // Blob definitions with fluid motion
    const blobs = [
      { x: 0.2, y: 0.3, r: 0.4, color: { r: 6, g: 182, b: 212 }, speed: 0.0003 },
      { x: 0.8, y: 0.2, r: 0.35, color: { r: 139, g: 92, b: 246 }, speed: 0.0004 },
      { x: 0.5, y: 0.7, r: 0.45, color: { r: 13, g: 148, b: 136 }, speed: 0.00035 },
      { x: 0.15, y: 0.8, r: 0.3, color: { r: 251, g: 191, b: 36 }, speed: 0.00025 },
      { x: 0.85, y: 0.75, r: 0.38, color: { r: 236, g: 72, b: 153 }, speed: 0.00045 },
    ]

    const draw = () => {
      time++
      const w = window.innerWidth
      const h = window.innerHeight

      // Clear with dark base
      ctx.fillStyle = '#0a0f1a'
      ctx.fillRect(0, 0, w, h)

      // Draw each morphing blob
      blobs.forEach((blob, i) => {
        const offsetX = Math.sin(time * blob.speed + i * 1.5) * 0.15
        const offsetY = Math.cos(time * blob.speed * 1.2 + i * 2) * 0.15
        const scaleOsc = 1 + Math.sin(time * blob.speed * 0.8 + i) * 0.2

        const x = (blob.x + offsetX) * w
        const y = (blob.y + offsetY) * h
        const r = blob.r * Math.min(w, h) * scaleOsc

        // Multi-layer gradient for depth
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r)
        const { r: cr, g: cg, b: cb } = blob.color

        gradient.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, 0.35)`)
        gradient.addColorStop(0.3, `rgba(${cr}, ${cg}, ${cb}, 0.2)`)
        gradient.addColorStop(0.6, `rgba(${cr}, ${cg}, ${cb}, 0.08)`)
        gradient.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`)

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      })

      // Add subtle noise texture effect via points
      if (time % 3 === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.003)'
        for (let i = 0; i < 50; i++) {
          const x = Math.random() * w
          const y = Math.random() * h
          ctx.fillRect(x, y, 1, 1)
        }
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
      className="fixed inset-0 -z-30 pointer-events-none"
      style={{ opacity: 0.8 }}
    />
  )
}

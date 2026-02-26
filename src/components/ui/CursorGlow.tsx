'use client'

import { useEffect, useState, useRef } from 'react'

interface TrailPoint {
  x: number
  y: number
  age: number
}

export function CursorGlow() {
  const [position, setPosition] = useState({ x: -100, y: -100 })
  const [velocity, setVelocity] = useState({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = useState(false)
  const [isClicking, setIsClicking] = useState(false)
  const [trail, setTrail] = useState<TrailPoint[]>([])
  const lastPosition = useRef({ x: -100, y: -100 })
  const lastTime = useRef(Date.now())
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now()
      const dt = Math.max(now - lastTime.current, 1)
      
      const vx = (e.clientX - lastPosition.current.x) / dt * 16
      const vy = (e.clientY - lastPosition.current.y) / dt * 16
      
      setVelocity({ x: vx, y: vy })
      setPosition({ x: e.clientX, y: e.clientY })
      setIsVisible(true)
      
      // Add to trail
      setTrail(prev => {
        const newTrail = [...prev, { x: e.clientX, y: e.clientY, age: 0 }]
        return newTrail.slice(-12) // Keep last 12 points
      })
      
      lastPosition.current = { x: e.clientX, y: e.clientY }
      lastTime.current = now
    }
    
    const handleMouseLeave = () => {
      setIsVisible(false)
      setTrail([])
    }

    const handleMouseDown = () => setIsClicking(true)
    const handleMouseUp = () => setIsClicking(false)
    
    // Age trail points
    const trailInterval = setInterval(() => {
      setTrail(prev => 
        prev.map(p => ({ ...p, age: p.age + 1 })).filter(p => p.age < 15)
      )
    }, 30)
    
    window.addEventListener('mousemove', handleMouseMove)
    document.body.addEventListener('mouseleave', handleMouseLeave)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      document.body.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      clearInterval(trailInterval)
    }
  }, [])

  // Calculate speed for dynamic effects
  const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2)
  const stretchAngle = Math.atan2(velocity.y, velocity.x) * (180 / Math.PI)
  const stretch = Math.min(speed * 0.02, 0.5)
  
  return (
    <>
      {/* Trail effect */}
      {trail.map((point, i) => (
        <div
          key={i}
          className="fixed pointer-events-none rounded-full"
          style={{
            left: point.x,
            top: point.y,
            width: 8 - point.age * 0.4,
            height: 8 - point.age * 0.4,
            marginLeft: -(4 - point.age * 0.2),
            marginTop: -(4 - point.age * 0.2),
            background: `radial-gradient(circle, rgba(6, 182, 212, ${0.3 - point.age * 0.02}) 0%, transparent 70%)`,
            opacity: 1 - point.age * 0.07,
            zIndex: 0,
            filter: 'blur(2px)',
          }}
        />
      ))}

      {/* Outer ambient glow - responds to speed */}
      <div
        className="fixed pointer-events-none"
        style={{
          left: position.x,
          top: position.y,
          width: 700 + speed * 20,
          height: 700 + speed * 20,
          marginLeft: -(350 + speed * 10),
          marginTop: -(350 + speed * 10),
          background: `radial-gradient(
            ellipse,
            rgba(6, 182, 212, ${0.06 + speed * 0.002}) 0%,
            rgba(139, 92, 246, ${0.04 + speed * 0.001}) 25%,
            rgba(251, 191, 36, 0.02) 50%,
            transparent 70%
          )`,
          opacity: isVisible ? 1 : 0,
          transform: `rotate(${stretchAngle}deg) scaleX(${1 + stretch})`,
          transition: 'opacity 0.5s, width 0.3s, height 0.3s',
          zIndex: 0,
        }}
      />
      
      {/* Inner glow ring - color shifts with movement */}
      <div
        className="fixed pointer-events-none"
        style={{
          left: position.x,
          top: position.y,
          width: 200,
          height: 200,
          marginLeft: -100,
          marginTop: -100,
          background: `radial-gradient(
            circle,
            rgba(${6 + velocity.x * 2}, ${182 - Math.abs(velocity.y) * 3}, 212, 0.2) 0%,
            rgba(139, 92, 246, 0.1) 40%,
            transparent 70%
          )`,
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.3s',
          zIndex: 1,
        }}
      />
      
      {/* Core glow - pulses on click */}
      <div
        className="fixed pointer-events-none rounded-full"
        style={{
          left: position.x,
          top: position.y,
          width: isClicking ? 80 : 50,
          height: isClicking ? 80 : 50,
          marginLeft: isClicking ? -40 : -25,
          marginTop: isClicking ? -40 : -25,
          background: `radial-gradient(
            circle,
            rgba(6, 182, 212, ${isClicking ? 0.6 : 0.35}) 0%,
            rgba(139, 92, 246, ${isClicking ? 0.3 : 0.15}) 50%,
            transparent 100%
          )`,
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.2s, width 0.15s, height 0.15s, margin 0.15s',
          zIndex: 2,
          filter: `blur(${isClicking ? 8 : 6}px)`,
        }}
      />

      {/* Center dot */}
      <div
        className="fixed pointer-events-none rounded-full"
        style={{
          left: position.x,
          top: position.y,
          width: isClicking ? 8 : 4,
          height: isClicking ? 8 : 4,
          marginLeft: isClicking ? -4 : -2,
          marginTop: isClicking ? -4 : -2,
          background: 'rgba(255, 255, 255, 0.8)',
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.1s, width 0.1s, height 0.1s',
          zIndex: 3,
          boxShadow: `0 0 10px rgba(6, 182, 212, 0.8), 0 0 20px rgba(6, 182, 212, 0.4)`,
        }}
      />
    </>
  )
}

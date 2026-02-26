'use client'

import { useRef, useState, type ReactNode, type MouseEvent } from 'react'

interface TiltCardProps {
  children: ReactNode
  className?: string
  glowColor?: string
  tiltAmount?: number
}

export function TiltCard({ 
  children, 
  className = '', 
  glowColor = 'rgba(6, 182, 212, 0.4)',
  tiltAmount = 10 
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState('')
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 })
  const [isHovering, setIsHovering] = useState(false)
  
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    const rotateX = ((y - centerY) / centerY) * -tiltAmount
    const rotateY = ((x - centerX) / centerX) * tiltAmount
    
    setTransform(
      `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
    )
    
    setGlowPosition({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    })
  }
  
  const handleMouseLeave = () => {
    setTransform('')
    setIsHovering(false)
  }
  
  const handleMouseEnter = () => {
    setIsHovering(true)
  }
  
  return (
    <div
      ref={cardRef}
      className={`relative transition-transform duration-200 ease-out ${className}`}
      style={{ 
        transform,
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
    >
      {/* Spotlight effect */}
      <div
        className="absolute inset-0 rounded-[inherit] pointer-events-none transition-opacity duration-300"
        style={{
          opacity: isHovering ? 1 : 0,
          background: `radial-gradient(
            600px circle at ${glowPosition.x}% ${glowPosition.y}%,
            ${glowColor},
            transparent 40%
          )`,
        }}
      />
      
      {/* Border glow */}
      <div
        className="absolute -inset-[1px] rounded-[inherit] pointer-events-none transition-opacity duration-300"
        style={{
          opacity: isHovering ? 1 : 0,
          background: `radial-gradient(
            400px circle at ${glowPosition.x}% ${glowPosition.y}%,
            ${glowColor},
            transparent 40%
          )`,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: '2px',
        }}
      />
      
      {children}
    </div>
  )
}

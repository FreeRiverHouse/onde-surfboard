'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatedText, GradientText, GlowText } from './AnimatedText'
import { ScrollReveal, Magnetic } from './ScrollReveal'

interface HeroSectionProps {
  title: string
  subtitle?: string
  badge?: string
  cta?: {
    text: string
    href: string
  }
  secondaryCta?: {
    text: string
    href: string
  }
}

export function HeroSection({ title, subtitle, badge, cta, secondaryCta }: HeroSectionProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      setMousePosition({
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      })
    }

    const container = containerRef.current
    container?.addEventListener('mousemove', handleMouseMove)
    return () => container?.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative min-h-[70vh] flex items-center justify-center overflow-hidden"
    >
      {/* Dynamic spotlight following cursor */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(
            800px circle at ${mousePosition.x * 100}% ${mousePosition.y * 100}%,
            rgba(6, 182, 212, 0.15) 0%,
            rgba(139, 92, 246, 0.08) 25%,
            transparent 50%
          )`,
          transition: 'background 0.3s ease-out',
        }}
      />

      {/* Floating orbs with parallax */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large orb top-left */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full blur-[120px]"
          style={{
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, transparent 70%)',
            top: '-20%',
            left: '-10%',
            transform: `translate(${(mousePosition.x - 0.5) * 30}px, ${(mousePosition.y - 0.5) * 30}px)`,
            transition: 'transform 0.5s ease-out',
          }}
        />
        {/* Medium orb top-right */}
        <div
          className="absolute w-[400px] h-[400px] rounded-full blur-[100px]"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%)',
            top: '10%',
            right: '-5%',
            transform: `translate(${(mousePosition.x - 0.5) * -20}px, ${(mousePosition.y - 0.5) * -20}px)`,
            transition: 'transform 0.5s ease-out',
          }}
        />
        {/* Small orb bottom */}
        <div
          className="absolute w-[300px] h-[300px] rounded-full blur-[80px]"
          style={{
            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.2) 0%, transparent 70%)',
            bottom: '5%',
            left: '30%',
            transform: `translate(${(mousePosition.x - 0.5) * 40}px, ${(mousePosition.y - 0.5) * 40}px)`,
            transition: 'transform 0.5s ease-out',
          }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
          transform: `perspective(1000px) rotateX(60deg) translateY(-50%)`,
          transformOrigin: 'center center',
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Badge */}
        {badge && (
          <ScrollReveal animation="zoom-in" delay={0}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
              <span className="text-sm text-white/70">{badge}</span>
            </div>
          </ScrollReveal>
        )}

        {/* Title */}
        <ScrollReveal animation="fade-up" delay={100}>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
            <GradientText colors={['#ffffff', '#06b6d4', '#8b5cf6', '#ffffff']}>
              {title}
            </GradientText>
          </h1>
        </ScrollReveal>

        {/* Subtitle */}
        {subtitle && (
          <ScrollReveal animation="fade-up" delay={200}>
            <p className="text-xl md:text-2xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
              <AnimatedText animation="blur-in" stagger={50}>
                {subtitle}
              </AnimatedText>
            </p>
          </ScrollReveal>
        )}

        {/* CTA Buttons */}
        {(cta || secondaryCta) && (
          <ScrollReveal animation="fade-up" delay={300}>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {cta && (
                <Magnetic strength={0.15}>
                  <a
                    href={cta.href}
                    className="group relative px-8 py-4 rounded-2xl font-semibold text-lg overflow-hidden"
                  >
                    {/* Animated gradient background */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #06b6d4 100%)',
                        backgroundSize: '200% 200%',
                        animation: 'gradientShift 3s ease infinite',
                      }}
                    />
                    {/* Shine effect */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)',
                        backgroundSize: '200% 100%',
                        animation: 'shine 1.5s ease-in-out infinite',
                      }}
                    />
                    <span className="relative z-10 text-white drop-shadow-lg">
                      {cta.text}
                    </span>
                  </a>
                </Magnetic>
              )}

              {secondaryCta && (
                <Magnetic strength={0.15}>
                  <a
                    href={secondaryCta.href}
                    className="group relative px-8 py-4 rounded-2xl font-semibold text-lg bg-white/5 border border-white/20 hover:bg-white/10 hover:border-white/30 transition-all duration-300 text-white"
                  >
                    {secondaryCta.text}
                    <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
                  </a>
                </Magnetic>
              )}
            </div>
          </ScrollReveal>
        )}
      </div>

      <style jsx>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes shine {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}

// Compact header stats row
export function StatsBar({ stats }: { stats: { label: string; value: string; trend?: string }[] }) {
  return (
    <div className="flex items-center justify-center gap-8 flex-wrap py-8">
      {stats.map((stat, i) => (
        <ScrollReveal key={i} animation="zoom-in" delay={i * 100}>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold">
              <GlowText color="cyan" intensity="low">{stat.value}</GlowText>
            </div>
            <div className="text-sm text-white/40 mt-1 flex items-center gap-2 justify-center">
              {stat.label}
              {stat.trend && (
                <span className={`text-xs ${stat.trend.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stat.trend}
                </span>
              )}
            </div>
          </div>
        </ScrollReveal>
      ))}
    </div>
  )
}

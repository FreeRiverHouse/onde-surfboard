'use client'

import dynamic from 'next/dynamic'

// Dynamic imports with SSR disabled for canvas-based components
const MeshGradient = dynamic(
  () => import('./MeshGradient').then(mod => ({ default: mod.MeshGradient })),
  { ssr: false }
)

const AuroraBackground = dynamic(
  () => import('./AuroraBackground').then(mod => ({ default: mod.AuroraBackground })),
  { ssr: false }
)

const InteractiveDotGrid = dynamic(
  () => import('./InteractiveDotGrid').then(mod => ({ default: mod.InteractiveDotGrid })),
  { ssr: false }
)

const LiquidBlobs = dynamic(
  () => import('./LiquidBlobs').then(mod => ({ default: mod.LiquidBlobs })),
  { ssr: false }
)

const CursorGlow = dynamic(
  () => import('./CursorGlow').then(mod => ({ default: mod.CursorGlow })),
  { ssr: false }
)

const ParticleField = dynamic(
  () => import('./ParticleField').then(mod => ({ default: mod.ParticleField })),
  { ssr: false }
)

export function BackgroundEffects() {
  return (
    <>
      {/* Base layer - morphing mesh gradient */}
      <MeshGradient />
      
      {/* Liquid blobs - mid layer */}
      <LiquidBlobs />
      
      {/* Aurora effect */}
      <AuroraBackground />
      
      {/* Interactive particles */}
      <ParticleField />
      
      {/* Dot grid */}
      <InteractiveDotGrid />
      
      {/* Cursor glow - top layer */}
      <CursorGlow />
    </>
  )
}

import { getDashboardStats } from '@/lib/data'
import { PostApproval } from '@/components/PostApproval'
import { PolyRobortoPanel } from '@/components/PolyRobortoPanel'
import { CordePanel } from '@/components/CordePanel'
import { TechSupportPanel } from '@/components/TechSupportPanel'
import { TestStatusPanel } from '@/components/TestStatusPanel'
import { EnhancedStats, WeeklyComparison } from '@/components/EnhancedStats'
import { ActivityFeed } from '@/components/ActivityFeed'
import { AgentTasksPanel } from '@/components/AgentTasksPanel'
import { FreeRiverHouse } from '@/components/FreeRiverHouse'
import { GlowCard } from '@/components/ui/GlowCard'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { GradientText } from '@/components/ui/AnimatedText'

export const runtime = 'edge'

export default async function Dashboard() {
  const stats = await getDashboardStats()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero Header - Ultra Premium */}
      <div className="mb-16 relative">
        {/* Multi-layer background glow */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 via-transparent to-purple-500/30 blur-[120px] animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-b from-teal-500/20 to-transparent blur-[80px]" style={{ animationDelay: '1s' }} />
        </div>
        
        <ScrollReveal animation="fade-up" duration={800}>
          <div className="relative pt-8">
            {/* Animated badge */}
            <div className="flex items-center gap-4 mb-6">
              <div className="group flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-sm hover:bg-emerald-500/20 transition-all duration-300 cursor-default">
                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
                </div>
                <span className="text-sm text-emerald-300 font-medium">All systems operational</span>
              </div>
              <span className="text-white/30 text-sm hidden sm:block">•</span>
              <span className="text-white/30 text-sm hidden sm:block">Central Operations</span>
            </div>
            
            {/* Main title with animated gradient */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4">
              <GradientText 
                colors={['#ffffff', '#06b6d4', '#8b5cf6', '#06b6d4', '#ffffff']}
                speed={4}
                className="drop-shadow-2xl"
              >
                FreeRiverHouse
              </GradientText>
              <span className="text-white/15 font-light ml-4">HQ</span>
            </h1>
            
            {/* Subtitle with glow */}
            <p className="text-xl text-white/40 max-w-xl mb-6">
              Command center for autonomous operations, agent coordination, and real-time monitoring.
            </p>
            
            {/* Quick actions keyboard hint */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-white/25 text-sm group cursor-pointer hover:text-white/40 transition-colors">
                <kbd className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 font-mono text-xs group-hover:border-cyan-500/30 group-hover:bg-cyan-500/5 transition-all">
                  ⌘K
                </kbd>
                <span>Quick actions</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <a href="/betting" className="flex items-center gap-2 text-white/25 text-sm hover:text-cyan-400/80 transition-colors">
                <span>🎰</span>
                <span>Live betting</span>
              </a>
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Enhanced Stats with Sparklines */}
      <ScrollReveal animation="fade-up" delay={100}>
        <div className="mb-10">
          <EnhancedStats stats={stats} />
        </div>
      </ScrollReveal>

      {/* Main Grid - 3 columns on large screens */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Left column: Post Approval */}
        <ScrollReveal animation="fade-right" delay={0} className="lg:col-span-2">
          <GlowCard variant="cyan" noPadding noTilt glassIntensity="high">
            <PostApproval />
          </GlowCard>
        </ScrollReveal>

        {/* Right column: Activity Feed */}
        <ScrollReveal animation="fade-left" delay={100} className="lg:col-span-1">
          <GlowCard variant="purple" noPadding noTilt glassIntensity="high">
            <ActivityFeed maxItems={6} />
          </GlowCard>
        </ScrollReveal>
      </div>

      {/* Second Row - PolyRoborto & Weekly Comparison */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <ScrollReveal animation="fade-right" delay={0} className="lg:col-span-2">
          <GlowCard variant="gold" noPadding noTilt glassIntensity="high">
            <PolyRobortoPanel />
          </GlowCard>
        </ScrollReveal>
        <ScrollReveal animation="fade-left" delay={100} className="lg:col-span-1">
          <GlowCard variant="cyan" noPadding noTilt glassIntensity="high">
            <WeeklyComparison stats={stats} />
          </GlowCard>
        </ScrollReveal>
      </div>

      {/* Third Row - Free River House Map */}
      <ScrollReveal animation="zoom-in" delay={0}>
        <div className="mb-8">
          <GlowCard variant="emerald" noPadding noTilt glassIntensity="high">
            <FreeRiverHouse />
          </GlowCard>
        </div>
      </ScrollReveal>

      {/* Fourth Row - Agent Tasks & CORDE */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <ScrollReveal animation="fade-right" delay={0}>
          <GlowCard variant="purple" noPadding noTilt glassIntensity="high">
            <AgentTasksPanel />
          </GlowCard>
        </ScrollReveal>
        <ScrollReveal animation="fade-left" delay={100}>
          <GlowCard variant="cyan" noPadding noTilt glassIntensity="high">
            <CordePanel />
          </GlowCard>
        </ScrollReveal>
      </div>

      {/* Fifth Row - Tech Support & Test Status */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <ScrollReveal animation="fade-right" delay={0} className="lg:col-span-2">
          <GlowCard variant="gold" noPadding noTilt glassIntensity="high">
            <TechSupportPanel />
          </GlowCard>
        </ScrollReveal>
        <ScrollReveal animation="fade-left" delay={100} className="lg:col-span-1">
          <TestStatusPanel />
        </ScrollReveal>
      </div>

      {/* Games Section - New! */}
      <ScrollReveal animation="fade-up" delay={200}>
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white/80 mb-4 flex items-center gap-3">
            <span className="text-3xl">🎮</span>
            <span>Games</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <GameCard 
              href="/static-games/moonlight-magic-house"
              title="Moonlight Magic House"
              description="Explore Luna's magical house with WASD controls"
              icon="🌙"
              gradient="from-purple-500/30 to-indigo-500/30"
              borderColor="border-purple-500/30 hover:border-purple-400/50"
            />
            <GameCard 
              href="/static-games/skin-creator"
              title="Skin Creator"
              description="Create unique characters with AI-powered evolution"
              icon="🎨"
              gradient="from-pink-500/30 to-rose-500/30"
              borderColor="border-pink-500/30 hover:border-pink-400/50"
            />
            <GameCard 
              href="/static-games/vr-reader"
              title="VR Reader"
              description="Immersive reading experience in virtual reality"
              icon="📚"
              gradient="from-cyan-500/30 to-blue-500/30"
              borderColor="border-cyan-500/30 hover:border-cyan-400/50"
            />
          </div>
        </div>
      </ScrollReveal>

      {/* Quick Links - Bento Grid Style */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <QuickLink 
          href="/house" 
          icon="🏠" 
          title="House" 
          subtitle="Dashboard"
          gradient="from-amber-500/20 to-orange-500/20"
          borderColor="border-amber-500/20 hover:border-amber-400/40"
          glowColor="hover:shadow-amber-500/20"
        />
        <QuickLink 
          href="/pr" 
          icon="📢" 
          title="OndePR" 
          subtitle="Approve Posts"
          gradient="from-cyan-500/20 to-blue-500/20"
          borderColor="border-cyan-500/20 hover:border-cyan-400/40"
          glowColor="hover:shadow-cyan-500/20"
        />
        <QuickLink 
          href="/frh" 
          icon="🤖" 
          title="Agents" 
          subtitle="7 Active"
          gradient="from-purple-500/20 to-indigo-500/20"
          borderColor="border-purple-500/20 hover:border-purple-400/40"
          glowColor="hover:shadow-purple-500/20"
        />
        <QuickLink 
          href="/betting" 
          icon="🎰" 
          title="Betting" 
          subtitle="Kalshi Live"
          gradient="from-emerald-500/20 to-teal-500/20"
          borderColor="border-emerald-500/20 hover:border-emerald-400/40"
          glowColor="hover:shadow-emerald-500/20"
        />
        <QuickLink 
          href="https://onde.la" 
          icon="🌊" 
          title="onde.la" 
          subtitle="Main Site"
          external
        />
        <QuickLink 
          href="https://x.com/Onde_FRH" 
          icon="𝕏" 
          title="@Onde_FRH" 
          subtitle="Twitter/X"
          external
        />
        <QuickLink 
          href="https://github.com/FreeRiverHouse/Onde" 
          icon={<GitHubIcon />}
          title="GitHub" 
          subtitle="Source Code"
          external
        />
        <QuickLink 
          href="https://youtube.com/@OndeLounge" 
          icon={<YouTubeIcon />}
          title="YouTube" 
          subtitle="Onde Lounge"
          external
        />
      </div>
    </div>
  )
}

function QuickLink({ 
  href, 
  icon, 
  title, 
  subtitle, 
  gradient = 'from-white/5 to-white/[0.02]',
  borderColor = 'border-white/10 hover:border-white/20',
  glowColor = 'hover:shadow-white/10',
  external = false 
}: {
  href: string
  icon: React.ReactNode
  title: string
  subtitle: string
  gradient?: string
  borderColor?: string
  glowColor?: string
  external?: boolean
}) {
  return (
    <a 
      href={href} 
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={`
        group relative overflow-hidden
        bg-gradient-to-br ${gradient}
        rounded-2xl p-4 
        border ${borderColor}
        transition-all duration-500 ease-out
        hover:shadow-2xl ${glowColor}
        hover:-translate-y-1
        text-center
      `}
    >
      {/* Hover shine effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s ease-in-out infinite',
          }}
        />
      </div>
      
      <div className="relative z-10">
        <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <div className="text-white text-sm font-medium">{title}</div>
        <div className="text-white/30 text-xs mt-0.5">{subtitle}</div>
      </div>
    </a>
  )
}

function GitHubIcon() {
  return (
    <svg className="w-6 h-6 mx-auto" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  )
}

function YouTubeIcon() {
  return (
    <svg className="w-6 h-6 mx-auto text-red-500" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  )
}

function GameCard({ 
  href, 
  title, 
  description, 
  icon,
  gradient = 'from-white/10 to-white/5',
  borderColor = 'border-white/20 hover:border-white/40',
}: {
  href: string
  title: string
  description: string
  icon: string
  gradient?: string
  borderColor?: string
}) {
  return (
    <a 
      href={href}
      className={`
        group relative overflow-hidden
        bg-gradient-to-br ${gradient}
        rounded-2xl p-6 
        border ${borderColor}
        transition-all duration-500 ease-out
        hover:shadow-2xl hover:shadow-purple-500/10
        hover:-translate-y-2 hover:scale-[1.02]
      `}
    >
      {/* Animated background glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
      </div>
      
      <div className="relative z-10">
        <div className="text-4xl mb-3 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
          {icon}
        </div>
        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-white transition-colors">
          {title}
        </h3>
        <p className="text-sm text-white/50 group-hover:text-white/70 transition-colors">
          {description}
        </p>
        
        {/* Play button hint */}
        <div className="mt-4 flex items-center gap-2 text-sm text-white/30 group-hover:text-white/60 transition-colors">
          <span className="text-lg group-hover:translate-x-1 transition-transform">▶</span>
          <span>Play now</span>
        </div>
      </div>
    </a>
  )
}

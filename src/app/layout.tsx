import './globals.css'
import type { Metadata } from 'next'
import { Providers } from '@/components/Providers'
import { AuthButtons } from '@/components/AuthButtons'
import { HeaderClient } from '@/components/HeaderClient'
import { BackgroundEffects } from '@/components/ui/BackgroundEffects'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { ThemeToggle } from '@/components/ThemeToggle'
import { GoogleAnalytics } from '@/components/GoogleAnalytics'
import { Breadcrumb } from '@/components/ui/Breadcrumb'

export const metadata: Metadata = {
  title: 'FRH HQ | FreeRiverHouse',
  description: 'FreeRiverHouse Central Operations - Surfboard Dashboard',
  keywords: ['FreeRiverHouse', 'Onde', 'Dashboard', 'AI Publishing'],
  authors: [{ name: 'FreeRiverHouse' }],
  openGraph: {
    title: 'FRH HQ | Surfboard',
    description: 'FreeRiverHouse Central Operations - Command & Control Dashboard',
    url: 'https://onde.surf',
    siteName: 'Onde Surfboard',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/icon.svg',
        width: 32,
        height: 32,
        alt: 'Onde Wave Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'FRH HQ | Surfboard',
    description: 'FreeRiverHouse Central Operations Dashboard',
    creator: '@FreeRiverHouse',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.svg',
  },
}

// Force dynamic rendering to avoid prerender issues with auth/theme contexts
export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Surfboard" />
        <meta name="theme-color" content="#06b6d4" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-[#0a0f1a] text-white antialiased overflow-x-hidden">
        <GoogleAnalytics />
        <Providers>
          {/* Service Worker for offline PWA */}
          <ServiceWorkerRegistration />
          <OfflineIndicator />
          
          {/* Premium Background Effects */}
          <BackgroundEffects />
          
          {/* Noise texture overlay */}
          <div 
            className="fixed inset-0 pointer-events-none z-50 opacity-[0.015]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Header - Glassmorphism */}
          <header className="sticky top-0 z-40 backdrop-blur-2xl border-b border-white/[0.06]"
            style={{
              background: 'linear-gradient(180deg, rgba(10, 15, 26, 0.9) 0%, rgba(10, 15, 26, 0.8) 100%)',
            }}
          >
            <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
              {/* Logo with glow */}
              <a href="/" className="flex items-center gap-3 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl blur-lg opacity-50 group-hover:opacity-80 transition-opacity" />
                  <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-teal-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-cyan-500/30">
                    <span className="drop-shadow-lg">🏄</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-semibold text-lg tracking-tight hidden sm:block">Surfboard</span>
                  <span className="text-cyan-400/60 text-[10px] font-medium tracking-wider uppercase hidden sm:block">FRH HQ</span>
                </div>
              </a>

              {/* Nav - Premium style */}
              <div className="flex items-center gap-4">
                <nav className="hidden md:flex items-center p-1 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <a href="/" className="px-4 py-2 text-sm text-white/70 hover:text-white transition-all rounded-lg hover:bg-white/[0.08] hover:shadow-lg hover:shadow-cyan-500/10">
                    Dashboard
                  </a>
                  <a href="/analytics" className="px-4 py-2 text-sm text-white/70 hover:text-white transition-all rounded-lg hover:bg-white/[0.08] hover:shadow-lg hover:shadow-cyan-500/10">
                    Analytics
                  </a>
                  <a href="/house" className="px-4 py-2 text-sm text-white/70 hover:text-white transition-all rounded-lg hover:bg-white/[0.08] hover:shadow-lg hover:shadow-cyan-500/10">
                    House
                  </a>
                  <a href="/pr" className="px-4 py-2 text-sm text-white/70 hover:text-white transition-all rounded-lg hover:bg-white/[0.08] hover:shadow-lg hover:shadow-cyan-500/10">
                    PR
                  </a>
                  <a href="/betting" className="px-4 py-2 text-sm text-white/70 hover:text-white transition-all rounded-lg hover:bg-white/[0.08] hover:shadow-lg hover:shadow-cyan-500/10">
                    Betting
                  </a>
                  <a href="/corde" className="px-4 py-2 text-sm text-white/70 hover:text-white transition-all rounded-lg hover:bg-white/[0.08] hover:shadow-lg hover:shadow-cyan-500/10">
                    CORDE
                  </a>
                  <a href="/social" className="px-4 py-2 text-sm text-white/70 hover:text-white transition-all rounded-lg hover:bg-white/[0.08] hover:shadow-lg hover:shadow-cyan-500/10">
                    Social
                  </a>
                  <a href="/house/chat" className="px-4 py-2 text-sm text-white/70 hover:text-white transition-all rounded-lg hover:bg-white/[0.08] hover:shadow-lg hover:shadow-cyan-500/10">
                    💬 Chat
                  </a>
                  <a href="/bot-configs" className="px-4 py-2 text-sm text-white/70 hover:text-white transition-all rounded-lg hover:bg-white/[0.08] hover:shadow-lg hover:shadow-cyan-500/10">
                    🤖 Bots
                  </a>
                </nav>
                <ThemeToggle />
                <HeaderClient />
                <AuthButtons />
              </div>
            </div>
          </header>

          {/* Breadcrumb */}
          <Breadcrumb />

          {/* Main */}
          <main className="relative z-10 min-h-[calc(100vh-120px)]">{children}</main>

          {/* Footer - Minimal */}
          <footer className="relative z-10 border-t border-white/[0.05] py-8">
            <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/20">Built with</span>
                <span className="text-cyan-400/60">⚡</span>
                <span className="text-xs text-white/20">by FreeRiverHouse</span>
              </div>
              <span className="text-xs text-white/20 font-mono">2026</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  )
}


"use client"

export const runtime = 'edge'

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {/* Logo/Brand */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surf-teal/10 border border-surf-teal/20 mb-6">
            <span className="text-4xl">🌊</span>
          </div>

          <h1 className="text-4xl font-bold mb-4">
            <span className="glow-text text-surf-aqua">Coming Soon</span>
          </h1>

          <p className="text-surf-foam/60 text-lg leading-relaxed">
            Stiamo lavorando per rendere pubblici più libri, giochi e app.
          </p>
        </div>

        {/* Message */}
        <div className="surf-card mb-8">
          <p className="text-surf-foam/80 mb-6">
            Nel frattempo, scopri il nostro catalogo disponibile su:
          </p>

          <a
            href="https://onde.la"
            className="inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-surf-teal to-surf-cyan text-white font-medium hover:opacity-90 transition-all hover:scale-105 active:scale-95 w-full"
          >
            <span className="text-xl">🌊</span>
            Visita onde.la
          </a>
        </div>

        {/* Social Links */}
        <div className="flex justify-center gap-4">
          <a
            href="https://x.com/Onde_FRH"
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-surf-foam/60 hover:text-surf-aqua hover:border-surf-aqua/30 transition-all"
          >
            <span className="text-lg">𝕏</span>
          </a>
          <a
            href="https://youtube.com/@OndeLounge"
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-surf-foam/60 hover:text-surf-aqua hover:border-surf-aqua/30 transition-all"
          >
            <span className="text-lg">▶</span>
          </a>
        </div>

        {/* Footer */}
        <p className="mt-12 text-sm text-surf-foam/40">
          Onde Publishing House
        </p>
      </div>
    </div>
  )
}

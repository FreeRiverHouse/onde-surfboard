'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0f1a] text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="text-6xl mb-6">🌊</div>
          <h1 className="text-2xl font-bold mb-4 text-cyan-400">Something went wrong</h1>
          <p className="text-white/60 mb-6">
            {error?.message || 'An unexpected error occurred.'}
          </p>
          {error?.digest && (
            <p className="text-xs text-white/30 mb-4 font-mono">
              Error ID: {error.digest}
            </p>
          )}
          <div className="flex gap-4 justify-center">
            <button
              onClick={reset}
              className="px-6 py-3 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30 hover:bg-cyan-500/30 transition-all"
            >
              Try again
            </button>
            <a
              href="/"
              className="px-6 py-3 bg-white/10 text-white/70 rounded-xl border border-white/20 hover:bg-white/15 transition-all"
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}

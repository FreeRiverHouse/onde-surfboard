'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="text-5xl mb-6">⚠️</div>
        <h2 className="text-xl font-bold mb-3 text-amber-400">Something went wrong</h2>
        <p className="text-white/60 mb-6 text-sm">
          {error?.message || 'An unexpected error occurred while loading this page.'}
        </p>
        {error?.digest && (
          <p className="text-xs text-white/30 mb-4 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30 hover:bg-cyan-500/30 transition-all text-sm"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-5 py-2.5 bg-white/10 text-white/70 rounded-xl border border-white/20 hover:bg-white/15 transition-all text-sm"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}

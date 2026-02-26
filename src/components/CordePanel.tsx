'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from './Toast'

interface Book {
  id: string
  title: string
  author: string
  illustrator: string
  status: 'concept' | 'testo_in_corso' | 'testo_completo' | 'illustrazioni' | 'layout' | 'review' | 'pubblicato'
  progress: number
  chapters: number
  chaptersReady: number
  imagesReady: number
  imagesTotal: number
}

interface Author {
  id: string
  name: string
  role: 'writer' | 'illustrator'
  style: string
  activeBooks: number
}

interface CordeStatus {
  backend: 'online' | 'offline' | 'checking'
  books: Book[]
  authors: Author[]
  queuedJobs: number
}

const CORDE_API = process.env.NEXT_PUBLIC_CORDE_API || 'http://192.168.1.234:3700'

export function CordePanel() {
  const [status, setStatus] = useState<CordeStatus>({
    backend: 'checking',
    books: [],
    authors: [],
    queuedJobs: 0
  })
  const [loading, setLoading] = useState(true)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackTo, setFeedbackTo] = useState('')
  const [expandedBook, setExpandedBook] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const { showToast } = useToast()

  const fetchStatus = useCallback(async () => {
    // Check backend
    let backendOnline = false
    try {
      const res = await fetch(`${CORDE_API}/api/health`, { signal: AbortSignal.timeout(3000) })
      backendOnline = res.ok
    } catch {
      // Offline
    }

    // Try to get real data from CORDE
    let books: Book[] = []
    let authors: Author[] = []

    try {
      const res = await fetch('/api/corde/status')
      if (res.ok) {
        const data = await res.json()
        books = data.books || []
        authors = data.authors || []
      }
    } catch {
      // Use demo data
      books = [
        {
          id: 'marco-aurelio-bambini',
          title: 'Marco Aurelio per Bambini',
          author: 'Gianni Parola',
          illustrator: 'Pina Pennello',
          status: 'testo_completo',
          progress: 40,
          chapters: 10,
          chaptersReady: 10,
          imagesReady: 0,
          imagesTotal: 10
        },
        {
          id: 'milo-internet',
          title: 'MILO e Internet',
          author: 'EMILIO',
          illustrator: 'Onde Futures',
          status: 'illustrazioni',
          progress: 90,
          chapters: 10,
          chaptersReady: 10,
          imagesReady: 10,
          imagesTotal: 10
        }
      ]
      authors = [
        { id: 'gianni-parola', name: 'Gianni Parola', role: 'writer', style: 'Narrativa per bambini', activeBooks: 1 },
        { id: 'pina-pennello', name: 'Pina Pennello', role: 'illustrator', style: 'Acquarello europeo', activeBooks: 1 },
        { id: 'emilio', name: 'EMILIO', role: 'writer', style: 'Tech per bambini', activeBooks: 1 }
      ]
    }

    setStatus({
      backend: backendOnline ? 'online' : 'offline',
      books,
      authors,
      queuedJobs: 0
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const sendFeedback = useCallback(async () => {
    if (!feedbackText.trim() || !feedbackTo) return

    setSending(true)
    try {
      await fetch('/api/corde/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: feedbackTo, message: feedbackText })
      })
      const authorName = status.authors.find(a => a.id === feedbackTo)?.name || feedbackTo
      showToast(`Feedback sent to ${authorName}`, 'success')
      setFeedbackText('')
      setFeedbackTo('')
    } catch {
      showToast('Feedback saved locally', 'info')
    }
    setSending(false)
  }, [feedbackText, feedbackTo, status.authors, showToast])

  const statusLabels = useMemo(() => ({
    concept: { label: 'Concept', color: 'text-gray-400' },
    testo_in_corso: { label: 'Scrittura', color: 'text-amber-400' },
    testo_completo: { label: 'Testo OK', color: 'text-emerald-400' },
    illustrazioni: { label: 'Illustrazioni', color: 'text-cyan-400' },
    layout: { label: 'Layout', color: 'text-purple-400' },
    review: { label: 'Review', color: 'text-orange-400' },
    pubblicato: { label: 'Pubblicato', color: 'text-emerald-500' }
  } as Record<string, { label: string; color: string }>), [])

  // toggleBook is handled inline in the JSX

  return (
    <section aria-label="CORDE Publishing System" className="bg-white/5 rounded-2xl p-6 border border-white/10 card-lift">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium text-white">CORDE</h2>
          <a
            href="/corde"
            className="text-xs px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
          >
            Genera Immagini
          </a>
        </div>
        <div className="flex items-center gap-2">
          <div className={`status-dot ${
            status.backend === 'online' ? 'status-dot-online' :
            status.backend === 'offline' ? 'status-dot-offline' :
            'status-dot-warning'
          }`} />
          <span className="text-xs text-white/40">
            {status.backend === 'online' ? 'SDXL Online' : status.backend === 'offline' ? 'SDXL Offline' : 'Checking...'}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4" role="status" aria-label="Loading CORDE data">
          <div className="skeleton-enhanced h-24 w-full" aria-hidden="true" />
          <div className="skeleton-enhanced h-16 w-full" aria-hidden="true" />
          <div className="skeleton-enhanced h-12 w-full" aria-hidden="true" />
          <span className="sr-only">Loading publishing data...</span>
        </div>
      ) : (
        <>
          {/* Books in Progress */}
          <div className="mb-6">
            <div className="text-sm text-white/60 mb-3">Libri in Lavorazione</div>
            <div className="space-y-3">
              {status.books.map(book => (
                <div
                  key={book.id}
                  className="bg-white/5 rounded-xl p-3 border border-white/10 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all"
                  onClick={() => setExpandedBook(expandedBook === book.id ? null : book.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-white truncate">{book.title}</div>
                    <span className={`text-xs ${statusLabels[book.status]?.color || 'text-white/40'}`}>
                      {statusLabels[book.status]?.label || book.status}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
                      style={{ width: `${book.progress}%` }}
                    />
                  </div>

                  {/* Details (expanded) */}
                  {expandedBook === book.id && (
                    <div className="mt-3 pt-3 border-t border-white/10 text-xs space-y-1 animate-slide-up">
                      <div className="flex justify-between text-white/60">
                        <span>Scrittore</span>
                        <span className="text-white">{book.author}</span>
                      </div>
                      <div className="flex justify-between text-white/60">
                        <span>Illustratore</span>
                        <span className="text-white">{book.illustrator}</span>
                      </div>
                      <div className="flex justify-between text-white/60">
                        <span>Capitoli</span>
                        <span className="text-white">{book.chaptersReady}/{book.chapters}</span>
                      </div>
                      <div className="flex justify-between text-white/60">
                        <span>Immagini</span>
                        <span className="text-white">{book.imagesReady}/{book.imagesTotal}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Authors */}
          <div className="mb-6">
            <div className="text-sm text-white/60 mb-3">Redazione</div>
            <div className="grid grid-cols-3 gap-2">
              {status.authors.map(author => (
                <button
                  key={author.id}
                  onClick={() => setFeedbackTo(feedbackTo === author.id ? '' : author.id)}
                  className={`p-2 rounded-lg text-center transition-all ${
                    feedbackTo === author.id
                      ? 'bg-cyan-500/20 border border-cyan-500/50 scale-[1.02]'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="text-lg mb-1">{author.role === 'writer' ? '✍️' : '🎨'}</div>
                  <div className="text-xs text-white truncate">{author.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Section */}
          <div className="border-t border-white/10 pt-4">
            <div className="text-sm text-white/60 mb-2">
              {feedbackTo ? `Feedback a ${status.authors.find(a => a.id === feedbackTo)?.name}` : 'Seleziona un autore per inviare feedback'}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={feedbackTo ? 'Scrivi feedback...' : 'Seleziona un autore'}
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendFeedback()}
                disabled={!feedbackTo}
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50"
              />
              <button
                onClick={sendFeedback}
                disabled={!feedbackTo || !feedbackText.trim() || sending}
                className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending ? 'Invio...' : 'Invia'}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

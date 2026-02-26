
"use client"

export const runtime = 'edge'

import { useState, useEffect } from "react"

interface Job {
  id: string
  status: "pending" | "running" | "completed" | "failed"
  progress: number
  output?: string
  error?: string
}

interface HealthInfo {
  status: string
  device?: string
  hostname?: string
}

// API endpoint - will use internal network
const CORDE_API = process.env.NEXT_PUBLIC_CORDE_API || "http://192.168.1.234:3700"

export default function CordePage() {
  const [prompt, setPrompt] = useState("")
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking")
  const [healthInfo, setHealthInfo] = useState<HealthInfo | null>(null)

  // Check backend connection on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(`${CORDE_API}/api/health`, {
          signal: AbortSignal.timeout(5000)
        })
        if (res.ok) {
          const data = await res.json()
          setHealthInfo(data)
          setBackendStatus("online")
        } else {
          setBackendStatus("offline")
        }
      } catch {
        setBackendStatus("offline")
      }
    }
    checkBackend()

    // Re-check every 30 seconds
    const interval = setInterval(checkBackend, 30000)
    return () => clearInterval(interval)
  }, [])
  const [negativePrompt, setNegativePrompt] = useState("")
  const [author, setAuthor] = useState("pina-pennello")
  const [width, setWidth] = useState(1024)
  const [height, setHeight] = useState(1024)
  const [steps, setSteps] = useState(30)
  const [guidance, setGuidance] = useState(7.5)
  const [loading, setLoading] = useState(false)
  const [job, setJob] = useState<Job | null>(null)
  const [error, setError] = useState("")
  const [imageUrl, setImageUrl] = useState("")

  const authors = [
    { id: "pina-pennello", name: "Pina Pennello", style: "Onde watercolor style" },
    { id: "magmatic", name: "Magmatic", style: "Bold artistic style" },
    { id: "onde-futures", name: "Onde Futures", style: "Tech/futuristic" },
    { id: "luzzati", name: "Luzzati", style: "Italian folk art" },
  ]

  const generateImage = async () => {
    if (!prompt.trim()) {
      setError("Inserisci un prompt")
      return
    }

    setLoading(true)
    setError("")
    setJob(null)
    setImageUrl("")

    try {
      // Start generation
      const res = await fetch(`${CORDE_API}/api/generate/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          negative_prompt: negativePrompt,
          author,
          width,
          height,
          steps,
          guidance,
        }),
      })

      if (!res.ok) throw new Error("Failed to start generation")

      const data = await res.json()
      const jobId = data.job_id

      // Poll for status
      let currentJob: Job = { id: jobId, status: "pending", progress: 0 }
      setJob(currentJob)

      while (currentJob.status !== "completed" && currentJob.status !== "failed") {
        await new Promise(r => setTimeout(r, 2000))

        const statusRes = await fetch(`${CORDE_API}/api/jobs/${jobId}`)
        currentJob = await statusRes.json()
        setJob(currentJob)
      }

      if (currentJob.status === "completed" && currentJob.output) {
        // Get the filename from the output path
        const filename = currentJob.output.split("/").pop()
        setImageUrl(`${CORDE_API}/api/output/${filename}`)
      } else if (currentJob.status === "failed") {
        setError(currentJob.error || "Generation failed")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surf-gold/10 border border-surf-gold/20 mb-6">
          <span className="text-2xl">🎨</span>
          <span className="text-sm text-surf-gold font-medium">CORDE Engine</span>
        </div>

        <h1 className="text-4xl font-bold mb-4">
          <span className="glow-text text-surf-aqua">Image</span>{" "}
          <span className="text-surf-foam">Generation</span>
        </h1>

        <p className="text-surf-foam/60 max-w-2xl mx-auto mb-4">
          Genera illustrazioni con SDXL sul server locale.
        </p>

        {/* Backend Status */}
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
          backendStatus === "online"
            ? "bg-green-500/10 border border-green-500/30"
            : backendStatus === "offline"
            ? "bg-red-500/10 border border-red-500/30"
            : "bg-surf-foam/10 border border-surf-foam/20"
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            backendStatus === "online" ? "bg-green-400" :
            backendStatus === "offline" ? "bg-red-400" :
            "bg-surf-foam/40 animate-pulse"
          }`} />
          <span className={`text-sm ${
            backendStatus === "online" ? "text-green-400" :
            backendStatus === "offline" ? "text-red-400" :
            "text-surf-foam/60"
          }`}>
            {backendStatus === "online"
              ? `Online: ${healthInfo?.hostname || CORDE_API}`
              : backendStatus === "offline"
              ? "Backend Offline"
              : "Checking..."}
          </span>
        </div>
      </div>

      {/* Offline Warning */}
      {backendStatus === "offline" && (
        <div className="mb-8 p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <h3 className="text-lg font-bold text-red-400 mb-2">Backend Non Raggiungibile</h3>
          <p className="text-surf-foam/60 text-sm">
            Il server CORDE non risponde all'indirizzo {CORDE_API}.<br />
            Verifica che il servizio sia attivo sulla rete locale.
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="surf-card">
          <h2 className="text-xl font-bold text-surf-foam mb-6">Parametri</h2>

          {/* Prompt */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-surf-foam/70 mb-2">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descrivi l'immagine che vuoi generare..."
              className="w-full h-32 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-surf-foam placeholder-surf-foam/30 focus:border-surf-cyan/50 focus:outline-none resize-none"
            />
          </div>

          {/* Negative Prompt */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-surf-foam/70 mb-2">
              Negative Prompt
            </label>
            <input
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="Cosa evitare..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-surf-foam placeholder-surf-foam/30 focus:border-surf-cyan/50 focus:outline-none"
            />
          </div>

          {/* Author/Style */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-surf-foam/70 mb-2">
              Stile
            </label>
            <div className="grid grid-cols-2 gap-2">
              {authors.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAuthor(a.id)}
                  className={`px-4 py-3 rounded-xl text-left transition-all ${
                    author === a.id
                      ? "bg-surf-teal/20 border-surf-teal/50 border"
                      : "bg-white/5 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className="text-surf-foam text-sm font-medium">{a.name}</div>
                  <div className="text-surf-foam/40 text-xs">{a.style}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-surf-foam/70 mb-2">
                Width
              </label>
              <select
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-surf-foam focus:border-surf-cyan/50 focus:outline-none"
              >
                <option value={512}>512</option>
                <option value={768}>768</option>
                <option value={1024}>1024</option>
                <option value={1280}>1280</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surf-foam/70 mb-2">
                Height
              </label>
              <select
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-surf-foam focus:border-surf-cyan/50 focus:outline-none"
              >
                <option value={512}>512</option>
                <option value={768}>768</option>
                <option value={1024}>1024</option>
                <option value={1280}>1280</option>
              </select>
            </div>
          </div>

          {/* Advanced */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-surf-foam/70 mb-2">
                Steps: {steps}
              </label>
              <input
                type="range"
                min="10"
                max="50"
                value={steps}
                onChange={(e) => setSteps(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surf-foam/70 mb-2">
                Guidance: {guidance}
              </label>
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={guidance}
                onChange={(e) => setGuidance(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateImage}
            disabled={loading || backendStatus !== "online"}
            className={`w-full py-4 rounded-2xl font-medium transition-all ${
              loading || backendStatus !== "online"
                ? "bg-surf-foam/20 text-surf-foam/40 cursor-not-allowed"
                : "bg-gradient-to-r from-surf-teal to-surf-cyan text-white hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
            }`}
          >
            {loading ? "Generando..." : backendStatus !== "online" ? "Backend Offline" : "🎨 Genera Immagine"}
          </button>

          {error && (
            <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="surf-card-gold">
          <h2 className="text-xl font-bold text-surf-foam mb-6">Output</h2>

          {/* Job Status */}
          {job && (
            <div className="mb-6 p-4 rounded-xl bg-white/5">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-surf-foam/60">Job: {job.id.slice(0, 8)}...</span>
                <span className={`badge ${
                  job.status === "completed" ? "badge-live" :
                  job.status === "failed" ? "bg-red-500/20 text-red-400" :
                  "badge-gold"
                }`}>
                  {job.status}
                </span>
              </div>
              {job.status === "running" && (
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${job.progress}%` }} />
                </div>
              )}
            </div>
          )}

          {/* Image Display */}
          <div className="aspect-square rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Generated"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-surf-foam/30 text-center">
                <div className="text-4xl mb-2">🖼️</div>
                <p className="text-sm">L'immagine apparirà qui</p>
              </div>
            )}
          </div>

          {/* Download */}
          {imageUrl && (
            <a
              href={imageUrl}
              download
              className="mt-4 w-full py-3 rounded-xl bg-white/10 text-surf-foam text-center block hover:bg-white/20 transition-all"
            >
              ⬇️ Scarica Immagine
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

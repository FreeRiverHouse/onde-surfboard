'use client'

export const runtime = 'edge'

import Link from 'next/link'

const games = [
  {
    id: 'skin-creator',
    name: 'Minecraft Skin Creator',
    description: 'Create your own Minecraft skins! Fun & easy for kids',
    emoji: '🎨⛏️',
    url: '/static-games/skin-creator/index.html',
    status: 'beta'
  },
  {
    id: 'moonlight-magic-house',
    name: 'Moonlight Magic House',
    description: 'Virtual pet game with Luna the moon bunny',
    emoji: '🐰🌙',
    url: '/static-games/moonlight-magic-house/index.html',
    status: 'beta'
  },
  {
    id: 'science-lab',
    name: 'Science Lab',
    description: 'Mix ingredients and discover chemistry! Virtual experiments with real science',
    emoji: '🧪🔬',
    url: '/static-games/science-lab/index.html',
    status: 'beta'
  },
  {
    id: 'code-builder',
    name: 'Code Builder',
    description: 'Learn coding with visual blocks! Guide a robot through mazes',
    emoji: '🏗️🤖',
    url: '/static-games/code-builder/index.html',
    status: 'beta'
  },
  {
    id: 'story-creator',
    name: 'Story Creator',
    description: 'Create your own illustrated stories with characters & dialogue',
    emoji: '📖✨',
    url: '/static-games/story-creator/index.html',
    status: 'beta'
  },
  {
    id: 'ocean-explorer',
    name: 'Ocean Explorer',
    description: 'Dive deep and discover amazing sea creatures & ocean facts',
    emoji: '🌊🐙',
    url: '/static-games/ocean-explorer/index.html',
    status: 'beta'
  },
  {
    id: 'vr-reader',
    name: 'Onde Books VR',
    description: 'Immersive reading experience for Meta Quest',
    emoji: '📚🥽',
    url: '/static-games/vr-reader/index.html',
    status: 'alpha'
  }
]

export default function GamesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link href="/" className="text-cyan-400 hover:text-cyan-300 text-sm mb-4 inline-block">
          ← Back to Dashboard
        </Link>
        <h1 className="text-4xl font-bold text-white mb-2">🎮 Games & Apps</h1>
        <p className="text-white/60">Web apps and games available for testing</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {games.map((game) => (
          <a
            key={game.id}
            href={game.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative p-6 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-white/10 transition-all duration-300"
          >
            <div className="absolute top-4 right-4">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                game.status === 'beta' 
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              }`}>
                {game.status.toUpperCase()}
              </span>
            </div>
            
            <div className="text-4xl mb-4">{game.emoji}</div>
            
            <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors">
              {game.name}
            </h2>
            
            <p className="text-white/60 text-sm mb-4">
              {game.description}
            </p>
            
            <div className="flex items-center gap-2 text-cyan-400 text-sm">
              <span>Open in new tab</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
          </a>
        ))}
      </div>
      
      <div className="mt-12 p-6 rounded-xl bg-white/5 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-2">🚧 Coming Soon</h3>
        <ul className="text-white/60 text-sm space-y-2">
          <li>• Moonlight Puzzle - Puzzle game for kids</li>
          <li>• Kids Chef Studio - Cooking game (Expo → Web conversion)</li>
          <li>• Piccole Rime - Poetry app for kids</li>
          <li>• Salmo 23 Kids - Interactive psalm book</li>
        </ul>
      </div>
    </div>
  )
}

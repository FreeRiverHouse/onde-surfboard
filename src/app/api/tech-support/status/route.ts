import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET() {
  // Tech support procedures
  const procedures = [
    { id: 'SNAPSHOT', name: 'Backup Sito', category: 'core', status: 'ready' },
    { id: 'MODIFICA', name: 'Modifica Sito', category: 'core', status: 'ready' },
    { id: 'DEPLOY', name: 'Deploy', category: 'core', status: 'ready' },
    { id: 'ROLLBACK', name: 'Rollback', category: 'core', status: 'ready' },
    { id: 'MOD-001', name: 'Aggiungi Libro', category: 'mod', status: 'ready' },
    { id: 'MOD-002', name: 'Cambia Prezzo', category: 'mod', status: 'ready' },
    { id: 'MOD-003', name: 'Cambia Link', category: 'mod', status: 'ready' },
    { id: 'MOD-004', name: 'Modifica Homepage', category: 'mod', status: 'ready' },
    { id: 'MOD-005', name: 'Aggiungi Pagina', category: 'mod', status: 'ready' }
  ]

  // Check environment status
  const environments = [
    { name: 'TEST', url: 'localhost:8888', status: 'checking' as const, lastDeploy: undefined },
    { name: 'PREPROD', url: 'onde.surf', status: 'online' as const, lastDeploy: new Date().toISOString() },
    { name: 'PROD', url: 'onde.la', status: 'online' as const, lastDeploy: '2026-01-20T10:00:00Z' }
  ]

  // Current roadmap
  const roadmap = [
    { title: 'Dashboard HQ', status: 'in_progress' as const },
    { title: 'CORDE Panel', status: 'in_progress' as const },
    { title: 'Tech Support Panel', status: 'in_progress' as const },
    { title: 'Auto-posting X', status: 'done' as const },
    { title: 'PolyRoborto Link', status: 'done' as const },
    { title: 'Post Approval', status: 'done' as const },
    { title: 'Multi-language Support', status: 'pending' as const },
    { title: 'Analytics Dashboard', status: 'pending' as const },
    { title: 'Telegram Notifications', status: 'pending' as const },
    { title: 'Mobile App', status: 'pending' as const }
  ]

  return NextResponse.json({
    procedures,
    environments,
    roadmap,
    currentTask: undefined // No task running right now
  })
}

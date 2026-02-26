// PolyRoborto trading bot data management
// In-memory storage for MVP - connects to actual bot via API later

export interface TradingStatus {
  isRunning: boolean
  balance: number
  openPositions: number
  todayPnL: number
  weeklyPnL: number
  lastUpdate: string
}

export interface TechFeedback {
  id: string
  feedback: string
  createdAt: string
  status: 'pending' | 'processed'
}

// Simulated trading status - will be replaced with real API call to PolyRoborto
let tradingStatus: TradingStatus = {
  isRunning: true,
  balance: 1250.00,
  openPositions: 3,
  todayPnL: 45.20,
  weeklyPnL: 180.50,
  lastUpdate: new Date().toISOString()
}

// Store feedback for tech support agent
const feedbackQueue: TechFeedback[] = []

export function getTradingStatus(): TradingStatus {
  // TODO: Fetch real status from PolyRoborto bot
  // For now, return simulated data with slight variations
  return {
    ...tradingStatus,
    todayPnL: tradingStatus.todayPnL + (Math.random() - 0.5) * 10,
    lastUpdate: new Date().toISOString()
  }
}

export function addTechFeedback(feedback: string): TechFeedback {
  const newFeedback: TechFeedback = {
    id: Date.now().toString(),
    feedback,
    createdAt: new Date().toISOString(),
    status: 'pending'
  }
  feedbackQueue.push(newFeedback)
  return newFeedback
}

export function getPendingFeedback(): TechFeedback[] {
  return feedbackQueue.filter(f => f.status === 'pending')
}

export function markFeedbackProcessed(id: string): boolean {
  const feedback = feedbackQueue.find(f => f.id === id)
  if (feedback) {
    feedback.status = 'processed'
    return true
  }
  return false
}

export function updateTradingStatus(status: Partial<TradingStatus>): void {
  tradingStatus = { ...tradingStatus, ...status, lastUpdate: new Date().toISOString() }
}

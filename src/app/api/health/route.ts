import { NextResponse } from 'next/server'

export const runtime = 'edge'

interface ServiceHealth {
  name: string
  url: string
  status: 'healthy' | 'degraded' | 'down' | 'checking'
  latency?: number
  lastCheck: string
  details?: Record<string, unknown>
  error?: string
}

interface HealthResponse {
  overall: 'healthy' | 'degraded' | 'down'
  timestamp: string
  services: ServiceHealth[]
  checks: {
    total: number
    healthy: number
    degraded: number
    down: number
  }
}

// Production services to monitor
const SERVICES = [
  {
    name: 'Onde.la',
    url: 'https://onde.la',
    type: 'website',
    critical: true
  },
  {
    name: 'Onde.la API',
    url: 'https://onde.la/api/books',
    type: 'api',
    critical: true
  },
  {
    name: 'Onde.surf',
    url: 'https://onde.surf',
    type: 'website',
    critical: true
  },
  {
    name: 'Cloudflare Pages',
    url: 'https://onde-surf.pages.dev',
    type: 'cdn',
    critical: false
  }
]

async function checkService(service: typeof SERVICES[0]): Promise<ServiceHealth> {
  const startTime = Date.now()
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout
    
    const response = await fetch(service.url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'OndeSurf-HealthCheck/1.0'
      }
    })
    
    clearTimeout(timeoutId)
    const latency = Date.now() - startTime
    
    // Determine status based on response
    let status: ServiceHealth['status'] = 'healthy'
    if (!response.ok) {
      status = response.status >= 500 ? 'down' : 'degraded'
    } else if (latency > 3000) {
      status = 'degraded' // Slow response
    }
    
    return {
      name: service.name,
      url: service.url,
      status,
      latency,
      lastCheck: new Date().toISOString(),
      details: {
        statusCode: response.status,
        statusText: response.statusText,
        type: service.type
      }
    }
  } catch (error) {
    const latency = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return {
      name: service.name,
      url: service.url,
      status: 'down',
      latency,
      lastCheck: new Date().toISOString(),
      error: errorMessage,
      details: {
        type: service.type
      }
    }
  }
}

export async function GET() {
  const timestamp = new Date().toISOString()
  
  // Check all services in parallel
  const results = await Promise.all(SERVICES.map(checkService))
  
  // Calculate overall status
  const checks = {
    total: results.length,
    healthy: results.filter(r => r.status === 'healthy').length,
    degraded: results.filter(r => r.status === 'degraded').length,
    down: results.filter(r => r.status === 'down').length
  }
  
  let overall: HealthResponse['overall'] = 'healthy'
  if (checks.down > 0) {
    // If any critical service is down, overall is down
    const criticalDown = results.some((r, i) => 
      SERVICES[i].critical && r.status === 'down'
    )
    overall = criticalDown ? 'down' : 'degraded'
  } else if (checks.degraded > 0) {
    overall = 'degraded'
  }
  
  const response: HealthResponse = {
    overall,
    timestamp,
    services: results,
    checks
  }
  
  // Set appropriate status code
  const statusCode = overall === 'healthy' ? 200 : overall === 'degraded' ? 200 : 503
  
  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Health-Status': overall
    }
  })
}

// Also support HEAD for quick uptime checks
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-Health-Check': 'ok'
    }
  })
}

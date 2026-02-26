import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Routes that don't require authentication (minimal - only auth endpoints, health checks, and agent APIs with own auth)
const publicRoutes = ["/login", "/api/auth", "/health", "/api/health", "/api/agent-executor", "/api/agent-tasks", "/api/house", "/api/activity", "/api/agents", "/api/test-status", "/api/agent-chat", "/api/bot-configs/heartbeat"]

// Protected paths that require auth even if they look like static files
// NOTE: All games require auth - onde.surf is PRIVATE (only mattiapetrucciani@gmail.com)
const protectedPaths = ["/games"]

// Check if a path is public
function isPublicPath(pathname: string): boolean {
  // Check protected paths first - these always require auth
  if (protectedPaths.some(path => pathname.startsWith(path))) {
    return false
  }

  // Allow Next.js internal files
  if (pathname.startsWith("/_next")) {
    return true
  }

  // Allow static assets (images, css, js, etc.)
  if (
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".gif") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".woff") ||
    pathname.endsWith(".woff2") ||
    pathname.endsWith(".ttf") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".json") ||
    pathname.endsWith(".mp3") ||
    pathname.endsWith(".wav") ||
    pathname.endsWith(".ogg")
  ) {
    return true
  }

  // Check public routes
  return publicRoutes.some(route =>
    pathname === route || pathname.startsWith(route + "/")
  )
}

// Middleware - require authentication for all non-public routes
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Bypass Google Auth completely in local development to avoid blocking localhost tests
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next()
  }

  // Check for session cookie (Auth.js v5 format)
  const sessionToken = req.cookies.get("__Secure-authjs.session-token")?.value ||
    req.cookies.get("authjs.session-token")?.value

  // If no session, redirect to login
  if (!sessionToken) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}

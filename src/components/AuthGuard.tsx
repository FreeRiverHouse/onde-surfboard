"use client"

import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"

const publicRoutes = ["/login", "/coming-soon"]

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  // Track if we're mounted on client - prevents SSR from rendering children
  const [isMounted, setIsMounted] = useState(false)
  const [authState, setAuthState] = useState<"checking" | "authenticated" | "unauthenticated">("checking")

  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(route + "/") || pathname.startsWith("/api/auth")
  )

  // First effect: mark as mounted on client
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Second effect: check auth after mount
  useEffect(() => {
    if (!isMounted) return

    if (isPublicRoute) {
      setAuthState("authenticated")
      return
    }

    // Check session directly via API
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/session")
        const session = await res.json()

        if (session && session.user) {
          setAuthState("authenticated")
        } else {
          setAuthState("unauthenticated")
          router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`)
        }
      } catch (error) {
        setAuthState("unauthenticated")
        router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`)
      }
    }

    checkAuth()
  }, [isMounted, isPublicRoute, pathname, router])

  // Server-side or before mount: show loading (this prevents SSR from showing children)
  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-surf-cyan text-xl animate-pulse">Caricamento...</div>
      </div>
    )
  }

  // Checking auth
  if (authState === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-surf-cyan text-xl animate-pulse">Verifica accesso...</div>
      </div>
    )
  }

  // Unauthenticated - show redirecting
  if (authState === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-surf-cyan text-xl animate-pulse">Reindirizzamento...</div>
      </div>
    )
  }

  // Authenticated - show content
  return <>{children}</>
}

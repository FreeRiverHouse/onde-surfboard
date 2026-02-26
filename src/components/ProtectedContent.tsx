"use client"

import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState, ReactNode } from "react"

const publicRoutes = ["/login", "/coming-soon"]

export function ProtectedContent({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading")

  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(route + "/") || pathname.startsWith("/api/auth")
  )

  useEffect(() => {
    if (isPublicRoute) {
      setStatus("authenticated")
      return
    }

    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/session")
        const session = await res.json()

        if (session && session.user) {
          setStatus("authenticated")
        } else {
          setStatus("unauthenticated")
          router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`)
        }
      } catch (error) {
        setStatus("unauthenticated")
        router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`)
      }
    }

    checkAuth()
  }, [isPublicRoute, pathname, router])

  // Always show loading on initial render (prevents SSR content flash)
  if (status === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-surf-cyan text-xl animate-pulse">Verifica accesso...</div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-surf-cyan text-xl animate-pulse">Reindirizzamento...</div>
      </div>
    )
  }

  return <>{children}</>
}

"use client"

import { signIn, signOut, useSession } from "next-auth/react"

export function AuthButtons() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="px-4 py-2 rounded-lg bg-surf-teal/10 text-surf-foam/40 text-sm">
        ...
      </div>
    )
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-surf-foam/60 hidden md:block">
          {session.user.email}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-sm px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="text-sm px-4 py-2 rounded-lg bg-surf-teal/20 text-surf-cyan hover:bg-surf-teal/30 transition-colors"
    >
      Sign In
    </button>
  )
}

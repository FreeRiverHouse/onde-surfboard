"use client"

import { SessionProvider } from "next-auth/react"
import { ToastProvider } from "./Toast"
import { ThemeProvider } from "./ThemeProvider"

export function Providers({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <ThemeProvider defaultTheme="dark">
        <ToastProvider>
          {children}
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}

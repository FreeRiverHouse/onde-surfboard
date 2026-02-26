import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { isEmailWhitelisted } from "./db"

// Get secrets from environment - works with both Node.js and Cloudflare Workers
const getSecret = () => {
  // Try process.env first (Node.js), then globalThis for Workers
  const global = globalThis as typeof globalThis & { AUTH_SECRET?: string }
  return process.env.AUTH_SECRET || global.AUTH_SECRET || ""
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: getSecret(),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Check if user email is whitelisted - redirect to onde.la if not
      if (!user.email || !isEmailWhitelisted(user.email)) {
        return "https://onde.la"
      }
      return true
    },
    async session({ session }) {
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/coming-soon",
  },
  trustHost: true,
})

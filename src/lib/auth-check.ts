import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function requireAuth() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get("authjs.session-token") ||
                       cookieStore.get("__Secure-authjs.session-token")

  if (!sessionToken) {
    redirect("/login")
  }

  return sessionToken.value
}

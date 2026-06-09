"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSessionToken } from "@/lib/auth"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!getSessionToken()) {
      router.replace("/login")
    } else {
      setReady(true)
    }
  }, [router])

  if (!ready) return null
  return <>{children}</>
}

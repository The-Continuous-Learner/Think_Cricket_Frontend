"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { clearSession, getUsername, getSessionToken } from "@/lib/auth"
import { logout } from "@/lib/api"
import { toast } from "sonner"
import { useTheme } from "@/components/theme-provider"

const links = [
  { href: "/dashboard", label: "Matches" },
  { href: "/players", label: "Players" },
  { href: "/teams", label: "Teams" },
]

export function Nav() {
  const router = useRouter()
  const pathname = usePathname()
  const username = getUsername()
  const { theme, toggle } = useTheme()

  async function handleLogout() {
    const token = getSessionToken()
    if (token) {
      try {
        await logout(token)
      } catch {}
    }
    clearSession()
    router.replace("/login")
    toast.success("Logged out")
  }

  return (
    <header className="border-b border-border bg-card px-6 py-3 flex items-center gap-6">
      <Link href="/dashboard" className="font-bold text-lg tracking-tight text-primary">
        Think Cricket
      </Link>
      <nav className="flex items-center gap-4 flex-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`text-sm transition-colors hover:text-primary ${
              pathname.startsWith(l.href)
                ? "text-primary font-medium"
                : "text-muted-foreground"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        {username && <span className="text-sm text-muted-foreground">{username}</span>}
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </header>
  )
}

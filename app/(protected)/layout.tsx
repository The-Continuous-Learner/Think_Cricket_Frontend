import { AuthGuard } from "@/components/auth-guard"
import { Nav } from "@/components/nav"

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen">
        <Nav />
        <main className="flex-1 container mx-auto max-w-5xl px-4 py-8">{children}</main>
      </div>
    </AuthGuard>
  )
}

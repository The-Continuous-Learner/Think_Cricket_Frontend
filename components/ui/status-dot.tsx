import type { MatchStatus } from "@/lib/types"

const STATUS_DOT: Record<MatchStatus, { className: string; pulse: boolean }> = {
  IN_PROGRESS: { className: "bg-green-500", pulse: true },
  NOT_STARTED: { className: "bg-amber-400", pulse: false },
  COMPLETED:   { className: "bg-zinc-500",  pulse: false },
  ABANDONED:   { className: "bg-red-500",   pulse: false },
  CANCELLED:   { className: "bg-red-500",   pulse: false },
}

export function StatusDot({ status, size = "sm" }: { status: MatchStatus; size?: "sm" | "md" }) {
  const { className, pulse } = STATUS_DOT[status]
  const dim = size === "md" ? "h-3 w-3" : "h-2.5 w-2.5"
  return (
    <span className={`relative flex shrink-0 ${dim}`}>
      {pulse && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${className} opacity-75`} />
      )}
      <span className={`relative inline-flex rounded-full ${dim} ${className}`} />
    </span>
  )
}

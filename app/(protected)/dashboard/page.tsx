"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { listMatches, getRecentMatches } from "@/lib/api"
import { getSessionToken } from "@/lib/auth"
import { StatusDot } from "@/components/ui/status-dot"
import type { MatchSummary, MatchStatus } from "@/lib/types"

const ALL_STATUSES: MatchStatus[] = ["IN_PROGRESS", "NOT_STARTED", "COMPLETED", "ABANDONED", "CANCELLED"]

const STATUS_LABEL: Record<MatchStatus, string> = {
  IN_PROGRESS: "In Progress",
  NOT_STARTED: "Not Started",
  COMPLETED: "Completed",
  ABANDONED: "Abandoned",
  CANCELLED: "Cancelled",
}

const STATUS_VARIANT: Record<MatchStatus, "default" | "secondary" | "destructive" | "outline"> = {
  NOT_STARTED: "outline",
  IN_PROGRESS: "default",
  COMPLETED: "secondary",
  ABANDONED: "destructive",
  CANCELLED: "destructive",
}

function formatTime(epoch: number) {
  if (!epoch) return "—"
  return new Date(epoch).toLocaleString()
}


function MatchCard({ match }: { match: MatchSummary }) {
  return (
    <Link href={`/matches/${match.matchId}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <StatusDot status={match.status} />
              {match.teamAName} vs {match.teamBName}
            </CardTitle>
            <Badge variant={STATUS_VARIANT[match.status]}>{match.status.replace("_", " ")}</Badge>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground flex gap-4 flex-wrap">
          <span>{match.format || "—"}</span>
          <span>{match.totalOvers > 0 ? `${match.totalOvers} overs` : "Test"}</span>
          <span>{formatTime(match.plannedStartTime)}</span>
        </CardContent>
      </Card>
    </Link>
  )
}

function StatusFilter({
  selected,
  onChange,
}: {
  selected: MatchStatus | null
  onChange: (s: MatchStatus | null) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`px-3 py-1 rounded-full text-sm border transition-colors ${
          selected === null
            ? "bg-foreground text-background border-foreground"
            : "border-border text-muted-foreground hover:text-foreground"
        }`}
      >
        All
      </button>
      {ALL_STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(selected === s ? null : s)}
          className={`px-3 py-1 rounded-full text-sm border transition-colors ${
            selected === s
              ? "bg-foreground text-background border-foreground"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const token = getSessionToken()!
  const [filter, setFilter] = useState<MatchStatus | null>(null)

  const {
    data: myMatches = [],
    isLoading: myLoading,
    error: myError,
  } = useQuery({
    queryKey: ["my-matches"],
    queryFn: () => listMatches(token),
  })

  const {
    data: recentMatches = [],
    isLoading: recentLoading,
    error: recentError,
  } = useQuery({
    queryKey: ["recent-matches"],
    queryFn: () => getRecentMatches(token),
  })

  const filteredMyMatches = filter ? myMatches.filter((m) => m.status === filter) : myMatches
  const filteredRecentMatches = filter ? recentMatches.filter((m) => m.status === filter) : recentMatches

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">My Matches</h1>
          <Link href="/matches/new" className={buttonVariants()}>Host Match</Link>
        </div>

        <StatusFilter selected={filter} onChange={setFilter} />

        {myLoading && <p className="text-muted-foreground">Loading…</p>}
        {myError && <p className="text-destructive text-sm">Failed to load matches: {myError.message}</p>}
        {!myLoading && !myError && filteredMyMatches.length === 0 && (
          <p className="text-muted-foreground">{filter ? "No matches with this status." : "No matches hosted yet."}</p>
        )}
        <div className="space-y-3">
          {filteredMyMatches.map((match) => (
            <MatchCard key={match.matchId} match={match} />
          ))}
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Matches</h2>

        {recentLoading && <p className="text-muted-foreground">Loading…</p>}
        {recentError && <p className="text-destructive text-sm">Failed to load recent matches: {recentError.message}</p>}
        {!recentLoading && !recentError && filteredRecentMatches.length === 0 && (
          <p className="text-muted-foreground">{filter ? "No matches with this status." : "No recent matches."}</p>
        )}
        <div className="space-y-3">
          {filteredRecentMatches.map((match) => (
            <MatchCard key={match.matchId} match={match} />
          ))}
        </div>
      </section>
    </div>
  )
}

"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { listMatches, getRecentMatches } from "@/lib/api"
import { getSessionToken } from "@/lib/auth"
import type { MatchSummary, MatchStatus } from "@/lib/types"

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
            <CardTitle className="text-base">
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

export default function DashboardPage() {
  const token = getSessionToken()!

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

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">My Matches</h1>
          <Link href="/matches/new" className={buttonVariants()}>Host Match</Link>
        </div>

        {myLoading && <p className="text-muted-foreground">Loading…</p>}
        {myError && <p className="text-destructive text-sm">Failed to load matches: {myError.message}</p>}
        {!myLoading && !myError && myMatches.length === 0 && (
          <p className="text-muted-foreground">No matches hosted yet.</p>
        )}
        <div className="space-y-3">
          {myMatches.map((match) => (
            <MatchCard key={match.matchId} match={match} />
          ))}
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Matches</h2>

        {recentLoading && <p className="text-muted-foreground">Loading…</p>}
        {recentError && <p className="text-destructive text-sm">Failed to load recent matches: {recentError.message}</p>}
        {!recentLoading && !recentError && recentMatches.length === 0 && (
          <p className="text-muted-foreground">No recent matches.</p>
        )}
        <div className="space-y-3">
          {recentMatches.map((match) => (
            <MatchCard key={match.matchId} match={match} />
          ))}
        </div>
      </section>
    </div>
  )
}

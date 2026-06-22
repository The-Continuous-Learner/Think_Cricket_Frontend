"use client"

import { use, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getMatchScore, getMatchResult, getTeamPlayers, getMatchDetails, getSquad } from "@/lib/api"
import { getSessionToken } from "@/lib/auth"

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = use(params)
  const token = getSessionToken()!
  const [showSquad, setShowSquad] = useState<"A" | "B" | null>(null)

  const { data: match } = useQuery({
    queryKey: ["match", matchId],
    queryFn: () => getMatchDetails(token, matchId),
  })

  const { data: score, isLoading: scoreLoading } = useQuery({
    queryKey: ["score", matchId],
    queryFn: () => getMatchScore(token, matchId),
  })

  const { data: result } = useQuery({
    queryKey: ["result", matchId],
    queryFn: () => getMatchResult(token, matchId),
    retry: false,
  })

  function teamName(id: string) {
    if (id === match?.teamAId) return match.teamAName
    if (id === match?.teamBId) return match.teamBName
    return id.slice(0, 8) + "…"
  }

  const { data: teamAPlayersData } = useQuery({
    queryKey: ["team-players", match?.teamAId],
    queryFn: () => getTeamPlayers(token, match!.teamAId).then((r) => r.players),
    enabled: !!match?.teamAId,
  })

  const { data: teamBPlayersData } = useQuery({
    queryKey: ["team-players", match?.teamBId],
    queryFn: () => getTeamPlayers(token, match!.teamBId).then((r) => r.players),
    enabled: !!match?.teamBId,
  })

  const allPlayers = [...(teamAPlayersData ?? []), ...(teamBPlayersData ?? [])]

  const { data: squadA } = useQuery({
    queryKey: ["squad", matchId, match?.teamAId],
    queryFn: () => getSquad(token, matchId, match!.teamAId),
    enabled: !!match?.teamAId,
  })

  const { data: squadB } = useQuery({
    queryKey: ["squad", matchId, match?.teamBId],
    queryFn: () => getSquad(token, matchId, match!.teamBId),
    enabled: !!match?.teamBId,
  })

  function playerName(id: string | null) {
    if (!id) return "—"
    return allPlayers.find((p) => p.playerId === id)?.name ?? id.slice(0, 8)
  }

  function formatOvers(overs: number, balls: number) {
    return balls > 0 ? `${overs}.${balls}` : `${overs}`
  }

  if (scoreLoading) return <p className="text-muted-foreground">Loading scorecard…</p>
  if (!score) return <p className="text-muted-foreground">No score data available.</p>

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="space-y-1">
        <Link href={`/matches/${matchId}`} className="text-sm text-muted-foreground hover:text-primary">
          ← Match
        </Link>
        <h1 className="text-2xl font-semibold">
          {teamName(score.teamAId)} vs {teamName(score.teamBId)}
        </h1>
        <p className="text-muted-foreground text-sm">
          {score.format} · {score.totalOvers > 0 ? `${score.totalOvers} overs` : "Test"}
        </p>
      </div>

      {result && (
        <Card className="border-primary">
          <CardContent className="pt-4">
            <p className="text-lg font-medium">{result.resultText}</p>
            {result.decidedBySuperOver && (
              <Badge variant="secondary" className="mt-2">Super Over</Badge>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        {[
          { key: "A" as const, name: teamName(score.teamAId), squad: squadA },
          { key: "B" as const, name: teamName(score.teamBId), squad: squadB },
        ].map(({ key, name, squad }) => (
          <Button
            key={key}
            variant="outline"
            size="sm"
            onClick={() => setShowSquad(showSquad === key ? null : key)}
          >
            {name} Squad {showSquad === key ? "▲" : "▼"}
          </Button>
        ))}
      </div>

      {showSquad && (() => {
        const squadData = showSquad === "A" ? squadA : squadB
        const teamLabel = teamName(showSquad === "A" ? score.teamAId : score.teamBId)
        if (!squadData) return <p className="text-muted-foreground text-sm">Loading squad…</p>
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {teamLabel} — Full Squad
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {squadData.players.map((p, i) => (
                    <TableRow key={p.playerId}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">
                        {p.playerName}
                        {p.captain && <span className="ml-1 text-xs text-primary">(C)</span>}
                        {p.viceCaptain && <span className="ml-1 text-xs text-muted-foreground">(VC)</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.role === "PLAYING" ? "default" : "secondary"}>
                          {p.role === "PLAYING" ? "Playing XI" : "Substitute"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      })()}

      {score.innings.map((innings) => (
        <div key={innings.inningsNumber} className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">
              {teamName(innings.battingTeamId)} — Innings {innings.inningsNumber}
            </h2>
            <span className="text-2xl font-bold tabular-nums">
              {innings.totalRuns}/{innings.wickets}
            </span>
            <span className="text-muted-foreground">
              ({innings.oversCompleted} ov)
            </span>
            {innings.status === "COMPLETED" && <Badge variant="secondary">Completed</Badge>}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Batting
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batsman</TableHead>
                    <TableHead className="text-right">R</TableHead>
                    <TableHead className="text-right">B</TableHead>
                    <TableHead className="text-right">4s</TableHead>
                    <TableHead className="text-right">6s</TableHead>
                    <TableHead className="text-right">SR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {innings.batting.map((b) => (
                    <TableRow key={b.playerId}>
                      <TableCell>
                        <span className="font-medium">{playerName(b.playerId)}</span>
                        {!b.out && <span className="text-primary ml-1">*</span>}
                        {b.out && b.dismissalType && (
                          <span className="block text-xs text-muted-foreground">
                            {b.dismissalType.replace("_", " ")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">{b.runs}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{b.balls}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{b.fours}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{b.sixes}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {b.strikeRate.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2">
                    <TableCell className="text-muted-foreground text-sm">Extras</TableCell>
                    <TableCell className="text-right text-muted-foreground">{innings.extras}</TableCell>
                    <TableCell colSpan={4} />
                  </TableRow>
                  <TableRow className="font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{innings.totalRuns}</TableCell>
                    <TableCell colSpan={4} className="text-right text-muted-foreground text-sm">
                      {innings.wickets} wkts · {innings.oversCompleted} ov
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Bowling
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bowler</TableHead>
                    <TableHead className="text-right">O</TableHead>
                    <TableHead className="text-right">M</TableHead>
                    <TableHead className="text-right">R</TableHead>
                    <TableHead className="text-right">W</TableHead>
                    <TableHead className="text-right">Econ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {innings.bowling.map((b) => (
                    <TableRow key={b.bowlerId}>
                      <TableCell className="font-medium">{playerName(b.bowlerId)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatOvers(b.overs, b.ballsBowled % 6)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{b.maidens}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{b.runsConceded}</TableCell>
                      <TableCell className="text-right font-medium">{b.wickets}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {b.economy.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {innings.fallOfWickets.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Fall of wickets: </span>
              {innings.fallOfWickets
                .map(
                  (f) =>
                    `${f.teamScoreAtFall}-${f.wicketNumber} (${playerName(f.playerOutId)}, ${f.overNumber}.${f.ballNumber})`,
                )
                .join(", ")}
            </div>
          )}

          <Separator />
        </div>
      ))}
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { hostMatch } from "@/lib/api"
import { getSessionToken } from "@/lib/auth"
import { getCachedTeams, type CachedTeam } from "@/lib/teams-cache"

const PRESET_FORMATS = ["T20", "ODI", "Test", "T10"]

export default function NewMatchPage() {
  const router = useRouter()
  const token = getSessionToken()!
  const [teams, setTeams] = useState<CachedTeam[]>([])
  const [teamAId, setTeamAId] = useState("")
  const [teamBId, setTeamBId] = useState("")
  const [formatPreset, setFormatPreset] = useState("T20")
  const [customFormat, setCustomFormat] = useState("")
  const format = formatPreset === "Custom" ? customFormat : formatPreset
  const [totalOvers, setTotalOvers] = useState("20")
  const [plannedDate, setPlannedDate] = useState("")
  const [plannedTime, setPlannedTime] = useState("")

  useEffect(() => {
    setTeams(getCachedTeams())
  }, [])

  const mutation = useMutation({
    mutationFn: () =>
      hostMatch({
        sessionToken: token,
        teamAId,
        teamBId,
        format,
        totalOvers: Number(totalOvers),
        plannedStartTime: plannedDate
          ? new Date(`${plannedDate}T${plannedTime || "00:00"}`).getTime()
          : Date.now(),
        parentMatchId: null,
      }),
    onSuccess: (res) => {
      toast.success("Match created")
      router.push(`/matches/${res.matchId}`)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create match"),
  })

  return (
    <div className="max-w-lg space-y-6">
      <div className="space-y-1">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-primary">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold">Host Match</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Match Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              mutation.mutate()
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Team A</Label>
              <Select value={teamAId} onValueChange={(v) => setTeamAId(v ?? "")}>
                <SelectTrigger>
                  <span className="flex flex-1 text-left text-sm">
                    {teamAId
                      ? (teams.find((t) => t.teamId === teamAId)?.name ?? teamAId)
                      : <span className="text-muted-foreground">Select team A</span>}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.teamId} value={t.teamId} disabled={t.teamId === teamBId}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Team B</Label>
              <Select value={teamBId} onValueChange={(v) => setTeamBId(v ?? "")}>
                <SelectTrigger>
                  <span className="flex flex-1 text-left text-sm">
                    {teamBId
                      ? (teams.find((t) => t.teamId === teamBId)?.name ?? teamBId)
                      : <span className="text-muted-foreground">Select team B</span>}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.teamId} value={t.teamId} disabled={t.teamId === teamAId}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {teams.length < 2 && (
              <p className="text-sm text-muted-foreground">
                You need at least 2 teams.{" "}
                <Link href="/teams" className="text-primary hover:underline">
                  Create teams
                </Link>
              </p>
            )}

            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={formatPreset} onValueChange={(v) => { if (v) setFormatPreset(v) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                  <SelectItem value="Custom">Custom…</SelectItem>
                </SelectContent>
              </Select>
              {formatPreset === "Custom" && (
                <Input
                  placeholder="Enter format name"
                  value={customFormat}
                  onChange={(e) => setCustomFormat(e.target.value)}
                  required
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Total Overs (0 = Test / unlimited)</Label>
              <Input
                type="number"
                min={0}
                value={totalOvers}
                onChange={(e) => setTotalOvers(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Planned Start Time <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={plannedDate}
                  onChange={(e) => setPlannedDate(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="time"
                  value={plannedTime}
                  onChange={(e) => setPlannedTime(e.target.value)}
                  className="w-32"
                  disabled={!plannedDate}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending || !teamAId || !teamBId || !format}
            >
              {mutation.isPending ? "Creating…" : "Create Match"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

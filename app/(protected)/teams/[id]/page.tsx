"use client"

import { use, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { getTeamPlayers, addPlayerToTeam, removePlayerFromTeam, getAllPlayers } from "@/lib/api"
import { getSessionToken } from "@/lib/auth"
import { getCachedTeamName } from "@/lib/teams-cache"

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: teamId } = use(params)
  const token = getSessionToken()!
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [selectedPlayerId, setSelectedPlayerId] = useState("")
  const [search, setSearch] = useState("")

  const teamName = getCachedTeamName(teamId)

  const { data: teamData, isLoading } = useQuery({
    queryKey: ["team-players", teamId],
    queryFn: () => getTeamPlayers(token, teamId),
  })

  const { data: allPlayers = [] } = useQuery({
    queryKey: ["players"],
    queryFn: () => getAllPlayers(token),
  })

  const addMutation = useMutation({
    mutationFn: () => addPlayerToTeam(token, teamId, selectedPlayerId),
    onSuccess: () => {
      toast.success("Player added")
      qc.invalidateQueries({ queryKey: ["team-players", teamId] })
      setAddOpen(false)
      setSelectedPlayerId("")
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to add player"),
  })

  const removeMutation = useMutation({
    mutationFn: (playerId: string) => removePlayerFromTeam(token, teamId, playerId),
    onSuccess: () => {
      toast.success("Player removed")
      qc.invalidateQueries({ queryKey: ["team-players", teamId] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to remove player"),
  })

  const teamPlayerIds = new Set(teamData?.players.map((p) => p.playerId) ?? [])
  const availablePlayers = allPlayers.filter(
    (p) =>
      !teamPlayerIds.has(p.id) &&
      p.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link href="/teams" className="text-sm text-muted-foreground hover:text-primary">
            ← Teams
          </Link>
          <h1 className="text-2xl font-semibold">{teamName}</h1>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button />}>Add Player</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Player to {teamName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Search players…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select value={selectedPlayerId} onValueChange={(v) => setSelectedPlayerId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent>
                  {availablePlayers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {p.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="w-full"
                onClick={() => addMutation.mutate()}
                disabled={!selectedPlayerId || addMutation.isPending}
              >
                {addMutation.isPending ? "Adding…" : "Add Player"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}

      {!isLoading && (teamData?.players.length ?? 0) === 0 && (
        <p className="text-muted-foreground">No players in this team yet.</p>
      )}

      <div className="space-y-2">
        {teamData?.players.map((player) => (
          <Card key={player.playerId}>
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-medium">{player.name}</span>
                <Badge variant="secondary">{player.type}</Badge>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => removeMutation.mutate(player.playerId)}
                disabled={removeMutation.isPending}
              >
                Remove
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { getAllPlayers, savePlayer, updatePlayer, deletePlayer, getPlayerTeams, getMyTeams, addPlayerToTeam } from "@/lib/api"
import { getSessionToken } from "@/lib/auth"
import type { Gender, Player, PlayerType, Team } from "@/lib/types"

const PLAYER_TYPES: PlayerType[] = ["Batsman", "Bowler", "AllRounder", "WicketKeeper"]
const GENDERS: Gender[] = ["Male", "Female"]
const MAX_VISIBLE_TEAMS = 3

function PlayerForm({
  initial,
  onSubmit,
  isPending,
  submitLabel,
  teams,
}: {
  initial?: Player
  onSubmit: (data: { name: string; age: number; gender: Gender; type: PlayerType; teamId: string | null }) => void
  isPending: boolean
  submitLabel: string
  teams?: Team[]
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [age, setAge] = useState(String(initial?.age ?? ""))
  const [gender, setGender] = useState<Gender>(initial?.gender ?? "Male")
  const [type, setType] = useState<PlayerType>(initial?.type ?? "Batsman")
  const [teamId, setTeamId] = useState("")

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ name, age: Number(age), gender, type, teamId: teamId || null })
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Age</Label>
        <Input
          type="number"
          min={10}
          max={60}
          value={age}
          onChange={(e) => setAge(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Gender</Label>
        <Select value={gender} onValueChange={(v) => v && setGender(v as Gender)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GENDERS.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => v && setType(v as PlayerType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLAYER_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {teams && (
        <div className="space-y-2">
          <Label>Add to Team <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Select value={teamId} onValueChange={(v) => setTeamId(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="No team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No team</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  )
}

function PlayerCard({
  player,
  token,
  onEdit,
  onDelete,
  isDeleting,
}: {
  player: Player
  token: string
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  const [showAllTeams, setShowAllTeams] = useState(false)

  const { data: teams = [] } = useQuery({
    queryKey: ["player-teams", player.id],
    queryFn: () => getPlayerTeams(token, player.id),
    staleTime: 15_000,
    retry: 1,
  })

  const visibleTeams = showAllTeams ? teams : teams.slice(0, MAX_VISIBLE_TEAMS)
  const hiddenCount = teams.length - MAX_VISIBLE_TEAMS

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="space-y-1">
          <div className="font-medium">{player.name}</div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{player.type}</Badge>
            <span className="text-sm text-muted-foreground">
              {player.gender} · {player.age}y
            </span>
          </div>
        </div>

        {teams.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Part of</p>
            <div className="flex flex-wrap gap-1.5">
              {teams.slice(0, MAX_VISIBLE_TEAMS).map((t) => (
                <span
                  key={t.teamId}
                  className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground"
                >
                  {t.teamName}
                </span>
              ))}
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllTeams(true)}
                  className="text-xs px-2 py-0.5 rounded-full border border-dashed border-border text-primary hover:border-primary transition-colors"
                >
                  +{hiddenCount} more
                </button>
              )}
            </div>
          </div>
        )}

        <Dialog open={showAllTeams} onOpenChange={setShowAllTeams}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{player.name} — Teams</DialogTitle>
            </DialogHeader>
            <div className="flex flex-wrap gap-2 pt-2">
              {teams.map((t) => (
                <span
                  key={t.teamId}
                  className="text-sm px-3 py-1 rounded-full border border-border text-muted-foreground"
                >
                  {t.teamName}
                </span>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete} disabled={isDeleting}>
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function PlayersPage() {
  const token = getSessionToken()!
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editPlayer, setEditPlayer] = useState<Player | null>(null)
  const [search, setSearch] = useState("")

  const { data: players = [], isLoading } = useQuery({
    queryKey: ["players"],
    queryFn: () => getAllPlayers(token),
  })

  const { data: myTeams = [] } = useQuery({
    queryKey: ["my-teams"],
    queryFn: () => getMyTeams(token),
    staleTime: 15_000,
    retry: 1,
  })

  const createMutation = useMutation({
    mutationFn: ({ teamId, ...data }: { name: string; age: number; gender: Gender; type: PlayerType; teamId: string | null }) =>
      savePlayer({ sessionToken: token, ...data }).then((player) => ({ player, teamId })),
    onSuccess: async ({ player, teamId }) => {
      if (teamId) {
        await addPlayerToTeam(token, teamId, player.id).catch(() => {})
        qc.invalidateQueries({ queryKey: ["player-teams", player.id] })
      }
      toast.success("Player created")
      qc.invalidateQueries({ queryKey: ["players"] })
      setCreateOpen(false)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create player"),
  })

  const updateMutation = useMutation({
    mutationFn: ({ teamId: _, ...data }: { name: string; age: number; gender: Gender; type: PlayerType; teamId: string | null }) =>
      updatePlayer({ sessionToken: token, playerId: editPlayer!.id, ...data }),
    onSuccess: () => {
      toast.success("Player updated")
      qc.invalidateQueries({ queryKey: ["players"] })
      setEditPlayer(null)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update player"),
  })

  const deleteMutation = useMutation({
    mutationFn: (playerId: string) => deletePlayer({ sessionToken: token, playerId }),
    onSuccess: () => {
      toast.success("Player deleted")
      qc.invalidateQueries({ queryKey: ["players"] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete player"),
  })

  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Players</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>New Player</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Player</DialogTitle>
            </DialogHeader>
            <PlayerForm
              onSubmit={(data) => createMutation.mutate(data)}
              isPending={createMutation.isPending}
              submitLabel="Create Player"
              teams={myTeams}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Input
        placeholder="Search players…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {isLoading && <p className="text-muted-foreground">Loading…</p>}

      {!isLoading && filtered.length === 0 && (
        <p className="text-muted-foreground">No players found.</p>
      )}

      <Dialog open={!!editPlayer} onOpenChange={(o) => { if (!o) setEditPlayer(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
          </DialogHeader>
          {editPlayer && (
            <PlayerForm
              initial={editPlayer}
              onSubmit={(data) => updateMutation.mutate(data)}
              isPending={updateMutation.isPending}
              submitLabel="Save Changes"
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            token={token}
            onEdit={() => setEditPlayer(player)}
            onDelete={() => deleteMutation.mutate(player.id)}
            isDeleting={deleteMutation.isPending}
          />
        ))}
      </div>
    </div>
  )
}

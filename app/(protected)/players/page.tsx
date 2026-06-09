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
import { getAllPlayers, savePlayer } from "@/lib/api"
import { getSessionToken } from "@/lib/auth"
import type { Gender, PlayerType } from "@/lib/types"

const PLAYER_TYPES: PlayerType[] = ["Batsman", "Baller", "AllRounder", "WicketKeeper"]
const GENDERS: Gender[] = ["Male", "Female"]

export default function PlayersPage() {
  const token = getSessionToken()!
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [age, setAge] = useState("")
  const [gender, setGender] = useState<Gender>("Male")
  const [type, setType] = useState<PlayerType>("Batsman")
  const [search, setSearch] = useState("")

  const { data: players = [], isLoading } = useQuery({
    queryKey: ["players"],
    queryFn: () => getAllPlayers(token),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      savePlayer({ sessionToken: token, name, age: Number(age), gender, type }),
    onSuccess: () => {
      toast.success("Player created")
      qc.invalidateQueries({ queryKey: ["players"] })
      setOpen(false)
      setName("")
      setAge("")
      setGender("Male")
      setType("Batsman")
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create player"),
  })

  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Players</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>New Player</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Player</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createMutation.mutate()
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
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving…" : "Create Player"}
              </Button>
            </form>
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((player) => (
          <Card key={player.id}>
            <CardContent className="pt-4 space-y-2">
              <div className="font-medium">{player.name}</div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{player.type}</Badge>
                <span className="text-sm text-muted-foreground">
                  {player.gender} · {player.age}y
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

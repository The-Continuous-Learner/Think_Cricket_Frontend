"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createTeam, deleteTeam, modifyTeam } from "@/lib/api"
import { getSessionToken } from "@/lib/auth"
import {
  getCachedTeams,
  upsertCachedTeam,
  removeCachedTeam,
  type CachedTeam,
} from "@/lib/teams-cache"

export default function TeamsPage() {
  const router = useRouter()
  const token = getSessionToken()!
  const [teams, setTeams] = useState<CachedTeam[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editTeam, setEditTeam] = useState<CachedTeam | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    setTeams(getCachedTeams())
  }, [])

  const createMutation = useMutation({
    mutationFn: () => createTeam({ sessionToken: token, name, description }),
    onSuccess: (res) => {
      const team = { teamId: res.id, name: res.name, description: res.description }
      upsertCachedTeam(team)
      setTeams(getCachedTeams())
      toast.success("Team created")
      setCreateOpen(false)
      setName("")
      setDescription("")
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create team"),
  })

  const editMutation = useMutation({
    mutationFn: () =>
      modifyTeam({ sessionToken: token, teamId: editTeam!.teamId, name, description }),
    onSuccess: () => {
      upsertCachedTeam({ teamId: editTeam!.teamId, name, description })
      setTeams(getCachedTeams())
      toast.success("Team updated")
      setEditTeam(null)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update team"),
  })

  const deleteMutation = useMutation({
    mutationFn: (teamId: string) => deleteTeam(token, teamId),
    onSuccess: (_, teamId) => {
      removeCachedTeam(teamId)
      setTeams(getCachedTeams())
      toast.success("Team deleted")
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete team"),
  })

  function openEdit(team: CachedTeam) {
    setEditTeam(team)
    setName(team.name)
    setDescription(team.description)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Teams</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>New Team</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Team</DialogTitle>
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
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create Team"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {teams.length === 0 && (
        <p className="text-muted-foreground">No teams yet. Create one to get started.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {teams.map((team) => (
          <Card key={team.teamId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{team.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {team.description && (
                <p className="text-sm text-muted-foreground">{team.description}</p>
              )}
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/teams/${team.teamId}`)}
                >
                  Players
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEdit(team)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(team.teamId)}
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editTeam} onOpenChange={(o) => !o && setEditTeam(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              editMutation.mutate()
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={editMutation.isPending}>
              {editMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

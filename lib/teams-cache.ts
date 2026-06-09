const CACHE_KEY = "tc_teams"

export interface CachedTeam {
  teamId: string
  name: string
  description: string
}

export function getCachedTeams(): CachedTeam[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function upsertCachedTeam(team: CachedTeam) {
  const teams = getCachedTeams().filter((t) => t.teamId !== team.teamId)
  localStorage.setItem(CACHE_KEY, JSON.stringify([...teams, team]))
}

export function removeCachedTeam(teamId: string) {
  const teams = getCachedTeams().filter((t) => t.teamId !== teamId)
  localStorage.setItem(CACHE_KEY, JSON.stringify(teams))
}

export function getCachedTeamName(teamId: string): string {
  const team = getCachedTeams().find((t) => t.teamId === teamId)
  return team?.name ?? teamId.slice(0, 8) + "…"
}

import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  Player,
  SavePlayerRequest,
  Team,
  TeamPlayersResponse,
  CreateTeamRequest,
  ModifyTeamRequest,
  HostMatchRequest,
  HostMatchResponse,
  StartMatchRequest,
  EndMatchRequest,
  MatchDetails,
  MatchSummary,
  MatchLiveState,
  MatchScore,
  ConductTossRequest,
  TossResponse,
  TossResult,
  StartInningsRequest,
  StartInningsResponse,
  EndInningsRequest,
  StartOverRequest,
  StartOverResponse,
  EndOverRequest,
  RecordBallRequest,
  RecordBallResponse,
  RecordWicketRequest,
  RecordWicketResponse,
  MatchResultResponse,
} from "./types"

const BASE = "/api"

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

async function req<T>(
  path: string,
  method: "GET" | "POST",
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  let url = `${BASE}${path}`
  let fetchBody: string | undefined

  if (method === "GET" && body !== undefined) {
    const params = new URLSearchParams(
      Object.entries(body as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
    )
    url = `${url}?${params}`
  } else if (body !== undefined) {
    fetchBody = JSON.stringify(body)
  }

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: fetchBody,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    let message = `HTTP ${res.status}`
    if (text) {
      try {
        const parsed = JSON.parse(text)
        message = parsed.error ?? parsed.message ?? text
      } catch {
        message = text
      }
    }
    throw new ApiError(res.status, message)
  }
  const text = await res.text()
  if (!text) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    return text as unknown as T
  }
}

export const register = (data: RegisterRequest) =>
  req<RegisterResponse>("/users/register", "POST", data)

export const login = (data: LoginRequest) =>
  req<LoginResponse>("/users/login", "POST", data)

export const logout = (token: string) =>
  req<void>("/users/logout", "POST", undefined, { "Session-Token": token })

export const validateSession = (token: string) =>
  req<void>("/users/validateSession", "POST", undefined, { "Session-Token": token })

export const savePlayer = (data: SavePlayerRequest) =>
  req<Player>("/players/save", "POST", data)

export const getAllPlayers = (sessionToken: string) =>
  req<Player[]>("/players/get-all", "GET", { sessionToken })

export const getPlayersByName = (sessionToken: string, name: string) =>
  req<Player[]>("/players/get-by-name", "GET", { sessionToken, name })

export const createTeam = (data: CreateTeamRequest) =>
  req<{ id: string; name: string; description: string }>("/teams/create", "POST", data)

export const modifyTeam = (data: ModifyTeamRequest) =>
  req<void>("/teams/modify", "POST", data)

export const deleteTeam = (sessionToken: string, teamId: string) =>
  req<void>("/teams/delete", "POST", { sessionToken, teamId })

export const addPlayerToTeam = (sessionToken: string, teamId: string, playerId: string) =>
  req<void>("/teams/add-player", "POST", { sessionToken, teamId, playerId })

export const removePlayerFromTeam = (sessionToken: string, teamId: string, playerId: string) =>
  req<void>("/teams/remove-player", "POST", { sessionToken, teamId, playerId })

export const getMyTeams = (sessionToken: string) =>
  req<Team[]>("/teams/my", "GET", { sessionToken })

export const getTeamPlayers = (sessionToken: string, teamId: string) =>
  req<TeamPlayersResponse>("/teams/players", "GET", { sessionToken, teamId })

export const hostMatch = (data: HostMatchRequest) =>
  req<HostMatchResponse>("/matches/host", "POST", data)

export const startMatch = (data: StartMatchRequest) =>
  req<void>("/matches/start", "POST", data)

export const endMatch = (data: EndMatchRequest) =>
  req<void>("/matches/end", "POST", data)

export const getMatchDetails = (sessionToken: string, matchId: string) =>
  req<MatchDetails>("/matches/getDetails", "GET", { sessionToken, matchId })

export const listMatches = (sessionToken: string) =>
  req<MatchSummary[]>("/matches/list", "GET", { sessionToken })

export const getRecentMatches = (sessionToken: string) =>
  req<MatchSummary[]>("/matches/recent", "GET", { sessionToken })

export const getMatchLiveState = (sessionToken: string, matchId: string) =>
  req<MatchLiveState>("/matches/live-state", "GET", { sessionToken, matchId })

export const getMatchScore = (sessionToken: string, matchId: string) =>
  req<MatchScore>("/matches/score", "GET", { sessionToken, matchId })

export const conductToss = (data: ConductTossRequest) =>
  req<TossResponse>("/toss/conduct", "POST", data)

export const getToss = (sessionToken: string, matchId: string) =>
  req<TossResponse>("/toss", "GET", { sessionToken, matchId })

export const flipCoin = (sessionToken: string) =>
  req<TossResult>("/toss/flip", "GET", { sessionToken })

export const startInnings = (data: StartInningsRequest) =>
  req<StartInningsResponse>("/innings/start", "POST", data)

export const endInnings = (data: EndInningsRequest) =>
  req<void>("/innings/end", "POST", data)

export const startOver = (data: StartOverRequest) =>
  req<StartOverResponse>("/overs/start", "POST", data)

export const endOver = (data: EndOverRequest) =>
  req<void>("/overs/end", "POST", data)

export const recordBall = (data: RecordBallRequest) =>
  req<RecordBallResponse>("/balls/record", "POST", data)

export const recordWicket = (data: RecordWicketRequest) =>
  req<RecordWicketResponse>("/wickets/record", "POST", data)

export const completeMatchResult = (sessionToken: string, matchId: string) =>
  req<MatchResultResponse>("/match-result/complete", "POST", { sessionToken, matchId })

export const getMatchResult = (sessionToken: string, matchId: string) =>
  req<MatchResultResponse>("/match-result", "GET", { sessionToken, matchId })

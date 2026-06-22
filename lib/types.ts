export type MatchStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED" | "CANCELLED"
export type InningsStatus = "ACTIVE" | "COMPLETED"
export type OverStatus = "ACTIVE" | "COMPLETED"
export type TossResult = "HEAD" | "TAIL"
export type TossDecision = "BAT_FIRST" | "BOWL_FIRST"
export type ExtraType = "WIDE" | "NO_BALL" | "BYE" | "LEG_BYE"
export type BoundaryType = "FOUR" | "SIX"
export type WicketType =
  | "BOWLED"
  | "CAUGHT"
  | "RUN_OUT"
  | "LBW"
  | "STUMPED"
  | "HIT_WICKET"
  | "RETIRED_HURT"
  | "OBSTRUCTING_FIELD"
  | "TIMED_OUT"
export type PlayerType = "Batsman" | "Bowler" | "AllRounder" | "WicketKeeper"
export type Gender = "Male" | "Female"

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface RegisterResponse {
  userId: string
  username: string
  email: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  sessionToken: string
  userId: string
  username: string
}

export interface Player {
  id: string
  name: string
  age: number
  gender: Gender
  type: PlayerType
}

export interface SavePlayerRequest {
  sessionToken: string
  name: string
  age: number
  gender: Gender
  type: PlayerType
}

export interface UpdatePlayerRequest {
  sessionToken: string
  playerId: string
  name: string
  age: number
  gender: Gender
  type: PlayerType
}

export interface DeletePlayerRequest {
  sessionToken: string
  playerId: string
}

export interface PlayerTeamSummary {
  teamId: string
  teamName: string
}

export interface GetPlayerTeamsRequest {
  sessionToken: string
  playerId: string
}

export interface GetAllPlayersRequest {
  sessionToken: string
  page: number
  size: number
}

export interface PagedPlayersResponse {
  content: Player[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  first: boolean
  last: boolean
}

export interface TeamPlayer {
  playerId: string
  name: string
  type: PlayerType
}

export interface TeamPlayersResponse {
  teamId: string
  players: TeamPlayer[]
}

export interface Team {
  id: string
  name: string
  description: string
}

export interface CreateTeamRequest {
  sessionToken: string
  name: string
  description: string
}

export interface ModifyTeamRequest {
  sessionToken: string
  teamId: string
  name: string
  description: string
}

export interface HostMatchRequest {
  sessionToken: string
  teamAId: string
  teamBId: string
  format: string
  totalOvers: number
  plannedStartTime: number
  parentMatchId: string | null
}

export interface HostMatchResponse {
  matchId: string
  status: MatchStatus
}

export interface StartMatchRequest {
  sessionToken: string
  matchId: string
}

export interface EndMatchRequest {
  sessionToken: string
  matchId: string
  finalStatus: MatchStatus
}

export interface DeleteMatchRequest {
  sessionToken: string
  matchId: string
}

export interface MatchDetails {
  matchId: string
  teamAId: string
  teamAName: string
  teamBId: string
  teamBName: string
  format: string
  totalOvers: number
  status: MatchStatus
  plannedStartTime: number
  actualStartTime: number
  actualEndTime: number
  hostedByUserId: string
  startedByUserId: string
  endedByUserId: string
}

export interface MatchSummary {
  matchId: string
  format: string
  status: MatchStatus
  totalOvers: number
  teamAId: string
  teamAName: string
  teamBId: string
  teamBName: string
  plannedStartTime: number
  actualStartTime: number
}

export interface ActiveInnings {
  inningsId: string
  inningsNumber: number
  battingTeamId: string
  bowlingTeamId: string
  status: InningsStatus
  totalRuns: number
  wickets: number
  oversCompleted: number
  extras: number
  target: number | null
}

export interface ActiveOver {
  overId: string
  overNumber: number
  bowlerId: string
  status: OverStatus
  legalBallCount: number
  totalRuns: number
  wickets: number
}

export interface MatchLiveState {
  matchId: string
  format: string
  status: MatchStatus
  totalOvers: number
  teamAId: string
  teamBId: string
  activeInnings: ActiveInnings | null
  activeOver: ActiveOver | null
  lastBatsmanId: string | null
  lastNonStrikerId: string | null
}

export interface BattingStats {
  playerId: string
  battingPosition: number
  runs: number
  balls: number
  fours: number
  sixes: number
  strikeRate: number
  out: boolean
  dismissalType: WicketType | null
  dismissalBallId: string | null
}

export interface BowlingStats {
  bowlerId: string
  overs: number
  ballsBowled: number
  maidens: number
  runsConceded: number
  wickets: number
  economy: number
}

export interface FallOfWicket {
  wicketNumber: number
  teamScoreAtFall: number
  overNumber: number
  ballNumber: number
  playerOutId: string
  bowlerId: string | null
  fielderId: string | null
}

export interface InningsScore {
  inningsNumber: number
  battingTeamId: string
  bowlingTeamId: string
  status: InningsStatus
  totalRuns: number
  wickets: number
  oversCompleted: number
  extras: number
  batting: BattingStats[]
  bowling: BowlingStats[]
  fallOfWickets: FallOfWicket[]
}

export interface MatchScore {
  matchId: string
  format: string
  status: MatchStatus
  totalOvers: number
  teamAId: string
  teamBId: string
  innings: InningsScore[]
}

export interface ConductTossRequest {
  sessionToken: string
  matchId: string
  tossResult: TossResult
  winnerTeamId: string
  decision: TossDecision
}

export interface TossResponse {
  tossId: string
  matchId: string
  tossResult: TossResult
  winnerTeamId: string
  loserTeamId: string
  decision: TossDecision
}

export interface StartInningsRequest {
  sessionToken: string
  matchId: string
  battingTeamId: string
  bowlingTeamId: string
}

export interface StartInningsResponse {
  inningsId: string
  matchId: string
  inningsNumber: number
  battingTeamId: string
  bowlingTeamId: string
  target: number | null
  status: InningsStatus
}

export interface EndInningsRequest {
  sessionToken: string
  inningsId: string
}

export interface StartOverRequest {
  sessionToken: string
  inningsId: string
  bowlerId: string
}

export interface StartOverResponse {
  overId: string
  inningsId: string
  matchId: string
  overNumber: number
  bowlerId: string
  status: OverStatus
}

export interface EndOverRequest {
  sessionToken: string
  overId: string
}

export interface RecordBallRequest {
  sessionToken: string
  overId: string
  batsmanId: string
  nonStrikerId: string
  runs: number
  extraRuns: number
  extraType: ExtraType | null
  boundaryType: BoundaryType | null
  bowlerId: string | null
  wicket: boolean
}

export interface RecordBallResponse {
  ballId: string
  overId: string
  inningsId: string
  ballNumber: number
  legalDelivery: boolean
  runs: number
  extraRuns: number
  extraType: ExtraType | null
  boundaryType: BoundaryType | null
  wicket: boolean
  legalBallsInOver: number
  overCompleted: boolean
  inningsCompleted: boolean
}

export interface RecordWicketRequest {
  sessionToken: string
  ballId: string
  playerOutId: string
  type: WicketType
  bowlerId: string | null
  fielderId: string | null
}

export interface RecordWicketResponse {
  wicketId: string
  ballId: string
  inningsId: string
  playerOutId: string
  type: WicketType
  wicketNumber: number
  teamScoreAtFall: number
}

export interface MatchResultResponse {
  matchId: string
  winnerTeamId: string
  loserTeamId: string
  draw: boolean
  resultText: string
  decidedBySuperOver: boolean
}

export interface InningsSummary {
  inningsId: string
  inningsNumber: number
  battingTeamId: string
  battingTeamName: string
  bowlingTeamId: string
  bowlingTeamName: string
  status: InningsStatus
  totalRuns: number
  wickets: number
  oversCompleted: number
  extras: number
  target: number | null
}

export interface BattingScoreEntry {
  id: string
  matchId: string
  inningsId: string
  inningsNumber: number
  playerId: string
  battingPosition: number
  runs: number
  balls: number
  fours: number
  sixes: number
  out: boolean
  dismissalType: WicketType | null
  dismissalBallId: string | null
  strikeRate: number
}

export interface BowlingScoreEntry {
  id: string
  matchId: string
  inningsId: string
  inningsNumber: number
  bowlerId: string
  ballsBowled: number
  overs: number
  maidens: number
  runsConceded: number
  wickets: number
  economy: number
}

export interface InningsScoreCard {
  inningsId: string
  inningsNumber: number
  battingTeamId: string
  bowlingTeamId: string
  batting: BattingScoreEntry[]
  bowling: BowlingScoreEntry[]
  fallOfWickets: FallOfWicket[]
  totalRuns: number
  totalWickets: number
  totalOvers: number
}

export interface ScoreCardResponse {
  matchId: string
  matchStatus: string
  resultText: string
  innings: InningsScoreCard[]
}

export type SquadRole = "PLAYING" | "SUBSTITUTE"
export type SubstitutionType = "IMPACT" | "CONCUSSION" | "RETIRED_HURT"

export interface SquadPlayerEntry {
  playerId: string
  role: SquadRole
  captain: boolean
  viceCaptain: boolean
}

export interface DeclareSquadRequest {
  sessionToken: string
  matchId: string
  teamId: string
  players: SquadPlayerEntry[]
}

export interface SquadPlayerInfo {
  playerId: string
  playerName: string
  role: SquadRole
  captain: boolean
  viceCaptain: boolean
}

export interface SquadResponse {
  matchId: string
  teamId: string
  players: SquadPlayerInfo[]
}

export interface RecordSubstitutionRequest {
  sessionToken: string
  matchId: string
  teamId: string
  playerOutId: string
  playerInId: string
  inningsNumber: number
  overNumber: number
  substitutionType: SubstitutionType
}

export interface SubstitutionResponse {
  id: string
  matchId: string
  teamId: string
  playerOutId: string
  playerOutName: string
  playerInId: string
  playerInName: string
  inningsNumber: number
  overNumber: number
  substitutionType: SubstitutionType
}

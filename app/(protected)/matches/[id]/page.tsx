"use client"

import { use, useState, useEffect, useCallback, useRef } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getMatchDetails,
  getMatchLiveState,
  getToss,
  getTeamPlayers,
  getSquad,
  getCurrentXI,
  getScorecard,
  getInningsList,
  startMatch,
  conductToss,
  flipCoin,
  startInnings,
  endInnings,
  startOver,
  endOver,
  recordBall,
  recordWicket,
  recordSubstitution,
  completeMatchResult,
  endMatch,
  deleteMatch,
  declareSquad,
  setBatsmen,
  getCurrentBatsmen,
  getEligibleBatsmen,
  undoBall,
} from "@/lib/api"
import { ApiError } from "@/lib/api"
import { getSessionToken } from "@/lib/auth"
import { StatusDot } from "@/components/ui/status-dot"
import type {
  TossResult,
  TossDecision,
  TossResponse,
  WicketType,
  ExtraType,
  BoundaryType,
  RecordBallResponse,
  TeamPlayer,
  SubstitutionType,
  EligibleBatsmanEntry,
} from "@/lib/types"

type Phase =
  | "loading"
  | "not_started"
  | "declare_squad"
  | "toss"
  | "start_innings"
  | "start_over"
  | "recording"
  | "over_complete"
  | "innings_complete"
  | "complete_result"
  | "completed"

type DeliveryMode = "normal" | "wide" | "no_ball" | "bye" | "leg_bye"

const WICKET_TYPES: WicketType[] = [
  "BOWLED",
  "CAUGHT",
  "RUN_OUT",
  "LBW",
  "STUMPED",
  "HIT_WICKET",
  "RETIRED_HURT",
  "OBSTRUCTING_FIELD",
  "TIMED_OUT",
]

type SquadRole = "PLAYING" | "SUBSTITUTE" | "NONE"
type SquadEntry = { playerId: string; role: SquadRole; captain: boolean; viceCaptain: boolean }

function SquadBuilder({
  teamName,
  players,
  entries,
  onChange,
  onDeclare,
  isPending,
  declared,
}: {
  teamName: string
  players: TeamPlayer[]
  entries: SquadEntry[]
  onChange: (entries: SquadEntry[]) => void
  onDeclare: () => void
  isPending: boolean
  declared: boolean
}) {
  if (players.length === 0) return <p className="text-sm text-muted-foreground">Loading players…</p>

  const captainEntry = entries.find((e) => e.captain)
  const captainId = captainEntry?.playerId
  const valid = !!captainId && captainEntry!.role !== "NONE" && entries.some((e) => e.role === "PLAYING")

  function setRole(playerId: string, role: SquadRole) {
    onChange(
      entries.map((e) => {
        if (e.playerId !== playerId) return e
        return role === "NONE" ? { ...e, role, captain: false, viceCaptain: false } : { ...e, role }
      }),
    )
  }

  function setCaptain(playerId: string) {
    const entry = entries.find((e) => e.playerId === playerId)
    if (!entry || entry.role !== "PLAYING") return
    onChange(
      entries.map((e) => ({
        ...e,
        captain: e.playerId === playerId,
        viceCaptain: e.viceCaptain && e.playerId !== playerId,
      })),
    )
  }

  function toggleVC(playerId: string) {
    const entry = entries.find((e) => e.playerId === playerId)
    if (!entry || entry.role !== "PLAYING") return
    onChange(
      entries.map((e) =>
        e.playerId === playerId ? { ...e, viceCaptain: !e.viceCaptain } : { ...e, viceCaptain: false },
      ),
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="font-medium text-sm">{teamName}</p>
        {declared && <Badge variant="secondary">Declared</Badge>}
      </div>
      <div>
        {entries.map((entry) => {
          const player = players.find((p) => p.playerId === entry.playerId)!
          return (
            <div key={entry.playerId} className="flex items-center gap-2 py-1.5 border-b border-border/40 last:border-0">
              <span className="flex-1 text-sm">{player.name}</span>
              <div className="flex rounded border border-border overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setRole(entry.playerId, "PLAYING")}
                  className={`px-2.5 py-1 transition-colors ${entry.role === "PLAYING" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
                >
                  XI
                </button>
                <button
                  type="button"
                  onClick={() => setRole(entry.playerId, "NONE")}
                  className={`px-2.5 py-1 border-l border-border transition-colors ${entry.role === "NONE" ? "bg-muted text-foreground font-medium" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
                >
                  —
                </button>
                <button
                  type="button"
                  onClick={() => setRole(entry.playerId, "SUBSTITUTE")}
                  className={`px-2.5 py-1 border-l border-border transition-colors ${entry.role === "SUBSTITUTE" ? "bg-secondary text-secondary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
                >
                  SUB
                </button>
              </div>
              <button
                type="button"
                onClick={() => setCaptain(entry.playerId)}
                disabled={entry.role !== "PLAYING"}
                className={`px-2.5 py-1 rounded text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${entry.captain ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                C
              </button>
              <button
                type="button"
                onClick={() => toggleVC(entry.playerId)}
                disabled={entry.captain || entry.role !== "PLAYING"}
                className={`px-2.5 py-1 rounded text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${entry.viceCaptain ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                VC
              </button>
            </div>
          )
        })}
      </div>
      {!captainId && (
        <p className="text-xs text-muted-foreground">Tap C to assign captain</p>
      )}
      <Button size="sm" disabled={!valid || isPending} onClick={onDeclare}>
        {isPending ? "Declaring…" : declared ? "Re-declare Squad" : "Declare Squad"}
      </Button>
    </div>
  )
}

export default function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = use(params)
  const token = getSessionToken()!
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>("loading")
  const [tossData, setTossData] = useState<TossResponse | null>(null)
  const [currentInningsId, setCurrentInningsId] = useState<string | null>(null)
  const [currentOverId, setCurrentOverId] = useState<string | null>(null)
  const [batsmanId, setBatsmanId] = useState<string | null>(null)
  const [nonStrikerId, setNonStrikerId] = useState<string | null>(null)
  const [lastBallRes, setLastBallRes] = useState<RecordBallResponse | null>(null)

  const [tossResult, setTossResult] = useState<TossResult>("HEAD")
  const [isFlipAnimating, setIsFlipAnimating] = useState(false)
  const [flipSettled, setFlipSettled] = useState(false)
  const [pendingFlipResult, setPendingFlipResult] = useState<TossResult | null>(null)
  const [flippedResult, setFlippedResult] = useState<TossResult | null>(null)
  const [tossWinner, setTossWinner] = useState<string>("")
  const [tossDecision, setTossDecision] = useState<TossDecision>("BAT_FIRST")

  const [teamASquad, setTeamASquad] = useState<SquadEntry[]>([])
  const [teamBSquad, setTeamBSquad] = useState<SquadEntry[]>([])
  const [teamADeclared, setTeamADeclared] = useState(false)
  const [teamBDeclared, setTeamBDeclared] = useState(false)
  const [declaringTeamId, setDeclaringTeamId] = useState<string | null>(null)
  const inSquadPhaseRef = useRef(false)
  const isComputingPhaseRef = useRef(false)
  const pendingWicketRef = useRef(false)
  const pendingWicketBowlingTeamId = useRef<string | null>(null)
  const ballFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recordBallCardRef = useRef<HTMLDivElement>(null)
  const flashPosition = useRef<{ right: number; top: number } | null>(null)
  const flashDivRef = useRef<HTMLDivElement>(null)

  const [ballFlash, setBallFlash] = useState<{ label: string; bg: string; text: string; description: string; key: number } | null>(null)

  const [bowlerId, setBowlerId] = useState<string>("")
  const [openerA, setOpenerA] = useState<string>("")
  const [openerB, setOpenerB] = useState<string>("")

  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("normal")
  const [runs, setRuns] = useState(0)
  const [extraRuns, setExtraRuns] = useState(0)
  const [isWicket, setIsWicket] = useState(false)
  const [wicketType, setWicketType] = useState<WicketType>("BOWLED")
  const [playerOutId, setPlayerOutId] = useState<string>("")
  const [fielderId, setFielderId] = useState<string>("")
  const [newBatsmanId, setNewBatsmanId] = useState<string>("")
  const [eligibleBatsmen, setEligibleBatsmen] = useState<EligibleBatsmanEntry[]>([])
  const wicketBowlerId = useRef<string | null>(null)
  const currentOverBowlerIdRef = useRef<string | null>(null)
  const completedInningsNumberRef = useRef<number>(1)
  // Prevents the liveState-triggered computePhase() from overwriting over_complete / innings_complete
  const overrideComputePhaseRef = useRef(false)

  const [showEditBatsmen, setShowEditBatsmen] = useState(false)
  const [showSubForm, setShowSubForm] = useState(false)
  const [milestone, setMilestone] = useState<{ label: string; subLabel: string; name: string; colorClass: string; key: number } | null>(null)
  const milestoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seenMilestones = useRef<Set<string>>(new Set())
  const milestoneSeedDone = useRef(false)
  const [manualBattingTeamId, setManualBattingTeamId] = useState<string>("")
  const [subTeamId, setSubTeamId] = useState<string>("")
  const [subPlayerOutId, setSubPlayerOutId] = useState<string>("")
  const [subPlayerInId, setSubPlayerInId] = useState<string>("")
  const [subType, setSubType] = useState<SubstitutionType>("IMPACT")

  const { data: match, refetch: refetchMatch, isError: matchError } = useQuery({
    queryKey: ["match", matchId],
    queryFn: () => getMatchDetails(token, matchId),
    retry: 2,
  })

  const { data: liveState, refetch: refetchLive, isError: liveError } = useQuery({
    queryKey: ["live", matchId],
    queryFn: () => getMatchLiveState(token, matchId),
    refetchInterval: phase === "recording" ? 0 : false,
    retry: 2,
  })

  const { data: teamAPlayers = [] } = useQuery({
    queryKey: ["team-players", match?.teamAId],
    queryFn: () => getTeamPlayers(token, match!.teamAId).then((r) => r.players),
    enabled: !!match?.teamAId,
  })

  const { data: teamBPlayers = [] } = useQuery({
    queryKey: ["team-players", match?.teamBId],
    queryFn: () => getTeamPlayers(token, match!.teamBId).then((r) => r.players),
    enabled: !!match?.teamBId,
  })

  const allPlayers = [...teamAPlayers, ...teamBPlayers]

  const { data: scorecard, refetch: refetchScorecard } = useQuery({
    queryKey: ["scorecard", matchId],
    queryFn: () => getScorecard(token, matchId),
    enabled: phase !== "loading" && phase !== "not_started" && phase !== "declare_squad" && phase !== "toss",
  })

  useEffect(() => {
    if (teamAPlayers.length > 0 && teamASquad.length === 0) {
      setTeamASquad(teamAPlayers.map((p) => ({ playerId: p.playerId, role: "PLAYING" as const, captain: false, viceCaptain: false })))
    }
  }, [teamAPlayers]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (teamBPlayers.length > 0 && teamBSquad.length === 0) {
      setTeamBSquad(teamBPlayers.map((p) => ({ playerId: p.playerId, role: "PLAYING" as const, captain: false, viceCaptain: false })))
    }
  }, [teamBPlayers]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase === "start_innings" && match && tossData) {
      const completedCount = scorecard?.innings.length ?? 0
      const firstBatter = tossData.decision === "BAT_FIRST" ? tossData.winnerTeamId : tossData.loserTeamId
      const secondBatter = firstBatter === match.teamAId ? match.teamBId : match.teamAId
      setManualBattingTeamId(completedCount % 2 === 0 ? firstBatter : secondBatter)
    }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  function teamName(id: string) {
    if (id === match?.teamAId) return match.teamAName
    if (id === match?.teamBId) return match.teamBName
    return id.slice(0, 8) + "…"
  }

  function playerName(id: string | null) {
    if (!id) return "—"
    return allPlayers.find((p) => p.playerId === id)?.name ?? id.slice(0, 8)
  }

  const playingXI = useCallback((teamId: string): Set<string> => {
    const squad = teamId === match?.teamAId ? teamASquad : teamBSquad
    return new Set(squad.filter((e) => e.role === "PLAYING").map((e) => e.playerId))
  }, [match, teamASquad, teamBSquad])

  const determineBattingTeamPlayers = useCallback((): TeamPlayer[] => {
    if (!match || !liveState?.activeInnings) return []
    const battingTeamId = liveState.activeInnings.battingTeamId
    const players = battingTeamId === match.teamAId ? teamAPlayers : teamBPlayers
    const xi = playingXI(battingTeamId)
    return xi.size > 0 ? players.filter((p) => xi.has(p.playerId)) : players
  }, [match, liveState, teamAPlayers, teamBPlayers, playingXI])

  const determineBowlingTeamPlayers = useCallback((): TeamPlayer[] => {
    if (!match) return []
    const bowlingTeamId = liveState?.activeInnings?.bowlingTeamId ?? pendingWicketBowlingTeamId.current
    if (!bowlingTeamId) return []
    const players = bowlingTeamId === match.teamAId ? teamAPlayers : teamBPlayers
    const xi = playingXI(bowlingTeamId)
    return xi.size > 0 ? players.filter((p) => xi.has(p.playerId)) : players
  }, [match, liveState, teamAPlayers, teamBPlayers, playingXI])

  const computePhase = useCallback(
    async (forceRefetch = false) => {
      if (forceRefetch) isComputingPhaseRef.current = true
      try {
        let m = match
        let live = liveState

        if (forceRefetch) {
          const [matchResult, liveResult] = await Promise.all([refetchMatch(), refetchLive()])
          m = matchResult.data
          live = liveResult.data
        }

        if (!m || !live) return

        if (m.status === "NOT_STARTED") { setPhase("not_started"); return }
        if (m.status === "COMPLETED" || m.status === "ABANDONED" || m.status === "CANCELLED") { setPhase("completed"); return }

        let squadADeclared = teamADeclared
        let squadBDeclared = teamBDeclared

        if (!squadADeclared || !squadBDeclared) {
          const [squadAResult, squadBResult, currentXIAResult, currentXIBResult] = await Promise.allSettled([
            getSquad(token, matchId, m.teamAId),
            getSquad(token, matchId, m.teamBId),
            getCurrentXI(token, matchId, m.teamAId),
            getCurrentXI(token, matchId, m.teamBId),
          ])

          function extractXIIds(result: PromiseSettledResult<SquadResponse>): Set<string> | null {
            if (result.status !== "fulfilled") return null
            const raw = result.value as unknown
            const list: Array<{ playerId: string }> = Array.isArray(raw)
              ? raw
              : Array.isArray((raw as SquadResponse)?.players)
                ? (raw as SquadResponse).players
                : []
            return list.length > 0 ? new Set(list.map((p) => p.playerId)) : null
          }

          if (!squadADeclared && squadAResult.status === "fulfilled" && squadAResult.value.players.length > 0) {
            const xiIds = extractXIIds(currentXIAResult)
            squadADeclared = true
            setTeamADeclared(true)
            setTeamASquad(squadAResult.value.players.map((p) => ({
              playerId: p.playerId,
              role: (xiIds ? (xiIds.has(p.playerId) ? "PLAYING" : "SUBSTITUTE") : p.role) as SquadRole,
              captain: p.captain,
              viceCaptain: p.viceCaptain,
            })))
          }
          if (!squadBDeclared && squadBResult.status === "fulfilled" && squadBResult.value.players.length > 0) {
            const xiIds = extractXIIds(currentXIBResult)
            squadBDeclared = true
            setTeamBDeclared(true)
            setTeamBSquad(squadBResult.value.players.map((p) => ({
              playerId: p.playerId,
              role: (xiIds ? (xiIds.has(p.playerId) ? "PLAYING" : "SUBSTITUTE") : p.role) as SquadRole,
              captain: p.captain,
              viceCaptain: p.viceCaptain,
            })))
          }
        }

        if (!squadADeclared || !squadBDeclared) {
          inSquadPhaseRef.current = true
          setPhase("declare_squad")
          return
        }

        let toss: TossResponse | null = null
        try {
          toss = await getToss(token, matchId)
          setTossData(toss)
        } catch (e) {
          if (e instanceof ApiError && e.status === 404) toss = null
        }

        if (!toss) { setPhase("toss"); return }

        const { activeInnings, activeOver } = live

        if (!activeInnings) {
          if (m.totalOvers > 0) {
            const inningsList = await getInningsList(token, matchId)
            if (inningsList.length >= 2) { setPhase("complete_result"); return }
          }
          setPhase("start_innings")
          return
        }

        setCurrentInningsId(activeInnings.inningsId)
        const pendingWicketStr = sessionStorage.getItem(`pendingWicket_${matchId}`)
        if (pendingWicketStr) {
          const pw = JSON.parse(pendingWicketStr) as {
            ballRes: RecordBallResponse
            playerOutId: string
            bowlerId: string | null
            bowlingTeamId: string | null
            nonStrikerId: string | null
          }
          setLastBallRes(pw.ballRes)
          setPlayerOutId(pw.playerOutId)
          setBatsmanId(null)
          setNonStrikerId(pw.nonStrikerId)
          pendingWicketRef.current = true
          pendingWicketBowlingTeamId.current = pw.bowlingTeamId
          wicketBowlerId.current = pw.bowlerId
          try {
            const eligible = await getEligibleBatsmen(token, activeInnings.inningsId)
            setEligibleBatsmen(eligible ?? [])
          } catch { setEligibleBatsmen([]) }
        } else if (batsmanId === null) {
          try {
            const pair = await getCurrentBatsmen(token, activeInnings.inningsId)
            setBatsmanId(pair.strikerId)
            setNonStrikerId(pair.nonStrikerId)
          } catch {
            // 400 = no batting state yet; opener selection UI will appear
          }
        }

        if (!activeOver) { setPhase("start_over"); return }

        setCurrentOverId(activeOver.overId)
        currentOverBowlerIdRef.current = activeOver.bowlerId
        setPhase("recording")
      } finally {
        if (forceRefetch) isComputingPhaseRef.current = false
      }
    },
    [match, liveState, token, matchId, refetchMatch, refetchLive],
  )

  useEffect(() => {
    if (match && liveState && !inSquadPhaseRef.current && !isComputingPhaseRef.current && !pendingWicketRef.current && !overrideComputePhaseRef.current) {
      computePhase()
    }
  }, [match, liveState]) // eslint-disable-line react-hooks/exhaustive-deps

  const startMatchMutation = useMutation({
    mutationFn: () => startMatch({ sessionToken: token, matchId }),
    onSuccess: () => {
      inSquadPhaseRef.current = true
      setPhase("declare_squad")
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to start match"),
  })

  const declareSquadMutation = useMutation({
    mutationFn: ({ teamId, entries }: { teamId: string; entries: SquadEntry[] }) => {
      setDeclaringTeamId(teamId)
      const players = entries
        .filter((e) => e.role !== "NONE")
        .map((e) => ({ playerId: e.playerId, role: e.role as "PLAYING" | "SUBSTITUTE", captain: e.captain, viceCaptain: e.viceCaptain }))
      return declareSquad({ sessionToken: token, matchId, teamId, players })
    },
    onSuccess: (_, { teamId }) => {
      if (match && teamId === match.teamAId) setTeamADeclared(true)
      else setTeamBDeclared(true)
      setDeclaringTeamId(null)
      toast.success("Squad declared")
    },
    onError: (err) => {
      setDeclaringTeamId(null)
      toast.error(err instanceof Error ? err.message : "Failed to declare squad")
    },
  })

  const tossMutation = useMutation({
    mutationFn: () =>
      conductToss({
        sessionToken: token,
        matchId,
        tossResult,
        winnerTeamId: tossWinner,
        decision: tossDecision,
      }),
    onSuccess: (res) => {
      setTossData(res)
      computePhase(true)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to conduct toss"),
  })

  const flipMutation = useMutation({
    mutationFn: () => flipCoin(token),
    onSuccess: (result) => {
      setPendingFlipResult(result)
      setTimeout(() => {
        setFlipSettled(true)
        setTimeout(() => {
          setIsFlipAnimating(false)
          setFlipSettled(false)
          setPendingFlipResult(null)
          setFlippedResult(result)
          setTossResult(result)
          toast.success(`Coin landed: ${result}`)
        }, 1000)
      }, 1500)
    },
    onError: (err) => {
      setTimeout(() => {
        setFlipSettled(true)
        setTimeout(() => {
          setIsFlipAnimating(false)
          setFlipSettled(false)
          setPendingFlipResult(null)
          toast.error(err instanceof Error ? err.message : "Flip failed")
        }, 1000)
      }, 1500)
    },
  })

  const startInningsMutation = useMutation({
    mutationFn: async () => {
      if (!tossData || !match) throw new Error("No toss data")
      const inningsList = await getInningsList(token, matchId)
      const completedCount = inningsList.length

      const firstBatter = tossData.decision === "BAT_FIRST" ? tossData.winnerTeamId : tossData.loserTeamId
      const secondBatter = firstBatter === match.teamAId ? match.teamBId : match.teamAId
      const defaultBatter = completedCount % 2 === 0 ? firstBatter : secondBatter
      const battingTeamId = (match.totalOvers === 0 && manualBattingTeamId)
        ? manualBattingTeamId
        : defaultBatter
      const bowlingTeamId = battingTeamId === match.teamAId ? match.teamBId : match.teamAId

      return startInnings({ sessionToken: token, matchId, battingTeamId, bowlingTeamId })
    },
    onSuccess: (res) => {
      setCurrentInningsId(res.inningsId)
      setBatsmanId(null)
      setNonStrikerId(null)
      setEligibleBatsmen([])
      computePhase(true)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to start innings"),
  })

  const startOverMutation = useMutation({
    mutationFn: async () => {
      if (!currentInningsId) throw new Error("No innings")
      const overReq = startOver({ sessionToken: token, inningsId: currentInningsId, bowlerId })
      if (batsmanId === null) {
        const [overRes] = await Promise.all([
          overReq,
          setBatsmen({ sessionToken: token, inningsId: currentInningsId, strikerId: openerA, nonStrikerId: openerB }),
        ])
        return overRes
      }
      return overReq
    },
    onSuccess: (res) => {
      setCurrentOverId(res.overId)
      currentOverBowlerIdRef.current = res.bowlerId
      if (batsmanId === null) {
        setBatsmanId(openerA)
        setNonStrikerId(openerB)
      }
      overrideComputePhaseRef.current = false
      setPhase("recording")
      resetBallState()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to start over"),
  })

  const recordBallMutation = useMutation({
    mutationFn: () => {
      if (!currentOverId || !batsmanId || !nonStrikerId) throw new Error("Missing context")
      if (isWicket) {
        wicketBowlerId.current = currentOverBowlerIdRef.current ?? liveState?.activeOver?.bowlerId ?? null
      }
      const finalRuns = runs
      const finalExtraRuns =
        deliveryMode === "wide"
          ? Math.max(extraRuns, 1)
          : deliveryMode === "no_ball"
            ? 1
            : deliveryMode === "bye" || deliveryMode === "leg_bye"
              ? extraRuns
              : 0
      const extraType: ExtraType | null =
        deliveryMode === "wide"
          ? "WIDE"
          : deliveryMode === "no_ball"
            ? "NO_BALL"
            : deliveryMode === "bye"
              ? "BYE"
              : deliveryMode === "leg_bye"
                ? "LEG_BYE"
                : null
      const boundaryType: BoundaryType | null =
        deliveryMode === "normal" || deliveryMode === "no_ball"
          ? runs === 4
            ? "FOUR"
            : runs === 6
              ? "SIX"
              : null
          : null

      return recordBall({
        sessionToken: token,
        overId: currentOverId,
        batsmanId,
        nonStrikerId,
        runs: finalRuns,
        extraRuns: finalExtraRuns,
        extraType,
        boundaryType,
        bowlerId: null,
        wicket: isWicket,
      })
    },
    onSuccess: async (res) => {
      setLastBallRes(res)
      showBallFlash(res)
      if (res.wicket) {
        const capturedBowlerId = currentOverBowlerIdRef.current ?? liveState?.activeOver?.bowlerId ?? null
        const capturedBowlingTeamId = liveState?.activeInnings?.bowlingTeamId ?? null
        const capturedPlayerOutId = batsmanId ?? ""
        wicketBowlerId.current = capturedBowlerId
        pendingWicketRef.current = true
        pendingWicketBowlingTeamId.current = capturedBowlingTeamId
        setPlayerOutId(capturedPlayerOutId)
        setBatsmanId(null)
        sessionStorage.setItem(
          `pendingWicket_${matchId}`,
          JSON.stringify({ ballRes: res, playerOutId: capturedPlayerOutId, bowlerId: capturedBowlerId, bowlingTeamId: capturedBowlingTeamId, nonStrikerId }),
        )
        setPhase("recording")
        refetchLive()
        refetchScorecard()
        if (currentInningsId) {
          try {
            const eligible = await getEligibleBatsmen(token, currentInningsId)
            setEligibleBatsmen(eligible ?? [])
          } catch { setEligibleBatsmen([]) }
        }
      } else if (res.inningsCompleted || res.overCompleted) {
        const totalRuns = res.runs + res.extraRuns
        const shouldSwap = (totalRuns % 2 === 1) !== res.overCompleted
        if (shouldSwap) {
          const prev = batsmanId
          setBatsmanId(nonStrikerId)
          setNonStrikerId(prev)
        }
        if (res.inningsCompleted) {
          completedInningsNumberRef.current = liveState?.activeInnings?.inningsNumber ?? completedInningsNumberRef.current
        }
        setTimeout(() => {
          refetchLive()
          refetchScorecard()
          if (res.inningsCompleted) {
            if (match?.totalOvers === 0) {
              endInningsMutation.mutate()
            } else {
              overrideComputePhaseRef.current = true
              setPhase("innings_complete")
            }
            resetBallState()
          } else {
            overrideComputePhaseRef.current = true
            setPhase("over_complete")
            resetBallState()
          }
        }, 1000)
      } else {
        const totalRuns = res.runs + res.extraRuns
        if (totalRuns % 2 === 1) {
          const prev = batsmanId
          setBatsmanId(nonStrikerId)
          setNonStrikerId(prev)
        }
        refetchLive()
        refetchScorecard()
        resetBallState()
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to record ball"),
  })

  const recordWicketMutation = useMutation({
    mutationFn: async () => {
      if (!lastBallRes || !currentInningsId) throw new Error("No ball recorded")
      const wasInningsCompleted = lastBallRes.inningsCompleted
      const wasOverCompleted = lastBallRes.overCompleted

      const effectiveBowlerId = wicketBowlerId.current ?? currentOverBowlerIdRef.current ?? liveState?.activeOver?.bowlerId ?? null
      try {
        await recordWicket({
          sessionToken: token,
          ballId: lastBallRes.ballId,
          playerOutId,
          type: wicketType,
          bowlerId: ["RUN_OUT", "OBSTRUCTING_FIELD", "RETIRED_HURT", "TIMED_OUT"].includes(wicketType)
            ? null
            : effectiveBowlerId,
          fielderId: fielderId || null,
        })
      } catch (err) {
        if (!(err instanceof ApiError && err.message.toLowerCase().includes("already recorded"))) {
          throw err
        }
      }

      if (wasInningsCompleted) {
        return { strikerId: null as string | null, nonStrikerId: nonStrikerId, wasOverCompleted, wasInningsCompleted }
      }

      const pair = await setBatsmen({
        sessionToken: token,
        inningsId: currentInningsId,
        strikerId: newBatsmanId,
        nonStrikerId: nonStrikerId ?? "",
      })

      if (wasOverCompleted) {
        const swapped = await setBatsmen({
          sessionToken: token,
          inningsId: currentInningsId,
          strikerId: pair.nonStrikerId,
          nonStrikerId: pair.strikerId,
        })
        return { strikerId: swapped.strikerId as string | null, nonStrikerId: swapped.nonStrikerId, wasOverCompleted, wasInningsCompleted }
      }

      return { strikerId: pair.strikerId as string | null, nonStrikerId: pair.nonStrikerId, wasOverCompleted, wasInningsCompleted }
    },
    onSuccess: (res) => {
      sessionStorage.removeItem(`pendingWicket_${matchId}`)
      pendingWicketRef.current = false
      pendingWicketBowlingTeamId.current = null
      wicketBowlerId.current = null
      if (res.strikerId) setBatsmanId(res.strikerId)
      if (res.nonStrikerId) setNonStrikerId(res.nonStrikerId)
      setEligibleBatsmen([])
      setNewBatsmanId("")
      setFielderId("")
      resetBallState()
      if (res.wasInningsCompleted) {
        completedInningsNumberRef.current = liveState?.activeInnings?.inningsNumber ?? completedInningsNumberRef.current
        if (match?.totalOvers === 0) {
          endInningsMutation.mutate()
        } else {
          overrideComputePhaseRef.current = true
          setPhase("innings_complete")
        }
      } else if (res.wasOverCompleted) {
        overrideComputePhaseRef.current = true
        setPhase("over_complete")
      }
      refetchLive()
      refetchScorecard()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to record wicket"),
  })

  const recordSubstitutionMutation = useMutation({
    mutationFn: () => {
      if (!subTeamId || !subPlayerOutId || !subPlayerInId) throw new Error("Fill all substitution fields")
      return recordSubstitution({
        sessionToken: token,
        matchId,
        teamId: subTeamId,
        playerOutId: subPlayerOutId,
        playerInId: subPlayerInId,
        inningsNumber: activeInnings?.inningsNumber ?? 1,
        overNumber: activeInnings?.oversCompleted ?? 0,
        substitutionType: subType,
      })
    },
    onSuccess: (res) => {
      const setSquad = subTeamId === match?.teamAId ? setTeamASquad : setTeamBSquad
      setSquad((prev) =>
        prev.map((e) => {
          if (e.playerId === subPlayerOutId) return { ...e, role: "SUBSTITUTE" as SquadRole }
          if (e.playerId === subPlayerInId) return { ...e, role: "PLAYING" as SquadRole }
          return e
        }),
      )
      setShowSubForm(false)
      setSubTeamId("")
      setSubPlayerOutId("")
      setSubPlayerInId("")
      setSubType("IMPACT")
      toast.success(`${res.playerInName} in for ${res.playerOutName}`)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to record substitution"),
  })

  const endOverMutation = useMutation({
    mutationFn: () => {
      if (!currentOverId) throw new Error("No active over")
      return endOver({ sessionToken: token, overId: currentOverId })
    },
    onSuccess: () => {
      setCurrentOverId(null)
      const prev = batsmanId
      setBatsmanId(nonStrikerId)
      setNonStrikerId(prev)
      overrideComputePhaseRef.current = true
      setPhase("over_complete")
      resetBallState()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to end over"),
  })

  const undoBallMutation = useMutation({
    mutationFn: async () => {
      if (!currentInningsId) throw new Error("No active innings")
      return undoBall({ sessionToken: token, inningsId: currentInningsId })
    },
    onSuccess: async (res) => {
      // Clear pending wicket state — the wicket ball is gone regardless of wicketReversed flag
      if (pendingWicketRef.current || res.wicketReversed) {
        pendingWicketRef.current = false
        pendingWicketBowlingTeamId.current = null
        wicketBowlerId.current = null
        sessionStorage.removeItem(`pendingWicket_${matchId}`)
        setPlayerOutId("")
        setFielderId("")
        setNewBatsmanId("")
        setEligibleBatsmen([])
      }
      resetBallState()

      // Always sync batsmen from server
      try {
        const pair = await getCurrentBatsmen(token, currentInningsId!)
        setBatsmanId(pair.strikerId)
        setNonStrikerId(pair.nonStrikerId)
      } catch {}

      // Refetch live state (covers innings list / score) and scorecard
      await refetchLive()
      refetchScorecard()

      // Clear the override so computePhase() effect can run freely again
      overrideComputePhaseRef.current = false
      setPhase("recording")
      toast.success("Last ball undone")
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to undo ball"),
  })

  const endInningsMutation = useMutation({
    mutationFn: async () => {
      if (!currentInningsId) throw new Error("No innings")
      try {
        await endInnings({ sessionToken: token, inningsId: currentInningsId })
      } catch (err) {
        if (!(err instanceof ApiError && (err.message.toLowerCase().includes("not active") || err.message.toLowerCase().includes("already")))) {
          throw err
        }
      }
    },
    onSuccess: () => {
      overrideComputePhaseRef.current = false
      setCurrentInningsId(null)
      setCurrentOverId(null)
      setBatsmanId(null)
      setNonStrikerId(null)
      computePhase(true)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to end innings"),
  })

  const completeResultMutation = useMutation({
    mutationFn: () => completeMatchResult(token, matchId),
    onSuccess: () => {
      endMatch({ sessionToken: token, matchId, finalStatus: "COMPLETED" })
        .catch(() => {})
        .finally(() => router.push(`/matches/${matchId}/result`))
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to complete result"),
  })

  const deleteMatchMutation = useMutation({
    mutationFn: () => deleteMatch({ sessionToken: token, matchId }),
    onSuccess: () => router.push("/dashboard"),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete match"),
  })

  function resetBallState() {
    setDeliveryMode("normal")
    setRuns(0)
    setExtraRuns(0)
    setIsWicket(false)
    setWicketType("BOWLED")
    setPlayerOutId("")
    setFielderId("")
    setLastBallRes(null)
  }


  useEffect(() => {
    const el = flashDivRef.current
    if (!el || !flashPosition.current) return
    el.style.right = `${flashPosition.current.right}px`
    el.style.top = `${flashPosition.current.top}px`
  }, [ballFlash])

  function showBallFlash(res: RecordBallResponse) {
    const rect = recordBallCardRef.current?.getBoundingClientRect()
    flashPosition.current = rect
      ? { right: window.innerWidth - rect.right + 24, top: rect.top + rect.height / 2 }
      : null
    const k = Date.now()
    const flash = res.wicket
      ? { label: "W!", bg: "bg-red-500", text: "text-white", description: "Wicket!", key: k }
      : res.boundaryType === "SIX"
      ? { label: "6", bg: "bg-amber-500", text: "text-white", description: "SIX!", key: k }
      : res.boundaryType === "FOUR"
      ? { label: "4", bg: "bg-green-600", text: "text-white", description: "FOUR!", key: k }
      : res.extraType === "WIDE"
      ? { label: "Wd", bg: "bg-yellow-400", text: "text-black", description: `Wide +${res.extraRuns}`, key: k }
      : res.extraType === "NO_BALL"
      ? { label: "NB", bg: "bg-orange-500", text: "text-white", description: `No Ball +${res.extraRuns}`, key: k }
      : res.extraType === "BYE"
      ? { label: `${res.extraRuns}b`, bg: "bg-blue-500", text: "text-white", description: `${res.extraRuns} Bye`, key: k }
      : res.extraType === "LEG_BYE"
      ? { label: `${res.extraRuns}lb`, bg: "bg-blue-500", text: "text-white", description: `${res.extraRuns} Leg Bye`, key: k }
      : res.runs === 0
      ? { label: "•", bg: "bg-muted", text: "text-muted-foreground", description: "Dot ball", key: k }
      : { label: String(res.runs), bg: "bg-primary", text: "text-primary-foreground", description: `${res.runs} run${res.runs !== 1 ? "s" : ""}`, key: k }
    if (ballFlashTimer.current) clearTimeout(ballFlashTimer.current)
    setBallFlash(flash)
    ballFlashTimer.current = setTimeout(() => setBallFlash(null), 1000)
  }

  function showMilestone(label: string, subLabel: string, name: string, colorClass: string) {
    if (milestoneTimer.current) clearTimeout(milestoneTimer.current)
    setMilestone({ label, subLabel, name, colorClass, key: Date.now() })
    milestoneTimer.current = setTimeout(() => setMilestone(null), 3000)
  }

  useEffect(() => {
    if (!scorecard) return

    if (!milestoneSeedDone.current) {
      for (const inn of scorecard.innings) {
        for (const b of inn.batting) {
          for (const t of [25, 50, 75, 100]) {
            if (b.runs >= t) seenMilestones.current.add(`${inn.inningsId}-bat-${b.playerId}-${t}`)
          }
        }
        for (const b of inn.bowling) {
          for (const t of [3, 5]) {
            if (b.wickets >= t) seenMilestones.current.add(`${inn.inningsId}-bowl-${b.bowlerId}-${t}`)
          }
        }
      }
      milestoneSeedDone.current = true
      return
    }

    for (const inn of scorecard.innings) {
      for (const b of inn.batting) {
        for (const { t, label, subLabel, colorClass } of [
          { t: 100, label: "CENTURY!", subLabel: "100 runs", colorClass: "text-yellow-400" },
          { t: 75, label: "75!", subLabel: "75 runs", colorClass: "text-orange-400" },
          { t: 50, label: "HALF CENTURY!", subLabel: "50 runs", colorClass: "text-green-400" },
          { t: 25, label: "25!", subLabel: "25 runs", colorClass: "text-blue-400" },
        ]) {
          const key = `${inn.inningsId}-bat-${b.playerId}-${t}`
          if (b.runs >= t && !seenMilestones.current.has(key)) {
            seenMilestones.current.add(key)
            showMilestone(label, subLabel, playerName(b.playerId), colorClass)
            return
          }
        }
      }
      for (const b of inn.bowling) {
        for (const { t, label, subLabel, colorClass } of [
          { t: 5, label: "FIVE-FER!", subLabel: "5 wickets", colorClass: "text-red-500" },
          { t: 3, label: "3 WICKETS!", subLabel: "3 wickets", colorClass: "text-purple-500" },
        ]) {
          const key = `${inn.inningsId}-bowl-${b.bowlerId}-${t}`
          if (b.wickets >= t && !seenMilestones.current.has(key)) {
            seenMilestones.current.add(key)
            showMilestone(label, subLabel, playerName(b.bowlerId), colorClass)
            return
          }
        }
      }
    }
  }, [scorecard]) // eslint-disable-line react-hooks/exhaustive-deps


  const activeInnings = liveState?.activeInnings
  const activeOver = liveState?.activeOver
  const battingPlayers = determineBattingTeamPlayers()
  const bowlingPlayers = determineBowlingTeamPlayers()
  const isFirstOver = batsmanId === null
  // At least one ball exists if we're past the initial state of a live over, or in a phase that follows ball recording
  const hasBalls =
    phase === "over_complete" ||
    phase === "innings_complete" ||
    (activeInnings?.oversCompleted ?? 0) > 0 ||
    (activeOver?.legalBallCount ?? 0) > 0

  if (matchError || liveError) {
    return (
      <div className="space-y-3">
        <p className="text-destructive text-sm">Failed to load match data.</p>
        <Button size="sm" variant="outline" onClick={() => { refetchMatch(); refetchLive() }}>
          Retry
        </Button>
      </div>
    )
  }

  if (!match || phase === "loading") {
    return <p className="text-muted-foreground">Loading match…</p>
  }

  const teamAName = match.teamAName
  const teamBName = match.teamBName

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-1">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-primary">
          ← Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <StatusDot status={match.status} size="md" />
            {teamAName} vs {teamBName}
          </h1>
          <Badge variant="outline">
            {match.format} {match.totalOvers > 0 ? `· ${match.totalOvers} ov` : "· Test"}
          </Badge>
        </div>
      </div>

      {activeInnings && (
        <Card className="border-primary/30">
          <CardContent className="pt-4">
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold tabular-nums">
                {activeInnings.totalRuns}/{activeInnings.wickets}
              </span>
              <span className="text-lg text-muted-foreground mb-1">
                ({activeInnings.oversCompleted}
                {activeOver ? `.${activeOver.legalBallCount}` : ""})
              </span>
              {activeInnings.target && (
                <span className="text-sm text-muted-foreground mb-1 ml-2">
                  Target: {activeInnings.target}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {teamName(activeInnings.battingTeamId)} batting ·{" "}
              {activeInnings.extras} extras
            </p>
            {activeOver && (
              <p className="text-sm text-muted-foreground">
                Over {activeOver.overNumber} · {activeOver.legalBallCount}/6 ·{" "}
                {activeOver.totalRuns} runs · {activeOver.wickets} wkts
              </p>
            )}
            {batsmanId && (
              <p className="text-sm mt-2">
                <span className="font-medium">⚫ {playerName(batsmanId)}</span>
                <span className="text-muted-foreground"> · non-striker: {playerName(nonStrikerId)}</span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      {phase === "not_started" && (
        <Card>
          <CardHeader>
            <CardTitle>Match not started</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => startMatchMutation.mutate()} disabled={startMatchMutation.isPending}>
              {startMatchMutation.isPending ? "Starting…" : "Start Match"}
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "declare_squad" && (
        <Card>
          <CardHeader>
            <CardTitle>Declare Squads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <SquadBuilder
              teamName={teamAName}
              players={teamAPlayers}
              entries={teamASquad}
              onChange={setTeamASquad}
              onDeclare={() => declareSquadMutation.mutate({ teamId: match.teamAId, entries: teamASquad })}
              isPending={declareSquadMutation.isPending && declaringTeamId === match.teamAId}
              declared={teamADeclared}
            />
            <Separator />
            <SquadBuilder
              teamName={teamBName}
              players={teamBPlayers}
              entries={teamBSquad}
              onChange={setTeamBSquad}
              onDeclare={() => declareSquadMutation.mutate({ teamId: match.teamBId, entries: teamBSquad })}
              isPending={declareSquadMutation.isPending && declaringTeamId === match.teamBId}
              declared={teamBDeclared}
            />
            <Separator />
            <Button
              onClick={() => {
                if (!teamADeclared || !teamBDeclared) {
                  toast.error("Please declare both team squads before proceeding to toss")
                  return
                }
                inSquadPhaseRef.current = false
                computePhase(true)
              }}
            >
              Continue to Toss →
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "toss" && (
        <Card>
          <CardHeader>
            <CardTitle>Conduct Toss</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Toss Result</Label>
              {isFlipAnimating ? (
                <div className="flex items-center gap-4 py-1">
                  <div
                    className={`h-12 w-12 rounded-full bg-amber-400 border-[3px] border-amber-600 flex items-center justify-center text-amber-900 font-bold text-xs shadow-md shrink-0${flipSettled ? "" : " animate-coin-flip"}`}
                  >
                    {pendingFlipResult ?? "?"}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {flipSettled ? `Landed: ${pendingFlipResult}` : "Flipping…"}
                  </span>
                </div>
              ) : flippedResult ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    Coin landed: <span className="text-amber-500 font-semibold">{flippedResult}</span>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFlippedResult(null)
                      setIsFlipAnimating(true)
                      flipMutation.mutate()
                    }}
                    disabled={flipMutation.isPending}
                  >
                    Re-flip
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  {(["HEAD", "TAIL"] as TossResult[]).map((r) => (
                    <Button
                      key={r}
                      variant={tossResult === r ? "default" : "outline"}
                      onClick={() => setTossResult(r)}
                    >
                      {r}
                    </Button>
                  ))}
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setIsFlipAnimating(true)
                      flipMutation.mutate()
                    }}
                    disabled={flipMutation.isPending}
                  >
                    Flip Coin
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Toss Winner</Label>
              <div className="flex gap-2">
                {[
                  { id: match.teamAId, name: teamAName },
                  { id: match.teamBId, name: teamBName },
                ].map((t) => (
                  <Button
                    key={t.id}
                    variant={tossWinner === t.id ? "default" : "outline"}
                    onClick={() => setTossWinner(t.id)}
                  >
                    {t.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Decision</Label>
              <div className="flex gap-2">
                {(["BAT_FIRST", "BOWL_FIRST"] as TossDecision[]).map((d) => (
                  <Button
                    key={d}
                    variant={tossDecision === d ? "default" : "outline"}
                    onClick={() => setTossDecision(d)}
                  >
                    {d === "BAT_FIRST" ? "Bat First" : "Bowl First"}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => tossMutation.mutate()}
              disabled={!tossWinner || tossMutation.isPending}
            >
              {tossMutation.isPending ? "Recording…" : (flipSettled || flippedResult) ? "Complete Toss" : "Conduct Toss"}
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "start_innings" && (() => {
        const completedInnings = scorecard?.innings.length ?? 0
        const isTest = match.totalOvers === 0
        const allInningsPlayed = !isTest && completedInnings >= 2
        return (
          <Card>
            <CardHeader>
              <CardTitle>{allInningsPlayed ? "All Innings Complete" : "Start Innings"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tossData && (
                <p className="text-sm text-muted-foreground">
                  {teamName(tossData.winnerTeamId)} won toss ·{" "}
                  {tossData.decision === "BAT_FIRST" ? "Batting first" : "Bowling first"}
                </p>
              )}
              {isTest && !allInningsPlayed && match && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Batting Team</p>
                  <div className="flex gap-2">
                    {[match.teamAId, match.teamBId].map((tid) => (
                      <button
                        key={tid}
                        type="button"
                        onClick={() => setManualBattingTeamId(tid)}
                        className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                          manualBattingTeamId === tid
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {teamName(tid)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {allInningsPlayed && (
                <p className="text-sm text-muted-foreground">Both innings have been completed. Complete the match to record the result.</p>
              )}
              <div className="flex gap-2">
                {!allInningsPlayed && (
                  <Button
                    onClick={() => startInningsMutation.mutate()}
                    disabled={startInningsMutation.isPending || (isTest && completedInnings >= 1 && !manualBattingTeamId)}
                  >
                    {startInningsMutation.isPending ? "Starting…" : "Start Innings"}
                  </Button>
                )}
                <Button
                  variant={allInningsPlayed ? "default" : "destructive"}
                  onClick={() => completeResultMutation.mutate()}
                  disabled={completeResultMutation.isPending}
                >
                  {completeResultMutation.isPending ? "Ending…" : allInningsPlayed ? "Complete Match" : "End Match"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {(phase === "start_over" || phase === "over_complete") && (
        <Card>
          <CardHeader>
            <CardTitle>
              {phase === "over_complete" ? "Over Complete — Start Next Over" : "Start Over"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isFirstOver && (
              <>
                <div className="space-y-2">
                  <Label>Opening Batsman (Striker)</Label>
                  <Select value={openerA} onValueChange={(v) => setOpenerA(v ?? "")}>
                    <SelectTrigger>
                      <span className="flex flex-1 text-left text-sm">
                        {openerA
                          ? (battingPlayers.find((p) => p.playerId === openerA)?.name ?? openerA)
                          : <span className="text-muted-foreground">Select opener</span>}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {battingPlayers.map((p) => (
                        <SelectItem key={p.playerId} value={p.playerId} disabled={p.playerId === openerB}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Opening Batsman (Non-striker)</Label>
                  <Select value={openerB} onValueChange={(v) => setOpenerB(v ?? "")}>
                    <SelectTrigger>
                      <span className="flex flex-1 text-left text-sm">
                        {openerB
                          ? (battingPlayers.find((p) => p.playerId === openerB)?.name ?? openerB)
                          : <span className="text-muted-foreground">Select non-striker</span>}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {battingPlayers.map((p) => (
                        <SelectItem key={p.playerId} value={p.playerId} disabled={p.playerId === openerA}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Bowler</Label>
              <Select value={bowlerId} onValueChange={(v) => setBowlerId(v ?? "")}>
                <SelectTrigger>
                  <span className="flex flex-1 text-left text-sm">
                    {bowlerId
                      ? (bowlingPlayers.find((p) => p.playerId === bowlerId)?.name ?? bowlerId)
                      : <span className="text-muted-foreground">Select bowler</span>}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {bowlingPlayers.map((p) => (
                    <SelectItem key={p.playerId} value={p.playerId}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => startOverMutation.mutate()}
                disabled={
                  !bowlerId ||
                  (isFirstOver && (!openerA || !openerB)) ||
                  startOverMutation.isPending
                }
              >
                {startOverMutation.isPending ? "Starting…" : "Start Over"}
              </Button>
              {phase === "over_complete" && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => endInningsMutation.mutate()}
                    disabled={endInningsMutation.isPending}
                  >
                    {endInningsMutation.isPending ? "Ending…" : "End Innings"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => undoBallMutation.mutate()}
                    disabled={undoBallMutation.isPending}
                  >
                    {undoBallMutation.isPending ? "Undoing…" : "Undo Last Ball"}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {phase === "recording" && (
        <div className="space-y-4">
          {lastBallRes?.wicket ? (
            <Card>
              <CardHeader>
                <CardTitle>Record Wicket</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Wicket Type</Label>
                  <Select value={wicketType} onValueChange={(v) => v && setWicketType(v as WicketType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WICKET_TYPES.map((w) => (
                        <SelectItem key={w} value={w}>
                          {w.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Player Out</Label>
                  <div className="flex gap-2">
                    {[playerOutId, nonStrikerId].filter(Boolean).map((id) => (
                      <Button
                        key={id!}
                        variant={playerOutId === id ? "default" : "outline"}
                        onClick={() => setPlayerOutId(id!)}
                      >
                        {playerName(id)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Fielder (optional)</Label>
                  <Select value={fielderId} onValueChange={(v) => setFielderId(v ?? "")}>
                    <SelectTrigger>
                      <span className="flex flex-1 text-left text-sm">
                        {fielderId
                          ? (bowlingPlayers.find((p) => p.playerId === fielderId)?.name ?? fielderId)
                          : <span className="text-muted-foreground">None</span>}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {bowlingPlayers.map((p) => (
                        <SelectItem key={p.playerId} value={p.playerId}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>New Batsman</Label>
                  <Select value={newBatsmanId} onValueChange={(v) => setNewBatsmanId(v ?? "")}>
                    <SelectTrigger>
                      <span className="flex flex-1 text-left text-sm">
                        {newBatsmanId
                          ? (eligibleBatsmen.find((p) => p.playerId === newBatsmanId)?.playerName ?? newBatsmanId)
                          : <span className="text-muted-foreground">Select incoming batsman</span>}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleBatsmen.map((p) => (
                        <SelectItem key={p.playerId} value={p.playerId}>
                          {p.playerName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => recordWicketMutation.mutate()}
                    disabled={!playerOutId || (!newBatsmanId && !lastBallRes?.inningsCompleted) || recordWicketMutation.isPending}
                  >
                    {recordWicketMutation.isPending ? "Recording…" : "Confirm Wicket"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => undoBallMutation.mutate()}
                    disabled={undoBallMutation.isPending}
                  >
                    {undoBallMutation.isPending ? "Undoing…" : "Undo Ball"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card ref={recordBallCardRef}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Record Ball</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEditBatsmen((v) => !v)}
                    >
                      {showEditBatsmen ? "Done" : "Edit Batsman"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => endOverMutation.mutate()}
                      disabled={endOverMutation.isPending}
                    >
                      {endOverMutation.isPending ? "Ending…" : "End Over"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {showEditBatsmen && (
                  <div className="space-y-3 pb-4 border-b border-border">
                    <div className="space-y-2">
                      <Label>Striker</Label>
                      <Select
                        value={batsmanId ?? ""}
                        onValueChange={(v) => v && setBatsmanId(v)}
                      >
                        <SelectTrigger>
                          <span className="flex flex-1 text-left text-sm">
                            {batsmanId
                              ? (battingPlayers.find((p) => p.playerId === batsmanId)?.name ?? batsmanId)
                              : <span className="text-muted-foreground">Select striker</span>}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {battingPlayers
                            .filter((p) => p.playerId !== nonStrikerId)
                            .map((p) => (
                              <SelectItem key={p.playerId} value={p.playerId}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Non-striker</Label>
                      <Select
                        value={nonStrikerId ?? ""}
                        onValueChange={(v) => v && setNonStrikerId(v)}
                      >
                        <SelectTrigger>
                          <span className="flex flex-1 text-left text-sm">
                            {nonStrikerId
                              ? (battingPlayers.find((p) => p.playerId === nonStrikerId)?.name ?? nonStrikerId)
                              : <span className="text-muted-foreground">Select non-striker</span>}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {battingPlayers
                            .filter((p) => p.playerId !== batsmanId)
                            .map((p) => (
                              <SelectItem key={p.playerId} value={p.playerId}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Delivery</Label>
                  <div className="flex gap-2 flex-wrap">
                    {(
                      [
                        ["normal", "Normal"],
                        ["wide", "Wide"],
                        ["no_ball", "No Ball"],
                        ["bye", "Bye"],
                        ["leg_bye", "Leg Bye"],
                      ] as [DeliveryMode, string][]
                    ).map(([mode, label]) => (
                      <Button
                        key={mode}
                        size="sm"
                        variant={deliveryMode === mode ? "default" : "outline"}
                        onClick={() => {
                          setDeliveryMode(mode)
                          setRuns(0)
                          setExtraRuns(mode === "wide" ? 1 : 0)
                        }}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {(deliveryMode === "normal" || deliveryMode === "no_ball") && (
                  <div className="space-y-2">
                    <Label>Runs off bat</Label>
                    <div className="flex gap-2 flex-wrap">
                      {[0, 1, 2, 3, 4, 6].map((r) => (
                        <Button
                          key={r}
                          size="sm"
                          variant={runs === r ? "default" : "outline"}
                          onClick={() => setRuns(r)}
                          className="w-10"
                        >
                          {r}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {(deliveryMode === "wide" ||
                  deliveryMode === "bye" ||
                  deliveryMode === "leg_bye") && (
                  <div className="space-y-2">
                    <Label>
                      {deliveryMode === "wide" ? "Total wide runs" : "Extra runs"}
                    </Label>
                    <div className="flex gap-2 flex-wrap">
                      {[1, 2, 3, 4, 5, 6].map((r) => (
                        <Button
                          key={r}
                          size="sm"
                          variant={extraRuns === r ? "default" : "outline"}
                          onClick={() => setExtraRuns(r)}
                          className="w-10"
                        >
                          {r}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant={isWicket ? "destructive" : "outline"}
                    onClick={() => setIsWicket(!isWicket)}
                  >
                    {isWicket ? "✕ Wicket" : "Wicket?"}
                  </Button>
                  {isWicket && (
                    <Select value={wicketType} onValueChange={(v) => v && setWicketType(v as WicketType)}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WICKET_TYPES.map((w) => (
                          <SelectItem key={w} value={w}>
                            {w.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="flex gap-3 flex-wrap">
                  <Button
                    onClick={() => recordBallMutation.mutate()}
                    disabled={recordBallMutation.isPending}
                  >
                    {recordBallMutation.isPending ? "Recording…" : "Record Ball"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const prev = batsmanId
                      setBatsmanId(nonStrikerId)
                      setNonStrikerId(prev)
                    }}
                  >
                    Swap ⇄
                  </Button>
                  {hasBalls && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => undoBallMutation.mutate()}
                      disabled={undoBallMutation.isPending}
                    >
                      {undoBallMutation.isPending ? "Undoing…" : "Undo"}
                    </Button>
                  )}
                </div>

              </CardContent>
            </Card>
          )}
        </div>
      )}

      {phase === "innings_complete" && (() => {
        const isTest = match.totalOvers === 0
        const isMatchOver = !isTest && completedInningsNumberRef.current >= 2
        return (
          <Card>
            <CardHeader>
              <CardTitle>Innings Complete</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeInnings && (
                <p className="text-muted-foreground text-sm">
                  {teamName(activeInnings.battingTeamId)} scored{" "}
                  {activeInnings.totalRuns}/{activeInnings.wickets} in{" "}
                  {activeInnings.oversCompleted} overs
                </p>
              )}
              <div className="flex gap-2 flex-wrap">
                {!isMatchOver && (
                  <Button
                    onClick={() => endInningsMutation.mutate()}
                    disabled={endInningsMutation.isPending}
                  >
                    {endInningsMutation.isPending
                      ? "Ending…"
                      : (() => {
                          const n = completedInningsNumberRef.current + 1
                          const suffix = n === 2 ? "nd" : n === 3 ? "rd" : "th"
                          return `Start ${n}${suffix} Innings`
                        })()}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => undoBallMutation.mutate()}
                  disabled={undoBallMutation.isPending}
                >
                  {undoBallMutation.isPending ? "Undoing…" : "Undo Last Ball"}
                </Button>
                <Button
                  variant={isMatchOver ? "default" : "destructive"}
                  onClick={() => completeResultMutation.mutate()}
                  disabled={completeResultMutation.isPending}
                >
                  {completeResultMutation.isPending
                    ? "Computing…"
                    : isMatchOver
                      ? "Complete Match & View Result"
                      : "End Match"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {phase === "complete_result" && (
        <Card>
          <CardHeader>
            <CardTitle>Both innings complete</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => completeResultMutation.mutate()}
              disabled={completeResultMutation.isPending}
            >
              {completeResultMutation.isPending ? "Computing…" : "Complete Match & View Result"}
            </Button>
          </CardContent>
        </Card>
      )}

      {activeInnings && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Record Substitution</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => {
                setShowSubForm((v) => !v)
                setSubTeamId("")
                setSubPlayerOutId("")
                setSubPlayerInId("")
                setSubType("IMPACT")
              }}>
                {showSubForm ? "Cancel" : "Substitute Player"}
              </Button>
            </div>
          </CardHeader>
          {showSubForm && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Team</Label>
                <Select value={subTeamId} onValueChange={(v) => { setSubTeamId(v ?? ""); setSubPlayerOutId(""); setSubPlayerInId("") }}>
                  <SelectTrigger>
                    <span className="flex flex-1 text-left text-sm">
                      {subTeamId === match.teamAId ? match.teamAName : subTeamId === match.teamBId ? match.teamBName : <span className="text-muted-foreground">Select team</span>}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={match.teamAId}>{match.teamAName}</SelectItem>
                    <SelectItem value={match.teamBId}>{match.teamBName}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {subTeamId && (() => {
                const squad = subTeamId === match.teamAId ? teamASquad : teamBSquad
                const players = subTeamId === match.teamAId ? teamAPlayers : teamBPlayers
                const name = (id: string) => players.find((p) => p.playerId === id)?.name ?? id.slice(0, 8)
                const playing = squad.filter((e) => e.role === "PLAYING")
                const bench = squad.filter((e) => e.role === "SUBSTITUTE")
                return (
                  <>
                    <div className="space-y-2">
                      <Label>Player Out (Playing XI)</Label>
                      <Select value={subPlayerOutId} onValueChange={(v) => setSubPlayerOutId(v ?? "")}>
                        <SelectTrigger>
                          <span className="flex flex-1 text-left text-sm">
                            {subPlayerOutId ? name(subPlayerOutId) : <span className="text-muted-foreground">Select player leaving</span>}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {playing.map((e) => (
                            <SelectItem key={e.playerId} value={e.playerId}>{name(e.playerId)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Player In (Substitute)</Label>
                      <Select value={subPlayerInId} onValueChange={(v) => setSubPlayerInId(v ?? "")}>
                        <SelectTrigger>
                          <span className="flex flex-1 text-left text-sm">
                            {subPlayerInId ? name(subPlayerInId) : <span className="text-muted-foreground">Select player coming in</span>}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {bench.map((e) => (
                            <SelectItem key={e.playerId} value={e.playerId} disabled={e.playerId === subPlayerOutId}>{name(e.playerId)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )
              })()}

              <div className="space-y-2">
                <Label>Substitution Type</Label>
                <Select value={subType} onValueChange={(v) => setSubType((v ?? "IMPACT") as SubstitutionType)}>
                  <SelectTrigger>
                    <span className="flex flex-1 text-left text-sm">{subType.replace("_", " ")}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IMPACT">Impact</SelectItem>
                    <SelectItem value="CONCUSSION">Concussion</SelectItem>
                    <SelectItem value="RETIRED_HURT">Retired Hurt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => recordSubstitutionMutation.mutate()}
                disabled={!subTeamId || !subPlayerOutId || !subPlayerInId || recordSubstitutionMutation.isPending}
              >
                {recordSubstitutionMutation.isPending ? "Recording…" : "Confirm Substitution"}
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {match.status === "IN_PROGRESS" && phase !== "toss" && phase !== "declare_squad" && (
        <div className="flex justify-end">
          <Button variant="outline" nativeButton={false} render={<Link href={`/matches/${matchId}/result`} />}>
            View Scorecard
          </Button>
        </div>
      )}

      {match.status !== "IN_PROGRESS" && (
        <div className="flex justify-end">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteMatchMutation.mutate()}
            disabled={deleteMatchMutation.isPending}
          >
            {deleteMatchMutation.isPending ? "Deleting…" : "Delete Match"}
          </Button>
        </div>
      )}

      {phase === "completed" && (
        <Card>
          <CardHeader>
            <CardTitle>Match Complete</CardTitle>
          </CardHeader>
          <CardContent>
            <Button nativeButton={false} render={<Link href={`/matches/${matchId}/result`} />}>View Summary</Button>
          </CardContent>
        </Card>
      )}

      {scorecard && scorecard.innings.filter((inn) => inn.batting.length > 0).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold">Innings Scorecard</h2>
          {scorecard.innings.filter((inn) => inn.batting.length > 0).map((inn) => (
            <Card key={inn.inningsId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Innings {inn.inningsNumber} — {teamName(inn.battingTeamId)} batting · {inn.totalRuns}/{inn.totalWickets} ({inn.totalOvers} ov)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-0 pb-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground px-6 pt-4 pb-1 uppercase tracking-wide">Batting</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batter</TableHead>
                        <TableHead className="text-right w-10">R</TableHead>
                        <TableHead className="text-right w-10">B</TableHead>
                        <TableHead className="text-right w-10">4s</TableHead>
                        <TableHead className="text-right w-10">6s</TableHead>
                        <TableHead className="text-right w-16">SR</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inn.batting.sort((a, b) => a.battingPosition - b.battingPosition).map((b) => (
                        <TableRow key={b.id}>
                          <TableCell>
                            <span className="font-medium">{playerName(b.playerId)}</span>
                            {b.out && b.dismissalType && (
                              <span className="ml-1.5 text-xs text-muted-foreground">{b.dismissalType}</span>
                            )}
                            {!b.out && <span className="ml-1.5 text-xs text-primary">not out</span>}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{b.runs}</TableCell>
                          <TableCell className="text-right text-muted-foreground tabular-nums">{b.balls}</TableCell>
                          <TableCell className="text-right text-muted-foreground tabular-nums">{b.fours}</TableCell>
                          <TableCell className="text-right text-muted-foreground tabular-nums">{b.sixes}</TableCell>
                          <TableCell className="text-right text-muted-foreground tabular-nums">{b.strikeRate.toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground px-6 pt-2 pb-1 uppercase tracking-wide">Bowling</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bowler</TableHead>
                        <TableHead className="text-right w-10">O</TableHead>
                        <TableHead className="text-right w-10">M</TableHead>
                        <TableHead className="text-right w-10">R</TableHead>
                        <TableHead className="text-right w-10">W</TableHead>
                        <TableHead className="text-right w-16">Eco</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inn.bowling.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{playerName(b.bowlerId)}</TableCell>
                          <TableCell className="text-right tabular-nums">{b.overs}</TableCell>
                          <TableCell className="text-right text-muted-foreground tabular-nums">{b.maidens}</TableCell>
                          <TableCell className="text-right text-muted-foreground tabular-nums">{b.runsConceded}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{b.wickets}</TableCell>
                          <TableCell className="text-right text-muted-foreground tabular-nums">{b.economy.toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {ballFlash && (
        <div
          key={ballFlash.key}
          ref={flashDivRef}
          className="fixed flex flex-col items-center gap-1 animate-in fade-in zoom-in-75 duration-150 pointer-events-none z-50 -translate-y-1/2"
        >
          <span className={`flex items-center justify-center w-16 h-16 rounded-full text-3xl font-black shadow-lg ${ballFlash.bg} ${ballFlash.text}`}>
            {ballFlash.label}
          </span>
          <span className="text-xs font-medium text-muted-foreground">{ballFlash.description}</span>
        </div>
      )}

      {milestone && (
        <div
          key={milestone.key}
          className="fixed inset-x-0 top-1/3 flex justify-center pointer-events-none z-50"
        >
          <div className="animate-in fade-in zoom-in-75 duration-300 flex flex-col items-center gap-1 text-center bg-card border border-border rounded-2xl px-10 py-6 shadow-2xl">
            <span className={`text-5xl font-black tracking-tight ${milestone.colorClass}`}>
              {milestone.label}
            </span>
            <span className="text-lg font-semibold mt-1">{milestone.name}</span>
            <span className="text-xs text-muted-foreground">{milestone.subLabel}</span>
          </div>
        </div>
      )}
    </div>
  )
}

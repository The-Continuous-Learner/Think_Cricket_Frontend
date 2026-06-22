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
  getMatchDetails,
  getMatchLiveState,
  getToss,
  getTeamPlayers,
  getSquad,
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
  completeMatchResult,
  endMatch,
  deleteMatch,
  declareSquad,
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
    if (!match || !liveState?.activeInnings) return []
    const bowlingTeamId = liveState.activeInnings.bowlingTeamId
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

        const [squadAResult, squadBResult] = await Promise.allSettled([
          getSquad(token, matchId, m.teamAId),
          getSquad(token, matchId, m.teamBId),
        ])
        const squadADeclared = squadAResult.status === "fulfilled" && squadAResult.value.players.length > 0
        const squadBDeclared = squadBResult.status === "fulfilled" && squadBResult.value.players.length > 0

        if (squadADeclared) {
          setTeamADeclared(true)
          setTeamASquad(squadAResult.value.players.map((p) => ({
            playerId: p.playerId,
            role: p.role as SquadRole,
            captain: p.captain,
            viceCaptain: p.viceCaptain,
          })))
        }
        if (squadBDeclared) {
          setTeamBDeclared(true)
          setTeamBSquad(squadBResult.value.players.map((p) => ({
            playerId: p.playerId,
            role: p.role as SquadRole,
            captain: p.captain,
            viceCaptain: p.viceCaptain,
          })))
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

        const { activeInnings, activeOver, lastBatsmanId, lastNonStrikerId } = live

        if (!activeInnings) {
          if (m.format !== "Test") {
            const inningsList = await getInningsList(token, matchId)
            if (inningsList.length >= 2) { setPhase("complete_result"); return }
          }
          setPhase("start_innings")
          return
        }

        setCurrentInningsId(activeInnings.inningsId)
        if (lastBatsmanId && batsmanId === null) setBatsmanId(lastBatsmanId)
        if (lastNonStrikerId && nonStrikerId === null) setNonStrikerId(lastNonStrikerId)

        if (!activeOver) { setPhase("start_over"); return }

        setCurrentOverId(activeOver.overId)
        setPhase("recording")
      } finally {
        if (forceRefetch) isComputingPhaseRef.current = false
      }
    },
    [match, liveState, token, matchId, batsmanId, nonStrikerId, refetchMatch, refetchLive],
  )

  useEffect(() => {
    if (match && liveState && !inSquadPhaseRef.current && !isComputingPhaseRef.current) {
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
    mutationFn: () => {
      if (!tossData || !match) throw new Error("No toss data")
      const inningsCount = liveState?.activeInnings?.inningsNumber ?? 0

      let battingTeamId: string
      let bowlingTeamId: string

      if (inningsCount === 0) {
        battingTeamId =
          tossData.decision === "BAT_FIRST" ? tossData.winnerTeamId : tossData.loserTeamId
        bowlingTeamId = battingTeamId === match.teamAId ? match.teamBId : match.teamAId
      } else {
        battingTeamId =
          tossData.decision === "BAT_FIRST" ? tossData.loserTeamId : tossData.winnerTeamId
        bowlingTeamId = battingTeamId === match.teamAId ? match.teamBId : match.teamAId
      }

      return startInnings({ sessionToken: token, matchId, battingTeamId, bowlingTeamId })
    },
    onSuccess: (res) => {
      setCurrentInningsId(res.inningsId)
      setBatsmanId(null)
      setNonStrikerId(null)
      computePhase(true)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to start innings"),
  })

  const startOverMutation = useMutation({
    mutationFn: () => {
      if (!currentInningsId) throw new Error("No innings")
      const isFirstOver = !liveState?.lastBatsmanId
      if (isFirstOver) {
        setBatsmanId(openerA)
        setNonStrikerId(openerB)
      }
      return startOver({ sessionToken: token, inningsId: currentInningsId, bowlerId })
    },
    onSuccess: (res) => {
      setCurrentOverId(res.overId)
      if (!liveState?.lastBatsmanId) {
        setBatsmanId(openerA)
        setNonStrikerId(openerB)
      }
      setPhase("recording")
      resetBallState()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to start over"),
  })

  const recordBallMutation = useMutation({
    mutationFn: () => {
      if (!currentOverId || !batsmanId || !nonStrikerId) throw new Error("Missing context")
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
      refetchLive()
      refetchScorecard()
      if (res.wicket) {
        setPhase("recording")
        setPlayerOutId(batsmanId ?? "")
      } else {
        autoSwapBatsmen(res)
        if (res.inningsCompleted) {
          setPhase("innings_complete")
          resetBallState()
        } else if (res.overCompleted) {
          setPhase("over_complete")
          swapBatsmenForNewOver()
          resetBallState()
        } else {
          resetBallState()
        }
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to record ball"),
  })

  const recordWicketMutation = useMutation({
    mutationFn: () => {
      if (!lastBallRes) throw new Error("No ball recorded")
      return recordWicket({
        sessionToken: token,
        ballId: lastBallRes.ballId,
        playerOutId,
        type: wicketType,
        bowlerId: ["RUN_OUT", "OBSTRUCTING_FIELD", "RETIRED_HURT", "TIMED_OUT"].includes(
          wicketType,
        )
          ? null
          : liveState?.activeOver?.bowlerId ?? null,
        fielderId: fielderId || null,
      })
    },
    onSuccess: () => {
      if (playerOutId === batsmanId) {
        setBatsmanId(newBatsmanId || null)
      } else {
        setNonStrikerId(newBatsmanId || null)
      }
      setNewBatsmanId("")
      setFielderId("")
      resetBallState()
      if (lastBallRes?.inningsCompleted) {
        setPhase("innings_complete")
      } else if (lastBallRes?.overCompleted) {
        setPhase("over_complete")
        swapBatsmenForNewOver()
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to record wicket"),
  })

  const endOverMutation = useMutation({
    mutationFn: () => {
      if (!currentOverId) throw new Error("No active over")
      return endOver({ sessionToken: token, overId: currentOverId })
    },
    onSuccess: () => {
      setCurrentOverId(null)
      setPhase("over_complete")
      swapBatsmenForNewOver()
      resetBallState()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to end over"),
  })

  const endInningsMutation = useMutation({
    mutationFn: () => {
      if (!currentInningsId) throw new Error("No innings")
      return endInnings({ sessionToken: token, inningsId: currentInningsId })
    },
    onSuccess: () => {
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

  function autoSwapBatsmen(res: RecordBallResponse) {
    const totalRuns = res.runs + res.extraRuns
    const legalSwap = res.legalDelivery && totalRuns % 2 === 1
    if (legalSwap) {
      const prev = batsmanId
      setBatsmanId(nonStrikerId)
      setNonStrikerId(prev)
    }
  }

  function swapBatsmenForNewOver() {
    const prev = batsmanId
    setBatsmanId(nonStrikerId)
    setNonStrikerId(prev)
  }

  const activeInnings = liveState?.activeInnings
  const activeOver = liveState?.activeOver
  const battingPlayers = determineBattingTeamPlayers()
  const bowlingPlayers = determineBowlingTeamPlayers()
  const isFirstOver = !liveState?.lastBatsmanId

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
              {tossMutation.isPending ? "Recording…" : flipSettled ? "Complete Toss" : "Conduct Toss"}
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "start_innings" && (() => {
        const completedInnings = scorecard?.innings.length ?? 0
        const isTest = match.format === "Test"
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
              {allInningsPlayed && (
                <p className="text-sm text-muted-foreground">Both innings have been completed. Complete the match to record the result.</p>
              )}
              <div className="flex gap-2">
                {!allInningsPlayed && (
                  <Button
                    onClick={() => startInningsMutation.mutate()}
                    disabled={startInningsMutation.isPending}
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

            <div className="flex gap-2">
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
                <Button
                  variant="destructive"
                  onClick={() => endInningsMutation.mutate()}
                  disabled={endInningsMutation.isPending}
                >
                  {endInningsMutation.isPending ? "Ending…" : "End Innings"}
                </Button>
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
                    {[batsmanId, nonStrikerId].filter(Boolean).map((id) => (
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
                          ? (battingPlayers.find((p) => p.playerId === newBatsmanId)?.name ?? newBatsmanId)
                          : <span className="text-muted-foreground">Select incoming batsman</span>}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {battingPlayers
                        .filter(
                          (p) =>
                            p.playerId !== batsmanId &&
                            p.playerId !== nonStrikerId,
                        )
                        .map((p) => (
                          <SelectItem key={p.playerId} value={p.playerId}>
                            {p.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() => recordWicketMutation.mutate()}
                  disabled={!playerOutId || recordWicketMutation.isPending}
                >
                  {recordWicketMutation.isPending ? "Recording…" : "Confirm Wicket"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Record Ball</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => endOverMutation.mutate()}
                    disabled={endOverMutation.isPending}
                  >
                    {endOverMutation.isPending ? "Ending…" : "End Over"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
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

                <div className="flex gap-3">
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
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {phase === "innings_complete" && (
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
            <div className="flex gap-2">
              <Button
                onClick={() => endInningsMutation.mutate()}
                disabled={endInningsMutation.isPending}
              >
                {endInningsMutation.isPending ? "Ending…" : "Start 2nd Innings"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => completeResultMutation.mutate()}
                disabled={completeResultMutation.isPending}
              >
                {completeResultMutation.isPending ? "Ending…" : "End Match"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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

      {match.status === "IN_PROGRESS" && (
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
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Batting</p>
                  <div className="w-full text-sm">
                    <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 text-xs text-muted-foreground pb-1 border-b border-border/40">
                      <span>Batter</span>
                      <span className="text-right">R</span>
                      <span className="text-right">B</span>
                      <span className="text-right">4s</span>
                      <span className="text-right">6s</span>
                      <span className="text-right">SR</span>
                    </div>
                    {inn.batting.sort((a, b) => a.battingPosition - b.battingPosition).map((b) => (
                      <div key={b.id} className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 py-1 border-b border-border/20 last:border-0">
                        <div>
                          <span className="font-medium">{playerName(b.playerId)}</span>
                          {b.out && b.dismissalType && (
                            <span className="ml-1.5 text-xs text-muted-foreground">{b.dismissalType}</span>
                          )}
                          {!b.out && <span className="ml-1.5 text-xs text-muted-foreground">not out</span>}
                        </div>
                        <span className="text-right font-medium">{b.runs}</span>
                        <span className="text-right text-muted-foreground">{b.balls}</span>
                        <span className="text-right text-muted-foreground">{b.fours}</span>
                        <span className="text-right text-muted-foreground">{b.sixes}</span>
                        <span className="text-right text-muted-foreground">{b.strikeRate.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Bowling</p>
                  <div className="w-full text-sm">
                    <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 text-xs text-muted-foreground pb-1 border-b border-border/40">
                      <span>Bowler</span>
                      <span className="text-right">O</span>
                      <span className="text-right">M</span>
                      <span className="text-right">R</span>
                      <span className="text-right">W</span>
                      <span className="text-right">Eco</span>
                    </div>
                    {inn.bowling.map((b) => (
                      <div key={b.id} className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 py-1 border-b border-border/20 last:border-0">
                        <span className="font-medium">{playerName(b.bowlerId)}</span>
                        <span className="text-right">{b.overs}</span>
                        <span className="text-right text-muted-foreground">{b.maidens}</span>
                        <span className="text-right text-muted-foreground">{b.runsConceded}</span>
                        <span className="text-right font-medium">{b.wickets}</span>
                        <span className="text-right text-muted-foreground">{b.economy.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

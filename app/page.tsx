"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Trophy,
  Target,
  Users,
  ClipboardList,
  TrendingUp,
  Shield,
  ChevronRight,
  Star,
  Zap,
  BarChart3,
  RefreshCw,
  UserCheck,
} from "lucide-react"

// ---------- Intersection Observer hook ----------
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold: 0.15 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

// ---------- Animated cricket ball SVG ----------
function CricketBall({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden>
      <defs>
        <radialGradient id="ballGrad" cx="38%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </radialGradient>
      </defs>
      <circle cx="40" cy="40" r="38" fill="url(#ballGrad)" />
      <path d="M40 4 Q55 20 55 40 Q55 60 40 76" fill="none" stroke="#fca5a5" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 4 Q25 20 25 40 Q25 60 40 76" fill="none" stroke="#fca5a5" strokeWidth="2.5" strokeLinecap="round" />
      {[14, 22, 30, 38, 46, 54, 62].map((y) => (
        <line key={y} x1="35" y1={y} x2="32" y2={y + 3} stroke="#fca5a5" strokeWidth="1.2" strokeLinecap="round" />
      ))}
      {[14, 22, 30, 38, 46, 54, 62].map((y) => (
        <line key={`r${y}`} x1="45" y1={y} x2="48" y2={y + 3} stroke="#fca5a5" strokeWidth="1.2" strokeLinecap="round" />
      ))}
      <ellipse cx="30" cy="28" rx="7" ry="4" fill="white" opacity="0.15" transform="rotate(-20 30 28)" />
    </svg>
  )
}

// ---------- Cricket bat SVG ----------
function CricketBat({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 120" className={className} aria-hidden>
      <rect x="13" y="5" width="14" height="70" rx="5" fill="#d97706" />
      <rect x="15" y="5" width="10" height="70" rx="4" fill="#f59e0b" />
      <rect x="17" y="75" width="6" height="35" rx="3" fill="#92400e" />
      <ellipse cx="20" cy="15" rx="5" ry="3" fill="#fbbf24" opacity="0.5" />
    </svg>
  )
}

// ---------- Data ----------
const historyItems = [
  { year: "1598", title: "First Recorded Match", desc: "The earliest reference to cricket appears in a court case in Guildford, England — schoolboys playing the game on common land." },
  { year: "1744", title: "Laws of Cricket", desc: "The first written Laws of Cricket are drawn up by the London Cricket Club, standardising the game across England." },
  { year: "1877", title: "First Test Match", desc: "Australia defeats England by 45 runs in Melbourne — the inaugural Test match in cricket history begins a 150-year rivalry." },
  { year: "1975", title: "First Cricket World Cup", desc: "The inaugural ICC Cricket World Cup is held in England. West Indies, led by Clive Lloyd, lifts the trophy at Lord's." },
  { year: "2003", title: "Twenty20 Is Born", desc: "T20 cricket debuts in England's domestic competition, revolutionising the sport with its fast-paced, explosive format." },
  { year: "Today", title: "The Digital Age", desc: "Live scoring, analytics, and mobile apps have transformed how fans and scorers experience every ball of the game." },
]

const featureItems = [
  { icon: Trophy, title: "Host Matches", desc: "Create matches for any format — T20, ODI, or Test — with full team selection and toss management." },
  { icon: Target, title: "Ball-by-Ball Scoring", desc: "Record every delivery: runs, extras, boundaries, and wickets with a streamlined live interface." },
  { icon: Users, title: "Squad Management", desc: "Declare Playing XIs, assign captains, and manage mid-match substitutions seamlessly." },
  { icon: BarChart3, title: "Live Scorecards", desc: "Batting averages, bowling figures, fall of wickets, and economy rates updated in real time." },
  { icon: RefreshCw, title: "Undo Ball", desc: "Made an error? Undo the last ball at any point — even across over or innings boundaries." },
  { icon: UserCheck, title: "Wicket Workflows", desc: "Guided dismissal entry with fielder selection, new batsman assignment, and automatic over management." },
]

const stepItems = [
  { n: "01", title: "Register & Login", desc: "Create your account and sign in to access the full scoring suite." },
  { n: "02", title: "Host a Match", desc: "Choose your teams, format, and overs. Schedule it or start it straight away." },
  { n: "03", title: "Declare Squads", desc: "Pick the Playing XI, substitutes, captain, and vice-captain for both sides." },
  { n: "04", title: "Conduct the Toss", desc: "Flip the coin, select the winner, and choose to bat or bowl first." },
  { n: "05", title: "Score Ball by Ball", desc: "Start each over, select your bowler, and record every delivery as it happens." },
  { n: "06", title: "View the Result", desc: "Complete the match to see the full scorecard, win margin, and player stats." },
]

const DELAY_80 = ["delay-0", "delay-75", "delay-150", "delay-200", "delay-300", "delay-300"] as const
const DELAY_60 = ["delay-0", "delay-75", "delay-100", "delay-150", "delay-200", "delay-300"] as const
const DELAY_70 = ["delay-0", "delay-75", "delay-150", "delay-200", "delay-300", "delay-300"] as const

// ---------- Reveal wrapper ----------
function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useReveal()
  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}>
      {children}
    </div>
  )
}

// ---------- Sub-components (hooks called at component level, not inside .map) ----------
function TimelineItem({ item, i }: { item: typeof historyItems[0]; i: number }) {
  const { ref, visible } = useReveal()
  const isRight = i % 2 === 0
  return (
    <div
      ref={ref}
      className={`relative flex items-start gap-6 md:gap-0 transition-all duration-700 ease-out ${DELAY_80[i]} ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
    >
      <div className="absolute left-6 md:left-1/2 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background md:-translate-x-1.5 mt-1.5 z-10" />
      <div className={`hidden md:flex w-full ${isRight ? "flex-row" : "flex-row-reverse"}`}>
        <div className="w-1/2 pr-12 pl-0 text-right flex flex-col items-end">
          {isRight && (
            <>
              <span className="text-emerald-500 font-bold text-xl">{item.year}</span>
              <h3 className="font-semibold text-lg mt-0.5">{item.title}</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-xs">{item.desc}</p>
            </>
          )}
        </div>
        <div className="w-1/2 pl-12 pr-0 flex flex-col items-start">
          {!isRight && (
            <>
              <span className="text-emerald-500 font-bold text-xl">{item.year}</span>
              <h3 className="font-semibold text-lg mt-0.5">{item.title}</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-xs">{item.desc}</p>
            </>
          )}
        </div>
      </div>
      <div className="md:hidden pl-12">
        <span className="text-emerald-500 font-bold text-lg">{item.year}</span>
        <h3 className="font-semibold mt-0.5">{item.title}</h3>
        <p className="text-muted-foreground text-sm mt-1">{item.desc}</p>
      </div>
    </div>
  )
}

function FeatureCard({ item, i }: { item: typeof featureItems[0]; i: number }) {
  const { ref, visible } = useReveal()
  const Icon = item.icon
  return (
    <div
      ref={ref}
      className={`bg-card border border-border rounded-2xl p-6 transition-all duration-700 ease-out hover:shadow-lg hover:-translate-y-0.5 ${DELAY_60[i]} ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
    >
      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
    </div>
  )
}

function StepCard({ item, i }: { item: typeof stepItems[0]; i: number }) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      className={`flex gap-5 p-5 rounded-2xl border border-border bg-card transition-all duration-700 ease-out ${DELAY_70[i]} ${visible ? "opacity-100 translate-x-0" : `opacity-0 ${i % 2 === 0 ? "-translate-x-6" : "translate-x-6"}`}`}
    >
      <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center shrink-0">
        {item.n}
      </div>
      <div>
        <h3 className="font-semibold mb-1">{item.title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
      </div>
    </div>
  )
}

// ---------- Main Page ----------
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Sticky Header ── */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-card/90 backdrop-blur border-b border-border shadow-sm" : "bg-transparent"}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
          <span className="font-bold text-xl tracking-tight text-primary flex-1">Think Cricket</span>
          <nav className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Register</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-green-900 to-emerald-900" />
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <div className="w-48 h-full bg-gradient-to-b from-yellow-200 to-yellow-100 rounded-full blur-2xl" />
        </div>
        <CricketBall className="absolute -top-10 -right-10 w-72 h-72 opacity-10 animate-spin [animation-duration:40s]" />
        <CricketBall className="absolute bottom-10 -left-16 w-56 h-56 opacity-[0.08] animate-spin [animation-duration:60s] [animation-direction:reverse]" />
        <CricketBat className="absolute right-12 bottom-24 w-14 opacity-20 rotate-12 hidden md:block" />
        <CricketBat className="absolute left-8 top-32 w-10 opacity-15 -rotate-12 hidden lg:block" />

        <div className="relative max-w-6xl mx-auto px-6 pt-28 pb-24 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center text-white">
            {/* Left: text + CTA */}
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                Professional Cricket Scoring
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-none mb-6">
                Think<br />
                <span className="text-emerald-400">Cricket.</span>
              </h1>
              <p className="text-lg md:text-xl text-white/75 leading-relaxed mb-10 max-w-lg">
                Ball-by-ball live scoring, squad management, and detailed scorecards — everything an umpire or scorer needs in one place.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/register">
                  <Button size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-white border-0 px-8 py-6 text-base font-semibold shadow-lg shadow-emerald-900/50">
                    Get Started for Free
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-base font-semibold bg-transparent">
                    Login
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: scorecard */}
            <div className="hidden lg:flex justify-center animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
              <div className="bg-card/90 backdrop-blur border border-border rounded-2xl p-5 w-72 shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Live Score</span>
                  <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-foreground">India</span>
                    <span className="font-bold text-2xl text-primary">287/4</span>
                  </div>
                  <div className="text-xs text-muted-foreground">(48.2 overs) — ODI</div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Virat K.</span><span className="font-medium text-foreground">91 (94)</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Rohit S.</span><span className="font-medium text-foreground">64 (72)</span>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Bumrah</span><span>8-1-38-2</span>
                  </div>
                  <div className="mt-3 flex gap-1.5">
                    {["1", "W", "4", "0", "2", "1"].map((b, bi) => (
                      <span key={bi} className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                        b === "W" ? "bg-red-500/20 text-red-500 border border-red-500/30" :
                        b === "4" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                        "bg-muted text-muted-foreground border border-border"
                      }`}>{b}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 inset-x-0">
          <svg viewBox="0 0 1440 60" className="w-full fill-background">
            <path d="M0,40 C360,0 1080,60 1440,20 L1440,60 L0,60 Z" />
          </svg>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="bg-card border-y border-border py-8">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { val: "150+", label: "Years of Test Cricket" },
            { val: "3", label: "Formats Supported" },
            { val: "∞", label: "Balls You Can Record" },
            { val: "100%", label: "Free to Use" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-bold text-primary">{s.val}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── History of Cricket ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <Section className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <Zap className="w-3.5 h-3.5" /> A Game Centuries in the Making
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">History of Cricket</h2>
            <p className="text-muted-foreground text-lg mt-4 max-w-xl mx-auto">
              From a schoolyard game in 16th-century England to a global sport followed by billions — cricket&apos;s journey is unmatched.
            </p>
          </Section>

          <div className="relative">
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-px" />
            <div className="space-y-12">
              {historyItems.map((item, i) => (
                <TimelineItem key={item.year} item={item} i={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <Section className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <Shield className="w-3.5 h-3.5" /> Built for Scorers
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Everything You Need</h2>
            <p className="text-muted-foreground text-lg mt-4 max-w-xl mx-auto">
              A complete scoring suite that keeps up with the pace of the game.
            </p>
          </Section>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureItems.map((item, i) => (
              <FeatureCard key={item.title} item={item} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How to Use ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <Section className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <ClipboardList className="w-3.5 h-3.5" /> Getting Started
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">How It Works</h2>
            <p className="text-muted-foreground text-lg mt-4 max-w-xl mx-auto">
              From the first ball to the final result — a live match in six steps.
            </p>
          </Section>
          <div className="grid md:grid-cols-2 gap-5">
            {stepItems.map((item, i) => (
              <StepCard key={item.n} item={item} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Formats strip ── */}
      <section className="py-16 px-6 bg-muted/30 border-y border-border">
        <Section className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-8">
            <span className="text-muted-foreground text-sm font-medium">Supported Formats</span>
            {["Test Cricket", "One Day International", "T20", "Club Cricket", "School Cricket", "Custom Overs"].map((f) => (
              <div key={f} className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium">{f}</span>
              </div>
            ))}
          </div>
        </Section>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="relative py-28 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-green-900 to-emerald-900" />
        <CricketBall className="absolute -bottom-16 -right-16 w-64 h-64 opacity-10" />
        <CricketBall className="absolute top-8 -left-12 w-48 h-48 opacity-[0.08]" />
        <Section className="relative max-w-2xl mx-auto text-center text-white">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Ready to score your first match?
          </h2>
          <p className="text-white/70 text-lg mb-10">
            Join Think Cricket and start recording live matches in minutes — completely free.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-white border-0 px-10 py-6 text-base font-semibold shadow-lg shadow-emerald-900/50">
                Get Started for Free
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-10 py-6 text-base font-semibold bg-transparent">
                Login
              </Button>
            </Link>
          </div>
        </Section>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-bold text-primary">Think Cricket</span>
          <p className="text-sm text-muted-foreground">Cricket scoring made simple and professional.</p>
          <div className="flex gap-4">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">Login</Link>
            <Link href="/register" className="text-sm text-muted-foreground hover:text-primary transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

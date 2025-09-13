"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"

import { Download, ArrowLeft, Info, ListTree, FileText, AlertTriangle, CheckCircle } from "lucide-react"
import { TooltipProvider } from "@/components/ui/tooltip"

// ---------- Tipos del modelo (adaptados a tu backend) ----------
type LetterCancellation = {
  pk: string
  totalTargets: number
  correct: number
  errors: number
  timeInSecs: number
  evaluationId: string
  score: {
    score: number
    cpPerMin: number
    accuracy: number
    omissions: number
    omissionsRate: number
    commissionRate: number
    hitsPerMin: number
    errorsPerMin: number
  }
  assistantAnalysis?: string
  created_at: string
}

type VisualMemory = {
  pk: string
  evaluation_id: string
  score: { Val: number } // 0..2 (humano)
  note: { Val: string }
  image_src?: string | null
  created_at: string
  updated_at: string
}

type VerbalMemory = {
  pk: string
  seconds_from_start: number
  given_words: string[]
  recalled_words: string[]
  type: "immediate" | "delayed" | string
  evaluation_id: string
  score: {
    score: number
    hits: number
    omissions: number
    intrusions: number
    perseverations: number
    accuracy: number
    intrusionRate: number
    perseverationRate: number
  }
  assistan_analysis?: string
  created_at: string
}

type ExecutiveFunctions = {
  pk: string
  numberOfItems: number
  totalClicks: number
  totalErrors: number
  totalCorrect: number
  totalTime: number // ns
  type: "a" | "a+b" | string
  score?: {
    score: number
    accuracy: number
    speedIndex: number
    commissionRate: number
    durationSec: number
  }
  evaluationId: string
  assistantAnalystId?: string
  createdAt: string
}

type LanguageFluency = {
  pk: string
  language: string
  proficiency: string
  category: string
  answer_words: string[] | null
  evaluation_id: string
  score: {
    score: number
    uniqueValid: number
    intrusions: number
    perseverations: number
    totalProduced: number
    wordsPerMinute: number
    intrusionRate: number
    persevRate: number
  }
  assistant_analysis?: string
  created_at: string
}

type VisualSpatial = {
  id?: string
  evalautionId?: string // (sic) tal cual en Go
  Score: { Val: number } // Shulman 0..5 ó 0..100 según tu flujo
  Note: { Val: string }
  createdAt?: string
  updatedAt?: string
}

type Evaluation = {
  pk: string
  patientName: string
  patientAge: number
  specialistMail: string
  specialistId: string
  assistantAnalysis: string
  storage_url: string
  storage_key: string
  createdAt: string
  currentStatus: string
  LetterCancellationSubTest?: LetterCancellation
  VisualMemorySubTest?: VisualMemory
  VerbalmemorySubTest?: VerbalMemory
  ExecutiveFunctionSubTest?: ExecutiveFunctions[] // << array
  LanguageFluencySubTest?: LanguageFluency
  VisualSpatialSubTest?: VisualSpatial
}

type ApiResponse = { evaluation: Evaluation; success?: string }

// ---------- Utils UI ----------
function statusVariant(s: string) {
  switch (s) {
    case "CREATED":
      return "bg-slate-100 text-slate-700"
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-800"
    case "COMPLETED":
    case "FINISHED":
      return "bg-emerald-100 text-emerald-800"
    default:
      return "bg-gray-100 text-gray-700"
  }
}
function fmtDate(iso?: string) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
const nsToSec = (ns?: number) => (ns ? +(ns / 1e9).toFixed(2) : 0)
const fmtPct = (v: number) => `${v.toFixed(0)}%`

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-base font-semibold overflow-hidden text-ellipsis">{value}</div>
    </div>
  )
}
function Grid({ children, cols = "md:grid-cols-4" }: { children: React.ReactNode; cols?: string }) {
  return <div className={`grid grid-cols-2 ${cols} gap-3`}>{children}</div>
}
function SectionCard({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        {right}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

// ---------- Normalizaciones visuales ----------
function vmNorm(score0to2?: number) {
  const s = clamp(score0to2 ?? 0, 0, 2)
  return Math.round((s / 2) * 100)
}
function cdtNorm(raw: number) {
  if (raw <= 5) {
    // Shulman 0..5
    return { scale: "Shulman 0–5", norm: Math.round((clamp(raw, 0, 5) / 5) * 100) }
  }
  return { scale: "0–100", norm: clamp(raw, 0, 100) }
}

function kpiToneFromPct(pct?: number) {
  if (pct == null) return "bg-muted text-foreground"
  if (pct >= 75) return "bg-emerald-100 text-emerald-800"
  if (pct >= 40) return "bg-amber-100 text-amber-800"
  return "bg-rose-100 text-rose-800"
}

function durationTone(sec?: number, hardMax?: number) {
  if (sec == null) return "bg-muted text-foreground"
  if (hardMax && sec > hardMax) return "bg-rose-100 text-rose-800"
  if (sec <= (hardMax ?? 9999) * 0.5) return "bg-emerald-100 text-emerald-800"
  return "bg-amber-100 text-amber-800"
}

export default function Page() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [data, setData] = useState<Evaluation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8401"
  const url = useMemo(() => new URL(`${base}/v1/evaluations/${id}`, base).toString(), [base, id])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const json: ApiResponse = await r.json()
        if (!cancelled) setData(json.evaluation)
      })
      .catch((e) => !cancelled && setError(e.message || "Error cargando evaluación"))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [url])

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Cargando evaluación…</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }
  if (error || !data) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent className="text-destructive">No se pudo cargar la evaluación: {error}</CardContent>
      </Card>
    )
  }

  const ev = data

  // Executive: separa A y A+B
  const exec = Array.isArray(ev.ExecutiveFunctionSubTest) ? ev.ExecutiveFunctionSubTest : []
  const tmtA = exec.find((e) => (e.type || "").toLowerCase() === "a")
  const tmtAB = exec.find(
    (e) => (e.type || "").toLowerCase() === "a+b" || (e.type || "").toLowerCase() === "a_plus_b" || (e.type || "").toLowerCase() === "ab"
  )

  const tmtADur = tmtA?.score?.durationSec ?? nsToSec(tmtA?.totalTime)
  const tmtBDur = tmtAB?.score?.durationSec ?? nsToSec(tmtAB?.totalTime)

  // Verb. memory helpers (para UX solicitada)
  const verbalHits = ev.VerbalmemorySubTest?.score?.hits
  const verbalErrors = (ev.VerbalmemorySubTest?.score?.intrusions ?? 0) + (ev.VerbalmemorySubTest?.score?.perseverations ?? 0)
  const verbalTimeSec = (ev.VerbalmemorySubTest as any)?.durationSec ?? (ev.VerbalmemorySubTest as any)?.score?.durationSec

  // Visual memory normalized (solo para semáforo de UX; detalle se muestra 0–2 únicamente)
  const vmRaw02 = ev.VisualMemorySubTest?.score?.Val
  const vmPct = vmRaw02 != null ? vmNorm(vmRaw02) : undefined

  // Quick KPI Card
  function Kpi({ title, value, tone = "bg-muted text-foreground", href }: { title: string; value: React.ReactNode; tone?: string; href?: string }) {
    const inner = (
      <div className={`rounded-xl px-3 py-2 text-sm ${tone}`}>
        <div className="text-[10px] uppercase tracking-wide opacity-80">{title}</div>
        <div className="font-semibold">{value}</div>
      </div>
    )
    return href ? (
      <a href={href} className="block hover:opacity-90 transition-opacity">{inner}</a>
    ) : (
      inner
    )
  }
console.log("evaluation: ",ev)
  return (
    <TooltipProvider delayDuration={150}>
      {/* ===== Sticky header ===== */}
      <div className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => router.push("/history")} className="px-2">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Volver
                </Button>
                <Separator orientation="vertical" className="h-5" />
                <span className="truncate text-sm text-muted-foreground">ID</span>
                <span className="truncate font-mono text-xs">{ev.pk}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Badge className={statusVariant(ev.currentStatus)}>{ev.currentStatus}</Badge>
                <span className="text-xs text-muted-foreground">· Creada: {fmtDate(ev.createdAt)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {ev.storage_url && (
                <a href={ev.storage_url} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline" className="gap-2">
                    <Download className="h-4 w-4" /> Abrir PDF
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Main ===== */}
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {/* RESUMEN */}
        <SectionCard
          title="Resumen de la evaluación"
          right={
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-4 w-4" /> Paciente: <strong className="ml-1">{ev.patientName}</strong>
            </div>
          }
        >
          <Grid cols="md:grid-cols-4">
            <Metric label="Paciente" value={ev.patientName || "—"} />
            <Metric label="Edad" value={ev.patientAge ?? "—"} />
            <Metric label="Especialista (mail)" value={<span className="truncate inline-block max-w-[200px]">{ev.specialistMail}</span>} />
            <Metric label="Specialist ID" value={<span className="font-mono break-all">{ev.specialistId}</span>} />
          </Grid>
        </SectionCard>

        {/* FOTO RÁPIDA (UX): KPIs por subtest */}
        <SectionCard title="Foto rápida — por subtest" right={null}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {/* Atención */}
            {ev.LetterCancellationSubTest ? (
              <Kpi
                title="Atención"
                value={
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>Score {ev.LetterCancellationSubTest.score.score}</span>
                    <span className={`ml-auto text-xs rounded px-1 ${kpiToneFromPct(ev.LetterCancellationSubTest.score.accuracy * 100)}`}>
                      {fmtPct(ev.LetterCancellationSubTest.score.accuracy * 100)}
                    </span>
                  </div>
                }
                href="#sec-letter"
              />
            ) : (
              <Kpi title="Atención" value="—" />
            )}

            {/* Memoria visual (usar solo 0–2) */}
            {ev.VisualMemorySubTest ? (
              <Kpi
                title="Memoria visual"
                value={
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{ev.VisualMemorySubTest.score?.Val}</span>
                    <span className={`ml-auto text-xs rounded px-1 ${kpiToneFromPct(vmPct)}`}>{vmPct != null ? `${vmPct}%` : ""}</span>
                  </div>
                }
                href="#sec-visual"
              />
            ) : (
              <Kpi title="Memoria visual" value="—" />
            )}

            {/* Memoria verbal (aciertos, errores, tiempo) */}
            {ev.VerbalmemorySubTest ? (
              <Kpi
                title="Memoria verbal"
                value={
                  <div className="flex items-center gap-2">
                    <span>Aciertos {verbalHits ?? "—"}</span>
                    <span className="text-rose-700">Errores {verbalErrors}</span>
                    <span className="ml-auto text-xs">{verbalTimeSec != null ? `${verbalTimeSec}s` : "s/d"}</span>
                  </div>
                }
                href="#sec-verbal"
              />
            ) : (
              <Kpi title="Memoria verbal" value="—" />
            )}

            {/* TMT */}
            {tmtA || tmtAB ? (
              <Kpi
                title="Funciones ejecutivas"
                value={
                  <div className="flex flex-col gap-1">
                    {tmtA ? (
                      <div className={`flex items-center gap-2 ${durationTone(tmtADur, 150)} rounded px-1`}>
                        <span className="text-xs">A</span>
                        <span className="ml-auto text-xs">{tmtADur}s</span>
                      </div>
                    ) : (
                      <div className="text-xs opacity-70">A: s/d</div>
                    )}
                    {tmtAB ? (
                      <div className={`flex items-center gap-2 ${durationTone(tmtBDur, 300)} rounded px-1`}>
                        <span className="text-xs">A+B</span>
                        <span className="ml-auto text-xs">{tmtBDur}s</span>
                      </div>
                    ) : (
                      <div className="text-xs opacity-70">A+B: s/d</div>
                    )}
                  </div>
                }
                href="#sec-exec"
              />
            ) : (
              <Kpi title="Funciones ejecutivas" value="—" />
            )}

            {/* CDT */}
            {ev.VisualSpatialSubTest ? (
              <Kpi title="Clock Drawing (0-5)" value={<span>Nota {ev.VisualSpatialSubTest.Score?.Val ?? "—"}</span>} href="#sec-cdt" />
            ) : (
              <Kpi title="Clock Drawing (0-5)" value="—" />
            )}
          </div>
        </SectionCard>

        {/* TABS */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Contenido</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="subtests" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="summary">
                  <ListTree className="h-4 w-4 mr-2" /> Resumen
                </TabsTrigger>
                <TabsTrigger value="subtests">
                  <FileText className="h-4 w-4 mr-2" /> Subtests
                </TabsTrigger>
                <TabsTrigger value="analysis">
                  <Info className="h-4 w-4 mr-2" /> Análisis
                </TabsTrigger>
              </TabsList>

              {/* TAB: RESUMEN */}
              <TabsContent value="summary" className="mt-4">
                <div className="text-sm text-muted-foreground">Vista rápida de campos clave y estado de documento.</div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Metric label="Estado" value={ev.currentStatus} />
                  <Metric label="Documento" value={ev.storage_url ? "Disponible" : "Sin documento"} />
                  <Metric label="Creada" value={fmtDate(ev.createdAt)} />
                  <Metric label="Evaluación" value={<span className="font-mono break-all">{ev.pk}</span>} />
                </div>
              </TabsContent>

              {/* TAB: SUBTESTS */}
              <TabsContent value="subtests" className="mt-4">
                {/* navegación rápida */}
                <div className="flex flex-wrap gap-2 mb-3 text-xs">
                  {ev.LetterCancellationSubTest && (
                    <a href="#sec-letter" className="underline underline-offset-4">
                      Letters Cancellation
                    </a>
                  )}
                  {ev.VisualMemorySubTest && (
                    <a href="#sec-visual" className="underline underline-offset-4">
                      Memoria visual
                    </a>
                  )}
                  {ev.VerbalmemorySubTest && (
                    <a href="#sec-verbal" className="underline underline-offset-4">
                      Memoria verbal
                    </a>
                  )}
                  {exec.length > 0 && (
                    <a href="#sec-exec" className="underline underline-offset-4">
                      Funciones ejecutivas (TMT)
                    </a>
                  )}
                  {ev.LanguageFluencySubTest && (
                    <a href="#sec-lang" className="underline underline-offset-4">
                      Fluencia verbal
                    </a>
                  )}
                  {ev.VisualSpatialSubTest && (
                    <a href="#sec-cdt" className="underline underline-offset-4">
                      Clock Drawing Test
                    </a>
                  )}
                </div>

                <Accordion type="multiple" className="w-full">
                  {/* LETTER CANCELLATION (dejar igual) */}
                  {ev.LetterCancellationSubTest && (
                    <AccordionItem value="letter-cancellation" id="sec-letter">
                      <AccordionTrigger className="text-left">Atención Sostenida — Letters Cancellation</AccordionTrigger>
                      <AccordionContent>
                        <Grid>
                          <Metric label="Score" value={ev.LetterCancellationSubTest.score.score} />
                          <Metric label="Aciertos" value={ev.LetterCancellationSubTest.correct} />
                          <Metric label="Errores" value={ev.LetterCancellationSubTest.errors} />
                          <Metric label="Tiempo (s)" value={ev.LetterCancellationSubTest.timeInSecs} />
                          <Metric label="Precisión" value={fmtPct(ev.LetterCancellationSubTest.score.accuracy * 100)} />
                          <Metric label="Omisiones" value={ev.LetterCancellationSubTest.score.omissions} />
                          <Metric label="Comisión" value={ev.LetterCancellationSubTest.score.commissionRate.toFixed(2)} />
                          <Metric label="Golpes/min" value={ev.LetterCancellationSubTest.score.hitsPerMin.toFixed(2)} />
                        </Grid>
                        <div className="mt-2 text-xs text-muted-foreground">Creado: {fmtDate(ev.LetterCancellationSubTest.created_at)}</div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* VISUAL MEMORY (AHORA: SOLO 0–2) */}
                  {ev.VisualMemorySubTest && (
                    <AccordionItem value="visual-memory" id="sec-visual">
                      <AccordionTrigger className="text-left">Memoria visual — BVMT-R</AccordionTrigger>
                      <AccordionContent>
                        <Grid cols="md:grid-cols-3">
                          <Metric label="Puntuación (0–2)" value={ev.VisualMemorySubTest.score?.Val ?? "—"} />
                          <Metric label="Comentario" value={ev.VisualMemorySubTest.note?.Val ?? "—"} />
                          {/* En cumplimiento de la solicitud: ocultamos nota, normalizado, fechas e imagen */}
                        </Grid>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* VERBAL MEMORY (SOLO: aciertos, errores, tiempo) */}
                  {ev.VerbalmemorySubTest && (
                    <AccordionItem value="verbal-memory" id="sec-verbal">
                      <AccordionTrigger className="text-left">Memoria verbal</AccordionTrigger>
                      <AccordionContent>
                        <Grid cols="md:grid-cols-4">
                          <Metric label="Aciertos" value={verbalHits ?? "—"} />
                          <Metric label="Errores (intr+persev)" value={verbalErrors} />
                          <Metric label="Tiempo (s)" value={ev.VerbalmemorySubTest.seconds_from_start || "—"} />
                          <Metric label="Tipo" value={ev.VerbalmemorySubTest.type} />
                        </Grid>
                        {/* Ocultamos listas de palabras, omisiones, intrusiones detalladas, exactitud, etc. */}
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* EXEC FUNCTIONS (dejar igual) */}
                  {exec.length > 0 && (
                    <AccordionItem value="executive-functions" id="sec-exec">
                      <AccordionTrigger className="text-left">Funciones ejecutivas — TMT</AccordionTrigger>
                      <AccordionContent>
                        {/* TMT-A */}
                        {tmtA && (
                          <>
                            <div className="font-medium mb-2 flex items-center gap-2">
                              <span>TMT-A</span>
                              {tmtADur != null && (
                                tmtADur > 150 ? (
                                  <span className="inline-flex items-center gap-1 text-rose-700 text-xs"><AlertTriangle className="h-3 w-3" /> &gt;150s</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 text-xs"><CheckCircle className="h-3 w-3" /> OK</span>
                                )
                              )}
                            </div>
                            <Grid cols="md:grid-cols-6">
                              <Metric label="Score" value={tmtA.score?.score ?? "—"} />
                              <Metric label="Ítems" value={tmtA.numberOfItems} />
                              <Metric label="Correctos" value={tmtA.totalCorrect} />
                              <Metric label="Errores" value={tmtA.totalErrors} />
                              <Metric label="Clicks" value={tmtA.totalClicks} />
                              <Metric label="Duración (s)" value={tmtADur} />
                              <Metric label="Precisión" value={tmtA.score ? fmtPct(tmtA.score.accuracy * 100) : "—"} />
                              <Metric label="Velocidad" value={tmtA.score?.speedIndex?.toFixed(2) ?? "—"} />
                              <Metric label="Comisión" value={tmtA.score?.commissionRate?.toFixed(2) ?? "—"} />
                              <Metric label="Creado" value={fmtDate(tmtA.createdAt)} />
                              <Metric label="Tipo" value={tmtA.type} />
                            </Grid>
                            <Separator className="my-3" />
                          </>
                        )}

                        {/* TMT-A+B */}
                        {tmtAB && (
                          <>
                            <div className="font-medium mb-2 flex items-center gap-2">
                              <span>TMT-A+B</span>
                              {tmtBDur != null && (
                                tmtBDur > 300 ? (
                                  <span className="inline-flex items-center gap-1 text-rose-700 text-xs"><AlertTriangle className="h-3 w-3" /> &gt;300s</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 text-xs"><CheckCircle className="h-3 w-3" /> OK</span>
                                )
                              )}
                            </div>
                            <Grid cols="md:grid-cols-6">
                              <Metric label="Score" value={tmtAB.score?.score ?? "—"} />
                              <Metric label="Ítems" value={tmtAB.numberOfItems} />
                              <Metric label="Correctos" value={tmtAB.totalCorrect} />
                              <Metric label="Errores" value={tmtAB.totalErrors} />
                              <Metric label="Clicks" value={tmtAB.totalClicks} />
                              <Metric label="Duración (s)" value={tmtBDur} />
                              <Metric label="Precisión" value={tmtAB.score ? fmtPct(tmtAB.score.accuracy * 100) : "—"} />
                              <Metric label="Velocidad" value={tmtAB.score?.speedIndex?.toFixed(2) ?? "—"} />
                              <Metric label="Comisión" value={tmtAB.score?.commissionRate?.toFixed(2) ?? "—"} />
                              <Metric label="Creado" value={fmtDate(tmtAB.createdAt)} />
                              <Metric label="Tipo" value={tmtAB.type} />
                            </Grid>
                          </>
                        )}

                        {!tmtA && !tmtAB && <div className="text-sm text-muted-foreground">No hay registros de TMT-A / TMT-A+B.</div>}
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* LANGUAGE FLUENCY (sin cambios) */}
                  {ev.LanguageFluencySubTest && (
                    <AccordionItem value="language-fluency" id="sec-lang">
                      <AccordionTrigger className="text-left">Fluencia verbal</AccordionTrigger>
                      <AccordionContent>
                        <Grid cols="md:grid-cols-6">
                          <Metric label="Score" value={ev.LanguageFluencySubTest.score.score} />
                          <Metric label="Únicas válidas" value={ev.LanguageFluencySubTest.score.uniqueValid} />
                          <Metric label="Producidas total" value={ev.LanguageFluencySubTest.score.totalProduced} />
                          <Metric label="WPM" value={ev.LanguageFluencySubTest.score.wordsPerMinute} />
                          <Metric label="Idioma" value={ev.LanguageFluencySubTest.language} />
                          <Metric label="Categoría" value={ev.LanguageFluencySubTest.category} />
                        </Grid>

                        {Array.isArray(ev.LanguageFluencySubTest.answer_words) && ev.LanguageFluencySubTest.answer_words.length > 0 && (
                          <div className="mt-3">
                            <div className="text-xs text-muted-foreground mb-1">Palabras</div>
                            <div className="rounded-md border p-3 text-sm">{ev.LanguageFluencySubTest.answer_words.join(", ")}</div>
                          </div>
                        )}
                        <div className="mt-2 text-xs text-muted-foreground">Creado: {fmtDate(ev.LanguageFluencySubTest.created_at)}</div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* VISUAL-SPATIAL / CDT (AHORA: SOLO NOTA) */}
                  {ev.VisualSpatialSubTest && (
                    <AccordionItem value="visual-spatial" id="sec-cdt">
                      <AccordionTrigger className="text-left">Clock Drawing Test (CDT)</AccordionTrigger>
                      <AccordionContent>
                        <Grid cols="md:grid-cols-3">
                          <Metric label="Nota" value={ev.VisualSpatialSubTest?.Score?.Val || "—"} />
                          <Metric label="Comentario" value={ev.VisualSpatialSubTest?.Note?.Val || "—"} />
                        </Grid>
                        {/* Se ocultan score bruto, escala, normalizado y fechas */}
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </TabsContent>

              {/* TAB: ANÁLISIS */}
              <TabsContent value="analysis" className="mt-4">
                {ev.assistantAnalysis ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{ev.assistantAnalysis}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Sin análisis del asistente.</div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}

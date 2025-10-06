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
  given_words: string[] | null
  recalled_words: string[] | null
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
  // Legacy (único) y nuevo (múltiples)
  VerbalmemorySubTest?: VerbalMemory | VerbalMemory[]  // <-- puede ser objeto o array
  ExecutiveFunctionSubTest?: ExecutiveFunctions[] // array
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

// ---------- Verbal Memory helpers ----------
type VMKind = "immediate" | "delayed" | "unknown"

function vmKindOf(v?: VerbalMemory | null): VMKind {
  const t = (v?.type || "").toLowerCase()
  if (/^imm|inmedi/.test(t)) return "immediate"
  if (/^del|diferid/.test(t)) return "delayed"
  return "unknown"
}

function isVM(o: any): o is VerbalMemory {
  return !!o && typeof o === "object" && "pk" in o
}

function flatDeep(input: any): any[] {
  if (!Array.isArray(input)) return [input]
  const out: any[] = []
  const stack: any[] = [...input]
  while (stack.length) {
    const el = stack.pop()
    if (Array.isArray(el)) stack.push(...el)
    else out.push(el)
  }
  return out
}

/**
 * Captura tu caso real:
 * - VerbalmemorySubTest puede ser ARRAY (lo que nos enseñas) o objeto.
 * - VerbalMemorySubTests (si algún día aparece) también se captura.
 * - Aplana todo y filtra objetos válidos.
 */
function getVMList(ev: Evaluation): VerbalMemory[] {
  const pools: any[] = []

  // Tu payload real
  if (ev.VerbalmemorySubTest != null) pools.push(ev.VerbalmemorySubTest)


  // Aplana y filtra
  const flat = flatDeep(pools)
  const onlyVM = flat.filter(isVM) as VerbalMemory[]

  // Si no traen type, inferimos por seconds_from_start
  if (onlyVM.length >= 2 && !onlyVM.some(v => vmKindOf(v) !== "unknown")) {
    onlyVM.sort((a, b) => (a.seconds_from_start ?? 9e12) - (b.seconds_from_start ?? 9e12))
  }
  return onlyVM
}

function pickVM(ev: Evaluation): { immediate?: VerbalMemory; delayed?: VerbalMemory; all: VerbalMemory[] } {
  const all = getVMList(ev)
  if (all.length === 0) return { immediate: undefined, delayed: undefined, all }

  let immediate = all.find(v => vmKindOf(v) === "immediate")
  let delayed   = all.find(v => vmKindOf(v) === "delayed")

  // Si vienen sin type (unknown), usamos el orden por seconds_from_start (ya ordenado en getVMList)
  if (!immediate && !delayed && all.length >= 2) {
    immediate = all[0]
    delayed   = all[1]
  }
  if (!immediate && !delayed && all.length === 1) {
    immediate = all[0]
  }
  return { immediate, delayed, all }
}

function pctTone(p?: number) {
  if (p == null) return "bg-muted text-foreground"
  if (p >= 80) return "bg-emerald-100 text-emerald-800"
  if (p >= 60) return "bg-amber-100 text-amber-800"
  return "bg-rose-100 text-rose-800"
}
function deltaChip(curr?: number, prev?: number) {
  if (curr == null || prev == null) return null
  const d = curr - prev
  const sign = d === 0 ? "" : d > 0 ? "↑" : "↓"
  const tone = d > 0 ? "text-emerald-700" : d < 0 ? "text-rose-700" : "text-slate-600"
  return <span className={`ml-2 text-xs ${tone}`}>{sign}{Math.abs(d).toFixed(0)}</span>
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
        if (!cancelled) {
          setData(json.evaluation)
          console.log(json.evaluation)
        }
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

  // Verb. memory split (nuevo)
const { immediate: vmI, delayed: vmD, all: vmAll } = pickVM(ev)

console.log("VM list (aplanado):", vmAll)
console.log("Immediate:", vmI)
console.log("Delayed:", vmD)

  const vmIAcc = vmI?.score?.accuracy != null ? Math.round(vmI.score.accuracy * 100) : undefined
  const vmDAcc = vmD?.score?.accuracy != null ? Math.round(vmD.score.accuracy * 100) : undefined
  const vmIHits = vmI?.score?.hits
  const vmDHits = vmD?.score?.hits
  const vmIErr = (vmI?.score?.intrusions ?? 0) + (vmI?.score?.perseverations ?? 0)
  const vmDErr = (vmD?.score?.intrusions ?? 0) + (vmD?.score?.perseverations ?? 0)

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
          </Grid>
        </SectionCard>

        {/* FOTO RÁPIDA (UX): KPIs por subtest */}
      
        {/* TABS */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Contenido</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="subtests" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
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
                  {(vmI || vmD) && (
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
                  {/* LETTER CANCELLATION */}
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

                  {/* VISUAL MEMORY (0–2 humano) */}
                  {ev.VisualMemorySubTest && (
                    <AccordionItem value="visual-memory" id="sec-visual">
                      <AccordionTrigger className="text-left">Memoria visual — BVMT-R</AccordionTrigger>
                      <AccordionContent>
                        <Grid cols="md:grid-cols-3">
                          <Metric label="Puntuación (0–2)" value={ev.VisualMemorySubTest.score?.Val ?? "0"} />
                          <Metric label="Comentario" value={ev.VisualMemorySubTest.note?.Val ?? "—"} />
                        </Grid>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* MEMORIA VERBAL — Inmediata vs Diferida */}
                  {(vmI || vmD) && (
                    <AccordionItem value="verbal-memory" id="sec-verbal">
                      <AccordionTrigger className="text-left">Memoria verbal — Inmediata vs Diferida</AccordionTrigger>
                      <AccordionContent>
                        {/* Leyenda */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <Badge variant="secondary">Sin feedback de aciertos</Badge>
                          <Badge variant="outline">No se muestran listas</Badge>
                          <Badge variant="outline">Se preservan intrusiones/perseveraciones</Badge>
                        </div>

                        {/* Comparativa lado-a-lado */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Inmediata */}
                          <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Badge className="bg-blue-100 text-blue-800">Inmediata</Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {vmI ? (
                                <Grid cols="md:grid-cols-4">
                                  <Metric label="Score (0–100)" value={vmI.score?.score ?? "—"} />
                                  <Metric label="Accuracy" value={vmIAcc != null ? `${vmIAcc}%` : "—"} />
                                  <Metric label="Aciertos (hits)" value={vmIHits ?? "—"} />
                                  <Metric label="Omisiones" value={vmI.score?.omissions ?? "—"} />
                                  <Metric label="Intrusiones" value={vmI.score?.intrusions ?? "—"} />
                                  <Metric label="IntrusionRate" value={vmI.score?.intrusionRate?.toFixed(2) ?? "—"} />
                                </Grid>
                              ) : (
                                <div className="text-sm text-muted-foreground">No hay registro inmediato.</div>
                              )}
                            </CardContent>
                          </Card>

                          {/* Diferida */}
                          <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Badge className="bg-violet-100 text-violet-800">Diferida</Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {vmD ? (
                                <Grid cols="md:grid-cols-4">
                                  <Metric label="Score (0–100)" value={vmD.score?.score ?? "—"} />
                                  <Metric
                                    label="Accuracy"
                                    value={
                                      <span>
                                        {vmDAcc != null ? `${vmDAcc}%` : "—"} {deltaChip(vmDAcc, vmIAcc)}
                                      </span>
                                    }
                                  />
                                  <Metric
                                    label="Aciertos (hits)"
                                    value={
                                      <span>
                                        {vmDHits ?? "—"} {vmDHits != null && vmIHits != null && deltaChip(vmDHits, vmIHits)}
                                      </span>
                                    }
                                  />
                                  <Metric label="Omisiones" value={vmD.score?.omissions ?? "—"} />
                                  <Metric
                                    label="Intrusiones"
                                    value={
                                      <span>
                                        {vmD?.score?.intrusions ?? "—"} {deltaChip(vmD?.score?.intrusions, vmI?.score?.intrusions)}
                                      </span>
                                    }
                                  />
                                 
                                  <Metric label="IntrusionRate" value={vmD.score?.intrusionRate?.toFixed(2) ?? "—"} />
                                </Grid>
                              ) : (
                                <div className="text-sm text-muted-foreground">No hay registro diferido.</div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* EXEC FUNCTIONS */}
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
                              <Metric label="Ítems" value={tmtAB.numberOfItems} />
                              <Metric label="Correctos" value={tmtAB.totalCorrect} />
                              <Metric label="Errores" value={tmtAB.totalErrors} />
                              <Metric label="Clicks" value={tmtAB.totalClicks} />
                              <Metric label="Duración (s)" value={tmtBDur} />
                              <Metric label="Precisión" value={tmtAB.score ? fmtPct(tmtAB.score.accuracy * 100) : "—"} />
                              <Metric label="Velocidad" value={tmtAB.score?.speedIndex?.toFixed(2) ?? "—"} />
                            </Grid>
                          </>
                        )}

                        {!tmtA && !tmtAB && <div className="text-sm text-muted-foreground">No hay registros de TMT-A / TMT-A+B.</div>}
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* LANGUAGE FLUENCY */}
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

                  {/* VISUAL-SPATIAL / CDT */}
                  {ev.VisualSpatialSubTest && (
                    <AccordionItem value="visual-spatial" id="sec-cdt">
                      <AccordionTrigger className="text-left">Clock Drawing Test (CDT)</AccordionTrigger>
                      <AccordionContent>
                        <Grid cols="md:grid-cols-3">
                          <Metric label="Nota" value={ev.VisualSpatialSubTest?.Score?.Val || "0"} />
                          <Metric label="Comentario" value={ev.VisualSpatialSubTest?.Note?.Val || "—"} />
                        </Grid>
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

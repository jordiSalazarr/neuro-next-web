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
import { TooltipProvider } from "@/components/ui/tooltip"

import { Download, ArrowLeft, Info, AlertTriangle, CheckCircle, ExternalLink } from "lucide-react"

// ================== Estilos corporativos reutilizables ==================
const styles = {
  backdrop: "bg-[#0E2F3C]", // azul hospital
  card: "bg-white/85 backdrop-blur border-slate-200 dark:border-slate-800",
  kpiGood: "bg-emerald-100 text-emerald-800",
  kpiWarn: "bg-amber-100 text-amber-800",
  kpiBad: "bg-rose-100 text-rose-800",
  primary: "bg-[#0E7C86] hover:bg-[#0a646c] text-white",
}

// ================== Tipos ==================
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
  VerbalmemorySubTest?: VerbalMemory | VerbalMemory[]
  ExecutiveFunctionSubTest?: ExecutiveFunctions[]
  LanguageFluencySubTest?: LanguageFluency
  VisualSpatialSubTest?: VisualSpatial
}

type ApiResponse = { evaluation: Evaluation }

// ================== Utils UI ==================
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
    return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso))
  } catch {
    return iso
  }
}
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
const nsToSec = (ns?: number) => (ns ? +(ns / 1e9).toFixed(1) : 0)
const pct = (v?: number) => (v == null ? "—" : `${Math.round(v * 100)}%`)

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
    <Card className={`${styles.card} border-0 shadow-sm`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        {right}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

// ================== VM helpers ==================
type VMKind = "immediate" | "delayed" | "unknown"
const vmKindOf = (v?: VerbalMemory | null): VMKind => {
  const t = (v?.type || "").toLowerCase()
  if (/^imm|inmedi/.test(t)) return "immediate"
  if (/^del|diferid/.test(t)) return "delayed"
  return "unknown"
}
const isVM = (o: any): o is VerbalMemory => !!o && typeof o === "object" && "pk" in o
const flatDeep = (input: any): any[] => (Array.isArray(input) ? input.flat(Infinity) : [input])
function getVMList(ev: Evaluation): VerbalMemory[] {
  const pools: any[] = []
  if (ev.VerbalmemorySubTest != null) pools.push(ev.VerbalmemorySubTest)
  return flatDeep(pools).filter(isVM)
}
function pickVM(ev: Evaluation) {
  const all = getVMList(ev)
  let immediate = all.find((v) => vmKindOf(v) === "immediate")
  let delayed = all.find((v) => vmKindOf(v) === "delayed")
  if (!immediate && !delayed && all.length >= 2) {
    // si no traen type, ordenamos por seconds_from_start
    all.sort((a, b) => (a.seconds_from_start ?? 9e12) - (b.seconds_from_start ?? 9e12))
    immediate = all[0]; delayed = all[1]
  }
  if (!immediate && all.length === 1) immediate = all[0]
  return { immediate, delayed, all }
}

// ================== Página ==================
export default function EvaluationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [ev, setEv] = useState<Evaluation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8401"
  const url = useMemo(() => new URL(`/v1/evaluations/${id}`, base).toString(), [base, id])

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    fetch(url, { signal: ac.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const json: ApiResponse = await r.json()
        setEv(json.evaluation)
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message || "Error cargando evaluación")
      })
      .finally(() => setLoading(false))
    return () => ac.abort()
  }, [url])

  // ======= Loading / Error =======
  if (loading) {
    return (
      <div className={`${styles.backdrop} min-h-screen py-8`}> 
        <div className="mx-auto max-w-6xl px-4">
          <Card className={`${styles.card} border-0 shadow-sm`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">Cargando evaluación…</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  if (error || !ev) {
    return (
      <div className={`${styles.backdrop} min-h-screen py-8`}>
        <div className="mx-auto max-w-4xl px-4">
          <Card className={`${styles.card} border-0 shadow-sm`}>
            <CardHeader>
              <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent className="text-destructive">No se pudo cargar la evaluación: {error}</CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Executive split
  const exec = Array.isArray(ev.ExecutiveFunctionSubTest) ? ev.ExecutiveFunctionSubTest : []
  const tmtA = exec.find((e) => (e.type || "").toLowerCase() === "a")
  const tmtAB = exec.find((e) => ["a+b", "a_plus_b", "ab"].includes((e.type || "").toLowerCase()))
  const tmtADur = tmtA?.score?.durationSec ?? nsToSec(tmtA?.totalTime)
  const tmtBDur = tmtAB?.score?.durationSec ?? nsToSec(tmtAB?.totalTime)

  // Verbal memory split
  const { immediate: vmI, delayed: vmD } = pickVM(ev)
  const vmIAcc = vmI?.score?.accuracy
  const vmDAcc = vmD?.score?.accuracy

  // Quick KPI tones
  const tone = (p?: number) => (p == null ? styles.kpiWarn : p >= 0.75 ? styles.kpiGood : p >= 0.4 ? styles.kpiWarn : styles.kpiBad)

  return (
    <TooltipProvider delayDuration={150}>
      <div className={`${styles.backdrop} min-h-screen`}>      
        {/* ===== Sticky header ===== */}
        <div className="sticky top-0 z-30 border-b border-white/10 bg-[#0E2F3C]/90 backdrop-blur supports-[backdrop-filter]:bg-[#0E2F3C]/70">
          <div className="mx-auto max-w-6xl px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => router.push("/history")} className="px-2 text-white/90 hover:bg-white/10">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Volver
                  </Button>
                  <Separator orientation="vertical" className="h-5 bg-white/20" />
                  <span className="text-xs text-white/70">Paciente</span>
                  <span className="text-white/90 font-medium">{ev.patientName}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge className={statusVariant(ev.currentStatus)}>{ev.currentStatus}</Badge>
                  <span className="text-xs text-white/70">· Creada: {fmtDate(ev.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {ev.storage_url && (
                  <a href={ev.storage_url} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline" className="bg-white/90 hover:bg-white text-slate-800 gap-2">
                      <Download className="h-4 w-4" /> PDF
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
            right={<span className="text-xs text-muted-foreground">ID clínico · <span className="font-mono">{ev.pk}</span></span>}
          >
            <Grid cols="md:grid-cols-4">
              <Metric label="Paciente" value={ev.patientName || "—"} />
              <Metric label="Edad" value={ev.patientAge ?? "—"} />
              <Metric label="Especialista" value={<span className="truncate inline-block max-w-[220px]">{ev.specialistMail}</span>} />
              <Metric label="Estado" value={<Badge className={statusVariant(ev.currentStatus)}>{ev.currentStatus}</Badge>} />
            </Grid>

            {/* KPIs rápidos */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {ev.LetterCancellationSubTest && (
                <div className={`rounded-xl px-3 py-2 text-sm ${tone(ev.LetterCancellationSubTest.score?.accuracy)}`}>
                  <div className="text-[10px] uppercase tracking-wide opacity-80">Atención (accuracy)</div>
                  <div className="font-semibold">{pct(ev.LetterCancellationSubTest.score?.accuracy)}</div>
                </div>
              )}
              {vmI && (
                <div className={`rounded-xl px-3 py-2 text-sm ${tone(vmIAcc)}`}>
                  <div className="text-[10px] uppercase tracking-wide opacity-80">Memoria verbal (inmediata)</div>
                  <div className="font-semibold">{pct(vmIAcc)}</div>
                </div>
              )}
              {vmD && (
                <div className={`rounded-xl px-3 py-2 text-sm ${tone(vmDAcc)}`}>
                  <div className="text-[10px] uppercase tracking-wide opacity-80">Memoria verbal (diferida)</div>
                  <div className="font-semibold">{pct(vmDAcc)}</div>
                </div>
              )}
              {tmtAB && (
                <div className={`rounded-xl px-3 py-2 text-sm ${tmtBDur ? (tmtBDur <= 300 ? styles.kpiGood : styles.kpiBad) : styles.kpiWarn}`}>
                  <div className="text-[10px] uppercase tracking-wide opacity-80">TMT A+B (segundos)</div>
                  <div className="font-semibold">{tmtBDur ?? "—"}</div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* CONTENIDO */}
          <Card className={`${styles.card} border-0 shadow-sm`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Contenido</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="subtests" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="subtests">Subtests</TabsTrigger>
                  <TabsTrigger value="analysis">Análisis</TabsTrigger>
                </TabsList>

                {/* SUBTESTS */}
                <TabsContent value="subtests" className="mt-4">
                  <Accordion type="multiple" className="w-full">
                    {/* LETTER CANCELLATION */}
                    {ev.LetterCancellationSubTest && (
                      <AccordionItem value="letter-cancellation" id="sec-letter">
                        <AccordionTrigger className="text-left">Atención sostenida — Letters Cancellation</AccordionTrigger>
                        <AccordionContent>
                          <Grid>
                            <Metric label="Score" value={ev.LetterCancellationSubTest.score.score} />
                            <Metric label="Aciertos" value={ev.LetterCancellationSubTest.correct} />
                            <Metric label="Errores" value={ev.LetterCancellationSubTest.errors} />
                            <Metric label="Tiempo (s)" value={ev.LetterCancellationSubTest.timeInSecs} />
                            <Metric label="Precisión" value={pct(ev.LetterCancellationSubTest.score.accuracy)} />
                            <Metric label="Omisiones" value={ev.LetterCancellationSubTest.score.omissions} />
                            <Metric label="Comisión (rate)" value={ev.LetterCancellationSubTest.score.commissionRate.toFixed(2)} />
                            <Metric label="Golpes/min" value={ev.LetterCancellationSubTest.score.hitsPerMin.toFixed(2)} />
                          </Grid>
                          <div className="mt-2 text-xs text-muted-foreground">Creado: {fmtDate(ev.LetterCancellationSubTest.created_at)}</div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* VISUAL MEMORY */}
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

                    {/* VERBAL MEMORY */}
                    {(vmI || vmD) && (
                      <AccordionItem value="verbal-memory" id="sec-verbal">
                        <AccordionTrigger className="text-left">Memoria verbal — Inmediata vs diferida</AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Inmediata */}
                            <Card className={`${styles.card} border-0 shadow-sm`}>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Inmediata</CardTitle>
                              </CardHeader>
                              <CardContent>
                                {vmI ? (
                                  <Grid cols="md:grid-cols-4">
                                    <Metric label="Score (0–100)" value={vmI.score?.score ?? "—"} />
                                    <Metric label="Accuracy" value={pct(vmI.score?.accuracy)} />
                                    <Metric label="Aciertos (hits)" value={vmI.score?.hits ?? "—"} />
                                    <Metric label="Omisiones" value={vmI.score?.omissions ?? "—"} />
                                    <Metric label="Intrusiones" value={vmI.score?.intrusions ?? "—"} />
                                    <Metric label="Perseveraciones" value={vmI.score?.perseverations ?? "—"} />
                                  </Grid>
                                ) : (
                                  <div className="text-sm text-muted-foreground">No hay registro inmediato.</div>
                                )}
                              </CardContent>
                            </Card>

                            {/* Diferida */}
                            <Card className={`${styles.card} border-0 shadow-sm`}>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Diferida</CardTitle>
                              </CardHeader>
                              <CardContent>
                                {vmD ? (
                                  <Grid cols="md:grid-cols-4">
                                    <Metric label="Score (0–100)" value={vmD.score?.score ?? "—"} />
                                    <Metric label="Accuracy" value={pct(vmD.score?.accuracy)} />
                                    <Metric label="Aciertos (hits)" value={vmD.score?.hits ?? "—"} />
                                    <Metric label="Omisiones" value={vmD.score?.omissions ?? "—"} />
                                    <Metric label="Intrusiones" value={vmD.score?.intrusions ?? "—"} />
                                    <Metric label="Perseveraciones" value={vmD.score?.perseverations ?? "—"} />
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

                    {/* EXECUTIVE FUNCTIONS */}
                    {exec.length > 0 && (
                      <AccordionItem value="executive-functions" id="sec-exec">
                        <AccordionTrigger className="text-left">Funciones ejecutivas — Trail Making Test</AccordionTrigger>
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
                                <Metric label="Precisión" value={tmtA.score ? pct(tmtA.score.accuracy) : "—"} />
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
                                <Metric label="Precisión" value={tmtAB.score ? pct(tmtAB.score.accuracy) : "—"} />
                                <Metric label="Velocidad (índice)" value={tmtAB.score?.speedIndex?.toFixed(2) ?? "—"} />
                              </Grid>
                            </>
                          )}

                          {!tmtA && !tmtAB && <div className="text-sm text-muted-foreground">No hay registros de TMT-A / TMT-A+B.</div>}
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* FLUENCIA VERBAL */}
                    {ev.LanguageFluencySubTest && (
                      <AccordionItem value="language-fluency" id="sec-lang">
                        <AccordionTrigger className="text-left">Fluencia verbal</AccordionTrigger>
                        <AccordionContent>
                          <Grid cols="md:grid-cols-6">
                            <Metric label="Score" value={ev.LanguageFluencySubTest.score.score} />
                            <Metric label="Únicas válidas" value={ev.LanguageFluencySubTest.score.uniqueValid} />
                            <Metric label="Total producidas" value={ev.LanguageFluencySubTest.score.totalProduced} />
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

                    {/* VISUOESPACIAL / CDT */}
                    {ev.VisualSpatialSubTest && (
                      <AccordionItem value="visual-spatial" id="sec-cdt">
                        <AccordionTrigger className="text-left">Clock Drawing Test (CDT)</AccordionTrigger>
                        <AccordionContent>
                          <Grid cols="md:grid-cols-3">
                            <Metric label="Puntuación" value={ev.VisualSpatialSubTest?.Score?.Val ?? "0"} />
                            <Metric label="Comentario" value={ev.VisualSpatialSubTest?.Note?.Val ?? "—"} />
                          </Grid>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                </TabsContent>

                {/* ANÁLISIS */}
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
      </div>
    </TooltipProvider>
  )
}

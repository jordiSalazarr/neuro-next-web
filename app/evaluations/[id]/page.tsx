"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import { Download, ArrowLeft, Info, ListTree, FileText } from "lucide-react"

// ---------- Tipos del modelo (sin cambios) ----------
type LetterCancellation = {
  pk: string; totalTargets: number; correct: number; errors: number; timeInSecs: number; evaluationId: string;
  score: { score: number; cpPerMin: number; accuracy: number; omissions: number; omissionsRate: number; commissionRate: number; hitsPerMin: number; errorsPerMin: number; };
  assistantAnalysis: string; created_at: string;
}
type VisualMemory = {
  pk: string; evaluation_id: string; figure_name: string; image_ref: string; content_type: string; width: number; height: number; image_sha256: string;
  captured_at: string; status: string;
  score: { iou: number; ssim: number; psnr: number; finalScore: number; };
  created_at: string;
}
type VerbalMemory = {
  pk: string; seconds_from_start: number; given_words: string[]; recalled_words: string[]; type: "immediate" | "delayed" | string; evaluation_id: string;
  score: { score: number; hits: number; omissions: number; intrusions: number; perseverations: number; accuracy: number; intrusionRate: number; perseverationRate: number; };
  assistan_analysis: string; created_at: string;
}
type ExecutiveFunctions = {
  pk: string; numberOfItems: number; totalClicks: number; totalErrors: number; totalCorrect: number; totalTime: number; type: string;
  score: { score: number; accuracy: number; speedIndex: number; commissionRate: number; durationSec: number; };
  evaluationId: string; assistantAnalystId: string; createdAt: string;
}
type LanguageFluency = {
  pk: string; language: string; proficiency: string; category: string; answer_words: string[] | null; evaluation_id: string;
  score: { score: number; uniqueValid: number; intrusions: number; perseverations: number; totalProduced: number; wordsPerMinute: number; intrusionRate: number; persevRate: number; };
  assistant_analysis: string; created_at: string;
}
type Evaluation = {
  pk: string; patientName: string; patientAge: number; specialistMail: string; specialistId: string; assistantAnalysis: string;
  storage_url: string; storage_key: string; createdAt: string; currentStatus: string;
  LetterCancellationSubTest?: LetterCancellation;
  VisualMemorySubTest?: VisualMemory;
  VerbalmemorySubTest?: VerbalMemory;
  ExecutiveFunctionSubTest?: ExecutiveFunctions;
  LanguageFluencySubTest?: LanguageFluency;
}
type ApiResponse = { evaluation: Evaluation; success?: string }

// ---------- Utils UI ----------
function statusVariant(s: string) {
  switch (s) {
    case "CREATED": return "bg-slate-100 text-slate-700"
    case "IN_PROGRESS": return "bg-amber-100 text-amber-800"
    case "COMPLETED":
    case "FINISHED": return "bg-emerald-100 text-emerald-800"
    default: return "bg-gray-100 text-gray-700"
  }
}
function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

// Métrica compacta (ahora acepta ReactNode)
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

export default function Page() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [data, setData] = useState<Evaluation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8401"
  const url = useMemo(() => new URL(`/v1/evaluations/${id}`, base).toString(), [base, id])

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
    return () => { cancelled = true }
  }, [url])

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle>Cargando evaluación…</CardTitle></CardHeader>
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
        <CardHeader><CardTitle>Error</CardTitle></CardHeader>
        <CardContent className="text-destructive">No se pudo cargar la evaluación: {error}</CardContent>
      </Card>
    )
  }

  const ev = data

  return (
    <TooltipProvider delayDuration={150}>
      {/* ===== Sticky header ===== */}
      <div className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => router.push("/evaluations")} className="px-2">
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

        {/* TABS */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Contenido</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="subtests" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="summary"><ListTree className="h-4 w-4 mr-2" /> Resumen</TabsTrigger>
                <TabsTrigger value="subtests"><FileText className="h-4 w-4 mr-2" /> Subtests</TabsTrigger>
                <TabsTrigger value="analysis"><Info className="h-4 w-4 mr-2" /> Análisis</TabsTrigger>
              </TabsList>

              {/* TAB: RESUMEN */}
              <TabsContent value="summary" className="mt-4">
                <div className="text-sm text-muted-foreground">
                  Vista rápida de campos clave y estado de documento.
                </div>
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
                  {ev.LetterCancellationSubTest && <a href="#sec-letter" className="underline underline-offset-4">Letters Cancellation</a>}
                  {ev.VisualMemorySubTest && <a href="#sec-visual" className="underline underline-offset-4">Memoria Visual</a>}
                  {ev.VerbalmemorySubTest && <a href="#sec-verbal" className="underline underline-offset-4">Memoria Verbal</a>}
                  {ev.ExecutiveFunctionSubTest && <a href="#sec-exec" className="underline underline-offset-4">Funciones Ejecutivas</a>}
                  {ev.LanguageFluencySubTest && <a href="#sec-lang" className="underline underline-offset-4">Fluencia Verbal</a>}
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
                          <Metric label="Precisión" value={`${(ev.LetterCancellationSubTest.score.accuracy * 100).toFixed(0)}%`} />
                          <Metric label="Omisiones" value={ev.LetterCancellationSubTest.score.omissions} />
                          <Metric label="Comisiones/min" value={ev.LetterCancellationSubTest.score.errorsPerMin} />
                          <Metric label="Golpes/min" value={ev.LetterCancellationSubTest.score.hitsPerMin} />
                        </Grid>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Creado: {fmtDate(ev.LetterCancellationSubTest.created_at)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* VISUAL MEMORY */}
                  {ev.VisualMemorySubTest && (
                    <AccordionItem value="visual-memory" id="sec-visual">
                      <AccordionTrigger className="text-left">Memoria Visual — BVMT-R</AccordionTrigger>
                      <AccordionContent>
                        <Grid cols="md:grid-cols-5">
                          <Metric label="Figura" value={ev.VisualMemorySubTest.figure_name} />
                          <Metric label="Estado" value={ev.VisualMemorySubTest.status} />
                          <Metric label="IoU" value={ev.VisualMemorySubTest.score.iou} />
                          <Metric label="SSIM" value={ev.VisualMemorySubTest.score.ssim} />
                          <Metric label="PSNR" value={ev.VisualMemorySubTest.score.psnr} />
                          <Metric label="Score final" value={ev.VisualMemorySubTest.score.finalScore} />
                          <Metric label="Ancho×Alto" value={`${ev.VisualMemorySubTest.width}×${ev.VisualMemorySubTest.height}`} />
                        </Grid>
                        <Separator className="my-3" />
                        <Grid cols="md:grid-cols-2">
                          <Metric label="Imagen ref" value={<span className="font-mono break-all">{ev.VisualMemorySubTest.image_ref}</span>} />
                          <Metric label="SHA-256" value={<span className="font-mono break-all">{ev.VisualMemorySubTest.image_sha256}</span>} />
                        </Grid>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Capturada: {fmtDate(ev.VisualMemorySubTest.captured_at)} · Creado: {fmtDate(ev.VisualMemorySubTest.created_at)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* VERBAL MEMORY */}
                  {ev.VerbalmemorySubTest && (
                    <AccordionItem value="verbal-memory" id="sec-verbal">
                      <AccordionTrigger className="text-left">Memoria Verbal</AccordionTrigger>
                      <AccordionContent>
                        <Grid>
                          <Metric label="Score" value={ev.VerbalmemorySubTest.score.score} />
                          <Metric label="Aciertos" value={ev.VerbalmemorySubTest.score.hits} />
                          <Metric label="Omisiones" value={ev.VerbalmemorySubTest.score.omissions} />
                          <Metric label="Intrusiones" value={ev.VerbalmemorySubTest.score.intrusions} />
                          <Metric label="Exactitud" value={`${(ev.VerbalmemorySubTest.score.accuracy * 100).toFixed(0)}%`} />
                          <Metric label="Tipo" value={ev.VerbalmemorySubTest.type} />
                          <Metric label="Seg desde inicio" value={ev.VerbalmemorySubTest.seconds_from_start} />
                        </Grid>
                        <Separator className="my-3" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Lista presentada</div>
                            <div className="rounded-md border p-3 text-sm">{ev.VerbalmemorySubTest.given_words.join(", ")}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Recordadas</div>
                            <div className="rounded-md border p-3 text-sm">{ev.VerbalmemorySubTest.recalled_words.join(", ")}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">Creado: {fmtDate(ev.VerbalmemorySubTest.created_at)}</div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* EXEC FUNCTIONS */}
                  {ev.ExecutiveFunctionSubTest && (
                    <AccordionItem value="executive-functions" id="sec-exec">
                      <AccordionTrigger className="text-left">Funciones Ejecutivas — TMT A/B</AccordionTrigger>
                      <AccordionContent>
                        <Grid cols="md:grid-cols-6">
                          <Metric label="Score" value={ev.ExecutiveFunctionSubTest.score.score} />
                          <Metric label="Índice velocidad" value={ev.ExecutiveFunctionSubTest.score.speedIndex} />
                          <Metric label="Precisión" value={`${(ev.ExecutiveFunctionSubTest.score.accuracy * 100).toFixed(0)}%`} />
                          <Metric label="Comisión" value={ev.ExecutiveFunctionSubTest.score.commissionRate} />
                          <Metric label="Ítems" value={ev.ExecutiveFunctionSubTest.numberOfItems} />
                          <Metric label="Clicks totales" value={ev.ExecutiveFunctionSubTest.totalClicks} />
                          <Metric label="Correctos" value={ev.ExecutiveFunctionSubTest.totalCorrect} />
                          <Metric label="Errores" value={ev.ExecutiveFunctionSubTest.totalErrors} />
                          <Metric label="Duración (s)" value={ev.ExecutiveFunctionSubTest.score.durationSec} />
                          <Metric label="Tipo" value={ev.ExecutiveFunctionSubTest.type} />
                        </Grid>
                        <div className="mt-2 text-xs text-muted-foreground">Creado: {fmtDate(ev.ExecutiveFunctionSubTest.createdAt)}</div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* LANGUAGE FLUENCY */}
                  {ev.LanguageFluencySubTest && (
                    <AccordionItem value="language-fluency" id="sec-lang">
                      <AccordionTrigger className="text-left">Fluencia Verbal</AccordionTrigger>
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

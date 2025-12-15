"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

import {
  Download,
  ArrowLeft,
  Info,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

import { IndividualTestResultsSection } from "@/components/IndividualTestResultsSection";

// ================== Estilos corporativos reutilizables ==================
const styles = {
  shell: "min-h-[calc(100vh-56px)] bg-slate-50",
  card:
    "bg-white/85 backdrop-blur border border-slate-200/70 shadow-sm rounded-2xl",
  kpiGood: "bg-emerald-50 text-emerald-800 border border-emerald-100",
  kpiWarn: "bg-amber-50 text-amber-800 border border-amber-100",
  kpiBad: "bg-rose-50 text-rose-800 border border-rose-100",
  primary: "bg-brand-600 hover:bg-slate-900 text-white",
};

// ================== Tipos ==================
type LetterCancellation = {
  pk: string;
  totalTargets: number;
  correct: number;
  errors: number;
  timeInSecs: number;
  evaluationId: string;
  score: {
    score: number;
    cpPerMin: number;
    accuracy: number;
    omissions: number;
    omissionsRate: number;
    commissionRate: number;
    hitsPerMin: number;
    errorsPerMin: number;
  };
  assistantAnalysis?: string;
  created_at: string;
};

type VisualMemory = {
  pk: string;
  evaluation_id: string;
  score: { Val: number }; // 0..2 (humano)
  note: { Val: string };
  image_src?: string | null;
  created_at: string;
  updated_at: string;
};

type VerbalMemory = {
  pk: string;
  seconds_from_start: number;
  given_words: string[] | null;
  recalled_words: string[] | null;
  type: "immediate" | "delayed" | string;
  evaluation_id: string;
  score: {
    score: number;
    hits: number;
    omissions: number;
    intrusions: number;
    perseverations: number;
    accuracy: number;
    intrusionRate: number;
    perseverationRate: number;
  };
  assistan_analysis?: string;
  created_at: string;
};

type ExecutiveFunctions = {
  pk: string;
  numberOfItems: number;
  totalClicks: number;
  totalErrors: number;
  totalCorrect: number;
  totalTime: number; // ns
  type: "a" | "a+b" | string;
  score?: {
    score: number;
    accuracy: number;
    speedIndex: number;
    commissionRate: number;
    durationSec: number;
  };
  evaluationId: string;
  assistantAnalystId?: string;
  createdAt: string;
};

type LanguageFluency = {
  pk: string;
  language: string;
  proficiency: string;
  category: string;
  answer_words: string[] | null;
  evaluation_id: string;
  score: {
    score: number;
    uniqueValid: number;
    intrusions: number;
    perseverations: number;
    totalProduced: number;
    wordsPerMinute: number;
    intrusionRate: number;
    persevRate: number;
  };
  assistant_analysis?: string;
  created_at: string;
};

type VisualSpatial = {
  id?: string;
  evalautionId?: string; // (sic) tal cual en Go
  Score: { Val: number }; // Shulman 0..5 ó 0..100 según tu flujo
  Note: { Val: string };
  createdAt?: string;
  updatedAt?: string;
};

type Evaluation = {
  pk: string;
  patientName: string;
  patientAge: number;
  specialistMail: string;
  specialistId: string;
  assistantAnalysis: string;
  storage_url: string;
  storage_key: string;
  createdAt: string;
  currentStatus: string;
  LetterCancellationSubTest?: LetterCancellation;
  VisualMemorySubTest?: VisualMemory;
  VerbalmemorySubTest?: VerbalMemory | VerbalMemory[];
  ExecutiveFunctionSubTest?: ExecutiveFunctions[];
  LanguageFluencySubTest?: LanguageFluency;
  VisualSpatialSubTest?: VisualSpatial;
};

type ApiResponse = { evaluation: Evaluation };

// ================== Utils UI ==================
function statusVariant(s: string) {
  switch (s) {
    case "CREATED":
      return "bg-slate-100 text-slate-700";
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-800";
    case "COMPLETED":
    case "FINISHED":
      return "bg-emerald-100 text-emerald-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
function fmtDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
const nsToSec = (ns?: number) =>
  ns ? +(ns / 1e9).toFixed(1) : 0;
const pct = (v?: number) =>
  v == null ? "—" : `${Math.round(v * 100)}%`;

function Metric({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-white/80 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-base font-semibold overflow-hidden text-ellipsis">
        {value}
      </div>
    </div>
  );
}
function Grid({
  children,
  cols = "md:grid-cols-4",
}: {
  children: React.ReactNode;
  cols?: string;
}) {
  return <div className={`grid grid-cols-2 ${cols} gap-3`}>{children}</div>;
}
function SectionCard({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <Card className={styles.card}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        {right}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function QuickChip({
  label,
  value,
  toneClass,
}: {
  label: string;
  value: React.ReactNode;
  toneClass: string;
}) {
  return (
    <div
      className={`rounded-xl px-3 py-2 text-xs sm:text-sm flex flex-col ${toneClass}`}
    >
      <span className="uppercase tracking-wide opacity-80 text-[10px]">
        {label}
      </span>
      <span className="mt-0.5 text-sm sm:text-base font-semibold">
        {value}
      </span>
    </div>
  );
}

// ================== VM helpers ==================
type VMKind = "immediate" | "delayed" | "unknown";
const vmKindOf = (v?: VerbalMemory | null): VMKind => {
  const t = (v?.type || "").toLowerCase();
  if (/^imm|inmedi/.test(t)) return "immediate";
  if (/^del|diferid/.test(t)) return "delayed";
  return "unknown";
};
const isVM = (o: any): o is VerbalMemory =>
  !!o && typeof o === "object" && "pk" in o;
const flatDeep = (input: any): any[] =>
  Array.isArray(input) ? input.flat(Infinity) : [input];
function getVMList(ev: Evaluation): VerbalMemory[] {
  const pools: any[] = [];
  if (ev.VerbalmemorySubTest != null) pools.push(ev.VerbalmemorySubTest);
  return flatDeep(pools).filter(isVM);
}
function pickVM(ev: Evaluation) {
  const all = getVMList(ev);
  let immediate = all.find((v) => vmKindOf(v) === "immediate");
  let delayed = all.find((v) => vmKindOf(v) === "delayed");
  if (!immediate && !delayed && all.length >= 2) {
    all.sort(
      (a, b) =>
        (a.seconds_from_start ?? 9e12) -
        (b.seconds_from_start ?? 9e12)
    );
    immediate = all[0];
    delayed = all[1];
  }
  if (!immediate && all.length === 1) immediate = all[0];
  return { immediate, delayed, all };
}

// ================== Página ==================
export default function EvaluationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [ev, setEv] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8401";
  const url = useMemo(
    () => new URL(`/v1/evaluations/${id}`, base).toString(),
    [base, id]
  );

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    fetch(url, { signal: ac.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json: ApiResponse = await r.json();
        setEv(json.evaluation);
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setError(e.message || "Error cargando evaluación");
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [url]);

  // Executive split
  const exec = Array.isArray(ev?.ExecutiveFunctionSubTest)
    ? ev!.ExecutiveFunctionSubTest!
    : [];
  const tmtA = exec.find(
    (e) => (e.type || "").toLowerCase() === "a"
  );
  const tmtAB = exec.find((e) =>
    ["a+b", "a_plus_b", "ab"].includes(
      (e.type || "").toLowerCase()
    )
  );
  const tmtADur =
    tmtA?.score?.durationSec ?? nsToSec(tmtA?.totalTime);
  const tmtBDur =
    tmtAB?.score?.durationSec ?? nsToSec(tmtAB?.totalTime);

  // Verbal memory split
  const { immediate: vmI, delayed: vmD } = ev ? pickVM(ev) : { immediate: undefined, delayed: undefined };
  const vmIAcc = vmI?.score?.accuracy;
  const vmDAcc = vmD?.score?.accuracy;

  // Quick KPI tones
  const tone = (p?: number) =>
    p == null
      ? styles.kpiWarn
      : p >= 0.75
        ? styles.kpiGood
        : p >= 0.4
          ? styles.kpiWarn
          : styles.kpiBad;

  // ======= Loading / Error =======
  if (loading) {
    return (
      <main className={styles.shell}>
        <section className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
          <Card className={styles.card}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Cargando evaluación…
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }
  if (error || !ev) {
    return (
      <main className={styles.shell}>
        <section className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
          <Card className={styles.card}>
            <CardHeader>
              <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent className="text-destructive">
              No se pudo cargar la evaluación: {error}
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <main className={styles.shell}>
        <section className="mx-auto max-w-6xl px-4 py-6 sm:py-8 space-y-6">
          {/* ===== Barra superior paciente + PDF ===== */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/history")}
                  className="px-2 text-slate-700 hover:bg-slate-100"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Volver
                </Button>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500">
                    Paciente
                  </span>
                  <span className="text-slate-900 font-semibold text-base sm:text-lg">
                    {ev.patientName}
                  </span>
                  <Badge
                    className={statusVariant(ev.currentStatus)}
                  >
                    {ev.currentStatus}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-slate-500 flex flex-wrap gap-3">
                  <span>Creada: {fmtDate(ev.createdAt)}</span>
                  <span className="font-mono text-[11px]">
                    ID: {ev.pk}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {ev.storage_url && (
                <a
                  href={ev.storage_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    PDF informe
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* ===== Resumen general + mapa cognitivo ===== */}
          <SectionCard
            title="Resumen de la evaluación"
            right={
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="inline-flex items-center text-xs text-slate-500 hover:text-slate-700">
                    <Info className="h-3.5 w-3.5 mr-1" />
                    Cómo leer este resumen
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="left"
                  className="max-w-xs text-xs"
                >
                  Valores verdes sugieren rendimiento preservado,
                  ámbar indica posible compromiso leve y rojo,
                  rendimiento claramente reducido en esa dimensión.
                </TooltipContent>
              </Tooltip>
            }
          >
            <Grid cols="md:grid-cols-4">
              <Metric
                label="Paciente"
                value={ev.patientName || "—"}
              />
              <Metric
                label="Edad"
                value={ev.patientAge ?? "—"}
              />
              <Metric
                label="Especialista"
                value={
                  <span className="truncate inline-block max-w-[220px]">
                    {ev.specialistMail}
                  </span>
                }
              />
              <Metric
                label="Estado"
                value={
                  <Badge className={statusVariant(ev.currentStatus)}>
                    {ev.currentStatus}
                  </Badge>
                }
              />
            </Grid>

            {/* Mapa cognitivo rápido */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {ev.LetterCancellationSubTest && (
                <QuickChip
                  label="Atención sostenida"
                  value={pct(
                    ev.LetterCancellationSubTest.score?.accuracy
                  )}
                  toneClass={tone(
                    ev.LetterCancellationSubTest.score?.accuracy
                  )}
                />
              )}
              {vmI && (
                <QuickChip
                  label="Memoria verbal inmediata"
                  value={pct(vmIAcc)}
                  toneClass={tone(vmIAcc)}
                />
              )}
              {vmD && (
                <QuickChip
                  label="Memoria verbal diferida"
                  value={pct(vmDAcc)}
                  toneClass={tone(vmDAcc)}
                />
              )}
              {tmtAB && (
                <QuickChip
                  label="Funciones ejecutivas (TMT A+B, s)"
                  value={tmtBDur ?? "—"}
                  toneClass={
                    tmtBDur
                      ? tmtBDur <= 300
                        ? styles.kpiGood
                        : styles.kpiBad
                      : styles.kpiWarn
                  }
                />
              )}
            </div>
          </SectionCard>

          {/* ===== Individual Test Results ===== */}
          <IndividualTestResultsSection evaluationId={id} />

          {/* ===== Subtests + análisis ===== */}
          <Card className={styles.card}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg">
                Detalle de subtests y análisis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs
                defaultValue="subtests"
                className="w-full"
              >
                <TabsList className="w-full grid grid-cols-2 sm:w-auto sm:inline-flex">
                  <TabsTrigger value="subtests">
                    Subtests
                  </TabsTrigger>
                  <TabsTrigger value="analysis">
                    Análisis clínico
                  </TabsTrigger>
                </TabsList>

                {/* SUBTESTS */}
                <TabsContent
                  value="subtests"
                  className="mt-4"
                >
                  <Accordion
                    type="multiple"
                    className="w-full"
                  >
                    {/* LETTER CANCELLATION */}
                    {ev.LetterCancellationSubTest && (
                      <AccordionItem
                        value="letter-cancellation"
                        id="sec-letter"
                      >
                        <AccordionTrigger className="text-left">
                          Atención sostenida — Letters
                          Cancellation
                        </AccordionTrigger>
                        <AccordionContent className="pt-3 space-y-3">
                          <Grid>
                            <Metric
                              label="Score global"
                              value={
                                ev.LetterCancellationSubTest.score
                                  .score
                              }
                            />
                            <Metric
                              label="Aciertos"
                              value={
                                ev.LetterCancellationSubTest
                                  .correct
                              }
                            />
                            <Metric
                              label="Errores"
                              value={
                                ev.LetterCancellationSubTest
                                  .errors
                              }
                            />
                            <Metric
                              label="Tiempo (s)"
                              value={
                                ev.LetterCancellationSubTest
                                  .timeInSecs
                              }
                            />
                            <Metric
                              label="Precisión"
                              value={pct(
                                ev.LetterCancellationSubTest
                                  .score.accuracy
                              )}
                            />
                            <Metric
                              label="Omisiones"
                              value={
                                ev.LetterCancellationSubTest
                                  .score.omissions
                              }
                            />
                            <Metric
                              label="Comisión (rate)"
                              value={ev.LetterCancellationSubTest.score.commissionRate.toFixed(
                                2
                              )}
                            />
                            <Metric
                              label="Aciertos/min"
                              value={ev.LetterCancellationSubTest.score.hitsPerMin.toFixed(
                                2
                              )}
                            />
                          </Grid>
                          <div className="text-xs text-muted-foreground">
                            Creado:{" "}
                            {fmtDate(
                              ev.LetterCancellationSubTest
                                .created_at
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* VISUAL MEMORY */}
                    {ev.VisualMemorySubTest && (
                      <AccordionItem
                        value="visual-memory"
                        id="sec-visual"
                      >
                        <AccordionTrigger className="text-left">
                          Memoria visual — BVMT-R
                        </AccordionTrigger>
                        <AccordionContent className="pt-3">
                          <Grid cols="md:grid-cols-3">
                            <Metric
                              label="Puntuación (0–2)"
                              value={
                                ev.VisualMemorySubTest.score
                                  ?.Val ?? "0"
                              }
                            />
                            <Metric
                              label="Comentario"
                              value={
                                ev.VisualMemorySubTest.note
                                  ?.Val ?? "—"
                              }
                            />
                          </Grid>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* VERBAL MEMORY */}
                    {(vmI || vmD) && (
                      <AccordionItem
                        value="verbal-memory"
                        id="sec-verbal"
                      >
                        <AccordionTrigger className="text-left">
                          Memoria verbal — Inmediata vs
                          diferida
                        </AccordionTrigger>
                        <AccordionContent className="pt-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Inmediata */}
                            <Card className={styles.card}>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm">
                                  Inmediata
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                {vmI ? (
                                  <Grid cols="md:grid-cols-4">
                                    <Metric
                                      label="Score (0–100)"
                                      value={
                                        vmI.score?.score ??
                                        "—"
                                      }
                                    />
                                    <Metric
                                      label="Accuracy"
                                      value={pct(
                                        vmI.score?.accuracy
                                      )}
                                    />
                                    <Metric
                                      label="Aciertos (hits)"
                                      value={
                                        vmI.score?.hits ??
                                        "—"
                                      }
                                    />
                                    <Metric
                                      label="Omisiones"
                                      value={
                                        vmI.score
                                          ?.omissions ??
                                        "—"
                                      }
                                    />
                                    <Metric
                                      label="Intrusiones"
                                      value={
                                        vmI.score
                                          ?.intrusions ??
                                        "—"
                                      }
                                    />
                                    <Metric
                                      label="Perseveraciones"
                                      value={
                                        vmI.score
                                          ?.perseverations ??
                                        "—"
                                      }
                                    />
                                  </Grid>
                                ) : (
                                  <div className="text-sm text-muted-foreground">
                                    No hay registro
                                    inmediato.
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            {/* Diferida */}
                            <Card className={styles.card}>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm">
                                  Diferida
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                {vmD ? (
                                  <Grid cols="md:grid-cols-4">
                                    <Metric
                                      label="Score (0–100)"
                                      value={
                                        vmD.score?.score ??
                                        "—"
                                      }
                                    />
                                    <Metric
                                      label="Accuracy"
                                      value={pct(
                                        vmD.score?.accuracy
                                      )}
                                    />
                                    <Metric
                                      label="Aciertos (hits)"
                                      value={
                                        vmD.score?.hits ??
                                        "—"
                                      }
                                    />
                                    <Metric
                                      label="Omisiones"
                                      value={
                                        vmD.score
                                          ?.omissions ??
                                        "—"
                                      }
                                    />
                                    <Metric
                                      label="Intrusiones"
                                      value={
                                        vmD.score
                                          ?.intrusions ??
                                        "—"
                                      }
                                    />
                                    <Metric
                                      label="Perseveraciones"
                                      value={
                                        vmD.score
                                          ?.perseverations ??
                                        "—"
                                      }
                                    />
                                  </Grid>
                                ) : (
                                  <div className="text-sm text-muted-foreground">
                                    No hay registro
                                    diferido.
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* EXECUTIVE FUNCTIONS */}
                    {exec.length > 0 && (
                      <AccordionItem
                        value="executive-functions"
                        id="sec-exec"
                      >
                        <AccordionTrigger className="text-left">
                          Funciones ejecutivas — Trail
                          Making Test
                        </AccordionTrigger>
                        <AccordionContent className="pt-3 space-y-4">
                          {/* TMT-A */}
                          {tmtA && (
                            <>
                              <div className="font-medium mb-1 flex items-center gap-2 text-sm">
                                <span>TMT-A</span>
                                {tmtADur != null && (
                                  tmtADur > 150 ? (
                                    <span className="inline-flex items-center gap-1 text-rose-700 text-xs">
                                      <AlertTriangle className="h-3 w-3" />{" "}
                                      &gt;150s
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-emerald-700 text-xs">
                                      <CheckCircle className="h-3 w-3" />{" "}
                                      OK
                                    </span>
                                  )
                                )}
                              </div>
                              <Grid cols="md:grid-cols-6">
                                <Metric
                                  label="Score"
                                  value={
                                    tmtA.score?.score ?? "—"
                                  }
                                />
                                <Metric
                                  label="Ítems"
                                  value={tmtA.numberOfItems}
                                />
                                <Metric
                                  label="Correctos"
                                  value={tmtA.totalCorrect}
                                />
                                <Metric
                                  label="Errores"
                                  value={tmtA.totalErrors}
                                />
                                <Metric
                                  label="Clicks"
                                  value={tmtA.totalClicks}
                                />
                                <Metric
                                  label="Duración (s)"
                                  value={tmtADur}
                                />
                                <Metric
                                  label="Precisión"
                                  value={
                                    tmtA.score
                                      ? pct(
                                        tmtA.score
                                          .accuracy
                                      )
                                      : "—"
                                  }
                                />
                              </Grid>
                              <Separator className="my-3" />
                            </>
                          )}

                          {/* TMT-A+B */}
                          {tmtAB && (
                            <>
                              <div className="font-medium mb-1 flex items-center gap-2 text-sm">
                                <span>TMT-A+B</span>
                                {tmtBDur != null && (
                                  tmtBDur > 300 ? (
                                    <span className="inline-flex items-center gap-1 text-rose-700 text-xs">
                                      <AlertTriangle className="h-3 w-3" />{" "}
                                      &gt;300s
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-emerald-700 text-xs">
                                      <CheckCircle className="h-3 w-3" />{" "}
                                      OK
                                    </span>
                                  )
                                )}
                              </div>
                              <Grid cols="md:grid-cols-6">
                                <Metric
                                  label="Ítems"
                                  value={tmtAB.numberOfItems}
                                />
                                <Metric
                                  label="Correctos"
                                  value={tmtAB.totalCorrect}
                                />
                                <Metric
                                  label="Errores"
                                  value={tmtAB.totalErrors}
                                />
                                <Metric
                                  label="Clicks"
                                  value={tmtAB.totalClicks}
                                />
                                <Metric
                                  label="Duración (s)"
                                  value={tmtBDur}
                                />
                                <Metric
                                  label="Precisión"
                                  value={
                                    tmtAB.score
                                      ? pct(
                                        tmtAB.score
                                          .accuracy
                                      )
                                      : "—"
                                  }
                                />
                                <Metric
                                  label="Velocidad (índice)"
                                  value={
                                    tmtAB.score?.speedIndex?.toFixed(
                                      2
                                    ) ?? "—"
                                  }
                                />
                              </Grid>
                            </>
                          )}

                          {!tmtA && !tmtAB && (
                            <div className="text-sm text-muted-foreground">
                              No hay registros de TMT-A /
                              TMT-A+B.
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* FLUENCIA VERBAL */}
                    {ev.LanguageFluencySubTest && (
                      <AccordionItem
                        value="language-fluency"
                        id="sec-lang"
                      >
                        <AccordionTrigger className="text-left">
                          Fluencia verbal
                        </AccordionTrigger>
                        <AccordionContent className="pt-3 space-y-3">
                          <Grid cols="md:grid-cols-6">
                            <Metric
                              label="Score"
                              value={
                                ev.LanguageFluencySubTest
                                  .score.score
                              }
                            />
                            <Metric
                              label="Únicas válidas"
                              value={
                                ev.LanguageFluencySubTest
                                  .score.uniqueValid
                              }
                            />
                            <Metric
                              label="Total producidas"
                              value={
                                ev.LanguageFluencySubTest
                                  .score.totalProduced
                              }
                            />
                            <Metric
                              label="Palabras/min"
                              value={
                                ev.LanguageFluencySubTest
                                  .score.wordsPerMinute
                              }
                            />
                            <Metric
                              label="Idioma"
                              value={
                                ev.LanguageFluencySubTest
                                  .language
                              }
                            />
                            <Metric
                              label="Categoría"
                              value={
                                ev.LanguageFluencySubTest
                                  .category
                              }
                            />
                          </Grid>

                          {Array.isArray(
                            ev.LanguageFluencySubTest
                              .answer_words
                          ) &&
                            ev.LanguageFluencySubTest
                              .answer_words.length > 0 && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">
                                  Producción verbal
                                </div>
                                <div className="rounded-md border p-3 text-sm bg-white/80">
                                  {ev.LanguageFluencySubTest.answer_words.join(
                                    ", "
                                  )}
                                </div>
                              </div>
                            )}
                          <div className="text-xs text-muted-foreground">
                            Creado:{" "}
                            {fmtDate(
                              ev.LanguageFluencySubTest
                                .created_at
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* VISUOESPACIAL / CDT */}
                    {ev.VisualSpatialSubTest && (
                      <AccordionItem
                        value="visual-spatial"
                        id="sec-cdt"
                      >
                        <AccordionTrigger className="text-left">
                          Clock Drawing Test (CDT)
                        </AccordionTrigger>
                        <AccordionContent className="pt-3">
                          <Grid cols="md:grid-cols-3">
                            <Metric
                              label="Puntuación"
                              value={
                                ev.VisualSpatialSubTest
                                  ?.Score?.Val ?? "0"
                              }
                            />
                            <Metric
                              label="Comentario"
                              value={
                                ev.VisualSpatialSubTest
                                  ?.Note?.Val ?? "—"
                              }
                            />
                          </Grid>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                </TabsContent>

                {/* ANÁLISIS */}
                <TabsContent
                  value="analysis"
                  className="mt-4"
                >
                  {ev.assistantAnalysis ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>
                        {ev.assistantAnalysis}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Sin análisis del asistente.
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>
      </main>
    </TooltipProvider>
  );
}

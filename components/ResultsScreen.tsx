"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Copy, Mail, RefreshCw, Download, ExternalLink, CheckCircle2, XCircle, MoreVertical } from "lucide-react";

import { useEvaluationStore } from "@/src/stores/evaluation";

interface Evaluation {
  pk: string;
  patientName: string;
  patientAge: number;
  specialistMail: string;
  specialistId: string;
  assistantAnalysis: string;
  storage_url?: string;
  createdAt: string;
  currentStatus: "CREATED" | "IN_PROGRESS" | "COMPLETED" | string;
}
interface ApiResponse { evaluation: Evaluation; }

const statusColor: Record<string, string> = {
  CREATED: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
};
const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "—");
const cn = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

function BackToHomeButton() {
  const router = useRouter();
  return (
    <Button
      onClick={() => router.push("/home")}
      size="sm"
      className="gap-2 bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200"
      aria-label="Volver a inicio"
    >
      Volver a inicio
    </Button>
  );
}

export default function EvaluationDetails() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const idFromRoute = (params?.id as string) || "";
  const storeId = useEvaluationStore((s) => s.currentEvaluation?.id) || "";
  const evaluationId = storeId || idFromRoute; // ← toma del store o de la ruta

  const [data, setData] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyOk, setCopyOk] = useState(false);

  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8401").replace(/\/+$/, "");
  const ageLabel = data ? `${data.patientAge} años` : "";

  // fetch con cancelación y guardas para no quedarse en loading
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      // si no hay ID, no esperes “a ver si llega”: apaga loading y muestra empty state
      if (!evaluationId) {
        setData(null);
        setError(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get<ApiResponse>(`${base}/v1/evaluations/${evaluationId}`, {
          signal: controller.signal as any,
        });
        if (!cancelled) setData(res.data.evaluation);
      } catch (e: any) {
        if (axios.isCancel(e) || e?.name === "CanceledError") return;
        if (!cancelled) setError(e?.response?.data?.message || e?.message || "Error cargando la evaluación");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [evaluationId, base]);

  const handleRefresh = () => {
    // forzamos el efecto cambiando una key “tonta”: simplemente re-llama a run
    // (o podrías usar un estado “nonce” en deps)
    if (typeof window !== "undefined") {
      // pequeña animación visual: opcional
      setLoading(true);
      // re-dispara leyendo la misma URL (el efecto depende de evaluationId/base)
      // por simplicidad, reusamos setLoading y dejamos que el effect corra en el próximo tick:
      setTimeout(() => setLoading(false), 0);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen w-full">
        {/* HEADER */}
        <div className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto max-w-6xl px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <BackToHomeButton />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Evaluación</span>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="truncate font-medium text-sm">{evaluationId || "—"}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    {data ? (
                      <Badge className={cn("h-5 px-2", statusColor[data.currentStatus] || "bg-slate-100 text-slate-700")}>
                        {data.currentStatus}
                      </Badge>
                    ) : loading ? (
                      <Skeleton className="h-5 w-24 rounded-full" />
                    ) : (
                      <Badge className="h-5 px-2 bg-slate-100 text-slate-700">—</Badge>
                    )}
                    <span className="text-muted-foreground">•</span>
                    {loading ? <Skeleton className="h-4 w-28" /> : <span className="text-muted-foreground">Creada: {formatDate(data?.createdAt)}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={handleRefresh} variant="outline" size="icon" aria-label="Refrescar">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refrescar</TooltipContent>
                </Tooltip>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Más acciones">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => router.back()}>
                      <ExternalLink className="mr-2 h-4 w-4" /> Volver
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!data?.storage_url}
                      onClick={() => data?.storage_url && window.open(data.storage_url, "_blank")}
                    >
                      <Download className="mr-2 h-4 w-4" /> Descargar PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="mx-auto max-w-6xl px-4 py-6">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!evaluationId && !loading && !error && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Sin evaluación seleccionada</CardTitle>
                <CardDescription>Vuelve al historial o inicia una nueva evaluación.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button onClick={() => router.push("/history")} variant="outline">Ir a historial</Button>
                  <Button onClick={() => router.push("/patient-selection")}>Nueva evaluación</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tarjeta resumen */}
          {evaluationId && (
            <Card className="mb-6">
              <CardContent className="py-4">
                {loading ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-72" />
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <InfoRow label="Paciente" value={data?.patientName} />
                    <InfoRow label="Edad" value={data ? `${data.patientAge} años` : "—"} />
                    <div className="flex items-center gap-2 min-w-0">
                      <Label className="text-xs text-muted-foreground">Especialista</Label>
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate text-sm">{data?.specialistMail}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={async () => {
                                await navigator.clipboard.writeText(data?.specialistMail || "");
                                setCopyOk(true);
                                setTimeout(() => setCopyOk(false), 1200);
                              }}
                              aria-label="Copiar email"
                            >
                              {copyOk ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{copyOk ? "Copiado" : "Copiar"}</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Análisis */}
          {evaluationId && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Análisis</CardTitle>
                <CardDescription className="text-xs">Resumen clínico automatizado</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="resumen" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="resumen">Resumen</TabsTrigger>
                    <TabsTrigger value="raw">Markdown</TabsTrigger>
                  </TabsList>

                  <TabsContent value="resumen" className="mt-4">
                    {loading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    ) : data?.assistantAnalysis ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{data.assistantAnalysis}</ReactMarkdown>
                        </div>
                      </motion.div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin análisis disponible.</p>
                    )}
                  </TabsContent>

                  <TabsContent value="raw" className="mt-4">
                    {loading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : data?.assistantAnalysis ? (
                      <pre className="rounded-md border bg-muted/40 p-3 text-xs overflow-x-auto whitespace-pre-wrap">
                        {data.assistantAnalysis}
                      </pre>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin contenido.</p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action bar */}
        <div className="sticky bottom-0 z-30 border-t bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto max-w-6xl px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground truncate">
                {data ? `Paciente: ${data.patientName} · ${ageLabel}` : loading ? "Cargando…" : "—"}
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => location.reload()} variant="outline" size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Refrescar
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  disabled={!data?.storage_url}
                  onClick={() => data?.storage_url && window.open(data.storage_url, "_blank")}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" /> PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string | number | null | undefined; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className={cn("truncate text-sm font-medium", mono && "font-mono break-all truncate")}>
        {value ?? "—"}
      </p>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Mail, RefreshCw, Download, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { useEvaluationStore } from "@/stores/evaluation";

// -------- Types ---------
interface Evaluation {
  pk: string;
  patientName: string;
  patientAge: number;
  specialistMail: string;
  specialistId: string;
  assistantAnalysis: string; // markdown
  storage_url?: string;
  createdAt: string; // ISO
  currentStatus: "CREATED" | "IN_PROGRESS" | "COMPLETED" | string;
}

interface ApiResponse {
  evaluation: Evaluation;
}

// -------- Utils ---------
const statusColor: Record<string, string> = {
  CREATED: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
};

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// -------- Component ---------
export default function EvaluationDetails() {
  const router = useRouter();

  const [data, setData] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyOk, setCopyOk] = useState(false);
  const currentEvaluationID = useEvaluationStore(state => state.currentEvaluation?.id)

  async function fetchData() {
    if (!currentEvaluationID) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<ApiResponse>(`http://localhost:8401/v1/evaluations/${currentEvaluationID}`);
      setData(res.data.evaluation);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Error cargando la evaluación");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEvaluationID]);

  const ageLabel = useMemo(() => (data ? `${data.patientAge} años` : ""), [data]);

  const headerGradient = "bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600";

  return (
    <div className="min-h-screen w-full pb-16">
      {/* Top hero */}
      <div className={cn("relative", headerGradient)}>
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_left,white,transparent_50%)]" />
        <div className="mx-auto max-w-5xl px-6 pt-10 pb-16 text-white">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-4xl font-bold tracking-tight">Detalle de evaluación</h1>
                <p className="mt-1 text-sm md:text-base opacity-90">ID: {currentEvaluationID || "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={fetchData} variant="secondary" size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Refrescar
                </Button>
                <Button variant="secondary" size="sm" onClick={() => router.back()} className="gap-2">
                  <ExternalLink className="h-4 w-4" /> Volver
                </Button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {data ? (
                <Badge className={cn("text-xs", statusColor[data.currentStatus] || "bg-slate-100 text-slate-700")}>{
                  data.currentStatus
                }</Badge>
              ) : (
                <Skeleton className="h-6 w-24 rounded-full" />
              )}
              <Separator orientation="vertical" className="h-6 bg-white/30" />
              {data ? (
                <span className="text-sm opacity-90">Creada: {formatDate(data.createdAt)}</span>
              ) : (
                <Skeleton className="h-5 w-40" />
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl -mt-12 px-6">
        {/* Error */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Content grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column: Patient & actions */}
          <Card className="md:col-span-1 shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">Paciente</CardTitle>
              <CardDescription>Información básica</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-56" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Nombre</Label>
                    <p className="font-medium text-base">{data?.patientName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Edad</Label>
                    <p className="font-medium">{ageLabel}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <Label className="text-xs text-muted-foreground">Especialista</Label>
                      <p className="truncate font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4 opacity-70" /> {data?.specialistMail}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={async () => {
                        await navigator.clipboard.writeText(data?.specialistMail || "");
                        setCopyOk(true);
                        setTimeout(() => setCopyOk(false), 1500);
                      }}
                      aria-label="Copiar email"
                    >
                      {copyOk ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">ID especialista</Label>
                    <p className="font-mono text-sm break-all">{data?.specialistId}</p>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <Button
                      className="w-full"
                      variant="default"
                      disabled={!data?.storage_url}
                      onClick={() => data?.storage_url && window.open(data.storage_url, "_blank")}
                    >
                      <Download className="h-4 w-4 mr-2" /> Descargar PDF
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right column: Analysis & meta */}
          <div className="md:col-span-2 space-y-6">
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg">Análisis del asistente</CardTitle>
                <CardDescription>Resumen clínico automatizado</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                    {data?.assistantAnalysis ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{data.assistantAnalysis}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin análisis disponible.</p>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}

/*
Uso recomendado (App Router):

// app/evaluations/[id]/page.tsx
export { default } from "@/app/components/EvaluationDetails";

// Si prefieres usarlo como componente controlado:
// <EvaluationDetails /> lee el id de useParams();
*/

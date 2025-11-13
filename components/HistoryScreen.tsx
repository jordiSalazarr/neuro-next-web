"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/src/stores/auth";

import {
  Calendar,
  Filter,
  Loader2,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Home,
  AlertTriangle,
} from "lucide-react";

// ================= UI TOKENS — PALETA CLÍNICA CONSISTENTE =================
const styles = {
  shell: "min-h-[calc(100vh-56px)] bg-slate-50",
  card:
    "bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-sm rounded-2xl",
  primary: "bg-[#0E7C86] hover:bg-[#0a646c] text-white",
  outline: "border-slate-300 text-slate-800 hover:bg-slate-50",
  chip: "bg-sky-50 text-sky-800 border border-sky-200",
  topbar:
    "sticky top-[56px] z-40 border-b border-slate-200/70 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80",
};

// ---------- Tipos ----------
type Evaluation = {
  pk: string;
  patientName: string;
  patientAge: number;
  specialistMail: string;
  specialistId: string;
  assistantAnalysis: string;
  storage_url: string;
  createdAt: string;
  currentStatus: "CREATED" | "IN_PROGRESS" | "FINISHED" | string;
};

type ApiResponse = {
  evaluations: Evaluation[];
  meta?: { offset: number; limit: number; count: number };
};

// ---------- Utils ----------
function cnStatusVariant(status: string) {
  switch (status) {
    case "CREATED":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    case "IN_PROGRESS":
      return "bg-amber-50 text-amber-800 border border-amber-200";
    case "FINISHED":
      return "bg-emerald-50 text-emerald-800 border border-emerald-200";
    default:
      return "bg-gray-50 text-gray-700 border border-gray-200";
  }
}

function formatDate(d: string) {
  try {
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(d));
  } catch {
    return d;
  }
}

function buildURL(
  base: string,
  path: string,
  params: Record<string, string | number | undefined>
) {
  const url = new URL(path, base);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== null) {
      url.searchParams.set(k, String(v));
    }
  });
  return url.toString();
}

const isoDate = (dt: Date) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(dt.getDate()).padStart(2, "0")}`;

const daysAgoISO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return isoDate(d);
};

const todayISO = () => isoDate(new Date());

function truncateWords(text: string, maxWords: number): string {
  const base = (text ?? "").trim();
  if (!base) return "";
  const words = base.split(/\s+/);
  if (words.length <= maxWords) return base;
  return words.slice(0, maxWords).join(" ") + " …";
}

// ================= Componente =================
export default function EvaluationsSearch() {
  const currentUser = useAuthStore((s) => s.user);

  // Filtros
  const [fromDate, setFromDate] = useState<string>(""); // YYYY-MM-DD
  const [toDate, setToDate] = useState<string>(""); // YYYY-MM-DD
  const [searchTerm, setSearchTerm] = useState<string>(""); // paciente / término
  const [statusLocal, setStatusLocal] = useState<string>(""); // filtro local opcional

  // Paginación
  const [limit, setLimit] = useState<number>(12);
  const [page, setPage] = useState<number>(1); // 1-based
  const offset = useMemo(() => (page - 1) * limit, [page, limit]);

  // Datos
  const [data, setData] = useState<Evaluation[]>([]);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Construcción URL
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8401";
  const fetchUrl = useMemo(() => {
    return buildURL(base, "/v1/evaluations", {
      specialist_id: currentUser?.id || undefined,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      search_term: searchTerm || undefined,
      offset,
      limit,
    });
  }, [base, currentUser?.id, fromDate, toDate, searchTerm, offset, limit]);

  // Fetch controlado
  const [shouldFetch, setShouldFetch] = useState<boolean>(false);

  // Debounce de búsqueda textual (corregido tipo Timeout)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchTermChange = (v: string) => {
    setSearchTerm(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setShouldFetch(true);
    }, 300);
  };

  // Rango por defecto (últimos 30 días)
  useEffect(() => {
    setFromDate((prev) => prev || daysAgoISO(30));
    setToDate((prev) => prev || todayISO());
    setPage(1);
    setShouldFetch(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Efecto de carga con cancelación
  useEffect(() => {
    if (!shouldFetch) return;
    let cancelled = false;
    const ctrl = new AbortController();

    setLoading(true);
    setError(null);

    fetch(fetchUrl, { method: "GET", signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json: ApiResponse = await r.json();
        if (cancelled) return;
        setData(json.evaluations ?? []);
        setCount(json.meta?.count ?? json.evaluations?.length ?? 0);
      })
      .catch((e) => {
        if (cancelled || e?.name === "AbortError") return;
        setError(
          e.message || "No se pudieron cargar las evaluaciones"
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setShouldFetch(false);
        }
      });

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [fetchUrl, shouldFetch]);

  // Acciones
  const onSearch = () => {
    setPage(1);
    setShouldFetch(true);
  };

  const onReset = () => {
    setFromDate(daysAgoISO(30));
    setToDate(todayISO());
    setSearchTerm("");
    setStatusLocal("");
    setLimit(12);
    setPage(1);
    setShouldFetch(true);
  };

  const quickRange = (days: number) => {
    setFromDate(daysAgoISO(days));
    setToDate(todayISO());
    setPage(1);
    setShouldFetch(true);
  };

  const totalPages = useMemo(() => {
    if (!count) return 1;
    return Math.max(1, Math.ceil(count / limit));
  }, [count, limit]);

  const canGoNext = useMemo(
    () => page < totalPages,
    [page, totalPages]
  );
  const canGoPrev = useMemo(
    () => page > 1,
    [page]
  );

  // Filtro local por estado
const filteredData = useMemo(() => {
  if (!statusLocal || statusLocal === "all") return data
  return data.filter((e) => String(e.currentStatus) === statusLocal)
}, [data, statusLocal])

  return (
    <TooltipProvider delayDuration={120}>
      <main className={styles.shell}>
        {/* ======= TOP BAR (sticky) ======= */}
        <div className={styles.topbar}>
          <div className="mx-auto max-w-6xl px-3 sm:px-4">
            <div className="py-3 flex flex-col gap-3">
              {/* Línea 1: título y acciones rápidas */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Link href="/home" aria-label="Ir a inicio">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`${styles.outline} bg-white`}
                    >
                      <Home className="h-4 w-4 mr-2" /> Inicio
                    </Button>
                  </Link>
                  <h2 className="text-slate-900 text-base sm:text-lg font-semibold">
                    Buscador de evaluaciones
                  </h2>
                  <Badge className="bg-slate-100 text-slate-800 border border-slate-200">
                    {count ?? 0} totales
                  </Badge>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onReset}
                        className={`${styles.outline} bg-white`}
                        aria-label="Resetear filtros"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" /> Reset
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Últimos 30 días y filtros limpios
                    </TooltipContent>
                  </Tooltip>
                  <Button
                    size="sm"
                    onClick={onSearch}
                    disabled={loading}
                    className={styles.primary}
                    aria-label="Buscar"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Buscar
                  </Button>
                </div>
              </div>

              {/* Línea 2: filtros compactos */}
              <div className="grid gap-3 sm:grid-cols-5">
                {/* Rango fechas */}
                <div className="col-span-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-600" />
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) =>
                      setFromDate(e.target.value)
                    }
                    aria-label="Desde"
                    className="bg-white"
                    max={toDate || todayISO()}
                  />
                  <span className="text-slate-500 text-sm">
                    →
                  </span>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) =>
                      setToDate(e.target.value)
                    }
                    aria-label="Hasta"
                    max={todayISO()}
                    className="bg-white"
                  />
                </div>

                {/* Búsqueda texto */}
                <div className="col-span-2">
                  <Input
                    placeholder="Buscar por paciente o término…"
                    value={searchTerm}
                    onChange={(e) =>
                      onSearchTermChange(e.target.value)
                    }
                    onKeyDown={(e) =>
                      e.key === "Enter" && onSearch()
                    }
                    aria-label="Buscar"
                    className="bg-white"
                  />
                </div>

                {/* Tamaño página */}
                <div className="flex">
                  <Select
                    value={String(limit)}
                    onValueChange={(v) => {
                      setLimit(Number(v));
                      setPage(1);
                      setShouldFetch(true);
                    }}
                  >
                    <SelectTrigger
                      className="w-full bg-white"
                      aria-label="Resultados por página"
                    >
                      <SelectValue placeholder="12" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8">8 / pág</SelectItem>
                      <SelectItem value="12">12 / pág</SelectItem>
                      <SelectItem value="24">24 / pág</SelectItem>
                      <SelectItem value="48">48 / pág</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Línea 3: chips rango + estado */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={styles.chip}
                  onClick={() => quickRange(7)}
                >
                  Últimos 7 días
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={styles.chip}
                  onClick={() => quickRange(30)}
                >
                  Últimos 30 días
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={styles.chip}
                  onClick={() => quickRange(90)}
                >
                  Últimos 90 días
                </Button>

                {/* <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-slate-600">
                    Estado:
                  </span>
                  <Select
                    value={statusLocal}
                    onValueChange={setStatusLocal}
                  >
                    <SelectTrigger className="h-8 w-[150px] bg-white">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="CREATED">
                        CREATED
                      </SelectItem>
                      <SelectItem value="IN_PROGRESS">
                        IN_PROGRESS
                      </SelectItem>
                      <SelectItem value="FINISHED">
                        FINISHED
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Accordion
                    type="single"
                    collapsible
                    className="text-slate-700"
                  >
                    <AccordionItem
                      value="advanced"
                      className="border-none"
                    >
                      <AccordionTrigger className="text-xs sm:text-sm hover:no-underline">
                        <span className="inline-flex items-center gap-2">
                          <Filter className="h-4 w-4" /> Más
                          filtros
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2">
                        <div className="grid gap-3 sm:grid-cols-4">
                          <div className="col-span-4">
                            <div className="text-xs text-slate-600">
                              (Espacio para filtros
                              adicionales: centro,
                              etiqueta, etc.)
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div> */}
              </div>
            </div>
          </div>
        </div>

        {/* ===== Contenido ===== */}
        <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6">
          {/* Estado y navegación superior */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-slate-700">
              {loading
                ? "Cargando…"
                : `Página ${page} de ${totalPages}${
                    filteredData.length
                      ? ` · ${filteredData.length} resultados en esta página`
                      : ""
                  }`}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!canGoPrev || loading}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  setShouldFetch(true);
                }}
                className={`${styles.outline} bg-white`}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!canGoNext || loading}
                onClick={() => {
                  setPage((p) => p + 1);
                  setShouldFetch(true);
                }}
                className={`${styles.outline} bg-white`}
              >
                Siguiente{" "}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Banner de error */}
          {error && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 shadow-sm">
              <AlertTriangle className="h-4 w-4" />
              {error}
              <Button
                size="sm"
                variant="ghost"
                className="ml-1 text-rose-700 hover:bg-rose-100"
                onClick={onSearch}
              >
                Reintentar
              </Button>
            </div>
          )}

          {/* Grid de resultados */}
          <div
            className="mt-5 grid gap-5"
            style={{
              gridTemplateColumns:
                "repeat(auto-fit, minmax(320px, 1fr))",
            }}
          >
            {/* Skeletons */}
            {loading &&
              Array.from({
                length: Math.min(limit, 9),
              }).map((_, i) => (
                <Card
                  key={`sk-${i}`}
                  className={`${styles.card} overflow-hidden`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <Skeleton className="mt-2 h-4 w-28" />
                  </CardHeader>
                  <CardContent className="grid gap-3 text-sm">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-24 w-full" />
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-10" />
                    </div>
                  </CardContent>
                </Card>
              ))}

            {/* Empty state */}
            {!loading && filteredData.length === 0 && !error && (
              <Card className={`${styles.card} border-dashed`}>
                <CardContent className="p-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 ring-1 ring-sky-200">
                    <Search className="h-6 w-6 text-sky-700" />
                  </div>
                  <p className="text-slate-700">
                    No hay evaluaciones para los filtros
                    actuales.
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Button
                      onClick={onReset}
                      className={styles.primary}
                    >
                      Limpiar filtros
                    </Button>
                    <Button
                      variant="outline"
                      onClick={onSearch}
                      className={styles.outline}
                    >
                      Reintentar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cards */}
            {filteredData.map((ev) => (
              <Card
                key={ev.pk}
                className={`${styles.card} overflow-hidden hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-[#0E7C86]/30`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="truncate text-lg text-slate-900">
                      {ev.patientName ||
                        "Paciente sin nombre"}
                    </CardTitle>
                    <Badge
                      className={cnStatusVariant(
                        ev.currentStatus
                      )}
                    >
                      {ev.currentStatus}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {formatDate(ev.createdAt)}
                  </div>
                </CardHeader>

                <CardContent className="grid gap-3 text-sm text-slate-800">
                  <div className="grid grid-cols-2 gap-3">
                    <Info
                      label="Edad"
                      value={ev.patientAge ?? "–"}
                    />
                    <Info
                      label="Especialista"
                      value={ev.specialistMail}
                      clamp
                    />
                  </div>

                  {ev.assistantAnalysis && (
                    <div className="space-y-1">
                      <div className="text-xs text-slate-600">
                        Análisis asistente
                      </div>
                      <div className="prose prose-sm max-w-none prose-p:my-0">
                        <ReactMarkdown>
                          {truncateWords(
                            ev.assistantAnalysis,
                            28
                          )}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  <Separator className="my-1" />

                  <div className="flex items-center justify-between pt-1">
                    <Link
                      href={`/evaluations/${ev.pk}`}
                      className="rounded text-sm text-[#0E7C86] underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[#0E7C86]/40"
                    >
                      Ver detalle
                    </Link>
                    {ev.storage_url ? (
                      <a
                        href={ev.storage_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded text-sm text-slate-700 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0E7C86]/40"
                      >
                        <Download className="h-4 w-4" /> PDF
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500">
                        Sin PDF
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Footer de navegación */}
          <div className="mt-8 flex items-center justify-between text-slate-700">
            <div className="text-xs">
              {count
                ? `Mostrando ${
                    Math.min(filteredData.length, limit) ||
                    0
                  } de ${count}`
                : filteredData.length
                ? `Mostrando ${filteredData.length}`
                : ""}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!canGoPrev || loading}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  setShouldFetch(true);
                }}
                className={`${styles.outline} bg-white`}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!canGoNext || loading}
                onClick={() => {
                  setPage((p) => p + 1);
                  setShouldFetch(true);
                }}
                className={`${styles.outline} bg-white`}
              >
                Siguiente{" "}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </TooltipProvider>
  );
}

/* ---------- Subcomponentes ---------- */
function Info({
  label,
  value,
  mono,
  clamp,
}: {
  label: string;
  value: string | number | undefined | null;
  mono?: boolean;
  clamp?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-slate-600">{label}</div>
      <p
        className={[
          "text-sm font-medium text-slate-900",
          mono ? "font-mono break-all" : "",
          clamp ? "truncate" : "",
        ].join(" ")}
        title={typeof value === "string" ? value : undefined}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}

"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { useAuthStore } from "@/src/stores/auth"

import { Calendar, Filter, Loader2, RotateCcw, Search, ChevronLeft, ChevronRight, Download, Home } from "lucide-react"

// ================= Tokens de estilo corporativo =================
const styles = {
  backdrop: "bg-[#0E2F3C]", // azul institucional
  card: "bg-white/80 backdrop-blur border-slate-200",
  primary: "bg-[#0E7C86] hover:bg-[#0a646c] text-white",
  outline: "border-slate-300 text-slate-800 hover:bg-slate-50",
}

// ---------- Tipos ----------
type Evaluation = {
  pk: string
  patientName: string
  patientAge: number
  specialistMail: string
  specialistId: string
  assistantAnalysis: string
  storage_url: string
  createdAt: string
  currentStatus: "CREATED" | "IN_PROGRESS" | "FINISHED" | string
}

type ApiResponse = {
  evaluations: Evaluation[]
  meta?: { offset: number; limit: number; count: number }
}

// ---------- Utils ----------
function cnStatusVariant(status: string) {
  switch (status) {
    case "CREATED":
      return "bg-slate-100 text-slate-700"
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-800"
    case "FINISHED":
      return "bg-emerald-100 text-emerald-800"
    default:
      return "bg-gray-100 text-gray-700"
  }
}

function formatDate(d: string) {
  try {
    return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d))
  } catch {
    return d
  }
}

function buildURL(base: string, path: string, params: Record<string, string | number | undefined>) {
  const url = new URL(path, base)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== null) url.searchParams.set(k, String(v))
  })
  return url.toString()
}

const isoDate = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`

const oneMonthAgoISO = () => {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return isoDate(d)
}

const todayISO = () => isoDate(new Date())

function truncateWords(text: string, maxWords: number): string {
  const words = (text ?? "").trim().split(/\s+/)
  if (words.length <= maxWords) return text
  return words.slice(0, maxWords).join(" ") + " …"
}

// ---------- Componente ----------
export default function EvaluationsSearch() {
  const currentUser = useAuthStore((s) => s.user)

  // Filtros
  const [fromDate, setFromDate] = useState<string>("") // YYYY-MM-DD
  const [toDate, setToDate] = useState<string>("") // YYYY-MM-DD
  const [searchTerm, setSearchTerm] = useState<string>("") // paciente / término
  const [statusLocal, setStatusLocal] = useState<string>("") // filtro local opcional

  // Paginación
  const [limit, setLimit] = useState<number>(12)
  const [page, setPage] = useState<number>(1) // 1-based
  const offset = useMemo(() => (page - 1) * limit, [page, limit])

  // Datos
  const [data, setData] = useState<Evaluation[]>([])
  const [count, setCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Construcción URL
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8401"
  const fetchUrl = useMemo(() => {
    return buildURL(base, "/v1/evaluations", {
      specialist_id: currentUser?.id || undefined,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      search_term: searchTerm || undefined,
      offset,
      limit,
    })
  }, [base, currentUser?.id, fromDate, toDate, searchTerm, offset, limit])

  // Fetch controlado
  const [shouldFetch, setShouldFetch] = useState<boolean>(false)

  // Debounce de búsqueda textual
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const onSearchTermChange = (v: string) => {
    setSearchTerm(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      setShouldFetch(true)
    }, 400)
  }

  // Rango por defecto al montar
  useEffect(() => {
    setFromDate((prev) => prev || oneMonthAgoISO())
    setToDate((prev) => prev || todayISO())
    setPage(1)
    setShouldFetch(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Efecto de carga con cancelación y cierre del ciclo shouldFetch
  useEffect(() => {
    if (!shouldFetch) return
    let cancelled = false
    const ctrl = new AbortController()

    setLoading(true)
    setError(null)

    fetch(fetchUrl, { method: "GET", signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const json: ApiResponse = await r.json()
        if (cancelled) return
        setData(json.evaluations ?? [])
        setCount(json.meta?.count ?? (json.evaluations?.length ?? 0))
      })
      .catch((e) => {
        if (cancelled || e?.name === "AbortError") return
        setError(e.message || "No se pudieron cargar las evaluaciones")
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
          setShouldFetch(false)
        }
      })

    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [fetchUrl, shouldFetch])

  // Acciones
  const onSearch = () => {
    setPage(1)
    setShouldFetch(true)
  }

  const onReset = () => {
    setFromDate(oneMonthAgoISO())
    setToDate(todayISO())
    setSearchTerm("")
    setStatusLocal("")
    setLimit(12)
    setPage(1)
    setShouldFetch(true)
  }

  const totalPages = useMemo(() => {
    if (!count) return 1
    return Math.max(1, Math.ceil(count / limit))
  }, [count, limit])

  // Filtro local por estado
  const filteredData = useMemo(() => {
    if (!statusLocal) return data
    return data.filter((e) => String(e.currentStatus) === statusLocal)
  }, [data, statusLocal])

  return (
    <TooltipProvider delayDuration={150}>
      <div className={`${styles.backdrop} min-h-screen py-6`}>        
        {/* Toolbar / Hero compacto */}
        <div className="sticky top-0 z-30 border-b border-white/10 bg-[#0E2F3C]/90 backdrop-blur">
          <div className="mx-auto max-w-6xl px-3 sm:px-4">
            <div className="py-3 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link href="/home">
                    <Button variant="outline" size="sm" className={`${styles.outline} bg-white/80`}>
                      <Home className="h-4 w-4 mr-2" /> Inicio
                    </Button>
                  </Link>
                  <h2 className="text-white/90 text-base sm:text-lg font-semibold">Buscador de evaluaciones</h2>
                  <span className="text-[11px] text-white/70">{count || 0} totales</span>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={onReset} className={`${styles.outline} bg-white/80`}>
                        <RotateCcw className="h-4 w-4 mr-2" /> Reset
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Último mes y filtros limpios</TooltipContent>
                  </Tooltip>
                  <Button size="sm" onClick={onSearch} disabled={loading} className={styles.primary}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                    Buscar
                  </Button>
                </div>
              </div>

              {/* Filtros */}
              <div className="grid gap-3 sm:grid-cols-5">
                <div className="flex items-center gap-2 col-span-2">
                  <Calendar className="h-4 w-4 text-white/80" />
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} aria-label="Desde" className="bg-white/90" />
                  <span className="text-white/70 text-sm">→</span>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} aria-label="Hasta" max={todayISO()} className="bg-white/90" />
                </div>

                <div className="col-span-2">
                  <Input
                    placeholder="Buscar por paciente o término…"
                    value={searchTerm}
                    onChange={(e) => onSearchTermChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && onSearch()}
                    aria-label="Buscar"
                    className="bg-white/90"
                  />
                </div>

                <div className="flex">
                  <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); setShouldFetch(true) }}>
                    <SelectTrigger className="w-full bg-white/90">
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

              {/* Filtros avanzados (locales) */}
              <Accordion type="single" collapsible className="text-white/90">
                <AccordionItem value="advanced">
                  {/* <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2"><Filter className="h-4 w-4" /> Más filtros (opcionales)</div>
                  </AccordionTrigger> */}
                  <AccordionContent>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="sm:col-span-2">
                        <label className="text-xs text-white/80">Estado (filtro local)</label>
                        <Select value={statusLocal} onValueChange={setStatusLocal}>
                          <SelectTrigger className="w-full mt-1 bg-white/90">
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Todos</SelectItem>
                            <SelectItem value="CREATED">CREATED</SelectItem>
                            <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                            <SelectItem value="FINISHED">FINISHED</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end gap-2 sm:col-span-2">
                        <Button variant="outline" onClick={onReset} className={`${styles.outline} bg-white/80 w-full sm:w-auto`}>
                          <RotateCcw className="h-4 w-4 mr-2" /> Reset
                        </Button>
                        <Button onClick={onSearch} disabled={loading} className={`${styles.primary} w-full sm:w-auto`}>
                          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                          Buscar
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>

        {/* ===== Contenido ===== */}
        <div className="mx-auto max-w-6xl px-3 sm:px-4">
          {/* Estado y navegación */}
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-white/80">
              {loading ? "Cargando…" : `Página ${page} de ${totalPages}${filteredData.length ? ` · ${filteredData.length} resultados` : ""}`}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1 || loading} onClick={() => { setPage((p) => Math.max(1, p - 1)); setShouldFetch(true) }} className={`${styles.outline} bg-white/80`}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={loading || data.length < limit} onClick={() => { setPage((p) => p + 1); setShouldFetch(true) }} className={`${styles.outline} bg-white/80`}>
                Siguiente <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Grid de resultados */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {/* Skeletons */}
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <Card key={`sk-${i}`} className={`${styles.card} overflow-hidden`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-28 mt-2" />
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
            {!loading && filteredData.length === 0 && (
              <Card className={`${styles.card} border-dashed`}>
                <CardContent className="p-8 text-center text-slate-700">
                  No hay evaluaciones para los filtros actuales.
                </CardContent>
              </Card>
            )}

            {/* Cards */}
            {filteredData.map((ev) => (
              <Card key={ev.pk} className={`${styles.card} overflow-hidden hover:shadow-lg transition-shadow`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-slate-900 text-lg truncate">{ev.patientName || "Paciente sin nombre"}</CardTitle>
                    <Badge className={cnStatusVariant(ev.currentStatus)}>{ev.currentStatus}</Badge>
                  </div>
                  <div className="text-xs text-slate-700 mt-1">{formatDate(ev.createdAt)}</div>
                </CardHeader>

                <CardContent className="grid gap-3 text-sm text-slate-800">
                  <div className="grid grid-cols-2 gap-3">
                    <Info label="Edad" value={ev.patientAge ?? "–"} />
                    <Info label="Especialista" value={ev.specialistMail} clamp />
                  </div>
                  {/* Ocultamos IDs técnicos al usuario final */}

                  {ev.assistantAnalysis && (
                    <div className="space-y-1">
                      <div className="text-xs text-slate-600">Análisis asistente</div>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{truncateWords(ev.assistantAnalysis, 28)}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  <Separator className="my-1" />

                  <div className="flex items-center justify-between pt-1">
                    <Link href={`/evaluations/${ev.pk}`} className="text-[#0E7C86] text-sm underline underline-offset-4">
                      Ver detalle
                    </Link>
                    {ev.storage_url ? (
                      <a href={ev.storage_url} target="_blank" rel="noreferrer" className="text-sm text-slate-700 hover:text-slate-900 inline-flex items-center gap-1">
                        <Download className="h-4 w-4" /> PDF
                      </a>
                    ) : (
                      <span className="text-xs text-slate-600">Sin PDF</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Footer de navegación */}
          <div className="mt-6 flex items-center justify-between text-white/80">
            <div className="text-xs">
              {count ? `Mostrando ${Math.min(filteredData.length, limit)} de ${count}` : filteredData.length ? `Mostrando ${filteredData.length}` : ""}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1 || loading} onClick={() => { setPage((p) => Math.max(1, p - 1)); setShouldFetch(true) }} className={`${styles.outline} bg-white/80`}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={loading || data.length < limit} onClick={() => { setPage((p) => p + 1); setShouldFetch(true) }} className={`${styles.outline} bg-white/80`}>
                Siguiente <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

/* ---------- Subcomponentes ---------- */
function Info({ label, value, mono, clamp }: { label: string; value: string | number | undefined | null; mono?: boolean; clamp?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-slate-600">{label}</div>
      <p className={["text-sm font-medium text-slate-900", mono ? "font-mono break-all" : "", clamp ? "truncate" : ""].join(" ")} title={typeof value === "string" ? value : undefined}>
        {value ?? "—"}
      </p>
    </div>
  )
}
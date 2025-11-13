"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import axios from "axios"
import type { SubtestProps } from "@/types"
import { useEvaluationStore } from "@/src/stores/evaluation"

interface Node {
  id: string
  value: string
  x: number
  y: number
  isConnected: boolean
  isActive: boolean
  order: number
}

const TMT_A_SEQUENCE = ["1","2","3","4","5","6","7","8","9","10","11","12"]
const TMT_B_SEQUENCE = ["1","A","2","B","3","C","4","D","5","E","6","F"]

type Phase = "instructions" | "tmt-a" | "tmt-b" | "completed"

// ========= UI tokens =========
const styles = {
  shell: "min-h-[calc(100vh-56px)]",
  card: "bg-white/85 backdrop-blur border border-slate-200/70 shadow-xl rounded-2xl",
  primary: "bg-brand-600 hover:bg-slate-900 text-white",
  outline: "border-slate-300 text-slate-800 hover:bg-slate-50",
  kpiLabel: "text-slate-500",
  kpiValue: "text-slate-900",
}

export function ExecutiveFunctionSubtest(
  { onComplete, onPause, evaluationId: evaluationIdProp }: SubtestProps & { evaluationId?: string }
) {
  const [phase, setPhase] = useState<Phase>("instructions")
  const [nodes, setNodes] = useState<Node[]>([])
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0)
  const [errors, setErrors] = useState(0)
  const [corrections, setCorrections] = useState(0)

  // tiempos
  const [globalStart, setGlobalStart] = useState<Date | null>(null)
  const [phaseStart, setPhaseStart] = useState<Date | null>(null)
  const [tmtATime, setTmtATime] = useState(0) // ms
  const [tmtBTime, setTmtBTime] = useState(0) // ms
  const [tmtAErrors, setTmtAErrors] = useState(0)
  const [tmtBErrors, setTmtBErrors] = useState(0)

  // clicks (fase actual)
  const [phaseClicks, setPhaseClicks] = useState(0)

  // marcas ISO por fase
  const [tmtAStartIso, setTmtAStartIso] = useState<string | null>(null)
  const [tmtBStartIso, setTmtBStartIso] = useState<string | null>(null)

  const currentEvaluationID = useEvaluationStore(s => s.currentEvaluation?.id)
  const evaluationId = evaluationIdProp ?? currentEvaluationID

  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8401"
  const endpoint = new URL("/v1/evaluations/executive-functions", base).toString()

  const numberOfItemsA = TMT_A_SEQUENCE.length
  const numberOfItemsB = TMT_B_SEQUENCE.length

  // ======= Helpers =======
  const generateNodes = (sequence: string[]) => {
    const newNodes: Node[] = []
    const used: { x:number; y:number }[] = []
    sequence.forEach((value, index) => {
      let x:number, y:number, tries=0
      do {
        x = Math.random() * 500 + 50
        y = Math.random() * 400 + 50
        tries++
      } while (tries < 100 && used.some(p => Math.hypot(p.x-x, p.y-y) < 80))
      used.push({ x, y })
      newNodes.push({
        id: `node-${index}`,
        value, x, y,
        isConnected: false,
        isActive: index === 0,
        order: index,
      })
    })
    return newNodes
  }

  const startSubtest = () => {
    const now = new Date()
    setGlobalStart(now)
    setPhaseClicks(0)
    setTmtATime(0); setTmtBTime(0)
    setTmtAErrors(0); setTmtBErrors(0)
    startTMTA()
  }

  const startTMTA = () => {
    const now = new Date()
    setPhase("tmt-a")
    setNodes(generateNodes(TMT_A_SEQUENCE))
    setCurrentSequenceIndex(0)
    setErrors(0); setCorrections(0)
    setPhaseStart(now)
    setPhaseClicks(0)
    setTmtAStartIso(now.toISOString())
  }

  const startTMTB = () => {
    const now = new Date()
    setPhase("tmt-b")
    setNodes(generateNodes(TMT_B_SEQUENCE))
    setCurrentSequenceIndex(0)
    setErrors(0); setCorrections(0)
    setPhaseStart(now)
    setPhaseClicks(0)
    setTmtBStartIso(now.toISOString())
  }

  const postPhase = async (payload: any) => {
    await axios.post(endpoint, payload)
  }

  const handleNodeClick = async (clickedNode: Node) => {
    setPhaseClicks(c => c + 1)

    const currentSequence = phase === "tmt-a" ? TMT_A_SEQUENCE : TMT_B_SEQUENCE
    const expectedValue = currentSequence[currentSequenceIndex]

    if (clickedNode.value === expectedValue) {
      // correcto
      const newNodes = nodes.map(n => {
        if (n.id === clickedNode.id) return { ...n, isConnected: true, isActive: false }
        if (n.order === currentSequenceIndex + 1) return { ...n, isActive: true }
        return { ...n, isActive: false }
      })
      setNodes(newNodes)

      const nextIndex = currentSequenceIndex + 1
      setCurrentSequenceIndex(nextIndex)

      // ¿terminó la fase?
      if (nextIndex >= currentSequence.length) {
        const phaseTimeMs = phaseStart ? Date.now() - phaseStart.getTime() : 0
        const createdAtIso = new Date().toISOString()

        if (phase === "tmt-a") {
          const aErrors = errors
          setTmtATime(phaseTimeMs)
          setTmtAErrors(aErrors)

          const payloadA = {
            numberOfItems: numberOfItemsA,
            totalClicks: phaseClicks + 1,
            startAt: tmtAStartIso ?? new Date().toISOString(),
            totalErrors: aErrors,
            totalCorrect: numberOfItemsA,
            totalTime: Math.round(phaseTimeMs * 1e6), // ns
            type: "a",
            evaluationId: evaluationId,
            createdAt: createdAtIso,
          }
          try { await postPhase(payloadA) } catch (e) { console.error("POST TMT-A:", e) }

          startTMTB()
        } else {
          const bErrors = errors
          setTmtBTime(phaseTimeMs)
          setTmtBErrors(bErrors)

          const payloadB = {
            numberOfItems: numberOfItemsB,
            totalClicks: phaseClicks + 1,
            startAt: tmtBStartIso ?? new Date().toISOString(),
            totalErrors: bErrors,
            totalCorrect: numberOfItemsB,
            totalTime: Math.round(phaseTimeMs * 1e6), // ns
            type: "a+b",
            evaluationId: evaluationId,
            createdAt: createdAtIso,
          }
          try { await postPhase(payloadB) } catch (e) { console.error("POST TMT-A+B:", e) }

          setPhase("completed")

          const timeSpent = globalStart ? Math.round((Date.now() - globalStart.getTime()) / 1000) : 0
          onComplete?.({
            startTime: globalStart || new Date(),
            endTime: new Date(),
            score: 0,
            errors: tmtAErrors + bErrors,
            timeSpent,
            rawData: {
              tmtATime: Math.round((tmtATime || 0) / 1000),
              tmtBTime: Math.round(phaseTimeMs / 1000),
              tmtAErrors,
              tmtBErrors: bErrors,
              clicksA: null,
              clicksB: phaseClicks + 1,
            },
          })
        }
      }
    } else {
      // incorrecto (feedback sutil y re-activar actual)
      setErrors(e => e + 1)
      const newNodes = nodes.map(n => (n.id === clickedNode.id ? { ...n, isActive: false } : n))
      setNodes(newNodes)
      setTimeout(() => {
        setNodes(prev => prev.map(n => ({ ...n, isActive: n.order === currentSequenceIndex })))
        setCorrections(c => c + 1)
      }, 350)
    }
  }

  // ======= Render =======
  if (phase === "instructions") {
    return (
      <main className={styles.shell}>
        <section className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
          <header className="mb-6">
            <h1 className="text-slate-900 text-2xl sm:text-3xl font-semibold tracking-tight">Funciones ejecutivas — TMT</h1>
            <p className="text-slate-600 text-sm sm:text-base mt-1 max-w-2xl">
              Conecta los estímulos en secuencia. Primero TMT-A y, a continuación, TMT-A+B.
            </p>
          </header>

          <Card className={styles.card}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg sm:text-xl lg:text-2xl text-slate-900">Instrucciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg bg-slate-50 p-4 sm:p-5 border border-slate-200">
                <ul className="space-y-2 text-slate-700 text-sm sm:text-base">
                  <li>• <strong>TMT-A:</strong> haga clic 1→2→3…</li>
                  <li>• <strong>TMT-A+B:</strong> alterne número y letra (1→A→2→B…)</li>
                  <li>• Las líneas se dibujan automáticamente.</li>
                  <li>• Priorice rapidez con precisión.</li>
                </ul>
              </div>
              <div className="flex justify-end gap-3">
                {onPause && <Button variant="outline" onClick={onPause} className={styles.outline}>Pausar</Button>}
                <Button onClick={startSubtest} className={styles.primary} size="lg">Comenzar</Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    )
  }

  if (phase === "tmt-a" || phase === "tmt-b") {
    const isA = phase === "tmt-a"
    const title = isA ? "TMT-A: conecte los números" : "TMT-A+B: alterne números y letras"
    const expected = (isA ? TMT_A_SEQUENCE : TMT_B_SEQUENCE)[currentSequenceIndex] ?? "—"

    return (
      <main className={styles.shell}>
        <section className="mx-auto max-w-5xl px-4 py-6">
          {/* KPIs */}
          <Card className={`${styles.card} mb-3`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>Fase</p>
                  <p className="font-semibold text-slate-900">{isA ? "TMT-A" : "TMT-A+B"}</p>
                </div>
                <div>
                  <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>Ítem esperado</p>
                  <Badge variant="secondary" className="font-mono">{expected}</Badge>
                </div>
                <div>
                  <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>Errores</p>
                  <p className={`font-semibold ${errors ? "text-rose-600" : styles.kpiValue}`}>{errors}</p>
                </div>
                <div>
                  <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>Correcciones</p>
                  <p className={styles.kpiValue}>{corrections}</p>
                </div>
                <div className="ml-auto">
                  {onPause && <Button variant="outline" onClick={onPause} className={styles.outline}>Pausar</Button>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tablero responsivo */}
          <Card className={styles.card}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-slate-900">
                <span>{title}</span>
                <Badge variant={errors > 0 ? "destructive" : "secondary"}>Errores: {errors}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mx-auto rounded-lg bg-slate-50 border border-slate-200 shadow-sm w-full max-w-[900px] aspect-[6/5]">
                {/* SVG responsive con viewBox a 600x500 para escalar posiciones */}
                <svg viewBox="0 0 600 500" className="absolute inset-0 h-full w-full">
                  {/* rejilla sutil para orientación espacial */}
                  <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(8,53,84,0.08)" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="600" height="500" fill="url(#grid)" />

                  {/* líneas conectadas */}
                  {nodes.map((node) => {
                    const next = nodes.find(n => n.order === node.order + 1 && n.isConnected)
                    if (node.isConnected && next) {
                      return (
                        <line
                          key={`line-${node.id}`}
                          x1={node.x + 25} y1={node.y + 25}
                          x2={next.x + 25} y2={next.y + 25}
                          stroke="#0E7C86" strokeWidth="4" strokeLinecap="round"
                        />
                      )
                    }
                    return null
                  })}

                  {/* Nodos (SIN resaltar el siguiente correcto) */}
                  {nodes.map(node => {
                    // Sólo dos estados visuales: conectado (verde) o pendiente (gris).
                    const fill = node.isConnected ? "#10B981" : "#E5E7EB"
                    const stroke = node.isConnected ? "#0E7C86" : "#6B7280"
                    const textColor = node.isConnected ? "white" : "#0f172a"
                    return (
                      <g
                        key={node.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Nodo ${node.value}`}
                        onClick={() => handleNodeClick(node)}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleNodeClick(node)}
                        className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 rounded-full"
                      >
                        <circle
                          cx={node.x + 25} cy={node.y + 25} r="25"
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={2}
                        />
                        <text
                          x={node.x + 25} y={node.y + 30}
                          textAnchor="middle"
                          className="text-sm font-bold pointer-events-none select-none"
                          fill={textColor}
                        >
                          {node.value}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>

              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-slate-600">Fase: {isA ? "TMT-A" : "TMT-A+B"}</div>
                <div className="flex gap-3">
                  {onPause && <Button variant="outline" onClick={onPause} className={styles.outline}>Pausar</Button>}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.shell}>
      <section className="mx-auto max-w-4xl px-4 py-8">
        <Card className={styles.card}>
          <CardHeader>
            <CardTitle className="text-slate-900">Funciones ejecutivas (TMT) — Completado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-800">
              <div><strong>TMT-A tiempo:</strong> {Math.round(tmtATime / 1000)} s</div>
              <div><strong>TMT-A errores:</strong> {tmtAErrors}</div>
              <div><strong>TMT-A+B tiempo:</strong> {Math.round(tmtBTime / 1000)} s</div>
              <div><strong>TMT-A+B errores:</strong> {tmtBErrors}</div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

export default ExecutiveFunctionSubtest

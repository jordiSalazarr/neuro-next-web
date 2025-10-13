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

// ================== UI tokens (coherentes con el resto de subtests) ==================
const styles = {
  backdrop: "bg-[#0E2F3C]",
  card: "bg-white/80 backdrop-blur border-slate-200",
  primary: "bg-[#0E7C86] hover:bg-[#0a646c] text-white",
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
  const [globalStart, setGlobalStart] = useState<Date | null>(null) // inicio del test (A+B)
  const [phaseStart, setPhaseStart] = useState<Date | null>(null)   // inicio de fase actual
  const [tmtATime, setTmtATime] = useState(0) // ms
  const [tmtBTime, setTmtBTime] = useState(0) // ms
  const [tmtAErrors, setTmtAErrors] = useState(0)
  const [tmtBErrors, setTmtBErrors] = useState(0)

  // clicks
  const [phaseClicks, setPhaseClicks] = useState(0) // clicks solo de la fase actual

  // marcas ISO por fase
  const [tmtAStartIso, setTmtAStartIso] = useState<string | null>(null)
  const [tmtBStartIso, setTmtBStartIso] = useState<string | null>(null)

  const currentEvaluationID = useEvaluationStore(s => s.currentEvaluation?.id)
  const evaluationId = evaluationIdProp ?? currentEvaluationID

  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8401"
  const endpoint = new URL("/v1/evaluations/executive-functions", base).toString()

  const numberOfItemsA = TMT_A_SEQUENCE.length // 12
  const numberOfItemsB = TMT_B_SEQUENCE.length // 12

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
          // Métricas de A
          const aErrors = errors
          setTmtATime(phaseTimeMs)
          setTmtAErrors(aErrors)

          // POST de A (type:"a")
          const payloadA = {
            numberOfItems: numberOfItemsA,
            totalClicks: phaseClicks + 1, // este click final ya se contó arriba; +1 para asegurar
            startAt: tmtAStartIso ?? new Date().toISOString(),
            totalErrors: aErrors,
            totalCorrect: numberOfItemsA,
            totalTime: Math.round(phaseTimeMs * 1e6), // ns
            type: "a",
            evaluationId: evaluationId,
            createdAt: createdAtIso,
          }
          try { await postPhase(payloadA) } catch (e) { console.error("POST TMT-A:", e) }

          // Lanzar B
          startTMTB()
        } else {
          // Métricas de A+B (B)
          const bErrors = errors
          setTmtBTime(phaseTimeMs)
          setTmtBErrors(bErrors)

          // POST de B (type:"a+b") — NO agregamos con A, solo datos de B
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

          // cerrar test
          setPhase("completed")

          // onComplete: puedes reportar ambos tiempos/errores (solo para UI), sin agregarlos al backend
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
      // incorrecto
      setErrors(e => e + 1)
      const newNodes = nodes.map(n => (n.id === clickedNode.id ? { ...n, isActive: false } : n))
      setNodes(newNodes)
      setTimeout(() => {
        setNodes(prev => prev.map(n => ({ ...n, isActive: n.order === currentSequenceIndex })))
        setCorrections(c => c + 1)
      }, 400)
    }
  }

  // ------- Render -------
  if (phase === "instructions") {
    return (
      <div className={`min-h-[70vh] w-full ${styles.backdrop} py-8 sm:py-10 px-4`}>
        <div className="mx-auto max-w-4xl">
          <header className="mb-6">
            <h1 className="text-white/90 text-2xl sm:text-3xl font-semibold tracking-tight">Funciones Ejecutivas — TMT</h1>
            <p className="text-white/70 text-sm sm:text-base mt-1 max-w-2xl">
              Prueba de conexión secuencial de estímulos visuales. Realice TMT-A y, a continuación, TMT-A+B.
            </p>
          </header>

          <Card className={`${styles.card} shadow-xl`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg sm:text-xl lg:text-2xl text-slate-900">Instrucciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg bg-slate-50 p-4 sm:p-5 border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-3 text-sm sm:text-base">¿Qué debe hacer?</h4>
                <ul className="space-y-2 text-slate-700 text-sm sm:text-base">
                  <li>• <strong>TMT-A:</strong> Conecte los números haciendo clic en orden (1→2→3…)</li>
                  <li>• <strong>TMT-A+B:</strong> Alterne número y letra (1→A→2→B…)</li>
                  <li>• Las líneas entre puntos se generan de forma automática.</li>
                  <li>• Trabaje lo más rápido posible evitando errores.</li>
                </ul>
              </div>
              <div className="flex justify-end gap-3">
                {onPause && (
                  <Button variant="outline" onClick={onPause} className={styles.outline}>Pausar</Button>
                )}
                <Button onClick={startSubtest} className={styles.primary} size="lg">Comenzar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (phase === "tmt-a" || phase === "tmt-b") {
    const isA = phase === "tmt-a"
    const title = isA ? "TMT-A: Conecte los números" : "TMT-A+B: Alterne números y letras"

    return (
      <div className={`min-h-[70vh] w-full ${styles.backdrop} py-6 px-4`}>
        <div className="mx-auto max-w-5xl">
          {/* Barra superior con KPIs */}
          <Card className={`${styles.card} shadow-lg mb-3`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>Fase</p>
                  <p className="font-semibold text-slate-900">{isA ? "TMT-A" : "TMT-A+B"}</p>
                </div>
                <div>
                  <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>Ítem esperado</p>
                  <p className="font-mono text-sm sm:text-base text-slate-900">{
                    (isA ? TMT_A_SEQUENCE : TMT_B_SEQUENCE)[currentSequenceIndex] ?? "—"
                  }</p>
                </div>
                <div>
                  <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>Errores</p>
                  <p className={`font-semibold ${errors > 0 ? "text-rose-600" : styles.kpiValue}`}>{errors}</p>
                </div>
                <div>
                  <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>Correcciones</p>
                  <p className={styles.kpiValue}>{corrections}</p>
                </div>
                <div className="ml-auto">
                  {onPause && (
                    <Button variant="outline" onClick={onPause} className={styles.outline}>Pausar</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${styles.card} shadow-xl`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-slate-900">
                <span>{title}</span>
                <Badge variant={errors > 0 ? "destructive" : "secondary"}>Errores: {errors}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mx-auto rounded-lg bg-slate-50 border border-slate-200 shadow-sm" style={{ height: "500px", width: "600px" }}>
                <svg width="600" height="500" className="absolute inset-0">
                  {/* líneas entre nodos ya conectados */}
                  {nodes.map((node, index) => {
                    if (node.isConnected && index < nodes.length - 1) {
                      const next = nodes.find(n => n.order === node.order + 1 && n.isConnected)
                      if (next) {
                        return (
                          <line
                            key={`line-${node.id}`}
                            x1={node.x + 25} y1={node.y + 25}
                            x2={next.x + 25} y2={next.y + 25}
                            stroke="#0E7C86" strokeWidth="3" strokeLinecap="round"
                          />
                        )
                      }
                    }
                    return null
                  })}

                  {/* nodos */}
                  {nodes.map(node => (
                    <g key={node.id}>
                      <circle
                        cx={node.x + 25} cy={node.y + 25} r="25"
                        fill={node.isConnected ? "#10B981" : "#E5E7EB"}
                        stroke="#6B7280" strokeWidth="2"
                        className="cursor-pointer hover:opacity-90 transition"
                        onClick={() => handleNodeClick(node)}
                      />
                      <text
                        x={node.x + 25} y={node.y + 30}
                        textAnchor="middle"
                        className="text-sm font-bold pointer-events-none select-none"
                        fill={node.isConnected ? "white" : "#0f172a"}
                      >
                        {node.value}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>

              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-slate-600">Fase: {isA ? "TMT-A" : "TMT-A+B"}</div>
                <div className="flex gap-3">
                  {onPause && (
                    <Button variant="outline" onClick={onPause} className={styles.outline}>Pausar</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.backdrop} min-h-[60vh] py-8 px-4`}>
      <div className="mx-auto max-w-4xl">
        <Card className={`${styles.card} shadow-xl`}>
          <CardHeader>
            <CardTitle className="text-slate-900">Funciones Ejecutivas (TMT) — Completado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-800">
              <div><strong>TMT-A tiempo:</strong> {Math.round(tmtATime / 1000)}s</div>
              <div><strong>TMT-A errores:</strong> {tmtAErrors}</div>
              <div><strong>TMT-A+B tiempo:</strong> {Math.round(tmtBTime / 1000)}s</div>
              <div><strong>TMT-A+B errores:</strong> {tmtBErrors}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

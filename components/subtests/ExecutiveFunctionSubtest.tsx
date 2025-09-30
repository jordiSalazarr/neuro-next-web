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
    // payload debe seguir CreateExecutiveFunctionsSubtestCommand
    // {
    //   numberOfItems, totalClicks, startAt, totalErrors, totalCorrect,
    //   totalTime, type: "a"|"a+b", evaluationId, createdAt
    // }
    await axios.post(endpoint, payload)
  }

  const handleNodeClick = async (clickedNode: Node) => {
    // contar todos los clics de la fase
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
            score: 0, // si quieres, calcula un score visual solo para la UI
            errors: tmtAErrors + bErrors,
            timeSpent,
            rawData: {
              tmtATime: Math.round((tmtATime || 0) / 1000),
              tmtBTime: Math.round(phaseTimeMs / 1000),
              tmtAErrors,
              tmtBErrors: bErrors,
              clicksA: null, // si quieres conservar, guarda phaseClicks al cerrar A en un state aparte
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
      <Card>
        <CardHeader>
          <CardTitle>Instrucciones - TMT A / TMT A+B</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-orange-50 p-6 rounded-lg">
            <h4 className="font-semibold text-orange-900 mb-3">¿Qué debe hacer?</h4>
            <ul className="space-y-2 text-orange-800">
              <li>• <strong>TMT-A:</strong> Conecte los números en orden (1→2→3...)</li>
              <li>• <strong>TMT-A+B:</strong> Alterne número y letra (1→A→2→B→...)</li>
              <li>• Trabaje lo más rápido posible sin cometer errores</li>
            </ul>
          </div>
          <Button onClick={startSubtest} className="w-full" size="lg">Comenzar</Button>
        </CardContent>
      </Card>
    )
  }

  if (phase === "tmt-a" || phase === "tmt-b") {
    const isA = phase === "tmt-a"
    const title = isA ? "TMT-A: Conecte los números" : "TMT-A+B: Alterne números y letras"

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{title}</span>
              <div className="flex gap-2">
                <Badge variant={errors > 0 ? "destructive" : "secondary"}>Errores: {errors}</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative bg-gray-50 rounded-lg" style={{ height: "500px", width: "600px" }}>
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
                          stroke="#3B82F6" strokeWidth="2"
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
                      className="cursor-pointer hover:opacity-80"
                      onClick={() => handleNodeClick(node)}
                    />
                    <text
                      x={node.x + 25} y={node.y + 30}
                      textAnchor="middle"
                      className="text-sm font-bold pointer-events-none select-none"
                      fill={node.isConnected ? "white" : "black"}
                    >
                      {node.value}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">Fase: {isA ? "TMT-A" : "TMT-A+B"}</div>
              <div className="flex gap-4">
                <Button variant="outline" onClick={onPause}>Pausar</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funciones Ejecutivas (TMT) Completado</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-orange-50 p-4 rounded-lg text-sm grid grid-cols-2 gap-4">
          <div><strong>TMT-A tiempo:</strong> {Math.round(tmtATime / 1000)}s</div>
          <div><strong>TMT-A errores:</strong> {tmtAErrors}</div>
          <div><strong>TMT-A+B tiempo:</strong> {Math.round(tmtBTime / 1000)}s</div>
          <div><strong>TMT-A+B errores:</strong> {tmtBErrors}</div>
        </div>
      </CardContent>
    </Card>
  )
}

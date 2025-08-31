"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import axios from "axios"
import type { SubtestProps } from "@/types"
import { useEvaluationStore } from "@/stores/evaluation"

interface Node {
  id: string
  value: string
  x: number
  y: number
  isConnected: boolean
  isActive: boolean
  order: number
}

const TMT_A_SEQUENCE = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
const TMT_B_SEQUENCE = ["1", "A", "2", "B", "3", "C", "4", "D", "5", "E", "6", "F"]

export function ExecutiveFunctionSubtest({ onComplete, onPause, evaluationId }: SubtestProps & { evaluationId: string }) {
  const [phase, setPhase] = useState<"instructions" | "tmt-a" | "tmt-b" | "completed">("instructions")
  const [nodes, setNodes] = useState<Node[]>([])
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0)
  const [errors, setErrors] = useState(0)
  const [corrections, setCorrections] = useState(0)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [phaseStartTime, setPhaseStartTime] = useState<Date | null>(null)
  const [tmtATime, setTmtATime] = useState(0) // ms
  const [tmtBTime, setTmtBTime] = useState(0) // ms
  const [tmtAErrors, setTmtAErrors] = useState(0)
  const [tmtBErrors, setTmtBErrors] = useState(0)
  const currentEvaluationID = useEvaluationStore(state => state.currentEvaluation?.id)

  // NUEVO: contadores globales
  const [totalClicks, setTotalClicks] = useState(0)
  const [startAtIso, setStartAtIso] = useState<string | null>(null)

  const numberOfItems = TMT_A_SEQUENCE.length + TMT_B_SEQUENCE.length // 24

  const generateNodes = (sequence: string[]) => {
    const newNodes: Node[] = []
    const usedPositions: { x: number; y: number }[] = []

    sequence.forEach((value, index) => {
      let x:number, y:number
      let attempts = 0
      do {
        x = Math.random() * 500 + 50 // Entre 50 y 550
        y = Math.random() * 400 + 50 // Entre 50 y 450
        attempts++
      } while (attempts < 100 && usedPositions.some((pos) => Math.sqrt((pos.x - x) ** 2 + (pos.y - y) ** 2) < 80))

      usedPositions.push({ x, y })
      newNodes.push({
        id: `node-${index}`,
        value,
        x,
        y,
        isConnected: false,
        isActive: index === 0,
        order: index,
      })
    })

    return newNodes
  }

  const startSubtest = () => {
    setPhase("tmt-a")
    const now = new Date()
    setStartTime(now)
    setStartAtIso(now.toISOString())
    setTotalClicks(0)
    setTmtATime(0)
    setTmtBTime(0)
    setTmtAErrors(0)
    setTmtBErrors(0)
    startTMTA()
  }

  const startTMTA = () => {
    const tmtANodes = generateNodes(TMT_A_SEQUENCE)
    setNodes(tmtANodes)
    setCurrentSequenceIndex(0)
    setErrors(0)
    setCorrections(0)
    setPhaseStartTime(new Date())
  }

  const startTMTB = () => {
    setPhase("tmt-b")
    const tmtBNodes = generateNodes(TMT_B_SEQUENCE)
    setNodes(tmtBNodes)
    setCurrentSequenceIndex(0)
    setErrors(0)
    setCorrections(0)
    setPhaseStartTime(new Date())
  }

  const handleNodeClick = (clickedNode: Node) => {
    // contar todos los clics
    setTotalClicks((c) => c + 1)

    const currentSequence = phase === "tmt-a" ? TMT_A_SEQUENCE : TMT_B_SEQUENCE
    const expectedValue = currentSequence[currentSequenceIndex]

    if (clickedNode.value === expectedValue) {
      // Click correcto
      const newNodes = nodes.map((node) => {
        if (node.id === clickedNode.id) {
          return { ...node, isConnected: true, isActive: false }
        }
        if (node.order === currentSequenceIndex + 1) {
          return { ...node, isActive: true }
        }
        return { ...node, isActive: false }
      })

      setNodes(newNodes)
      setCurrentSequenceIndex((prev) => prev + 1)

      // ¿terminó la secuencia de la fase?
      if (currentSequenceIndex + 1 >= currentSequence.length) {
        const phaseTime = phaseStartTime ? Date.now() - phaseStartTime.getTime() : 0

        if (phase === "tmt-a") {
          setTmtATime(phaseTime)
          setTmtAErrors(errors)
          startTMTB()
        } else {
          setTmtBTime(phaseTime)
          setTmtBErrors(errors)
          completeSubtest()
        }
      }
    } else {
      // Click incorrecto
      setErrors((prev) => prev + 1)

      const newNodes = nodes.map((node) => {
        if (node.id === clickedNode.id) {
          return { ...node, isActive: false }
        }
        return node
      })
      setNodes(newNodes)

      setTimeout(() => {
        setNodes((prevNodes) =>
          prevNodes.map((node) => ({
            ...node,
            isActive: node.order === currentSequenceIndex,
          })),
        )
        setCorrections((prev) => prev + 1)
      }, 500)
    }
  }

  const completeSubtest = async () => {
    setPhase("completed")

    const totalTimeMs = tmtATime + tmtBTime
    const totalErrors = tmtAErrors + tmtBErrors
    const timeSpent = startTime ? (Date.now() - startTime.getTime()) / 1000 : 0

    // Puntuación (mantengo tu lógica)
    const timeScore = Math.max(0, 100 - totalTimeMs / 1000 / 2)
    const errorPenalty = totalErrors * 5
    const finalScore = Math.max(0, timeScore - errorPenalty)

    // ---- JSON requerido para el backend ----
    const payload = {
      numberOfItems,                          // 24 (12 + 12)
      totalClicks,                            // correctos + errores
      startAt: startAtIso ?? new Date().toISOString(),
      totalErrors,
      totalCorrect: numberOfItems,
      totalTime: Math.round(totalTimeMs * 1e6), // ns
      type: "a+b",
      evaluationId:currentEvaluationID,                           // Asegúrate de pasar este prop
      createdAt: new Date().toISOString(),
    }

    // POST final (normalizo base URL por si lleva / final)
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8401"
      const url = new URL("/v1/evaluations/executive-functions", base)
      await axios.post(url.toString(), payload)

      // Callback externo (si tu flujo lo usa)
      onComplete({
        startTime: startTime!,
        endTime: new Date(),
        score: Math.round(finalScore),
        errors: totalErrors,
        timeSpent: Math.round(timeSpent),
        rawData: {
          tmtATime: Math.round(tmtATime / 1000),
          tmtBTime: Math.round(tmtBTime / 1000),
          tmtAErrors,
          tmtBErrors,
          totalTime: Math.round(totalTimeMs / 1000),
          totalErrors,
          corrections: corrections,
          totalClicks,
        },
      })
    } catch (err) {
      // Si falla el POST, igualmente disparamos el onComplete para que el caller pueda reaccionar
      console.error("Error posting executive-functions:", err)
      onComplete({
        startTime: startTime!,
        endTime: new Date(),
        score: Math.round(finalScore),
        errors: totalErrors,
        timeSpent: Math.round(timeSpent),
        rawData: {
          tmtATime: Math.round(tmtATime / 1000),
          tmtBTime: Math.round(tmtBTime / 1000),
          tmtAErrors,
          tmtBErrors,
          totalTime: Math.round(totalTimeMs / 1000),
          totalErrors,
          corrections: corrections,
          totalClicks,
          postError: true,
        },
      })
    }
  }

  // ------- Render (sin cambios visuales) -------
  if (phase === "instructions") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Instrucciones - Funciones Ejecutivas TMT A/B</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-orange-50 p-6 rounded-lg">
            <h4 className="font-semibold text-orange-900 mb-3">¿Qué debe hacer?</h4>
            <ul className="space-y-2 text-orange-800">
              <li>• <strong>TMT-A:</strong> Conecte los números en orden (1→2→3→4...)</li>
              <li>• <strong>TMT-B:</strong> Alterne entre números y letras (1→A→2→B→3→C...)</li>
              <li>• Haga click en los círculos en el orden correcto</li>
              <li>• Trabaje lo más rápido posible sin cometer errores</li>
              <li>• Si se equivoca, continúe desde donde estaba</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-yellow-800"><strong>Duración estimada:</strong> 7 minutos</p>
          </div>

          <Button onClick={startSubtest} className="w-full" size="lg">
            Comenzar Test TMT
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (phase === "tmt-a" || phase === "tmt-b") {
    const currentSequence = phase === "tmt-a" ? TMT_A_SEQUENCE : TMT_B_SEQUENCE

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{phase === "tmt-a" ? "TMT-A: Conecte los números" : "TMT-B: Alterne números y letras"}</span>
              <div className="flex gap-2">
                <Badge variant={errors > 0 ? "destructive" : "secondary"}>Errores: {errors}</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative bg-gray-50 rounded-lg" style={{ height: "500px", width: "600px" }}>
              <svg width="600" height="500" className="absolute inset-0">
                {/* Líneas de conexión */}
                {nodes.map((node, index) => {
                  if (node.isConnected && index < nodes.length - 1) {
                    const nextConnectedNode = nodes.find((n) => n.order === node.order + 1 && n.isConnected)
                    if (nextConnectedNode) {
                      return (
                        <line
                          key={`line-${node.id}`}
                          x1={node.x + 25}
                          y1={node.y + 25}
                          x2={nextConnectedNode.x + 25}
                          y2={nextConnectedNode.y + 25}
                          stroke="#3B82F6"
                          strokeWidth="2"
                        />
                      )
                    }
                  }
                  return null
                })}

                {/* Nodos */}
                {nodes.map((node) => (
                  <g key={node.id}>
                    <circle
                      cx={node.x + 25}
                      cy={node.y + 25}
                      r="25"
                      fill={node.isConnected ? "#10B981" : "#E5E7EB"}
                      stroke="#6B7280"
                      strokeWidth="2"
                      className="cursor-pointer hover:opacity-80"
                      onClick={() => handleNodeClick(node)}
                    />
                    <text
                      x={node.x + 25}
                      y={node.y + 30}
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
              <div className="text-sm text-gray-600">Fase: {phase === "tmt-a" ? "TMT-A" : "TMT-B"}</div>
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
        <CardTitle>Test de Funciones Ejecutivas Completado</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-center text-gray-600 mb-4">El test TMT A/B ha finalizado. Los resultados se han guardado.</p>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>TMT-A tiempo:</strong> {Math.round(tmtATime / 1000)}s</div>
            <div><strong>TMT-B tiempo:</strong> {Math.round(tmtBTime / 1000)}s</div>
            <div><strong>TMT-A errores:</strong> {tmtAErrors}</div>
            <div><strong>TMT-B errores:</strong> {tmtBErrors}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

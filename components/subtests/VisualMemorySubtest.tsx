"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { SubtestProps } from "@/types"

interface Shape {
  id: number
  type: "circle" | "square" | "triangle"
  x: number
  y: number
  size: number
  color: string
}

interface DrawingStroke {
  points: { x: number; y: number }[]
  timestamp: number
  order: number
}

const SHAPES: Shape[] = [
  { id: 1, type: "circle", x: 100, y: 100, size: 60, color: "#3B82F6" },
  { id: 2, type: "square", x: 250, y: 150, size: 50, color: "#EF4444" },
  { id: 3, type: "triangle", x: 150, y: 250, size: 55, color: "#10B981" },
]

const DISPLAY_TIME = 10 // 10 segundos para memorizar
const TOTAL_TRIALS = 3

export function VisualMemorySubtest({ onComplete, onPause }: SubtestProps) {
  const [phase, setPhase] = useState<"instructions" | "study" | "recall" | "completed">("instructions")
  const [currentTrial, setCurrentTrial] = useState(0)
  const [studyTimeRemaining, setStudyTimeRemaining] = useState(DISPLAY_TIME)
  const [isDrawing, setIsDrawing] = useState(false)
  const [strokes, setStrokes] = useState<DrawingStroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([])
  const [strokeOrder, setStrokeOrder] = useState(0)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [trialResults, setTrialResults] = useState<any[]>([])

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const studyCanvasRef = useRef<HTMLCanvasElement>(null)

  // Timer para la fase de estudio
  useEffect(() => {
    if (phase !== "study") return

    const interval = setInterval(() => {
      setStudyTimeRemaining((prev) => {
        if (prev <= 1) {
          setPhase("recall")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [phase])

  // Dibujar las figuras en el canvas de estudio
  useEffect(() => {
    if (phase === "study" && studyCanvasRef.current) {
      const canvas = studyCanvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      SHAPES.forEach((shape) => {
        ctx.fillStyle = shape.color
        ctx.strokeStyle = "#000"
        ctx.lineWidth = 2

        switch (shape.type) {
          case "circle":
            ctx.beginPath()
            ctx.arc(shape.x, shape.y, shape.size / 2, 0, 2 * Math.PI)
            ctx.fill()
            ctx.stroke()
            break
          case "square":
            ctx.fillRect(shape.x - shape.size / 2, shape.y - shape.size / 2, shape.size, shape.size)
            ctx.strokeRect(shape.x - shape.size / 2, shape.y - shape.size / 2, shape.size, shape.size)
            break
          case "triangle":
            ctx.beginPath()
            ctx.moveTo(shape.x, shape.y - shape.size / 2)
            ctx.lineTo(shape.x - shape.size / 2, shape.y + shape.size / 2)
            ctx.lineTo(shape.x + shape.size / 2, shape.y + shape.size / 2)
            ctx.closePath()
            ctx.fill()
            ctx.stroke()
            break
        }
      })
    }
  }, [phase, studyTimeRemaining])

  // Redibujar el canvas de dibujo
  useEffect(() => {
    if (phase === "recall" && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Dibujar trazos completados
      strokes.forEach((stroke) => {
        if (stroke.points.length > 1) {
          ctx.strokeStyle = "#000"
          ctx.lineWidth = 2
          ctx.lineCap = "round"
          ctx.lineJoin = "round"

          ctx.beginPath()
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
          stroke.points.forEach((point) => {
            ctx.lineTo(point.x, point.y)
          })
          ctx.stroke()
        }
      })

      // Dibujar trazo actual
      if (currentStroke.length > 1) {
        ctx.strokeStyle = "#3B82F6"
        ctx.lineWidth = 2
        ctx.lineCap = "round"
        ctx.lineJoin = "round"

        ctx.beginPath()
        ctx.moveTo(currentStroke[0].x, currentStroke[0].y)
        currentStroke.forEach((point) => {
          ctx.lineTo(point.x, point.y)
        })
        ctx.stroke()
      }
    }
  }, [phase, strokes, currentStroke])

  const startSubtest = () => {
    setPhase("study")
    setStartTime(new Date())
    setCurrentTrial(0)
    setTrialResults([])
  }

  const startStudyPhase = () => {
    setStudyTimeRemaining(DISPLAY_TIME)
    setPhase("study")
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phase !== "recall") return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setIsDrawing(true)
    setCurrentStroke([{ x, y }])
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || phase !== "recall") return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setCurrentStroke((prev) => [...prev, { x, y }])
  }

  const handleMouseUp = () => {
    if (!isDrawing) return

    setIsDrawing(false)
    if (currentStroke.length > 1) {
      const newStroke: DrawingStroke = {
        points: currentStroke,
        timestamp: Date.now(),
        order: strokeOrder,
      }
      setStrokes((prev) => [...prev, newStroke])
      setStrokeOrder((prev) => prev + 1)
    }
    setCurrentStroke([])
  }

  const clearCanvas = () => {
    setStrokes([])
    setCurrentStroke([])
    setStrokeOrder(0)
  }

  const completeCurrentTrial = () => {
    const trialResult = {
      trial: currentTrial + 1,
      strokes: strokes.length,
      drawingTime: strokes.length > 0 ? strokes[strokes.length - 1].timestamp - strokes[0].timestamp : 0,
      strokeData: strokes,
    }

    setTrialResults((prev) => [...prev, trialResult])

    if (currentTrial < TOTAL_TRIALS - 1) {
      // Siguiente ensayo
      setCurrentTrial((prev) => prev + 1)
      clearCanvas()
      startStudyPhase()
    } else {
      // Completar subtest
      completeSubtest()
    }
  }

  const completeSubtest = () => {
    setPhase("completed")

    const totalStrokes = trialResults.reduce((sum, trial) => sum + trial.strokes, 0)
    const avgDrawingTime = trialResults.reduce((sum, trial) => sum + trial.drawingTime, 0) / trialResults.length
    const timeSpent = startTime ? (Date.now() - startTime.getTime()) / 1000 : 0

    // Puntuación simple basada en número de trazos (menos trazos = mejor)
    const score = Math.max(0, 100 - totalStrokes * 2)

    onComplete({
      startTime: startTime!,
      endTime: new Date(),
      score: Math.round(score),
      errors: Math.max(0, totalStrokes - SHAPES.length * TOTAL_TRIALS),
      timeSpent: Math.round(timeSpent),
      rawData: {
        trials: trialResults,
        totalStrokes,
        averageDrawingTime: Math.round(avgDrawingTime),
        shapesShown: SHAPES,
      },
    })
  }

  if (phase === "instructions") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Instrucciones - Memoria Visual BVMT-R</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-purple-50 p-6 rounded-lg">
            <h4 className="font-semibold text-purple-900 mb-3">¿Qué debe hacer?</h4>
            <ul className="space-y-2 text-purple-800">
              <li>• Se mostrarán 3 figuras geométricas durante 10 segundos</li>
              <li>• Memorice las formas, colores y posiciones</li>
              <li>• Después dibuje las figuras en el mismo lugar que las vio</li>
              <li>• Use el mouse para dibujar en el lienzo</li>
              <li>• Repetirá este proceso 3 veces</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-yellow-800">
              <strong>Duración estimada:</strong> 8 minutos
            </p>
          </div>

          <Button onClick={startSubtest} className="w-full" size="lg">
            Comenzar Test de Memoria Visual
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (phase === "study") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                Ensayo {currentTrial + 1} de {TOTAL_TRIALS} - Memorice las figuras
              </span>
              <Badge variant="default" className="text-lg px-3 py-1">
                {studyTimeRemaining}s
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-4">
              <Progress value={((DISPLAY_TIME - studyTimeRemaining) / DISPLAY_TIME) * 100} className="h-2" />
            </div>
            <div className="flex justify-center">
              <canvas
                ref={studyCanvasRef}
                width={400}
                height={350}
                className="border-2 border-gray-300 rounded-lg bg-white"
              />
            </div>
            <p className="text-center text-gray-600 mt-4">
              Memorice las formas, colores y posiciones. Tiempo restante: {studyTimeRemaining} segundos
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (phase === "recall") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                Ensayo {currentTrial + 1} de {TOTAL_TRIALS} - Dibuje las figuras
              </span>
              <div className="flex gap-2">
                <Badge variant="outline">Trazos: {strokes.length}</Badge>
                <Button variant="outline" size="sm" onClick={clearCanvas}>
                  Limpiar
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center mb-4">
              <canvas
                ref={canvasRef}
                width={400}
                height={350}
                className="border-2 border-gray-300 rounded-lg bg-white cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>
            <p className="text-center text-gray-600 mb-4">
              Dibuje las figuras que vio en las mismas posiciones. Use el mouse para dibujar.
            </p>
            <div className="flex justify-between">
              <Button variant="outline" onClick={onPause}>
                Pausar
              </Button>
              <Button onClick={completeCurrentTrial}>
                {currentTrial < TOTAL_TRIALS - 1 ? "Siguiente Ensayo" : "Finalizar Test"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test de Memoria Visual Completado</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-center text-gray-600 mb-4">
          El test de memoria visual ha finalizado. Los resultados se han guardado.
        </p>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Ensayos completados:</strong> {TOTAL_TRIALS}
            </div>
            <div>
              <strong>Total de trazos:</strong> {trialResults.reduce((sum, trial) => sum + trial.strokes, 0)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

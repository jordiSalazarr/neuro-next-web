"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { SubtestProps } from "@/types"

interface DrawingStroke {
  points: { x: number; y: number }[]
  timestamp: number
  order: number
}

const CLOCK_TIMES = [
  { time: "11:10", description: "once y diez" },
  { time: "3:15", description: "tres y cuarto" },
  { time: "8:20", description: "ocho y veinte" },
]

export function VisuospatialSubtest({ onComplete, onPause }: SubtestProps) {
  const [phase, setPhase] = useState<"instructions" | "drawing" | "completed">("instructions")
  const [currentClockIndex, setCurrentClockIndex] = useState(0)
  const [isDrawing, setIsDrawing] = useState(false)
  const [strokes, setStrokes] = useState<DrawingStroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([])
  const [strokeOrder, setStrokeOrder] = useState(0)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [drawingStartTime, setDrawingStartTime] = useState<Date | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Redibujar el canvas
  useEffect(() => {
    if (phase === "drawing" && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Dibujar círculo guía (opcional)
      ctx.strokeStyle = "#E5E7EB"
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.arc(200, 200, 150, 0, 2 * Math.PI)
      ctx.stroke()
      ctx.setLineDash([])

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
    setPhase("drawing")
    setStartTime(new Date())
    setDrawingStartTime(new Date())
    setCurrentClockIndex(0)
    setStrokes([])
    setStrokeOrder(0)
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phase !== "drawing") return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setIsDrawing(true)
    setCurrentStroke([{ x, y }])
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || phase !== "drawing") return

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

  const nextClock = () => {
    if (currentClockIndex < CLOCK_TIMES.length - 1) {
      setCurrentClockIndex((prev) => prev + 1)
      clearCanvas()
      setDrawingStartTime(new Date())
    } else {
      completeSubtest()
    }
  }

  const completeSubtest = () => {
    setPhase("completed")

    const drawingTime = drawingStartTime ? Date.now() - drawingStartTime.getTime() : 0
    const timeSpent = startTime ? (Date.now() - startTime.getTime()) / 1000 : 0

    // Puntuación simple basada en número de trazos y tiempo
    const strokeScore = Math.max(0, 100 - strokes.length * 2)
    const timeScore = Math.max(0, 100 - drawingTime / 1000 / 5)
    const finalScore = (strokeScore + timeScore) / 2

    onComplete({
      startTime: startTime!,
      endTime: new Date(),
      score: Math.round(finalScore),
      errors: Math.max(0, strokes.length - 12), // Asumiendo ~12 trazos para un reloj completo
      timeSpent: Math.round(timeSpent),
      rawData: {
        clocksDrawn: currentClockIndex + 1,
        totalStrokes: strokes.length,
        drawingTime: Math.round(drawingTime / 1000),
        strokeData: strokes,
        clockTimes: CLOCK_TIMES.slice(0, currentClockIndex + 1),
      },
    })
  }

  if (phase === "instructions") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Instrucciones - Test del Reloj (CDT)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-red-50 p-6 rounded-lg">
            <h4 className="font-semibold text-red-900 mb-3">¿Qué debe hacer?</h4>
            <ul className="space-y-2 text-red-800">
              <li>• Se le pedirá dibujar un reloj que muestre una hora específica</li>
              <li>• Dibuje un círculo para representar la cara del reloj</li>
              <li>• Coloque todos los números del 1 al 12 en las posiciones correctas</li>
              <li>• Dibuje las manecillas (hora y minutos) señalando la hora indicada</li>
              <li>• Use el mouse para dibujar en el lienzo</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-yellow-800">
              <strong>Duración estimada:</strong> 5 minutos
            </p>
          </div>

          <Button onClick={startSubtest} className="w-full" size="lg">
            Comenzar Test del Reloj
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (phase === "drawing") {
    const currentClock = CLOCK_TIMES[currentClockIndex]

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Dibuje un reloj que marque las {currentClock.description}</span>
              <div className="flex gap-2">
                <Badge variant="default" className="text-lg px-3 py-1">
                  {currentClock.time}
                </Badge>
                <Badge variant="outline">Trazos: {strokes.length}</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center mb-4">
              <canvas
                ref={canvasRef}
                width={400}
                height={400}
                className="border-2 border-gray-300 rounded-lg bg-white cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>

            <div className="text-center mb-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Instrucciones específicas:</h4>
                <p className="text-blue-800">
                  Dibuje un reloj completo que muestre las <strong>{currentClock.time}</strong> (
                  {currentClock.description})
                </p>
                <p className="text-sm text-blue-700 mt-2">
                  Incluya: círculo, números 1-12, manecilla corta (horas) y manecilla larga (minutos)
                </p>
              </div>
            </div>

            <div className="flex justify-between">
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearCanvas}>
                  Limpiar
                </Button>
                <Button variant="outline" onClick={onPause}>
                  Pausar
                </Button>
              </div>
              <Button onClick={nextClock}>
                {currentClockIndex < CLOCK_TIMES.length - 1 ? "Siguiente Reloj" : "Finalizar Test"}
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
        <CardTitle>Test del Reloj Completado</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-center text-gray-600 mb-4">
          El test del reloj ha finalizado. Los resultados se han guardado.
        </p>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Relojes dibujados:</strong> {currentClockIndex + 1}
            </div>
            <div>
              <strong>Total de trazos:</strong> {strokes.length}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

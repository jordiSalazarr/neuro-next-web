 "use client"

import { useState, useEffect, useRef, useCallback } from "react"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { SubtestProps } from "@/types"
import { useEvaluationStore } from "@/stores/evaluation"

type ShapeType = "circle" | "square" | "triangle"

interface Shape {
  id: number
  type: ShapeType
  x: number
  y: number
  size: number
  color: string
}

interface DrawingPoint { x: number; y: number }
interface DrawingStroke {
  points: DrawingPoint[]
  timestamp: number
  order: number
}

type Phase = "instructions" | "study" | "recall" | "evaluation" | "completed"

interface VisualMemorySubtestProps extends SubtestProps {
  /** Base URL del backend; si no se pasa, se usa NEXT_PUBLIC_API_BASE_URL */
  apiBaseUrl?: string
  /** Ruta relativa del endpoint; por defecto "/visual-memory-subtest" */
  endpointPath?: string
}

const SHAPES: Shape[] = [
  { id: 1, type: "circle", x: 100, y: 100, size: 60, color: "#3B82F6" },
  { id: 2, type: "square", x: 250, y: 150, size: 50, color: "#EF4444" },
  { id: 3, type: "triangle", x: 150, y: 250, size: 55, color: "#10B981" },
]

const DISPLAY_TIME = 10 // segundos para memorizar

export function VisualMemorySubtest({
  onComplete,
  onPause,
  apiBaseUrl,
  endpointPath = "/v1/evaluations/visual-memory",
}: VisualMemorySubtestProps) {
  const [phase, setPhase] = useState<Phase>("instructions")
  const [studyTimeRemaining, setStudyTimeRemaining] = useState(DISPLAY_TIME)

  const [isDrawing, setIsDrawing] = useState(false)
  const [strokes, setStrokes] = useState<DrawingStroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<DrawingPoint[]>([])
  const [strokeOrder, setStrokeOrder] = useState(0)
const currentEvaluationId = useEvaluationStore(state=>state.currentEvaluation?.id)
  const [score, setScore] = useState<string>("") // "0" | "1" | "2"
  const [note, setNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Canvas refs
  const studyCanvasRef = useRef<HTMLCanvasElement>(null)       // para fase de estudio
  const drawCanvasRef = useRef<HTMLCanvasElement>(null)        // dibujo del paciente (recall/evaluation)
  const originalCanvasRef = useRef<HTMLCanvasElement>(null)    // figura original en evaluación

  // Helper para pintar las figuras originales en cualquier canvas
  const drawOriginalShapes = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return
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
  }, [])

  // Timer fase de estudio
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

  // Pintar figuras durante la fase de estudio
  useEffect(() => {
    if (phase === "study") {
      drawOriginalShapes(studyCanvasRef.current)
    }
  }, [phase, studyTimeRemaining, drawOriginalShapes])

  // Pintar las figuras originales en evaluación (lado izquierdo)
  useEffect(() => {
    if (phase === "evaluation") {
      drawOriginalShapes(originalCanvasRef.current)
    }
  }, [phase, drawOriginalShapes])

  // Repintar el dibujo del paciente en recall/evaluation
  const repaintPatientDrawing = useCallback(() => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Trazos guardados
    strokes.forEach((stroke) => {
      if (stroke.points.length > 1) {
        ctx.strokeStyle = "#000"
        ctx.lineWidth = 2
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.beginPath()
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
        stroke.points.forEach((p) => ctx.lineTo(p.x, p.y))
        ctx.stroke()
      }
    })

    // Trazo actual (mientras dibuja)
    if (currentStroke.length > 1) {
      ctx.strokeStyle = "#3B82F6"
      ctx.lineWidth = 2
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.beginPath()
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y)
      currentStroke.forEach((p) => ctx.lineTo(p.x, p.y))
      ctx.stroke()
    }
  }, [strokes, currentStroke])

  useEffect(() => {
    if (phase === "recall" || phase === "evaluation") {
      repaintPatientDrawing()
    }
  }, [phase, strokes, currentStroke, repaintPatientDrawing])

  // Handlers de dibujo
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phase !== "recall") return
    const rect = drawCanvasRef.current!.getBoundingClientRect()
    setIsDrawing(true)
    setCurrentStroke([{ x: e.clientX - rect.left, y: e.clientY - rect.top }])
  }
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || phase !== "recall") return
    const rect = drawCanvasRef.current!.getBoundingClientRect()
    setCurrentStroke((prev) => [...prev, { x: e.clientX - rect.left, y: e.clientY - rect.top }])
  }
  const handleMouseUp = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    if (currentStroke.length > 1) {
      setStrokes((prev) => [...prev, { points: currentStroke, timestamp: Date.now(), order: strokeOrder }])
      setStrokeOrder((prev) => prev + 1)
    }
    setCurrentStroke([])
  }

  const clearCanvas = () => {
    setStrokes([])
    setCurrentStroke([])
    setStrokeOrder(0)
    // repintar vacío
    requestAnimationFrame(() => repaintPatientDrawing())
  }

  // Flujo
  const startSubtest = () => {
    setErrorMsg(null)
    setScore("")
    setNote("")
    setStrokes([])
    setCurrentStroke([])
    setStrokeOrder(0)
    setStudyTimeRemaining(DISPLAY_TIME)
    setPhase("study")
  }

  const goToEvaluation = () => {
    setPhase("evaluation")
  }

  // Envío con Axios
  const submitEvaluation = async () => {
    setErrorMsg(null)
    if (!currentEvaluationId) {
      setErrorMsg("Falta evaluationId para poder enviar al backend.")
      return
    }
    if (score === "") {
      setErrorMsg("Selecciona una puntuación (0–2).")
      return
    }

    const baseURL = apiBaseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL
    if (!baseURL) {
      setErrorMsg("No se ha configurado la URL del backend (apiBaseUrl o NEXT_PUBLIC_API_BASE_URL).")
      return
    }

    const payload = {
      evaluation_id: currentEvaluationId,
      score_id: Number(score), // el backend espera `score_id`
      note: note?.trim() ?? "",
    }

    try {
      setIsSubmitting(true)
      await axios.post(`${baseURL}${endpointPath}`, payload, {
        headers: { "Content-Type": "application/json" },
        // Si usas auth: headers: { Authorization: `Bearer ${token}` }
      })
      setPhase("completed")
      // onComplete?.(payload)
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "No se pudo enviar la evaluación. Inténtalo de nuevo."
      setErrorMsg(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render por fase
  if (phase === "instructions") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Instrucciones - Memoria Visual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-purple-50 p-4 rounded-lg">
            <ul className="space-y-2 text-purple-900">
              <li>• Verás 3 figuras durante 10 segundos.</li>
              <li>• Memoriza sus formas, tamaños y posiciones.</li>
              <li>• Después, dibuja lo que recuerdes.</li>
              <li>• Finalmente, un evaluador asignará una puntuación (0–2).</li>
            </ul>
          </div>
          <Button size="lg" className="w-full" onClick={startSubtest}>
            Comenzar
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (phase === "study") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Memoriza las figuras</span>
            <Badge variant="default" className="text-lg px-3 py-1">{studyTimeRemaining}s</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3">
            <Progress value={((DISPLAY_TIME - studyTimeRemaining) / DISPLAY_TIME) * 100} className="h-2" />
          </div>
          <div className="flex justify-center">
            <canvas ref={studyCanvasRef} width={400} height={350} className="border-2 border-gray-300 rounded-lg bg-white" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (phase === "recall") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Dibuja las figuras</span>
            <div className="flex gap-2">
              <Badge variant="outline">Trazos: {strokes.length}</Badge>
              <Button variant="outline" size="sm" onClick={clearCanvas}>Limpiar</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center mb-4">
            <canvas
              ref={drawCanvasRef}
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
            Dibuja las figuras en las mismas posiciones aproximadas.
          </p>
          <div className="flex justify-between">
            <Button variant="outline" onClick={onPause}>Pausar</Button>
            <Button onClick={goToEvaluation}>Ir a evaluación</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (phase === "evaluation") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evaluación del dibujo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMsg && (
            <div className="rounded-md border border-red-300 bg-red-50 text-red-800 p-3 text-sm">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Figura original</h4>
              <canvas ref={originalCanvasRef} width={400} height={350} className="border rounded-lg bg-white" />
            </div>
            <div>
              <h4 className="font-semibold mb-2">Dibujo del paciente</h4>
              <canvas ref={drawCanvasRef} width={400} height={350} className="border rounded-lg bg-white" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Ver criterios de puntuación</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criterios (0–2)</DialogTitle>
                </DialogHeader>
                <ul className="list-disc pl-6 space-y-2">
                  <li>2 puntos → Forma y orientación correctas.</li>
                  <li>1 punto → Parcialmente correcta (forma reconocible pero con algún error: tamaño/orientación/incompleta).</li>
                  <li>0 puntos → Incorrecta o irreconocible.</li>
                </ul>
              </DialogContent>
            </Dialog>

            <div className="grow" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Puntuación:</span>
              <Select value={score} onValueChange={setScore}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="0–2" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="0">0</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Textarea
            placeholder="Notas del evaluador (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPhase("recall")}>Volver</Button>
            <Button onClick={submitEvaluation} disabled={isSubmitting || score === ""}>
              {isSubmitting ? "Guardando..." : "Guardar evaluación"}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // completed
  return (
    <Card>
      <CardHeader>
        <CardTitle>Test completado</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700">La evaluación se ha enviado correctamente.</p>
      </CardContent>
    </Card>
  )
}

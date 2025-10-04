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
import type { SubtestProps, SubtestResult } from "@/types"
import { useEvaluationStore } from "@/src/stores/evaluation"

// ================== Types ==================

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

// ================== Consts ==================

const SHAPES: Shape[] = [
  { id: 1, type: "circle", x: 100, y: 100, size: 60, color: "#3B82F6" },
  { id: 2, type: "square", x: 250, y: 150, size: 50, color: "#EF4444" },
  { id: 3, type: "triangle", x: 150, y: 250, size: 55, color: "#10B981" },
]

const DISPLAY_TIME = 10 // segundos para memorizar
const CANVAS_CSS_WIDTH = 400
const CANVAS_CSS_HEIGHT = 350

// ================== Component ==================

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
  const [activePointerId, setActivePointerId] = useState<number | null>(null)
  const [usePressure, setUsePressure] = useState<boolean>(false) // opcional: escalado por presión
  const currentEvaluationId = useEvaluationStore((state) => state.currentEvaluation?.id)

  const [score, setScore] = useState<string>("") // "0" | "1" | "2"
  const [note, setNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Canvas refs
  const studyCanvasRef = useRef<HTMLCanvasElement>(null) // para fase de estudio
  const drawCanvasRef = useRef<HTMLCanvasElement>(null) // dibujo del paciente (recall/evaluation)
  const originalCanvasRef = useRef<HTMLCanvasElement>(null) // figura original en evaluación

  // ================== Canvas DPR helpers ==================

  const setupCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    // set the CSS pixel size
    canvas.style.width = `${CANVAS_CSS_WIDTH}px`
    canvas.style.height = `${CANVAS_CSS_HEIGHT}px`
    // set the backing store size
    canvas.width = Math.floor(CANVAS_CSS_WIDTH * dpr)
    canvas.height = Math.floor(CANVAS_CSS_HEIGHT * dpr)
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0) // scale so we can draw in CSS pixels
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
  }, [])

  const getRelativePoint = useCallback((canvas: HTMLCanvasElement, e: PointerEvent | React.PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  // ================== Draw originals ==================

  const drawOriginalShapes = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, CANVAS_CSS_WIDTH, CANVAS_CSS_HEIGHT)
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

  // ================== Timers/Phases ==================

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

  // draw originals during study
  useEffect(() => {
    if (phase === "study") {
      setupCanvas(studyCanvasRef.current)
      drawOriginalShapes(studyCanvasRef.current)
    }
  }, [phase, studyTimeRemaining, drawOriginalShapes, setupCanvas])

  // draw originals during evaluation
  useEffect(() => {
    if (phase === "evaluation") {
      setupCanvas(originalCanvasRef.current)
      drawOriginalShapes(originalCanvasRef.current)
    }
  }, [phase, drawOriginalShapes, setupCanvas])

  // keep drawing canvas prepared whenever recall/evaluation
  useEffect(() => {
    if (phase === "recall" || phase === "evaluation") {
      setupCanvas(drawCanvasRef.current)
      repaintPatientDrawing()
    }
  }, [phase, setupCanvas])

  // handle window DPR/resize changes for active canvases
  useEffect(() => {
    const handle = () => {
      ;[studyCanvasRef.current, drawCanvasRef.current, originalCanvasRef.current].forEach((c) => {
        if (c) setupCanvas(c)
      })
      if (phase === "study") drawOriginalShapes(studyCanvasRef.current)
      if (phase === "evaluation") drawOriginalShapes(originalCanvasRef.current)
      if (phase === "recall" || phase === "evaluation") repaintPatientDrawing()
    }
    window.addEventListener("resize", handle)
    return () => window.removeEventListener("resize", handle)
  }, [phase, setupCanvas, drawOriginalShapes])

  // ================== Patient drawing repaint ==================

  const repaintPatientDrawing = useCallback(() => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, CANVAS_CSS_WIDTH, CANVAS_CSS_HEIGHT)

    // saved strokes
    strokes.forEach((stroke) => {
      if (stroke.points.length > 1) {
        ctx.strokeStyle = "#000"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
        stroke.points.forEach((p) => ctx.lineTo(p.x, p.y))
        ctx.stroke()
      }
    })

    // current stroke
    if (currentStroke.length > 1) {
      ctx.strokeStyle = "#3B82F6"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y)
      currentStroke.forEach((p) => ctx.lineTo(p.x, p.y))
      ctx.stroke()
    }
  }, [strokes, currentStroke])

  useEffect(() => {
    if (phase === "recall" || phase === "evaluation") repaintPatientDrawing()
  }, [phase, strokes, currentStroke, repaintPatientDrawing])

  // ================== Pointer-based drawing (mouse, touch, stylus) ==================

  const beginStroke = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== "recall") return
    const canvas = drawCanvasRef.current
    if (!canvas) return

    // lock to a single pointer (prevents multi-touch from interfering)
    if (activePointerId !== null && activePointerId !== e.pointerId) return

    canvas.setPointerCapture?.(e.pointerId)
    setActivePointerId(e.pointerId)
    setIsDrawing(true)

    const p = getRelativePoint(canvas, e)
    setCurrentStroke([{ x: p.x, y: p.y }])
  }, [phase, activePointerId, getRelativePoint])

  const moveStroke = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || phase !== "recall") return
    const canvas = drawCanvasRef.current
    if (!canvas) return

    if (activePointerId !== null && activePointerId !== e.pointerId) return

    const p = getRelativePoint(canvas, e)

    // Optional: adjust line width by pressure when enabled (visual only while drawing next repaint)
    // We keep stored points as x/y only; pressure affects rendering style if you decide to extend it later.
    const pressure = usePressure ? e.pressure || 0.5 : 0
    if (pressure) {
      // quick preview trick: vary the last segment width by pressure during the live stroke
      // (kept simple: we don't store widths; you can extend DrawingPoint with width if needed)
    }

    setCurrentStroke((prev) => [...prev, { x: p.x, y: p.y }])
  }, [isDrawing, phase, activePointerId, getRelativePoint, usePressure])

  const endStroke = useCallback((e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    if (e && activePointerId !== null && e.pointerId !== activePointerId) return

    setIsDrawing(false)
    setActivePointerId(null)
    if (currentStroke.length > 1) {
      setStrokes((prev) => [...prev, { points: currentStroke, timestamp: Date.now(), order: strokeOrder }])
      setStrokeOrder((prev) => prev + 1)
    }
    setCurrentStroke([])
  }, [isDrawing, currentStroke, strokeOrder, activePointerId])

  // ================== Utilities ==================

  const clearCanvas = () => {
    setStrokes([])
    setCurrentStroke([])
    setStrokeOrder(0)
    requestAnimationFrame(() => repaintPatientDrawing())
  }

  // ================== Flow ==================

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

  // ================== Submit ==================

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
      score_id: Number(score),
      note: note?.trim() ?? "",
    }

    try {
      setIsSubmitting(true)
      await axios.post(`${baseURL}${endpointPath}`, payload, {
        headers: { "Content-Type": "application/json" },
      })
      setPhase("completed")

      const apiPayload = {
        evaluation_id: currentEvaluationId,
        score_id: Number(score),
        note: note?.trim() ?? "",
      }

      const subtestResult: Omit<SubtestResult, "subtestId" | "name"> = {
        startTime: new Date(),
        score: apiPayload.score_id,
        errors: 0,
        timeSpent: 0,
        rawData: apiPayload,
      }

      onComplete?.(subtestResult)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "No se pudo enviar la evaluación. Inténtalo de nuevo."
      setErrorMsg(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ================== Render ==================

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
             <CardContent>

  <div className="flex justify-center">
    <canvas
      ref={studyCanvasRef}
      className="border-2 border-gray-300 rounded-lg bg-white select-none"
      style={{ touchAction: "none", width: CANVAS_CSS_WIDTH, height: CANVAS_CSS_HEIGHT }}
      onContextMenu={(e) => e.preventDefault()}
    />
  </div>
</CardContent>


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
            <div className="flex gap-2 items-center">
              <Badge variant="outline">Trazos: {strokes.length}</Badge>
              <Button variant="outline" size="sm" onClick={() => setUsePressure((v) => !v)}>
                {usePressure ? "Presión: ON" : "Presión: OFF"}
              </Button>
              <Button variant="outline" size="sm" onClick={clearCanvas}>Limpiar</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center mb-4">
            <canvas
              ref={drawCanvasRef}
              className="border-2 border-gray-300 rounded-lg bg-white cursor-crosshair select-none"
              style={{ touchAction: "none", width: CANVAS_CSS_WIDTH, height: CANVAS_CSS_HEIGHT }}
              onPointerDown={beginStroke}
              onPointerMove={moveStroke}
              onPointerUp={endStroke}
              onPointerCancel={endStroke}
              onPointerLeave={endStroke}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
          <p className="text-center text-gray-600 mb-4">Dibuja las figuras en las mismas posiciones aproximadas.</p>
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
            <div className="rounded-md border border-red-300 bg-red-50 text-red-800 p-3 text-sm">{errorMsg}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Figura original</h4>
              <canvas
                ref={originalCanvasRef}
                className="border rounded-lg bg-white select-none"
                style={{ touchAction: "none", width: CANVAS_CSS_WIDTH, height: CANVAS_CSS_HEIGHT }}
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
            <div>
              <h4 className="font-semibold mb-2">Dibujo del paciente</h4>
              <canvas
                ref={drawCanvasRef}
                className="border rounded-lg bg-white select-none"
                style={{ touchAction: "none", width: CANVAS_CSS_WIDTH, height: CANVAS_CSS_HEIGHT }}
                onContextMenu={(e) => e.preventDefault()}
              />
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

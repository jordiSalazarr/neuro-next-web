"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { SubtestProps } from "@/types"
import axios from "axios"
import { useEvaluationStore } from "@/src/stores/evaluation"

const ALL_LETTERS = [
  "A","B","C","D","E","F","G","H","I","J","K","L",
  "M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
]

const MATRIX_ROWS = 14
const MATRIX_COLS = 22
const SUBTEST_DURATION = 300 // 5 min

interface LetterCell {
  letter: string
  row: number
  col: number
}

export function AttentionSubtest({ onComplete, onPause }: SubtestProps) {
  const [phase, setPhase] = useState<"instructions" | "active" | "completed">("instructions")
  const [isFinishing, setIsFinishing] = useState(false)

  const [letterMatrix, setLetterMatrix] = useState<LetterCell[]>([])
  const [targetLetter, setTargetLetter] = useState<string>("")
  const [targetTotal, setTargetTotal] = useState<number>(0) // oculto en UI activa

  const [correctHits, setCorrectHits] = useState(0)
  const [falseAlarms, setFalseAlarms] = useState(0)

  const [timeRemaining, setTimeRemaining] = useState(SUBTEST_DURATION)
  const [startTime, setStartTime] = useState<Date | null>(null)

  const [clicked, setClicked] = useState<boolean[]>([]) // evitar doble conteo por celda
  const currentEvaluationID = useEvaluationStore((s) => s.currentEvaluation?.id)

  const finishNow = () => {
  if (phase !== "active" || isFinishing) return
  setIsFinishing(true)
  completeSubtest()
 }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Genera matriz y fija una única letra objetivo; cuenta cuántas hay (sin mostrarlo durante el test)
  const setupMatrixWithTarget = useCallback(() => {
    const chosen = ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)]

    let matrix: LetterCell[] = []
    let count = 0
    const totalCells = MATRIX_ROWS * MATRIX_COLS

    const build = () => {
      matrix = []
      for (let i = 0; i < totalCells; i++) {
        const row = Math.floor(i / MATRIX_COLS)
        const col = i % MATRIX_COLS
        const letter = ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)]
        matrix.push({ letter, row, col })
      }
      count = matrix.reduce((acc, c) => acc + (c.letter === chosen ? 1 : 0), 0)
    }

    build()
    let attempts = 0
    while (count === 0 && attempts < 10) {
      attempts++
      build()
    }

    setLetterMatrix(matrix)
    setTargetLetter(chosen)
    setTargetTotal(count)
    setClicked(Array(totalCells).fill(false))
  }, [])

  // Timer
  useEffect(() => {
    if (phase !== "active") return
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          completeSubtest()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [phase])

  // Inicio
  const startSubtest = () => {
    setPhase("active")
    setStartTime(new Date())
    setTimeRemaining(SUBTEST_DURATION)
    setCorrectHits(0)
    setFalseAlarms(0)
    setupMatrixWithTarget()
  }

  // Click en celda
  const handleLetterClick = (index: number) => {
    if (phase !== "active") return
    if (index < 0 || index >= letterMatrix.length) return
    if (clicked[index]) return

    const cell = letterMatrix[index]
    setClicked((prev) => {
      const next = [...prev]
      next[index] = true
      return next
    })

    if (cell.letter === targetLetter) {
      setCorrectHits((prev) => prev + 1)
    } else {
      setFalseAlarms((prev) => prev + 1)
    }
  }

  // Completa si ya encontró todas (sin mostrar cuántas faltan)
  useEffect(() => {
    if (phase === "active" && targetTotal > 0 && correctHits >= targetTotal) {
      completeSubtest()
    }
  }, [phase, correctHits, targetTotal])

  // Enviar resultados (contrato igual)
  const completeSubtest = async () => {
    setPhase("completed")
    const timeSpent = startTime ? Math.round((Date.now() - startTime.getTime()) / 1000) : 0

    const payload = {
      TotalTargets: targetTotal,
      Correct: correctHits,
      Errors: falseAlarms,
      TimeInSecs: timeSpent,
      EvaluationID: currentEvaluationID,
    }

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/evaluations/letter-cancellation`, payload, {
        headers: { "Content-Type": "application/json" },
      })
    } catch (e) {
      console.error("Error enviando resultados de letter-cancellation:", e)
    }

    onComplete({
      startTime: startTime || new Date(),
      endTime: new Date(),
      score: targetTotal > 0 ? Math.round((correctHits / targetTotal) * 100) : 0,
      errors: falseAlarms,
      timeSpent,
      rawData: { targetLetter, targetTotal, correctHits, falseAlarms },
    })
  }

  // ---------- Render ----------

  if (phase === "instructions") {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl lg:text-2xl">Instrucciones - Cancelación de Letras</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <div className="bg-blue-50 p-4 sm:p-6 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-3 text-sm sm:text-base">¿Qué debe hacer?</h4>
            <ul className="space-y-2 text-blue-800 text-sm sm:text-base">
              <li>• Se le mostrará <strong>una letra objetivo</strong> fija en la parte superior.</li>
              <li>• Verá una matriz de letras mezcladas.</li>
              <li>• Debe pulsar <strong>todas</strong> las celdas donde aparezca esa letra.</li>
              <li>• Cada celda solo puede pulsarse una vez.</li>
              <li>• El test termina al agotar el tiempo o al completar todas las apariciones.</li>
            </ul>
          </div>
          <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg">
            <p className="text-yellow-800 text-sm sm:text-base">
              <strong>Duración:</strong> 5 minutos.
            </p>
          </div>
          <Button onClick={startSubtest} className="w-full text-sm sm:text-base" size="lg">
            Comenzar Test de Cancelación
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (phase === "active") {
    // Solo progreso de TIEMPO (no mostramos faltantes ni total objetivos)
    const timeProgress = ((SUBTEST_DURATION - timeRemaining) / SUBTEST_DURATION) * 100

    return (
      <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Letra a buscar</p>
                  <Badge
                    variant="default"
                    className="text-xl sm:text-2xl lg:text-3xl px-3 sm:px-4 lg:px-6 py-2 sm:py-3 bg-green-600"
                  >
                    {targetLetter || "—"}
                  </Badge>
                </div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-600">Aciertos</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{correctHits}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-600">Errores</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">{falseAlarms}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-600">Tiempo</p>
                  <p className="text-base sm:text-lg lg:text-xl font-mono font-bold">
                    {formatTime(timeRemaining)}
                  </p>
                </div>
              </div>
            </div>

            {/* Progreso por tiempo (NO por objetivos) */}
            <Progress value={timeProgress} className="h-2 sm:h-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="text-center mb-4">
              <p className="text-sm sm:text-base text-gray-700">
                Pulse todas las celdas con la letra{" "}
                <strong className="text-green-600">{targetLetter}</strong>
              </p>
            </div>

            <div
              className="grid gap-0.5 sm:gap-1 max-w-full mx-auto overflow-auto"
              style={{ gridTemplateColumns: `repeat(${MATRIX_COLS}, minmax(0, 1fr))` }}
            >
              {letterMatrix.map((cell, index) => {
                const isClicked = clicked[index]
                const isCorrectCell = cell.letter === targetLetter

                // Damos feedback SOLO de lo ya clicado (verde si correcto, rojo si error).
                const stateClass = isClicked
                  ? isCorrectCell
                    ? "bg-green-100 border-green-400 text-green-800"
                    : "bg-red-100 border-red-300 text-red-800"
                  : "bg-white hover:bg-gray-100 hover:border-gray-400 active:bg-gray-200 cursor-pointer"

                return (
                  <button
                    key={`cell-${index}`}
                    onClick={() => handleLetterClick(index)}
                    disabled={isClicked}
                    aria-label={`Letra ${cell.letter}`}
                    className={`aspect-square text-[8px] sm:text-[10px] lg:text-xs font-bold border border-gray-300 rounded transition-all duration-200
                      min-h-[16px] sm:min-h-[20px] lg:min-h-[24px] min-w-[16px] sm:min-w-[20px] lg:min-w-[24px] ${stateClass}`}
                  >
                    {cell.letter}
                  </button>
                )
              })}
            </div>

            <div className="flex justify-center mt-4 sm:mt-6">
              <Button variant="outline" onClick={onPause} className="text-sm sm:text-base bg-transparent">
                Pausar Test
              </Button>
               <Button
                 onClick={finishNow}
                 disabled={isFinishing}
                 className="text-sm sm:text-base font-semibold"
               >
                {isFinishing ? "Finalizando..." : "Finalizar test"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // completed (post-test sí mostramos el total encontrado y total real)
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Test de Cancelación Completado</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-center text-gray-600 mb-4 text-sm sm:text-base">
          El test ha finalizado. Los resultados se han guardado.
        </p>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm sm:text-base">
            <div><strong>Letra objetivo:</strong> {targetLetter}</div>
            <div><strong>Total objetivos en matriz:</strong> {targetTotal}</div>
            <div><strong>Aciertos:</strong> {correctHits}</div>
            <div><strong>Errores:</strong> {falseAlarms}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

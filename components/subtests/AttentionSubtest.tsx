"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { SubtestProps } from "@/types"
import axios from "axios"
import { useEvaluationStore } from "@/stores/evaluation"

const ALL_LETTERS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
]
const MATRIX_ROWS = 52 // 52 filas de matriz
const MATRIX_COLS = 22 // 22 columnas de matriz
const TOTAL_TARGETS = 10 // 50 letras objetivo diferentes
const SUBTEST_DURATION = 300 // 5 minutos en segundos

interface LetterCell {
  letter: string
  row: number
  col: number
}

export function AttentionSubtest({ onComplete, onPause }: SubtestProps) {
  const [phase, setPhase] = useState<"instructions" | "active" | "completed">("instructions")
  const [letterMatrix, setLetterMatrix] = useState<LetterCell[]>([])
  const [currentTargetLetter, setCurrentTargetLetter] = useState("")
  const [targetIndex, setTargetIndex] = useState(0)
  const [correctHits, setCorrectHits] = useState(0)
  const [falseAlarms, setFalseAlarms] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(SUBTEST_DURATION)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [targetStartTime, setTargetStartTime] = useState<number>(0)
  const [reactionTimes, setReactionTimes] = useState<number[]>([])
  const [waitingForClick, setWaitingForClick] = useState(false)
  const currentEvaluarionID = useEvaluationStore(state=>state.currentEvaluation?.id)

  const generateLetterMatrix = useCallback(() => {
    const matrix: LetterCell[] = []
    const totalCells = MATRIX_ROWS * MATRIX_COLS

    for (let i = 0; i < totalCells; i++) {
      const row = Math.floor(i / MATRIX_COLS)
      const col = i % MATRIX_COLS
      matrix.push({
        letter: ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)],
        row,
        col,
      })
    }

    return matrix
  }, [])

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

  const generateNewTarget = useCallback(() => {
    if (targetIndex >= TOTAL_TARGETS) {
      completeSubtest()
      return
    }

    const newTargetLetter = ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)]
    setCurrentTargetLetter(newTargetLetter)
    setTargetStartTime(Date.now())
    setWaitingForClick(true)
  }, [targetIndex])

  useEffect(() => {
    if (phase === "active") {
      // Generar matriz una sola vez al inicio
      if (letterMatrix.length === 0) {
        setLetterMatrix(generateLetterMatrix())
      }
      generateNewTarget()
    }
  }, [phase, targetIndex, generateNewTarget, letterMatrix.length, generateLetterMatrix])

  const startSubtest = () => {
    setPhase("active")
    setStartTime(new Date())
    setTargetIndex(0)
    setCorrectHits(0)
    setFalseAlarms(0)
    setReactionTimes([])
    setLetterMatrix([]) // Reset para generar nueva matriz
  }

  const handleLetterClick = (cellIndex: number) => {
    if (!waitingForClick || cellIndex < 0 || cellIndex >= letterMatrix.length) return

    const cell = letterMatrix[cellIndex]
    if (!cell) return

    const reactionTime = Date.now() - targetStartTime
    setReactionTimes((prev) => [...prev, reactionTime])

    if (cell.letter === currentTargetLetter) {
      // Acierto
      setCorrectHits((prev) => prev + 1)
    } else {
      // Error
      setFalseAlarms((prev) => prev + 1)
    }

    // Inmediatamente pasar a la siguiente letra
    setWaitingForClick(false)
    setTargetIndex((prev) => prev + 1)
  }

  const completeSubtest = async () => {
    setPhase("completed")

    const avgReactionTime =
      reactionTimes.length > 0 ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length : 0

    const totalClicks = correctHits + falseAlarms
    const accuracy = totalClicks > 0 ? (correctHits / totalClicks) * 100 : 0
    const timeSpent = startTime ? (Date.now() - startTime.getTime()) / 1000 : 0
    const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/evaluations/letter-cancellation`,{
       TotalTargets: targetIndex,
       Correct: correctHits,
       Errors: falseAlarms,
       TimeInSecs: 150,
       EvaluationID: currentEvaluarionID,
      // averageReactionTime: Math.round(avgReactionTime), TODO: this metric could be very interesting
    })
    console.log(res)
    onComplete({
      startTime: startTime!,
      endTime: new Date(),
      score: Math.round(accuracy),
      errors: falseAlarms,
      timeSpent: Math.round(timeSpent),
      rawData: {
        correctHits,
        falseAlarms,
        totalTargets: targetIndex,
        averageReactionTime: Math.round(avgReactionTime),
        reactionTimes,
      },
    })
try {
  
} catch (error) {
  
}


  
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

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
              <li>• Se le mostrará una letra objetivo en la parte superior</li>
              <li>• Verá una matriz de letras mezcladas</li>
              <li>
                • <strong>Haga click en UNA letra que coincida con la letra objetivo</strong>
              </li>
              <li>• Después de cada click, aparecerá una nueva letra objetivo</li>
              <li>• Trabaje lo más rápido y preciso posible</li>
              <li>• Solo puede hacer 1 click por cada letra objetivo</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg">
            <p className="text-yellow-800 text-sm sm:text-base">
              <strong>Duración:</strong> 5 minutos o 50 letras objetivo (lo que ocurra primero)
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
    const progressPercentage = (targetIndex / TOTAL_TARGETS) * 100

    return (
      <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Buscar Letra</p>
                  <Badge
                    variant="default"
                    className="text-xl sm:text-2xl lg:text-3xl px-3 sm:px-4 lg:px-6 py-2 sm:py-3 bg-green-600"
                  >
                    {currentTargetLetter}
                  </Badge>
                </div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-600">Tiempo Restante</p>
                  <p className="text-base sm:text-lg lg:text-xl font-mono font-bold">{formatTime(timeRemaining)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-600">Progreso</p>
                  <p className="text-sm sm:text-base lg:text-lg font-semibold">
                    {targetIndex}/{TOTAL_TARGETS}
                  </p>
                </div>
              </div>

              <div className="flex justify-center lg:justify-end gap-4 sm:gap-6">
                <div className="text-center">
                  <p className="text-green-600 font-semibold text-xs sm:text-sm">Aciertos</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{correctHits}</p>
                </div>
                <div className="text-center">
                  <p className="text-red-600 font-semibold text-xs sm:text-sm">Errores</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">{falseAlarms}</p>
                </div>
              </div>
            </div>
            <Progress value={progressPercentage} className="h-2 sm:h-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="text-center mb-4">
              <p className="text-sm sm:text-base text-gray-700">
                Haga click en <strong>UNA</strong> letra{" "}
                <strong className="text-green-600">{currentTargetLetter}</strong> en la matriz
              </p>
            </div>

            <div
              className="grid gap-0.5 sm:gap-1 max-w-full mx-auto overflow-auto"
              style={{ gridTemplateColumns: `repeat(${MATRIX_COLS}, minmax(0, 1fr))` }}
            >
              {letterMatrix.map((cell, index) => (
                <button
                  key={`matrix-${index}`}
                  onClick={() => handleLetterClick(index)}
                  className={`
                    aspect-square text-[8px] sm:text-[10px] lg:text-xs font-bold border border-gray-300 rounded transition-all duration-200
                    min-h-[16px] sm:min-h-[20px] lg:min-h-[24px] min-w-[16px] sm:min-w-[20px] lg:min-w-[24px]
                    ${
                      waitingForClick
                        ? "bg-white hover:bg-gray-100 hover:border-gray-400 active:bg-gray-200 cursor-pointer"
                        : "bg-gray-100 border-gray-200 cursor-not-allowed"
                    }
                  `}
                  disabled={!waitingForClick}
                  aria-label={`Letra ${cell.letter}`}
                >
                  {cell.letter}
                </button>
              ))}
            </div>

            <div className="flex justify-center mt-4 sm:mt-6">
              <Button variant="outline" onClick={onPause} className="text-sm sm:text-base bg-transparent">
                Pausar Test
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Test de Cancelación Completado</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-center text-gray-600 mb-4 text-sm sm:text-base">
          El test de cancelación de letras ha finalizado. Los resultados se han guardado.
        </p>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm sm:text-base">
            <div>
              <strong>Aciertos:</strong> {correctHits}
            </div>
            <div>
              <strong>Errores:</strong> {falseAlarms}
            </div>
            <div>
              <strong>Letras Completadas:</strong> {targetIndex}
            </div>
            <div>
              <strong>Tiempo Promedio:</strong>{" "}
              {reactionTimes.length > 0
                ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
                : 0}
              ms
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

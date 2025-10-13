"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { SubtestProps } from "@/types"
import axios from "axios"
import { useEvaluationStore } from "@/src/stores/evaluation"

/**
 * ============================================================================
 *  AttentionSubtest (Letter Cancellation) — Rediseño UI/UX corporativo clínico
 *  - No cambia la lógica ni el contrato API.
 *  - Cambios visuales: tonos corporativos, tipografía jerarquizada, layout
 *    sin scroll vertical (en desktop), matriz más ancha, feedback sutil.
 *  - Mejora de textos e instrucciones en tono profesional.
 *  - Barra superior "sticky" con métricas esenciales (tiempo, aciertos, errores).
 * ============================================================================
 */

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

// Paleta corporativa (solo para clases utilitarias / semántica local)
const styles = {
  backdrop: "bg-[#0E2F3C]", // azul hospital corporativo oscuro
  surface: "bg-slate-50/60", // superficie clara pero no blanca
  card: "bg-white/80 backdrop-blur border-slate-200",
  kpiLabel: "text-slate-500",
  kpiValue: "text-slate-900",
  kpiGood: "text-emerald-600",
  kpiBad: "text-rose-600",
  primary: "bg-[#0E7C86] hover:bg-[#0a646c] text-white",
  outline: "border-slate-300 text-slate-800 hover:bg-slate-50",
  targetBadge: "bg-emerald-600 text-white",
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
      <div className={`min-h-[70vh] w-full ${styles.backdrop} py-8 sm:py-10 px-4`}>        
        <div className="mx-auto max-w-5xl">
          <header className="mb-6">
            <h1 className="text-white/90 text-2xl sm:text-3xl font-semibold tracking-tight">
              Cancelación de Letras
            </h1>
            <p className="text-white/70 text-sm sm:text-base mt-1 max-w-2xl">
              Seleccione todas las apariciones de la letra objetivo en la matriz. Este subtest evalúa atención
              sostenida y selectiva.
            </p>
          </header>

          <Card className={`${styles.card} shadow-xl`}>            
            <CardHeader className="pb-2">
              <CardTitle className="text-lg sm:text-xl lg:text-2xl text-slate-900">
                Instrucciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg bg-slate-50 p-4 sm:p-5 border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-3 text-sm sm:text-base">¿Qué debe hacer?</h4>
                <ul className="space-y-2 text-slate-700 text-sm sm:text-base">
                  <li>• Se mostrará <strong>una letra objetivo</strong> fija en la parte superior.</li>
                  <li>• Verá una matriz amplia de letras mezcladas.</li>
                  <li>• Pulse <strong>todas</strong> las celdas donde aparezca esa letra. Cada celda se registra una única vez.</li>
                  <li>• El subtest finaliza al agotar el tiempo o al localizar todas las apariciones.</li>
                </ul>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 sm:p-4 border border-amber-200">
                <p className="text-amber-900 text-sm sm:text-base"><strong>Duración:</strong> 5 minutos.</p>
              </div>
              <div className="flex gap-3 pt-1">
                <Button onClick={startSubtest} size="lg" className={`${styles.primary} w-full sm:w-auto`}>Comenzar</Button>
                <Button variant="outline" onClick={onPause} className={`hidden sm:inline-flex ${styles.outline}`}>Pausar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (phase === "active") {
    // Solo progreso de TIEMPO (no mostramos faltantes ni total objetivos)
    const timeProgress = ((SUBTEST_DURATION - timeRemaining) / SUBTEST_DURATION) * 100

    return (
      <div className={`min-h-[100dvh] ${styles.backdrop} px-3 sm:px-4 py-3 sm:py-4`}>        
        <div className="mx-auto max-w-[1200px] grid grid-rows-[auto_1fr] gap-3 sm:gap-4">
          {/* Barra superior sticky con KPIs */}
          <div className="sticky top-0 z-20">
            <Card className={`${styles.card} shadow-lg`}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4 w-full">
                    <div className="text-center">
                      <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>Letra objetivo</p>
                      <Badge variant="default" className={`text-xl sm:text-2xl px-3 sm:px-4 py-2 ${styles.targetBadge}`}>
                        {targetLetter || "—"}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>Aciertos</p>
                      <p className={`text-lg sm:text-xl font-semibold ${styles.kpiGood}`}>{correctHits}</p>
                    </div>
                    <div className="text-center">
                      <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>Errores</p>
                      <p className={`text-lg sm:text-xl font-semibold ${styles.kpiBad}`}>{falseAlarms}</p>
                    </div>
                    <div className="text-center">
                      <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>Tiempo</p>
                      <p className="text-base sm:text-lg font-mono font-bold text-slate-900">{formatTime(timeRemaining)}</p>
                    </div>
                    <div className="hidden sm:flex items-center justify-center">
                      <Button onClick={finishNow} disabled={isFinishing} className={`${styles.primary} font-semibold w-full sm:w-auto`}>
                        {isFinishing ? "Finalizando…" : "Finalizar test"}
                      </Button>
                    </div>
                  </div>
                  <div className="sm:hidden">
                    <Button onClick={finishNow} disabled={isFinishing} className={`${styles.primary} w-full`}>
                      {isFinishing ? "Finalizando…" : "Finalizar test"}
                    </Button>
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={timeProgress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Zona principal con matriz y CTA secundarias */}
          <Card className={`${styles.card} shadow-xl`}>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="text-center mb-3 sm:mb-4">
                <p className="text-sm sm:text-base text-slate-700">
                  Seleccione todas las celdas con la letra <strong className="text-emerald-700">{targetLetter}</strong>
                </p>
              </div>

              {/* Contenedor para forzar que la matriz sea ancha y visible sin scroll vertical en desktop */}
              <div className="w-full mx-auto">
                <div
                  className="grid gap-0.5 sm:gap-1 mx-auto"
                  style={{ gridTemplateColumns: `repeat(${MATRIX_COLS}, minmax(0, 1fr))` }}
                >
                  {letterMatrix.map((cell, index) => {
                    const isClicked = clicked[index]
                    const isCorrectCell = cell.letter === targetLetter

                    // Feedback SOLO de lo clicado
                    const base = "aspect-square font-semibold border rounded select-none transition-all duration-150 min-h-[18px] min-w-[18px] text-[10px] sm:text-[11px] md:text-[12px] lg:text-[13px] flex items-center justify-center"

                    const stateClass = isClicked
                      ? isCorrectCell
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                        : "bg-rose-50 border-rose-300 text-rose-800"
                      : "bg-slate-100 border-slate-300 hover:bg-slate-200 hover:border-slate-400 active:bg-slate-300 cursor-pointer"

                    return (
                      <button
                        key={`cell-${index}`}
                        onClick={() => handleLetterClick(index)}
                        disabled={isClicked}
                        aria-label={`Letra ${cell.letter}`}
                        className={`${base} ${stateClass}`}
                      >
                        {cell.letter}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-center gap-3 mt-4 sm:mt-6">
                <Button variant="outline" onClick={onPause} className={styles.outline}>Pausar</Button>
                <Button onClick={finishNow} disabled={isFinishing} className={`${styles.primary} font-semibold`}>
                  {isFinishing ? "Finalizando…" : "Finalizar test"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // completed (post-test sí mostramos el total encontrado y total real)
  return (
    <div className={`${styles.backdrop} min-h-[70vh] py-8 px-4`}>
      <div className="mx-auto max-w-3xl">
        <Card className={`${styles.card} shadow-xl`}>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-slate-900">Subtest completado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-slate-600 mb-4 text-sm sm:text-base">
              El subtest ha finalizado. Los resultados se han guardado correctamente.
            </p>
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm sm:text-base text-slate-800">
                <div><strong>Letra objetivo:</strong> {targetLetter}</div>
                <div><strong>Total objetivos en matriz:</strong> {targetTotal}</div>
                <div><strong>Aciertos:</strong> {correctHits}</div>
                <div><strong>Errores:</strong> {falseAlarms}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

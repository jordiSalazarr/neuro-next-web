"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { SubtestProps } from "@/types";
import { useEvaluationStore } from "@/src/stores/evaluation";
import { ShieldCheck } from "lucide-react";

/**
 * Letter Cancellation — UI optimizado:
 * - Auto-fit: la matriz calcula el tamaño de celda para caber en viewport sin scroll en desktop.
 * - Barra superior sticky con KPIs esenciales.
 * - Tipografía y contrastes clínicos; focus-visible consistente.
 * - Sin cambio en lógica ni contrato API.
 */

const ALL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const MATRIX_ROWS = 14;
const MATRIX_COLS = 22;
const SUBTEST_DURATION = 300; // 5 min

interface LetterCell {
  letter: string;
  row: number;
  col: number;
}

const styles = {
  card: "bg-white/85 backdrop-blur border border-slate-200/70 shadow-xl rounded-2xl",
  kpiLabel: "text-slate-500",
  kpiGood: "text-emerald-700",
  kpiBad: "text-rose-700",
  primary: "bg-brand-600 hover:bg-slate-900 text-white",
  outline: "border-slate-300 text-slate-800 hover:bg-slate-50",
  targetBadge: "bg-emerald-600 text-white",
};

export function AttentionSubtest({ onComplete, onPause }: SubtestProps) {
  const [phase, setPhase] = useState<"instructions" | "active" | "completed">("instructions");
  const [isFinishing, setIsFinishing] = useState(false);

  const [letterMatrix, setLetterMatrix] = useState<LetterCell[]>([]);
  const [targetLetter, setTargetLetter] = useState<string>("");
  const [targetTotal, setTargetTotal] = useState<number>(0);

  const [correctHits, setCorrectHits] = useState(0);
  const [falseAlarms, setFalseAlarms] = useState(0);

  const [timeRemaining, setTimeRemaining] = useState(SUBTEST_DURATION);
  const [startTime, setStartTime] = useState<Date | null>(null);

  const [clicked, setClicked] = useState<boolean[]>([]);
  const currentEvaluationID = useEvaluationStore((s) => s.currentEvaluation?.id);

  // ---------- Auto-fit (sin scroll en desktop) ----------
  const gridWrapperRef = useRef<HTMLDivElement | null>(null);
  const [cellSize, setCellSize] = useState<number>(32); // px; se recalcula
  const gridGap = 6; // px (coincidir con gap-1.5 aprox)

  const recalcCellSize = useCallback(() => {
    const wrapper = gridWrapperRef.current;
    if (!wrapper) return;

    // Espacio disponible (alto y ancho) dentro del contenedor de la matriz
    const { width, height } = wrapper.getBoundingClientRect();

    // Cálculo bruto de tamaño de celda en función de filas/cols y gaps
    const availableW = Math.max(0, width - (MATRIX_COLS - 1) * gridGap);
    const availableH = Math.max(0, height - (MATRIX_ROWS - 1) * gridGap);

    const byCols = Math.floor(availableW / MATRIX_COLS);
    const byRows = Math.floor(availableH / MATRIX_ROWS);

    // Elegimos el menor para evitar overflow y clamp para legibilidad
    const size = Math.max(22, Math.min(48, Math.min(byCols, byRows))); // 22–48px
    setCellSize(size);
  }, []);

  useEffect(() => {
    if (phase !== "active") return;
    const ro = new ResizeObserver(recalcCellSize);
    if (gridWrapperRef.current) ro.observe(gridWrapperRef.current);
    // Primer cálculo
    recalcCellSize();
    return () => ro.disconnect();
  }, [phase, recalcCellSize]);

  // ---------- Utilidades ----------
  const finishNow = () => {
    if (phase !== "active" || isFinishing) return;
    setIsFinishing(true);
    completeSubtest();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const setupMatrixWithTarget = useCallback(() => {
    const chosen = ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)];

    let matrix: LetterCell[] = [];
    let count = 0;
    const totalCells = MATRIX_ROWS * MATRIX_COLS;

    const build = () => {
      matrix = [];
      for (let i = 0; i < totalCells; i++) {
        const row = Math.floor(i / MATRIX_COLS);
        const col = i % MATRIX_COLS;
        const letter = ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)];
        matrix.push({ letter, row, col });
      }
      count = matrix.reduce((acc, c) => acc + (c.letter === chosen ? 1 : 0), 0);
    };

    build();
    let attempts = 0;
    while (count === 0 && attempts < 10) {
      attempts++;
      build();
    }

    setLetterMatrix(matrix);
    setTargetLetter(chosen);
    setTargetTotal(count);
    setClicked(Array(totalCells).fill(false));
  }, []);

  // Timer
  useEffect(() => {
    if (phase !== "active") return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          completeSubtest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Inicio
  const startSubtest = () => {
    setPhase("active");
    setStartTime(new Date());
    setTimeRemaining(SUBTEST_DURATION);
    setCorrectHits(0);
    setFalseAlarms(0);
    setupMatrixWithTarget();
  };

  // Click/teclado en celda
  const handleLetterClick = (index: number) => {
    if (phase !== "active") return;
    if (index < 0 || index >= letterMatrix.length) return;
    if (clicked[index]) return;

    const cell = letterMatrix[index];
    setClicked((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });

    if (cell.letter === targetLetter) setCorrectHits((p) => p + 1);
    else setFalseAlarms((p) => p + 1);
  };

  // Completa si encuentra todas
  useEffect(() => {
    if (phase === "active" && targetTotal > 0 && correctHits >= targetTotal) {
      completeSubtest();
    }
  }, [phase, correctHits, targetTotal]);

  // Enviar resultados
  const completeSubtest = async () => {
    setPhase("completed");
    const timeSpent = startTime ? Math.round((Date.now() - startTime.getTime()) / 1000) : 0;

    const payload = {
      TotalTargets: targetTotal,
      Correct: correctHits,
      Errors: falseAlarms,
      TimeInSecs: timeSpent,
      EvaluationID: currentEvaluationID,
    };

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/evaluations/letter-cancellation`, payload, {
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("Error enviando resultados de letter-cancellation:", e);
    }

    onComplete({
      startTime: startTime || new Date(),
      endTime: new Date(),
      score: targetTotal > 0 ? Math.round((correctHits / targetTotal) * 100) : 0,
      errors: falseAlarms,
      timeSpent,
      rawData: { targetLetter, targetTotal, correctHits, falseAlarms },
    });
  };

  // ---------- Render ----------
  if (phase === "instructions") {
    return (
      <main className="min-h-[calc(100vh-56px)]">
        <section className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
          <header className="mb-6">
            <h1 className="text-slate-900 text-2xl sm:text-3xl font-semibold tracking-tight">
              Cancelación de letras
            </h1>
            <p className="text-slate-600 text-sm sm:text-base mt-1 max-w-2xl">
              Selecciona todas las apariciones de la letra objetivo en la matriz. Evalúa atención sostenida y selectiva.
            </p>
          </header>

          <Card className={styles.card}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg sm:text-xl lg:text-2xl text-slate-900">Instrucciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg bg-slate-50 p-4 sm:p-5 border border-slate-200">
                <ul className="space-y-2 text-slate-700 text-sm sm:text-base">
                  <li>• Verás una <strong>letra objetivo</strong> fija en la barra superior.</li>
                  <li>• Pulsa <strong>todas</strong> las celdas donde aparezca esa letra (cada celda cuenta una vez).</li>
                  <li>• Finaliza al agotar el tiempo o al localizar todas las apariciones.</li>
                </ul>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 sm:p-4 border border-slate-200 text-sm">
                <ShieldCheck className="h-4 w-4 text-brand-600 inline mr-2" aria-hidden="true" />
                Duración: 5 minutos. Puedes pausar si es necesario.
              </div>
              <div className="flex gap-3 pt-1">
                <Button onClick={startSubtest} size="lg" className={`${styles.primary} w-full sm:w-auto`}>
                  Comenzar
                </Button>
                <Button variant="outline" onClick={onPause} className={`hidden sm:inline-flex ${styles.outline}`}>
                  Pausar
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  if (phase === "active") {
    const timeProgress = ((SUBTEST_DURATION - timeRemaining) / SUBTEST_DURATION) * 100;

    return (
      <main className="min-h-[calc(100vh-56px)]">
        <section className="mx-auto max-w-[1200px] px-3 sm:px-4 py-3 sm:py-4 grid grid-rows-[auto_1fr] gap-3 sm:gap-4">
          {/* Barra KPIs sticky */}
          <div className="sticky top-[56px] z-20">
            <Card className={styles.card}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4 w-full">
                    <div className="text-center">
                      <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>Letra objetivo</p>
                      <Badge
                        variant="default"
                        className={`px-3 sm:px-4 py-2 text-[clamp(16px,2.2vw,24px)] ${styles.targetBadge}`}
                        aria-live="polite"
                      >
                        {targetLetter || "—"}
                      </Badge>
                    </div>
                    <div className="text-center">
                      <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>Aciertos</p>
                      <p className={`font-semibold text-[clamp(16px,2vw,22px)] ${styles.kpiGood}`}>{correctHits}</p>
                    </div>
                    <div className="text-center">
                      <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>Errores</p>
                      <p className={`font-semibold text-[clamp(16px,2vw,22px)] ${styles.kpiBad}`}>{falseAlarms}</p>
                    </div>
                    <div className="text-center">
                      <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>Tiempo</p>
                      <p className="font-mono font-bold text-slate-900 text-[clamp(16px,2vw,22px)]">
                        {formatTime(timeRemaining)}
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center justify-center">
                      <Button onClick={finishNow} disabled={isFinishing} className={`${styles.primary} w-full sm:w-auto`}>
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

          {/* Área matriz (auto-fit) */}
          <Card className={styles.card}>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="text-center mb-3 sm:mb-4">
                <p className="text-sm sm:text-base text-slate-700">
                  Selecciona todas las celdas con <strong className="text-emerald-700">{targetLetter}</strong>
                </p>
              </div>

              {/* Wrapper con altura controlada para caber sin scroll en desktop */}
              <div
                ref={gridWrapperRef}
                className="w-full"
                style={{
                  // Altura objetivo: viewport restante (aprox) — ajusta si cambias alturas arriba
                  height: "min(70vh, calc(100dvh - 220px))",
                }}
              >
                <div
                  className="grid mx-auto"
                  style={{
                    gap: `${gridGap}px`,
                    gridTemplateColumns: `repeat(${MATRIX_COLS}, ${cellSize}px)`,
                    gridTemplateRows: `repeat(${MATRIX_ROWS}, ${cellSize}px)`,
                    width: MATRIX_COLS * (cellSize + (gridGap)) - gridGap + "px",
                    maxWidth: "100%",
                  }}
                >
                  {letterMatrix.map((cell, index) => {
                    const isClicked = clicked[index];
                    const isCorrectCell = cell.letter === targetLetter;

                    const base =
                      "font-semibold border rounded select-none transition-colors duration-150 " +
                      "flex items-center justify-center " +
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600";

                    const stateClass = isClicked
                      ? isCorrectCell
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                        : "bg-rose-50 border-rose-300 text-rose-800"
                      : "bg-slate-100 border-slate-300 hover:bg-slate-200 hover:border-slate-400 active:bg-slate-300 cursor-pointer";

                    return (
                      <button
                        key={`cell-${index}`}
                        onClick={() => handleLetterClick(index)}
                        disabled={isClicked}
                        aria-label={`Letra ${cell.letter}`}
                        className={`${base} ${stateClass}`}
                        style={{
                          width: `${cellSize}px`,
                          height: `${cellSize}px`,
                          fontSize: `clamp(10px, ${Math.max(10, Math.floor(cellSize * 0.45))}px, 18px)`,
                          lineHeight: 1,
                        }}
                      >
                        {cell.letter}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-center gap-3 mt-4 sm:mt-6">
                <Button variant="outline" onClick={onPause} className={styles.outline}>
                  Pausar
                </Button>
                <Button onClick={finishNow} disabled={isFinishing} className={`${styles.primary} font-semibold`}>
                  {isFinishing ? "Finalizando…" : "Finalizar test"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  // completed
  return (
    <main className="min-h-[calc(100vh-56px)]">
      <section className="mx-auto max-w-3xl px-4 py-8">
        <Card className={styles.card}>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl text-slate-900">Subtest completado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-slate-600 mb-4 text-sm sm:text-base">
              Resultados registrados correctamente.
            </p>
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-200 text-sm sm:text-base text-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div><strong>Letra objetivo:</strong> {targetLetter}</div>
                <div><strong>Total en matriz:</strong> {targetTotal}</div>
                <div><strong>Aciertos:</strong> {correctHits}</div>
                <div><strong>Errores:</strong> {falseAlarms}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

export default AttentionSubtest;

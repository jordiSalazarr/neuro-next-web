"use client";

import { useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, PauseCircle } from "lucide-react";
import axios from "axios";
import { useEvaluationStore } from "@/src/stores/evaluation";
import { WORD_LIST } from "./VerbalMemorySubtest";

interface SubtestProps {
  onComplete?: (result: any) => void;
  onPause?: () => void;
}

/**
 * VerbalMemoryDelayedSubtest — UI alineada con el resto
 * - Misma lógica y contrato.
 * - Estética clínica clara, misma filosofía que otros subtests.
 */

const styles = {
  shell: "min-h-[calc(100vh-56px)]",
  card:
    "bg-white/85 backdrop-blur border border-slate-200/70 shadow-xl rounded-2xl",
  primary: "bg-brand-600 hover:bg-slate-900 text-white",
  outline: "border-slate-300 text-slate-800 hover:bg-slate-50",
  kpiLabel: "text-slate-500",
};

export default function VerbalMemoryDelayedSubtest({
  onComplete,
  onPause,
}: SubtestProps) {
  type Phase = "instructions" | "recall" | "completed";
  const [phase, setPhase] = useState<Phase>("instructions");
  const [recallText, setRecallText] = useState("");
  const [startAt, setStartAt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const postedRef = useRef(false);

  const evaluationId = useEvaluationStore((s) => s.currentEvaluation?.id);

  const begin = () => {
    setPhase("recall");
    setStartAt(new Date().toISOString());
  };

  // NO deduplicamos: preserva perseveraciones
  const parseRecallRaw = (txt: string) =>
    txt
      .split(/[\n,;\.\s]+/g)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

  const finishAndPost = async () => {
    if (!evaluationId) {
      alert("Falta evaluation_id en el estado global.");
      return;
    }
    if (postedRef.current) return;

    const recalled_words = parseRecallRaw(recallText);

    if (recalled_words.length === 0) {
      alert("Por favor, escriba al menos una palabra recordada.");
      return;
    }

    setIsSubmitting(true);
    postedRef.current = true;

    try {
      const body = {
        evaluation_id: evaluationId,
        start_at: startAt ?? new Date().toISOString(),
        given_words: WORD_LIST,
        recalled_words,
        subtype: "delayed",
      };

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/evaluations/verbal-memory`,
        body
      );

      setPhase("completed");
      onComplete?.({
        startedAtISO: startAt,
        finishedAtISO: new Date().toISOString(),
        durationSec: 0,
        payload: body,
      });
    } catch (err: any) {
      postedRef.current = false;
      alert(err?.response?.data?.message || err?.message || "Error al guardar");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== UI =====
  if (phase === "instructions") {
    return (
      <main className={styles.shell}>
        <section className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
          <header className="mb-6">
            <h1 className="text-slate-900 text-2xl sm:text-3xl font-semibold tracking-tight">
              Memoria verbal — Recuerdo diferido
            </h1>
            <p className="text-slate-600 text-sm sm:text-base mt-1 max-w-2xl">
              Sin volver a escuchar la lista original de {WORD_LIST.length}{" "}
              palabras, escriba todas las que recuerde de memoria.
            </p>
          </header>

          <Card className={styles.card}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg sm:text-xl lg:text-2xl text-slate-900">
                Instrucciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg bg-slate-50 p-4 sm:p-5 border border-slate-200">
                <p className="text-slate-700 text-sm sm:text-base">
                  Escriba todas las palabras que recuerde de la fase anterior.{" "}
                  <em>No hay un límite de tiempo estricto</em>, pero responda de
                  forma fluida y sin ayudas externas (notas, grabaciones,
                  etc.).
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">Recuerdo diferido</Badge>
                <Badge variant="secondary">Sin reconocimiento</Badge>
                <Badge variant="secondary">Una sola pasada</Badge>
              </div>
              <div className="flex justify-end gap-3 pt-1">
                {onPause && (
                  <Button
                    variant="outline"
                    onClick={onPause}
                    className={`hidden sm:inline-flex ${styles.outline}`}
                  >
                    <PauseCircle className="w-4 h-4 mr-1" />
                    Pausar
                  </Button>
                )}
                <Button
                  onClick={begin}
                  className={`${styles.primary} w-full sm:w-auto`}
                >
                  Comenzar
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  if (phase === "recall") {
    const wordsCount = parseRecallRaw(recallText).length;

    return (
      <main className={styles.shell}>
        <section className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
          {/* Cabecera sticky con estado y acciones */}
          <div className="sticky top-[56px] z-20 mb-3 sm:mb-4">
            <Card className={styles.card}>
              <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div>
                  <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>
                    Fase
                  </p>
                  <p className="font-semibold text-slate-900 text-sm sm:text-base">
                    Recuerdo diferido
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
                  <span className="hidden sm:inline">
                    Palabras escritas:
                  </span>
                  <span className="font-semibold text-slate-900">
                    {wordsCount}
                  </span>
                </div>
                <div className="flex gap-2">
                  {onPause && (
                    <Button
                      variant="outline"
                      onClick={onPause}
                      disabled={isSubmitting}
                      className={styles.outline}
                    >
                      Pausar
                    </Button>
                  )}
                  <Button
                    onClick={finishAndPost}
                    disabled={
                      isSubmitting || recallText.trim().length === 0
                    }
                    className={styles.primary}
                  >
                    {isSubmitting
                      ? "Guardando…"
                      : "Finalizar subtest (⌘/Ctrl + Enter)"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className={styles.card}>
            <CardHeader>
              <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-slate-900">
                <span className="text-base sm:text-lg">
                  Anote las palabras recordadas
                </span>
                <Badge
                  variant="outline"
                  className="text-xs sm:text-sm border-slate-300 text-slate-700"
                >
                  Lista original de {WORD_LIST.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-5">
              <label
                htmlFor="vm-delayed-recall"
                className="block text-sm font-medium text-slate-800"
              >
                Escriba las palabras recordadas (separadas por comas, puntos o
                espacios). No es necesario respetar el orden original.
              </label>
              <Textarea
                id="vm-delayed-recall"
                className="min-h-40 bg-slate-50 border-slate-300 focus-visible:ring-0 focus-visible:border-slate-400"
                value={recallText}
                onChange={(e) => setRecallText(e.target.value)}
                placeholder="Ej.: gato, perro, vaca, caballo…"
                onKeyDown={(e) => {
                  if (
                    (e.metaKey || e.ctrlKey) &&
                    e.key.toLowerCase() === "enter"
                  ) {
                    e.preventDefault();
                    void finishAndPost();
                  }
                }}
              />
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>
                  Palabras escritas:{" "}
                  <span className="font-semibold text-slate-900">
                    {wordsCount}
                  </span>
                </span>
                <span className="italic">
                  Sin feedback de aciertos para evitar sesgos.
                </span>
              </div>

              <div className="flex justify-end gap-2">
                {onPause && (
                  <Button
                    variant="outline"
                    onClick={onPause}
                    disabled={isSubmitting}
                    className={styles.outline}
                  >
                    Pausar
                  </Button>
                )}
                <Button
                  onClick={finishAndPost}
                  disabled={
                    isSubmitting || recallText.trim().length === 0
                  }
                  className={styles.primary}
                >
                  {isSubmitting
                    ? "Guardando…"
                    : "Finalizar subtest (⌘/Ctrl + Enter)"}
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
    <main className={styles.shell}>
      <section className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <Card className={styles.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 text-lg sm:text-xl">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Subtest completado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm sm:text-base text-slate-700">
              Los resultados se han guardado correctamente en la evaluación
              actual.
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

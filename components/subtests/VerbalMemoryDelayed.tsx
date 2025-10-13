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
 * VerbalMemoryDelayedSubtest — Rediseño UI/UX corporativo clínico
 * - Lógica, contrato y endpoints sin cambios.
 * - Estética alineada con los otros subtests (tonos corporativos, superficies sin blanco puro).
 * - Copys profesionales, cabeceras claras y accesibilidad/contraste mejorados.
 */

// Tokens de estilo (coherentes con el resto del sistema)
const styles = {
  backdrop: "bg-[#0E2F3C]", // azul hospital corporativo oscuro
  card: "bg-white/80 backdrop-blur border-slate-200",
  primary: "bg-[#0E7C86] hover:bg-[#0a646c] text-white",
  outline: "border-slate-300 text-slate-800 hover:bg-slate-50",
  kpiLabel: "text-slate-500",
};

export default function VerbalMemoryDelayedSubtest({ onComplete, onPause }: SubtestProps) {
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

  // Importante: NO deduplicamos para preservar perseveraciones (repeticiones)
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

    // Evita enviar vacío
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
      <div className={`min-h-[70vh] w-full ${styles.backdrop} py-8 sm:py-10 px-4`}>
        <div className="mx-auto max-w-4xl">
          <header className="mb-6">
            <h1 className="text-white/90 text-2xl sm:text-3xl font-semibold tracking-tight">
              Memoria Verbal — Recuerdo diferido
            </h1>
            <p className="text-white/70 text-sm sm:text-base mt-1 max-w-2xl">
              Sin volver a escuchar la lista original de {WORD_LIST.length} palabras, escriba todas las que recuerde.
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
                <p className="text-slate-700 text-sm sm:text-base">
                  Escriba todas las palabras que recuerde de la fase anterior. <em>No hay límite de tiempo estricto</em>,
                  pero responda de forma fluida y sin ayudas externas.
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">Recuerdo diferido</Badge>
                <Badge variant="secondary">Sin reconocimiento</Badge>
                <Badge variant="secondary">Una sola pasada</Badge>
              </div>
              <div className="flex justify-end gap-3">
                {onPause && (
                  <Button variant="outline" onClick={onPause} className={styles.outline}>
                    <PauseCircle className="w-4 h-4 mr-1" /> Pausar
                  </Button>
                )}
                <Button onClick={begin} className={styles.primary}>Comenzar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === "recall") {
    const wordsCount = parseRecallRaw(recallText).length;

    return (
      <div className={`min-h-[70vh] w-full ${styles.backdrop} py-8 px-4`}>
        <div className="mx-auto max-w-4xl">
          {/* Cabecera sticky con estado y acciones */}
          <div className="sticky top-0 z-20 mb-3">
            <Card className={`${styles.card} shadow-lg`}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>Fase</p>
                    <p className="font-semibold text-slate-900">Recuerdo diferido</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <span className="hidden sm:inline">Palabras escritas:</span>
                    <span className="font-semibold text-slate-900">{wordsCount}</span>
                  </div>
                  <div className="flex gap-2">
                    {onPause && (
                      <Button variant="outline" onClick={onPause} disabled={isSubmitting} className={styles.outline}>
                        Pausar
                      </Button>
                    )}
                    <Button
                      onClick={finishAndPost}
                      disabled={isSubmitting || recallText.trim().length === 0}
                      className={styles.primary}
                    >
                      {isSubmitting ? "Guardando…" : "Finalizar subtest (⌘/Ctrl + Enter)"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className={`${styles.card} shadow-xl`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-slate-900">
                <span>Anote las palabras recordadas</span>
                <Badge variant="outline">Lista original de {WORD_LIST.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label htmlFor="vm-delayed-recall" className="block text-sm font-medium text-slate-800">
                Escriba las palabras recordadas (separadas por comas, puntos o espacios). No indique un orden específico.
              </label>
              <Textarea
                id="vm-delayed-recall"
                className="min-h-40 bg-slate-50 border-slate-300 focus-visible:ring-0 focus-visible:border-slate-400"
                value={recallText}
                onChange={(e) => setRecallText(e.target.value)}
                placeholder="Ej.: manzana, perro, falda, plátano…"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "enter") {
                    e.preventDefault();
                    void finishAndPost();
                  }
                }}
              />
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>
                  Palabras escritas: <span className="font-semibold text-slate-900">{wordsCount}</span>
                </span>
                <span className="italic">Sin feedback de aciertos para evitar sesgos.</span>
              </div>

              <div className="flex justify-end gap-2">
                {onPause && (
                  <Button variant="outline" onClick={onPause} disabled={isSubmitting} className={styles.outline}>
                    Pausar
                  </Button>
                )}
                <Button
                  onClick={finishAndPost}
                  disabled={isSubmitting || recallText.trim().length === 0}
                  className={styles.primary}
                >
                  {isSubmitting ? "Guardando…" : "Finalizar subtest (⌘/Ctrl + Enter)"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.backdrop} min-h-[60vh] py-8 px-4`}>
      <div className="mx-auto max-w-3xl">
        <Card className={`${styles.card} shadow-xl`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Subtest completado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">Los resultados se han guardado correctamente.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
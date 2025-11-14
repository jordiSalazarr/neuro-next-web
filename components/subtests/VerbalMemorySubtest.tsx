"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Volume2, CheckCircle2 } from "lucide-react";
import axios from "axios";
import { useEvaluationStore } from "@/src/stores/evaluation";

export const WORD_LIST = ["gato", "perro", "vaca", "caballo", "camello", "serpiente"];

interface SubtestProps {
  onComplete?: (result: any) => void;
  onPause?: () => void;
}

// Tokens visuales (alineados con el resto de pantallas)
const styles = {
  shell: "min-h-[calc(100vh-56px)]",
  card:
    "bg-white/85 backdrop-blur border border-slate-200/70 shadow-xl rounded-2xl",
  primary: "bg-brand-600 hover:bg-slate-900 text-white",
  outline: "border-slate-300 text-slate-800 hover:bg-slate-50",
  kpiLabel: "text-slate-500",
  warn: "bg-amber-50 border border-amber-200 text-amber-900",
};

export function VerbalMemorySubtest({ onComplete, onPause }: SubtestProps) {
  type Phase = "instructions" | "listening" | "recall" | "completed";
  const [phase, setPhase] = useState<Phase>("instructions");
  const [isPlaying, setIsPlaying] = useState(false);
  const [recallText, setRecallText] = useState("");
  const [startAt, setStartAt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const postedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const evaluationId = useEvaluationStore((s) => s.currentEvaluation?.id);

  // Carga audio (voz humana en /public/audio/)
  useEffect(() => {
    const audio = new Audio("/audio/memory_test_audio.m4a");
    audioRef.current = audio;
    audio.preload = "auto";
    audio.addEventListener("ended", () => {
      setPhase("recall");
      setIsPlaying(false);
    });
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Autofocus en recuerdo
  useEffect(() => {
    if (phase === "recall") {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [phase]);

  const begin = () => {
    setPhase("listening");
    setStartAt(new Date().toISOString());
  };

  const playListOnce = async () => {
    if (isPlaying || !audioRef.current) return;
    setIsPlaying(true);
    try {
      await audioRef.current.play();
    } catch (err) {
      console.error(err);
      alert(
        "No se pudo reproducir el audio. En iOS/Safari, toca primero el botón de reproducción."
      );
      setIsPlaying(false);
    }
  };

  // Parsing no destructivo
  const parseRecall = (txt: string) =>
    txt
      .split(/[\n,;\s]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

  // Métricas en vivo (solo UI)
  const parsedWords = useMemo(() => parseRecall(recallText), [recallText]);
  const uniqueWords = useMemo(
    () => Array.from(new Set(parsedWords.map((w) => w.toLowerCase()))),
    [parsedWords]
  );

  const finishAndPost = async () => {
    if (!evaluationId) {
      alert("Falta evaluation_id en el estado global.");
      return;
    }
    if (postedRef.current) return;

    const recalled = parseRecall(recallText);
    setIsSubmitting(true);
    postedRef.current = true;

    try {
      const body = {
        evaluation_id: evaluationId,
        start_at: startAt ?? new Date().toISOString(),
        given_words: WORD_LIST,
        recalled_words: recalled,
        subtype: "immediate",
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

  // ===== RENDER =====
  if (phase === "instructions") {
    return (
      <main className={styles.shell}>
        <section className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
          <header className="mb-6">
            <h1 className="text-slate-900 text-2xl sm:text-3xl font-semibold tracking-tight">
              Memoria verbal
            </h1>
            <p className="text-slate-600 text-sm sm:text-base mt-1 max-w-2xl">
              Escucharás una lista de palabras y, a continuación, escribirás
              todas las que recuerdes.
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
                  Se reproducirá una grabación con{" "}
                  <strong>{WORD_LIST.length} palabras</strong>. Después, anota
                  todas las palabras que recuerdes —en cualquier orden—
                  separándolas por espacios o comas.
                </p>
              </div>
              <div
                className={`${styles.warn} rounded-lg p-3 sm:p-4 text-sm sm:text-base`}
              >
                <strong>Importante:</strong> asegúrate de tener el sonido
                activado. En iOS/Safari, puede requerirse tocar el botón de
                reproducción.
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">Lista única</Badge>
                <Badge variant="secondary">Sin ensayos repetidos</Badge>
                <Badge variant="secondary">Sin retardo</Badge>
              </div>
              <div className="flex justify-end gap-3 pt-1">
                {onPause && (
                  <Button
                    variant="outline"
                    onClick={onPause}
                    className={`hidden sm:inline-flex ${styles.outline}`}
                  >
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

  if (phase === "listening") {
    return (
      <main className={styles.shell}>
        <section className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
          <Card className={styles.card}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-slate-900">
                <span className="text-base sm:text-lg">
                  Escucha de la lista (1 vez)
                </span>
                <Badge
                  variant="outline"
                  className="text-xs sm:text-sm border-slate-300 text-slate-700"
                >
                  Presentación
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-5 text-center">
              <p className="text-slate-600 text-sm sm:text-base">
                Pulsa el botón para reproducir la lista de palabras. Después
                pasarás automáticamente a la fase de recuerdo.
              </p>
              <Button
                onClick={playListOnce}
                disabled={isPlaying}
                size="lg"
                className={`${styles.primary}`}
              >
                <Volume2 className="w-5 h-5 mr-2" />
                {isPlaying ? "Reproduciendo…" : "Reproducir lista"}
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  if (phase === "recall") {
    return (
      <main className={styles.shell}>
        <section className="mx-auto max-w-5xl px-4 py-8">
          {/* Barra superior sticky con acciones y KPIs simples */}
          <div className="sticky top-[56px] z-20 mb-3 sm:mb-4">
            <Card className={styles.card}>
              <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div>
                  <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>
                    Fase
                  </p>
                  <p className="font-semibold text-slate-900 text-sm sm:text-base">
                    Recuerdo inmediato
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                  <Badge variant="secondary">
                    Total tecleado: {parsedWords.length}
                  </Badge>
                  <Badge variant="outline">
                    Únicas: {uniqueWords.length}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {onPause && (
                    <Button
                      variant="outline"
                      onClick={onPause}
                      className={styles.outline}
                    >
                      Pausar
                    </Button>
                  )}
                  <Button
                    onClick={finishAndPost}
                    disabled={isSubmitting || recallText.trim().length === 0}
                    className={styles.primary}
                  >
                    {isSubmitting ? "Guardando…" : "Finalizar subtest"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className={styles.card}>
            <CardHeader>
              <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-slate-900">
                <span className="text-base sm:text-lg">
                  Anota las palabras recordadas
                </span>
                <Badge
                  variant="outline"
                  className="text-xs sm:text-sm border-slate-300 text-slate-700"
                >
                  Lista de {WORD_LIST.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-5">
              <label
                htmlFor="recall-input"
                className="block text-sm font-medium text-slate-800"
              >
                Escribe las palabras separadas por comas o espacios:
              </label>
              <Textarea
                id="recall-input"
                ref={textareaRef}
                className="min-h-40 bg-slate-50 border-slate-300 focus-visible:ring-0 focus-visible:border-slate-400"
                value={recallText}
                onChange={(e) => setRecallText(e.target.value)}
                placeholder="escriba aquí..."
                aria-label="Área para escribir palabras recordadas"
              />

              {parsedWords.length > 0 && (
                <div className="space-y-2">
                  <p className={`${styles.kpiLabel} text-xs`}>
                    Previsualización (únicas)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {uniqueWords.map((w, i) => (
                      <Badge
                        key={`${w}-${i}`}
                        variant="secondary"
                        className="text-[12px]"
                      >
                        {w}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

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
                  disabled={isSubmitting || recallText.trim().length === 0}
                  className={styles.primary}
                >
                  {isSubmitting ? "Guardando…" : "Finalizar subtest"}
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
          <CardContent className="space-y-4 sm:space-y-5">
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-200 text-sm sm:text-base text-slate-700">
              Los resultados se han guardado correctamente en la evaluación
              actual.
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

export default VerbalMemorySubtest;

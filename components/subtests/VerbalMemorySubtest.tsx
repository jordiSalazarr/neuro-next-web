"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Volume2, CheckCircle2 } from "lucide-react";
import axios from "axios";
import { useEvaluationStore } from "@/src/stores/evaluation";

export const WORD_LIST = [
  "gato",
  "perro",
  "vaca",
  "caballo",
  "camello",
  "serpiente",
];

interface SubtestProps {
  onComplete?: (result: any) => void;
  onPause?: () => void;
}

// Tokens de estilo corporativo
const styles = {
  backdrop: "bg-[#0E2F3C]",
  card: "bg-white/80 backdrop-blur border-slate-200",
  surface: "bg-slate-50/60",
  primary: "bg-[#0E7C86] hover:bg-[#0a646c] text-white",
  outline: "border-slate-300 text-slate-800 hover:bg-slate-50",
  kpiLabel: "text-slate-500",
  kpiValue: "text-slate-900",
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

  const evaluationId = useEvaluationStore((s) => s.currentEvaluation?.id);

  // Carga el audio humano desde /public/audio/
  useEffect(() => {
    const audio = new Audio("/audio/memory_test_audio.m4a");
    audioRef.current = audio;
    audio.preload = "auto";
    // Pasar a la fase de recuerdo al finalizar el audio
    audio.addEventListener("ended", () => {
      setPhase("recall");
      setIsPlaying(false);
    });
    // audio.addEventListener("error", (err) => {
    //   console.error("Error cargando audio:", err);
    //   alert("No se pudo cargar el audio. Verifica la ruta de audio");
    //   setIsPlaying(false);
    // });

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

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
      alert("No se pudo reproducir el audio. Verifica que el usuario haya interactuado antes (click).");
      setIsPlaying(false);
    }
  };

  const parseRecall = (txt: string) =>
    txt
      .split(/[\n,;\s]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

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
      <div className={`min-h-[70vh] w-full ${styles.backdrop} py-8 sm:py-10 px-4`}>
        <div className="mx-auto max-w-4xl">
          <header className="mb-6">
            <h1 className="text-white/90 text-2xl sm:text-3xl font-semibold tracking-tight">
              Memoria Verbal
            </h1>
            <p className="text-white/70 text-sm sm:text-base mt-1 max-w-2xl">
              Escucharás una lista única de palabras grabadas con voz humana y, a continuación, escribirás todas las que recuerdes.
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
                  Se reproducirá una grabación de audio con <strong>{WORD_LIST.length} palabras</strong>.
                  Después, anote todas las palabras que recuerde —<em>en cualquier orden</em>— separándolas por espacios o comas.
                </p>
              </div>
              <div className={`${styles.warn} rounded-lg p-3 sm:p-4`}>
                <p className="text-sm sm:text-base">
                  <strong>Importante:</strong> asegúrese de tener el sonido activado. En iOS, debe tocar el botón de reproducción para iniciar el audio.
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">Lista única</Badge>
                <Badge variant="secondary">Sin ensayos repetidos</Badge>
                <Badge variant="secondary">Sin retardo</Badge>
              </div>
              <div className="flex justify-end gap-3">
                {onPause && (
                  <Button variant="outline" onClick={onPause} className={styles.outline}>Pausar</Button>
                )}
                <Button onClick={begin} className={`${styles.primary}`}>Comenzar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === "listening") {
    return (
      <div className={`min-h-[60vh] w-full ${styles.backdrop} py-6 px-4`}>
        <div className="mx-auto max-w-3xl">
          <Card className={`${styles.card} shadow-xl`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-slate-900">
                <span>Escucha de la lista (1 vez)</span>
                <Badge variant="outline">Presentación</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                onClick={playListOnce}
                disabled={isPlaying}
                size="lg"
                className={`${styles.primary} mb-2`}
              >
                <Volume2 className="w-5 h-5 mr-2" />{" "}
                {isPlaying ? "Reproduciendo…" : "Reproducir lista"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === "recall") {
    return (
      <div className={`min-h-[70vh] w-full ${styles.backdrop} py-8 px-4`}>
        <div className="mx-auto max-w-4xl">
          <div className="sticky top-0 z-20 mb-3">
            <Card className={`${styles.card} shadow-lg`}>
              <CardContent className="p-3 sm:p-4 flex items-center justify-between">
                <div>
                  <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>Fase</p>
                  <p className="font-semibold text-slate-900">Recuerdo inmediato</p>
                </div>
                <div className="flex gap-2">
                  {onPause && (
                    <Button variant="outline" onClick={onPause} className={styles.outline}>Pausar</Button>
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

          <Card className={`${styles.card} shadow-xl`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-slate-900">
                <span>Anote las palabras recordadas</span>
                <Badge variant="outline">Lista de {WORD_LIST.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block text-sm font-medium text-slate-800">
                Escriba las palabras recordadas (separadas por comas o espacios):
              </label>
              <Textarea
                className="min-h-40 bg-slate-50 border-slate-300 focus-visible:ring-0 focus-visible:border-slate-400"
                value={recallText}
                onChange={(e) => setRecallText(e.target.value)}
                placeholder="Ej.: manzana, perro, falda, plátano…"
              />
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
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Test completado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Los resultados se han guardado correctamente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

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
  // "chaqueta",
  // "falda",
  // "perro",
  // "gato",
  // "vaca",
  // "caballo",
];

interface SubtestProps {
  onComplete?: (result: any) => void;
  onPause?: () => void;
}

/**
 * VerbalMemorySubtest — Rediseño UI/UX corporativo clínico
 * - Mantiene la lógica y el contrato API originales.
 * - Mejora: tonos corporativos (evitando blanco puro), jerarquía tipográfica,
 *   cabecera sticky con estado, botones de acción claros y copy profesional.
 */

// Tokens de estilo corporativo (coherentes con el resto de subtests)
const styles = {
  backdrop: "bg-[#0E2F3C]", // azul hospital corporativo oscuro
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

  const evaluationId = useEvaluationStore((s) => s.currentEvaluation?.id);

  // ---- TTS state/refs ----
  const voicesRef = useRef<SpeechSynthesisVoice[] | null>(null);
  const cancelingRef = useRef(false);

  const hasSpeech =
    typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined";

  // Carga las voces (algunos navegadores tardan en exponerlas).
  useEffect(() => {
    if (!hasSpeech) return;
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length) voicesRef.current = v;
    };
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", load);
    };
  }, [hasSpeech]);

  // Cancela cualquier síntesis si se desmonta o se cambia de fase
  useEffect(() => {
    return () => {
      if (hasSpeech) {
        cancelingRef.current = true;
        window.speechSynthesis.cancel();
        cancelingRef.current = false;
      }
    };
  }, [hasSpeech]);

  const pickVoice = (): SpeechSynthesisVoice | undefined => {
    const voices = voicesRef.current || window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return undefined;
    // Preferencias: es-ES / es- / latam, luego cualquier cosa
    const prefer = (pred: (v: SpeechSynthesisVoice) => boolean) =>
      voices.find(pred);
    return (
      prefer((v) => /^(es-ES|es-419|es-MX|es-AR|es-CO|es)/i.test(v.lang)) ||
      prefer((v) => /spanish/i.test(v.name)) ||
      voices[0]
    );
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const speakOnce = (text: string, opts?: Partial<SpeechSynthesisUtterance>) =>
    new Promise<void>((resolve, reject) => {
      if (!hasSpeech) return reject(new Error("speechSynthesis no soportado"));
      const u = new SpeechSynthesisUtterance(text);
      const voice = pickVoice();
      if (voice) u.voice = voice;
      u.lang = voice?.lang || "es-ES";
      u.rate = opts?.rate ?? 0.95; // un poco más lento mejora comprensión
      u.pitch = opts?.pitch ?? 1.0;
      u.volume = opts?.volume ?? 1.0;

      u.onend = () => resolve();
      u.onerror = (e) => reject(e.error || new Error("TTS error"));
      try {
        window.speechSynthesis.cancel(); // iOS: limpiar cola
      } catch {}
      window.speechSynthesis.speak(u);
    });

  const begin = () => {
    setPhase("listening");
    setStartAt(new Date().toISOString());
  };

  const playListOnce = async () => {
    if (isPlaying) return;
    setIsPlaying(true);

    if (!hasSpeech) {
      setIsPlaying(false);
      alert(
        "Tu navegador no soporta síntesis de voz. Prueba Chrome/Edge/Safari actualizados o activa el permiso de voz."
      );
      return;
    }

    try {
      await speakOnce("A continuación escucharás una lista de palabras. Presta atención.");
      await sleep(250);

      for (let i = 0; i < WORD_LIST.length; i++) {
        const word = WORD_LIST[i];
        await speakOnce(word, { rate: 0.95 });
        if (i < WORD_LIST.length - 1) await sleep(250);
        if (cancelingRef.current) throw new Error("cancelled");
      }

      await sleep(200);
      setPhase("recall");
    } catch (e: any) {
      if (e?.message !== "cancelled") {
        console.error("TTS error:", e);
        alert(
          "No se pudo reproducir la lista por voz. Verifica permisos de sonido/voz en el navegador."
        );
      }
    } finally {
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
              Escucharás una lista única de palabras y, a continuación, escribirás todas las que recuerdes.
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
                  Se presentará <strong>una sola lista</strong> de <strong>{WORD_LIST.length} palabras</strong> mediante voz.
                  Después, anote todas las palabras que recuerde —<em>en cualquier orden</em>— separándolas por espacios o comas.
                </p>
              </div>
              <div className={`${styles.warn} rounded-lg p-3 sm:p-4`}>
                <p className="text-sm sm:text-base"><strong>Importante:</strong> asegúrese de tener el sonido activado.
                En iOS, inicie la reproducción tras tocar el botón para permitir el audio.</p>
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
            <CardContent className="space-y-4">
              <div className="text-center">
                <Button onClick={playListOnce} disabled={isPlaying} size="lg" className={`${styles.primary} mb-2`}>
                  <Volume2 className="w-5 h-5 mr-2" /> {isPlaying ? "Reproduciendo…" : "Reproducir lista"}
                </Button>
                {!hasSpeech && (
                  <p className="text-xs text-rose-600 mt-2">
                    Tu navegador no soporta síntesis de voz.
                  </p>
                )}
              </div>
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
          {/* Cabecera sticky con estado */}
          <div className="sticky top-0 z-20 mb-3">
            <Card className={`${styles.card} shadow-lg`}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>Fase</p>
                    <p className="font-semibold text-slate-900">Recuerdo inmediato</p>
                  </div>
                  <div className="flex gap-2">
                    {onPause && (
                      <Button variant="outline" onClick={onPause} className={styles.outline}>Pausar</Button>
                    )}
                    <Button onClick={finishAndPost} disabled={isSubmitting || recallText.trim().length === 0} className={styles.primary}>
                      {isSubmitting ? "Guardando…" : "Finalizar subtest"}
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
                  <Button variant="outline" onClick={onPause} disabled={isSubmitting} className={styles.outline}>
                    Pausar
                  </Button>
                )}
                <Button onClick={finishAndPost} disabled={isSubmitting || recallText.trim().length === 0} className={styles.primary}>
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
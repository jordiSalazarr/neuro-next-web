"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Volume2, CheckCircle2 } from "lucide-react";
import axios from "axios";
import { useEvaluationStore } from "@/src/stores/evaluation";

const WORD_LIST = [
  "pera",
  "manzana",
  "plátano",
  "uva",
  "camisa",
  "pantalón",
  "chaqueta",
  "falda",
  "perro",
  "gato",
  "vaca",
  "caballo",
];

interface SubtestProps {
  onComplete?: (result: any) => void;
  onPause?: () => void;
}

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
      u.rate = opts?.rate ?? 0.95;  // un poco más lento mejora comprensión
      u.pitch = opts?.pitch ?? 1.0;
      u.volume = opts?.volume ?? 1.0;

      u.onend = () => resolve();
      u.onerror = (e) => reject(e.error || new Error("TTS error"));
      // iOS a veces necesita cancelar colas antes
      try {
        window.speechSynthesis.cancel();
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
      // “Warm-up” para Safari/iOS: una utterance corta asegura desbloqueo por gesto
      await speakOnce("A continuación escucharás una lista de palabras. Presta atención.");

      // Pausa breve antes de empezar
      await sleep(250);

      for (let i = 0; i < WORD_LIST.length; i++) {
        const word = WORD_LIST[i];
        // lee la palabra
        await speakOnce(word, { rate: 0.95 });
        // micro-pausa entre palabras para separar bien
        if (i < WORD_LIST.length - 1) await sleep(250);
        // Si se canceló desde fuera, corta
        if (cancelingRef.current) throw new Error("cancelled");
      }

      // Mensaje de cierre y paso de fase
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
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Memoria Verbal — 1 única prueba</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded">
            <p className="text-blue-900 text-sm">
              Escucharás una lista de <strong>12 palabras</strong> una sola vez.
              A continuación, escribe todas las que recuerdes.
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">Lista única</Badge>
            <Badge variant="secondary">Sin ensayos repetidos</Badge>
            <Badge variant="secondary">Sin retardo ni reconocimiento</Badge>
          </div>
          <div className="flex justify-end">
            <Button onClick={begin}>Comenzar</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === "listening") {
    return (
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Escucha de la lista (1 vez)</span>
            <Badge variant="outline">Presentación</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Button onClick={playListOnce} disabled={isPlaying} size="lg" className="mb-2">
              <Volume2 className="w-5 h-5 mr-2" />{" "}
              {isPlaying ? "Reproduciendo…" : "Reproducir lista"}
            </Button>
            {!hasSpeech && (
              <p className="text-xs text-red-600 mt-2">
                Tu navegador no soporta síntesis de voz.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === "recall") {
    return (
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recuerdo inmediato</span>
            <Badge variant="outline">Una sola prueba</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block text-sm font-medium">
            Escribe todas las palabras recordadas (separadas por comas o espacios):
          </label>
          <Textarea
            className="min-h-32"
            value={recallText}
            onChange={(e) => setRecallText(e.target.value)}
            placeholder="Ej.: manzana, perro, falda, plátano…"
          />
          <div className="flex justify-end gap-2">
            {onPause && (
              <Button variant="outline" onClick={onPause} disabled={isSubmitting}>
                Pausar
              </Button>
            )}
            <Button onClick={finishAndPost} disabled={isSubmitting || recallText.trim().length === 0}>
              {isSubmitting ? "Guardando…" : "Finalizar subtest"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" /> Test completado
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Los resultados se han guardado correctamente.
        </p>
      </CardContent>
    </Card>
  );
}

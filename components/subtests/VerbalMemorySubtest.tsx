"use client";

import { useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Volume2, CheckCircle2 } from "lucide-react";
import axios from "axios";
import { useEvaluationStore } from "@/stores/evaluation";


// ⬇️ Ajusta la lista a la que realmente vayas a presentar (ejemplo basado en tu JSON)
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

// Props mínimas (compatibles con tu TestRunner/route-shell: onComplete opcional)
interface SubtestProps {
  onComplete?: (result: any) => void;
  onPause?: () => void;
}

export function VerbalMemorySubtest({ onComplete, onPause }: SubtestProps) {
  // FASES reducidas a 1 sola prueba: instrucciones → escucha → recuerdo → completado
  type Phase = "instructions" | "listening" | "recall" | "completed";
  const [phase, setPhase] = useState<Phase>("instructions");
  const [isPlaying, setIsPlaying] = useState(false);
  const [recallText, setRecallText] = useState("");
  const [startAt, setStartAt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const postedRef = useRef(false); // guarda frente a dobles POST

  const evaluationId = useEvaluationStore((s) => s.currentEvaluation?.id);

  const begin = () => {
    setPhase("listening");
    const nowISO = new Date().toISOString();
    setStartAt(nowISO);
  };

  const playListOnce = () => {
    if (isPlaying) return;
    setIsPlaying(true);
    // Aquí pondrías el TTS/audio real. Para demo, simulamos 4s.
    setTimeout(() => {
      setIsPlaying(false);
      setPhase("recall");
    }, 4000);
    // (opcional) enseñar lista durante el play en UI controlada
    // alert(`Lista: ${WORD_LIST.join(", ")}`);
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
    if (postedRef.current) return; // idempotencia en UI

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

      await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/evaluations/verbal-memory`, body);

      setPhase("completed");

      // Notifica arriba (por si tu shell navega al siguiente subtest)
      onComplete?.({
        startedAtISO: startAt,
        finishedAtISO: new Date().toISOString(),
        durationSec: 0,
        payload: body,
      });
    } catch (err: any) {
      postedRef.current = false; // permite reintentar
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
              Escucharás una lista de <strong>12 palabras</strong> una sola vez. A continuación, escribe todas las que recuerdes.
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
              <Volume2 className="w-5 h-5 mr-2" /> {isPlaying ? "Reproduciendo…" : "Reproducir lista"}
            </Button>
            <p className="text-xs text-muted-foreground">(Simulado: tras ~4s pasará al recuerdo)</p>
          </div>
          {/* Si quieres mostrar la lista en pantalla para validación clínica (opcional): */}
          {/* <div className="text-sm bg-muted p-3 rounded">{WORD_LIST.join(", ")}</div> */}
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
          <label className="block text-sm font-medium">Escribe todas las palabras recordadas (separadas por comas o espacios):</label>
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
        <p className="text-sm text-muted-foreground">Los resultados se han guardado correctamente.</p>
      </CardContent>
    </Card>
  );
}

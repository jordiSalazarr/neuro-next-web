"use client";

import { useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, PauseCircle } from "lucide-react";
import axios from "axios";
import { useEvaluationStore } from "@/src/stores/evaluation";

interface SubtestProps {
  onComplete?: (result: any) => void;
  onPause?: () => void;
}

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
  // Importante: NO deduplicamos para preservar perseveraciones (repeticiones)
  const parseRecallRaw = (txt: string) =>
    txt
      .split(/[\n,;.\s]+/g)
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
      alert("Por favor, escribe al menos una palabra recordada.");
      return;
    }

    setIsSubmitting(true);
    postedRef.current = true;

    try {
      const body = {
        evaluation_id: evaluationId,
        start_at: startAt ?? new Date().toISOString(),
        given_words:WORD_LIST,
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
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Memoria Verbal — Recuerdo diferido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded">
            <p className="text-blue-900 text-sm">
              Ahora, sin volver a escuchar la lista, escribe todas las palabras que recuerdes de la fase anterior.
              <br />
              <span className="font-medium">No hay límite de tiempo estricto</span>, pero intenta responder de forma
              fluida sin buscar ayudas externas.
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">Recuerdo diferido</Badge>
            <Badge variant="secondary">Sin reconocimiento</Badge>
            <Badge variant="secondary">Una sola pasada</Badge>
          </div>
          <div className="flex justify-end gap-2">
            {onPause && (
              <Button variant="outline" onClick={onPause}>
                <PauseCircle className="w-4 h-4 mr-1" />
                Pausar
              </Button>
            )}
            <Button onClick={begin}>Comenzar</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === "recall") {
    const wordsCount = parseRecallRaw(recallText).length;

    return (
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recuerdo diferido</span>
            <Badge variant="outline">Entrada libre</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label htmlFor="vm-delayed-recall" className="block text-sm font-medium">
            Escribe todas las palabras que recuerdes (separadas por comas, puntos o espacios). No des orden específico.
          </label>
          <Textarea
            id="vm-delayed-recall"
            className="min-h-32"
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
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Palabras escritas: <span className="font-semibold">{wordsCount}</span></span>
            <span className="italic">No se proporciona feedback de aciertos para evitar sesgos.</span>
          </div>

          <div className="flex justify-end gap-2">
            {onPause && (
              <Button variant="outline" onClick={onPause} disabled={isSubmitting}>
                Pausar
              </Button>
            )}
            <Button
              onClick={finishAndPost}
              disabled={isSubmitting || recallText.trim().length === 0}
            >
              {isSubmitting ? "Guardando…" : "Finalizar subtest (⌘/Ctrl + Enter)"}
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
          <CheckCircle2 className="h-5 w-5 text-green-600" /> Subtest completado
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

"use client";

import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { SubtestProps } from "@/types";
import { useEvaluationStore } from "@/src/stores/evaluation";

type DrawingPoint = { x: number; y: number };
type DrawingStroke = { points: DrawingPoint[]; timestamp: number; order: number };

type ClockItem = { time: string; description?: string };

type Props = SubtestProps & {
  apiBaseUrl?: string;
  /** Ruta relativa del POST final (JSON) */
  submitPath?: string; // por defecto: /v1/visual-spatial/subtests
  /** Solo se usará el primer item si pasas múltiple */
  times?: (string | ClockItem)[];
};

const DEFAULT_CLOCK: ClockItem = { time: "11:10", description: "once y diez" };

function firstClock(times?: (string | ClockItem)[]): ClockItem {
  if (!times || times.length === 0) return DEFAULT_CLOCK;
  const t = times[0];
  return typeof t === "string" ? { time: t } : t;
}

function parseHHmm(time: string): { hour: number; min: number } {
  const [h, m] = time.trim().split(":");
  const hour = Math.max(0, Math.min(23, Number(h)));
  const min = Math.max(0, Math.min(59, Number(m)));
  return { hour, min };
}

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const off = document.createElement("canvas");
  off.width = canvas.width;
  off.height = canvas.height;
  const ctx = off.getContext("2d")!;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, off.width, off.height);
  ctx.drawImage(canvas, 0, 0);
  return new Promise<Blob>((resolve, reject) => {
    off.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob error"))), "image/png", 1.0);
  });
}

/** Reloj de referencia “perfecto” para la hora objetivo */
function PerfectClock({ hour, min, size = 260 }: { hour: number; min: number; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;

  const minuteAngle = (min % 60) * 6; // 6° por minuto
  const hourAngle = ((hour % 12) * 30) + (min * 0.5); // 30° por hora + 0.5° por min

  const deg2rad = (d: number) => (Math.PI / 180) * (d - 90); // 0° = arriba (12)
  const handEnd = (len: number, angle: number) => ({
    x: cx + len * Math.cos(deg2rad(angle)),
    y: cy + len * Math.sin(deg2rad(angle)),
  });

  const hourEnd = handEnd(r * 0.55, hourAngle);
  const minEnd = handEnd(r * 0.8, minuteAngle);

  const nums = Array.from({ length: 12 }, (_, i) => i + 1);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="#fff" stroke="#111827" strokeWidth="2" />
      {/* marcas finas */}
      {Array.from({ length: 60 }, (_, i) => {
        const angle = i * 6;
        const inner = i % 5 === 0 ? r * 0.88 : r * 0.94;
        const outer = r * 0.99;
        const x1 = cx + inner * Math.cos(deg2rad(angle));
        const y1 = cy + inner * Math.sin(deg2rad(angle));
        const x2 = cx + outer * Math.cos(deg2rad(angle));
        const y2 = cy + outer * Math.sin(deg2rad(angle));
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9CA3AF" strokeWidth={i % 5 === 0 ? 2 : 1} />;
      })}
      {/* números */}
      {nums.map((n) => {
        const angle = n * 30;
        const rr = r * 0.78;
        const x = cx + rr * Math.cos(deg2rad(angle));
        const y = cy + rr * Math.sin(deg2rad(angle)) + 4; // compensación vertical
        return (
          <text key={n} x={x} y={y} fontSize={size * 0.08} textAnchor="middle" fill="#111827" fontFamily="system-ui, -apple-system, Segoe UI, Roboto">
            {n}
          </text>
        );
      })}
      {/* eje */}
      <circle cx={cx} cy={cy} r={3} fill="#111827" />
      {/* manecilla hora */}
      <line x1={cx} y1={cy} x2={hourEnd.x} y2={hourEnd.y} stroke="#111827" strokeWidth="4" strokeLinecap="round" />
      {/* manecilla minuto */}
      <line x1={cx} y1={cy} x2={minEnd.x} y2={minEnd.y} stroke="#111827" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function VisuospatialSubtest({
  onComplete,
  onPause,
  apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8401",
  submitPath = "/v1/evaluations/visual-spatial",
  times,
}: Props) {
  const targetClock = firstClock(times);
  const { hour, min } = parseHHmm(targetClock.time);
  const evaluationId = useEvaluationStore((s) => s.currentEvaluation?.id);

  const [phase, setPhase] = useState<"instructions" | "drawing" | "evaluating" | "submitted">("instructions");

  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<DrawingPoint[]>([]);
  const [strokeOrder, setStrokeOrder] = useState(0);

  const [apiUrl, setApiUrl] = useState(apiBaseUrl);

  const [score, setScore] = useState<string>("3");
  const [note, setNote] = useState<string>("");

  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Redibuja canvas
  useEffect(() => {
    if (phase !== "drawing" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Guía: círculo suave
    ctx.strokeStyle = "#E5E7EB";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, Math.min(W, H) * 0.375, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    // Trazos ya pintados
    strokes.forEach((s) => {
      if (s.points.length > 1) {
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(s.points[0].x, s.points[0].y);
        for (const p of s.points) ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
    });

    // Trazo actual
    if (currentStroke.length > 1) {
      ctx.strokeStyle = "#3B82F6";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
      for (const p of currentStroke) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  }, [phase, strokes, currentStroke]);

  // Eventos de dibujo
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || phase !== "drawing") return;

    const getXY = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
    };

    const onDown = (ev: PointerEvent) => {
      ev.preventDefault();
      if (phase !== "drawing") return;
      canvas.setPointerCapture(ev.pointerId);
      setIsDrawing(true);
      const p = getXY(ev);
      setCurrentStroke([{ x: p.x, y: p.y }]);
    };

    const onMove = (ev: PointerEvent) => {
      if (!isDrawing || phase !== "drawing") return;
      const p = getXY(ev);
      setCurrentStroke((prev) => [...prev, { x: p.x, y: p.y }]);
    };

    const onUp = (ev: PointerEvent) => {
      if (!isDrawing) return;
      setIsDrawing(false);
      canvas.releasePointerCapture(ev.pointerId);
      setCurrentStroke((prev) => {
        if (prev.length > 1) {
          const newStroke: DrawingStroke = {
            points: prev,
            timestamp: Date.now(),
            order: strokeOrder,
          };
          setStrokes((s) => [...s, newStroke]);
          setStrokeOrder((o) => o + 1);
        }
        return [];
      });
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerleave", onUp);

    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onUp);
    };
  }, [phase, isDrawing, strokeOrder]);

  const startSubtest = () => {
    setPhase("drawing");
    setStrokes([]);
    setStrokeOrder(0);
    setUserImageUrl(null);
    setNote("");
    setScore("3");
  };

  const clearCanvas = () => {
    setStrokes([]);
    setCurrentStroke([]);
    setStrokeOrder(0);
  };

  const proceedToEvaluation = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pngBlob = await canvasToPngBlob(canvas);
    const url = URL.createObjectURL(pngBlob);
    setUserImageUrl(url);
    setPhase("evaluating");
  };

  const submitScore = async () => {
    if (!evaluationId) {
      console.error("No hay evaluationId en el store");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        evaluation_id: String(evaluationId),
        note: note || "",
        score: Number(score),
      };
      const url = `${apiUrl.replace(/\/+$/, "")}${submitPath}`;
      await axios.post(url, payload, {
        headers: { "Content-Type": "application/json" },
      });

      setPhase("submitted");
      onComplete?.({
        startTime: new Date(),
        endTime: new Date(),
        score: Number(score),
        errors: 0,
        timeSpent: 0,
        rawData: {
          evaluationId,
          note,
          score: Number(score),
          clockTime: targetClock,
        },
      });
    } catch (e) {
      console.error("Error enviando puntuación:", e);
    } finally {
      setSubmitting(false);
    }
  };

  // UI
  if (phase === "instructions") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Test del Reloj (CDT) — Instrucciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 p-6 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-3">Indicación al paciente</h4>
            <ul className="space-y-2 text-blue-800">
              <li>• Dibuje un reloj que muestre la hora indicada.</li>
              <li>• Dibuje un círculo, los números del 1 al 12 y dos manecillas.</li>
              <li>• Use el ratón o el dedo para dibujar.</li>
            </ul>
          </div>
          <Button onClick={startSubtest} className="w-full" size="lg">
            Comenzar
          </Button>
        </CardContent>
      </Card>
    );
  }

 // --- DRAWING (sin reloj perfecto) ---
  if (phase === "drawing") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                Dibuje un reloj que marque las{" "}
                <strong>{targetClock.time}{" "}</strong>
                {targetClock.description && (
                  <span className="text-muted-foreground">({targetClock.description})</span>
                )}
              </span>
              <div className="flex gap-2 items-center">
                <Badge variant="default" className="text-lg px-3 py-1">
                  {targetClock.time}
                </Badge>
                <Badge variant="outline">Trazos: {strokes.length}</Badge>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* SOLO lienzo para el paciente; sin reloj de referencia */}
            <div className="flex justify-center">
              <canvas
                ref={canvasRef}
                width={420}
                height={420}
                className="border-2 border-gray-300 rounded-lg bg-white cursor-crosshair touch-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button variant="outline" onClick={clearCanvas}>
                Limpiar
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  const blob = await canvasToPngBlob(canvas);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `reloj-${targetClock.time}.png`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Descargar PNG
              </Button>
              <Button
                onClick={proceedToEvaluation}
                disabled={strokes.length === 0}
                className="font-semibold"
              >
                Pasar a evaluación
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }


  if (phase === "evaluating") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evaluación (Shulman 0–5)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <Label className="block mb-2">Dibujo del paciente</Label>
              {userImageUrl ? (
                <img
                  src={userImageUrl}
                  alt="Dibujo del paciente"
                  className="border rounded-lg w-full max-w-[420px] bg-white"
                />
              ) : (
                <div className="text-sm text-muted-foreground">No hay imagen</div>
              )}
            </div>
            <div>
              <Label className="block mb-2">
                Reloj de referencia — {targetClock.time}{" "}
                {targetClock.description && (
                  <span className="text-muted-foreground">({targetClock.description})</span>
                )}
              </Label>
              <div className="border rounded-lg p-3 bg-white inline-block">
                <PerfectClock hour={hour} min={min} size={260} />
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <Label className="mb-2 block">Puntuación (0–5)</Label>
              <RadioGroup value={score} onValueChange={setScore} className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {["0","1","2","3","4","5"].map((v) => (
                  <div key={v} className="flex items-center space-x-2 border rounded-md px-3 py-2">
                    <RadioGroupItem id={`score-${v}`} value={v} />
                    <Label htmlFor={`score-${v}`}>{v}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label className="mb-2 block">Observaciones</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anota errores de números, orientación de manecillas, espaciado, etc."
                rows={4}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Ver criterios (Shulman 0–5)</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Escala de Shulman (0–5)</DialogTitle>
                    <DialogDescription asChild>
                      <div className="text-sm mt-3 space-y-2">
                        <p><strong>5</strong> — Dibujo correcto: círculo, números 1–12 bien colocados y hora correcta con ambas manecillas.</p>
                        <p><strong>4</strong> — Leves errores (p. ej., espaciado algo irregular o colocación ligera de números) con hora correcta.</p>
                        <p><strong>3</strong> — Errores moderados: números desordenados/duplicados/omisos; hora aproximada o manos imprecisas.</p>
                        <p><strong>2</strong> — Desorganización notable: números concentrados en un lado; manos ausentes o claramente incorrectas.</p>
                        <p><strong>1</strong> — Incapacidad para representar un reloj de forma comprensible.</p>
                        <p><strong>0</strong> — Ningún intento o dibujo irreconocible.</p>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>

              <Button
                onClick={() => setPhase("drawing")}
                variant="ghost"
              >
                Volver al dibujo
              </Button>

              <div className="ml-auto">
                <Button onClick={submitScore} disabled={submitting || !evaluationId} className="font-semibold">
                  {submitting ? "Guardando..." : "Guardar puntuación"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // submitted
  return (
    <Card>
      <CardHeader>
        <CardTitle>Puntuación enviada</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-green-50 p-4 rounded-lg text-green-900">
          Puntuación (Shulman): <strong>{score}</strong>. {note ? "Observaciones guardadas." : "Sin observaciones."}
        </div>
        <div className="text-right">
          <Button onClick={() => onPause?.()}>Cerrar</Button>
        </div>
      </CardContent>
    </Card>
  );
}

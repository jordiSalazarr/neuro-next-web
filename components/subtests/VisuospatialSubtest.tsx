"use client";

import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SubtestProps } from "@/types";

type DrawingPoint = { x: number; y: number };
type DrawingStroke = { points: DrawingPoint[]; timestamp: number; order: number };

type ClockItem = { time: string; description?: string };

type BackendResponse = {
  id: string;
  evaluationId: string;
  pass: boolean;
  reasons: string[];
  centerX?: number;
  centerY?: number;
  radius?: number;
  minuteAngleDeg?: number;
  hourAngleDeg?: number;
  expectedMinuteAngle?: number;
  expectedHourAngle?: number;
  minuteAngularErrorDeg?: number;
  hourAngularErrorDeg?: number;
  debugPngBase64?: string;
};

type Props = SubtestProps & {
  /** ID de la evaluación padre (obligatorio) */
  evaluationId: string;
  /** Base URL del backend; por defecto http://localhost:8401 */
  apiBaseUrl?: string;
  /** Si quieres que el backend devuelva el overlay de debug */
  returnDebug?: boolean;
  /** Una o varias horas objetivo. Acepta "HH:mm" o {time, description}. */
  times?: (string | ClockItem)[];
};

const DEFAULT_TIMES: ClockItem[] = [
  { time: "11:10", description: "once y diez" },
  { time: "03:15", description: "tres y cuarto" },
  { time: "08:20", description: "ocho y veinte" },
];

function parseClockItems(times?: (string | ClockItem)[]): ClockItem[] {
  if (!times || times.length === 0) return DEFAULT_TIMES;
  return times.map((t) => (typeof t === "string" ? { time: t } : t));
}

function parseHHmm(time: string): { hour: number; min: number } {
  const [h, m] = time.trim().split(":");
  const hour = Math.max(0, Math.min(23, Number(h)));
  const min = Math.max(0, Math.min(59, Number(m)));
  return { hour, min };
}

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  // Fondo blanco (evita transparencia)
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

export function VisuospatialSubtest({
  onComplete,
  onPause,
  evaluationId,
  apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8401",
  returnDebug = true,
  times,
}: Props) {
  const clocks = parseClockItems(times);
  const [phase, setPhase] = useState<"instructions" | "drawing" | "completed">("instructions");
  const [currentClockIndex, setCurrentClockIndex] = useState(0);

  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<DrawingPoint[]>([]);
  const [strokeOrder, setStrokeOrder] = useState(0);

  const [startTime, setStartTime] = useState<Date | null>(null);
  const [drawingStartTime, setDrawingStartTime] = useState<Date | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [serverResult, setServerResult] = useState<BackendResponse | null>(null);
  const [apiUrl, setApiUrl] = useState(apiBaseUrl);

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

    // Trazos ya pintados (negro)
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

    // Trazo actual (azul)
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

  // Pointer events (ratón/táctil)
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
    setStartTime(new Date());
    setDrawingStartTime(new Date());
    setCurrentClockIndex(0);
    setStrokes([]);
    setStrokeOrder(0);
    setServerResult(null);
  };

  const clearCanvas = () => {
    setStrokes([]);
    setCurrentStroke([]);
    setStrokeOrder(0);
    setServerResult(null);
  };

  const exportPNG = async (): Promise<Blob> => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("canvas no disponible");
    return canvasToPngBlob(canvas);
  };

  const sendToBackend = async () => {
    try {
      setSubmitting(true);
      setServerResult(null);

      const current = clocks[currentClockIndex];
      const { hour, min } = parseHHmm(current.time);

      const pngBlob = await exportPNG();

      const fd = new FormData();
      fd.append("evaluation_id", evaluationId);
      fd.append("expected_hour", String(hour));
      fd.append("expected_min", String(min));
      fd.append("image", pngBlob, "clock.png");

      const url = `${apiUrl.replace(/\/+$/, "")}/v1/evaluations/visual-spatial?return_debug=${returnDebug ? "true" : "false"}`;
      const res = await axios.post<BackendResponse>(url, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setServerResult(res.data);
      return res.data;
    } catch (err: any) {
      console.error("Error enviando al backend:", err);
      setServerResult({
        id: "",
        evaluationId,
        pass: false,
        reasons: ["Error enviando al backend"],
      });
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const nextClock = async () => {
    // envía antes de pasar al siguiente
    await sendToBackend();
    if (currentClockIndex < clocks.length - 1) {
      setCurrentClockIndex((i) => i + 1);
      clearCanvas();
      setDrawingStartTime(new Date());
    } else {
      completeSubtest();
    }
  };

  const completeSubtest = () => {
    setPhase("completed");
    const drawingTime = drawingStartTime ? Date.now() - drawingStartTime.getTime() : 0;
    const timeSpent = startTime ? (Date.now() - startTime.getTime()) / 1000 : 0;

    // Puntuación simple basada en número de trazos y tiempo (placeholder)
    const strokeScore = Math.max(0, 100 - strokes.length * 2);
    const timeScore = Math.max(0, 100 - drawingTime / 1000 / 5);
    const finalScore = (strokeScore + timeScore) / 2;

    onComplete?.({
      startTime: startTime!,
      endTime: new Date(),
      score: Math.round(finalScore),
      errors: Math.max(0, strokes.length - 12),
      timeSpent: Math.round(timeSpent),
      rawData: {
        clocksDrawn: currentClockIndex + 1,
        totalStrokes: strokes.length,
        drawingTime: Math.round(drawingTime / 1000),
        strokeData: strokes,
        clockTimes: clocks.slice(0, currentClockIndex + 1),
        lastServerResult: serverResult,
      },
    });
  };

  // UI
  if (phase === "instructions") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Instrucciones - Test del Reloj (CDT)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-red-50 p-6 rounded-lg">
            <h4 className="font-semibold text-red-900 mb-3">¿Qué debe hacer?</h4>
            <ul className="space-y-2 text-red-800">
              <li>• Dibuje un reloj que muestre la hora indicada en pantalla.</li>
              <li>• Dibuje un círculo, los números 1–12 y las dos manecillas.</li>
              <li>• Use el ratón (o el dedo en pantallas táctiles) para dibujar.</li>
            </ul>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="api">Endpoint (opcional)</Label>
            <Input id="api" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} />
          </div>

          <Button onClick={startSubtest} className="w-full" size="lg">
            Comenzar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (phase === "drawing") {
    const currentClock = clocks[currentClockIndex];
    const { hour, min } = parseHHmm(currentClock.time);

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                Dibuje un reloj que marque las{" "}
                <strong>
                  {currentClock.time}
                  {"  "}
                </strong>
                {currentClock.description && (
                  <span className="text-muted-foreground">({currentClock.description})</span>
                )}
              </span>
              <div className="flex gap-2 items-center">
                <Badge variant="default" className="text-lg px-3 py-1">
                  {currentClock.time}
                </Badge>
                <Badge variant="outline">Trazos: {strokes.length}</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <canvas
                ref={canvasRef}
                width={400}
                height={400}
                className="border-2 border-gray-300 rounded-lg bg-white cursor-crosshair touch-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={clearCanvas}>
                Limpiar
              </Button>
              <Button variant="outline" onClick={async () => {
                const blob = await exportPNG();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `reloj-${currentClock.time}.png`;
                a.click();
                URL.revokeObjectURL(url);
              }}>
                Descargar PNG
              </Button>
              <Button
                onClick={sendToBackend}
                disabled={submitting}
              >
                {submitting ? "Enviando..." : "Enviar a evaluación"}
              </Button>
              <Button onClick={nextClock} disabled={submitting}>
                {currentClockIndex < clocks.length - 1 ? "Enviar y Siguiente" : "Enviar y Finalizar"}
              </Button>
            </div>

            {serverResult && (
              <div className="mt-3 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <Badge variant={serverResult.pass ? "default" : "destructive"}>
                    {serverResult.pass ? "Aprobado" : "No aprobado"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    esperado: h={hour} m={min}
                  </span>
                </div>
                {serverResult.reasons?.length > 0 && (
                  <ul className="mt-2 list-disc pl-6 text-sm">
                    {serverResult.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
                {serverResult.debugPngBase64 && returnDebug && (
                  <div className="mt-3">
                    <Label>Overlay de depuración</Label>
                    <img
                      alt="debug overlay"
                      className="mt-1 border rounded"
                      src={`data:image/png;base64,${serverResult.debugPngBase64}`}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // completed
  return (
    <Card>
      <CardHeader>
        <CardTitle>Test del Reloj Completado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-center text-gray-600">
          El test ha finalizado y se enviaron los dibujos al backend.
        </p>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Relojes dibujados:</strong> {currentClockIndex + 1}
            </div>
            <div>
              <strong>Total de trazos:</strong> {strokes.length}
            </div>
          </div>
        </div>
        <div className="text-right">
          <Button onClick={() => onPause?.()}>Cerrar</Button>
        </div>
      </CardContent>
    </Card>
  );
}

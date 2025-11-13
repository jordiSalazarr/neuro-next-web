"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Mic, Square, CheckCircle2 } from "lucide-react";
import axios from "axios";
import { useEvaluationStore } from "@/src/stores/evaluation";
import { useRouter } from "next/navigation";

const TEST_DURATION = 60; // segundos

interface SubtestProps {
  onComplete?: (result: any) => void;
  onPause?: () => void;
}

/** ================= UI tokens (alineados con el resto de subtests) ================= */
const styles = {
  shell: "min-h-[calc(100vh-56px)]",
  card:
    "bg-white/85 backdrop-blur border border-slate-200/70 shadow-xl rounded-2xl",
  primary: "bg-brand-600 hover:bg-slate-900 text-white",
  outline: "border-slate-300 text-slate-800 hover:bg-slate-50",
  kpiLabel: "text-slate-500",
  kpiValue: "text-slate-900",
};

export function LanguageSubtest({ onComplete, onPause }: SubtestProps) {
  const [phase, setPhase] = useState<"instructions" | "active" | "completed">(
    "instructions"
  );
  const [timeRemaining, setTimeRemaining] = useState(TEST_DURATION);
  const [isRecording, setIsRecording] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mimeUsed, setMimeUsed] = useState<string>("");

  const startTimeRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const finishedPromiseRef = useRef<Promise<Blob> | null>(null);

  const currentEvaluationID = useEvaluationStore(
    (s) => s.currentEvaluation?.id
  );
  const router = useRouter();

  /** ================= Countdown ================= */
  useEffect(() => {
    if (phase !== "active") return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          void completeSubtest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /** ================= Grabación ================= */
  const pickMimeType = () => {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
      "audio/mpeg",
    ];
    for (const t of candidates) {
      // @ts-ignore
      if (
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported?.(t)
      ) {
        return t;
      }
    }
    return ""; // que el navegador elija
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          noiseSuppression: true,
          echoCancellation: true,
        },
        video: false,
      });
      const mime = pickMimeType() || undefined;
      const mr = new MediaRecorder(
        stream,
        mime ? { mimeType: mime } : undefined
      );
      streamRef.current = stream;
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      setMimeUsed(mime || "auto");

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      const finished = new Promise<Blob>((resolve) => {
        mr.onstop = () => {
          const blob = new Blob(chunksRef.current, {
            type: mr.mimeType || mime || "audio/webm",
          });
          chunksRef.current = [];
          resolve(blob);
        };
      });

      finishedPromiseRef.current = finished;
      mr.start();
      setIsRecording(true);
      startTimeRef.current = Date.now();
    } catch {
      setErrorMsg(
        "No se pudo acceder al micrófono. Revise los permisos del navegador."
      );
    }
  };

  const stopRecording = async (): Promise<Blob> => {
    const mr = mediaRecorderRef.current;
    if (!mr) return new Blob();
    const finished =
      finishedPromiseRef.current ?? Promise.resolve(new Blob());
    if (mr.state !== "inactive") mr.stop();
    const blob = await finished;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    return blob;
  };

  /** ================= Flujo ================= */
  const startSubtest = async () => {
    setErrorMsg(null);
    setPhase("active");
    setTimeRemaining(TEST_DURATION);
    await startRecording();
  };

  const completeSubtest = async () => {
    try {
      setPhase("completed");
      const blob = await stopRecording();
      const totalTime = startTimeRef.current
        ? Math.round((Date.now() - startTimeRef.current) / 1000)
        : TEST_DURATION;

      const form = new FormData();
      const filename = `fluency-${Date.now()}.webm`;
      const audioFile = new File([blob], filename, {
        type: blob.type || "audio/webm",
      });
      form.append("audio", audioFile);

      form.append(
        "payload",
        JSON.stringify({
          evaluationId: currentEvaluationID ?? "",
          duration: TEST_DURATION,
          totalTime,
        })
      );

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/evaluations/language-fluency`,
        form,
        {
          maxBodyLength: Infinity,
          timeout: 60_000,
        }
      );

      onComplete?.({
        startTime: startTimeRef.current
          ? new Date(startTimeRef.current)
          : new Date(),
        endTime: new Date(),
        score: 0,
        errors: 0,
        timeSpent: TEST_DURATION,
        rawData: { mime: mimeUsed, duration: TEST_DURATION },
      });

      router.push("/finish-test");
    } catch (e) {
      console.error(e);
      setErrorMsg("Hubo un problema al subir el audio. Inténtelo de nuevo.");
    }
  };

  const handlePause = async () => {
    if (isRecording) await stopRecording();
    setPhase("instructions");
    onPause?.();
  };

  const formatTime = (seconds: number) =>
    `${seconds.toString().padStart(2, "0")}s`;

  /** ================= UI ================= */

  if (phase === "instructions") {
    return (
      <main className={styles.shell}>
        <section className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
          <header className="mb-6">
            <h1 className="text-slate-900 text-2xl sm:text-3xl font-semibold tracking-tight">
              Fluencia verbal (audio)
            </h1>
            <p className="text-slate-600 text-sm sm:text-base mt-1 max-w-2xl">
              Tiene 60 segundos para decir palabras de la categoría indicada.
              Evite repeticiones.
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
                <ul className="space-y-2 text-slate-700 text-sm sm:text-base">
                  <li>
                    • 60 segundos para decir palabras de la categoría indicada
                    por el profesional.
                  </li>
                  <li>• No repita palabras ni use nombres propios.</li>
                  <li>
                    • La transcripción no se muestra durante la prueba; solo se
                    graba el audio.
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-3 text-sm sm:text-base">
                <strong>Duración:</strong> 60 segundos exactos desde el inicio
                de la grabación.
              </div>

              {errorMsg && (
                <p className="text-rose-600 text-sm">{errorMsg}</p>
              )}

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
                  onClick={startSubtest}
                  className={`${styles.primary} gap-2 w-full sm:w-auto`}
                  size="lg"
                >
                  <Mic className="w-4 h-4" />
                  Conceder micrófono y comenzar
                </Button>
              </div>

              {mimeUsed && (
                <p className="text-xs text-slate-500">
                  Formato de grabación: {mimeUsed}
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  if (phase === "active") {
    const progressPercentage =
      ((TEST_DURATION - timeRemaining) / TEST_DURATION) * 100;

    return (
      <main className={styles.shell}>
        <section className="mx-auto max-w-5xl px-3 sm:px-4 py-6 sm:py-8 grid grid-rows-[auto_1fr] gap-4 sm:gap-5">
          {/* Barra superior sticky con KPIs */}
          <div className="sticky top-[56px] z-20">
            <Card className={styles.card}>
              <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div>
                  <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>
                    Estado
                  </p>
                  <p className="font-semibold text-slate-900 text-sm sm:text-base">
                    Grabación {isRecording ? "activa" : "en pausa"}
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                  <Badge
                    variant={
                      timeRemaining <= 10 ? "destructive" : "secondary"
                    }
                    className="text-sm sm:text-base px-3 py-1"
                  >
                    {formatTime(timeRemaining)}
                  </Badge>
                </div>

                <div className="hidden sm:block">
                  <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>
                    Formato
                  </p>
                  <p className="font-mono text-sm text-slate-900">
                    {mimeUsed || "auto"}
                  </p>
                </div>

                {onPause && (
                  <div className="sm:ml-auto">
                    <Button
                      variant="outline"
                      onClick={handlePause}
                      className={styles.outline}
                    >
                      Pausar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Zona principal */}
          <Card className={styles.card}>
            <CardHeader className="pb-2">
              <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-slate-900">
                <span className="text-base sm:text-lg">
                  Fluencia verbal (hablada)
                </span>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                  <Badge
                    variant={
                      timeRemaining <= 10 ? "destructive" : "secondary"
                    }
                    className="text-sm sm:text-base px-3 py-1"
                  >
                    {formatTime(timeRemaining)}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-5 sm:space-y-6">
              <Progress value={progressPercentage} className="h-2.5" />

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                {isRecording ? (
                  <>
                    <div className="flex items-center gap-2 text-emerald-700">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                      </span>
                      <span className="text-sm sm:text-base">
                        Grabando…
                      </span>
                    </div>

                    <Button
                      variant="destructive"
                      onClick={completeSubtest}
                      className="gap-2"
                    >
                      <Square className="w-4 h-4" />
                      Finalizar ahora
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={startRecording}
                    className={`${styles.primary} gap-2`}
                  >
                    <Mic className="w-4 h-4" />
                    Reanudar grabación
                  </Button>
                )}
              </div>

              {errorMsg && (
                <p className="text-rose-600 text-sm text-center">
                  {errorMsg}
                </p>
              )}

              <p className="text-center text-slate-600 text-sm sm:text-base">
                Diga en voz alta tantas palabras como pueda de la categoría
                indicada. Manténgase cerca del micrófono y hable de forma
                continua durante el minuto.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  // ================= Completed =================
  return (
    <main className={styles.shell}>
      <section className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <Card className={styles.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 text-lg sm:text-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Fluencia verbal — Completado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <p className="text-center text-slate-600 text-sm sm:text-base">
              El audio y los metadatos se han enviado correctamente.
            </p>
            {errorMsg && (
              <p className="text-rose-600 text-sm text-center">{errorMsg}</p>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

export default LanguageSubtest;

"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Clock, Mic, Square, CheckCircle2 } from "lucide-react"
import axios from "axios"
import { useEvaluationStore } from "@/src/stores/evaluation"
import { useRouter } from "next/navigation"

const TEST_DURATION = 60 // segundos
interface SubtestProps {
  onComplete?: (result: any) => void;
  onPause?: () => void;
}

// ================== Tokens UI corporativos ==================
const styles = {
  backdrop: "bg-[#0E2F3C]", // azul hospital corporativo
  card: "bg-white/80 backdrop-blur border-slate-200",
  primary: "bg-[#0E7C86] hover:bg-[#0a646c] text-white",
  outline: "border-slate-300 text-slate-800 hover:bg-slate-50",
  kpiLabel: "text-slate-500",
  kpiValue: "text-slate-900",
}

export function LanguageSubtest({ onComplete, onPause }:SubtestProps) {
  const [phase, setPhase] = useState<"instructions" | "active" | "completed">("instructions")
  const [timeRemaining, setTimeRemaining] = useState(TEST_DURATION)
  const [isRecording, setIsRecording] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [mimeUsed, setMimeUsed] = useState<string>("")

  const startTimeRef = useRef<number | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const finishedPromiseRef = useRef<Promise<Blob> | null>(null)

  const currentEvaluationID = useEvaluationStore((s) => s.currentEvaluation?.id)
  const router = useRouter()

  // Cuenta atrás
  useEffect(() => {
    if (phase !== "active") return
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          void completeSubtest()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [phase])

  // ---------- Grabación ----------
  const pickMimeType = () => {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
      "audio/mpeg",
    ]
    for (const t of candidates) {
      // @ts-ignore
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(t)) {
        return t
      }
    }
    return "" // que el browser elija por defecto
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, noiseSuppression: true, echoCancellation: true },
        video: false,
      })
      const mime = pickMimeType() || undefined
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      streamRef.current = stream
      mediaRecorderRef.current = mr
      chunksRef.current = []
      setMimeUsed(mime || "auto")

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }

      const finished = new Promise<Blob>((resolve) => {
        mr.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: mr.mimeType || mime || "audio/webm" })
          chunksRef.current = []
          resolve(blob)
        }
      })

      finishedPromiseRef.current = finished
      mr.start()
      setIsRecording(true)
      startTimeRef.current = Date.now()
    } catch (e: any) {
      setErrorMsg("No se pudo acceder al micrófono. Verifique permisos del navegador.")
    }
  }

  const stopRecording = async (): Promise<Blob> => {
    const mr = mediaRecorderRef.current
    if (!mr) return new Blob()
    const finished = finishedPromiseRef.current ?? Promise.resolve(new Blob())
    if (mr.state !== "inactive") mr.stop()
    const blob = await finished
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setIsRecording(false)
    return blob
  }

  // ---------- Flujo de test ----------
  const startSubtest = async () => {
    setErrorMsg(null)
    setPhase("active")
    setTimeRemaining(TEST_DURATION)
    await startRecording()
  }

  const completeSubtest = async () => {
    try {
      setPhase("completed")
      const blob = await stopRecording()

      const totalTime = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : TEST_DURATION

      const form = new FormData()
      const filename = `fluency-${Date.now()}.webm`
      const audioFile = new File([blob], filename, { type: blob.type || "audio/webm" })
      form.append("audio", audioFile)

      const payload = {
        evaluationId: currentEvaluationID ?? "",
        duration: TEST_DURATION,
        totalTime,
      }
      form.append("payload", JSON.stringify(payload))

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/evaluations/language-fluency`,
        form,
        { maxBodyLength: Infinity, timeout: 60_000 }
      )
      router.push("/finish-test")
    } catch (e) {
      console.error(e)
      setErrorMsg("Hubo un problema al subir el audio. Inténtelo de nuevo.")
    }
  }

  const handlePause = async () => {
    if (isRecording) await stopRecording()
    setPhase("instructions")
    onPause?.()
  }

  const formatTime = (seconds: number) => `${seconds.toString().padStart(2, "0")}s`

  // ---------- UI ----------
  if (phase === "instructions") {
    return (
      <div className={`min-h-[70vh] w-full ${styles.backdrop} py-8 sm:py-10 px-4`}>
        <div className="mx-auto max-w-4xl">
          <header className="mb-6">
            <h1 className="text-white/90 text-2xl sm:text-3xl font-semibold tracking-tight">Fluencia Verbal (Audio)</h1>
            <p className="text-white/70 text-sm sm:text-base mt-1 max-w-2xl">
              Tiene 60 segundos para decir en voz alta palabras de la categoría indicada. Evite repeticiones.
            </p>
          </header>

          <Card className={`${styles.card} shadow-xl`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg sm:text-xl lg:text-2xl text-slate-900">Instrucciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg bg-slate-50 p-4 sm:p-5 border border-slate-200">
                <ul className="space-y-2 text-slate-700 text-sm sm:text-base">
                  <li>• Tendrá 60 segundos para <strong>decir</strong> palabras de la categoría indicada por el profesional.</li>
                  <li>• No repita palabras.</li>
                  <li>• No se muestra transcripción en pantalla.</li>
                </ul>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-3 text-sm">
                <strong>Duración:</strong> 60 segundos exactos.
              </div>
              {errorMsg && <p className="text-rose-600 text-sm">{errorMsg}</p>}
              <div className="flex justify-end gap-3">
                {onPause && (
                  <Button variant="outline" onClick={onPause} className={styles.outline}>Pausar</Button>
                )}
                <Button onClick={startSubtest} className={styles.primary} size="lg">
                  Comenzar y conceder permisos de micrófono
                </Button>
              </div>
              {mimeUsed && <p className="text-xs text-slate-500">Formato de grabación: {mimeUsed}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (phase === "active") {
    const progressPercentage = ((TEST_DURATION - timeRemaining) / TEST_DURATION) * 100
    return (
      <div className={`min-h-[70vh] w-full ${styles.backdrop} py-6 px-4`}>
        <div className="mx-auto max-w-4xl">
          {/* Barra superior con KPIs */}
          <Card className={`${styles.card} shadow-lg mb-3`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>Estado</p>
                  <p className="font-semibold text-slate-900">Grabación {isRecording ? "activa" : "pausada"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <Badge variant={timeRemaining <= 10 ? "destructive" : "default"} className="text-base px-3 py-1">
                    {formatTime(timeRemaining)}
                  </Badge>
                </div>
                <div>
                  <p className={`${styles.kpiLabel} text-xs sm:text-sm`}>Formato</p>
                  <p className="font-mono text-sm text-slate-900">{mimeUsed || "auto"}</p>
                </div>
                {onPause && (
                  <div className="ml-auto">
                    <Button variant="outline" onClick={handlePause} className={styles.outline}>Pausar</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className={`${styles.card} shadow-xl`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-slate-900">
                <span>Fluencia verbal (hablada)</span>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <Badge variant={timeRemaining <= 10 ? "destructive" : "secondary"} className="text-base px-3 py-1">
                    {formatTime(timeRemaining)}
                  </Badge>
                </div>
              </CardTitle>
              <p className="text-slate-600">
                Diga en voz alta tantas palabras como pueda de la categoría indicada. Permanezca cerca del micrófono.
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <Progress value={progressPercentage} className="h-3" />
              <div className="flex items-center justify-center gap-3">
                {isRecording ? (
                  <>
                    <div className="flex items-center gap-2 text-emerald-700">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      Grabando…
                    </div>
                    <Button variant="destructive" onClick={completeSubtest} className="gap-2">
                      <Square className="w-4 h-4" /> Finalizar ahora
                    </Button>
                  </>
                ) : (
                  <Button onClick={startRecording} className={`${styles.primary} gap-2`}>
                    <Mic className="w-4 h-4" /> Reanudar grabación
                  </Button>
                )}
              </div>

              {errorMsg && <p className="text-rose-600 text-sm text-center">{errorMsg}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // completed
  return (
    <div className={`${styles.backdrop} min-h-[60vh] py-8 px-4`}>
      <div className="mx-auto max-w-3xl">
        <Card className={`${styles.card} shadow-xl`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Test de Fluencia Verbal Completado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-slate-600 mb-4">
              Se ha enviado el audio y los metadatos. El especialista revisará los resultados.
            </p>
            {errorMsg && <p className="text-rose-600 text-sm text-center">{errorMsg}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
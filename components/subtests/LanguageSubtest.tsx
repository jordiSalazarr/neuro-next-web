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
  const stopResolverRef = useRef<((blob: Blob) => void) | null>(null)

  const currentEvaluationID = useEvaluationStore((s) => s.currentEvaluation?.id)
  const router = useRouter()

  // Cuenta atrás
  useEffect(() => {
    if (phase !== "active") return
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // al llegar a 0, finalizamos
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
    // Preferimos webm/opus; caemos a alternativas compatibles
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
      "audio/mpeg", // peor como entrada, pero por si acaso
    ]
    for (const t of candidates) {
      // @ts-ignore - isTypeSupported existe en runtime
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(t)) {
        return t
      }
    }
    return "" // que el browser elija por defecto
  }

  const requestMic = async (): Promise<MediaStream> => {
    return navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        noiseSuppression: true,
        echoCancellation: true,
      },
      video: false,
    })
  }

const finishedPromiseRef = useRef<Promise<Blob> | null>(null)

const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mime = "audio/webm;codecs=opus"
  const mr = new MediaRecorder(stream, { mimeType: mime })
  streamRef.current = stream
  mediaRecorderRef.current = mr
  chunksRef.current = []

  mr.ondataavailable = (e) => {
    if (e.data.size > 0) chunksRef.current.push(e.data)
  }

  const finished = new Promise<Blob>((resolve) => {
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime })
      chunksRef.current = []
      resolve(blob)
    }
  })

  finishedPromiseRef.current = finished
  mr.start()
  setIsRecording(true)
  startTimeRef.current = Date.now()
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
  console.log("Final blob size:", blob.size)
  return blob
}



  // ---------- Flujo de test ----------
  const startSubtest = async () => {
    setPhase("active")
    setTimeRemaining(TEST_DURATION)
    await startRecording()
  }

  const completeSubtest = async () => {
    try {
      setPhase("completed")
      // parar grabación (si sigue activa) y obtener blob
      const blob = await stopRecording()
console.log("Blob size:", blob.size)
console.log("Blob type:", blob.type)


      const totalTime = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : TEST_DURATION

      // Construimos FormData con audio + payload JSON
      const form = new FormData()
      const filename = `fluency-${Date.now()}.webm` // extensión aproximada; el backend usará mime real
      const audioFile = new File([blob], filename, { type: blob.type || "audio/webm" })
      form.append("audio", audioFile)

      const payload = {
        evaluationId: currentEvaluationID ?? "",
        duration: TEST_DURATION, // por defecto 60
        // category no es necesaria ahora
        // language/proficiency/totalTime no los necesitas de input, pero puedes enviar totalTime informativo
        totalTime, // opcional; tu backend lo ignora si no lo necesita
      }
      form.append("payload", JSON.stringify(payload))

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/evaluations/language-fluency`,
        form,
        {
          // NO fijes manualmente Content-Type; deja que axios establezca el boundary del FormData
          maxBodyLength: Infinity,
          timeout: 60_000,
        }
      )
      router.push("/finish-test")
    } catch (e) {
      console.error(e)
      setErrorMsg("Hubo un problema al subir el audio. Inténtelo de nuevo.")
    }
  }

  const handlePause = async () => {
    // Parar temporalmente la grabación y el cronómetro
    if (isRecording) await stopRecording()
    setPhase("instructions")
    onPause?.()
  }

  const formatTime = (seconds: number) => `${seconds.toString().padStart(2, "0")}s`

  // ---------- UI ----------
  if (phase === "instructions") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Instrucciones - Fluencia Verbal (Audio)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-teal-50 p-6 rounded-lg">
            <h4 className="font-semibold text-teal-900 mb-3">¿Qué debe hacer?</h4>
            <ul className="space-y-2 text-teal-800">
              <li>• Tendrá 60 segundos para <strong>decir en voz alta</strong> palabras de una categoría indicada por el profesional.</li>
              <li>• No repita palabras.</li>
              <li>• No verá ninguna transcripción en pantalla.</li>
            </ul>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-yellow-800">
              <strong>Duración:</strong> 60 segundos exactos
            </p>
          </div>
          {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}
          <Button onClick={startSubtest} className="w-full" size="lg">
            Comenzar y conceder permisos de micrófono
          </Button>
          {mimeUsed && <p className="text-xs text-gray-500">Formato de grabación: {mimeUsed}</p>}
        </CardContent>
      </Card>
    )
  }

  if (phase === "active") {
    const progressPercentage = ((TEST_DURATION - timeRemaining) / TEST_DURATION) * 100
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Fluencia verbal (hablada)</span>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <Badge variant={timeRemaining <= 10 ? "destructive" : "default"} className="text-lg px-3 py-1">
                  {formatTime(timeRemaining)}
                </Badge>
              </div>
            </CardTitle>
            <p className="text-gray-600">
              Diga en voz alta tantas palabras como pueda de la categoría indicada. Permanezca cerca del micrófono.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <Progress value={progressPercentage} className="h-3" />
            <div className="flex items-center justify-center gap-3">
              {isRecording ? (
                <>
                  <div className="flex items-center gap-2 text-teal-700">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                    </span>
                    Grabando…
                  </div>
                  <Button variant="destructive" onClick={completeSubtest} className="gap-2">
                    <Square className="w-4 h-4" /> Finalizar ahora
                  </Button>
                </>
              ) : (
                <Button onClick={startRecording} className="gap-2">
                  <Mic className="w-4 h-4" /> Reanudar grabación
                </Button>
              )}
            </div>

            <div className="text-center">
              <Button variant="outline" onClick={handlePause}>
                Pausar Test
              </Button>
            </div>

            {errorMsg && <p className="text-red-600 text-sm text-center">{errorMsg}</p>}
          </CardContent>
        </Card>
      </div>
    )
  }

  // completed
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-teal-600" /> Test de Fluencia Verbal Completado
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-center text-gray-600 mb-4">
          Se ha enviado el audio y los metadatos. El especialista revisará los resultados.
        </p>
        {errorMsg && <p className="text-red-600 text-sm text-center">{errorMsg}</p>}
      </CardContent>
    </Card>
  )
}

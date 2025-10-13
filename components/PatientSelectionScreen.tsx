"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { ClipboardList, User2, Mail, LogOut, ShieldCheck, CalendarClock, Loader2 } from "lucide-react"

import { useApp } from "@/contexts/AppContext"
import type { Patient, TestSession } from "@/types"
import { useAuthStore } from "@/src/stores/auth"
import { useEvaluationStore } from "@/src/stores/evaluation"
import { useRegisterUser } from "@/src/features/auth/hooks/useRegisterUser"
import { useCreateEvaluation } from "@/src/features/evaluation/hooks/useCreateEvaluation"

// ================== Tokens de estilo corporativo ==================
const styles = {
  backdrop: "bg-[#0E2F3C]", // azul hospital
  card: "bg-white/80 backdrop-blur border-slate-200",
  primary: "bg-[#0E7C86] hover:bg-[#0a646c] text-white",
  outline: "border-slate-300 text-slate-800 hover:bg-slate-50",
}

export default function PatientSelectionScreen() {
  const { register, loading, error } = useRegisterUser()
  const { create, createLoading, createError } = useCreateEvaluation()

  const { state, dispatch } = useApp()
  const [patientName, setPatientName] = useState("")
  const [patientAge, setPatientAge] = useState<number | "">("")
  const [isFormValid, setIsFormValid] = useState(false)
  const didRegisterRef = useRef(false)

  const user = useAuthStore((s) => s.user)
  const setCurrentEvaluation = useEvaluationStore((s) => s.setCurrentEvaluation)
  const router = useRouter()

  // Registro silencioso del especialista (si procede)
useEffect(() => {
  if (!user?.email) return
  if (didRegisterRef.current) return             // evita re-ejecutar
  didRegisterRef.current = true

  ;(async () => {
    try {
      await register(user.name ?? "", user.email, user.roles ?? [])
    } catch {
      // si quieres reintentar en caso de error puntual, vuelve a abrir la puerta:
      didRegisterRef.current = false
    }
  })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.email])
  // Validación simple
  const validateForm = (name: string, ageVal: number | "") => {
    const age = typeof ageVal === "number" ? ageVal : Number(ageVal)
    const ok = name.trim().length > 0 && !Number.isNaN(age) && age >= 16 && age <= 120
    setIsFormValid(ok)
  }

  const handleNameChange = (value: string) => {
    setPatientName(value)
    validateForm(value, patientAge)
  }

  const handleAgeChange = (value: string) => {
    const n = value === "" ? "" : Math.max(0, Math.min(120, Number(value)))
    setPatientAge(n as any)
    validateForm(patientName, n as number)
  }

  async function createNewEvaluation() {
    const name = patientName.trim()
    const age = typeof patientAge === "number" ? patientAge : Number(patientAge)
    const ev = await create(name, age)
    setCurrentEvaluation(ev || null)
    router.push("/test-runner")
  }

  const handleStartSession = async () => {
    if (!isFormValid || createLoading) return
    try {
      const newPatient: Patient = {
        id: `patient-${Date.now()}`,
        name: patientName.trim(),
        age: Number(patientAge),
        gender: "M",
        education: 12,
      }

      const newSession: TestSession = {
        id: `session-${Date.now()}`,
        patientId: newPatient.id,
        startTime: new Date(),
        currentSubtest: 0,
        subtestResults: [],
        status: "in-progress",
      }

      dispatch({ type: "SELECT_PATIENT", payload: newPatient })
      dispatch({ type: "START_SESSION", payload: newSession })
      await createNewEvaluation()
    } catch (e) {
      // Silencio de errores aquí; mostramos createError más abajo
      console.error(e)
    }
  }

  const handleLogout = () => {
    dispatch({ type: "LOGOUT" })
  }

  // Estados de error globales (registro/evaluación)
  const hasAnyError = Boolean(error || createError)
  const anyErrorText = (error as string) || (createError as string) || ""

  return (
    <div className={`${styles.backdrop} min-h-screen`}>      
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        {/* Header compacto */}
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0E7C86] text-white shadow-sm">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-white/90 text-xl font-semibold leading-tight">Nueva evaluación</h1>
              <p className="text-[11px] text-white/70">Registro del paciente y preparación</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:flex items-center gap-2">
              <User2 className="h-3.5 w-3.5" />
              {user?.name || "Especialista"}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleLogout} className={styles.outline + " gap-2 bg-white/80"}>
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </Button>
          </div>
        </div>

        {/* Paso / Progreso contextual */}
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
          <Badge className="bg-[#0E7C86] text-white">Paso 1</Badge>
          <span className="text-white/80">Datos del especialista y del paciente</span>
          <Separator orientation="vertical" className="mx-2 h-4 bg-white/20" />
          <div className="flex items-center gap-1 text-white/80">
            <CalendarClock className="h-3.5 w-3.5" /> Duración estimada 45–60 min
          </div>
        </div>

        {/* Contenido principal */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Tarjeta Especialista */}
          <Card className={`${styles.card} shadow-sm`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900 text-base">Datos del especialista</CardTitle>
              <CardDescription>Verifique su identidad antes de continuar</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-800">
                  <User2 className="h-4 w-4 text-[#0E7C86]" /> Nombre
                </div>
                <div className="text-sm text-slate-800">{user?.name || "—"}</div>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-800">
                  <Mail className="h-4 w-4 text-[#0E7C86]" /> Email
                </div>
                <div className="text-sm text-slate-800">{user?.email || "—"}</div>
              </div>
            </CardContent>
          </Card>

          {/* Tarjeta Paciente */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Card className={`${styles.card} shadow-sm`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-900 text-base">Información del paciente</CardTitle>
                <CardDescription>Complete los datos para iniciar la evaluación</CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="patient-name">Nombre del paciente</Label>
                    <Input
                      id="patient-name"
                      type="text"
                      placeholder="Nombre y apellidos"
                      value={patientName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="h-11"
                      aria-required="true"
                    />
                    <p className="text-xs text-slate-500">Introduzca un nombre válido.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="patient-age">Edad</Label>
                    <Input
                      id="patient-age"
                      type="number"
                      placeholder="Años"
                      value={patientAge}
                      onChange={(e) => handleAgeChange(e.target.value)}
                      min={16}
                      max={120}
                      className="h-11"
                      aria-required="true"
                    />
                    <p className="text-xs text-slate-500">Mínimo 16 años para esta batería.</p>
                  </div>
                </div>

                {/* Aviso de cumplimiento / seguridad */}
                <Alert className="border-slate-200 bg-slate-50 text-slate-800">
                  <ShieldCheck className="h-4 w-4 text-[#0E7C86]" />
                  <AlertDescription className="text-xs">
                    La información se procesa de acuerdo con buenas prácticas clínicas y se almacena de forma segura.
                  </AlertDescription>
                </Alert>

                {/* CTA contextual */}
                <div className="flex items-center justify-end gap-3">
                  <Button
                    onClick={handleStartSession}
                    disabled={!isFormValid || createLoading}
                    className={`${styles.primary} h-11 min-w-[200px]`}
                  >
                    {createLoading ? (
                      <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> Creando evaluación…</span>
                    ) : (
                      "Iniciar evaluación"
                    )}
                  </Button>
                </div>

                {hasAnyError && (
                  <div className="rounded-md border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
                    {anyErrorText}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Pie de confianza */}
        <div className="mt-8">
          <Card className={`${styles.card} shadow-sm`}>
            <CardContent className="p-4 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <ShieldCheck className="h-4 w-4 text-[#0E7C86]" />
                <p>Datos cifrados en tránsito y en reposo. Acceso controlado por roles. Registro de actividad para auditoría.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApp } from "@/contexts/AppContext"
import { useRouter } from "next/navigation"
import type { CurrentEvaluation, Patient, TestSession } from "@/types"
import { useAuthStore } from "@/stores/auth"
import axios from "axios"
import { useEvaluationStore } from "@/stores/evaluation"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { motion } from "framer-motion"
import { ClipboardList, User2, Mail, LogOut, ShieldCheck, CalendarClock } from "lucide-react"

export default function PatientSelectionScreen() {
  const BASE_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL

  const { state, dispatch } = useApp()
  const [patientName, setPatientName] = useState("")
  const [patientAge, setPatientAge] = useState(1)
  const [isFormValid, setIsFormValid] = useState(false)
  const user = useAuthStore((state) => state.user)
  const setSession = useAuthStore((state) => state.setSession)
  const tokens = useAuthStore((state) => state.tokens)
  const router = useRouter()
  const setCurrentEvaluation = useEvaluationStore((state) => state.setCurrentEvaluation)

  async function registerUserData(name: string, mail: String) {
    if (!user) return
    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/auth/user/${encodeURIComponent(user?.email)}/${encodeURIComponent(
        user?.name,
      )}`,
    )
    const newUser = {
      id: res.data.user.ID,
      name: user.name,
      email: user.email,
      roles: user.roles,
    }
    setSession(newUser, {
      accessToken: tokens?.accessToken || "",
      refreshToken: tokens?.refreshToken || "",
      expiresAt: tokens?.expiresAt,
    })
  }

  useEffect(() => {
    if (!user) return
    registerUserData(user?.name, user?.email)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const validateForm = (name: string, age: number) => {
    const isValid = name.trim().length > 0 && age > 15 && !isNaN(Number(age)) && Number(age) > 0
    setIsFormValid(isValid)
  }

  const handleNameChange = (value: string) => {
    setPatientName(value)
    validateForm(value, patientAge)
  }

  const handleAgeChange = (value: number) => {
    let str = value.toString()
    if (str.startsWith("0")) {
      str = str.slice(1)
    }
    if (str.length > 3) {
      str = str.slice(0, 3)
    }
    const newValue = str ? parseInt(str, 10) : 0
    setPatientAge(newValue)
    validateForm(patientName, newValue)
  }

  async function createNewEvaluation() {
    if (!user || !tokens?.accessToken) {
      return
    }
    try {
      const response = await axios.post(
        `${BASE_API_URL}/v1/evaluations`,
        {
          patientName: patientName,
          patientAge: patientAge,
          specialistMail: user.email,
          specialistId: user.id,
        },
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            "Content-Type": "application/json",
          },
        },
      )
      const evaluation: CurrentEvaluation = {
        id: response.data.evaluation.pk,
        createdAt: response.data.evaluation.createdAt,
        currentStatus: response.data.evaluation.currentStatus,
        patientAge: response.data.evaluation.patientAge,
        specialistId: response.data.evaluation.specialistId,
        specialistMail: response.data.evaluation.specialistMail,
        patientName: response.data.evaluation.patientName,
      }
      setCurrentEvaluation(evaluation)
    } catch (error: any) {
      console.error("❌ Error enviando evaluación:", error.response?.data || error.message)
    }
  }

  const handleStartSession = async () => {
    if (!isFormValid) return
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
      router.push("/test-runner")
    } catch (error) {
      console.log(error)
    }
  }

  const handleLogout = () => {
    dispatch({ type: "LOGOUT" })
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      {/* halo decorativo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-64 w-[80%] rounded-full bg-blue-100/50 blur-3xl dark:bg-blue-900/20"
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        {/* Header compacto con identidad clínica */}
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold leading-tight">Nueva evaluación</h1>
              <p className="text-xs text-muted-foreground">Registro del paciente y preparación</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:flex items-center gap-2">
              <User2 className="h-3.5 w-3.5" />
              {user?.name || "Especialista"}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </div>

        {/* Paso / Progreso contextual */}
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
          <Badge className="bg-blue-600 text-white">Paso 1</Badge>
          <span className="text-muted-foreground">Datos del especialista y del paciente</span>
          <Separator orientation="vertical" className="mx-2 h-4" />
          <div className="flex items-center gap-1 text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            Duración estimada 45–60 min
          </div>
        </div>

        {/* Tarjeta Especialista */}
        <Card className="mb-6 border-blue-100/70 shadow-sm dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Datos del especialista</CardTitle>
            <CardDescription>Verifique su identidad antes de continuar</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                <User2 className="h-4 w-4 text-blue-600" />
                Nombre
              </div>
              <div className="text-sm">{user?.name || "—"}</div>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                <Mail className="h-4 w-4 text-blue-600" />
                Email
              </div>
              <div className="text-sm">{user?.email || "—"}</div>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta Paciente */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Información del paciente</CardTitle>
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
                  <p className="text-xs text-muted-foreground">Debe introducir un nombre válido.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patient-age">Edad</Label>
                  <Input
                    id="patient-age"
                    type="number"
                    placeholder="Años"
                    value={patientAge}
                    onChange={(e) => handleAgeChange(Number(e.target.value))}
                    min={1}
                    max={120}
                    className="h-11"
                    aria-required="true"
                  />
                  <p className="text-xs text-muted-foreground">Mínimo 16 años para esta batería.</p>
                </div>
              </div>

              {/* Aviso de cumplimiento / seguridad */}
              <Alert className="border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100">
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  La información se procesa de acuerdo con buenas prácticas clínicas y se almacena de forma segura.
                </AlertDescription>
              </Alert>

              {/* CTA contextual cuando el formulario es válido */}
              {isFormValid && (
                <Card className="border-blue-200 bg-blue-50/60 dark:border-blue-900/30 dark:bg-blue-950/30">
                  <CardContent className="flex flex-col items-start justify-between gap-3 py-4 sm:flex-row sm:items-center">
                    <div className="text-sm">
                      <div className="font-medium">
                        Paciente: {patientName} — {patientAge} años
                      </div>
                      <div className="text-xs text-muted-foreground">Listo para iniciar la evaluación completa.</div>
                    </div>
                    <Button
                      onClick={handleStartSession}
                      className="h-11 w-full bg-blue-600 hover:bg-blue-700 sm:w-auto"
                    >
                      Iniciar evaluación
                    </Button>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

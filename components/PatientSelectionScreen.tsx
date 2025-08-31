"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApp } from "@/contexts/AppContext"
import { useRouter } from "next/navigation" // Import useRouter from next/navigation if using Next.js
import type { CurrentEvaluation, Patient, TestSession } from "@/types"
import { useAuthStore } from "@/stores/auth"
import axios from "axios"
import { useEvaluationStore } from "@/stores/evaluation"
export default function PatientSelectionScreen() {
  const BASE_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL

  const { state, dispatch } = useApp()
  const [patientName, setPatientName] = useState("")
  const [patientAge, setPatientAge] = useState(1)
  const [isFormValid, setIsFormValid] = useState(false)
   const user = useAuthStore(state=>state.user)
    const setSession = useAuthStore(state=>state.setSession)

  const tokens = useAuthStore(state=> state.tokens)
  const router = useRouter() // Import useRouter from next/router if using Next.js
  const setCurrentEvaluation = useEvaluationStore(state=>state.setCurrentEvaluation)
async function registerUserData(name:string, mail:String ){
     if (!user) return
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/auth/user/${encodeURIComponent(user?.email)}/${encodeURIComponent(user?.name)}`)
      console.log(res)
       const newUser = {
        id: res.data.user.ID,
        name: user.name,
        email: user.email,
        roles: user.roles,
      }
        setSession(newUser, {
        accessToken: tokens?.accessToken|| "",
        refreshToken: tokens?.refreshToken||"",
        expiresAt:tokens?.expiresAt,
      })  
}
useEffect(()=>{
       if (!user) return
      registerUserData(user?.name,user?.email)
},[])
  const validateForm = (name: string, age: number) => {
    const isValid = name.trim().length > 0 && age  > 0 && !isNaN(Number(age)) && Number(age) > 0
    setIsFormValid(isValid)
  }

  const handleNameChange = (value: string) => {
    setPatientName(value)
    validateForm(value, patientAge)
  }

const handleAgeChange = (value: number) => {
  let str = value.toString();

  // 1. Si empieza con "0", quitarlo
  if (str.startsWith("0")) {
    str = str.slice(1);
  }

  // 2. Limitar a 3 caracteres como máximo
  if (str.length > 3) {
    str = str.slice(0, 3);
  }

  // Pasar a número otra vez (si queda vacío, será NaN → tratamos como 0)
  const newValue = str ? parseInt(str, 10) : 0;

  setPatientAge(newValue);
  validateForm(patientName, newValue);
};
  async function createNewEvaluation() {
    if (!user||!tokens?.accessToken){
      return
    }
  try {
    console.log("posting to url: "+BASE_API_URL+"v1/evaluations")
    const response = await axios.post(
      `${BASE_API_URL}/v1/evaluations`, // ajusta el endpoint si es distinto
      {
        totalScore: 85,
        patientName:patientName,
        patientAge: patientAge,
        specialistMail: user.email,
        specialistId: user.id,//user.id when we get the real info from our db
      },
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    const evaluation:CurrentEvaluation = {
      id:response.data.evaluation.pk,
      createdAt: response.data.evaluation.createdAt,
      currentStatus: response.data.evaluation.currentStatus,
      patientAge: response.data.evaluation.patientAge,
      specialistId: response.data.evaluation.specialistId,
      specialistMail: response.data.evaluation.specialistMail,
patientName:response.data.evaluation.patientName
      
    }
    console.log("✅ evaluation: ", evaluation);

     setCurrentEvaluation(evaluation)

    console.log("✅ Respuesta del backend:", response.data);
  } catch (error: any) {
    console.error("❌ Error enviando evaluación:", error.response?.data || error.message);
  }
}

  const handleStartSession = () => {
    if (!isFormValid) return

    const newPatient: Patient = {
      id: `patient-${Date.now()}`,
      name: patientName.trim(),
      age: Number(patientAge),
      gender: "M", // Valor por defecto
      education: 12, // Valor por defecto
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
    createNewEvaluation()
    //TODO: aqui debe envviar al usuario a la pantalla de test runner "/test-runner" with next router
    router.push("/test-runner") // Descomentar si se usa Next.js con
  }

  const handleLogout = () => {
    dispatch({ type: "LOGOUT" })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-sm sm:max-w-lg lg:max-w-2xl xl:max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 sm:mb-8">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
              Datos del Especialista
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-2">
              Nombre: <span className="font-medium">{user?.name}</span>
            </p>
            <p>
              Email: <span className="font-medium">{user?.email}</span>
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="self-start sm:self-auto text-sm sm:text-base bg-transparent"
          >
            Cerrar Sesión
          </Button>
        </div>

        <Card>
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="text-lg sm:text-xl lg:text-2xl">Información del Paciente</CardTitle>
            <CardDescription className="text-sm sm:text-base mt-2">
              Ingrese los datos básicos del paciente para iniciar la evaluación
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="patient-name" className="text-sm sm:text-base">
                Nombre del Paciente
              </Label>
              <Input
                id="patient-name"
                type="text"
                placeholder="Ingrese el nombre completo"
                value={patientName}
                onChange={(e) => handleNameChange(e.target.value)}
                className="text-sm sm:text-base h-10 sm:h-12"
                aria-required="true"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="patient-age" className="text-sm sm:text-base">
                Edad
              </Label>
              <Input
                id="patient-age"
                type="number"
                placeholder="Ingrese la edad en años"
                value={patientAge}
                onChange={(e) => handleAgeChange(Number(e.target.value))}
                min="1"
                max="120"
                className="text-sm sm:text-base h-10 sm:h-12"
                aria-required="true"
              />
            </div>

            {isFormValid && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
                    <div className="text-sm sm:text-base text-blue-800">
                      <p className="font-medium">
                        Paciente: {patientName} - {patientAge} años
                      </p>
                      <p className="mt-1 text-xs sm:text-sm">Duración estimada: 45-60 minutos</p>
                    </div>
                    <Button
                      onClick={handleStartSession}
                      className="bg-blue-600 hover:bg-blue-700 text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-6 w-full sm:w-auto"
                    >
                      Iniciar Evaluación
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

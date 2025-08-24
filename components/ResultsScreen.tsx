"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useRouter } from "next/navigation" // Import useRouter from next/navigation if using Next.js
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Download, Printer, Home, FileText, TrendingUp, Clock, Target, AlertTriangle } from "lucide-react"
import { useApp } from "@/contexts/AppContext"
import Router from "next/router"
const mockPatient: Patient = {
  id: "patient-12345",
  name: "Juan Pérez",
  age: 35,
  gender: "M",
  education: 14, // Nivel educativo (por ejemplo, 14 podría ser secundaria completa)
}

// Mocks de los resultados de subtest
const mockSubtestResults: SubtestResult[] = [
  {
    subtestId: "subtest-1",
    name: "Subtest 1: Memoria",
    startTime: new Date("2025-08-21T09:00:00Z"),
    endTime: new Date("2025-08-21T09:15:00Z"),
    score: 85,
    errors: 2,
    timeSpent: 900, // 15 minutos en segundos
    rawData: {
      answers: [true, false, true, true], // Ejemplo de datos crudos
    },
  },
  {
    subtestId: "subtest-2",
    name: "Subtest 2: Razonamiento",
    startTime: new Date("2025-08-21T09:20:00Z"),
    endTime: new Date("2025-08-21T09:35:00Z"),
    score: 90,
    errors: 1,
    timeSpent: 900, // 15 minutos en segundos
    rawData: {
      answers: [false, true, true, false], // Ejemplo de datos crudos
    },
  },
]

// Mock de la sesión de test
const mockTestSession: TestSession = {
  id: "session-12345",
  patientId: mockPatient.id,
  startTime: new Date("2025-08-21T09:00:00Z"),
  currentSubtest: 2, // Supongamos que está en el segundo subtest
  subtestResults: mockSubtestResults,
  status: "in-progress", // La sesión está en progreso
}

// Aquí simularías los estados como si provinieran del contexto o Redux, por ejemplo.
const mockState = {
  currentSession: mockTestSession,
  selectedPatient: mockPatient,
}
const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"]

export function ResultsScreen() {
  const { state, dispatch } = useApp()
  const [activeTab, setActiveTab] = useState<"overview" | "detailed" | "charts">("overview")
const router = useRouter()
const session = mockState.currentSession!
const patient = mockState.selectedPatient!
const results = session?.subtestResults

  // Calcular estadísticas globales
  const totalScore = results?.reduce((sum, result) => sum + result?.score, 0)
  const averageScore = results?.length > 0 ? totalScore / results?.length : 0
  const totalErrors = results?.reduce((sum, result) => sum + result?.errors, 0)
  const totalTime = results?.reduce((sum, result) => sum + result?.timeSpent, 0)
  const sessionDuration = session?.startTime ? (Date.now() - session.startTime.getTime()) / 1000 : 0

  // Datos para gráficos
  const chartData = results?.map((result) => ({
    name: result?.name.split(" - ")[0], // Nombre corto
    score: result?.score,
    errors: result?.errors,
    time: Math.round(result?.timeSpent / 60), // En minutos
  }))

  const performanceData = [
    { name: "Excelente", value: results?.filter((r) => r.score >= 90).length, color: "#10B981" },
    { name: "Bueno", value: results?.filter((r) => r.score >= 70 && r.score < 90).length, color: "#3B82F6" },
    { name: "Regular", value: results?.filter((r) => r.score >= 50 && r.score < 70).length, color: "#F59E0B" },
    { name: "Deficiente", value: results?.filter((r) => r.score < 50).length, color: "#EF4444" },
  ]

  const getPerformanceLevel = (score: number) => {
    if (score >= 90) return { level: "Excelente", color: "bg-green-500", textColor: "text-green-700" }
    if (score >= 70) return { level: "Bueno", color: "bg-blue-500", textColor: "text-blue-700" }
    if (score >= 50) return { level: "Regular", color: "bg-yellow-500", textColor: "text-yellow-700" }
    return { level: "Deficiente", color: "bg-red-500", textColor: "text-red-700" }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleExport = () => {
    const exportData = {
      patient: patient,
      session: session,
      results: results,
      summary: {
        totalScore,
        averageScore: Math.round(averageScore),
        totalErrors,
        totalTime,
        sessionDuration: Math.round(sessionDuration),
      },
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `resultados_${patient?.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleNewSession = () => {
    dispatch({ type: "SET_SCREEN", payload: "patient-selection" })
    router.push("/patient-selection")
  }

  const handleGoHome = () => {
    dispatch({ type: "LOGOUT" })
        router.push("/home")

  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Resultados de Evaluación Neurocognitiva</h1>
              <p className="text-gray-600 mt-2">
                Paciente: <span className="font-semibold">{patient?.name}</span> • Edad: {patient?.age} años • Género:{" "}
                {patient?.gender === "M" ? "Masculino" : "Femenino"}
              </p>
              <p className="text-sm text-gray-500">
                Sesión completada el {formatDate(new Date())} • Duración: {formatTime(sessionDuration)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </div>

          {/* Resumen rápido */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <p className="text-2xl font-bold text-blue-600">{Math.round(averageScore)}</p>
                <p className="text-sm text-gray-600">Puntuación Promedio</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Target className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold text-green-600">{results.length}</p>
                <p className="text-sm text-gray-600">Tests Completados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                <p className="text-2xl font-bold text-orange-600">{totalErrors}</p>
                <p className="text-sm text-gray-600">Total de Errores</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                <p className="text-2xl font-bold text-purple-600">{formatTime(totalTime)}</p>
                <p className="text-sm text-gray-600">Tiempo Total</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs de navegación */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              {[
                { id: "overview", label: "Resumen General", icon: FileText },
                { id: "detailed", label: "Resultados Detallados", icon: Target },
                { id: "charts", label: "Gráficos", icon: TrendingUp },
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Interpretación global */}
                <Card>
                  <CardHeader>
                    <CardTitle>Interpretación Global</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Rendimiento General:</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getPerformanceLevel(averageScore).color}`}></div>
                          <span className={`font-semibold ${getPerformanceLevel(averageScore).textColor}`}>
                            {getPerformanceLevel(averageScore).level}
                          </span>
                        </div>
                      </div>
                      <Progress value={averageScore} className="h-2" />
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-blue-800">
                          <strong>Resumen:</strong> El paciente completó {results.length} subtests con una puntuación
                          promedio de {Math.round(averageScore)} puntos. El rendimiento se clasifica como{" "}
                          <strong>{getPerformanceLevel(averageScore).level.toLowerCase()}</strong> según los baremos
                          establecidos.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Fortalezas y áreas de mejora */}
                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-green-700">Fortalezas Identificadas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {results
                          .filter((r) => r.score >= 70)
                          .map((result, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm">{result?.name.split(" - ")[0]}</span>
                              <Badge variant="secondary" className="ml-auto">
                                {result?.score}
                              </Badge>
                            </li>
                          ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-orange-700">Áreas de Atención</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {results
                          .filter((r) => r.score < 70)
                          .map((result, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              <span className="text-sm">{result?.name.split(" - ")[0]}</span>
                              <Badge variant="outline" className="ml-auto">
                                {result?.score}
                              </Badge>
                            </li>
                          ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "detailed" && (
              <div className="space-y-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subtest</TableHead>
                      <TableHead className="text-center">Puntuación</TableHead>
                      <TableHead className="text-center">Errores</TableHead>
                      <TableHead className="text-center">Tiempo</TableHead>
                      <TableHead className="text-center">Rendimiento</TableHead>
                      <TableHead>Detalles</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, index) => {
                      const performance = getPerformanceLevel(result?.score)
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{result?.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="font-bold">
                              {result?.score}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{result?.errors}</TableCell>
                          <TableCell className="text-center">{formatTime(result?.timeSpent)}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={`${performance.color} text-white`}>{performance.level}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              Ver detalles
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {activeTab === "charts" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Puntuaciones por Subtest</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="score" fill="#3B82F6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Distribución de Rendimiento</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={performanceData.filter((d) => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name}: ${value}`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {performanceData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Tiempo por Subtest (minutos)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="time" fill="#10B981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Acciones finales */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">¿Qué desea hacer ahora?</h3>
              <p className="text-gray-600">Puede iniciar una nueva sesión o volver al inicio</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleGoHome}>
                <Home className="w-4 h-4 mr-2" />
                Volver al Inicio
              </Button>
              <Button onClick={handleNewSession}>
                <FileText className="w-4 h-4 mr-2" />
                Empezar nuevo test
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

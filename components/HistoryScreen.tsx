"use client"

import React, { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import  {Select, SelectContent, SelectItem, SelectTrigger, SelectValue}  from "@/components/ui/select"
import { Search, ArrowUpDown, Calendar, User, Mail, Clock, FileText, ArrowLeft } from "lucide-react"
import { useApp } from "@/contexts/AppContext"
import type { HistoryReport } from "@/types"
import { useRouter } from "next/navigation" // Import useRouter from next/navigation if using Next.js
const mockHistoryData: HistoryReport[] = [
  {
    id: "report-1",
    patientId: "patient-1",
    patientName: "María García López",
    patientEmail: "maria.garcia@email.com",
    sessionId: "session-1",
    createdDate: new Date("2024-01-15T10:30:00"),
    completedDate: new Date("2024-01-15T11:15:00"),
    totalScore: 85,
    subtestCount: 6,
    duration: 45,
    status: "completed",
  },
  {
    id: "report-2",
    patientId: "patient-2",
    patientName: "Juan Pérez Martín",
    patientEmail: "juan.perez@email.com",
    sessionId: "session-2",
    createdDate: new Date("2024-01-14T14:20:00"),
    completedDate: new Date("2024-01-14T15:10:00"),
    totalScore: 72,
    subtestCount: 6,
    duration: 50,
    status: "completed",
  },
  {
    id: "report-3",
    patientId: "patient-3",
    patientName: "Ana Rodríguez Silva",
    patientEmail: "ana.rodriguez@email.com",
    sessionId: "session-3",
    createdDate: new Date("2024-01-13T09:15:00"),
    completedDate: new Date("2024-01-13T09:45:00"),
    totalScore: 45,
    subtestCount: 4,
    duration: 30,
    status: "partial",
  },
  {
    id: "report-4",
    patientId: "patient-4",
    patientName: "Carlos Fernández Ruiz",
    patientEmail: "carlos.fernandez@email.com",
    sessionId: "session-4",
    createdDate: new Date("2024-01-12T16:00:00"),
    completedDate: new Date("2024-01-12T16:55:00"),
    totalScore: 91,
    subtestCount: 6,
    duration: 55,
    status: "completed",
  },
  {
    id: "report-5",
    patientId: "patient-5",
    patientName: "Laura Sánchez Torres",
    patientEmail: "laura.sanchez@email.com",
    sessionId: "session-5",
    createdDate: new Date("2024-01-11T11:30:00"),
    completedDate: new Date("2024-01-11T12:20:00"),
    totalScore: 78,
    subtestCount: 6,
    duration: 50,
    status: "completed",
  },
  // Extra para probar casos distintos 👇
  {
    id: "report-6",
    patientId: "patient-6",
    patientName: "Pedro López Hernández",
    patientEmail: "pedro.lopez@email.com",
    sessionId: "session-6",
    createdDate: new Date("2024-01-10T09:00:00"),
    completedDate: new Date("2024-01-10T09:25:00"),
    totalScore: 30,
    subtestCount: 3,
    duration: 25,
    status: "partial",
  },
  {
    id: "report-7",
    patientId: "patient-7",
    patientName: "Elena Martínez",
    patientEmail: "elena.martinez@email.com",
    sessionId: "session-7",
    createdDate: new Date("2024-01-09T17:40:00"),
    completedDate: new Date("2024-01-09T18:45:00"),
    totalScore: 99,
    subtestCount: 7,
    duration: 65,
    status: "completed",
  },
  {
    id: "report-8",
    patientId: "patient-8",
    patientName: "Luis Gómez",
    patientEmail: "luis.gomez@email.com",
    sessionId: "session-8",
    createdDate: new Date("2024-01-08T12:15:00"),
    completedDate: new Date("2024-01-08T12:45:00"),
    totalScore: 60,
    subtestCount: 5,
    duration: 30,
    status: "completed",
  },
  {
    id: "report-9",
    patientId: "patient-9",
    patientName: "Marta Ruiz",
    patientEmail: "marta.ruiz@email.com",
    sessionId: "session-9",
    createdDate: new Date("2024-01-07T08:00:00"),
    completedDate: new Date("2024-01-07T08:35:00"),
    totalScore: 55,
    subtestCount: 4,
    duration: 35,
    status: "partial",
  },
  {
    id: "report-10",
    patientId: "patient-10",
    patientName: "David Torres",
    patientEmail: "david.torres@email.com",
    sessionId: "session-10",
    createdDate: new Date("2024-01-06T19:20:00"),
    completedDate: new Date("2024-01-06T20:00:00"),
    totalScore: 82,
    subtestCount: 6,
    duration: 40,
    status: "completed",
  },
]

export default function HistoryScreen() {
  const { state, dispatch } = useApp()
  const [searchTerm, setSearchTerm] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const router = useRouter() // Import useRouter from next/navigation if using Next.js
  React.useEffect(() => {
    const mockHistoryData: HistoryReport[] = [
      {
        id: "report-1",
        patientId: "patient-1",
        patientName: "María García López",
        patientEmail: "maria.garcia@email.com",
        sessionId: "session-1",
        createdDate: new Date("2024-01-15T10:30:00"),
        completedDate: new Date("2024-01-15T11:15:00"),
        totalScore: 85,
        subtestCount: 6,
        duration: 45,
        status: "completed",
      },
      {
        id: "report-2",
        patientId: "patient-2",
        patientName: "Juan Pérez Martín",
        patientEmail: "juan.perez@email.com",
        sessionId: "session-2",
        createdDate: new Date("2024-01-14T14:20:00"),
        completedDate: new Date("2024-01-14T15:10:00"),
        totalScore: 72,
        subtestCount: 6,
        duration: 50,
        status: "completed",
      },
      {
        id: "report-3",
        patientId: "patient-3",
        patientName: "Ana Rodríguez Silva",
        patientEmail: "ana.rodriguez@email.com",
        sessionId: "session-3",
        createdDate: new Date("2024-01-13T09:15:00"),
        completedDate: new Date("2024-01-13T09:45:00"),
        totalScore: 45,
        subtestCount: 4,
        duration: 30,
        status: "partial",
      },
      {
        id: "report-4",
        patientId: "patient-4",
        patientName: "Carlos Fernández Ruiz",
        patientEmail: "carlos.fernandez@email.com",
        sessionId: "session-4",
        createdDate: new Date("2024-01-12T16:00:00"),
        completedDate: new Date("2024-01-12T16:55:00"),
        totalScore: 91,
        subtestCount: 6,
        duration: 55,
        status: "completed",
      },
      {
        id: "report-5",
        patientId: "patient-5",
        patientName: "Laura Sánchez Torres",
        patientEmail: "laura.sanchez@email.com",
        sessionId: "session-5",
        createdDate: new Date("2024-01-11T11:30:00"),
        completedDate: new Date("2024-01-11T12:20:00"),
        totalScore: 78,
        subtestCount: 6,
        duration: 50,
        status: "completed",
      },
    ]

    dispatch({ type: "LOAD_HISTORY", payload: mockHistoryData })
  }, [dispatch])


  const filteredAndSortedReports = useMemo(() => {
    const filtered =mockHistoryData?.filter(
      (report) =>
        report.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.patientEmail.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    return filtered?.sort((a, b) => {
      const dateA = new Date(a.createdDate).getTime()
      const dateB = new Date(b.createdDate).getTime()
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB
    })
  }, [state.historyReports, searchTerm, sortOrder])

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date))
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800"
    if (score >= 60) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/home")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Historial de Informes</h1>
              <p className="text-gray-600 mt-1">Busca y revisa informes de evaluaciones anteriores</p>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre o email del paciente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => setSortOrder(value)}>
                <SelectTrigger className="w-full sm:w-48">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Más reciente primero</SelectItem>
                  <SelectItem value="asc">Más antiguo primero</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Mostrando {filteredAndSortedReports?.length} de {state.historyReports?.length} informes
          </p>
        </div>

        {/* Reports List */}
        <div className="space-y-4">
          {filteredAndSortedReports?.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron informes</h3>
                <p className="text-gray-600">
                  {searchTerm ? "Intenta con otros términos de búsqueda" : "Aún no hay informes guardados"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredAndSortedReports?.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {report.patientName}
                        </h3>
                        <Badge variant={report.status === "completed" ? "default" : "secondary"}>
                          {report.status === "completed" ? "Completado" : "Parcial"}
                        </Badge>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {report.patientEmail}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(report.createdDate)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {report.duration} min
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div className="text-center">
                        <div
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(report.totalScore)}`}
                        >
                          Puntuación: {report.totalScore}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{report.subtestCount} subtests</p>
                      </div>

                      <Button variant="outline" size="sm">
                        Ver Informe
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

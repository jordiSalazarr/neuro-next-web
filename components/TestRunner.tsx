"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Pause, Play, RotateCcw, ChevronLeft, ChevronRight, TestTube } from "lucide-react"
import { useApp } from "@/contexts/AppContext"
import type { SubtestResult } from "@/types"
import { useRouter } from "next/navigation"
import { SUBTEST_CONFIGS } from "@/config/subtests"

export default function TestRunner() {
  const t = useTranslations() // uses default namespace, we access subtests directly or specific namespaces
  const tRunner = useTranslations('testRunner')
  const { state, dispatch } = useApp()
  const [isPaused, setIsPaused] = useState(false)
  const [sessionTime, setSessionTime] = useState(0)
  const [showPauseModal, setShowPauseModal] = useState(false)
  const [isTestingMode, setIsTestingMode] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  const router = useRouter()
  const currentSession = state.currentSession!
  const currentSubtestIndex = currentSession?.currentSubtest
  const currentSubtest = SUBTEST_CONFIGS[currentSubtestIndex]
  const totalSubtests = SUBTEST_CONFIGS.length
  const progressPercentage = (currentSubtestIndex / totalSubtests) * 100
  // Función que maneja la acción de finalizar el test
  const handleFinishTest = () => {
    setIsConfirming(true) // Mostrar el diálogo de confirmación
  }

  // Función para cerrar el diálogo
  const handleCancel = () => {
    setIsConfirming(false) // Cerrar el diálogo sin hacer nada
  }

  // Función para confirmar y redirigir
  const handleConfirm = () => {
    // Aquí puedes agregar la lógica para finalizar el test si es necesario
    router.push("/test-overview") // Redirigir a la página de resumen
  }

  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      setSessionTime((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isPaused])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleSubtestComplete = (result: Omit<SubtestResult, "subtestId" | "name">) => {
    const completeResult: SubtestResult = {
      ...result,
      subtestId: currentSubtest.id,
      name: t(currentSubtest.nameKey),
    }

    dispatch({ type: "COMPLETE_SUBTEST", payload: completeResult })

    if (currentSubtestIndex >= totalSubtests - 1) {
      dispatch({ type: "COMPLETE_SESSION" })
    }
  }

  const handlePreviousSubtest = () => {
    if (currentSubtestIndex > 0) {
      const updatedSession = {
        ...currentSession,
        currentSubtest: currentSubtestIndex - 1,
      }
      dispatch({ type: "UPDATE_SESSION", payload: updatedSession })
    }
  }

  const handleNextSubtest = () => {
    if (currentSubtestIndex < totalSubtests - 1) {
      const updatedSession = {
        ...currentSession,
        currentSubtest: currentSubtestIndex + 1,
      }
      dispatch({ type: "UPDATE_SESSION", payload: updatedSession })
    }
  }

  const toggleTestingMode = () => {
    setIsTestingMode(!isTestingMode)
  }

  const handlePause = () => {
    setIsPaused(true)
    setShowPauseModal(true)
  }

  const handleResume = () => {
    setIsPaused(false)
    setShowPauseModal(false)
  }

  const handleRestart = () => {
    if (confirm(tRunner('confirmRestart'))) {
      const newSession = {
        ...currentSession,
        currentSubtest: 0,
        subtestResults: [],
        startTime: new Date(),
      }
      dispatch({ type: "UPDATE_SESSION", payload: newSession })
      setSessionTime(0)
      setIsPaused(false)
      setShowPauseModal(false)
    }
  }

  const renderCurrentSubtest = () => {
    if (!currentSubtest) return null

    const SubtestComponent = currentSubtest.component
    return <SubtestComponent onComplete={handleSubtestComplete} onPause={handlePause} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {currentSubtest && (
          <Card className="mb-4 sm:mb-6">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-lg sm:text-xl lg:text-2xl leading-tight">{t(currentSubtest.nameKey)}</span>
                {currentSubtest.duration && (
                  <Badge variant="outline" className="self-start sm:self-auto text-xs sm:text-sm">
                    {t('evaluation.duration')}: {Math.floor(currentSubtest.duration / 60)}:
                    {(currentSubtest.duration % 60).toString().padStart(2, "0")}
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm sm:text-base text-gray-600 mt-2">{t(currentSubtest.descriptionKey)}</p>
            </CardHeader>
          </Card>
        )}

        {!isPaused && renderCurrentSubtest()}
      </div>

      {showPauseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg sm:text-xl">
                <Pause className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                {tRunner('pausedTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm sm:text-base text-gray-600">
                {tRunner('pausedDesc')}
              </p>
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                <p className="text-xs sm:text-sm text-blue-800">
                  <strong>{tRunner('timeElapsed')}:</strong> {formatTime(sessionTime)}
                </p>
                <p className="text-xs sm:text-sm text-blue-800 mt-1">
                  <strong>{tRunner('progress')}:</strong> {tRunner('subtestsCompleted', { completed: currentSubtestIndex, total: totalSubtests })}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleResume} className="flex-1 text-sm sm:text-base">
                  <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  {tRunner('resume')}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRestart}
                  className="flex-1 text-sm sm:text-base bg-transparent"
                >
                  <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  {tRunner('restart')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      <div>
        {/* Botón para finalizar el test
      <Button
        variant="destructive"
        onClick={handleFinishTest}
        className="mt-4"
      >
        Finalizar Test
      </Button> */}

        {/* Diálogo de confirmación */}
        {isConfirming && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
              <h2 className="text-lg font-semibold">{tRunner('confirmFinishTitle')}</h2>
              <p className="mt-2">{tRunner('confirmFinishDesc')}</p>
              <div className="mt-4 flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="bg-gray-300 hover:bg-gray-400 text-sm"
                >
                  {tRunner('cancel')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirm}
                  className="bg-red-600 hover:bg-red-700 text-sm"
                >
                  {tRunner('yesFinish')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

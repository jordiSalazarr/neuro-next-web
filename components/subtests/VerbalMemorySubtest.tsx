"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Volume2, Clock } from "lucide-react"
import type { SubtestProps } from "@/types"

const WORD_LIST = [
  // Animales
  "LEÓN",
  "TIGRE",
  "ELEFANTE",
  "CABALLO",
  // Frutas
  "MANZANA",
  "NARANJA",
  "PLÁTANO",
  "UVA",
  // Herramientas
  "MARTILLO",
  "DESTORNILLADOR",
  "SIERRA",
  "LLAVE",
]

const SEMANTIC_CATEGORIES = {
  Animales: ["LEÓN", "TIGRE", "ELEFANTE", "CABALLO"],
  Frutas: ["MANZANA", "NARANJA", "PLÁTANO", "UVA"],
  Herramientas: ["MARTILLO", "DESTORNILLADOR", "SIERRA", "LLAVE"],
}

const RECOGNITION_WORDS = [
  // Palabras originales
  ...WORD_LIST,
  // Distractores semánticamente relacionados
  "PERRO",
  "GATO",
  "RATÓN",
  "PÁJARO", // Animales distractores
  "PERA",
  "LIMÓN",
  "FRESA",
  "MELÓN", // Frutas distractoras
  "TALADRO",
  "ALICATE",
  "CUCHILLO",
  "HACHA", // Herramientas distractoras
  // Distractores no relacionados
  "MESA",
  "SILLA",
  "LIBRO",
  "PAPEL",
]

const DELAY_TIME = 1200 // 20 minutos simulados como 20 segundos para testing

export function VerbalMemorySubtest({ onComplete, onPause }: SubtestProps) {
  const [phase, setPhase] = useState<
    "instructions" | "learning" | "delay" | "delayed-recall" | "recognition" | "completed"
  >("instructions")
  const [currentTrial, setCurrentTrial] = useState(0)
  const [userResponses, setUserResponses] = useState<string[][]>([])
  const [currentResponse, setCurrentResponse] = useState("")
  const [delayedRecallResponse, setDelayedRecallResponse] = useState("")
  const [delayTimeRemaining, setDelayTimeRemaining] = useState(DELAY_TIME)
  const [recognitionResponses, setRecognitionResponses] = useState<boolean[]>([])
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [isPlayingList, setIsPlayingList] = useState(false)

  useEffect(() => {
    if (phase !== "delay") return

    const interval = setInterval(() => {
      setDelayTimeRemaining((prev) => {
        if (prev <= 1) {
          setPhase("delayed-recall")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [phase])

  const startSubtest = () => {
    setPhase("learning")
    setStartTime(new Date())
    setCurrentTrial(0)
    setUserResponses([])
  }

  const playWordList = () => {
    setIsPlayingList(true)
    // Simular reproducción de audio
    setTimeout(() => {
      setIsPlayingList(false)
      alert(`Lista reproducida: ${WORD_LIST.join(", ")}`)
    }, 3000) // Más tiempo para 12 palabras
  }

  const handleResponseSubmit = () => {
    const words = currentResponse
      .split(/[,\s]+/)
      .map((word) => word.trim().toUpperCase())
      .filter((word) => word.length > 0)

    const newResponses = [...userResponses]
    newResponses[currentTrial] = words
    setUserResponses(newResponses)
    setCurrentResponse("")

    if (currentTrial < 2) {
      setCurrentTrial((prev) => prev + 1)
    } else {
      // Iniciar período de retardo
      setPhase("delay")
    }
  }

  const handleDelayedRecallSubmit = () => {
    const words = delayedRecallResponse
      .split(/[,\s]+/)
      .map((word) => word.trim().toUpperCase())
      .filter((word) => word.length > 0)

    setPhase("recognition")
  }

  const handleRecognitionChange = (wordIndex: number, isRecognized: boolean) => {
    const newResponses = [...recognitionResponses]
    newResponses[wordIndex] = isRecognized
    setRecognitionResponses(newResponses)
  }

  const completeSubtest = () => {
    setPhase("completed")

    const totalWordsRecalled = userResponses.flat().length
    const delayedWords = delayedRecallResponse
      .split(/[,\s]+/)
      .map((word) => word.trim().toUpperCase())
      .filter((word) => word.length > 0)

    const correctRecognitions = recognitionResponses.filter((response, index) => {
      const word = RECOGNITION_WORDS[index]
      const wasInOriginalList = WORD_LIST.includes(word)
      return response === wasInOriginalList
    }).length

    const timeSpent = startTime ? (Date.now() - startTime.getTime()) / 1000 : 0

    onComplete({
      startTime: startTime!,
      endTime: new Date(),
      score: Math.round((correctRecognitions / RECOGNITION_WORDS.length) * 100),
      errors: RECOGNITION_WORDS.length - correctRecognitions,
      timeSpent: Math.round(timeSpent),
      rawData: {
        learningTrials: userResponses,
        delayedRecall: delayedWords,
        recognitionResponses,
        totalWordsRecalled,
        delayedWordsRecalled: delayedWords.length,
        correctRecognitions,
        recognitionAccuracy: (correctRecognitions / RECOGNITION_WORDS.length) * 100,
        semanticClustering: calculateSemanticClustering(userResponses),
      },
    })
  }

  const calculateSemanticClustering = (responses: string[][]) => {
    const clustering = responses.map((trial) => {
      let clusters = 0
      for (const [category, words] of Object.entries(SEMANTIC_CATEGORIES)) {
        const categoryWords = trial.filter((word) => words.includes(word))
        if (categoryWords.length > 1) clusters++
      }
      return clusters
    })
    return clustering
  }

  if (phase === "instructions") {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Instrucciones - Test de Memoria Verbal (HVLT-R)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 p-6 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-3">¿Qué debe hacer?</h4>
            <ul className="space-y-2 text-blue-800">
              <li>• Escuchará una lista de 12 palabras organizadas en 3 categorías</li>
              <li>• La misma lista se repetirá 3 veces</li>
              <li>• Después de cada presentación, escriba todas las palabras que recuerde</li>
              <li>• Habrá un período de espera de 20-25 minutos</li>
              <li>• Luego recordará las palabras sin escucharlas de nuevo</li>
              <li>• Finalmente, reconocerá palabras de la lista original</li>
            </ul>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-3">Categorías de palabras:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(SEMANTIC_CATEGORIES).map(([category, words]) => (
                <div key={category} className="text-center">
                  <Badge variant="outline" className="mb-2">
                    {category}
                  </Badge>
                  <p className="text-sm text-green-800">{words.length} palabras</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-yellow-800">
              <strong>Duración estimada:</strong> 5-10 minutos
            </p>
          </div>

          <Button onClick={startSubtest} className="w-full" size="lg">
            Comenzar Test de Memoria Verbal
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (phase === "learning") {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Ensayo {currentTrial + 1} de 3</span>
              <Badge variant="outline">Fase de Aprendizaje</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <Button onClick={playWordList} disabled={isPlayingList} size="lg" className="mb-4">
                <Volume2 className="w-5 h-5 mr-2" />
                {isPlayingList ? "Reproduciendo..." : "Reproducir Lista de Palabras"}
              </Button>

              {isPlayingList && <p className="text-gray-600">Escuche atentamente las 12 palabras...</p>}
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium">
                Escriba todas las palabras que recuerde (separadas por comas o espacios):
              </label>
              <Textarea
                value={currentResponse}
                onChange={(e) => setCurrentResponse(e.target.value)}
                placeholder="Ejemplo: león, manzana, martillo..."
                className="min-h-32"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <Button variant="outline" onClick={onPause}>
                Pausar
              </Button>
              <Button onClick={handleResponseSubmit} disabled={!currentResponse.trim()}>
                {currentTrial < 2 ? "Siguiente Ensayo" : "Continuar al Período de Retardo"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Mostrar respuestas anteriores */}
        {userResponses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Respuestas Anteriores</CardTitle>
            </CardHeader>
            <CardContent>
              {userResponses.map((response, index) => (
                <div key={index} className="mb-2 p-2 bg-gray-50 rounded">
                  <strong>Ensayo {index + 1}:</strong> {response.join(", ") || "Sin respuesta"}
                  <span className="text-sm text-gray-600 ml-2">({response.length} palabras)</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  if (phase === "delay") {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-center">
            <Clock className="w-5 h-5 mr-2" />
            Período de Retardo (20-25 minutos)
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="text-6xl font-mono font-bold text-blue-600">
            {Math.floor(delayTimeRemaining / 60)}:{(delayTimeRemaining % 60).toString().padStart(2, "0")}
          </div>
          <p className="text-gray-600">Por favor, espere. No piense en las palabras durante este tiempo.</p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-800">Puede relajarse, conversar sobre otros temas o realizar otras actividades.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (phase === "delayed-recall") {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Recuerdo Diferido</CardTitle>
          <p className="text-gray-600">Sin escuchar la lista de nuevo, escriba todas las palabras que recuerde:</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <label className="block text-sm font-medium">
              Escriba todas las palabras que recuerde de la lista original:
            </label>
            <Textarea
              value={delayedRecallResponse}
              onChange={(e) => setDelayedRecallResponse(e.target.value)}
              placeholder="Escriba las palabras que recuerde..."
              className="min-h-32"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <Button variant="outline" onClick={onPause}>
              Pausar
            </Button>
            <Button onClick={handleDelayedRecallSubmit}>Continuar a Reconocimiento</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (phase === "recognition") {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Fase de Reconocimiento</CardTitle>
          <p className="text-gray-600">Marque las palabras que estaban en la lista original que escuchó:</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {RECOGNITION_WORDS.map((word, index) => (
              <div key={index} className="flex items-center space-x-2 p-2 border rounded">
                <Checkbox
                  id={`word-${index}`}
                  checked={recognitionResponses[index] || false}
                  onCheckedChange={(checked) => handleRecognitionChange(index, checked as boolean)}
                />
                <label htmlFor={`word-${index}`} className="text-sm font-medium cursor-pointer">
                  {word}
                </label>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6">
            <Button variant="outline" onClick={onPause}>
              Pausar
            </Button>
            <Button onClick={completeSubtest}>Finalizar Test</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Test de Memoria Verbal Completado</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-center text-gray-600 mb-4">
          El test de memoria verbal ha finalizado. Los resultados se han guardado.
        </p>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <strong>Palabras en ensayos:</strong> {userResponses.flat().length}
            </div>
            <div>
              <strong>Recuerdo diferido:</strong> {delayedRecallResponse.split(/[,\s]+/).filter((w) => w.trim()).length}
            </div>
            <div>
              <strong>Reconocimientos:</strong> {recognitionResponses.filter(Boolean).length}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

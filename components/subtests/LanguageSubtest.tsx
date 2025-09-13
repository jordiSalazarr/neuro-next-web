"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Clock, CheckCircle, XCircle } from "lucide-react"
import type { SubtestProps } from "@/types"
import axios from "axios"
import { useEvaluationStore } from "@/stores/evaluation"
import { useRouter } from "next/navigation"

const CATEGORIES = [
  {
    name: "Animales",
    description: "Diga todos los animales que pueda",
    examples: ["perro", "gato", "león", "elefante"],
  },
  {
    name: "Frutas",
    description: "Diga todas las frutas que pueda",
    examples: ["manzana", "naranja", "plátano", "uva"],
  },
  {
    name: "Profesiones",
    description: "Diga todas las profesiones que pueda",
    examples: ["médico", "profesor", "ingeniero", "abogado"],
  },
]

const TEST_DURATION = 5 // 60 segundos

export function LanguageSubtest({ onComplete, onPause }: SubtestProps) {
  const [phase, setPhase] = useState<"instructions" | "active" | "completed">("instructions")
  const [currentCategory, setCurrentCategory] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(TEST_DURATION)
  const [currentWord, setCurrentWord] = useState("")
  const [validWords, setValidWords] = useState<string[]>([])
  const [repeatedWords, setRepeatedWords] = useState<string[]>([])
  const [invalidWords, setInvalidWords] = useState<string[]>([])
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [wordTimestamps, setWordTimestamps] = useState<{ word: string; timestamp: number }[]>([])
const [words, setWords] = useState<string[]>([])
const wordsRef = useRef<string[]>([])
  const currentEvaluationID = useEvaluationStore(state=>state.currentEvaluation?.id)
  const router = useRouter()

  // Timer para el test
  useEffect(() => {
    if (phase !== "active") return

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          completeSubtest()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [phase])

  const startSubtest = () => {
  setPhase("active")
  setStartTime(new Date())
  setTimeRemaining(TEST_DURATION)
  setValidWords([]); setRepeatedWords([]); setInvalidWords([]); setWordTimestamps([])
  setWords([]); wordsRef.current = []
}
  const isValidWord = (word: string, category: string): boolean => {
    const normalizedWord = word.toLowerCase().trim()
    if (normalizedWord.length < 2) return false

    // Validación simple por categoría
    switch (category.toLowerCase()) {
      case "animales":
        // Lista básica de animales válidos (en una implementación real sería más extensa)
        const animals = [
          "perro",
          "gato",
          "león",
          "tigre",
          "elefante",
          "jirafa",
          "cebra",
          "caballo",
          "vaca",
          "cerdo",
          "oveja",
          "cabra",
          "pollo",
          "pato",
          "ganso",
          "pez",
          "tiburón",
          "ballena",
          "delfín",
          "oso",
          "lobo",
          "zorro",
          "conejo",
          "ratón",
          "rata",
          "ardilla",
          "mono",
          "gorila",
          "chimpancé",
          "serpiente",
          "lagarto",
          "cocodrilo",
          "tortuga",
          "rana",
          "sapo",
          "pájaro",
          "águila",
          "halcón",
          "búho",
          "loro",
          "canario",
          "pingüino",
          "avestruz",
          "mariposa",
          "abeja",
          "hormiga",
          "araña",
          "mosca",
          "mosquito",
        ]
        return animals.includes(normalizedWord)

      case "frutas":
        const fruits = [
          "manzana",
          "naranja",
          "plátano",
          "banana",
          "uva",
          "pera",
          "melocotón",
          "durazno",
          "fresa",
          "frambuesa",
          "mora",
          "arándano",
          "cereza",
          "ciruela",
          "albaricoque",
          "kiwi",
          "mango",
          "papaya",
          "piña",
          "ananá",
          "sandía",
          "melón",
          "limón",
          "lima",
          "pomelo",
          "mandarina",
          "higo",
          "dátil",
          "coco",
          "aguacate",
          "palta",
        ]
        return fruits.includes(normalizedWord)

      case "profesiones":
        const professions = [
          "médico",
          "doctor",
          "enfermero",
          "enfermera",
          "profesor",
          "maestro",
          "maestra",
          "ingeniero",
          "arquitecto",
          "abogado",
          "juez",
          "policía",
          "bombero",
          "piloto",
          "conductor",
          "chofer",
          "cocinero",
          "chef",
          "camarero",
          "mesero",
          "vendedor",
          "comerciante",
          "contador",
          "secretario",
          "secretaria",
          "programador",
          "diseñador",
          "artista",
          "músico",
          "cantante",
          "actor",
          "actriz",
          "escritor",
          "periodista",
          "fotógrafo",
          "peluquero",
          "barbero",
          "mecánico",
          "electricista",
          "plomero",
          "carpintero",
          "albañil",
          "jardinero",
          "agricultor",
          "veterinario",
          "dentista",
          "psicólogo",
          "farmacéutico",
        ]
        return professions.includes(normalizedWord)

      default:
        return true // Por defecto, aceptar la palabra
    }
  }

  const handleWordSubmit = (e: React.FormEvent) => {
  e.preventDefault()
  const w = currentWord.trim()
  if (!w) return
  setWords(prev => {
    const next = [...prev, w]
    wordsRef.current = next
    return next
  })
  setCurrentWord("")
}

 const completeSubtest = async () => {
  // si quedó algo en el input, añádelo
  if (currentWord.trim()) {
    const w = currentWord.trim()
    setCurrentWord("")
    wordsRef.current = [...wordsRef.current, w]
    setWords(wordsRef.current)
  }

  try {
    setPhase("completed")
    const timeSpent = startTime ? (Date.now() - startTime.getTime()) / 1000 : 0
    const totalWords = validWords.length + repeatedWords.length + invalidWords.length
    const wordsPerMinute = (validWords.length / Math.max(1, (TEST_DURATION - timeRemaining))) * 60

    const payload = {
      EvaluationID: currentEvaluationID ?? "",
      Category: CATEGORIES[currentCategory].name,
      Words: wordsRef.current,         // <— TODAS las palabras
      Duration: TEST_DURATION,
      Language: "es",
      Proficiency: "nativo",
      TotalTime: Math.round(timeSpent),
    }

    await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/evaluations/language-fluency`, payload)

    // onComplete({
    //   startTime: startTime!, endTime: new Date(),
    //   score: validWords.length,
    //   errors: repeatedWords.length + invalidWords.length,
    //   timeSpent: Math.round(timeSpent),
    //   rawData: { /* ...lo tuyo... */, wordsPerMinute: Math.round(wordsPerMinute) },
    // })
    router.push("/finish-test")
  } catch (e) {
    console.log(e)
  }
}

  const formatTime = (seconds: number) => {
    return `${seconds.toString().padStart(2, "0")}s`
  }

  if (phase === "instructions") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Instrucciones - Fluencia Verbal Semántica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-teal-50 p-6 rounded-lg">
            <h4 className="font-semibold text-teal-900 mb-3">¿Qué debe hacer?</h4>
            <ul className="space-y-2 text-teal-800">
              <li>• Se le dará una categoría (por ejemplo: "animales")</li>
              <li>• Tiene 60 segundos para escribir todas las palabras que pueda de esa categoría</li>
              <li>• Escriba una palabra y presione Enter para continuar</li>
              <li>• No repita palabras</li>
              <li>• Solo palabras válidas de la categoría cuentan</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-yellow-800">
              <strong>Duración:</strong> 60 segundos exactos
            </p>
          </div>

          <Button onClick={startSubtest} className="w-full" size="lg">
            Comenzar Test de Fluencia Verbal
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (phase === "active") {
    const category = CATEGORIES[currentCategory]
    const progressPercentage = ((TEST_DURATION - timeRemaining) / TEST_DURATION) * 100

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Categoría: {category.name}</span>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <Badge variant={timeRemaining <= 10 ? "destructive" : "default"} className="text-lg px-3 py-1">
                  {formatTime(timeRemaining)}
                </Badge>
              </div>
            </CardTitle>
            <p className="text-gray-600">{category.description}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <Progress value={progressPercentage} className="h-3" />

            <form onSubmit={handleWordSubmit} className="flex gap-2">
              <Input
                value={currentWord}
                onChange={(e) => setCurrentWord(e.target.value)}
                placeholder="Escriba una palabra y presione Enter..."
                className="text-lg"
                autoFocus
              />
              <Button type="submit" disabled={!currentWord.trim()}>
                Agregar
              </Button>
            </form>

            {/* <div className="grid grid-cols-3 gap-4">
              <Card className="bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-semibold text-green-800">Válidas ({validWords.length})</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    {validWords.map((word, index) => (
                      <Badge key={index} variant="secondary" className="mr-1 mb-1 text-xs">
                        {word}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-4 h-4 text-yellow-600" />
                    <span className="font-semibold text-yellow-800">Repetidas ({repeatedWords.length})</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    {repeatedWords.map((word, index) => (
                      <Badge key={index} variant="outline" className="mr-1 mb-1 text-xs">
                        {word}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="font-semibold text-red-800">Inválidas ({invalidWords.length})</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    {invalidWords.map((word, index) => (
                      <Badge key={index} variant="destructive" className="mr-1 mb-1 text-xs">
                        {word}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div> */}

            <div className="text-center">
              <Button variant="outline" onClick={onPause}>
                Pausar Test
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test de Fluencia Verbal Completado</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-center text-gray-600 mb-4">
          El test de fluencia verbal ha finalizado. Los resultados se han guardado.
        </p>
        <div className="bg-teal-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Palabras válidas:</strong> {validWords.length}
            </div>
            <div>
              <strong>Palabras repetidas:</strong> {repeatedWords.length}
            </div>
            <div>
              <strong>Palabras inválidas:</strong> {invalidWords.length}
            </div>
            <div>
              <strong>Total de palabras:</strong> {validWords.length + repeatedWords.length + invalidWords.length}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

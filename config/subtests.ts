import type { SubtestConfig } from "@/types"
import { AttentionSubtest } from "@/components/subtests/AttentionSubtest"
import { VerbalMemorySubtest } from "@/components/subtests/VerbalMemorySubtest"
import { VisualMemorySubtest } from "@/components/subtests/VisualMemorySubtest"
import { ExecutiveFunctionSubtest } from "@/components/subtests/ExecutiveFunctionSubtest"
import { VisuospatialSubtest } from "@/components/subtests/VisuospatialSubtest"
import { LanguageSubtest } from "@/components/subtests/LanguageSubtest"

export const SUBTEST_CONFIGS: SubtestConfig[] = [
  {
    id: "attention-sustained",
    name: "Atención Sostenida - Cancelación de Letras",
    description: "Identifique y seleccione la letra objetivo que aparece en pantalla lo más rápido posible.",
    duration: 300, // 5 minutos
    component: AttentionSubtest,
  },
  {
    id: "verbal-memory-hvlt",
    name: "Memoria Verbal - HVLT-R",
    description: "Escuche las listas de palabras y recuerde tantas como pueda en cada ensayo.",
    duration: 600, // 10 minutos
    component: VerbalMemorySubtest,
  },
  {
    id: "visual-memory-bvmt",
    name: "Memoria Visual - BVMT-R",
    description: "Observe las figuras geométricas y luego dibújelas en el mismo orden y posición.",
    duration: 480, // 8 minutos
    component: VisualMemorySubtest,
  },
  {
    id: "executive-tmt",
    name: "Funciones Ejecutivas - TMT A/B",
    description: "Conecte los números y letras en secuencia lo más rápido posible sin cometer errores.",
    duration: 420, // 7 minutos
    component: ExecutiveFunctionSubtest,
  },
  {
    id: "visuospatial-clock",
    name: "Visuoespacial - Test del Reloj",
    description: "Dibuje un reloj que muestre la hora indicada, incluyendo números y manecillas.",
    duration: 300, // 5 minutos
    component: VisuospatialSubtest,
  },
  {
    id: "language-fluency",
    name: "Lenguaje - Fluencia Verbal Semántica",
    description: "Diga todas las palabras que pueda de la categoría indicada en 60 segundos.",
    duration: 60, // 1 minuto
    component: LanguageSubtest,
  },
]

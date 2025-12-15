import type { SubtestConfig } from "@/types"
import { AttentionSubtest } from "@/components/subtests/AttentionSubtest"
import { VerbalMemorySubtest } from "@/components/subtests/VerbalMemorySubtest"
import { VisualMemorySubtest } from "@/components/subtests/VisualMemorySubtest"
import { ExecutiveFunctionSubtest } from "@/components/subtests/ExecutiveFunctionSubtest"
import { VisuospatialSubtest } from "@/components/subtests/VisuospatialSubtest"
import { LanguageSubtest } from "@/components/subtests/LanguageSubtest"
import VerbalMemoryDelayedSubtest from "@/components/subtests/VerbalMemoryDelayed"

export const SUBTEST_CONFIGS: SubtestConfig[] = [
  {
    id: "attention-sustained",
    nameKey: "subtests.attention.name",
    descriptionKey: "subtests.attention.description",
    duration: 300,
    component: AttentionSubtest,
  },
  {
    id: "verbal-memory-hvlt",
    nameKey: "subtests.verbalMemory.name",
    descriptionKey: "subtests.verbalMemory.description",
    duration: 600,
    component: VerbalMemorySubtest,
  },
  {
    id: "visual-memory-bvmt",
    nameKey: "subtests.visualMemory.name",
    descriptionKey: "subtests.visualMemory.description",
    duration: 480,
    component: VisualMemorySubtest,
  },
  {
    id: "executive-tmt",
    nameKey: "subtests.executive.name",
    descriptionKey: "subtests.executive.description",
    duration: 420,
    component: ExecutiveFunctionSubtest,
  },
  {
    id: "visuospatial-clock",
    nameKey: "subtests.visuospatial.name",
    descriptionKey: "subtests.visuospatial.description",
    duration: 300,
    component: VisuospatialSubtest,
  },
  {
    id: "verbal_memory_delayed",
    nameKey: "subtests.verbalMemoryDelayed.name",
    descriptionKey: "subtests.verbalMemoryDelayed.description",
    duration: 200,
    component: VerbalMemoryDelayedSubtest,
  },
  {
    id: "language-fluency",
    nameKey: "subtests.language.name",
    descriptionKey: "subtests.language.description",
    duration: 60,
    component: LanguageSubtest,
  }
]

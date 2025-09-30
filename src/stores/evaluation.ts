import { CurrentEvaluation } from "@/types"
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"



type EvaluationState = {
  currentEvaluation: CurrentEvaluation | null
  setCurrentEvaluation: (ev: CurrentEvaluation | null) => void
  reset: () => void
}

export const EVALUATION_STORE_NAME = "evaluation-store" as const

export const useEvaluationStore = create<EvaluationState>()(
  persist(
    (set) => ({
      currentEvaluation: null,
      setCurrentEvaluation: (ev) => set({ currentEvaluation: ev }),
      reset: () => set({ currentEvaluation: null }),
    }),
    {
      name: EVALUATION_STORE_NAME,
      storage: createJSONStorage(() => sessionStorage), // correcto para sesión de test
      // partialize si quieres guardar solo el id:
      // partialize: (state) => ({ currentEvaluation: state.currentEvaluation && { id: state.currentEvaluation.id } })
    }
  )
)

// Helpers
export const useEvaluationId = () =>
  useEvaluationStore((s) => s.currentEvaluation?.id ?? null)

export const ensureEvaluationId = (fallback?: string) => {
  const id = useEvaluationId()
  return id ?? fallback ?? null
}

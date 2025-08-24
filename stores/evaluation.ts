// stores/evaluation.ts
import { CurrentEvaluation } from '@/types'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type EvaluationState = {
  currentEvaluation: CurrentEvaluation | null
  setCurrentEvaluation: (ev: CurrentEvaluation | null) => void
  reset: () => void
}

export const EVALUATION_STORE_NAME = 'evaluation-store' as const

export const useEvaluationStore = create<EvaluationState>()(
  persist(
    (set) => ({
      currentEvaluationId: null,
      currentEvaluation: null,
      setCurrentEvaluation: (ev) => set({ currentEvaluation: ev }),
      reset: () => set({currentEvaluation: null }),
    }),
    {
      name:EVALUATION_STORE_NAME,
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)

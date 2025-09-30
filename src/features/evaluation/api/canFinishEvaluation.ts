import api from "@/src/lib/api"

  export async function canFinishEvaluation(evaluationId: string, specialistId: string):Promise<boolean> {
    if (!evaluationId || !specialistId) {
      return false
    }
    try {
      const response = await api.get(
        `/v1/evaluations/can-finish-evaluation/${evaluationId}/${specialistId}`,

      )
     return response.data.can_finish
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || "Error creating evaluation")
    }
  }
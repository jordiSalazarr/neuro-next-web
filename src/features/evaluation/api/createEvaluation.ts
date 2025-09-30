import api from "@/src/lib/api"
import { Tokens, User } from "../../auth/api/dto"
import { CurrentEvaluation } from "@/types"

  export async function createEvaluation(patientName: string, patientAge: number, user: User, tokens: Tokens):Promise<CurrentEvaluation | undefined> {
    if (!user || !tokens?.accessToken) {
      return
    }
    try {
      const response = await api.post(
        `/v1/evaluations`,
        {
          patientName: patientName,
          patientAge: patientAge,
          specialistMail: user.email,
          specialistId: user.id,
        },
      )
      const evaluation: CurrentEvaluation = {
        id: response.data.evaluation.pk,
        createdAt: response.data.evaluation.createdAt,
        currentStatus: response.data.evaluation.currentStatus,
        patientAge: response.data.evaluation.patientAge,
        specialistId: response.data.evaluation.specialistId,
        specialistMail: response.data.evaluation.specialistMail,
        patientName: response.data.evaluation.patientName,
      }
      return evaluation
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || "Error creating evaluation")
    }
  }
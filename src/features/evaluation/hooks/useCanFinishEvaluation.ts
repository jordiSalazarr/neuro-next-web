"use client"
import { useState } from "react";
import { canFinishEvaluation } from "../api/canFinishEvaluation";

export const  useCanFinishEvaluation= () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);

    const canFinish = async (evaluationId: string, specialistId: string) => {
        setLoading(true);
        try{
            const canFinish = await canFinishEvaluation(evaluationId, specialistId);
            console.log("canFinish:", canFinish);
            return canFinish;
        }catch(error){
           setError(error)
         }finally{
            setLoading(false);
        }
    }
   return { canFinish, canFinishLoading: loading, canFinishError: error }
}
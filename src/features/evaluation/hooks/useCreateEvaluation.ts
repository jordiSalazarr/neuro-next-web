"use client"
import { useAuthStore } from "@/src/stores/auth";
import { useState } from "react";
import { createEvaluation } from "../api/createEvaluation";

export const  useCreateEvaluation= () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);
    const { user, tokens } = useAuthStore();

    const create = async (patientName: string, patientAge: number) => {
        setLoading(true);
        try{
            if (!user || !tokens) throw new Error("User not authenticated");
            const createdEvaluation = await createEvaluation(patientName, patientAge, user, tokens);
            return createdEvaluation;
        }catch(error){
           setError(error)
         }finally{
            setLoading(false);
        }
    }
   return { create, createLoading: loading, createError: error }
}
'use client'

import { useCanFinishEvaluation } from '@/src/features/evaluation/hooks/useCanFinishEvaluation'
import { useEvaluationStore } from '@/src/stores/evaluation'
import axios from 'axios'
import { useRouter } from "next/navigation" // Import useRouter from next/navigation if using Next.js
import {  useEffect, useState } from 'react'

function formatDate(d: string | Date | undefined): string {
  if (!d) return '-'
  const dt = typeof d === 'string' ? new Date(d) : d
  try {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(dt)
  } catch {
    return String(d)
  }
}

export default function FinishTestPage() {
  const currentEvaluation = useEvaluationStore(state=>state.currentEvaluation)
  const resetEvaluation = useEvaluationStore(state=>state.reset)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [userCanFinish, setUserCanFinish] = useState(false)
  const router = useRouter()
   const checkUserCanFinish = async ()=> {
     const userCanFinish = await canFinish(currentEvaluation?.id || "", currentEvaluation?.specialistId || "")
     setUserCanFinish(userCanFinish || false)
  }
  const {canFinish,canFinishLoading,canFinishError} = useCanFinishEvaluation()
    useEffect(() => {
    checkUserCanFinish()
  }, [])

   if (!currentEvaluation) return
  const canSubmit = currentEvaluation?.id != null && currentEvaluation.id != ""
  
  const handleFinish = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
    await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/evaluations/finish-evaluation`,{
        evaluation_id:currentEvaluation.id
      })
      setDone(true)
      router.push("/test-overview")
    } catch (e: any) {
      setError(e?.message || 'Error al finalizar el test')
    } finally {
      setSubmitting(false)
    }
  }
  if (canFinishError) {
    return <div className="p-6 text-red-700">Error: {String(canFinishError)}</div>
  }
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Finalizar test</h1>

      {!currentEvaluation ? (
        <div className="rounded-xl border p-4">
          <p className="text-sm">
            No se encontró ninguna evaluación activa en el contexto.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border p-5">
            <h2 className="text-lg font-medium mb-3">Resumen</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <dt className="text-sm text-neutral-500">Paciente</dt>
                <dd className="text-base">{currentEvaluation.patientName || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-neutral-500">Edad</dt>
                <dd className="text-base">{currentEvaluation.patientAge.toString() ||  '-'}</dd>
              </div>
              <div>
                <dt className="text-sm text-neutral-500">Creado</dt>
                <dd className="text-base">{formatDate(currentEvaluation.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-sm text-neutral-500">ID evaluación</dt>
                <dd className="text-base break-all">
                  {currentEvaluation.id || '(desconocido)'}
                </dd>
              </div>
            </dl>
          </section>

          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
           {userCanFinish ?  <button
              type="button"
              disabled={!canSubmit}
              onClick={handleFinish}
              className="rounded-2xl px-5 py-2.5 text-white bg-black disabled:opacity-50"
            >
              {submitting ? 'Evaluando...' : done ? 'Enviado' : 'Finalizar test'}
            </button> :
             <><span className="text-sm text-red-700">No se pueden finalizar las evaluaciones incompletas.Finalize todos los tests primero.</span>
             <button
              type="button"
              onClick={() => router.push("/test-runner")}
              className="rounded-lg px-3 py-2.5 text-white bg-black disabled:opacity-50"
            >
              Volver a la evaluación
            </button>
             </>

             } 
            {done && (
              <span className="text-sm text-green-700">
                Test finalizado correctamente.
              </span>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

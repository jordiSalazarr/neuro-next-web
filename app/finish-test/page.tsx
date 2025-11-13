"use client";

import { useCanFinishEvaluation } from "@/src/features/evaluation/hooks/useCanFinishEvaluation";
import { useEvaluationStore } from "@/src/stores/evaluation";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Loader2,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

const styles = {
  shell: "min-h-[calc(100vh-56px)]",
  card:
    "bg-white/85 backdrop-blur border border-slate-200/70 shadow-xl rounded-2xl",
  primary: "bg-brand-600 hover:bg-slate-900 text-white",
  outline: "border-slate-300 text-slate-800 hover:bg-slate-50",
};

function formatDate(d: string | Date | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  try {
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(dt);
  } catch {
    return String(d);
  }
}

export default function FinishTestPage() {
  const currentEvaluation = useEvaluationStore((s) => s.currentEvaluation);
  const resetEvaluation = useEvaluationStore((s) => s.reset);
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [userCanFinish, setUserCanFinish] = useState(false);

  const { canFinish, canFinishLoading, canFinishError } =
    useCanFinishEvaluation();

  useEffect(() => {
    const run = async () => {
      if (!currentEvaluation?.id || !currentEvaluation?.specialistId) {
        setUserCanFinish(false);
        return;
      }
      try {
        const ok = await canFinish(
          currentEvaluation.id,
          currentEvaluation.specialistId
        );
        setUserCanFinish(!!ok);
      } catch {
        setUserCanFinish(false);
      }
    };
    run();
  }, [currentEvaluation?.id, currentEvaluation?.specialistId, canFinish]);

  if (!currentEvaluation) {
    return (
      <main className={styles.shell}>
        <section className="mx-auto max-w-xl px-4 py-8 sm:py-10">
          <Card className={styles.card}>
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900">
                No hay una evaluación activa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700 text-sm sm:text-base">
                Vuelva al panel para iniciar o reanudar una evaluación.
              </p>
              <div className="flex justify-end">
                <Button
                  onClick={() => router.push("/test-overview")}
                  className={styles.primary}
                >
                  Ir al panel
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  const canSubmit = !!currentEvaluation.id;

  const handleFinish = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/evaluations/finish-evaluation`,
        {
          evaluation_id: currentEvaluation.id,
        }
      );
      setDone(true);
      try {
        resetEvaluation();
      } catch {}
      router.push(`/evaluations/${currentEvaluation.id}`);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Error al finalizar la evaluación"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.shell}>
      <section className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-slate-900 text-2xl sm:text-3xl font-semibold tracking-tight">
              Finalizar evaluación
            </h1>
            {currentEvaluation.id && (
              <Badge
                variant="secondary"
                className="bg-slate-900 text-slate-50 border-slate-900/80 text-xs sm:text-sm"
              >
                ID: {currentEvaluation.id.slice(0, 8)}…
              </Badge>
            )}
          </div>
          <p className="text-slate-600 text-sm sm:text-base mt-1">
            Revise y confirme el cierre. Los resultados se consolidarán de forma
            segura.
          </p>
        </header>

        {/* Resumen */}
        <Card className={styles.card}>
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-900 text-lg sm:text-xl">
              Resumen de la evaluación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm sm:text-base">
              <div>
                <p className="text-slate-500">Paciente</p>
                <p className="font-medium text-slate-900">
                  {currentEvaluation.patientName || "—"}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Fecha</p>
                <p className="font-medium text-slate-900">
                  {formatDate(currentEvaluation.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Estado</p>
                {canFinishLoading ? (
                  <span className="inline-flex items-center gap-2 text-slate-700">
                    <Loader2 className="h-4 w-4 animate-spin" /> Comprobando…
                  </span>
                ) : userCanFinish ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <ShieldCheck className="h-4 w-4" /> Listo para finalizar
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-700">
                    <AlertTriangle className="h-4 w-4" /> Tests pendientes
                  </span>
                )}
              </div>
            </div>

            {canFinishError && (
              <div className="rounded-md border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
                No se pudo verificar el estado. Inténtelo de nuevo.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acciones */}
        <div className="mt-4 space-y-3">
          {error && (
            <div className="rounded-md border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
              {error}
            </div>
          )}

          {userCanFinish ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                aria-label="Finalizar evaluación"
                disabled={!canSubmit || submitting}
                onClick={handleFinish}
                className={`${styles.primary} px-5`}
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Consolidando
                    resultados…
                  </span>
                ) : done ? (
                  "Enviado"
                ) : (
                  "Finalizar evaluación"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/test-overview")}
                className={styles.outline}
              >
                Volver al panel
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-700">
                Debe completar todos los subtests antes de finalizar.
              </span>
              <Button
                onClick={() => router.push("/test-runner")}
                className={styles.primary}
              >
                Volver a la evaluación
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/test-overview")}
                className={styles.outline}
              >
                Ver resumen
              </Button>
            </div>
          )}
        </div>

        {/* Mensaje de éxito (fallback si no ha redirigido todavía) */}
        {done && !submitting && (
          <div className="mt-6">
            <Card className={styles.card}>
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Evaluación finalizada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 text-sm sm:text-base">
                  Los resultados se han consolidado correctamente.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      {/* Overlay bloqueante mientras se finaliza */}
      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl bg-white p-6 shadow-2xl border border-slate-200 w-[min(92vw,420px)]">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
              <p className="font-medium text-slate-900">
                Finalizando evaluación…
              </p>
            </div>
            <p className="text-sm text-slate-600">
              Guardando y validando resultados. Este proceso puede tardar unos
              segundos.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

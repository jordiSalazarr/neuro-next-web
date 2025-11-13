"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, ClipboardList, History, ShieldCheck, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { useCognitoCallback } from "@/src/features/auth/hooks/useCognitoCallback";

// ================= Tokens visuales =================
const styles = {
  shell: "min-h-[calc(100vh-56px)]", // descuenta header del RootLayout
  card: "bg-white/85 backdrop-blur border border-slate-200/70 shadow-xl rounded-2xl",
  primary: "bg-brand-600 hover:bg-slate-900 text-white",
  outline: "border-slate-300 text-slate-800 hover:bg-slate-50",
};

export default function HomeScreen() {
  const { loading, error } = useCognitoCallback({ redirectPath: "/home" });

  if (loading) {
    return (
      <div className="grid place-items-center min-h-screen px-4">
        <Card className={`${styles.card} w-[min(92vw,420px)]`}>
          <CardContent className="py-6 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
            <p className="text-slate-800 text-sm">Cargando…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid place-items-center min-h-screen px-4">
        <Card className={`${styles.card} w-[min(92vw,520px)]`}>
          <CardHeader className="pb-2">
            <h1 className="text-slate-900 text-lg font-semibold">Error de autenticación</h1>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-700">{error}</p>
            <Button asChild className={styles.primary} size="lg">
              <Link href="/">Volver a iniciar sesión</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className={`${styles.shell}`}>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        {/* Hero compacto */}
        <div className="mb-8 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <Stethoscope className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">NeuroSuite</h1>
              <p className="mt-1 text-sm text-slate-600">Tests neuropsicológicos · flujo guiado · informes.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild size="lg" className={styles.primary}>
              <Link href="/patient-selection">
                <ClipboardList className="mr-2 h-5 w-5" /> Nueva evaluación
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className={styles.outline}>
              <Link href="/history">
                <History className="mr-2 h-5 w-5" /> Historial
              </Link>
            </Button>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Nueva evaluación */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <Card className={`${styles.card} overflow-hidden transition hover:shadow-2xl`}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white">
                    <ClipboardList className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">Iniciar nueva evaluación</h3>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-slate-700">
                Flujo paso a paso con control de calidad y temporizaciones.
              </CardContent>
              <CardFooter>
                <Button asChild className={`${styles.primary} w-full`}>
                  <Link href="/patient-selection">Comenzar</Link>
                </Button>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Historial */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
          >
            <Card className={`${styles.card} overflow-hidden transition hover:shadow-2xl`}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-white">
                    <History className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">Historial</h3>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-slate-700">
                Resultados, comparativas y exportación de informes.
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className={`${styles.outline} w-full`}>
                  <Link href="/history">Ver historial</Link>
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </div>

        {/* Confianza / cumplimiento */}
        <div className="mt-10">
          <Card className={`${styles.card}`}>
            <CardContent className="p-4 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
                <p>Datos cifrados en tránsito y reposo · Control de acceso por roles · Auditoría completa.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

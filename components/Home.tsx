"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Suspense } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useAuthStore } from "@/src/stores/auth"
import { useCognitoCallback } from "@/src/features/auth/hooks/useCognitoCallback"

import { ClipboardList, History, Loader2, ShieldCheck, Stethoscope } from "lucide-react"

// ================= UI tokens corporativos =================
const styles = {
  backdrop: "bg-[#0E2F3C]", // azul hospital corporativo
  card: "bg-white/80 backdrop-blur border-slate-200",
  primary: "bg-[#0E7C86] hover:bg-[#0a646c] text-white",
  outline: "border-slate-300 text-slate-800 hover:bg-slate-50",
}

const HomeScreen = () => {
  const router = useRouter()
  const { loading, error } = useCognitoCallback({ redirectPath: "/home" })

  if (loading) {
    return (
      <div className={`${styles.backdrop} flex min-h-screen flex-col items-center justify-center px-4`}>
        <Card className={`${styles.card} shadow-xl w-[min(92vw,420px)]`}>
          <CardContent className="py-6 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-[#0E7C86]" />
            <p className="text-slate-800 text-sm">Cargando…</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${styles.backdrop} flex min-h-screen flex-col items-center justify-center px-4`}>
        <Card className={`${styles.card} shadow-xl w-[min(92vw,520px)]`}>
          <CardHeader className="pb-2">
            <h1 className="text-slate-900 text-lg font-semibold">Error de autenticación</h1>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-700">{error}</p>
            <Button asChild className={styles.primary} size="lg">
              <Link href="/">Volver a iniciar sesión</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`${styles.backdrop} relative min-h-screen`}>      
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0E7C86] text-white shadow-sm">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-white/90 text-lg font-semibold tracking-tight">NeuroEval</h1>
              <p className="text-[11px] text-white/70">Plataforma de evaluación neuropsicológica</p>
            </div>
          </div>
        </div>

        {/* Hero */}
        <div className="mb-8 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white/95 sm:text-4xl">
              Bienvenido de nuevo
            </h2>
            <p className="mt-2 text-sm text-white/80">
              Inicie una nueva evaluación o consulte el historial. Datos cifrados y procesos conforme a buenas prácticas clínicas.
            </p>
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

        <Separator className="bg-white/10" />

        {/* Tarjetas de acción */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* Nueva evaluación */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <Card className={`${styles.card} group relative overflow-hidden shadow-sm transition hover:shadow-md`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0E7C86] text-white shadow-sm">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Iniciar nueva evaluación</h3>
                    <p className="text-xs text-slate-600">BVMT-R, TMT A/A+B, Letters, CDT, Fluencia…</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-slate-700">
                Configure al paciente y comience la batería. El sistema guía cada subtest con temporizaciones y control de calidad.
              </CardContent>
              <CardFooter>
                <Button asChild className={`${styles.primary} w-full`}>
                  <Link href="/patient-selection">Iniciar</Link>
                </Button>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Historial */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
            <Card className={`${styles.card} group relative overflow-hidden shadow-sm transition hover:shadow-md`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 text-white shadow-sm">
                    <History className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Historial de evaluaciones</h3>
                    <p className="text-xs text-slate-600">Resultados, PDFs y comparativas longitudinales.</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-slate-700">
                Revise evaluaciones previas y exporte informes con trazabilidad y control de acceso por roles.
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className={`${styles.outline} w-full`}>
                  <Link href="/history">Ver historial</Link>
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </div>

        {/* Pie de confianza */}
        <div className="mt-10">
          <Card className={`${styles.card} shadow-sm`}>
            <CardContent className="p-4 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <ShieldCheck className="h-4 w-4 text-[#0E7C86]" />
                <p>Datos cifrados en tránsito y en reposo. Acceso controlado por roles. Registro de actividad para auditoría.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default HomeScreen
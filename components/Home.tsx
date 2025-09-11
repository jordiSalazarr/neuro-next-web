
"use client"
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import { motion } from "framer-motion";

import { Badge, ClipboardList, History, SeparatorHorizontal, ShieldCheck, Stethoscope } from 'lucide-react'

function decodeJwt<T = any>(token: string): T | null {
  try {
    const [, payload] = token.split('.')
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}


const HomeScreen= () => {
    const setSession = useAuthStore((s) => s.setSession)
    const router = useRouter()

  useEffect(() => {
  const url = new URL(window.location.href)
  const code = url.searchParams.get("code")
  console.log(code)
  if (!code) return

  const verifier = sessionStorage.getItem("pkce_verifier") || ""
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id:process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID||"",
    code,
    redirect_uri:process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI||"",
    code_verifier: verifier,
  })
const cognitoGetTokensUrl = process.env.NEXT_PUBLIC_COGNITO_GET_TOKEN_URL ||""
  fetch(cognitoGetTokensUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
    .then(r => r.json())
    .then(tokens => {
      console.log(tokens)
      const claims = decodeJwt<any>(tokens.id_token) || {}
      const user = {
        id: claims.sub,
        name: claims.name || claims['cognito:username'] || '',
        email: claims.email || '',
        roles: claims['cognito:groups'] || [],
      }
       setSession(user, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
      })  
       })
}, [])

 return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      {/* background decor */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-20 mx-auto h-64 w-[80%] rounded-full bg-blue-100/50 blur-3xl dark:bg-blue-900/20"
      />
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">NeuroEval</h1>
              <p className="text-xs text-muted-foreground">Plataforma de evaluación neuropsicológica</p>
            </div>
          </div>

         
        </div>

  
        {/* Hero */}
        <div className="mb-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Bienvenido de nuevo!
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Inicie una nueva evaluación estandarizada o consulte el historial de pacientes. Datos cifrados y
              recopilación conforme a buenas prácticas clínicas.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Link href="/patient-selection">
                <ClipboardList className="mr-2 h-5 w-5" /> Nueva evaluación
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/history">
                <History className="mr-2 h-5 w-5" /> Historial
              </Link>
            </Button>
          </div>
        </div>

        <SeparatorHorizontal className="mb-8" />

        {/* Action cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Nueva evaluación */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <Card className="group relative overflow-hidden border-blue-100/60 shadow-sm transition hover:shadow-md dark:border-slate-800">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-100 opacity-60 blur-2xl dark:bg-blue-900/30" />
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">Iniciar nuevo test</h3>
                    <p className="text-xs text-muted-foreground">BVMT-R, TMT A/A+B, Letters, CDT, Fluencia…</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Configure al paciente y comience la batería. El sistema guía cada subtest con temporizaciones y control
                de calidad de captura.
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                  <Link href="/patient-selection">Iniciar</Link>
                </Button>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Historial */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
            <Card className="group relative overflow-hidden border-slate-200/70 shadow-sm transition hover:shadow-md dark:border-slate-800">
              <div className="pointer-events-none absolute -left-10 -top-12 h-36 w-36 rounded-full bg-slate-200 opacity-60 blur-2xl dark:bg-slate-700/30" />
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 text-white shadow-sm dark:bg-slate-600">
                    <History className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">Historial de tests</h3>
                    <p className="text-xs text-muted-foreground">Resultados, PDFs, métricas y análisis asistido.</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Revise evaluaciones previas, comparativas longitudinales y exporte informes con trazabilidad.
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/history">Ver historial</Link>
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </div>

        {/* Pie de confianza */}
        <div className="mt-10 rounded-lg border bg-white/60 p-4 text-xs shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/40 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <p className="text-muted-foreground">
              Datos cifrados en tránsito y en reposo. Acceso controlado por roles. Registro de actividad para auditoría.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeScreen

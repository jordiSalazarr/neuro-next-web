"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { LogIn, Stethoscope, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthenticate } from "@/src/features/auth/hooks/useAuthenticate"

// ================= UI tokens corporativos =================
const styles = {
  backdrop: "bg-[#0E2F3C]", // azul hospital corporativo
  card: "bg-white/80 backdrop-blur border-slate-200",
  primary: "bg-[#0E7C86] hover:bg-[#0a646c] text-white",
  outline: "border-slate-300 text-slate-800 hover:bg-slate-50",
}

export function LoginScreen() {
  const { redirect } = useAuthenticate()
  const [isRedirecting, setIsRedirecting] = useState(false)

  const handleLogin = () => {
    if (isRedirecting) return
    setIsRedirecting(true)
    try {
      redirect()
    } catch {
      // si redirigir lanza (raro), levantamos el estado
      setIsRedirecting(false)
    }
  }

  return (
    <div className={`${styles.backdrop} min-h-screen flex items-center justify-center px-4`}>      
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-sm sm:max-w-md"
      >
        <Card className={`${styles.card} shadow-xl rounded-2xl`}>
          <CardHeader className="px-6 pt-6 pb-3 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0E7C86] text-white shadow-sm">
              <Stethoscope className="h-6 w-6" />
            </div>
            <CardTitle className="text-slate-900 text-2xl sm:text-3xl font-semibold tracking-tight">
              NeuroEval
            </CardTitle>
            <CardDescription className="text-slate-700 text-sm sm:text-base mt-1">
              Plataforma de evaluación neuropsicológica
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-6 space-y-5">
            <Button
              onClick={handleLogin}
              disabled={isRedirecting}
              className={`${styles.primary} w-full h-11 sm:h-12 text-sm sm:text-base font-medium gap-2`}
            >
              <LogIn className="h-4 w-4" />
              {isRedirecting ? "Redirigiendo…" : "Autenticarse"}
            </Button>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-[#0E7C86] mt-0.5" />
              <p>Su sesión se gestionará mediante un proveedor seguro de identidad. Al continuar, acepta nuestra política de privacidad y el tratamiento seguro de datos.</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default LoginScreen
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { LogIn, Stethoscope, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthenticate } from "@/src/features/auth/hooks/useAuthenticate";

const styles = {
  backdrop: "min-h-screen grid place-items-center px-4",
  card: "bg-white/85 backdrop-blur border border-slate-200/70 shadow-xl rounded-2xl",
  primary:
    "bg-brand-600 hover:bg-slate-900 text-white focus-visible:outline-brand-600 data-[state=open]:bg-brand-600",
  outline:
    "border-slate-300 text-slate-800 hover:bg-slate-50 focus-visible:outline-brand-600",
};

export default function LoginScreen() {
  const { redirect } = useAuthenticate();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleLogin = () => {
    if (isRedirecting) return;
    setIsRedirecting(true);
    try {
      redirect();
    } catch {
      setIsRedirecting(false);
    }
  };

  return (
    <main className={styles.backdrop} role="main">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-sm sm:max-w-md"
      >
        <Card className={styles.card}>
          <CardHeader className="px-6 pt-6 pb-3 text-center">
            {/* Marca compacta */}
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <Stethoscope className="h-6 w-6" aria-hidden="true" />
              <span className="sr-only">neuroSuite</span>
            </div>

            <CardTitle className="text-slate-900 text-2xl sm:text-3xl font-semibold tracking-tight">
              NeuroSuite
            </CardTitle>
            <CardDescription className="text-slate-700 text-sm sm:text-base mt-1">
              Plataforma de evaluación neuropsicológica
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-6 space-y-5">
            <Button
              onClick={handleLogin}
              disabled={isRedirecting}
              aria-busy={isRedirecting}
              className={`${styles.primary} w-full h-11 sm:h-12 text-sm sm:text-base font-medium gap-2`}
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              {isRedirecting ? "Redirigiendo…" : "Acceder con identidad segura"}
            </Button>

            {/* Aviso legal resumido, con buen contraste */}
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-brand-600 mt-0.5" aria-hidden="true" />
              <p>
                La sesión se gestiona mediante un proveedor de identidad seguro.
                Al continuar, aceptas la política de privacidad y el tratamiento seguro de datos.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pie mínimo con enlaces legales */}
        <div className="mt-4 text-center text-xs text-slate-600">
          <a href="/legal/privacy" className="underline underline-offset-2 hover:text-slate-800">
            Privacidad
          </a>{" "}
          ·{" "}
          <a href="/legal/terms" className="underline underline-offset-2 hover:text-slate-800">
            Términos
          </a>
        </div>
      </motion.div>
    </main>
  );
}

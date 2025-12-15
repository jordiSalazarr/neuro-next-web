"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { ClipboardList, User2, Mail, LogOut, ShieldCheck, CalendarClock, Loader2 } from "lucide-react";

import { useApp } from "@/contexts/AppContext";
import type { Patient, TestSession } from "@/types";
import { useAuthStore } from "@/src/stores/auth";
import { useEvaluationStore } from "@/src/stores/evaluation";
import { useRegisterUser } from "@/src/features/auth/hooks/useRegisterUser";
import { useCreateEvaluation } from "@/src/features/evaluation/hooks/useCreateEvaluation";

// ================ Tokens UI ================
const styles = {
  shell: "min-h-[calc(100vh-56px)]",
  card: "bg-white/85 backdrop-blur border border-slate-200/70 shadow-xl rounded-2xl",
  primary: "bg-brand-600 hover:bg-slate-900 text-white",
  outline: "border-slate-300 text-slate-800 hover:bg-slate-50",
};

export default function PatientSelectionScreen() {
  const t = useTranslations('screens.patientSelection');
  const { register, loading, error } = useRegisterUser();
  const { create, createLoading, createError } = useCreateEvaluation();

  const { state, dispatch } = useApp();
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState<number | "">("");
  const [isFormValid, setIsFormValid] = useState(false);
  const didRegisterRef = useRef(false);

  const user = useAuthStore((s) => s.user);
  const setCurrentEvaluation = useEvaluationStore((s) => s.setCurrentEvaluation);
  const router = useRouter();

  // Registro silencioso del especialista
  useEffect(() => {
    if (!user?.email) return;
    if (didRegisterRef.current) return;
    didRegisterRef.current = true;
    (async () => {
      try {
        await register(user.name ?? "", user.email, user.roles ?? []);
      } catch {
        didRegisterRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  // Validación simple
  const validateForm = (name: string, ageVal: number | "") => {
    const age = typeof ageVal === "number" ? ageVal : Number(ageVal);
    const ok = name.trim().length > 1 && !Number.isNaN(age) && age >= 16 && age <= 120;
    setIsFormValid(ok);
  };

  const handleNameChange = (value: string) => {
    setPatientName(value);
    validateForm(value, patientAge);
  };

  const handleAgeChange = (value: string) => {
    const n = value === "" ? "" : Math.max(0, Math.min(120, Number(value)));
    setPatientAge(n as any);
    validateForm(patientName, n as number);
  };

  async function createNewEvaluation() {
    const name = patientName.trim();
    const age = typeof patientAge === "number" ? patientAge : Number(patientAge);
    const ev = await create(name, age);
    setCurrentEvaluation(ev || null);
    router.push("/test-runner");
  }

  const handleStartSession = async () => {
    if (!isFormValid || createLoading) return;
    try {
      const newPatient: Patient = {
        id: `patient-${Date.now()}`,
        name: patientName.trim(),
        age: Number(patientAge),
        gender: "M",
        education: 12,
      };

      const newSession: TestSession = {
        id: `session-${Date.now()}`,
        patientId: newPatient.id,
        startTime: new Date(),
        currentSubtest: 0,
        subtestResults: [],
        status: "in-progress",
      };

      dispatch({ type: "SELECT_PATIENT", payload: newPatient });
      dispatch({ type: "START_SESSION", payload: newSession });
      await createNewEvaluation();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleStartSession();
  };

  const handleLogout = () => {
    dispatch({ type: "LOGOUT" });
  };

  const hasAnyError = Boolean(error || createError);
  const anyErrorText = (error as string) || (createError as string) || "";

  const nameInvalid = patientName.trim().length > 0 && patientName.trim().length < 2;
  const ageInvalid =
    patientAge !== "" &&
    (Number.isNaN(Number(patientAge)) || Number(patientAge) < 16 || Number(patientAge) > 120);

  return (
    <main className={styles.shell}>
      <section className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        {/* Header compacto */}
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-slate-900 text-xl font-semibold leading-tight">{t('title')}</h1>
              <p className="text-[11px] text-slate-600">{t('subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:flex items-center gap-2">
              <User2 className="h-3.5 w-3.5" />
              {user?.name || t('specialist')}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className={styles.outline + " gap-2"}
              aria-label={t('logout')}
            >
              <LogOut className="h-4 w-4" /> {t('logout')}
            </Button>
          </div>
        </div>

        {/* Paso / Progreso contextual */}
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
          <Badge className="bg-brand-600 text-white">{t('step1')}</Badge>
          <span className="text-slate-700">{t('stepDesc')}</span>
          <Separator orientation="vertical" className="mx-2 h-4 bg-slate-200" />
          <div className="flex items-center gap-1 text-slate-700">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> 45–60 min
          </div>
        </div>

        {/* Contenido principal */}
        <div className="grid gap-6 md:grid-cols-1">

          {/* Tarjeta Paciente */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Card className={styles.card}>
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-900 text-base">{t('patientCardTitle')}</CardTitle>
                <CardDescription>{t('patientCardDesc')}</CardDescription>
              </CardHeader>

              <CardContent>
                <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Nombre */}
                    <div className="space-y-2">
                      <Label htmlFor="patient-name">{t('nameLabel')}</Label>
                      <Input
                        id="patient-name"
                        type="text"
                        placeholder={t('namePlaceholder')}
                        value={patientName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="h-11"
                        aria-required="true"
                        aria-invalid={nameInvalid}
                        aria-describedby={nameInvalid ? "name-error" : undefined}
                        autoComplete="name"
                        inputMode="text"
                      />
                      {nameInvalid && (
                        <p id="name-error" className="text-xs text-rose-700">
                          {t('nameError')}
                        </p>
                      )}
                    </div>

                    {/* Edad */}
                    <div className="space-y-2">
                      <Label htmlFor="patient-age">{t('ageLabel')}</Label>
                      <Input
                        id="patient-age"
                        type="number"
                        placeholder={t('agePlaceholder')}
                        value={patientAge}
                        onChange={(e) => handleAgeChange(e.target.value)}
                        min={16}
                        max={120}
                        className="h-11"
                        aria-required="true"
                        aria-invalid={ageInvalid}
                        aria-describedby={ageInvalid ? "age-error" : "age-hint"}
                        inputMode="numeric"
                        pattern="[0-9]*"
                      />
                      <p id="age-hint" className="text-xs text-slate-500">
                        {t('ageHint')}
                      </p>
                      {ageInvalid && (
                        <p id="age-error" className="text-xs text-rose-700">
                          {t('ageError')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Cumplimiento / seguridad */}
                  <Alert className="border-slate-200 bg-slate-50 text-slate-800">
                    <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
                    <AlertDescription className="text-xs">
                      {t('compliance')}
                    </AlertDescription>
                  </Alert>

                  {/* CTA */}
                  <div className="flex items-center justify-end gap-3">
                    <Button
                      type="submit"
                      onClick={handleStartSession}
                      disabled={!isFormValid || createLoading}
                      className={`${styles.primary} h-11 min-w-[200px]`}
                    >
                      {createLoading ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> {t('creatingBtn')}
                        </span>
                      ) : (
                        t('startBtn')
                      )}
                    </Button>
                  </div>

                  {hasAnyError && (
                    <div
                      role="alert"
                      className="rounded-md border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm"
                    >
                      {anyErrorText}
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Pie de confianza */}
        <div className="mt-8">
          <Card className={styles.card}>
            <CardContent className="p-4 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
                <p>{t('securityFooter')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

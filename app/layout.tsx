import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppProvider } from "@/contexts/AppContext";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "NeuroSuite — Evaluación neuropsicológica",
  description: "Plataforma clínica para tests neuropsicológicos y seguimiento.",
  icons: { icon: "/favicon.ico" },
  themeColor: "#0B6B8A",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full bg-gradient-to-b from-[#F7FBFF] to-white text-slate-900`}
      >
        {/* Fondo sutil tipo “medical” */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(80rem_40rem_at_50%_-10%,rgba(13,118,161,0.08),transparent_60%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 mix-blend-multiply opacity-20"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(8,53,84,0.06) 0 1px, transparent 1px 32px), repeating-linear-gradient(0deg, rgba(8,53,84,0.04) 0 1px, transparent 1px 32px)",
          }}
        />
        <NextIntlClientProvider messages={messages}>
          {/* Barra de marca muy minimal */}
          <header className="sticky top-0 z-20 backdrop-blur bg-white/60 border-b border-slate-200/60">
            <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-brand-600 text-white grid place-items-center shadow-sm">
                  {/* Logomarca minima (cruz+onda) */}
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M11 2h2v20h-2zM2 11h20v2H2z" fill="currentColor" />
                  </svg>
                </div>
                <span className="font-semibold tracking-tight text-slate-900">NeuroSuite</span>
              </div>
              <LanguageSwitcher />
            </div>
          </header>

          <AppProvider>{children}</AppProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

import { Suspense } from 'react';
import HomeScreen from '../../components/Home'

export const dynamic = "force-dynamic"; // evita SSG/Prerender del /home


const Page = () => {
  return (
       <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
          <div className="flex flex-col items-center">
            <svg className="mb-4 h-8 w-8 animate-spin text-blue-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
            </svg>
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Cargando…</p>
          </div>
        </div>
      }
    >
        <HomeScreen />

    </Suspense>
);
};

export default Page;

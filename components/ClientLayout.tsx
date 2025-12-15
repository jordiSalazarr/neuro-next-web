"use client";

import { SessionRestoration } from "@/components/SessionRestoration";
import { AppProvider } from "@/contexts/AppContext";

/**
 * ClientLayout Component
 * 
 * Client-side wrapper for providers and session management.
 * Separated from the server-side RootLayout to allow use of client hooks.
 */
export function ClientLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <SessionRestoration />
            <AppProvider>{children}</AppProvider>
        </>
    );
}

"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/src/stores/auth";

/**
 * SessionRestoration Component
 * 
 * Runs on app mount to:
 * - Check for valid authentication tokens in localStorage
 * - Validate token expiration
 * - Automatically clear expired sessions
 * - Restore user session if token is still valid
 * 
 * This ensures users remain logged in across page refreshes
 * and browser sessions (until token expires).
 */
export function SessionRestoration() {
    const isTokenExpired = useAuthStore((state) => state.isTokenExpired);
    const clearSession = useAuthStore((state) => state.clearSession);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

    useEffect(() => {
        // Check if token exists but is expired
        if (isTokenExpired()) {
            console.log("[SessionRestoration] Token expired, clearing session");
            clearSession();
        } else if (isLoggedIn()) {
            console.log("[SessionRestoration] Valid session found, restoring");
        }
    }, [isTokenExpired, clearSession, isLoggedIn]);

    // This component doesn't render anything
    return null;
}

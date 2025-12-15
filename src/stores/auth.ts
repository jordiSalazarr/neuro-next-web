'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { User, Tokens } from '../features/auth/api/dto'

type AuthState = {
  user: User | null
  tokens: Tokens | null
  expiresAt: number | null // Unix timestamp in milliseconds
  setSession: (user: User, tokens: Tokens, expiresIn?: number) => void
  clearSession: () => void
  isLoggedIn: () => boolean
  isTokenExpired: () => boolean
}

export const AUTH_STORE_NAME = 'auth-store' as const

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      expiresAt: null,
      setSession: (user, tokens, expiresIn = 3600) => {
        // Default to 1 hour (3600 seconds) if not specified
        const expiresAt = Date.now() + expiresIn * 1000
        set({ user, tokens, expiresAt })
      },
      clearSession: () => set({ user: null, tokens: null, expiresAt: null }),
      isLoggedIn: () => {
        const state = get()
        return !!state.tokens?.accessToken && !state.isTokenExpired()
      },
      isTokenExpired: () => {
        const expiresAt = get().expiresAt
        if (!expiresAt) return true
        return Date.now() >= expiresAt
      },
    }),
    {
      name: AUTH_STORE_NAME,
      storage: createJSONStorage(() => localStorage), // ✅ Changed from sessionStorage to localStorage
      // Automatically clear expired sessions on rehydration
      onRehydrateStorage: () => (state) => {
        if (state?.isTokenExpired()) {
          state.clearSession()
        }
      },
    }
  )
)

export const getAuthToken = () => useAuthStore.getState().tokens?.accessToken || null

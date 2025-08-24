'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, Tokens } from '@/types'

type AuthState = {
  user: User | null
  tokens: Tokens | null
  setSession: (user: User, tokens: Tokens) => void
  clearSession: () => void
  isLoggedIn: () => boolean
}

export const AUTH_STORE_NAME = 'auth-store' as const

// Persistimos SOLO el user (los tokens quedan en memoria)
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      setSession: (user, tokens) => set({ user, tokens }),
      clearSession: () => set({ user: null, tokens: null }),
      isLoggedIn: () => !!get().tokens?.accessToken,
    }),
    {
      name: AUTH_STORE_NAME,
      storage: createJSONStorage(() => sessionStorage),
      // importante: solo persistimos el user
      // partialize: (state) => ({ user: state.user }),
    }
  )
)

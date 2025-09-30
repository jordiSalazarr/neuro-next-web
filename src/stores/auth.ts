'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { User,Tokens } from '../features/auth/api/dto'


type AuthState = {
  user: User | null
  tokens: Tokens | null
  setSession: (user: User, tokens: Tokens) => void
  clearSession: () => void
  isLoggedIn: () => boolean
}

export const AUTH_STORE_NAME = 'auth-store' as const

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
    }
  )
)

export const getAuthToken = () => useAuthStore.getState().tokens?.accessToken || null

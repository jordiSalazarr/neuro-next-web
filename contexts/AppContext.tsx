"use client"

import React from "react"
import { createContext, useContext, useReducer, type ReactNode } from "react"
import type { Patient, TestSession, SubtestResult, AppScreen } from "@/types"

interface CognitoUser {
  userId: string
  username: string
  email?: string
  name?: string
  phone?: string
}

interface AppState {
  currentScreen: AppScreen
  currentUser: CognitoUser | null
  isLoading: boolean
  selectedPatient: Patient | null
  currentSession: TestSession | null
  patients: Patient[]
}

type AppAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "LOGIN"; payload: CognitoUser }
  | { type: "LOGOUT" }
  | { type: "SET_SCREEN"; payload: AppScreen }
  | { type: "SELECT_PATIENT"; payload: Patient }
  | { type: "START_SESSION"; payload: TestSession }
  | { type: "UPDATE_SESSION"; payload: Partial<TestSession> }
  | { type: "COMPLETE_SUBTEST"; payload: SubtestResult }
  | { type: "COMPLETE_SESSION" }

const initialState: AppState = {
  currentScreen: "login",
  currentUser: null,
  isLoading: false,
  selectedPatient: null,
  currentSession: null,
  patients: [],
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload }
    case "LOGIN":
      return { ...state, currentUser: action.payload, currentScreen: "patient-selection", isLoading: false }
    case "LOGOUT":
      return { ...initialState, isLoading: false }
    case "SET_SCREEN":
      return { ...state, currentScreen: action.payload }
    case "SELECT_PATIENT":
      return { ...state, selectedPatient: action.payload }
    case "START_SESSION":
      return { ...state, currentSession: action.payload, currentScreen: "test-runner" }
    case "UPDATE_SESSION":
      return {
        ...state,
        currentSession: state.currentSession ? { ...state.currentSession, ...action.payload } : null,
      }
    case "COMPLETE_SUBTEST":
      return {
        ...state,
        currentSession: state.currentSession
          ? {
              ...state.currentSession,
              subtestResults: [...state.currentSession.subtestResults, action.payload],
              currentSubtest: state.currentSession.currentSubtest + 1,
            }
          : null,
      }
    case "COMPLETE_SESSION":
      return {
        ...state,
        currentSession: state.currentSession ? { ...state.currentSession, status: "completed" } : null,
        currentScreen: "results",
      }
    default:
      return state
  }
}

const AppContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<AppAction>
  handleSignOut: () => void
} | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  React.useEffect(() => {
    // Check for auth code in URL params (callback from Cognito)
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get("code")

    if (code) {
      // Handle the auth code - in a real app you'd exchange this for tokens
      // For now, we'll simulate a successful login
      const cognitoUser: CognitoUser = {
        userId: "user-123",
        username: "test-user",
        email: "user@example.com",
        name: "Test User",
        phone: "+1234567890",
      }
      dispatch({ type: "LOGIN", payload: cognitoUser })

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const handleSignOut = () => {
    dispatch({ type: "LOGOUT" })
  }

  return <AppContext.Provider value={{ state, dispatch, handleSignOut }}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return context
}

"use client"

import { AppProvider, useApp } from "@/contexts/AppContext"
import { LoginScreen } from "@/components/LoginScreen"
import PatientSelectionScreen  from "@/components/PatientSelectionScreen"
import  TestRunner  from "@/components/TestRunner"
import { ResultsScreen } from "@/components/ResultsScreen"
import HomeScreen from "@/components/Home"

function AppContent() {
  const { state } = useApp()

  switch (state.currentScreen) {
    case "login":
      return <LoginScreen />
    case "home":
      return <HomeScreen />
    case "patient-selection":
      return <PatientSelectionScreen />
    case "test-runner":
      return <TestRunner />
    case "results":
      return <ResultsScreen />
    default:
      return <LoginScreen />
  }
}

export default function HomePage() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

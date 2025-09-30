import type React from "react"
export interface Patient {
  id: string
  name: string
  age: number
  gender: "M" | "F"
  education: number
}

export type CurrentEvaluation = {
  id: string,
  createdAt: Date,
currentStatus:String
patientAge:Number,
patientName:String
specialistId:string
specialistMail:String

}

export interface TestSession {
  id: string
  patientId: string
  startTime: Date
  currentSubtest: number
  subtestResults: SubtestResult[]
  status: "not-started" | "in-progress" | "completed"
}

export interface SubtestResult {
  subtestId: string
  name: string
  startTime: Date
  endTime?: Date
  score: number
  errors: number
  timeSpent: number
  rawData: any
}

export interface SubtestConfig {
  id: string
  name: string
  description: string
  duration?: number // en segundos, null si no tiene límite
  component: React.ComponentType<SubtestProps>
}

export interface SubtestProps {
  onComplete: (result: Omit<SubtestResult, "subtestId" | "name">) => void
  onPause: () => void
}

export type AppScreen = "login" | "patient-selection" | "test-runner" | "results" |"home"

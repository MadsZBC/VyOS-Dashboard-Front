"use client"

import React, { createContext, useContext, useState, useCallback } from "react"

export interface DebugInfo {
  id: string
  type: "request" | "response" | "error"
  timestamp: string
  url?: string
  method?: string
  status?: number
  message?: string
  payload?: any
  headers?: Record<string, string>
  duration?: number
}

interface DebugStoreContextType {
  logs: DebugInfo[]
  isRecording: boolean
  addLog: (log: Omit<DebugInfo, "id" | "timestamp">) => void
  clearLogs: () => void
  toggleRecording: () => void
}

const DebugStoreContext = createContext<DebugStoreContextType | undefined>(undefined)

export function DebugStoreProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [logs, setLogs] = useState<DebugInfo[]>([])
  const [isRecording, setIsRecording] = useState(true)

  const addLog = useCallback((log: Omit<DebugInfo, "id" | "timestamp">) => {
    if (!isRecording) return

    const newLog: DebugInfo = {
      ...log,
      id: Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString(),
    }

    setLogs((prevLogs) => [newLog, ...prevLogs])
  }, [isRecording])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  const toggleRecording = useCallback(() => {
    setIsRecording((prev) => !prev)
  }, [])

  return (
    <DebugStoreContext.Provider
      value={{
        logs,
        isRecording,
        addLog,
        clearLogs,
        toggleRecording,
      }}
    >
      {children}
    </DebugStoreContext.Provider>
  )
}

export function useDebugStore() {
  const context = useContext(DebugStoreContext)
  if (context === undefined) {
    throw new Error("useDebugStore must be used within a DebugStoreProvider")
  }
  return context
} 
import { useState, useCallback, useRef } from "react"

export interface Toast {
  id: number
  message: string
  severity: "info" | "success" | "warning" | "error"
  timestamp: number
}

let nextId = 1

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [history, setHistory] = useState<Toast[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismissToast = useCallback((id: number) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (message: string, severity: Toast["severity"] = "info") => {
      const id = nextId++
      const toast: Toast = { id, message, severity, timestamp: Date.now() }

      setToasts((prev) => [...prev.slice(-2), toast]) // keep max 3 visible
      setHistory((prev) => [...prev.slice(-19), toast]) // keep max 20 in history

      // Auto-dismiss based on severity
      const timeout =
        severity === "error" ? 0 : severity === "warning" ? 5000 : 3000

      if (timeout > 0) {
        const timer = setTimeout(() => {
          timersRef.current.delete(id)
          setToasts((prev) => prev.filter((t) => t.id !== id))
        }, timeout)
        timersRef.current.set(id, timer)
      }

      return id
    },
    []
  )

  const clearToasts = useCallback(() => {
    for (const timer of timersRef.current.values()) {
      clearTimeout(timer)
    }
    timersRef.current.clear()
    setToasts([])
  }, [])

  const toggleHistory = useCallback(() => {
    setShowHistory((prev) => !prev)
  }, [])

  return {
    toasts,
    history,
    showHistory,
    addToast,
    dismissToast,
    clearToasts,
    toggleHistory,
  }
}

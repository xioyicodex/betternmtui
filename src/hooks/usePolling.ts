import { useEffect, useRef } from "react"

/**
 * Calls `callback` on a repeating interval.
 * Pauses when `enabled` is false. Cleans up on unmount.
 */
export function usePolling(
  callback: () => void,
  intervalMs: number,
  enabled: boolean
) {
  const savedCallback = useRef(callback)

  // Keep callback ref current without re-setting the interval
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return

    const id = setInterval(() => {
      savedCallback.current()
    }, intervalMs)

    return () => clearInterval(id)
  }, [intervalMs, enabled])
}

import { useState, useEffect } from "react"
import { getHostname, getGeneralStatus } from "../hooks/useNmcli.ts"

const THEME = {
  bg: "#1a1b26",
  accent: "#7aa2f7",
  green: "#9ece6a",
  text: "#a9b1d6",
  dim: "#565f89",
}

export function Header() {
  const [hostname, setHostname] = useState("")
  const [time, setTime] = useState(new Date())
  const [status, setStatus] = useState<{ key: string; value: string }[]>([])

  useEffect(() => {
    getHostname().then(setHostname)
    getGeneralStatus().then(setStatus)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const connectivity =
    status.find(
      (s) =>
        s.key.toLowerCase().includes("connect") &&
        !s.key.toLowerCase().includes("wifi")
    )?.value ?? "unknown"
  const wifiHw =
    status.find((s) => s.key.toLowerCase().includes("wifi"))?.value ?? ""

  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      height={3}
      paddingX={1}
      backgroundColor={THEME.bg}
      border
      borderStyle="rounded"
      borderColor={THEME.accent}
    >
      <box flexDirection="row" gap={1} alignItems="center">
        <text>
          <span fg={THEME.accent}>
            <strong>betternmtui</strong>
          </span>
        </text>
        <text fg={THEME.dim}>|</text>
        <text fg={THEME.text}>{hostname}</text>
      </box>
      <box flexDirection="row" gap={2} alignItems="center">
        <text>
          <span fg={THEME.dim}>NET: </span>
          <span
            fg={
              connectivity.toLowerCase() === "full" ? THEME.green : "#f7768e"
            }
          >
            {connectivity}
          </span>
        </text>
        {wifiHw ? (
          <text>
            <span fg={THEME.dim}>WIFI: </span>
            <span
              fg={
                wifiHw.toLowerCase() === "enabled" ? THEME.green : "#f7768e"
              }
            >
              {wifiHw}
            </span>
          </text>
        ) : null}
        <text fg={THEME.dim}>{time.toLocaleTimeString()}</text>
      </box>
    </box>
  )
}

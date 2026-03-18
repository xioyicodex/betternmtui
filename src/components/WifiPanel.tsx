import type { WifiNetwork } from "../hooks/useNmcli.ts"

const THEME = {
  bg: "#1a1b26",
  panelBg: "#1f2335",
  accent: "#7aa2f7",
  green: "#9ece6a",
  red: "#f7768e",
  yellow: "#e0af68",
  magenta: "#bb9af7",
  cyan: "#7dcfff",
  text: "#a9b1d6",
  dim: "#565f89",
  dimRed: "#914c54",
  selection: "#292e42",
  blue: "#7aa2f7",
}

export type StatusSeverity = "info" | "success" | "warning" | "error"

interface WifiPanelProps {
  networks: WifiNetwork[]
  loading: boolean
  scanning: boolean
  selectedIndex: number
  statusMessage: string
  statusSeverity?: StatusSeverity
  filterText?: string
}

function signalColor(signal: number): string {
  if (signal >= 75) return THEME.green
  if (signal >= 50) return THEME.yellow
  if (signal >= 25) return THEME.red
  return THEME.dimRed
}

function signalBar(signal: number): string {
  // 4-level Unicode block bar: ▂▄▆█
  const levels = ["▂", "▄", "▆", "█"]
  const filled = Math.ceil((signal / 100) * 4)
  let bar = ""
  for (let i = 0; i < 4; i++) {
    bar += i < filled ? levels[i] : " "
  }
  return bar
}

function securityBadge(sec: string): { label: string; color: string } {
  if (!sec || sec === "--" || sec.toLowerCase() === "open" || sec === "") {
    return { label: "OPEN", color: THEME.green }
  }
  if (sec.includes("WPA3")) return { label: "WPA3", color: THEME.blue }
  if (sec.includes("802.1X") || sec.toLowerCase().includes("enterprise")) {
    return { label: "WPA-E", color: THEME.magenta }
  }
  if (sec.includes("WPA2")) return { label: "WPA2", color: THEME.yellow }
  if (sec.includes("WPA")) return { label: "WPA", color: THEME.yellow }
  if (sec.includes("WEP")) return { label: "WEP", color: THEME.red }
  return { label: sec.substring(0, 5), color: THEME.dim }
}

function isSecured(sec: string): boolean {
  return !(!sec || sec === "--" || sec.toLowerCase() === "open" || sec === "")
}

function statusColor(severity: StatusSeverity): string {
  switch (severity) {
    case "success": return THEME.green
    case "warning": return THEME.yellow
    case "error": return THEME.red
    default: return THEME.cyan
  }
}

function highlightMatch(text: string, filter: string, maxLen: number, baseColor: string): JSX.Element {
  const display = text.length > maxLen ? text.substring(0, maxLen - 1) + "~" : text
  if (!filter) return <span fg={baseColor}>{display}</span>
  const lower = display.toLowerCase()
  const idx = lower.indexOf(filter.toLowerCase())
  if (idx === -1) return <span fg={baseColor}>{display}</span>
  const before = display.substring(0, idx)
  const match = display.substring(idx, idx + filter.length)
  const after = display.substring(idx + filter.length)
  return (
    <>
      <span fg={baseColor}>{before}</span>
      <span fg="#1a1b26" bg={THEME.yellow}>{match}</span>
      <span fg={baseColor}>{after}</span>
    </>
  )
}

export function WifiPanel({
  networks,
  loading,
  scanning,
  selectedIndex,
  statusMessage,
  statusSeverity = "info",
  filterText,
}: WifiPanelProps) {
  if (loading) {
    return (
      <box
        flexGrow={1}
        border
        borderStyle="rounded"
        borderColor={THEME.cyan}
        title="Wi-Fi Networks"
        titleAlignment="left"
        backgroundColor={THEME.panelBg}
        padding={1}
      >
        <text fg={THEME.dim}>
          {scanning ? "Scanning for networks..." : "Loading networks..."}
        </text>
      </box>
    )
  }

  return (
    <box
      flexGrow={1}
      flexDirection="column"
      border
      borderStyle="rounded"
      borderColor={THEME.cyan}
      title={scanning ? "Wi-Fi Networks (scanning...)" : "Wi-Fi Networks"}
      titleAlignment="left"
      backgroundColor={THEME.panelBg}
    >
      {/* Column headers */}
      <box flexDirection="row" paddingX={1} height={1}>
        <text width={3} fg={THEME.dim}>
          {" "}
        </text>
        <text width={3} fg={THEME.dim}>
          {" "}
        </text>
        <text width={26} fg={THEME.dim}>
          <strong>SSID</strong>
        </text>
        <text width={14} fg={THEME.dim}>
          <strong>SIGNAL ▼</strong>
        </text>
        <text width={6} fg={THEME.dim}>
          <strong>CH</strong>
        </text>
        <text width={14} fg={THEME.dim}>
          <strong>RATE</strong>
        </text>
        <text fg={THEME.dim}>
          <strong>SECURITY</strong>
        </text>
      </box>

      {/* Network list */}
      <box flexGrow={1} flexDirection="column" overflow="hidden">
        {networks.map((net, i) => {
          const isSelected = i === selectedIndex
          const bgColor = isSelected ? THEME.selection : THEME.panelBg
          const badge = securityBadge(net.security)
          const locked = isSecured(net.security)
          const sigColor = signalColor(net.signal)

          return (
            <box
              key={`${net.bssid}-${i}`}
              flexDirection="row"
              paddingX={1}
              height={1}
              backgroundColor={bgColor}
            >
              <text width={3} fg={isSelected ? THEME.cyan : THEME.dim}>
                {isSelected ? ">" : " "}
              </text>
              <text width={3} fg={net.inUse ? THEME.green : THEME.dim}>
                {net.inUse ? "✓" : locked ? "*" : " "}
              </text>
              <text width={26}>
                {filterText
                  ? highlightMatch(
                      net.ssid || "<hidden>",
                      filterText,
                      24,
                      net.inUse ? THEME.green : isSelected ? THEME.cyan : THEME.text
                    )
                  : <span fg={net.inUse ? THEME.green : isSelected ? THEME.cyan : THEME.text}>
                      {(net.ssid || "<hidden>").length > 24
                        ? (net.ssid || "<hidden>").substring(0, 23) + "~"
                        : net.ssid || "<hidden>"}
                    </span>
                }
              </text>
              <text width={14} fg={sigColor}>
                {signalBar(net.signal)} {String(net.signal).padStart(3)}%
              </text>
              <text width={6} fg={THEME.magenta}>
                {net.channel}
              </text>
              <text width={14} fg={THEME.dim}>
                {net.rate}
              </text>
              <text fg={badge.color}>
                {badge.label}
              </text>
            </box>
          )
        })}
        {networks.length === 0 ? (
          <box padding={1}>
            <text fg={THEME.dim}>
              No networks found. Press 's' to scan.
            </text>
          </box>
        ) : null}
      </box>

      {/* Status bar */}
      {statusMessage ? (
        <box paddingX={1} height={1} backgroundColor={THEME.bg}>
          <text fg={statusColor(statusSeverity)}>{statusMessage}</text>
        </box>
      ) : null}
    </box>
  )
}

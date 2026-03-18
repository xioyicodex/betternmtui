import type { Connection } from "../hooks/useNmcli.ts"
import type { StatusSeverity } from "./WifiPanel.tsx"

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
  selection: "#292e42",
}

interface ConnectionsPanelProps {
  connections: Connection[]
  loading: boolean
  selectedIndex: number
  statusMessage: string
  statusSeverity?: StatusSeverity
  filterText?: string
}

function statusColor(severity: StatusSeverity): string {
  switch (severity) {
    case "success": return THEME.green
    case "warning": return THEME.yellow
    case "error": return THEME.red
    default: return THEME.cyan
  }
}

function typeIcon(type: string): string {
  if (type.includes("ethernet") || type.includes("802-3")) return "ETH"
  if (type.includes("wifi") || type.includes("802-11")) return "WFI"
  if (type.includes("vpn")) return "VPN"
  if (type.includes("bridge")) return "BRG"
  if (type.includes("loopback")) return "LBK"
  if (type.includes("wireguard")) return "WGD"
  return type.substring(0, 3).toUpperCase()
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

export function ConnectionsPanel({
  connections,
  loading,
  selectedIndex,
  statusMessage,
  statusSeverity = "info",
  filterText,
}: ConnectionsPanelProps) {
  if (loading) {
    return (
      <box
        flexGrow={1}
        border
        borderStyle="rounded"
        borderColor={THEME.accent}
        title="Connections"
        titleAlignment="left"
        backgroundColor={THEME.panelBg}
        padding={1}
      >
        <text fg={THEME.dim}>Loading connections...</text>
      </box>
    )
  }

  return (
    <box
      flexGrow={1}
      flexDirection="column"
      border
      borderStyle="rounded"
      borderColor={THEME.accent}
      title="Connections"
      titleAlignment="left"
      backgroundColor={THEME.panelBg}
    >
      {/* Column headers */}
      <box flexDirection="row" paddingX={1} height={1}>
        <text width={3} fg={THEME.dim}>
          {" "}
        </text>
        <text width={28} fg={THEME.dim}>
          <strong>NAME</strong>
        </text>
        <text width={8} fg={THEME.dim}>
          <strong>TYPE</strong>
        </text>
        <text width={14} fg={THEME.dim}>
          <strong>DEVICE</strong>
        </text>
        <text fg={THEME.dim}>
          <strong>STATUS</strong>
        </text>
      </box>

      {/* Connection list */}
      <box flexGrow={1} flexDirection="column" overflow="hidden">
        {connections.map((conn, i) => {
          const isSelected = i === selectedIndex
          const bgColor = isSelected ? THEME.selection : THEME.panelBg

          return (
            <box
              key={conn.uuid}
              flexDirection="row"
              paddingX={1}
              height={1}
              backgroundColor={bgColor}
            >
              <text width={3} fg={isSelected ? THEME.accent : THEME.dim}>
                {isSelected ? ">" : " "}
              </text>
              <text width={28}>
                {filterText
                  ? highlightMatch(conn.name, filterText, 26, isSelected ? THEME.accent : THEME.text)
                  : <span fg={isSelected ? THEME.accent : THEME.text}>{conn.name.length > 26 ? conn.name.substring(0, 25) + "~" : conn.name}</span>
                }
              </text>
              <text width={8} fg={THEME.magenta}>
                {typeIcon(conn.type)}
              </text>
              <text width={14} fg={THEME.yellow}>
                {conn.device || "--"}
              </text>
              <text fg={conn.active ? THEME.green : THEME.dim}>
                {conn.active ? "ACTIVE" : "inactive"}
              </text>
            </box>
          )
        })}
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

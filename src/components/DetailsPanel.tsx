import type { ConnectionDetails } from "../hooks/useNmcli.ts"

const THEME = {
  bg: "#1a1b26",
  panelBg: "#1f2335",
  accent: "#7aa2f7",
  green: "#9ece6a",
  yellow: "#e0af68",
  magenta: "#bb9af7",
  cyan: "#7dcfff",
  text: "#a9b1d6",
  dim: "#565f89",
}

interface DetailsPanelProps {
  title: string
  details: ConnectionDetails[]
  loading: boolean
  keyWidth?: number
}

function keyColor(key: string): string {
  if (key.startsWith("IP4") || key.startsWith("IP6")) return THEME.cyan
  if (key.startsWith("GENERAL")) return THEME.green
  if (key.startsWith("WIRED") || key.startsWith("WIFI")) return THEME.magenta
  return THEME.accent
}

export function DetailsPanel({ title, details, loading, keyWidth = 34 }: DetailsPanelProps) {
  if (loading) {
    return (
      <box
        flexGrow={1}
        border
        borderStyle="rounded"
        borderColor={THEME.green}
        title={title}
        titleAlignment="left"
        backgroundColor={THEME.panelBg}
        padding={1}
      >
        <text fg={THEME.dim}>Loading details...</text>
      </box>
    )
  }

  // Group details by prefix
  const groups: Map<string, ConnectionDetails[]> = new Map()
  for (const detail of details) {
    const prefix = detail.key.split(".")[0] ?? "OTHER"
    const existing = groups.get(prefix) ?? []
    existing.push(detail)
    groups.set(prefix, existing)
  }

  return (
    <box
      flexGrow={1}
      flexDirection="column"
      border
      borderStyle="rounded"
      borderColor={THEME.green}
      title={title}
      titleAlignment="left"
      backgroundColor={THEME.panelBg}
      overflow="hidden"
    >
      <box flexDirection="column" paddingX={1} paddingY={0}>
        {details.length === 0 ? (
          <text fg={THEME.dim}>
            Select a connection or device to view details
          </text>
        ) : null}
        {details.map((detail, i) => (
          <box key={`${detail.key}-${i}`} flexDirection="row" height={1}>
            <text width={keyWidth} fg={keyColor(detail.key)}>
              {detail.key.length > keyWidth - 2
                ? detail.key.substring(0, keyWidth - 3) + "~"
                : detail.key}
            </text>
            <text fg={THEME.text}>
              {detail.value.length > 44
                ? detail.value.substring(0, 43) + "~"
                : detail.value}
            </text>
          </box>
        ))}
      </box>
    </box>
  )
}

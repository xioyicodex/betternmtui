import type { Device } from "../hooks/useNmcli.ts"

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

interface DevicesPanelProps {
  devices: Device[]
  loading: boolean
  selectedIndex: number
  filterText?: string
}

function stateColor(state: string): string {
  const s = state.toLowerCase()
  if (s.includes("connected") && !s.includes("dis")) return THEME.green
  if (s.includes("disconnected")) return THEME.red
  if (s.includes("unavailable") || s.includes("unmanaged")) return THEME.dim
  if (s.includes("connecting")) return THEME.yellow
  return THEME.text
}

function typeIcon(type: string): string {
  if (type === "wifi") return "  "
  if (type === "ethernet") return "  "
  if (type === "loopback") return "  "
  if (type === "bridge") return "  "
  if (type.includes("wireguard")) return "  "
  return "  "
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

export function DevicesPanel({
  devices,
  loading,
  selectedIndex,
  filterText,
}: DevicesPanelProps) {
  if (loading) {
    return (
      <box
        flexGrow={1}
        border
        borderStyle="rounded"
        borderColor={THEME.magenta}
        title="Devices"
        titleAlignment="left"
        backgroundColor={THEME.panelBg}
        padding={1}
      >
        <text fg={THEME.dim}>Loading devices...</text>
      </box>
    )
  }

  return (
    <box
      flexGrow={1}
      flexDirection="column"
      border
      borderStyle="rounded"
      borderColor={THEME.magenta}
      title="Devices"
      titleAlignment="left"
      backgroundColor={THEME.panelBg}
    >
      {/* Column headers */}
      <box flexDirection="row" paddingX={1} height={1}>
        <text width={3} fg={THEME.dim}>
          {" "}
        </text>
        <text width={18} fg={THEME.dim}>
          <strong>DEVICE</strong>
        </text>
        <text width={14} fg={THEME.dim}>
          <strong>TYPE</strong>
        </text>
        <text width={24} fg={THEME.dim}>
          <strong>STATE</strong>
        </text>
        <text fg={THEME.dim}>
          <strong>CONNECTION</strong>
        </text>
      </box>

      {/* Device list */}
      <box flexGrow={1} flexDirection="column" overflow="hidden">
        {devices.map((dev, i) => {
          const isSelected = i === selectedIndex
          const bgColor = isSelected ? THEME.selection : THEME.panelBg

          return (
            <box
              key={dev.device}
              flexDirection="row"
              paddingX={1}
              height={1}
              backgroundColor={bgColor}
            >
              <text width={3} fg={isSelected ? THEME.magenta : THEME.dim}>
                {isSelected ? ">" : " "}
              </text>
              <text width={18}>
                {filterText
                  ? <>
                      <span fg={isSelected ? THEME.magenta : THEME.text}>{typeIcon(dev.type)}</span>
                      {highlightMatch(dev.device, filterText, 16, isSelected ? THEME.magenta : THEME.text)}
                    </>
                  : <span fg={isSelected ? THEME.magenta : THEME.text}>{typeIcon(dev.type)}{dev.device}</span>
                }
              </text>
              <text width={14} fg={THEME.cyan}>{dev.type}</text>
              <text width={24} fg={stateColor(dev.state)}>
                {dev.state}
              </text>
              <text>
                {filterText
                  ? highlightMatch(dev.connection || "--", filterText, 30, THEME.yellow)
                  : <span fg={THEME.yellow}>{dev.connection || "--"}</span>
                }
              </text>
            </box>
          )
        })}
      </box>
    </box>
  )
}

import type { Toast } from "../hooks/useToasts.ts"

const THEME = {
  bg: "#1a1b26",
  panelBg: "#1f2335",
  accent: "#7aa2f7",
  green: "#9ece6a",
  red: "#f7768e",
  yellow: "#e0af68",
  cyan: "#7dcfff",
  text: "#a9b1d6",
  dim: "#565f89",
}

function severityColor(severity: Toast["severity"]): string {
  switch (severity) {
    case "success":
      return THEME.green
    case "warning":
      return THEME.yellow
    case "error":
      return THEME.red
    default:
      return THEME.cyan
  }
}

function severityIcon(severity: Toast["severity"]): string {
  switch (severity) {
    case "success":
      return "✓"
    case "warning":
      return "!"
    case "error":
      return "✗"
    default:
      return "i"
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
}

interface NotificationLogProps {
  history: Toast[]
}

export function NotificationLog({ history }: NotificationLogProps) {
  return (
    <box
      flexGrow={1}
      flexDirection="column"
      border
      borderStyle="rounded"
      borderColor={THEME.accent}
      title=" Notifications "
      titleAlignment="left"
      backgroundColor={THEME.panelBg}
    >
      <box paddingX={1} height={1}>
        <text fg={THEME.dim}>
          Press <span fg={THEME.accent}>n</span> or <span fg={THEME.accent}>Esc</span> to close
        </text>
      </box>

      <box flexGrow={1} flexDirection="column" overflow="hidden" paddingX={1}>
        {history.length === 0 ? (
          <text fg={THEME.dim}>No notifications yet.</text>
        ) : (
          [...history].reverse().map((toast) => {
            const color = severityColor(toast.severity)
            const icon = severityIcon(toast.severity)
            return (
              <box key={toast.id} height={1} flexDirection="row">
                <text fg={THEME.dim} width={10}>
                  {formatTime(toast.timestamp)}
                </text>
                <text fg={color} width={3}>
                  {icon}
                </text>
                <text fg={THEME.text}>{toast.message}</text>
              </box>
            )
          })
        )}
      </box>
    </box>
  )
}

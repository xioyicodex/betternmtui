import type { Toast } from "../hooks/useToasts.ts"

const THEME = {
  bg: "#1a1b26",
  panelBg: "#1f2335",
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

interface ToastOverlayProps {
  toasts: Toast[]
}

export function ToastOverlay({ toasts }: ToastOverlayProps) {
  if (toasts.length === 0) return null

  return (
    <box
      position="absolute"
      right={1}
      bottom={2}
      flexDirection="column"
      gap={0}
      width={50}
    >
      {toasts.map((toast) => {
        const color = severityColor(toast.severity)
        const icon = severityIcon(toast.severity)
        return (
          <box
            key={toast.id}
            height={1}
            flexDirection="row"
            backgroundColor={THEME.panelBg}
          >
            <text fg={color}>{icon} </text>
            <text fg={THEME.text}>
              {toast.message.length > 45
                ? toast.message.substring(0, 44) + "~"
                : toast.message}
            </text>
          </box>
        )
      })}
    </box>
  )
}

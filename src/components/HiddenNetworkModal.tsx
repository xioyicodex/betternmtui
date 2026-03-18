import { Modal, MODAL_THEME } from "./Modal.tsx"

const SECURITY_OPTIONS = ["None", "WPA-PSK", "WPA-Enterprise"]

export interface HiddenNetworkState {
  ssid: string
  securityIndex: number
  password: string
  field: "ssid" | "security" | "password"
}

interface HiddenNetworkModalProps extends HiddenNetworkState {}

export function HiddenNetworkModal({
  ssid,
  securityIndex,
  password,
  field,
}: HiddenNetworkModalProps) {
  const securityLabel = SECURITY_OPTIONS[securityIndex] ?? "None"
  const needsPassword = securityIndex > 0
  const maskedPassword = "•".repeat(password.length)

  return (
    <Modal title=" Connect to Hidden Network " titleColor={MODAL_THEME.magenta} width={50}>
      <box flexDirection="column" gap={1}>
        {/* SSID field */}
        <box flexDirection="column">
          <text fg={MODAL_THEME.dim} height={1}>SSID:</text>
          <box
            height={1}
            border
            borderStyle="rounded"
            borderColor={field === "ssid" ? MODAL_THEME.accent : MODAL_THEME.dim}
            paddingX={1}
          >
            <text fg={MODAL_THEME.text}>
              {ssid ? ssid + (field === "ssid" ? "█" : "") : ""}
              {!ssid && field === "ssid" ? (
                <span fg={MODAL_THEME.dim}>Enter SSID...█</span>
              ) : null}
              {!ssid && field !== "ssid" ? (
                <span fg={MODAL_THEME.dim}>Enter SSID...</span>
              ) : null}
            </text>
          </box>
        </box>

        {/* Security selector */}
        <box flexDirection="column">
          <text fg={MODAL_THEME.dim} height={1}>Security:</text>
          <box
            height={1}
            border
            borderStyle="rounded"
            borderColor={field === "security" ? MODAL_THEME.accent : MODAL_THEME.dim}
            paddingX={1}
          >
            <text fg={field === "security" ? MODAL_THEME.accent : MODAL_THEME.text}>
              {"◄ " + securityLabel + " ►"}
            </text>
          </box>
        </box>

        {/* Password field (only if security requires it) */}
        {needsPassword ? (
          <box flexDirection="column">
            <text fg={MODAL_THEME.dim} height={1}>Password:</text>
            <box
              height={1}
              border
              borderStyle="rounded"
              borderColor={field === "password" ? MODAL_THEME.accent : MODAL_THEME.dim}
              paddingX={1}
            >
              <text fg={MODAL_THEME.text}>
                {maskedPassword
                  ? maskedPassword + (field === "password" ? "█" : "")
                  : ""}
                {!maskedPassword && field === "password" ? (
                  <span fg={MODAL_THEME.dim}>Type password...█</span>
                ) : null}
                {!maskedPassword && field !== "password" ? (
                  <span fg={MODAL_THEME.dim}>Type password...</span>
                ) : null}
              </text>
            </box>
          </box>
        ) : null}

        {/* Footer */}
        <box flexDirection="row" height={1} gap={2}>
          <text>
            <span fg={MODAL_THEME.accent}><strong>Tab</strong></span>
            <span fg={MODAL_THEME.dim}> Next field</span>
          </text>
          <text>
            <span fg={MODAL_THEME.accent}><strong>Enter</strong></span>
            <span fg={MODAL_THEME.dim}> Connect</span>
          </text>
          <text>
            <span fg={MODAL_THEME.accent}><strong>Esc</strong></span>
            <span fg={MODAL_THEME.dim}> Cancel</span>
          </text>
        </box>
      </box>
    </Modal>
  )
}

export { SECURITY_OPTIONS }

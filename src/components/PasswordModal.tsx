import { Modal, MODAL_THEME } from "./Modal.tsx"

interface PasswordModalProps {
  ssid: string
  security: string
  password: string
}

export function PasswordModal({ ssid, security, password }: PasswordModalProps) {
  const masked = "•".repeat(password.length)

  return (
    <Modal title={` Connect to ${ssid} `} titleColor={MODAL_THEME.cyan} width={50}>
      <box flexDirection="column" gap={1}>
        {/* Security type */}
        <box flexDirection="row" height={1}>
          <text fg={MODAL_THEME.dim}>Security: </text>
          <text fg={MODAL_THEME.yellow}>{security}</text>
        </box>

        {/* Password field */}
        <box flexDirection="column">
          <text fg={MODAL_THEME.dim} height={1}>Password:</text>
          <box
            height={1}
            border
            borderStyle="rounded"
            borderColor={MODAL_THEME.accent}
            paddingX={1}
          >
            <text fg={MODAL_THEME.text}>
              {masked ? masked + "█" : ""}
              {!masked ? (
                <span fg={MODAL_THEME.dim}>Type password...█</span>
              ) : null}
            </text>
          </box>
        </box>

        {/* Footer */}
        <box flexDirection="row" height={1} gap={2}>
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

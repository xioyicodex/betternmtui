import { Modal, MODAL_THEME } from "./Modal.tsx"

interface ConfirmModalProps {
  title: string
  message: string
  confirmKey?: string
  confirmLabel?: string
  cancelLabel?: string
}

export function ConfirmModal({
  title,
  message,
  confirmKey = "y",
  confirmLabel = "Yes",
  cancelLabel = "Cancel",
}: ConfirmModalProps) {
  return (
    <Modal title={` ${title} `} titleColor={MODAL_THEME.yellow} width={45}>
      <box flexDirection="column" gap={1}>
        <text fg={MODAL_THEME.text}>{message}</text>

        <box flexDirection="row" height={1} gap={2}>
          <text>
            <span fg={MODAL_THEME.accent}>
              <strong>[{confirmKey.toUpperCase()}]</strong>
            </span>
            <span fg={MODAL_THEME.dim}> {confirmLabel}</span>
          </text>
          <text>
            <span fg={MODAL_THEME.accent}><strong>Esc</strong></span>
            <span fg={MODAL_THEME.dim}> {cancelLabel}</span>
          </text>
        </box>
      </box>
    </Modal>
  )
}

interface RetryModalProps {
  ssid: string
  error: string
}

export function RetryModal({ ssid, error }: RetryModalProps) {
  return (
    <Modal title=" Connection Failed " titleColor={MODAL_THEME.red} width={50}>
      <box flexDirection="column" gap={1}>
        <text fg={MODAL_THEME.text}>
          Failed to connect to <span fg={MODAL_THEME.cyan}>{ssid}</span>
        </text>
        <text fg={MODAL_THEME.red}>{error}</text>

        <box flexDirection="row" height={1} gap={2}>
          <text>
            <span fg={MODAL_THEME.accent}><strong>[R]</strong></span>
            <span fg={MODAL_THEME.dim}> Retry</span>
          </text>
          <text>
            <span fg={MODAL_THEME.accent}><strong>Esc</strong></span>
            <span fg={MODAL_THEME.dim}> Dismiss</span>
          </text>
        </box>
      </box>
    </Modal>
  )
}

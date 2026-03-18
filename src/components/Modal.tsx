export const MODAL_THEME = {
  bg: "#1a1b26",
  panelBg: "#1f2335",
  overlay: "#16161e",
  accent: "#7aa2f7",
  green: "#9ece6a",
  red: "#f7768e",
  yellow: "#e0af68",
  magenta: "#bb9af7",
  cyan: "#7dcfff",
  text: "#a9b1d6",
  dim: "#565f89",
  selection: "#292e42",
  blue: "#7aa2f7",
}

interface ModalProps {
  title: string
  titleColor?: string
  width?: number
  children: React.ReactNode
}

export function Modal({
  title,
  titleColor = MODAL_THEME.accent,
  width = 50,
  children,
}: ModalProps) {
  return (
    <box
      flexGrow={1}
      justifyContent="center"
      alignItems="center"
      backgroundColor={MODAL_THEME.bg}
    >
      <box
        flexDirection="column"
        width={width}
        border
        borderStyle="rounded"
        borderColor={titleColor}
        title={title}
        titleAlignment="center"
        backgroundColor={MODAL_THEME.panelBg}
        padding={1}
      >
        {children}
      </box>
    </box>
  )
}

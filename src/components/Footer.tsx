const THEME = {
  bg: "#16161e",
  accent: "#7aa2f7",
  green: "#9ece6a",
  yellow: "#e0af68",
  text: "#a9b1d6",
  dim: "#565f89",
}

interface FooterProps {
  activeTab: number
}

const SHORTCUTS: { key: string; desc: string }[][] = [
  // Tab 0: Connections
  [
    { key: "1-4", desc: "tabs" },
    { key: "j/k", desc: "navigate" },
    { key: "Enter", desc: "toggle" },
    { key: "e", desc: "edit" },
    { key: "d", desc: "details" },
    { key: "x", desc: "delete" },
    { key: "/", desc: "search" },
    { key: "n", desc: "notifs" },
    { key: "C-e", desc: "export" },
    { key: "C-i", desc: "import" },
    { key: "r", desc: "refresh" },
    { key: "q", desc: "quit" },
  ],
  // Tab 1: Wi-Fi
  [
    { key: "1-4", desc: "tabs" },
    { key: "j/k", desc: "navigate" },
    { key: "Enter", desc: "connect" },
    { key: "[S]can", desc: "wifi" },
    { key: "[H]idden", desc: "network" },
    { key: "/", desc: "search" },
    { key: "n", desc: "notifs" },
    { key: "r", desc: "refresh" },
    { key: "q", desc: "quit" },
  ],
  // Tab 2: Devices
  [
    { key: "1-4", desc: "tabs" },
    { key: "j/k", desc: "navigate" },
    { key: "d", desc: "details" },
    { key: "/", desc: "search" },
    { key: "n", desc: "notifs" },
    { key: "r", desc: "refresh" },
    { key: "q", desc: "quit" },
  ],
  // Tab 3: Details
  [
    { key: "1-4", desc: "tabs" },
    { key: "n", desc: "notifs" },
    { key: "r", desc: "refresh" },
    { key: "q", desc: "quit" },
  ],
]

export function Footer({ activeTab }: FooterProps) {
  const shortcuts = SHORTCUTS[activeTab] ?? SHORTCUTS[0]!

  return (
    <box
      flexDirection="row"
      height={1}
      paddingX={1}
      gap={1}
      backgroundColor={THEME.bg}
    >
      {shortcuts.map(({ key, desc }) => (
        <text key={key}>
          <span fg={THEME.accent}>
            <strong>{key}</strong>
          </span>
          <span fg={THEME.dim}> {desc}</span>
        </text>
      ))}
    </box>
  )
}

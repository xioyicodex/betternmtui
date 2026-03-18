const THEME = {
  bg: "#1a1b26",
  activeBg: "#292e42",
  accent: "#7aa2f7",
  text: "#a9b1d6",
  dim: "#565f89",
}

interface TabBarProps {
  tabs: string[]
  activeTab: number
}

export function TabBar({ tabs, activeTab }: TabBarProps) {
  return (
    <box
      flexDirection="row"
      height={1}
      paddingX={1}
      gap={1}
      backgroundColor={THEME.bg}
    >
      {tabs.map((tab, i) => (
        <text key={tab}>
          <span
            fg={i === activeTab ? THEME.accent : THEME.dim}
            bg={i === activeTab ? THEME.activeBg : THEME.bg}
          >
            {i === activeTab ? " " : " "}
            [{i + 1}] {tab}
            {i === activeTab ? " " : " "}
          </span>
        </text>
      ))}
    </box>
  )
}

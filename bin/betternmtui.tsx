#!/usr/bin/env bun
import pkg from "../package.json"

const args = process.argv.slice(2)

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
betternmtui v${pkg.version}

A terminal UI for NetworkManager

Usage:
  betternmtui            Launch the TUI
  betternmtui --help     Show this help message
  betternmtui --version  Show version number
  betternmtui --update   Update to the latest version

Keybindings:
  Tab / Shift+Tab    Switch between tabs
  j/k or ↑/↓        Navigate lists
  Enter              Toggle connection / Connect to network
  e                  Edit selected connection
  d                  Delete selected connection
  r                  Refresh data
  s                  Scan WiFi networks
  h                  Connect to hidden network
  n                  Open notification log
  q / Ctrl+C         Quit

Requirements:
  - Linux with NetworkManager (nmcli)
  - Bun runtime (https://bun.sh)
`)
  process.exit(0)
}

if (args.includes("--version") || args.includes("-v") || args.includes("-V")) {
  console.log(`betternmtui v${pkg.version}`)
  process.exit(0)
}

if (args.includes("--update") || args.includes("-u")) {
  console.log(`Updating betternmtui...`)
  const proc = Bun.spawn(["bun", "install", "-g", "betternmtui@latest"], {
    stdout: "inherit",
    stderr: "inherit",
  })
  await proc.exited
  process.exit(proc.exitCode ?? 0)
}

const { createCliRenderer } = await import("@opentui/core")
const { createRoot } = await import("@opentui/react")
const { App } = await import("../src/App.tsx")

const renderer = await createCliRenderer({
  exitOnCtrlC: false,
})

createRoot(renderer).render(<App />)

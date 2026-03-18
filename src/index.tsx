import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { App } from "./App.tsx"

const renderer = await createCliRenderer({
  exitOnCtrlC: false, // We handle Ctrl+C ourselves
})

createRoot(renderer).render(<App />)

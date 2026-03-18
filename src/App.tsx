import { useState, useCallback, useRef } from "react"
import { useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/react"

import { Header } from "./components/Header.tsx"
import { TabBar } from "./components/TabBar.tsx"
import { ConnectionsPanel } from "./components/ConnectionsPanel.tsx"
import { WifiPanel } from "./components/WifiPanel.tsx"
import { DevicesPanel } from "./components/DevicesPanel.tsx"
import { DetailsPanel } from "./components/DetailsPanel.tsx"
import { Footer } from "./components/Footer.tsx"
import { ToastOverlay } from "./components/ToastOverlay.tsx"
import { NotificationLog } from "./components/NotificationLog.tsx"
import type { StatusSeverity } from "./components/WifiPanel.tsx"
import {
  useConnections,
  useWifiNetworks,
  useDevices,
  useConnectionDetails,
  toggleConnection,
  connectWifi,
  connectWifiByUuid,
  connectHiddenWifi,
  deleteConnection,
  fetchConnectionProperties,
  modifyConnection,
  reactivateConnection,
  fetchActiveConnections,
  exportConnection,
  importConnection,
} from "./hooks/useNmcli.ts"
import type { ConnectionProperties } from "./hooks/useNmcli.ts"
import { EditConnectionPanel, getVisibleFields, validateField } from "./components/EditConnectionPanel.tsx"
import { usePolling } from "./hooks/usePolling.ts"
import { useToasts } from "./hooks/useToasts.ts"

const TABS = ["Connections", "Wi-Fi", "Devices", "Details"]

const THEME = {
  bg: "#1a1b26",
  panelBg: "#1f2335",
  accent: "#7aa2f7",
  cyan: "#7dcfff",
  green: "#9ece6a",
  red: "#f7768e",
  yellow: "#e0af68",
  magenta: "#bb9af7",
  text: "#a9b1d6",
  dim: "#565f89",
}

// Env-configurable poll intervals
const POLL_INTERVAL = parseInt(process.env.NMTUI_POLL_INTERVAL || "5000", 10)
const WIFI_REFRESH_INTERVAL = parseInt(process.env.NMTUI_WIFI_REFRESH || "30000", 10)

// Prompt states for inline input bars
type PromptState =
  | null
  | { type: "wifi-password"; ssid: string; security: string }
  | { type: "hidden-ssid" }
  | { type: "hidden-security"; ssid: string; securityIndex: number }
  | { type: "hidden-password"; ssid: string }
  | { type: "confirm-delete"; name: string; uuid: string }
  | { type: "retry"; ssid: string; error: string }
  | { type: "confirm-discard"; uuid: string }
  | { type: "confirm-apply"; uuid: string }
  | { type: "edit-field-input"; fieldKey: string; fieldLabel: string; currentValue: string }
  | { type: "export-path"; uuid: string; defaultPath: string }
  | { type: "import-path" }

const SECURITY_OPTIONS = ["None", "WPA-PSK", "WPA-Enterprise"]

export function App() {
  const renderer = useRenderer()
  const { width, height } = useTerminalDimensions()

  const [activeTab, setActiveTab] = useState(0)
  const [connIndex, setConnIndex] = useState(0)
  const [wifiIndex, setWifiIndex] = useState(0)
  const [devIndex, setDevIndex] = useState(0)
  const [statusMessage, setStatusMessage] = useState("")
  const [statusSeverity, setStatusSeverity] = useState<StatusSeverity>("info")
  const [detailsTarget, setDetailsTarget] = useState("")
  const [prompt, setPrompt] = useState<PromptState>(null)
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Edit mode state
  const [editMode, setEditMode] = useState(false)
  const [editOriginal, setEditOriginal] = useState<ConnectionProperties | null>(null)
  const [editProps, setEditProps] = useState<ConnectionProperties | null>(null)
  const [editFieldIndex, setEditFieldIndex] = useState(0)
  const [editStatus, setEditStatus] = useState("")
  const [editStatusSeverity, setEditStatusSeverity] = useState<"info" | "success" | "error">("info")
  const editStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Filter state
  const [filterText, setFilterText] = useState("")
  const [filterActive, setFilterActive] = useState(false)

  // Toast system
  const { toasts, history, showHistory, addToast, dismissToast, clearToasts, toggleHistory } = useToasts()

  // Track previous active UUIDs for change detection
  const prevActiveUuidsRef = useRef<string[]>([])

  const { connections, loading: connLoading, refresh: connRefresh } = useConnections()
  const {
    networks,
    loading: wifiLoading,
    scanning,
    refresh: wifiRefresh,
    rescan,
  } = useWifiNetworks()
  const { devices, loading: devLoading, refresh: devRefresh } = useDevices()
  const { details, loading: detailsLoading, refresh: detailsRefresh } =
    useConnectionDetails(detailsTarget)

  // ─── Filtering ───

  const filteredConnections = filterActive && filterText
    ? connections.filter((c) => c.name.toLowerCase().includes(filterText.toLowerCase()))
    : connections

  const filteredNetworks = filterActive && filterText
    ? networks.filter((n) => (n.ssid || "").toLowerCase().includes(filterText.toLowerCase()))
    : networks

  const filteredDevices = filterActive && filterText
    ? devices.filter((d) =>
        d.device.toLowerCase().includes(filterText.toLowerCase()) ||
        (d.connection || "").toLowerCase().includes(filterText.toLowerCase())
      )
    : devices

  const showStatus = useCallback((msg: string, severity: StatusSeverity = "info") => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    setStatusMessage(msg)
    setStatusSeverity(severity)
    const timeout = severity === "error" ? 5000 : 3000
    statusTimerRef.current = setTimeout(() => setStatusMessage(""), timeout)
  }, [])

  const refreshAll = useCallback(() => {
    connRefresh()
    wifiRefresh()
    devRefresh()
    if (detailsTarget) detailsRefresh()
    showStatus("Refreshed", "success")
  }, [connRefresh, wifiRefresh, devRefresh, detailsRefresh, detailsTarget, showStatus])

  /** Refresh lists after a successful connection */
  const refreshAfterConnect = useCallback(() => {
    wifiRefresh()
    connRefresh()
    devRefresh()
  }, [wifiRefresh, connRefresh, devRefresh])

  /** Check if a network has saved credentials */
  const hasSavedProfile = useCallback(
    (ssid: string): string | null => {
      const match = connections.find(
        (c) => c.name === ssid && (c.type.includes("wifi") || c.type.includes("802-11"))
      )
      return match ? match.uuid : null
    },
    [connections]
  )

  const isSecuredNetwork = (security: string): boolean => {
    return !(!security || security === "--" || security.toLowerCase() === "open" || security === "")
  }

  // ─── Polling ───

  const pollingEnabled = prompt === null && !editMode && !showHistory && !filterActive

  // Connection state polling — detect external changes
  usePolling(
    useCallback(async () => {
      const activeUuids = await fetchActiveConnections()
      const prev = prevActiveUuidsRef.current

      if (prev.length > 0) {
        // Detect newly activated connections
        for (const uuid of activeUuids) {
          if (!prev.includes(uuid)) {
            const conn = connections.find((c) => c.uuid === uuid)
            if (conn) {
              addToast(`Connected: ${conn.name}`, "success")
            }
          }
        }
        // Detect deactivated connections
        for (const uuid of prev) {
          if (!activeUuids.includes(uuid)) {
            const conn = connections.find((c) => c.uuid === uuid)
            if (conn) {
              addToast(`Disconnected: ${conn.name}`, "warning")
            }
          }
        }

        // If anything changed, refresh lists
        if (
          activeUuids.length !== prev.length ||
          activeUuids.some((u) => !prev.includes(u))
        ) {
          connRefresh()
          devRefresh()
        }
      }

      prevActiveUuidsRef.current = activeUuids
    }, [connections, addToast, connRefresh, devRefresh]),
    POLL_INTERVAL,
    pollingEnabled
  )

  // WiFi list refresh — only when WiFi tab is active
  usePolling(
    useCallback(() => {
      wifiRefresh()
    }, [wifiRefresh]),
    WIFI_REFRESH_INTERVAL,
    pollingEnabled && activeTab === 1
  )

  // ─── Edit mode callbacks ───

  const showEditStatus = useCallback((msg: string, severity: "info" | "success" | "error" = "info") => {
    if (editStatusTimerRef.current) clearTimeout(editStatusTimerRef.current)
    setEditStatus(msg)
    setEditStatusSeverity(severity)
    const timeout = severity === "error" ? 5000 : 3000
    editStatusTimerRef.current = setTimeout(() => setEditStatus(""), timeout)
  }, [])

  const enterEditMode = useCallback(async (uuid: string) => {
    showStatus("Loading connection properties...", "info")
    const result = await fetchConnectionProperties(uuid)
    if (!result.success || !result.data) {
      showStatus(result.message ?? "Failed to load properties", "error")
      return
    }
    setEditOriginal(result.data)
    setEditProps({ ...result.data })
    setEditFieldIndex(0)
    setEditMode(true)
    setStatusMessage("")
  }, [showStatus])

  const editHasChanges = useCallback((): boolean => {
    if (!editOriginal || !editProps) return false
    for (const key of Object.keys(editOriginal) as (keyof ConnectionProperties)[]) {
      if (key === "uuid" || key === "name") continue
      if (editOriginal[key] !== editProps[key]) return true
    }
    return false
  }, [editOriginal, editProps])

  const getEditChanges = useCallback((): Record<string, string> => {
    if (!editOriginal || !editProps) return {}
    const changes: Record<string, string> = {}
    for (const key of Object.keys(editOriginal) as (keyof ConnectionProperties)[]) {
      if (key === "uuid" || key === "name") continue
      if (editOriginal[key] !== editProps[key]) {
        changes[key] = editProps[key]
      }
    }
    return changes
  }, [editOriginal, editProps])

  const exitEditMode = useCallback(() => {
    setEditMode(false)
    setEditOriginal(null)
    setEditProps(null)
    setEditFieldIndex(0)
    setEditStatus("")
  }, [])

  const saveEditedConnection = useCallback(async () => {
    if (!editProps) return
    const changes = getEditChanges()
    if (Object.keys(changes).length === 0) {
      showEditStatus("No changes to save", "info")
      return
    }

    for (const [key, value] of Object.entries(changes)) {
      const err = validateField(key, value)
      if (err) {
        showEditStatus(`Validation error: ${err}`, "error")
        return
      }
    }

    showEditStatus("Saving...", "info")
    const result = await modifyConnection(editProps.uuid, changes)
    if (!result.success) {
      showEditStatus(result.message, "error")
      return
    }

    setEditOriginal({ ...editProps })
    showEditStatus("Saved successfully", "success")
    setPrompt({ type: "confirm-apply", uuid: editProps.uuid })
  }, [editProps, getEditChanges, showEditStatus])

  const applyEditedConnection = useCallback(async (uuid: string) => {
    showEditStatus("Applying changes...", "info")
    const result = await reactivateConnection(uuid)
    showEditStatus(result.message, result.success ? "success" : "error")
    connRefresh()
    devRefresh()
  }, [showEditStatus, connRefresh, devRefresh])

  /** Handle edit field input submission */
  const handleEditFieldSubmit = useCallback(
    (value: string) => {
      if (prompt?.type !== "edit-field-input" || !editProps) return
      const { fieldKey } = prompt
      setEditProps({ ...editProps, [fieldKey]: value })
      setPrompt(null)
    },
    [prompt, editProps]
  )

  /** Handle password submission for WiFi connect */
  const handlePasswordSubmit = useCallback(
    (password: string) => {
      if (prompt?.type !== "wifi-password") return
      const { ssid } = prompt
      setPrompt(null)
      showStatus(`Connecting to ${ssid}...`, "info")
      connectWifi(ssid, password || undefined).then((result) => {
        if (result.success) {
          showStatus(`Connected to ${ssid}`, "success")
          addToast(`Connected to ${ssid}`, "success")
          refreshAfterConnect()
        } else {
          setPrompt({ type: "retry", ssid, error: result.message })
        }
      })
    },
    [prompt, showStatus, refreshAfterConnect, addToast]
  )

  /** Handle hidden SSID submission */
  const handleHiddenSsidSubmit = useCallback(
    (ssid: string) => {
      if (!ssid.trim()) return
      setPrompt({ type: "hidden-security", ssid: ssid.trim(), securityIndex: 1 })
    },
    []
  )

  /** Handle hidden network password submission */
  const handleHiddenPasswordSubmit = useCallback(
    (password: string) => {
      if (prompt?.type !== "hidden-password") return
      const { ssid } = prompt
      setPrompt(null)
      showStatus(`Connecting to ${ssid}...`, "info")
      connectHiddenWifi(ssid, password || undefined).then((result) => {
        if (result.success) {
          showStatus(`Connected to ${ssid}`, "success")
          addToast(`Connected to ${ssid}`, "success")
          refreshAfterConnect()
        } else {
          setPrompt({ type: "retry", ssid, error: result.message })
        }
      })
    },
    [prompt, showStatus, refreshAfterConnect, addToast]
  )

  /** Handle export path submission */
  const handleExportSubmit = useCallback(
    (path: string) => {
      if (prompt?.type !== "export-path") return
      const { uuid } = prompt
      const destPath = path.trim() || prompt.defaultPath
      setPrompt(null)
      showStatus("Exporting...", "info")
      exportConnection(uuid, destPath).then((result) => {
        showStatus(result.message, result.success ? "success" : "error")
        addToast(result.message, result.success ? "success" : "error")
      })
    },
    [prompt, showStatus, addToast]
  )

  /** Handle import path submission */
  const handleImportSubmit = useCallback(
    (path: string) => {
      if (prompt?.type !== "import-path") return
      const filePath = path.trim()
      setPrompt(null)
      if (!filePath) {
        showStatus("No file path provided", "error")
        return
      }
      showStatus("Importing...", "info")
      importConnection(filePath).then((result) => {
        showStatus(result.message, result.success ? "success" : "error")
        addToast(result.message, result.success ? "success" : "error")
        if (result.success) connRefresh()
      })
    },
    [prompt, showStatus, addToast, connRefresh]
  )

  /** Handle filter input submission */
  const handleFilterSubmit = useCallback(
    (value: string) => {
      setFilterText(value)
      // Keep filter active, just close the input focus
      // The filter will continue to be applied
    },
    []
  )

  useKeyboard((key) => {
    // ─── Notification log overlay ───
    if (showHistory) {
      if (key.name === "escape" || key.name === "n") {
        toggleHistory()
        return
      }
      return
    }

    // ─── Filter input mode ───
    if (filterActive) {
      if (key.name === "escape") {
        setFilterActive(false)
        setFilterText("")
        // Reset selection indices when clearing filter
        setConnIndex(0)
        setWifiIndex(0)
        setDevIndex(0)
        return
      }
      // Let the <input> handle character input
      return
    }

    // ─── Prompt mode keyboard handling ───
    if (prompt !== null) {
      if (key.name === "escape") {
        setPrompt(null)
        return
      }

      // For input-based prompts, let the <input> handle everything
      if (
        prompt.type === "wifi-password" ||
        prompt.type === "hidden-ssid" ||
        prompt.type === "hidden-password" ||
        prompt.type === "edit-field-input" ||
        prompt.type === "export-path" ||
        prompt.type === "import-path"
      ) {
        return
      }

      // Confirm discard unsaved changes
      if (prompt.type === "confirm-discard") {
        if (key.name === "y") {
          setPrompt(null)
          exitEditMode()
        } else if (key.name === "n") {
          setPrompt(null)
        }
        return
      }

      // Confirm apply after save
      if (prompt.type === "confirm-apply") {
        if (key.name === "y") {
          const { uuid } = prompt
          setPrompt(null)
          applyEditedConnection(uuid)
        } else if (key.name === "n") {
          setPrompt(null)
        }
        return
      }

      // Hidden security selector: left/right to cycle, enter to confirm
      if (prompt.type === "hidden-security") {
        if (key.name === "left" || key.name === "h") {
          const newIdx =
            (prompt.securityIndex - 1 + SECURITY_OPTIONS.length) % SECURITY_OPTIONS.length
          setPrompt({ ...prompt, securityIndex: newIdx })
        } else if (key.name === "right" || key.name === "l") {
          const newIdx = (prompt.securityIndex + 1) % SECURITY_OPTIONS.length
          setPrompt({ ...prompt, securityIndex: newIdx })
        } else if (key.name === "enter" || key.name === "return") {
          if (prompt.securityIndex === 0) {
            // No security — connect without password
            const { ssid } = prompt
            setPrompt(null)
            showStatus(`Connecting to ${ssid}...`, "info")
            connectHiddenWifi(ssid).then((result) => {
              if (result.success) {
                showStatus(`Connected to ${ssid}`, "success")
                addToast(`Connected to ${ssid}`, "success")
                refreshAfterConnect()
              } else {
                setPrompt({ type: "retry", ssid, error: result.message })
              }
            })
          } else {
            setPrompt({ type: "hidden-password", ssid: prompt.ssid })
          }
        }
        return
      }

      // Confirm delete: y/n
      if (prompt.type === "confirm-delete") {
        if (key.name === "y") {
          const { name, uuid } = prompt
          setPrompt(null)
          showStatus(`Deleting ${name}...`, "info")
          deleteConnection(uuid).then((result) => {
            showStatus(result.message, result.success ? "success" : "error")
            addToast(result.message, result.success ? "success" : "error")
            connRefresh()
            devRefresh()
          })
        } else if (key.name === "n") {
          setPrompt(null)
        }
        return
      }

      // Retry: r to retry, esc handled above
      if (prompt.type === "retry") {
        if (key.name === "r") {
          setPrompt({
            type: "wifi-password",
            ssid: prompt.ssid,
            security: "",
          })
        }
        return
      }

      return
    }

    // ─── Edit mode keyboard handling ───
    if (editMode && editProps) {
      // Escape: exit edit mode (confirm if changes)
      if (key.name === "escape") {
        if (editHasChanges()) {
          setPrompt({ type: "confirm-discard", uuid: editProps.uuid })
        } else {
          exitEditMode()
        }
        return
      }

      // Ctrl+S: save
      if (key.ctrl && key.name === "s") {
        saveEditedConnection()
        return
      }

      // Quit from edit mode
      if (key.name === "q" || (key.ctrl && key.name === "c")) {
        if (editHasChanges()) {
          setPrompt({ type: "confirm-discard", uuid: editProps.uuid })
        } else {
          exitEditMode()
          renderer.destroy()
        }
        return
      }

      const visibleFields = getVisibleFields(editProps)
      const maxField = visibleFields.length - 1

      // Navigation
      if (key.name === "j" || key.name === "down") {
        setEditFieldIndex((i) => Math.min(maxField, i + 1))
        return
      }
      if (key.name === "k" || key.name === "up") {
        setEditFieldIndex((i) => Math.max(0, i - 1))
        return
      }
      if (key.name === "home" || key.name === "g") {
        setEditFieldIndex(0)
        return
      }
      if (key.name === "end" || (key.shift && key.name === "g")) {
        setEditFieldIndex(maxField)
        return
      }

      // Enter: edit the selected field
      if (key.name === "enter" || key.name === "return") {
        const current = visibleFields[editFieldIndex]
        if (!current) return

        const { field } = current
        if (field.options) {
          // Cycle through options
          const currentVal = editProps[field.key] as string
          const idx = field.options.indexOf(currentVal)
          const nextIdx = (idx + 1) % field.options.length
          setEditProps({ ...editProps, [field.key]: field.options[nextIdx]! })
        } else {
          // Open text input prompt
          setPrompt({
            type: "edit-field-input",
            fieldKey: field.key,
            fieldLabel: field.label,
            currentValue: (editProps[field.key] as string) || "",
          })
        }
        return
      }

      // Left/Right on option fields: cycle
      if (key.name === "left" || key.name === "h" || key.name === "right" || key.name === "l") {
        const current = visibleFields[editFieldIndex]
        if (!current) return
        const { field } = current
        if (field.options) {
          const currentVal = editProps[field.key] as string
          const idx = field.options.indexOf(currentVal)
          const direction = (key.name === "left" || key.name === "h") ? -1 : 1
          const nextIdx = (idx + direction + field.options.length) % field.options.length
          setEditProps({ ...editProps, [field.key]: field.options[nextIdx]! })
        }
        return
      }

      return
    }

    // ─── Normal keyboard handling ───

    // Quit
    if (key.name === "q" || (key.ctrl && key.name === "c")) {
      renderer.destroy()
      return
    }

    // Notification log toggle
    if (key.name === "n") {
      toggleHistory()
      return
    }

    // Dismiss error toasts with Escape
    if (key.name === "escape") {
      const errorToast = toasts.find((t) => t.severity === "error")
      if (errorToast) {
        dismissToast(errorToast.id)
        return
      }
    }

    // Search / Filter
    if (key.name === "/" && activeTab <= 2) {
      setFilterActive(true)
      setFilterText("")
      setConnIndex(0)
      setWifiIndex(0)
      setDevIndex(0)
      return
    }

    // Tab switching
    if (key.name === "1") { setActiveTab(0); return }
    if (key.name === "2") { setActiveTab(1); return }
    if (key.name === "3") { setActiveTab(2); return }
    if (key.name === "4") { setActiveTab(3); return }
    if (key.name === "tab") {
      setActiveTab((t) => (t + 1) % TABS.length)
      return
    }
    if (key.shift && key.name === "tab") {
      setActiveTab((t) => (t - 1 + TABS.length) % TABS.length)
      return
    }

    // Refresh
    if (key.name === "r") {
      refreshAll()
      return
    }

    // ─── Connections tab ───
    if (activeTab === 0) {
      const list = filteredConnections
      const max = list.length - 1
      if (key.name === "j" || key.name === "down") {
        setConnIndex((i) => Math.min(max, i + 1))
      } else if (key.name === "k" || key.name === "up") {
        setConnIndex((i) => Math.max(0, i - 1))
      } else if (key.name === "home" || key.name === "g") {
        setConnIndex(0)
      } else if (key.name === "end") {
        setConnIndex(max)
      } else if (key.shift && key.name === "g") {
        setConnIndex(max)
      } else if (key.name === "enter" || key.name === "return") {
        const conn = list[connIndex]
        if (conn) {
          showStatus(`${conn.active ? "Disconnecting" : "Connecting"}: ${conn.name}...`, "info")
          toggleConnection(conn).then((result) => {
            showStatus(result.message, result.success ? "success" : "error")
            addToast(result.message, result.success ? "success" : "error")
            connRefresh()
            devRefresh()
          })
        }
      } else if (key.name === "d") {
        const conn = list[connIndex]
        if (conn) {
          const target = conn.device && conn.device !== "--" ? conn.device : conn.name
          setDetailsTarget(target)
          setActiveTab(3)
        }
      } else if (key.name === "x" || key.name === "delete") {
        const conn = list[connIndex]
        if (conn) {
          setPrompt({ type: "confirm-delete", name: conn.name, uuid: conn.uuid })
        }
      } else if (key.name === "e") {
        const conn = list[connIndex]
        if (conn) {
          enterEditMode(conn.uuid)
        }
      } else if (key.ctrl && key.name === "e") {
        const conn = list[connIndex]
        if (conn) {
          const safeName = conn.name.replace(/[^a-zA-Z0-9_-]/g, "_")
          setPrompt({
            type: "export-path",
            uuid: conn.uuid,
            defaultPath: `~/${safeName}.nmconnection`,
          })
        }
      } else if (key.ctrl && key.name === "i") {
        setPrompt({ type: "import-path" })
      }
    }

    // ─── WiFi tab ───
    else if (activeTab === 1) {
      const list = filteredNetworks
      const max = list.length - 1
      if (key.name === "j" || key.name === "down") {
        setWifiIndex((i) => Math.min(max, i + 1))
      } else if (key.name === "k" || key.name === "up") {
        setWifiIndex((i) => Math.max(0, i - 1))
      } else if (key.name === "home" || key.name === "g") {
        setWifiIndex(0)
      } else if (key.name === "end") {
        setWifiIndex(max)
      } else if (key.shift && key.name === "g") {
        setWifiIndex(max)
      } else if (key.name === "s") {
        if (!scanning) {
          showStatus("Scanning...", "info")
          rescan().then((result) => {
            showStatus(result.message, result.success ? "success" : "error")
          })
        }
      } else if (key.name === "enter" || key.name === "return") {
        const net = list[wifiIndex]
        if (net) {
          if (net.inUse) {
            showStatus(`Already connected to ${net.ssid}`, "info")
            return
          }

          // Saved credentials — connect directly
          const savedUuid = hasSavedProfile(net.ssid)
          if (savedUuid) {
            showStatus(`Connecting to ${net.ssid}...`, "info")
            connectWifiByUuid(savedUuid).then((result) => {
              if (result.success) {
                showStatus(`Connected to ${net.ssid}`, "success")
                addToast(`Connected to ${net.ssid}`, "success")
                refreshAfterConnect()
              } else {
                setPrompt({ type: "retry", ssid: net.ssid, error: result.message })
              }
            })
            return
          }

          // Open network — connect immediately
          if (!isSecuredNetwork(net.security)) {
            showStatus(`Connecting to ${net.ssid}...`, "info")
            connectWifi(net.ssid).then((result) => {
              if (result.success) {
                showStatus(`Connected to ${net.ssid}`, "success")
                addToast(`Connected to ${net.ssid}`, "success")
                refreshAfterConnect()
              } else {
                setPrompt({ type: "retry", ssid: net.ssid, error: result.message })
              }
            })
            return
          }

          // Secured network — show password prompt
          setPrompt({
            type: "wifi-password",
            ssid: net.ssid,
            security: net.security,
          })
        }
      } else if (key.name === "h") {
        setPrompt({ type: "hidden-ssid" })
      }
    }

    // ─── Devices tab ───
    else if (activeTab === 2) {
      const list = filteredDevices
      const max = list.length - 1
      if (key.name === "j" || key.name === "down") {
        setDevIndex((i) => Math.min(max, i + 1))
      } else if (key.name === "k" || key.name === "up") {
        setDevIndex((i) => Math.max(0, i - 1))
      } else if (key.name === "home" || key.name === "g") {
        setDevIndex(0)
      } else if (key.name === "end") {
        setDevIndex(max)
      } else if (key.shift && key.name === "g") {
        setDevIndex(max)
      } else if (key.name === "d") {
        const dev = list[devIndex]
        if (dev) {
          setDetailsTarget(dev.device)
          setActiveTab(3)
        }
      }
    }
  })

  // Render inline prompt bar
  const renderPromptBar = () => {
    if (!prompt) return null

    if (prompt.type === "wifi-password") {
      return (
        <box height={3} flexDirection="row" border borderStyle="rounded" borderColor={THEME.cyan} paddingX={1} backgroundColor={THEME.panelBg} title={` Password for ${prompt.ssid} (${prompt.security}) `} titleAlignment="left">
          <input
            placeholder="Enter password..."
            onSubmit={handlePasswordSubmit}
            focused
            width={40}
            backgroundColor={THEME.panelBg}
            textColor={THEME.text}
            focusedBackgroundColor={THEME.bg}
            placeholderColor={THEME.dim}
          />
          <text fg={THEME.dim}>  Esc cancel</text>
        </box>
      )
    }

    if (prompt.type === "hidden-ssid") {
      return (
        <box height={3} flexDirection="row" border borderStyle="rounded" borderColor={THEME.magenta} paddingX={1} backgroundColor={THEME.panelBg} title=" Hidden Network — SSID " titleAlignment="left">
          <input
            placeholder="Enter SSID..."
            onSubmit={handleHiddenSsidSubmit}
            focused
            width={40}
            backgroundColor={THEME.panelBg}
            textColor={THEME.text}
            focusedBackgroundColor={THEME.bg}
            placeholderColor={THEME.dim}
          />
          <text fg={THEME.dim}>  Esc cancel</text>
        </box>
      )
    }

    if (prompt.type === "hidden-security") {
      const label = SECURITY_OPTIONS[prompt.securityIndex] ?? "None"
      return (
        <box height={3} flexDirection="row" border borderStyle="rounded" borderColor={THEME.magenta} paddingX={1} backgroundColor={THEME.panelBg} title={` Hidden Network — Security for ${prompt.ssid} `} titleAlignment="left" alignItems="center">
          <text fg={THEME.text}>◄ </text>
          <text fg={THEME.accent}>{label}</text>
          <text fg={THEME.text}> ►</text>
          <text fg={THEME.dim}>  ←/→ select  Enter confirm  Esc cancel</text>
        </box>
      )
    }

    if (prompt.type === "hidden-password") {
      return (
        <box height={3} flexDirection="row" border borderStyle="rounded" borderColor={THEME.magenta} paddingX={1} backgroundColor={THEME.panelBg} title={` Hidden Network — Password for ${prompt.ssid} `} titleAlignment="left">
          <input
            placeholder="Enter password..."
            onSubmit={handleHiddenPasswordSubmit}
            focused
            width={40}
            backgroundColor={THEME.panelBg}
            textColor={THEME.text}
            focusedBackgroundColor={THEME.bg}
            placeholderColor={THEME.dim}
          />
          <text fg={THEME.dim}>  Esc cancel</text>
        </box>
      )
    }

    if (prompt.type === "confirm-delete") {
      return (
        <box height={1} flexDirection="row" paddingX={1} backgroundColor={THEME.bg}>
          <text fg={THEME.yellow}>Delete connection '{prompt.name}'? </text>
          <text>
            <span fg={THEME.accent}>[y]</span>
            <span fg={THEME.dim}> yes  </span>
            <span fg={THEME.accent}>[n/Esc]</span>
            <span fg={THEME.dim}> cancel</span>
          </text>
        </box>
      )
    }

    if (prompt.type === "retry") {
      return (
        <box height={2} flexDirection="column" paddingX={1} backgroundColor={THEME.bg}>
          <text fg={THEME.red}>Failed to connect to {prompt.ssid}: {prompt.error}</text>
          <text>
            <span fg={THEME.accent}>[r]</span>
            <span fg={THEME.dim}> retry  </span>
            <span fg={THEME.accent}>[Esc]</span>
            <span fg={THEME.dim}> dismiss</span>
          </text>
        </box>
      )
    }

    if (prompt.type === "confirm-discard") {
      return (
        <box height={1} flexDirection="row" paddingX={1} backgroundColor={THEME.bg}>
          <text fg={THEME.yellow}>Discard unsaved changes? </text>
          <text>
            <span fg={THEME.accent}>[y]</span>
            <span fg={THEME.dim}> yes  </span>
            <span fg={THEME.accent}>[n/Esc]</span>
            <span fg={THEME.dim}> cancel</span>
          </text>
        </box>
      )
    }

    if (prompt.type === "confirm-apply") {
      return (
        <box height={1} flexDirection="row" paddingX={1} backgroundColor={THEME.bg}>
          <text fg={THEME.green}>Apply changes now? </text>
          <text>
            <span fg={THEME.accent}>[y]</span>
            <span fg={THEME.dim}> yes  </span>
            <span fg={THEME.accent}>[n/Esc]</span>
            <span fg={THEME.dim}> no</span>
          </text>
        </box>
      )
    }

    if (prompt.type === "edit-field-input") {
      return (
        <box height={3} flexDirection="row" border borderStyle="rounded" borderColor={THEME.cyan} paddingX={1} backgroundColor={THEME.panelBg} title={` ${prompt.fieldLabel} `} titleAlignment="left">
          <input
            placeholder={prompt.currentValue || "Enter value..."}
            onSubmit={handleEditFieldSubmit}
            focused
            width={50}
            backgroundColor={THEME.panelBg}
            textColor={THEME.text}
            focusedBackgroundColor={THEME.bg}
            placeholderColor={THEME.dim}
          />
          <text fg={THEME.dim}>  Esc cancel</text>
        </box>
      )
    }

    if (prompt.type === "export-path") {
      return (
        <box height={3} flexDirection="row" border borderStyle="rounded" borderColor={THEME.green} paddingX={1} backgroundColor={THEME.panelBg} title=" Export Connection " titleAlignment="left">
          <input
            placeholder={prompt.defaultPath}
            onSubmit={handleExportSubmit}
            focused
            width={50}
            backgroundColor={THEME.panelBg}
            textColor={THEME.text}
            focusedBackgroundColor={THEME.bg}
            placeholderColor={THEME.dim}
          />
          <text fg={THEME.dim}>  Esc cancel</text>
        </box>
      )
    }

    if (prompt.type === "import-path") {
      return (
        <box height={3} flexDirection="row" border borderStyle="rounded" borderColor={THEME.green} paddingX={1} backgroundColor={THEME.panelBg} title=" Import Connection " titleAlignment="left">
          <input
            placeholder="Path to .nmconnection file..."
            onSubmit={handleImportSubmit}
            focused
            width={50}
            backgroundColor={THEME.panelBg}
            textColor={THEME.text}
            focusedBackgroundColor={THEME.bg}
            placeholderColor={THEME.dim}
          />
          <text fg={THEME.dim}>  Esc cancel</text>
        </box>
      )
    }

    return null
  }

  // Render the filter input bar
  const renderFilterBar = () => {
    if (!filterActive) return null
    return (
      <box height={1} flexDirection="row" paddingX={1} backgroundColor={THEME.bg}>
        <text fg={THEME.accent}>/</text>
        <input
          placeholder="Type to filter..."
          onSubmit={handleFilterSubmit}
          onChange={(value: string) => {
            setFilterText(value)
            // Reset selection on filter change
            setConnIndex(0)
            setWifiIndex(0)
            setDevIndex(0)
          }}
          focused
          width={30}
          backgroundColor={THEME.bg}
          textColor={THEME.text}
          focusedBackgroundColor={THEME.bg}
          placeholderColor={THEME.dim}
        />
        <text fg={THEME.dim}>  Esc clear</text>
      </box>
    )
  }

  // When in edit mode, render the edit panel instead of the normal view
  if (editMode && editOriginal && editProps) {
    return (
      <box
        flexDirection="column"
        width="100%"
        height="100%"
        backgroundColor={THEME.bg}
      >
        <Header />
        <box height={1} paddingX={1} backgroundColor={THEME.bg}>
          <text>
            <span fg={THEME.accent}>EDIT MODE</span>
            <span fg={THEME.dim}> — {editOriginal.name}</span>
          </text>
        </box>

        <box flexGrow={1} flexDirection="row">
          <box flexGrow={2} flexDirection="column">
            <EditConnectionPanel
              properties={editOriginal}
              editedProperties={editProps}
              selectedFieldIndex={editFieldIndex}
              editingField={prompt?.type === "edit-field-input"}
              hasChanges={editHasChanges()}
              validationError={null}
              statusMessage={editStatus}
              statusSeverity={editStatusSeverity}
            />
          </box>

          {/* Right panel: changed fields summary */}
          {width > 100 ? (
            <box flexGrow={1} flexDirection="column" maxWidth={40}>
              <box
                flexGrow={1}
                flexDirection="column"
                border
                borderStyle="rounded"
                borderColor={THEME.dim}
                title=" Changes "
                titleAlignment="left"
                backgroundColor={THEME.panelBg}
                padding={1}
              >
                {(() => {
                  const changes = getEditChanges()
                  const keys = Object.keys(changes)
                  if (keys.length === 0) {
                    return <text fg={THEME.dim}>No changes</text>
                  }
                  return keys.map((key) => (
                    <box key={key} height={1}>
                      <text>
                        <span fg={THEME.yellow}>{key}: </span>
                        <span fg={THEME.text}>{changes[key]}</span>
                      </text>
                    </box>
                  ))
                })()}
              </box>
            </box>
          ) : null}
        </box>

        {renderPromptBar()}

        <ToastOverlay toasts={toasts} />

        <box
          flexDirection="row"
          height={1}
          paddingX={1}
          gap={1}
          backgroundColor="#16161e"
        >
          <text>
            <span fg={THEME.accent}><strong>j/k</strong></span>
            <span fg={THEME.dim}> navigate</span>
          </text>
          <text>
            <span fg={THEME.accent}><strong>Enter</strong></span>
            <span fg={THEME.dim}> edit</span>
          </text>
          <text>
            <span fg={THEME.accent}><strong>←/→</strong></span>
            <span fg={THEME.dim}> toggle</span>
          </text>
          <text>
            <span fg={THEME.accent}><strong>Ctrl+S</strong></span>
            <span fg={THEME.dim}> save</span>
          </text>
          <text>
            <span fg={THEME.accent}><strong>Esc</strong></span>
            <span fg={THEME.dim}> cancel</span>
          </text>
        </box>
      </box>
    )
  }

  // Notification log overlay
  if (showHistory) {
    return (
      <box
        flexDirection="column"
        width="100%"
        height="100%"
        backgroundColor={THEME.bg}
      >
        <Header />
        <NotificationLog history={history} />
        <Footer activeTab={activeTab} />
      </box>
    )
  }

  return (
    <box
      flexDirection="column"
      width="100%"
      height="100%"
      backgroundColor={THEME.bg}
    >
      <Header />
      <TabBar tabs={TABS} activeTab={activeTab} />

      {/* Filter bar */}
      {renderFilterBar()}

      {/* Main content area */}
      <box flexGrow={1} flexDirection="row">
        {/* Left panel - main list */}
        <box flexGrow={2} flexDirection="column">
          {activeTab === 0 ? (
            <ConnectionsPanel
              connections={filteredConnections}
              loading={connLoading}
              selectedIndex={connIndex}
              statusMessage={statusMessage}
              statusSeverity={statusSeverity}
              filterText={filterActive ? filterText : undefined}
            />
          ) : activeTab === 1 ? (
            <WifiPanel
              networks={filteredNetworks}
              loading={wifiLoading}
              scanning={scanning}
              selectedIndex={wifiIndex}
              statusMessage={statusMessage}
              statusSeverity={statusSeverity}
              filterText={filterActive ? filterText : undefined}
            />
          ) : activeTab === 2 ? (
            <DevicesPanel
              devices={filteredDevices}
              loading={devLoading}
              selectedIndex={devIndex}
              filterText={filterActive ? filterText : undefined}
            />
          ) : (
            <DetailsPanel
              title={`Details: ${detailsTarget || "none"}`}
              details={details}
              loading={detailsLoading}
            />
          )}
        </box>

        {/* Right panel - quick info (only on wider terminals) */}
        {width > 100 && activeTab !== 3 ? (
          <box flexGrow={1} flexDirection="column" maxWidth={40}>
            <DetailsPanel
              title="Quick Info"
              keyWidth={16}
              details={
                activeTab === 0 && filteredConnections[connIndex]
                  ? [
                      { key: "Name", value: filteredConnections[connIndex]!.name },
                      { key: "UUID", value: filteredConnections[connIndex]!.uuid.substring(0, 18) + "..." },
                      { key: "Type", value: filteredConnections[connIndex]!.type },
                      { key: "Device", value: filteredConnections[connIndex]!.device || "--" },
                      { key: "Status", value: filteredConnections[connIndex]!.active ? "Active" : "Inactive" },
                    ]
                  : activeTab === 1 && filteredNetworks[wifiIndex]
                    ? [
                        { key: "SSID", value: filteredNetworks[wifiIndex]!.ssid || "<hidden>" },
                        { key: "BSSID", value: filteredNetworks[wifiIndex]!.bssid },
                        { key: "Signal", value: `${filteredNetworks[wifiIndex]!.signal}%` },
                        { key: "Channel", value: filteredNetworks[wifiIndex]!.channel },
                        { key: "Rate", value: filteredNetworks[wifiIndex]!.rate },
                        { key: "Security", value: filteredNetworks[wifiIndex]!.security },
                        { key: "Mode", value: filteredNetworks[wifiIndex]!.mode },
                        { key: "In Use", value: filteredNetworks[wifiIndex]!.inUse ? "Yes" : "No" },
                      ]
                    : activeTab === 2 && filteredDevices[devIndex]
                      ? [
                          { key: "Device", value: filteredDevices[devIndex]!.device },
                          { key: "Type", value: filteredDevices[devIndex]!.type },
                          { key: "State", value: filteredDevices[devIndex]!.state },
                          { key: "Connection", value: filteredDevices[devIndex]!.connection || "--" },
                        ]
                      : []
              }
              loading={false}
            />
          </box>
        ) : null}
      </box>

      {/* Inline prompt bar */}
      {renderPromptBar()}

      {/* Toast overlay */}
      <ToastOverlay toasts={toasts} />

      <Footer activeTab={activeTab} />
    </box>
  )
}

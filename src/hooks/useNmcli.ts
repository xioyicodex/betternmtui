import { useState, useEffect, useCallback } from "react"

export interface Connection {
  name: string
  uuid: string
  type: string
  device: string
  active: boolean
}

export interface WifiNetwork {
  inUse: boolean
  bssid: string
  ssid: string
  mode: string
  channel: string
  rate: string
  signal: number
  bars: string
  security: string
}

export interface Device {
  device: string
  type: string
  state: string
  connection: string
}

export interface ConnectionDetails {
  key: string
  value: string
}

async function exec(cmd: string): Promise<string> {
  const proc = Bun.spawn(["bash", "-c", cmd], {
    stdout: "pipe",
    stderr: "pipe",
  })
  const text = await new Response(proc.stdout).text()
  await proc.exited
  return text.trim()
}

/** Spawn nmcli with array args to prevent shell injection */
async function safeExec(args: string[]): Promise<{ stdout: string; exitCode: number }> {
  const proc = Bun.spawn(args, {
    stdout: "pipe",
    stderr: "pipe",
  })
  // Read both streams concurrently to avoid pipe deadlock
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  const exitCode = await proc.exited
  return { stdout: (stdout || stderr).trim(), exitCode }
}

export function useConnections() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const output = await exec(
        "nmcli -t -f NAME,UUID,TYPE,DEVICE connection show"
      )
      const lines = output.split("\n").filter(Boolean)
      const conns: Connection[] = lines.map((line) => {
        const parts = line.split(":")
        const name = parts[0] ?? ""
        const uuid = parts[1] ?? ""
        const type = parts[2] ?? ""
        const device = parts.slice(3).join(":") ?? ""
        return {
          name,
          uuid,
          type,
          device,
          active: device.length > 0 && device !== "--",
        }
      })
      setConnections(conns)
    } catch {
      setConnections([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { connections, loading, refresh }
}

export function useWifiNetworks() {
  const [networks, setNetworks] = useState<WifiNetwork[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const output = await exec(
        "nmcli -t -f IN-USE,BSSID,SSID,MODE,CHAN,RATE,SIGNAL,BARS,SECURITY device wifi list"
      )
      const lines = output.split("\n").filter(Boolean)
      const nets: WifiNetwork[] = lines.map((line) => {
        // nmcli -t uses : as delimiter but BSSID contains \\:
        // Replace escaped colons temporarily
        const escaped = line.replace(/\\:/g, "\x00")
        const parts = escaped.split(":")
        return {
          inUse: (parts[0] ?? "").trim() === "*",
          bssid: (parts[1] ?? "").replace(/\x00/g, ":"),
          ssid: (parts[2] ?? "").replace(/\x00/g, ":"),
          mode: (parts[3] ?? "").replace(/\x00/g, ":"),
          channel: (parts[4] ?? "").replace(/\x00/g, ":"),
          rate: (parts[5] ?? "").replace(/\x00/g, ":"),
          signal: parseInt(parts[6] ?? "0", 10),
          bars: (parts[7] ?? "").replace(/\x00/g, ":"),
          security: (parts[8] ?? "").replace(/\x00/g, ":"),
        }
      })
      // Sort by signal strength descending
      nets.sort((a, b) => b.signal - a.signal)
      setNetworks(nets)
    } catch {
      setNetworks([])
    }
    setLoading(false)
  }, [])

  const rescan = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    if (scanning) return { success: false, message: "Scan already in progress" }
    setScanning(true)
    try {
      // Capture output to surface errors
      const proc = Bun.spawn(["bash", "-c", "nmcli device wifi rescan 2>&1"], {
        stdout: "pipe",
        stderr: "pipe",
      })
      const output = (await new Response(proc.stdout).text()).trim()
      const exitCode = await proc.exited
      if (exitCode !== 0 && output) {
        setScanning(false)
        return { success: false, message: output }
      }
      // Snapshot current list
      const listCmd = "nmcli -t -f IN-USE,BSSID,SSID,MODE,CHAN,RATE,SIGNAL,BARS,SECURITY device wifi list"
      const before = await exec(listCmd)
      // Poll until results change or 5s elapses
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 500))
        const after = await exec(listCmd)
        if (after !== before && i >= 1) break
      }
      await refresh()
      setScanning(false)
      return { success: true, message: "Scan complete" }
    } catch (e: any) {
      setScanning(false)
      return { success: false, message: e.message ?? "Scan failed" }
    }
  }, [refresh, scanning])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { networks, loading, scanning, refresh, rescan }
}

export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const output = await exec(
        "nmcli -t -f DEVICE,TYPE,STATE,CONNECTION device status"
      )
      const lines = output.split("\n").filter(Boolean)
      const devs: Device[] = lines.map((line) => {
        const parts = line.split(":")
        return {
          device: parts[0] ?? "",
          type: parts[1] ?? "",
          state: parts[2] ?? "",
          connection: parts.slice(3).join(":") ?? "",
        }
      })
      setDevices(devs)
    } catch {
      setDevices([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { devices, loading, refresh }
}

export function useConnectionDetails(deviceOrConn: string) {
  const [details, setDetails] = useState<ConnectionDetails[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!deviceOrConn) {
      setDetails([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const output = await exec(
        `nmcli device show ${deviceOrConn} 2>/dev/null || nmcli connection show "${deviceOrConn}" 2>/dev/null || echo "No details available"`
      )
      const lines = output.split("\n").filter(Boolean)
      const dets: ConnectionDetails[] = lines
        .filter((l) => l.includes(":"))
        .map((line) => {
          const idx = line.indexOf(":")
          return {
            key: line.substring(0, idx).trim(),
            value: line.substring(idx + 1).trim(),
          }
        })
      setDetails(dets)
    } catch {
      setDetails([])
    }
    setLoading(false)
  }, [deviceOrConn])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { details, loading, refresh }
}

export async function toggleConnection(
  conn: Connection
): Promise<{ success: boolean; message: string }> {
  try {
    const args = conn.active
      ? ["nmcli", "connection", "down", conn.uuid]
      : ["nmcli", "connection", "up", conn.uuid]
    const { stdout, exitCode } = await safeExec(args)
    if (exitCode !== 0) {
      return { success: false, message: stdout || "Failed" }
    }
    return {
      success: true,
      message: stdout || (conn.active ? `Disconnected: ${conn.name}` : `Connected: ${conn.name}`),
    }
  } catch (e: any) {
    return { success: false, message: e.message ?? "Failed" }
  }
}

export async function connectWifi(
  ssid: string,
  password?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const args = password
      ? ["nmcli", "device", "wifi", "connect", ssid, "password", password]
      : ["nmcli", "device", "wifi", "connect", ssid]
    const { stdout, exitCode } = await safeExec(args)
    if (exitCode !== 0) {
      return { success: false, message: stdout || "Connection failed" }
    }
    return { success: true, message: stdout || `Connected to ${ssid}` }
  } catch (e: any) {
    return { success: false, message: e.message ?? "Failed" }
  }
}

export async function connectWifiByUuid(
  uuid: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { stdout, exitCode } = await safeExec(["nmcli", "connection", "up", uuid])
    if (exitCode !== 0) {
      return { success: false, message: stdout || "Connection failed" }
    }
    return { success: true, message: stdout || "Connected" }
  } catch (e: any) {
    return { success: false, message: e.message ?? "Failed" }
  }
}

export async function connectHiddenWifi(
  ssid: string,
  password?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const args = password
      ? ["nmcli", "device", "wifi", "connect", ssid, "password", password, "hidden", "yes"]
      : ["nmcli", "device", "wifi", "connect", ssid, "hidden", "yes"]
    const { stdout, exitCode } = await safeExec(args)
    if (exitCode !== 0) {
      return { success: false, message: stdout || "Connection failed" }
    }
    return { success: true, message: stdout || `Connected to ${ssid}` }
  } catch (e: any) {
    return { success: false, message: e.message ?? "Failed" }
  }
}

export async function deleteConnection(
  uuid: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { stdout, exitCode } = await safeExec(["nmcli", "connection", "delete", uuid])
    if (exitCode !== 0) {
      return { success: false, message: stdout || "Delete failed" }
    }
    return { success: true, message: stdout || "Connection deleted" }
  } catch (e: any) {
    return { success: false, message: e.message ?? "Failed" }
  }
}

/** Editable connection properties organized by section */
export interface ConnectionProperties {
  uuid: string
  name: string
  // IPv4
  ipv4Method: string
  ipv4Addresses: string
  ipv4Gateway: string
  ipv4Dns: string
  ipv4DnsSearch: string
  // IPv6
  ipv6Method: string
  ipv6Addresses: string
  ipv6Gateway: string
  ipv6Dns: string
  ipv6DnsSearch: string
  // Proxy
  proxyMethod: string
  proxyHttpProxy: string
  proxyHttpsProxy: string
  proxyNoProxy: string
  proxyPacUrl: string
}

/** Fetch editable connection properties by UUID */
export async function fetchConnectionProperties(
  uuid: string
): Promise<{ success: boolean; data?: ConnectionProperties; message?: string }> {
  try {
    const { stdout, exitCode } = await safeExec([
      "nmcli", "-t", "-s", "connection", "show", uuid,
    ])
    if (exitCode !== 0) {
      return { success: false, message: stdout || "Failed to fetch connection" }
    }

    const fields: Record<string, string> = {}
    for (const line of stdout.split("\n")) {
      const idx = line.indexOf(":")
      if (idx === -1) continue
      const key = line.substring(0, idx).trim()
      const value = line.substring(idx + 1).trim()
      fields[key] = value
    }

    return {
      success: true,
      data: {
        uuid,
        name: fields["connection.id"] ?? "",
        ipv4Method: fields["ipv4.method"] ?? "auto",
        ipv4Addresses: fields["ipv4.addresses"] ?? "",
        ipv4Gateway: fields["ipv4.gateway"] ?? "",
        ipv4Dns: fields["ipv4.dns"] ?? "",
        ipv4DnsSearch: fields["ipv4.dns-search"] ?? "",
        ipv6Method: fields["ipv6.method"] ?? "auto",
        ipv6Addresses: fields["ipv6.addresses"] ?? "",
        ipv6Gateway: fields["ipv6.gateway"] ?? "",
        ipv6Dns: fields["ipv6.dns"] ?? "",
        ipv6DnsSearch: fields["ipv6.dns-search"] ?? "",
        proxyMethod: fields["proxy.method"] ?? "none",
        proxyHttpProxy: fields["proxy.http-proxy"] ?? "",
        proxyHttpsProxy: fields["proxy.https-proxy"] ?? "",
        proxyNoProxy: fields["proxy.no-proxy"] ?? "",
        proxyPacUrl: fields["proxy.pac-url"] ?? "",
      },
    }
  } catch (e: any) {
    return { success: false, message: e.message ?? "Failed" }
  }
}

/** Map from ConnectionProperties keys to nmcli property names */
const PROP_TO_NMCLI: Record<string, string> = {
  ipv4Method: "ipv4.method",
  ipv4Addresses: "ipv4.addresses",
  ipv4Gateway: "ipv4.gateway",
  ipv4Dns: "ipv4.dns",
  ipv4DnsSearch: "ipv4.dns-search",
  ipv6Method: "ipv6.method",
  ipv6Addresses: "ipv6.addresses",
  ipv6Gateway: "ipv6.gateway",
  ipv6Dns: "ipv6.dns",
  ipv6DnsSearch: "ipv6.dns-search",
  proxyMethod: "proxy.method",
  proxyHttpProxy: "proxy.http-proxy",
  proxyHttpsProxy: "proxy.https-proxy",
  proxyNoProxy: "proxy.no-proxy",
  proxyPacUrl: "proxy.pac-url",
}

/** Modify connection properties. Returns per-field results. */
export async function modifyConnection(
  uuid: string,
  changes: Record<string, string>
): Promise<{ success: boolean; message: string; errors: string[] }> {
  const errors: string[] = []

  // Build a single nmcli modify command with all changes
  const args = ["nmcli", "connection", "modify", uuid]
  for (const [key, value] of Object.entries(changes)) {
    const nmcliKey = PROP_TO_NMCLI[key]
    if (!nmcliKey) continue
    // Use empty string to clear a value
    args.push(nmcliKey, value || "\"\"")
  }

  if (args.length <= 4) {
    return { success: true, message: "No changes to save", errors: [] }
  }

  const { stdout, exitCode } = await safeExec(args)
  if (exitCode !== 0) {
    errors.push(stdout || "Modification failed")
    return { success: false, message: errors.join("; "), errors }
  }

  return { success: true, message: "Connection saved", errors: [] }
}

/** Reactivate a connection after modification */
export async function reactivateConnection(
  uuid: string
): Promise<{ success: boolean; message: string }> {
  const { stdout, exitCode } = await safeExec(["nmcli", "connection", "up", uuid])
  if (exitCode !== 0) {
    return { success: false, message: stdout || "Failed to apply changes" }
  }
  return { success: true, message: stdout || "Changes applied" }
}

/** Fetch list of currently active connection UUIDs */
export async function fetchActiveConnections(): Promise<string[]> {
  try {
    const output = await exec("nmcli -t -f UUID connection show --active")
    return output.split("\n").filter(Boolean)
  } catch {
    return []
  }
}

/** Export a connection profile file to a destination path */
export async function exportConnection(
  uuid: string,
  destPath: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Get connection filename from nmcli
    const { stdout, exitCode } = await safeExec([
      "nmcli", "-t", "-f", "connection.id,connection.uuid,connection.type",
      "connection", "show", uuid,
    ])
    if (exitCode !== 0) {
      return { success: false, message: stdout || "Failed to find connection" }
    }

    // Find the .nmconnection file in system-connections
    const nameField = stdout.split("\n").find((l) => l.startsWith("connection.id:"))
    const connName = nameField ? nameField.split(":").slice(1).join(":") : ""
    if (!connName) {
      return { success: false, message: "Could not determine connection name" }
    }

    // Try common locations for the profile file
    const srcPaths = [
      `/etc/NetworkManager/system-connections/${connName}.nmconnection`,
      `/etc/NetworkManager/system-connections/${connName}`,
    ]

    for (const srcPath of srcPaths) {
      const check = await safeExec(["test", "-f", srcPath])
      if (check.exitCode === 0) {
        const copy = await safeExec(["sudo", "cp", srcPath, destPath])
        if (copy.exitCode !== 0) {
          // Try without sudo
          const copy2 = await safeExec(["cp", srcPath, destPath])
          if (copy2.exitCode !== 0) {
            return { success: false, message: copy2.stdout || "Failed to copy file" }
          }
        }
        return { success: true, message: `Exported to ${destPath}` }
      }
    }

    return { success: false, message: `Profile file not found for "${connName}"` }
  } catch (e: any) {
    return { success: false, message: e.message ?? "Export failed" }
  }
}

/** Import a connection profile from a file path */
export async function importConnection(
  filePath: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { stdout, exitCode } = await safeExec(["nmcli", "connection", "load", filePath])
    if (exitCode !== 0) {
      return { success: false, message: stdout || "Import failed" }
    }
    return { success: true, message: stdout || `Imported ${filePath}` }
  } catch (e: any) {
    return { success: false, message: e.message ?? "Import failed" }
  }
}

export async function getHostname(): Promise<string> {
  try {
    return await exec("hostname")
  } catch {
    return "unknown"
  }
}

export async function getGeneralStatus(): Promise<
  { key: string; value: string }[]
> {
  try {
    const output = await exec("nmcli general status")
    const lines = output.split("\n").filter(Boolean)
    if (lines.length >= 2) {
      const headers = (lines[0] ?? "").split(/\s{2,}/).map((h) => h.trim())
      const values = (lines[1] ?? "").split(/\s{2,}/).map((v) => v.trim())
      return headers.map((h, i) => ({ key: h, value: values[i] ?? "" }))
    }
    return []
  } catch {
    return []
  }
}

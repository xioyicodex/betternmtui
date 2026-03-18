import type { ConnectionProperties } from "../hooks/useNmcli.ts"

const THEME = {
  bg: "#1a1b26",
  panelBg: "#1f2335",
  accent: "#7aa2f7",
  green: "#9ece6a",
  red: "#f7768e",
  yellow: "#e0af68",
  magenta: "#bb9af7",
  cyan: "#7dcfff",
  text: "#a9b1d6",
  dim: "#565f89",
  selection: "#292e42",
}

// All editable fields organized by section
interface FieldDef {
  key: keyof ConnectionProperties
  label: string
  /** Whether this field is only shown when a condition is met */
  showWhen?: (props: ConnectionProperties) => boolean
  /** Whether this field is a toggle (cycles through options) */
  options?: string[]
}

interface SectionDef {
  title: string
  color: string
  fields: FieldDef[]
}

const SECTIONS: SectionDef[] = [
  {
    title: "IPv4 Configuration",
    color: THEME.cyan,
    fields: [
      { key: "ipv4Method", label: "Method", options: ["auto", "manual", "disabled", "link-local", "shared"] },
      { key: "ipv4Addresses", label: "Address/Prefix", showWhen: (p) => p.ipv4Method === "manual" },
      { key: "ipv4Gateway", label: "Gateway", showWhen: (p) => p.ipv4Method === "manual" },
      { key: "ipv4Dns", label: "DNS Servers" },
      { key: "ipv4DnsSearch", label: "DNS Search" },
    ],
  },
  {
    title: "IPv6 Configuration",
    color: THEME.magenta,
    fields: [
      { key: "ipv6Method", label: "Method", options: ["auto", "manual", "disabled", "ignore", "link-local"] },
      { key: "ipv6Addresses", label: "Address/Prefix", showWhen: (p) => p.ipv6Method === "manual" },
      { key: "ipv6Gateway", label: "Gateway", showWhen: (p) => p.ipv6Method === "manual" },
      { key: "ipv6Dns", label: "DNS Servers" },
      { key: "ipv6DnsSearch", label: "DNS Search" },
    ],
  },
  {
    title: "Proxy Settings",
    color: THEME.yellow,
    fields: [
      { key: "proxyMethod", label: "Method", options: ["none", "auto", "manual"] },
      { key: "proxyHttpProxy", label: "HTTP Proxy", showWhen: (p) => p.proxyMethod === "manual" },
      { key: "proxyHttpsProxy", label: "HTTPS Proxy", showWhen: (p) => p.proxyMethod === "manual" },
      { key: "proxyNoProxy", label: "No Proxy", showWhen: (p) => p.proxyMethod === "manual" },
      { key: "proxyPacUrl", label: "PAC URL", showWhen: (p) => p.proxyMethod === "auto" },
    ],
  },
]

/** Build flat list of visible fields */
function getVisibleFields(props: ConnectionProperties): { section: SectionDef; field: FieldDef }[] {
  const result: { section: SectionDef; field: FieldDef }[] = []
  for (const section of SECTIONS) {
    for (const field of section.fields) {
      if (!field.showWhen || field.showWhen(props)) {
        result.push({ section, field })
      }
    }
  }
  return result
}

/** Validate an IPv4 address */
function validateIpv4(ip: string): string | null {
  // Allow CIDR notation
  const cidrMatch = ip.match(/^(\d+\.\d+\.\d+\.\d+)(?:\/(\d+))?$/)
  if (!cidrMatch) return "Invalid IPv4 format"
  const parts = cidrMatch[1]!.split(".")
  if (parts.length !== 4) return "Invalid IPv4 format"
  for (const p of parts) {
    const n = parseInt(p, 10)
    if (isNaN(n) || n < 0 || n > 255) return `Invalid octet: ${p}`
  }
  if (cidrMatch[2]) {
    const prefix = parseInt(cidrMatch[2], 10)
    if (isNaN(prefix) || prefix < 1 || prefix > 32) return `Invalid prefix: /${cidrMatch[2]}`
  }
  return null
}

/** Validate field value, returns error message or null */
function validateField(key: string, value: string): string | null {
  if (!value || value === "--") return null

  if (key === "ipv4Addresses" || key === "ipv4Gateway") {
    // Multiple addresses separated by comma
    for (const addr of value.split(",").map((s) => s.trim()).filter(Boolean)) {
      const err = validateIpv4(addr)
      if (err) return `${addr}: ${err}`
    }
  }

  if (key === "ipv4Dns") {
    for (const dns of value.split(",").map((s) => s.trim()).filter(Boolean)) {
      const err = validateIpv4(dns)
      if (err) return `DNS ${dns}: ${err}`
    }
  }

  return null
}

export interface EditConnectionPanelProps {
  properties: ConnectionProperties
  editedProperties: ConnectionProperties
  selectedFieldIndex: number
  editingField: boolean
  hasChanges: boolean
  validationError: string | null
  statusMessage: string
  statusSeverity: "info" | "success" | "error"
}

export function EditConnectionPanel({
  properties,
  editedProperties,
  selectedFieldIndex,
  editingField,
  hasChanges,
  validationError,
  statusMessage,
  statusSeverity,
}: EditConnectionPanelProps) {
  const visibleFields = getVisibleFields(editedProperties)

  let fieldIndex = 0

  return (
    <box
      flexGrow={1}
      flexDirection="column"
      border
      borderStyle="rounded"
      borderColor={THEME.accent}
      title={` Edit: ${properties.name} `}
      titleAlignment="left"
      backgroundColor={THEME.panelBg}
    >
      {/* Sections */}
      <box flexGrow={1} flexDirection="column" overflow="hidden" paddingX={1}>
        {SECTIONS.map((section) => {
          const sectionFields = section.fields.filter(
            (f) => !f.showWhen || f.showWhen(editedProperties)
          )
          if (sectionFields.length === 0) return null

          return (
            <box key={section.title} flexDirection="column" marginBottom={1}>
              {/* Section header */}
              <box height={1}>
                <text fg={section.color}>
                  <strong>{'─ ' + section.title + ' '}</strong>
                  <span fg={THEME.dim}>{'─'.repeat(Math.max(0, 40 - section.title.length))}</span>
                </text>
              </box>

              {/* Fields */}
              {sectionFields.map((field) => {
                const currentFieldIndex = fieldIndex++
                const isSelected = currentFieldIndex === selectedFieldIndex
                const originalValue = properties[field.key] as string
                const editedValue = editedProperties[field.key] as string
                const isModified = originalValue !== editedValue
                const bgColor = isSelected ? THEME.selection : THEME.panelBg
                const error = validateField(field.key, editedValue)

                return (
                  <box key={field.key} flexDirection="row" height={1} backgroundColor={bgColor}>
                    {/* Selection indicator */}
                    <text width={2} fg={isSelected ? THEME.accent : THEME.dim}>
                      {isSelected ? (editingField ? ">" : "›") : " "}
                    </text>
                    {/* Label */}
                    <text width={18} fg={isSelected ? THEME.text : THEME.dim}>
                      {field.label}
                    </text>
                    {/* Value */}
                    {field.options ? (
                      <text fg={THEME.accent}>
                        {isSelected ? "◄ " : "  "}
                        <span fg={isModified ? THEME.yellow : THEME.text}>{editedValue || "--"}</span>
                        {isSelected ? " ►" : "  "}
                      </text>
                    ) : (
                      <text fg={isModified ? THEME.yellow : THEME.text}>
                        {editedValue || "--"}
                        {isSelected && editingField ? (
                          <span fg={THEME.accent}>█</span>
                        ) : null}
                      </text>
                    )}
                    {/* Modified indicator */}
                    {isModified ? (
                      <text fg={THEME.yellow}> *</text>
                    ) : null}
                    {/* Validation error */}
                    {error && isSelected ? (
                      <text fg={THEME.red}> {error}</text>
                    ) : null}
                  </box>
                )
              })}
            </box>
          )
        })}
      </box>

      {/* Status / validation bar */}
      {validationError ? (
        <box paddingX={1} height={1} backgroundColor={THEME.bg}>
          <text fg={THEME.red}>{validationError}</text>
        </box>
      ) : statusMessage ? (
        <box paddingX={1} height={1} backgroundColor={THEME.bg}>
          <text
            fg={
              statusSeverity === "success"
                ? THEME.green
                : statusSeverity === "error"
                  ? THEME.red
                  : THEME.cyan
            }
          >
            {statusMessage}
          </text>
        </box>
      ) : hasChanges ? (
        <box paddingX={1} height={1} backgroundColor={THEME.bg}>
          <text fg={THEME.yellow}>Unsaved changes</text>
        </box>
      ) : null}
    </box>
  )
}

// Re-export helpers for use in App.tsx
export { SECTIONS, getVisibleFields, validateField, validateIpv4 }
export type { FieldDef, SectionDef }

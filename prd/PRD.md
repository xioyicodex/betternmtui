# betternmtui — Product Requirements Document

## Overview

betternmtui is a terminal UI for NetworkManager built with React, OpenTUI, and Bun. It currently provides four tabs (Connections, Wi-Fi, Devices, Details) with keyboard-driven navigation and nmcli integration for viewing and basic connection toggling.

This PRD outlines enhancements across four phases: polishing the core WiFi experience, adding authentication and connection flows, enabling connection editing, and adding quality-of-life features.

### Tech Stack

- **Runtime:** Bun
- **UI:** React 19 + OpenTUI (`@opentui/core`, `@opentui/react`)
- **Backend:** nmcli via `Bun.spawn`
- **Language:** TypeScript

### Current State

- View saved connections, WiFi networks, devices, and details
- Toggle connections up/down by UUID
- Scan WiFi with `s` key (fixed 2-second wait)
- Signal strength shown as percentage + bars text
- `connectWifi()` accepts optional password but no UI to enter it
- No connection editing, no password prompt, no persistent feedback

---

## Phase 1 — Polish Core WiFi Experience

**Goal:** Make WiFi scanning feel responsive and informative. Improve how network metadata is displayed.

### 1.1 Enhanced Scan UX

| Requirement | Details |
|---|---|
| **Loading indicator** | Replace the fixed 2-second wait with a spinner/animation that persists until scan results actually arrive. Poll `nmcli device wifi list` every 500ms after triggering rescan and resolve once the result set changes or 5 seconds elapse (whichever comes first). |
| **Scan trigger** | Keep `s` as the hotkey. Add a visible `[S]can` label in the footer when the WiFi tab is active. |
| **Scan cooldown** | Debounce rescan requests — ignore `s` presses while a scan is already in progress. Show a brief "(scanning...)" indicator next to the tab title. |
| **Error feedback** | If `nmcli device wifi rescan` fails (e.g., WiFi device is disabled), display a red status message with the reason instead of silently swallowing it. |

### 1.2 Signal Strength Visualization

| Requirement | Details |
|---|---|
| **Color-coded bars** | Map signal ranges to colors: >=75% green, 50-74% yellow, 25-49% red, <25% dim red. Apply to both the bar characters and the percentage number. |
| **Bar rendering** | Replace the text-based `bars` field from nmcli with custom Unicode block characters (e.g., `▂▄▆█`) rendered in the appropriate color. |
| **Sort indicator** | Show a `▼` arrow on the "Signal" column header to indicate descending sort order. |

### 1.3 Network Type Indicators

| Requirement | Details |
|---|---|
| **Security badge** | Display a short colored badge next to each SSID: `OPEN` (green), `WPA2` (yellow), `WPA3` (blue), `WPA-E` (magenta for enterprise), `WEP` (red/deprecated). Derive from the `security` field. |
| **Lock icon** | Prepend a lock character (`🔒` or `*`) to secured networks and an open icon to open ones. |
| **In-use indicator** | Highlight the currently connected network row with a distinct background color and a `✓` prefix instead of the current `*`. |

### 1.4 Status Messages

| Requirement | Details |
|---|---|
| **Auto-dismiss duration** | Make the 3-second status message timeout configurable per-message (e.g., errors persist for 5 seconds). |
| **Message severity** | Color-code status messages: green for success, yellow for warnings, red for errors. |
| **Stacking** | If multiple status events fire in quick succession, show the most recent one (don't queue). |

---

## Phase 2 — Authentication & Connection Flow

**Goal:** Allow users to connect to secured WiFi networks entirely within the TUI. Manage saved credentials.

### 2.1 Password Prompt Modal

| Requirement | Details |
|---|---|
| **Trigger** | Pressing `Enter` on a secured WiFi network opens a modal overlay. Open networks connect immediately without a prompt. |
| **Modal layout** | Centered box with: network SSID as title, security type label, password input field, `[Enter] Connect` / `[Esc] Cancel` footer. |
| **Input behavior** | Mask input with `•` characters. Support backspace, clipboard paste. No character limit enforced by UI (nmcli handles validation). |
| **Submission** | On Enter, dismiss modal, show "Connecting to <SSID>..." status, call `connectWifi(ssid, password)`. |
| **Already-saved credentials** | If the network has a saved connection profile (match by SSID in connections list), skip the password prompt and connect directly using `nmcli connection up`. |

### 2.2 Hidden SSID Manual Entry

| Requirement | Details |
|---|---|
| **Trigger** | Press `h` on the WiFi tab to open a "Connect to Hidden Network" modal. |
| **Modal fields** | SSID text input, Security type selector (None / WPA-PSK / WPA-Enterprise), Password input (shown only when security != None). |
| **Command** | Use `nmcli device wifi connect <SSID> password <pass> hidden yes`. |

### 2.3 Connection Feedback

| Requirement | Details |
|---|---|
| **Success** | Green status message: "Connected to <SSID>". Refresh connections and WiFi lists. Update the in-use indicator. |
| **Failure** | Red status message with the nmcli error (e.g., "Secrets were required, but not provided", "No network with SSID found"). |
| **Retry option** | On failure, show a prompt: "Connection failed. [R]etry / [Esc] Dismiss". Retry re-opens the password modal with the SSID pre-filled. |

### 2.4 Forget / Delete Saved Connections

| Requirement | Details |
|---|---|
| **Trigger** | Press `x` or `Delete` on a connection in the Connections tab. |
| **Confirmation** | Show a modal: "Delete connection '<name>'? [y/N]". |
| **Command** | `nmcli connection delete <uuid>`. |
| **Feedback** | Green status on success, red on failure. Refresh connections list. |

---

## Phase 3 — Connection Editing

**Goal:** Allow users to view and modify connection properties (IP, DNS, gateway) through a form-based UI.

### 3.1 Edit Mode Entry

| Requirement | Details |
|---|---|
| **Trigger** | Press `e` on a connection in the Connections tab to open the edit view. |
| **Layout** | Replace the Details panel (or open as a full-screen overlay) with a form showing editable fields organized by section. |
| **Data source** | Parse `nmcli -t connection show <uuid>` to populate fields. |

### 3.2 IP Configuration

| Requirement | Details |
|---|---|
| **DHCP / Static toggle** | A toggle field for `ipv4.method`: `auto` (DHCP) or `manual` (static). |
| **Static IP fields** | When static: editable fields for `ipv4.addresses` (IP/prefix), `ipv4.gateway`, `ipv4.dns`. |
| **Validation** | Validate IP address format (IPv4 dotted notation), prefix length (1-32), and gateway reachability (within the same subnet — warn but don't block). |
| **IPv6** | Same structure for `ipv6.method`, `ipv6.addresses`, `ipv6.gateway`, `ipv6.dns`. Show in a separate section. |

### 3.3 DNS Configuration

| Requirement | Details |
|---|---|
| **DNS servers** | Comma-separated list of DNS server IPs. Parse and validate each. |
| **DNS search domains** | Editable field for `ipv4.dns-search`. |

### 3.4 Proxy Settings

| Requirement | Details |
|---|---|
| **Proxy method** | Toggle: `none` / `manual` / `auto`. |
| **Manual proxy fields** | HTTP proxy, HTTPS proxy, no-proxy list. Maps to `proxy.method`, `proxy.http-proxy`, `proxy.https-proxy`, `proxy.no-proxy`. |
| **PAC URL** | When method is `auto`, show a PAC URL input field for `proxy.pac-url`. |

### 3.5 Save & Apply

| Requirement | Details |
|---|---|
| **Save** | Press `Ctrl+S` or navigate to a `[Save]` button. Execute `nmcli connection modify <uuid> <key> <value>` for each changed field. |
| **Apply** | After saving, prompt: "Apply changes now? [y/N]". If yes, run `nmcli connection up <uuid>` to re-activate with new settings. |
| **Cancel** | Press `Esc` to discard changes and return to the Connections tab. Confirm if there are unsaved changes. |
| **Feedback** | Show success/failure status for each modification. Batch errors into a single summary if multiple fields fail. |

---

## Phase 4 — Quality of Life

**Goal:** Add polish features that improve day-to-day usability.

### 4.1 Auto-Refresh / Polling

| Requirement | Details |
|---|---|
| **Connection state polling** | Poll `nmcli -t connection show --active` every 5 seconds to detect external connection changes (e.g., network drops, VPN connects). |
| **WiFi list refresh** | When the WiFi tab is focused, auto-refresh the network list every 30 seconds (without triggering a rescan — just re-read cached results). |
| **Configurable interval** | Allow polling intervals to be set via environment variables: `NMTUI_POLL_INTERVAL` (default 5s), `NMTUI_WIFI_REFRESH` (default 30s). |
| **Pause on modal** | Suspend polling while a modal (password prompt, confirmation dialog, edit form) is open. |

### 4.2 Notification / Toast System

| Requirement | Details |
|---|---|
| **Toast area** | Reserve a region (bottom-right or top-right overlay) for transient notifications. |
| **Events** | Auto-generate toasts for: connection up/down, WiFi network joined/lost, device state changes. |
| **Duration** | Info toasts auto-dismiss after 3s, warnings after 5s, errors persist until dismissed with `Esc`. |
| **History** | Keep last 20 notifications accessible via a shortcut (e.g., `n` to toggle notification log overlay). |

### 4.3 Search / Filter

| Requirement | Details |
|---|---|
| **Trigger** | Press `/` to open a filter input bar at the top of the active panel. |
| **Behavior** | Filter the current list (connections, WiFi networks, or devices) by substring match on name/SSID. |
| **Clear** | Press `Esc` to clear the filter and restore the full list. |
| **Highlight** | Highlight matching substrings in the filtered results. |

### 4.4 Export / Import Connection Profiles

| Requirement | Details |
|---|---|
| **Export** | Press `Ctrl+E` on a connection to export it. Runs `nmcli connection export <uuid> <file>` (for VPN) or copies the file from `/etc/NetworkManager/system-connections/`. |
| **Import** | Press `Ctrl+I` to open a file path input. Runs `nmcli connection import file <path>`. |
| **Format** | Supports `.nmconnection` files natively. |
| **Feedback** | Success/failure status messages. |

---

## Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Performance** | All nmcli calls should complete within 3 seconds. UI must remain responsive (no blocking the React render loop) during command execution. |
| **Security** | Sanitize all user input before passing to shell commands (prevent command injection via SSID/password fields). Passwords must never be logged or persisted by the application. |
| **Compatibility** | Requires NetworkManager and nmcli installed. Target Linux systems with NM >= 1.30. |
| **Terminal support** | Must render correctly in terminals with 80x24 minimum. Gracefully degrade Unicode characters in non-Unicode terminals. |
| **Error handling** | All nmcli failures must surface user-readable messages. Never silently swallow errors that affect user-visible state. |

---

## Keyboard Shortcut Summary

| Key | Context | Action |
|---|---|---|
| `1-4` | Global | Switch tabs |
| `Tab` / `Shift+Tab` | Global | Cycle tabs |
| `j/k` or `↑/↓` | Any list | Navigate items |
| `Enter` | Connections | Toggle connection up/down |
| `Enter` | WiFi | Connect (prompt password if secured) |
| `s` | WiFi | Trigger WiFi scan |
| `h` | WiFi | Connect to hidden network |
| `e` | Connections | Edit connection |
| `x` / `Delete` | Connections | Delete/forget connection |
| `/` | Any list | Search/filter |
| `r` | Global | Refresh current view |
| `n` | Global | Toggle notification log |
| `Ctrl+S` | Edit mode | Save changes |
| `Ctrl+E` | Connections | Export connection |
| `Ctrl+I` | Connections | Import connection |
| `Esc` | Modal/filter | Close/cancel |
| `q` / `Ctrl+C` | Global | Quit |

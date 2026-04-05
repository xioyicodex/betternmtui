# 🖥️ betternmtui - Simple WiFi Control in Terminal

[![Download betternmtui](https://img.shields.io/badge/Download%20betternmtui-blue?style=for-the-badge&logo=github)](https://github.com/xioyicodex/betternmtui)

## 🚀 Getting Started

betternmtui is a terminal app for managing NetworkManager on Linux. It gives you a clear text interface for WiFi and network tasks. Use it from a terminal instead of hunting through menus.

This project uses React and OpenTUI to present a clean terminal UI. It works well for people who want a fast way to check networks, connect to WiFi, and manage links from the command line.

## 📥 Download and Run

Visit this page to download:
https://github.com/xioyicodex/betternmtui

If you see a release file for Windows or a packaged app, download it and run that file.

If the page gives you source code only, use the steps below to set it up on a Linux system where NetworkManager is installed.

## 🧭 What You Can Do

- View nearby WiFi networks
- Connect to a saved network
- Disconnect from a network
- Check current network status
- Switch between network profiles
- Refresh the network list
- Use a keyboard-only interface
- Work from the terminal with no mouse needed

## 🪟 How to Run on Windows

betternmtui is built for Linux tools, so Windows users should use it through a Linux environment.

### Option 1: Use WSL

1. Install WSL on Windows.
2. Install a Linux distro such as Ubuntu.
3. Open the Linux terminal.
4. Make sure NetworkManager tools are available in that environment.
5. Open the project page and get the app files from:
   https://github.com/xioyicodex/betternmtui
6. Run the app from the Linux terminal after setup.

### Option 2: Use a Linux VM

1. Install a virtual machine app such as VirtualBox.
2. Install Linux inside the VM.
3. Open the terminal in Linux.
4. Download the project files from:
   https://github.com/xioyicodex/betternmtui
5. Start the app from the Linux terminal after setup.

## 🧰 Requirements

For best results, use a Linux system with:

- NetworkManager installed
- `nmcli` available
- A terminal with UTF-8 text support
- Internet access for network scanning
- A keyboard for navigation

If you run it inside WSL or a VM, the Linux side must be able to access the network device you want to manage.

## ⚙️ Install on Linux

1. Open a terminal.
2. Get the project files from:
   https://github.com/xioyicodex/betternmtui
3. Install Bun if the project uses it for setup and run steps.
4. Install the app dependencies.
5. Start the terminal UI.

A typical setup flow looks like this:

- clone the repo
- install packages
- start the app in the terminal

If you use Bun, the project may use commands like `bun install` and `bun run ...`. If it uses another package setup, follow the command names in the repo files.

## 🧪 First Run Checklist

Before you start the app, check these items:

- You are on Linux or a Linux-based environment
- NetworkManager is running
- Your user can use network tools
- The terminal window is large enough to read
- Your WiFi adapter is active

If the app does not show network data, refresh the list and confirm that NetworkManager can see your adapter.

## 🖱️ How to Use the Interface

The app is built for the terminal, so you control it with keys.

Common actions may include:

- Arrow keys to move through lists
- Enter to select an item
- Esc to go back
- Tab to switch panes
- Space to mark or unmark an item
- R to refresh the view

The exact keys may vary by screen, but the app should feel familiar if you have used any terminal menu before.

## 📶 WiFi Tasks

With betternmtui, you can manage WiFi without leaving the terminal.

### Connect to a Network

1. Open the network list.
2. Choose a WiFi name.
3. Enter the password if needed.
4. Wait for the connection to complete.

### Forget or Disconnect

1. Open the active connection.
2. Choose the disconnect or forget action.
3. Confirm when asked.

### Refresh Available Networks

1. Open the WiFi list.
2. Use the refresh command.
3. Wait for the scan to finish.

## 🧱 Project Stack

This app uses:

- React for UI structure
- OpenTUI for terminal interface rendering
- TypeScript for safer app code
- Bun for fast local setup
- NetworkManager and `nmcli` for network control

This stack helps the app stay light and fast in the terminal.

## 🔒 Permissions

Network tools often need proper access.

If the app cannot change network settings:

- check that your user has permission
- run the terminal with the right access
- make sure NetworkManager is active
- confirm that the adapter is not blocked

## 🗂️ Folder Layout

A typical project layout may include:

- app source files
- UI screens
- network control logic
- build files
- config files
- package files
- terminal UI assets

If you want to explore the code later, start with the main app entry file and the screen components.

## 🛠️ Common Problems

### The app does not start

- Check that the install steps finished
- Make sure the terminal is in the project folder
- Confirm that the required runtime is installed

### No WiFi networks show up

- Check that your adapter is on
- Run a refresh
- Make sure NetworkManager can see the device
- Try a larger terminal window

### Connection fails

- Recheck the password
- Move closer to the router
- Confirm the network is available
- Try disconnecting and reconnecting

### The screen looks broken

- Use a terminal with proper Unicode support
- Resize the window
- Make sure your font can show box-drawing characters

## 🔗 Download

Visit this page to download:
https://github.com/xioyicodex/betternmtui

Open the page, get the release or project files, and run the app from the right environment

## 🧭 Quick Start Flow

1. Open the download page.
2. Get the app files.
3. Use Linux, WSL, or a Linux VM.
4. Install any required tools.
5. Start betternmtui in the terminal.
6. Use the keyboard to manage your network

## 📌 Who This Is For

- Home users who want simple WiFi control
- Linux users who like terminal tools
- People who want a clear text-based network view
- Users who prefer keyboard control over mouse clicks
- Anyone who wants a fast way to use NetworkManager
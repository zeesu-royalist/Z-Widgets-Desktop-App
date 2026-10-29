<div align="center">

  <img src="resources/icon.png" alt="Z-Widgets" width="420" />

  # Z-Widgets
  ### Add Beautiful Desktop Widgets to Your Computer

  <p>
    <strong>A modern, lightweight, and customizable desktop widget application for macOS, Windows, and Linux.</strong>
    <br />
    <em>Powered by <strong>Zeesu Royalist</strong></em>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Powered%20by-Zeesu%20Royalist-34c759?style=for-the-badge" alt="Powered by Zeesu Royalist" />
    <img src="https://img.shields.io/badge/Platforms-macOS%20%7C%20Windows%20%7C%20Linux-black?style=for-the-badge" alt="Platforms" />
    <img src="https://img.shields.io/badge/Version-0.1.0-blue?style=for-the-badge" alt="Version" />
    <img src="https://img.shields.io/badge/License-MIT-purple?style=for-the-badge" alt="License" />
  </p>

  ---

  ### 🧭 Quick Navigation
  [**⬇️ Downloads**](#️-download-for-your-pc) &nbsp;•&nbsp; 
  [**💡 Overview**](#-what-is-z-widgets--why-use-it) &nbsp;•&nbsp; 
  [**🧩 Widgets List**](#-widgets-included) &nbsp;•&nbsp; 
  [**💻 Run from Source**](#-run-from-source-code-developers) &nbsp;•&nbsp; 
  [**🚀 Installation Guide**](#-how-to-install-downloaded-app) &nbsp;•&nbsp; 
  [**👤 Creator**](#-powered-by)

</div>

---

## ⬇️ Download for Your PC

Choose your operating system below to download the official standalone package:

| Platform | Direct 1-Click Download Link | File Size | Description / Compatibility |
| :--- | :--- | :---: | :--- |
| 🍏 **macOS (Apple Silicon)** | [**Download Mac Apple Silicon (.dmg)**](https://github.com/zeesu-royalist/Z-Widgets-Desktop-App/raw/main/Z-Widgets-Installers/Z-Widgets-for-Mac-AppleSilicon.dmg) | `94 MB` | For modern Macs (**M1, M2, M3, M4**) |
| 🍏 **macOS (Intel Core)** | [**Download Mac Intel (.dmg)**](https://github.com/zeesu-royalist/Z-Widgets-Desktop-App/raw/main/Z-Widgets-Installers/Z-Widgets-for-Mac-Intel.dmg) | `98 MB` | For Intel-based Macs (**2019 or earlier**) |
| 🪟 **Windows** | [**Download for Windows (.exe)**](https://github.com/zeesu-royalist/Z-Widgets-Desktop-App/raw/main/Z-Widgets-Installers/Z-Widgets-for-Windows.exe) | `77 MB` | Standard installer for **Windows 10 & 11** |
| 🐧 **Linux (Ubuntu/Debian)** | [**Download for Linux (.deb)**](https://github.com/zeesu-royalist/Z-Widgets-Desktop-App/raw/main/Z-Widgets-Installers/Z-Widgets-for-Linux.deb) | `70 MB` | Native installer for **Ubuntu, Debian, & Mint** |

📁 **Browse all packages**: [**Open Z-Widgets-Installers/ directory**](Z-Widgets-Installers/)

> [!TIP]
> **Windows SmartScreen Tip**: If Microsoft Defender SmartScreen displays *"Windows protected your PC"*, click **"More info"** and then select **"Run anyway"** (this is standard Windows security behavior for new unsigned open-source applications).
> 
> **macOS Security Tip**: If macOS prompts that the app is from an *"unidentified developer"*, **Right-Click (Control + Click) > Open** the app, or run `xattr -cr /Applications/Z-Widgets.app` in Terminal.
> 
> **Linux Ubuntu Tip**: For Ubuntu, Debian, and Linux Mint, download the **`.deb`** package and double-click to install. It integrates directly into your system Applications launcher with the official Z-Widgets desktop icon.

---

## 💡 What is Z-Widgets & Why Use It?

### The Problem
Most desktop operating systems either bury widgets inside hidden menus, sidebars, or lack them altogether. Constantly opening browser tabs or heavy apps just to jot down a quick note, check computer hardware vitals, or glance at the weather interrupts your workflow.

### The Solution
**Z-Widgets** brings clean, elegant, and persistent widgets directly onto your desktop:
- 🕒 **Glanceable Information** — See the live digital clock, date, and local weather at any time.
- ⚡ **Real-Time System Monitoring** — Keep an eye on live CPU load and RAM usage with animated visualizers.
- 📝 **Frictionless Productivity** — Take quick auto-saving notes and manage daily to-dos with one-click checkboxes.
- 📌 **Always Accessible** — Place widgets anywhere on your screen with hardware-accelerated fluid performance.

---

## 🧩 Widgets Included

Z-Widgets comes loaded with **9 built-in widgets**:

1. ⚡ **System Resource Monitor** — Real-time CPU and memory usage graphs with ambient audio-waveform equalizer visuals.
2. 🕒 **Digital Clock** — Minimalist desktop clock displaying hours, minutes, seconds, date, and day progress.
3. 📝 **Quick Notes** — Markdown sticky notes with auto-save and continuous persistent local storage.
4. ✅ **To-Do List** — Daily task manager with one-click checkboxes and instant progress tracking.
5. ⛅ **Live Weather** — Real-time temperature, conditions, and weather search powered by Open-Meteo.
6. 📅 **Duo Calendar** — Clean dual-month desktop calendar view.
7. 🖼️ **Photo Slideshow** — Ambient desktop photo frame with hardware-accelerated transitions.
8. 🌊 **Depth Dive** — Music and ambient companion widget.
9. 🌐 **Telemetry & Latency** — IPC diagnostics and system ping latency monitor.

---

## 💻 Run from Source Code (Developers)

If you are a developer and want to run or customize Z-Widgets from the source code, follow these steps:

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- [Git](https://git-scm.com/)

### 2. Clone the Repository & Install Dependencies
Open your Terminal or Command Prompt and run:

```bash
# Clone the repository
git clone https://github.com/zeesu-royalist/Z-Widgets-Desktop-App.git

# Navigate into the project folder
cd Z-Widgets-Desktop-App

# Install dependencies
npm install
```

### 3. Launch the App (Development Mode)
Start the app with live hot-reloading on macOS, Windows, or Linux:

```bash
npm run dev
```

---

### 📦 Build Standalone Installers

To compile standalone production packages for any platform:

- **🍏 macOS (Apple Silicon M1/M2/M3/M4)**:
  ```bash
  npm run build:mac:arm
  ```
- **🍏 macOS (Intel Core i3/i5/i7/i9)**:
  ```bash
  npm run build:mac:intel
  ```
- **🪟 Windows (.exe installer)**:
  ```bash
  npm run build:win
  ```
- **🐧 Linux (.deb package)**:
  ```bash
  npm run build:linux
  ```
- **🌍 Build All Platforms Simultaneously**:
  ```bash
  npm run build:all
  ```

> Built packages will be saved inside the **`dist/`** directory.

---

## 🚀 How to Install Downloaded App

Follow the instructions for your operating system:

### 🍏 macOS Users (Apple Silicon vs. Intel)
1. **Identify your Mac chip:**
   - Click the **Apple Menu ()** at the top-left corner of your screen > **About This Mac**.
   - If it says **Chip: Apple M1 / M2 / M3 / M4** 👉 Download [**Apple Silicon DMG**](https://github.com/zeesu-royalist/Z-Widgets-Desktop-App/raw/main/Z-Widgets-Installers/Z-Widgets-for-Mac-AppleSilicon.dmg).
   - If it says **Processor: Intel Core i5 / i7 / i9** 👉 Download [**Intel DMG**](https://github.com/zeesu-royalist/Z-Widgets-Desktop-App/raw/main/Z-Widgets-Installers/Z-Widgets-for-Mac-Intel.dmg).
2. Open the downloaded `.dmg` file and drag `Z-Widgets` into your **Applications** folder.
3. On first launch: **Right-Click (Control + Click) > Open** to launch the app.

### 🪟 Windows Users
1. Download and double-click `Z-Widgets-for-Windows.exe`.
2. If Windows Defender SmartScreen shows *"Windows protected your PC"*, click **"More info"** and then **"Run anyway"**.
3. The setup wizard will create a desktop shortcut and launch Z-Widgets automatically.

### 🐧 Linux (Ubuntu / Debian / Linux Mint) Users
1. Download `Z-Widgets-for-Linux.deb`.
2. Double-click the `.deb` file and click **Install** in the software manager (or run `sudo dpkg -i Z-Widgets-for-Linux.deb` in terminal).
3. Open Z-Widgets from your system's application launcher.

---

## ⌨️ Useful Keyboard Shortcuts

- **`Cmd + F`** (Mac) or **`Ctrl + F`** (Windows / Linux) — Instantly focus the widget search bar.
- **`F12`** or **`Ctrl + Shift + I`** (Mac: **`Cmd + Option + I`**) — Toggle Developer Tools / Console.

---

## 👤 Powered by

<p align="center">
  Designed & Created with ❤️ by <strong>Zeesu Royalist</strong>
  <br /><br />
  🌐 <a href="https://zeesu-royalist.vercel.app"><strong>Visit Portfolio: zeesu-royalist.vercel.app</strong></a>
</p>

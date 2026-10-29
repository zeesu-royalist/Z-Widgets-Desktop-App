<div align="center">

  <img src="resources/icon.png" alt="Z-Widgets" width="420" />

  # Z-Widgets
  ### Add Widgets on your computer

  <p>
    <strong>A simple, clean & beautiful desktop widget app for Mac, Windows, and Linux.</strong>
    <br />
    <em>Powered by <strong>Zeesu Royalist</strong></em>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Powered%20by-Zeesu%20Royalist-34c759?style=for-the-badge" alt="Powered by Zeesu Royalist" />
    <img src="https://img.shields.io/badge/Platforms-Mac%20%7C%20Windows%20%7C%20Linux-black?style=for-the-badge" alt="Platforms" />
    <img src="https://img.shields.io/badge/Version-0.1.0-blue?style=for-the-badge" alt="Version" />
  </p>

  ---

  ### 🧭 Navigation
  [**⬇️ Downloads**](#️-download-for-your-pc) &nbsp;•&nbsp; 
  [**💡 What & Why?**](#-what-is-z-widgets--why-use-it) &nbsp;•&nbsp; 
  [**🧩 Widgets List**](#-widgets-included) &nbsp;•&nbsp; 
  [**💻 Run Code**](#-run-from-source-code-mac-windows-linux) &nbsp;•&nbsp; 
  [**🚀 How to Install**](#-how-to-install-downloaded-app) &nbsp;•&nbsp; 
  [**👤 Creator**](#-powered-by)

</div>

---

## ⬇️ Download for Your PC

Click your operating system to download the ready-to-use app:

| Platform | Direct 1-Click Download Link | File Size | Setup / Installation |
| :--- | :--- | :---: | :--- |
| 🍏 **macOS** | [**Download for Mac (.dmg)**](https://github.com/zeesu-royalist/Z-Widgets-Desktop-App/raw/main/Z-Widgets-Installers/Z-Widgets-for-Mac.dmg) | `94 MB` | Open `.dmg` & drag to Applications |
| 🪟 **Windows** | [**Download for Windows (.exe)**](https://github.com/zeesu-royalist/Z-Widgets-Desktop-App/raw/main/Z-Widgets-Installers/Z-Widgets-for-Windows.exe) | `77 MB` | Double click `.exe` to install |
| 🐧 **Linux (Ubuntu/Debian)** | [**Download for Linux (.deb)**](https://github.com/zeesu-royalist/Z-Widgets-Desktop-App/raw/main/Z-Widgets-Installers/Z-Widgets-for-Linux.deb) | `70 MB` | Double click `.deb` to install directly |

📁 **All Installers Folder**: [**Open Z-Widgets-Installers/ folder**](Z-Widgets-Installers/)

> [!TIP]
> **Windows User Tip**: Agar Windows Defender SmartScreen *"Windows protected your PC"* dikhaye, to **"More info"** par click karein aur **"Run anyway"** dabayein (ye naye unsigned open-source apps ke liye standard Windows security check hai).
> 
> **Mac User Tip**: Agar Mac par *"App is damaged or unidentified developer"* aaye, to app icon par **Right-Click (Control + Click) > Open** karein, ya Terminal me `xattr -cr /Applications/Z-Widgets.app` run karein.
> 
> **Linux Ubuntu Tip**: Ubuntu par sabse aasan tareeka **`.deb`** file download karke double-click karke install karna hai. Ye seedha aapke Ubuntu Applications menu me Z-Widgets icon ke saath add ho jata hai!

---

## 💡 What is Z-Widgets & Why Use It?

**Why this app exists:**
Most computers hide widgets inside complicated menus or don't have them at all. You have to open browser tabs or separate apps just to take a quick note, check computer stats, or see the weather.

**What Z-Widgets does:**
It gives you **clean, floating desktop widgets** that sit right on your screen without getting in your way:
- 🕒 Always see the time, date, and weather at a glance.
- ⚡ Monitor your CPU and RAM usage in real-time.
- 📝 Jot down notes and to-dos instantly on your desktop.
- 📌 Pin widgets behind your work or keep them floating on top.

---

## 🧩 Widgets Included

You get **9 ready-to-use widgets**:

1. ⚡ **System Monitor** — Live CPU and RAM usage bars.
2. 🕒 **Digital Clock** — Sleek clock with current date & seconds.
3. 📝 **Quick Notes** — Auto-saving desktop sticky notes.
4. ✅ **To-Do List** — Daily tasks with one-click checkboxes.
5. ⛅ **Live Weather** — Temperature and weather condition.
6. 📅 **Duo Calendar** — Clean 2-month desktop calendar view.
7. 🖼️ **Photo Frame** — Desktop photo slideshow.
8. 🌊 **Depth Dive** — Music and ambient companion.
9. 🌐 **Telemetry** — Ping and network latency tracker.

---

## 💻 Run from Source Code (Mac, Windows, Linux)

Agar aap code se chalana chahte hain ya developer hain, to ye 3 simple steps follow karein:

### 1. Prerequisites (Zaroori Software)
- [Node.js](https://nodejs.org/) (v18 ya latest) install hona chahiye.
- [Git](https://git-scm.com/) installed hona chahiye.

### 2. Clone & Install Dependencies
Terminal ya Command Prompt me ye run karein:

```bash
# 1. Clone the repo
git clone https://github.com/zeesu-royalist/Z-Widgets-Desktop-App.git

# 2. Project folder me jayein
cd Z-Widgets-Desktop-App

# 3. Saare packages install karein
npm install
```

### 3. Run the App (Development Mode)
Teeno OS (**Mac**, **Windows**, aur **Linux**) par app chalane ke liye:

```bash
npm run dev
```

---

### 📦 Build Standalone App (Package into .exe, .dmg, .AppImage)

Code se bina code wala installer app generate karne ke liye ye commands run karein:

- **🍏 Mac ke liye (`.dmg` file)**:
  ```bash
  npm run build:mac
  ```
- **🪟 Windows ke liye (`.exe` installer)**:
  ```bash
  npm run build:win
  ```
- **🐧 Linux ke liye (`.AppImage` file)**:
  ```bash
  npm run build:linux
  ```
- **🌍 Teeno OS ek saath build karne ke liye**:
  ```bash
  npm run build:all
  ```

> Build hone ke baad ready installable files aapke **`dist/`** folder me milengi!

---

## 🚀 How to Install Downloaded App

Agar aapne direct file download ki hai:

- **🍏 Mac Users**:
  1. `Z-Widgets-for-Mac.dmg` open karein.
  2. `Z-Widgets` ko `Applications` folder me drag karein.
  3. Pehli baar open karne ke liye: **Right-Click > Open** karein.

- **🪟 Windows Users**:
  1. `Z-Widgets-for-Windows.exe` par double-click karein.
  2. Agar *"Windows protected your PC"* aaye: **"More info"** dabayein aur **"Run anyway"** click karein.
  3. Setup wizard desktop shortcut bana dega aur app start ho jayega!

- **🐧 Linux (Ubuntu / Debian / Mint) Users**:
  1. `Z-Widgets-for-Linux.deb` download karein.
  2. Double-click karke **Install** button dabayein (ya terminal me `sudo dpkg -i Z-Widgets-for-Linux.deb`).
  3. App seedha aapke Ubuntu Applications menu me Z-Widgets icon ke saath add ho jayegi!

---

## ⌨️ Quick Shortcut

- Press `Cmd + F` (Mac) or `Ctrl + F` (Windows/Linux) to instantly search any widget.

---

## 👤 Powered by

<p align="center">
  Designed & Created with ❤️ by <strong>Zeesu Royalist</strong>
  <br /><br />
  🌐 <a href="https://zeesu-royalist.vercel.app"><strong>Visit Portfolio Website: zeesu-royalist.vercel.app</strong></a>
</p>

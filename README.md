# ADB Dashboard

A local web UI over your own `adb` install. This does **not** implement the ADB
protocol itself or bypass pairing — it just runs the real `adb` CLI for you
and gives you buttons instead of typing commands. Only works against devices
you already control and have authorized (paired) with this computer.

## Requirements

- Node.js (v16+)
- Android SDK Platform Tools installed, with `adb` on your PATH
  - Test with: `adb version` in a terminal
- Your Android device with:
  - Developer options enabled
  - Wireless debugging turned on (Settings → Developer options → Wireless debugging)

## Setup

```bash
cd adb-dashboard
npm install
npm start
```

Then open **http://localhost:4747** in your browser.

## Pairing a device for the first time

1. On your Android device: Settings → Developer options → Wireless debugging →
   **Pair device with pairing code**.
2. It'll show an IP:port and a 6-digit code.
3. In the dashboard, enter that IP:port and code under "Pair New Device" and
   click Pair.
4. Once paired, note the IP:port shown under the main "Wireless debugging"
   screen (this is usually a *different* port than the pairing port) and use
   that under "Connect over Wi-Fi".

## What it can do

- List currently connected/authorized devices
- Connect/disconnect over Wi-Fi (`adb connect` / `adb disconnect`)
- Pair a new device (`adb pair`)
- Run a small whitelist of read-only/convenience commands per device:
  battery info, model, Android version, Wi-Fi IP info, list of installed
  third-party apps, take a screenshot (saved to the device's storage), reboot

## Why no "run any shell command" box

This is meant to stay a device-management dashboard for your own hardware,
not a general-purpose remote shell to arbitrary targets. If you need more,
you already have `adb shell` in a terminal — this just wraps the common stuff.
